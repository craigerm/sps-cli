import fse from 'fs-extra'
import path from 'path'
import type { Plugin } from 'rollup'
import type { BuildContext } from '../build-context'
import { paths } from '../paths'
import { loggerWithContext } from '../utils/logger'
import { copyFileToDist, deleteFileFromDist } from './lib/file-utils'
import { createWatcher } from './lib/watcher'

const PLUGIN_NAME = 'copy-special-files-plugin'
const log = loggerWithContext(PLUGIN_NAME)

export default function copySpecialFilesPlugin(context: BuildContext): Plugin {
  let isFirstRun = true

  async function copy(srcFolder: string, filename: string, destFolder?: string) {
    const srcFile = path.join(srcFolder, filename)
    const destFile = destFolder
      ? path.join(paths.dist, destFolder, filename)
      : path.join(paths.dist, filename)

    await fse.copy(srcFile, destFile)
  }

  return {
    name: PLUGIN_NAME,
    async writeBundle() {
      if (isFirstRun === false) {
        return
      }

      log('Starting full copy')
      isFirstRun = false

      const filesToWatch = ['.shopifyignore']

      log('Coping: .shopifyignore')
      await copy(paths.root, '.shopifyignore')

      // log('Coping: settings_data.json')
      // await copy(paths.config, 'settings_data.json', 'config')

      log('Generating: app-build-mode.liquid')
      fse.writeFileSync(
        path.join(paths.dist, 'snippets', 'app-build-mode.liquid'),
        'development',
        { encoding: 'utf8' }
      )

      if (context.isWatchMode === false) {
        return
      }

      createWatcher(log, filesToWatch, {
        onChange(path: string) {
          /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
          copyFileToDist(path)
        },
        onAdd(path: string) {
          /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
          copyFileToDist(path)
        },
        onDelete(path: string) {
          /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
          deleteFileFromDist(path)
        },
      })
    },
  } satisfies Plugin
}
