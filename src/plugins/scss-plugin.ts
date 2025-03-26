import autoprefixer from 'autoprefixer'
import fs from 'node:fs/promises'
import path from 'path'
import postcss from 'postcss'
import type { Plugin } from 'rollup'
import * as sass from 'sass'
import { pathToFileURL } from 'url'
import type { BuildContext } from '../build-context'
import { getCSSBundles } from '../bundles'
import { CSSFileNotSupportedError, SassCompileError, wrapError } from '../errors'
import { paths } from '../paths'
import { logger, loggerWithContext } from '../utils/logger'
import { prefixName } from '../utils/names'
import { createWatcher } from './lib/watcher'

async function ensureDirectoryExists(dirPath: string) {
  const exists = await fs.exists(dirPath)
  if (!exists) {
    await fs.mkdir(dirPath, { recursive: true })
  }
}

const PLUGIN_NAME = 'custom-scss-plugin'
const log = loggerWithContext(PLUGIN_NAME)

const dependencyGraph = new Map<string, Set<string>>()
const reverseGraph = new Map<string, Set<string>>()

let existingBundles = new Set<string>()

function getDifference(a: Set<string>, b: Set<string>) {
  return new Set([...a].filter((item) => !b.has(item)))
}

function removeBundleDependencies(bundlePath: string, deps: string[]) {
  for (const oldDep of deps) {
    if (reverseGraph.has(oldDep)) {
      reverseGraph.get(oldDep)?.delete(bundlePath)
    }
  }
}

async function processPostCSS(filename: string, css: string): Promise<string> {
  log(`PostCSS processing ${filename}`)
  return new Promise((resolve, reject) => {
    postcss([autoprefixer])
      .process(css, { from: filename })
      .then((result) => {
        resolve(result.css)
      })
      .catch((err) => {
        reject(wrapError(err))
      })
  })
}

async function generateCSSBundles(bundles: string[], context: BuildContext) {
  const destFolder = path.join(paths.dist, 'assets')

  await ensureDirectoryExists(destFolder)

  for (const bundlePath of bundles) {
    const prevDeps = dependencyGraph.get(bundlePath) || new Set()
    const ext = path.extname(bundlePath)
    const name = path.basename(bundlePath, ext)
    const outputName = prefixName(context.prefix, name)
    const outputPath = path.join(destFolder, outputName) + '.css'
    const content = await fs.readFile(bundlePath, 'utf8')
    const deps = new Set<string>()

    try {
      const result = sass.compileString(content, {
        importers: [
          new sass.NodePackageImporter(),
          {
            findFileUrl(url) {
              const localPath = path.join(path.dirname(bundlePath), url)
              deps.add(localPath)

              if (!reverseGraph.has(localPath)) {
                reverseGraph.set(localPath, new Set())
              }

              const item = reverseGraph.get(localPath)!
              item.add(bundlePath)
              reverseGraph.set(localPath, item)
              return pathToFileURL(localPath) as URL
            },
          },
        ],
      })

      dependencyGraph.set(bundlePath, deps)

      logger.debug(`Generated bundle: ${bundlePath}`)
      let css = result.css

      if (context.postCSS) {
        css = await processPostCSS(name, css)
      }

      await fs.writeFile(outputPath, css)

      const diff = getDifference(prevDeps, deps)
      removeBundleDependencies(bundlePath, [...diff])
    } catch (err) {
      let localErr: Error | string = err as Error | string

      if (err instanceof Error && 'sassMessage' in err) {
        localErr = new SassCompileError(bundlePath, err as Error)
      }

      if (context.isWatchMode === true) {
        logger.error(localErr)
        return
      }

      throw localErr instanceof Error ? localErr : new Error(localErr)
    }
  }
}

async function recompileDependencies(file: string, context: BuildContext) {
  if (existingBundles.has(file)) {
    logger.info(`Compiling bundle: ${file}`)
    await generateCSSBundles([file], context)
    return
  }

  logger.info(`Recompiling dependencies for: ${file}`)

  let name = path.basename(file, '.scss')
  const folder = path.dirname(file)

  // Partials are added without underscore to graph.
  if (name[0] === '_') {
    name = name.slice(1)
  }

  const key = path.join(folder, name)
  const bundleDeps = reverseGraph.get(key)

  if (!bundleDeps || bundleDeps.size === 0) {
    log(`No bundle dependencies for: ${file}`)
    return
  }

  const bundlesOutdated = [...bundleDeps]
  log(`Bundled to rebuild: ${bundlesOutdated.join(', ')}`)
  await generateCSSBundles(bundlesOutdated, context)
}

/**
 * This plugins gathers all the SCSS files listed inside the JS bundles are combines them into
 * a bundle for EACH of the JS bundles.
 *
 */
export default function scssPlugin(context: BuildContext): Plugin {
  let isFirstRun = true

  return {
    name: PLUGIN_NAME,

    async writeBundle() {
      if (isFirstRun === false) {
        return
      }

      log('Starting full copy')
      isFirstRun = false

      const bundles = getCSSBundles()
      existingBundles = new Set<string>(bundles)
      await generateCSSBundles(bundles, context)

      if (context.isWatchMode === false) {
        return
      }

      createWatcher(log, paths.css, {
        onChange(path: string) {
          /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
          recompileDependencies(path, context)
        },
        onAdd(_path: string) {
          //
        },
        onDelete(_path: string) {
          //
        },
      })
    },
  } satisfies Plugin
}
