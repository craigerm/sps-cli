import fs from 'node:fs'
import path from 'path'
import type { Plugin } from 'rollup'
import { z } from 'zod'
import type { BuildContext } from '../build-context'
import { JsonParseError, ToolingBaseError } from '../errors'
import { paths } from '../paths'
import { buildConfigSettingsSchema } from '../schema-parser/parser'
import { parseJsonFromFile } from '../schema-parser/utils'
import { type Setting, SettingParser } from '../schema-parser/validators'
import { logger, loggerWithContext } from '../utils/logger'
import { createWatcher } from './lib/watcher'

const ConfigThemeInfoParser = z
  .object({
    name: z.literal('theme_info'),
  })
  .passthrough()

const ConfigStandardSettingParser = z
  .object({
    name: z.string(),
    settings: z.array(SettingParser),
  })
  .passthrough()

const ConfigSettingsSchemaParser = z.array(
  z.union([ConfigThemeInfoParser, ConfigStandardSettingParser])
)

type ConfigSchemaSettings = z.infer<typeof ConfigSettingsSchemaParser>

const PLUGIN_NAME = 'transform-config-settings-plugin'
const log = loggerWithContext(PLUGIN_NAME)

export default function transformConfigSettingsPlugin(context: BuildContext): Plugin {
  let isFirstRun = true

  const srcFile = path.join(paths.config, 'settings_schema.json')
  const destFile = path.join(paths.dist, 'config', 'settings_schema.json')

  const transformFile = () => {
    log('Transforming: config/settings_schema.json')
    const content = parseJsonFromFile(srcFile)
    const result = ConfigSettingsSchemaParser.safeParse(content)

    // TODO: Handle errors gracefully
    if (result.success === false) {
      logger.error('Error parsing config/settings_schema.json')
      process.exit(1)
    }

    const data: ConfigSchemaSettings = result.data

    for (const item of data) {
      if ('settings' in item) {
        item.settings = buildConfigSettingsSchema(item.settings as Setting[])
      }
    }

    const newSource = JSON.stringify(data, null, 2)
    fs.writeFileSync(destFile, newSource, 'utf8')
  }

  const transformFileSafe = (handleErrors: boolean) => {
    try {
      transformFile()
    } catch (err) {
      if (handleErrors === true && err instanceof ToolingBaseError) {
        logger.error(err)
        return
      }
      logger.error(err)
      process.exit(1)
    }
  }

  return {
    name: PLUGIN_NAME,
    writeBundle() {
      if (isFirstRun === false) {
        return
      }

      isFirstRun = false
      transformFileSafe(false)

      if (context.isWatchMode === false) {
        return
      }

      createWatcher(log, srcFile, {
        onChange() {
          transformFileSafe(true)
        },
        onAdd() {
          logger.warn(
            'config/settings_schema.json added but it should be created before starting build. Exit and run again.'
          )
        },
        onDelete() {
          logger.warn(
            'config/settings_schema.json was deleted but it is a mandatory file, so cannot be pushed.'
          )
        },
      })
    },
  } satisfies Plugin
}
