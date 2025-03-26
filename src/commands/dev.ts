import type { BuildContext } from '../build-context'
import { build } from '../config'

export type DevCommandArgs = {
  store: string
  theme: number
}

export default async function devCommand(args: DevCommandArgs) {
  const context: BuildContext = {
    isDev: true,
    prefix: 'app',
    logLevel: 'info',
    isWatchMode: true,
    minify: false,
    postCSS: true,
    format: 'esm',
    store: args.store,
    themeId: args.theme,
    dryRun: false,
  }
  await build(context)
}
