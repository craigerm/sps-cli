import type { LogLevel } from './utils/logger'

export type BuildContext = {
  isDev: boolean
  isWatchMode: boolean
  prefix: string | null
  logLevel: LogLevel
  minify: boolean
  postCSS: boolean
  format: 'esm' | 'iife'
  store: string
  themeId: number
  dryRun: boolean
}
