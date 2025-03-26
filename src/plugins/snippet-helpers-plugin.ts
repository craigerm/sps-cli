import fs from 'node:fs/promises'
import path from 'path'
import type { Plugin } from 'rollup'
import { simpleGit } from 'simple-git'
import type { BuildContext } from '../build-context'
import { paths } from '../paths'
import { loggerWithContext } from '../utils/logger'
import { type TextVariables, replaceVariables } from '../utils/text-variables'

const PLUGIN_NAME = 'snippet-helpers-plugin'
const log = loggerWithContext(PLUGIN_NAME)

const git = simpleGit({
  baseDir: paths.root,
})

async function getAppVersion(context: BuildContext) {
  const r = await git.version()

  let version = context.isDev ? 'development' : 'production'

  if (!r.installed) {
    return version
  }

  try {
    version = (await git.raw('describe')).trim()
    if (context.isDev) {
      version += '-dev'
    }
  } catch (_err) {
    log(`No git tags found, using "${version}" as version`, 'debug')
  }

  return version
}

export default function snippetHelpersPlugin(context: BuildContext): Plugin {
  let isFirstRun = true

  async function copyFile(snippetName: string, variables: TextVariables | null = null) {
    log(`Generating ${snippetName} snippet`)

    const srcFile = path.join(__dirname, '..', 'snippets', snippetName)
    const destFile = path.join(paths.dist, 'snippets', snippetName)
    const content = await fs.readFile(srcFile, 'utf8')
    const replacedContent = variables ? replaceVariables(content, variables) : content
    await fs.writeFile(destFile, replacedContent, 'utf8')
  }

  return {
    name: PLUGIN_NAME,
    async writeBundle() {
      if (!isFirstRun) {
        return
      }

      log('Creating helper snippets')

      isFirstRun = false

      const prefix = context.prefix ? `${context.prefix}-` : ''
      const jsExt = context.minify ? '.min.js' : '.js'
      const cssExt = '.css'
      const scriptType = context.format === 'esm' ? ' type="module" ' : ' '

      log(`Using info: ${prefix}, ${jsExt}, ${cssExt}`)

      await copyFile('app-js.liquid', {
        PREFIX: prefix,
        SCRIPT_TYPE: scriptType,
        EXT: jsExt,
      })
      await copyFile('app-css.liquid', {
        PREFIX: prefix,
        EXT: cssExt,
      })
      await copyFile('app-js-format.liquid', { FORMAT: context.format })
      await copyFile('app-version.liquid', {
        APP_VERSION: await getAppVersion(context),
      })
    },
  } satisfies Plugin
}
