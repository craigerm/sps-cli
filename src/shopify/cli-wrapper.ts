import { execa } from 'execa'
import path from 'path'
import type { BuildContext } from '../build-context'

export async function displayThemeInfo(context: BuildContext) {
  await execa({
    stdout: 'inherit',
    stderr: 'inherit',
  })`shopify theme info --store=${context.store} --theme=${context.themeId}`
}

export async function watchDev(context: BuildContext) {
  await execa({
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  })`shopify theme dev --path=dist --store=${context.store} --theme=${context.themeId}`
}

export async function pushTheme(context: BuildContext) {
  await execa({
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  })`shopify theme push --path=dist --store=${context.store} --theme=${context.themeId}`
}

export async function pullData(store: string, themeId: number) {
  const folder = path.join(process.cwd(), 'src', 'data')
  await execa({
    stdout: 'inherit',
    stderr: 'inherit',
  })`shopify theme pull
      --force --path ${folder}
      --store=${store}
      --theme=${themeId}
      --only=templates/*.json
      --only=config/settings_data.json`
}
