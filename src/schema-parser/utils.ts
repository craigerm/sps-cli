import fs from 'node:fs'
import { JsonParseError } from '../errors'

export function parseJSON(label: string, str: string): unknown {
  try {
    return JSON.parse(str)
  } catch (err) {
    const innerError = err instanceof Error ? err : new Error(err as string)
    throw new JsonParseError(label, innerError)
  }
}

export function parseJsonFromFile(file: string) {
  return parseJSON(file, fs.readFileSync(file, 'utf8'))
}
