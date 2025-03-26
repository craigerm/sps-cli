import fse from 'fs-extra'
import fs from 'node:fs/promises'
import path from 'path'
import type { OutputBundle, Plugin } from 'rollup'
import type { BuildContext } from '../build-context'
import { DuplicateAssetDetectedError } from '../errors'
import { paths, shopifyFolders } from '../paths'
import { logger, loggerWithContext } from '../utils/logger'
import { copyFileToDist, deleteFileFromDist } from './lib/file-utils'
import { createWatcher } from './lib/watcher'

const PLUGIN_NAME = 'copy-static-files-plugin'
const log = loggerWithContext(PLUGIN_NAME)

function createExistingBundlesMap(bundle: OutputBundle) {
  const existingBundles = new Set<string>()

  for (const name in bundle) {
    const chunkOrAsset = bundle[name]

    if (chunkOrAsset.type !== 'chunk') {
      continue
    }

    if (chunkOrAsset.isEntry) {
      chunkOrAsset.code = '[redacted]'
      existingBundles.add(name)
    }
  }
  return existingBundles
}

function getBaseFolder(src: string) {
  const subPath = path.dirname(src)
  const [_, subFolder] = subPath.split(paths.src)
  return subFolder
}

export default function copyStaticFilesPlugin(context: BuildContext): Plugin {
  let isFirstRun = true

  async function copyFilesAndFlattenResursively(
    src: string,
    destFolder: string,
    bundlesMap: Set<string>
  ) {
    const files = await fs.readdir(src, { withFileTypes: true })

    for (const file of files) {
      const item = path.join(src, file.name)

      if (file.isDirectory()) {
        await copyFilesAndFlattenResursively(item, destFolder, bundlesMap)
      } else {
        const destPath = path.join(destFolder, file.name)

        if (bundlesMap.has(file.name)) {
          throw new DuplicateAssetDetectedError(file.name)
        }

        await fs.copyFile(item, destPath)
      }
    }
  }

  return {
    name: PLUGIN_NAME,

    buildStart() {
      if (isFirstRun === false || context.isWatchMode === false) {
        return
      }

      const foldersToWatch = [
        paths.assets,
        paths.layout,
        paths.locales,
        paths.snippets,
        paths.templates,
      ]

      const names = foldersToWatch.map((x) => `${path.basename(x)}`)
      log(`Watch mode enabled for ${names.join(', ')}`)

      createWatcher(log, foldersToWatch, {
        onChange(path: string) {
          /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
          copyFileToDist(path, getBaseFolder(path))
          const localFile = path.split(paths.src)[1]
          logger.info(`Asset changed: ${localFile}`)
        },
        onAdd(path: string) {
          /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
          copyFileToDist(path, getBaseFolder(path))
          const localFile = path.split(paths.src)[1]
          logger.info(`Asset added: ${localFile}`)
        },
        onDelete(path: string) {
          /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
          deleteFileFromDist(path, getBaseFolder(path))
          const localFile = path.split(paths.src)[1]
          logger.info(`Asset deleted: ${localFile}`)
        },
      })
    },

    async writeBundle(_options, bundle) {
      if (isFirstRun === false) {
        return
      }

      log('Starting full copy')
      isFirstRun = false

      const bundlesMap = createExistingBundlesMap(bundle)

      for (const name in bundle) {
        const chunkOrAsset = bundle[name]
        if (chunkOrAsset.type !== 'chunk') {
          continue
        }

        if (chunkOrAsset.isEntry) {
          bundlesMap.add(name)
        }
      }

      for (const folder of shopifyFolders) {
        if (folder === 'config') {
          continue
        }

        const srcFolder = path.join(paths.src, folder)
        const destFolder = path.join(paths.dist, folder)

        if (folder === 'assets') {
          await copyFilesAndFlattenResursively(srcFolder, destFolder, bundlesMap)
          continue
        }

        if (folder === 'sections') {
          continue
        }

        await fse.copy(srcFolder, destFolder)
      }
    },
  } satisfies Plugin
}
