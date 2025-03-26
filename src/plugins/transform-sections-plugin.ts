import chalk from 'chalk'
import fs from 'node:fs'
import path from 'path'
import type { Plugin } from 'rollup'
import yamlFront from 'yaml-front-matter'
import { z } from 'zod'
import type { BuildContext } from '../build-context'
import { ParsingError, SchemaParserError } from '../errors'
import { paths } from '../paths'
import { buildSectionSchema } from '../schema-parser/parser'
import type { SectionSchema } from '../schema-parser/validators'
import { loggerWithContext } from '../utils/logger'
import { deleteFileFromDist } from './lib/file-utils'
import { createWatcher } from './lib/watcher'

const PLUGIN_NAME = 'transform-sections-plugin'
const log = loggerWithContext(PLUGIN_NAME)
const outputDir = path.join(paths.dist, 'sections')

const SectionDataParser = z
  .object({
    name: z.string(),
    schema: z.string(),
    __content: z.string(),
  })
  .strict()

function normalizeSectionName(name: string) {
  return name.startsWith('_') ? name.slice(1) : name
}

function generateSection(srcFile: string) {
  const name = path.basename(srcFile)
  const textContent = fs.readFileSync(srcFile, 'utf8')
  const rawData = yamlFront.loadFront(textContent)
  const result = SectionDataParser.safeParse(rawData)

  if (result.success === false) {
    console.log(
      `[ERROR] The following section values are invalid (found inside sections/${name}):`
    )
    result.error.issues.forEach((issue) => {
      console.log(issue.message)
    })
    process.exit(1)
  }

  const data = result.data

  data.__content = data.__content[0] === '\n' ? data.__content.slice(1) : data.__content

  const output: string[] = []
  output.push(data.__content)

  let finalSchema: SectionSchema | null = null

  try {
    finalSchema = buildSectionSchema(name, data.name, data.schema)
  } catch (err) {
    if (err instanceof ParsingError) {
      console.log(chalk.redBright(err.message))
      console.log(chalk.redBright(err.context.formatCallstack()))
      console.log(chalk.redBright(err.stack))

      if (err instanceof SchemaParserError) {
        // console.log('ZodError', err.zodError)
      }

      process.exit(1)
    }
    throw err
  }

  output.push('{% schema %}')
  output.push(JSON.stringify(finalSchema, null, 2))
  output.push('{% endschema %}')
  return output.join('\n')
}

function updateSection(file: string) {
  // log(`Updating section: ${file}`)
  const name = path.basename(file)

  // Normal sections
  if (name[0] !== '_') {
    const srcFile = path.join(paths.sections, name)
    const destFile = path.join(outputDir, name)
    fs.copyFileSync(srcFile, destFile)
    return
  }

  // Partial sections
  const destFile = path.join(outputDir, name.slice(1))
  const item = path.join(paths.sections, name)
  const newSource = generateSection(item)
  fs.writeFileSync(destFile, newSource, 'utf8')
}

export default function transformSectionsPlugin(context: BuildContext): Plugin {
  let isFirstRun = true

  return {
    name: PLUGIN_NAME,
    writeBundle() {
      if (isFirstRun === false) {
        return
      }

      isFirstRun = false

      const files = fs.readdirSync(paths.sections, {
        withFileTypes: true,
      })

      for (const file of files) {
        if (file.isDirectory()) {
          throw new Error(
            `[ERROR] Section directories are not supported (folder: sections/${file.name})`
          )
        }

        updateSection(file.name)
      }

      if (context.isWatchMode === false) {
        return
      }

      createWatcher(log, paths.sections, {
        onChange(file: string) {
          updateSection(file)
        },
        onAdd(file: string) {
          updateSection(file)
        },
        onDelete(file: string) {
          /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
          deleteFileFromDist(normalizeSectionName(file))
        },
      })
    },
  } satisfies Plugin
}
