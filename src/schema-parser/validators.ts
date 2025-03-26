import { z } from 'zod'

const HeaderSettingParser = z.object({
  type: z.literal('header'),
  content: z.string(),
  info: z.string().optional(),
})

const ParagraphSettingParser = z.object({
  type: z.literal('paragraph'),
  content: z.string(),
})

const StandardSettingParser = z
  .object({
    type: z.string(),
    id: z.string(),
    label: z.string().optional(),
    default: z.any().optional(),
  })
  .passthrough()

const CustomPartialParser = z.string().startsWith('_')

export const SettingParser = z.union([
  CustomPartialParser,
  HeaderSettingParser,
  ParagraphSettingParser,
  StandardSettingParser,
])

const StandardBlockParser = z.object({
  type: z.string(),
  name: z.string(),
  settings: z.array(SettingParser).optional(),
})

const AppBlockParser = z.object({
  type: z.literal('@app'),
})

const BlockParser = z.union([CustomPartialParser, AppBlockParser, StandardBlockParser])

export const SectionSchemaParser = z
  .object({
    name: z.string().optional(),
    enabled_on: z.any().optional(),
    disabled_on: z.any().optional(),
    tag: z.string().optional(),
    class: z.string().optional(),
    templates: z.any().optional(),
    max_blocks: z.number().optional(),
    limit: z.number().optional(),
    settings: z.array(SettingParser).optional(),
    blocks: z.array(BlockParser).optional(),
    presets: z.any().optional(),
  })
  .strict()

export const SettingPartialSchemaParser = z.array(SettingParser)
export const BlockPartialSchemaParser = BlockParser

export type SettingPartialSchema = z.infer<typeof SettingPartialSchemaParser>
export type SectionSchema = z.infer<typeof SectionSchemaParser>
export type StandardBlock = z.infer<typeof StandardBlockParser>
export type BlockPartialSchema = z.infer<typeof BlockPartialSchemaParser>
export type Block = z.infer<typeof BlockParser>
export type Setting = z.infer<typeof SettingParser>
