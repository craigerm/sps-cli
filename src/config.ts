import { nodeResolve } from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import terser from '@rollup/plugin-terser'
import fs from 'node:fs/promises'
import path from 'node:path'
import prettyBytes from 'pretty-bytes'
import {
  type OutputChunk,
  type OutputOptions,
  type Plugin,
  type RollupBuild,
  type RollupOptions,
  type RollupOutput,
  rollup,
  watch,
} from 'rollup'
import type { BuildContext } from './build-context'
import { getJsEntrypoints } from './bundles'
import { paths, shopifyFolders } from './paths'
import copySpecialFilesPlugin from './plugins/copy-special-files'
import copyStaticFilesPlugin from './plugins/copy-static-files'
import importMapPlugin from './plugins/import-map-plugin'
import customScssPlugin from './plugins/scss-plugin'
import snippetHelpersPlugin from './plugins/snippet-helpers-plugin'
import transformConfigSettingsPlugin from './plugins/transform-config-settings'
import transformSectionsPlugin from './plugins/transform-sections-plugin'
import unknownImportPlugin from './plugins/unknown-import-plugin'
import { displayThemeInfo, watchDev } from './shopify/cli-wrapper'
import { logger, loggerWithContext, setLogLevel } from './utils/logger'
import { pascalCaseFromPath, prefixName } from './utils/names'

const buildMode = 'production'
const log = loggerWithContext('config')

// 160kb for bundle/chunk size
const LIMIT = 160000

async function cleanDistFolder() {
  if (paths.dist.endsWith('dist') === false) {
    logger.error('Output path must be dist folder')
    process.exit(1)
  }

  await fs.rm(paths.dist, { recursive: true, force: true })
  await fs.mkdir(paths.dist)

  for (const folder of shopifyFolders) {
    await fs.mkdir(path.join(paths.dist, folder))
  }
}

const handleError = (err: any) => {
  if (err instanceof Error) {
    log(err, 'error')
    return
  }

  log(err as string, 'error')
}

export function getPlugins(context: BuildContext, isFirstRun: boolean): Plugin<any>[] {
  const firstRunOnlyPlugins = [
    customScssPlugin(context),
    copyStaticFilesPlugin(context),
    copySpecialFilesPlugin(context),
    transformSectionsPlugin(context),
    transformConfigSettingsPlugin(context),
    snippetHelpersPlugin(context),
    importMapPlugin(context),
  ] as Plugin<any>[]

  return [
    unknownImportPlugin(context),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify(buildMode),
    }),
    nodeResolve({
      rootDir: path.resolve(paths.root),
    }),
    context.minify ? terser({ maxWorkers: 4 }) : undefined,
    ...(isFirstRun ? firstRunOnlyPlugins : []),
  ].filter(Boolean) as Plugin[]
}

export async function build(context: BuildContext) {
  logger.box(
    `Building shopify theme in ${context.isDev ? 'development' : 'production'} mode`
  )

  await displayThemeInfo(context)
  logger.info(`Bundle format: ${context.format}`)

  setLogLevel(context.logLevel)

  const entrypoints = getJsEntrypoints()
  const ext = context.minify ? 'min.js' : 'js'
  const commonBundlePath = path.join(paths.js, 'common')

  const outputOptions: OutputOptions = {
    format: context.format,
    dir: path.resolve(paths.dist, 'assets'),
    entryFileNames: prefixName(context.prefix, `[name].${ext}`),
    chunkFileNames: prefixName(context.prefix, `chunk-[name]-[hash].${ext}`),
    manualChunks(id) {
      if (id.includes(commonBundlePath)) {
        return 'common'
      }

      if (id.includes('node_modules')) {
        return 'vendor-modules'
      } else if (id.includes('vendor')) {
        return 'vendor'
      }
    },
  }

  const options: RollupOptions = {
    input: entrypoints,
    output: outputOptions,
  }

  await cleanDistFolder()

  if (context.isDev === false) {
    try {
      const buildFailed = await writeBundles(context, options)
      if (buildFailed) {
        process.exit(1)
      }
      return
    } catch (err) {
      handleError(err)
      process.exit(1)
    }
  }

  try {
    await watchBundles(context, options)
  } catch (err) {
    handleError(err)
    process.exit(1)
  }
}

async function watchBundles(context: BuildContext, options: RollupOptions) {
  return new Promise((_resolve) => {
    const newOptions = {
      ...options,
      plugins: getPlugins(context, true),
    }
    const watcher = watch(newOptions)
    let firstRun = false

    watcher.on('event', async (event) => {
      switch (event.code) {
        case 'END':
          if (firstRun === false) {
            firstRun = true
            await watchDev(context)
            // If we made it here, we've killed the dev server so exit.
            process.exit(0)
          }
          break
        case 'ERROR':
          handleError(event.error)
          // watcher.close()
          break
      }
    })
  })
}

async function writeBundlesForIIFE(context: BuildContext, options: RollupOptions) {
  log('Creating iife build for multi-entrypoints')

  const entryPoints = getJsEntrypoints()
  const chunks: OutputChunk[] = []

  let buildFailed = true
  let isFirstRun = true

  for (const entryPoint in entryPoints) {
    const entryPath = entryPoints[entryPoint]
    log(`Creating bundle for ${entryPoint}, ${isFirstRun ? 'First run' : ''}`)

    const entryInfo = { [entryPoint]: entryPath }
    const newOptions = {
      ...options,
      output: {
        ...options.output,
        name: pascalCaseFromPath(context.prefix, entryPath),
      },
      input: entryInfo,
      plugins: getPlugins(context, isFirstRun),
    }

    let bundle: RollupBuild | null = null
    let result: RollupOutput | null = null

    try {
      bundle = await rollup(newOptions)
      result = await bundle.write(newOptions.output as OutputOptions)
      buildFailed = false
    } finally {
      if (bundle) {
        await bundle.close()
      }
    }

    for (const chunk of result.output) {
      if (chunk.type === 'chunk') {
        chunks.push(chunk)
      }
    }

    isFirstRun = false
  }

  if (buildFailed === false) {
    printOutput(chunks)
  }

  return buildFailed
}

async function writeBundles(context: BuildContext, options: RollupOptions) {
  if (context.isDev === false && context.format === 'iife') {
    return await writeBundlesForIIFE(context, options)
  }

  let buildFailed = true
  let bundle: RollupBuild | null = null
  let result: RollupOutput | null = null

  try {
    const newOptions = {
      ...options,
      plugins: getPlugins(context, true),
    }
    bundle = await rollup(newOptions)
    result = await bundle.write(newOptions.output as OutputOptions)
    buildFailed = false
  } finally {
    if (bundle) {
      await bundle.close()
    }
  }

  const chunks = result.output.filter((x) => x.type === 'chunk')
  printOutput(chunks)
  return buildFailed
}

function printOutput(chunks: OutputChunk[]) {
  let total = 0

  for (const chunk of chunks) {
    const moduleId = chunk.moduleIds[0]
    const module = chunk.modules[moduleId]
    const rawSize = module.renderedLength
    const type = chunk.isEntry ? 'entry' : 'chunk'

    if (rawSize > LIMIT) {
      logger.warn(
        `File size of "${chunk.name}" is (${prettyBytes(rawSize)}), recommended < ${prettyBytes(LIMIT)}`
      )
    }

    const size = prettyBytes(rawSize)
    logger.info(`Generated ${type} "dist/assets/${chunk.fileName}" (${size})`)
    total += rawSize
  }

  console.log('\n')
  logger.success(
    `Success! Total size of all combined bundles/chunks: ${prettyBytes(total)}`
  )
}
