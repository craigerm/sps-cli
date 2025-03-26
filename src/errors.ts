import { z } from 'zod'
import { ParserContext } from './schema-parser/context'

export function wrapError(error: any) {
  return error instanceof Error ? error : new Error(String(error))
}

/*
 * All app errors should extend from ToolingBaseError
 */
export class ToolingBaseError extends Error {
  constructor(message: string) {
    super(message)
    Error.captureStackTrace(this, this.constructor)
  }
}

/*
 * Base error for parsing related errors
 */

export class ParsingError extends ToolingBaseError {
  context: ParserContext
  constructor(message: string, context: ParserContext) {
    super(message)
    this.context = context
  }
}

/**
 * Base error for bundle related errors
 */
export class BundleError extends ToolingBaseError {
  constructor(message: string) {
    super(message)
  }
}

/**
 * Specific errors
 */

export class SchemaNotFoundError extends ParsingError {
  schemaName: string
  constructor(schemaName: string, context: ParserContext) {
    super(
      `Schema missing Error: "schema/${schemaName}.json" inside "${context.filename}"`,
      context
    )
    this.schemaName = schemaName
  }
}
export class CircularReferenceParserError extends ParsingError {
  constructor(partialName: string, context: ParserContext) {
    super(
      `Circular reference detected for partial: "${partialName} in file: "${context.filename}"`,
      context
    )
  }
}

export class BlockParserError extends ParsingError {
  zodError: z.ZodError
  constructor(context: ParserContext, zodError: z.ZodError) {
    super(`Failed to parse block schema inside "${context.filename}"`, context)
    this.zodError = zodError
  }
}

export class SchemaParserError extends ParsingError {
  zodError: z.ZodError
  constructor(context: ParserContext, zodError: z.ZodError) {
    super(`Failed to parse section schema inside "${context.filename}"`, context)
    this.zodError = zodError
  }
}

export class JsonSchemaParsingError extends ParsingError {
  constructor(filename: string, innerError: Error, context: ParserContext) {
    super(
      `Failed to parse JSON file: "schemas/${filename}" referenced by "${context.filename}, ${innerError.message}"`,
      context
    )
  }
}

export class ImportTypeNotSupportedError extends BundleError {
  constructor(file: string) {
    super(
      `Only JS files can be imported into your JS bundles. Attempted to import: "${file}".`
    )
  }
}

export class CSSFileNotSupportedError extends BundleError {
  constructor(_currentBundle: string, cssFile: string) {
    super(`CSS imports are not supported inside JS bundles, file: "${cssFile}`)
  }
}

export class DuplicateBundleError extends BundleError {
  constructor(bundleName: string, src: string) {
    super(`Duplicate bundle name generated "${bundleName} from src "${src}"`)
  }
}

export class DuplicateAssetDetectedError extends BundleError {
  constructor(bundleName: string) {
    super(
      `Attempting to add duplicate asset "assets/${bundleName} to "dist/assets". Check name conflicts with your bundles."`
    )
  }
}

export class SassCompileError extends ToolingBaseError {
  constructor(bundleName: string, innerError: Error) {
    super(`Failed to compile CSS bundle "${bundleName}"\n` + innerError.message)
  }
}

export class PostCSSError extends ToolingBaseError {
  constructor(bundleName: string, innerError: Error | string) {
    super(
      `Failed to compile CSS bundle "${bundleName}"\n` + wrapError(innerError).message
    )
  }
}

export class JsonParseError extends ToolingBaseError {
  constructor(file: string, innerError: Error) {
    super(`Failed to parse JSON inside: ${file}"\n` + innerError.message)
  }
}
