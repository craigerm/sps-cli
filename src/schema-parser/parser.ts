import fs from 'node:fs'
import path from 'node:path'
import { JsonSchemaParsingError, SchemaNotFoundError, SchemaParserError } from '../errors'
import { paths } from '../paths'
import { ParserContext } from './context'
import {
  type Block,
  type BlockPartialSchema,
  BlockPartialSchemaParser,
  type SectionSchema,
  SectionSchemaParser,
  type Setting,
  type SettingPartialSchema,
  SettingPartialSchemaParser,
} from './validators'

type PartialInfo = {
  name: string
  prefix: string
  suffix: string
  label: string
  defaultValue: string
}

function readSchemaJSON(schemaName: string, context: ParserContext): unknown {
  const schemaFile = path.join(paths.schemas, schemaName + '.json')

  if (!fs.existsSync(schemaFile)) {
    throw new SchemaNotFoundError(schemaName, context)
  }

  try {
    return JSON.parse(fs.readFileSync(schemaFile, 'utf8'))
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw new JsonSchemaParsingError(schemaName, err, context)
    }
    throw err
  }
}

function parsePartialNameDetails(
  nameWithOptionalData: string,
  basePrefix: string,
  baseSuffix: string
): PartialInfo {
  const info: PartialInfo = {
    name: nameWithOptionalData,
    prefix: '',
    suffix: '',
    label: '',
    defaultValue: '',
  }

  if (nameWithOptionalData.indexOf('#') !== -1) {
    const parts = nameWithOptionalData.split('#')
    info.name = parts[0]
    info.prefix = parts[1] || ''
    info.suffix = parts[2] || ''
    info.label = parts[3] || ''
    info.defaultValue = parts[4] || ''
  }

  info.prefix = joinNames(basePrefix, info.prefix)
  info.suffix = joinNames(baseSuffix, info.suffix)

  return info
}

function buildSettingId(info: PartialInfo, id: string) {
  const newId = info.prefix ? `${info.prefix}_${id}` : id
  return newId + (info.suffix || '')
}

function buildSettingLabel(info: PartialInfo, label: string) {
  if (info.suffix) {
    return `${label} #${info.suffix}`
  }
  return label
}

function joinNames(prefix: string, name: string) {
  if (prefix && name) {
    return prefix + '_' + name
  }

  if (prefix) {
    return prefix
  }
  return name
}

function loadBlockPartialSchema(
  name: string,
  context: ParserContext,
  basePrefix: string,
  baseSuffix: string
): BlockPartialSchema {
  context.push({ type: 'partial', value: name })
  const partialInfo = parsePartialNameDetails(name, basePrefix, baseSuffix)
  const raw = readSchemaJSON(partialInfo.name, context)
  const result = BlockPartialSchemaParser.safeParse(raw)

  if (result.success === false) {
    throw new SchemaParserError(context, result.error)
  }

  context.pop()
  return result.data
}

function loadSettingPartialSchema(
  name: string,
  context: ParserContext,
  basePrefix: string,
  baseSuffix: string
): [SettingPartialSchema, string, string] {
  context.push({ type: 'partial', value: name })

  const partialInfo = parsePartialNameDetails(name, basePrefix, baseSuffix)
  const raw = readSchemaJSON(partialInfo.name, context)
  const result = SettingPartialSchemaParser.safeParse(raw)

  if (result.success === false) {
    throw new SchemaParserError(context, result.error)
  }

  const partial: SettingPartialSchema = result.data

  for (let i = 0; i < partial.length; i++) {
    const setting = partial[i]

    if (typeof setting === 'string') {
      continue
    }

    if ('label' in setting && partialInfo.label) {
      setting.label = partialInfo.label
    }

    if ('default' in setting && partialInfo.defaultValue) {
      setting.default = partialInfo.defaultValue
    }

    if (typeof setting.content === 'string') {
      setting.content = buildSettingLabel(partialInfo, setting.content)
    } else if ('id' in setting) {
      setting.id = buildSettingId(partialInfo, setting.id)

      if (setting.label) {
        setting.label = buildSettingLabel(partialInfo, setting.label)
      }
    }
  }

  context.pop()
  return [partial, partialInfo.prefix, partialInfo.suffix] as const
}

function transformSetting(
  setting: Setting,
  context: ParserContext,
  prefix: string,
  suffix: string
): Setting[] {
  if (typeof setting === 'string') {
    const newSettings: Setting[] = []
    const [partialSchema, newPrefix, newSuffix] = loadSettingPartialSchema(
      setting,
      context,
      prefix,
      suffix
    )

    partialSchema.forEach((partialSetting) => {
      const transformedSettings = transformSetting(
        partialSetting,
        context,
        newPrefix,
        newSuffix
      )
      newSettings.push(...transformedSettings)
    })
    return newSettings
  }

  return [setting]
}

function replaceSettings(settings: Setting[], context: ParserContext) {
  const newSettings: Setting[] = []
  for (const setting of settings) {
    newSettings.push(...transformSetting(setting, context, '', ''))
  }
  return newSettings
}

function replaceBlocks(blocks: Block[], context: ParserContext) {
  const newBlocks: Block[] = []

  for (const block of blocks) {
    if (typeof block === 'string') {
      const partial = loadBlockPartialSchema(block, context, '', '')
      newBlocks.push(partial)
      continue
    }

    // For "@app" and normal blocks
    if ('settings' in block === false) {
      newBlocks.push(block)
      continue
    }

    context.push({ type: 'block', value: block.name })
    block.settings = replaceSettings(block.settings || [], context)
    newBlocks.push(block)
    context.pop()
  }
  return newBlocks
}

export function buildSectionSchema(
  sectionFile: string,
  name: string,
  schemaName: string
) {
  const context = new ParserContext(`sections/${sectionFile}`)
  context.push({ type: 'schema', value: schemaName })

  const rawSchema = readSchemaJSON(schemaName, context)
  const result = SectionSchemaParser.safeParse(rawSchema)

  if (result.success === false) {
    throw new SchemaParserError(context, result.error)
  }

  const schema: SectionSchema = result.data
  schema.name = name

  if (schema.settings && schema.settings.length > 0) {
    context.push({ type: 'settings', value: schema.settings.length.toString() })
    schema.settings = replaceSettings(schema.settings, context)
    context.pop()
  }

  if (schema.blocks) {
    context.push({ type: 'blocks', value: schema.blocks.length.toString() })
    schema.blocks = replaceBlocks(schema.blocks, context)
    context.pop()
  }

  context.pop()

  return schema
}

export function buildConfigSettingsSchema(settings: Setting[]) {
  const context = new ParserContext('config/settings_data.json')
  return replaceSettings(settings, context)
}
