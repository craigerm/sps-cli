import fs from 'node:fs/promises'
import path from 'path'
import type { OutputBundle, Plugin } from 'rollup'
import type { BuildContext } from '../build-context'
import { paths } from '../paths'
import { loggerWithContext } from '../utils/logger'

const PLUGIN_NAME = 'import-map-plugin'
const log = loggerWithContext(PLUGIN_NAME)

export default function importMapPlugin(context: BuildContext): Plugin {
  const outputPath = path.join(paths.dist, 'snippets', 'app-import-map.liquid')
  let isFirstRun = true

  return {
    name: PLUGIN_NAME,
    async writeBundle(_options, bundle: OutputBundle) {
      if (isFirstRun === false) {
        return
      }

      isFirstRun = false

      if (context.format !== 'esm') {
        log(`Generating empty import map, since format=${context.format}`)
        const content = [
          '{% # Auto-generated. Do not edit!  %}',
          '{% # ESM is used during development, so this file should be included in your theme for both devproduction %}',
        ].join('\n')

        await fs.writeFile(outputPath, content, 'utf8')
        return
      }

      log('Generating import map, since format=esm')

      const importMap: Record<string, string> = {}

      for (const name in bundle) {
        const chunk = bundle[name]

        if (chunk.type !== 'chunk') {
          continue
        }

        importMap['./' + chunk.fileName] = `{{ '${chunk.fileName}' | asset_url }}`
      }

      const data = {
        imports: importMap,
      }

      const src = [
        '{% # Import maps are auto-generated. Do not update this file directly. -%}',
        '<script type="importmap">',
        JSON.stringify(data, null, 2),
        '</script>',
      ].join('\n')

      await fs.writeFile(outputPath, src, 'utf8')
    },
  } satisfies Plugin
}
