import { simpleGit } from 'simple-git'
import type { BuildContext } from '../build-context'
import { build } from '../config'
import { pushTheme } from '../shopify/cli-wrapper'
import { logger } from '../utils/logger'

export type PushCommandArgs = {
  store: string
  theme: number
  minify: boolean
  dryRun: boolean
  force: boolean
}

export default async function pushCommand(args: PushCommandArgs) {
  const context: BuildContext = {
    isDev: false,
    prefix: 'app',
    logLevel: 'info',
    isWatchMode: false,
    minify: args.minify,
    postCSS: true,
    format: 'esm',
    store: args.store,
    themeId: args.theme,
    dryRun: args.dryRun,
  }

  const status = await simpleGit().status()

  if (args.force === false && context.dryRun === false) {
    if (!status.isClean()) {
      logger.error(
        'You have uncommited changes in your repo, please commit or stash and try again or pass --force to ignore this warning.'
      )
      return
    }
  }

  await build(context)

  if (context.dryRun === true) {
    logger.warn('Building in dry run mode, skipping pushing theme files.')
    return
  }

  await pushTheme(context)
}
