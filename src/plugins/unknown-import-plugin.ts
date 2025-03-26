import path from 'node:path'
import type { Plugin } from 'rollup'
import type { BuildContext } from '../build-context'
import { ImportTypeNotSupportedError } from '../errors'
import { loggerWithContext } from '../utils/logger'

const PLUGIN_NAME = 'unknown-import-plugin'
const log = loggerWithContext(PLUGIN_NAME)

export default function scssPlugin(_context: BuildContext): Plugin {
  return {
    name: PLUGIN_NAME,

    transform(_source, id) {
      if (/\.(js|mjs|cjs)$/.test(id)) {
        return
      }
      log(`Invalid extension for import detected ${id}`)
      throw new ImportTypeNotSupportedError(id)
    },
  }
}
