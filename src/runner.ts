#!/usr/bin/env bun
import { Command } from 'commander'
import process from 'node:process'
import devCommand, { type DevCommandArgs } from './commands/dev'
import pullCommand, { type PullCommandArgs } from './commands/pull'
import pushCommand, { type PushCommandArgs } from './commands/push'

process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))

const program = new Command()

program.name('templa').description('A wrapper for Shopify theme development')

program
  .command('push')
  .description('Generates production files and pushed changes to theme')
  .requiredOption('-s, --store <store>', 'Shopify store domain')
  .requiredOption('-t, --theme <themeId>', 'Development theme ID', parseInt)
  .option('--no-minify', 'Minify output files', true)
  .option('-f, --force', 'Allows pushing when repo is dirty', false)
  .option(
    '-d, --dry-run',
    'Dry run mode, does not push theme only builds to dist/',
    false
  )
  .action(async (options) => {
    await pushCommand(options as PushCommandArgs)
  })

program
  .command('dev')
  .description('Builds the theme in development mode start shopify cli')
  .requiredOption('-s, --store <store>', 'Shopify store domain')
  .requiredOption('-t, --theme <themeId>', 'Development theme ID', parseInt)
  .action(async (options) => {
    await devCommand(options as DevCommandArgs)
  })

program
  .command('pull')
  .description('Pulls json templates and settings into data folder for backup purposes.')
  .requiredOption('-s, --store <store>', 'Shopify store domain')
  .requiredOption('-t, --theme <themeId>', 'Development theme ID', parseInt)
  .action(async (options) => {
    await pullCommand(options as PullCommandArgs)
  })

program.parse(process.argv)
