import path from 'node:path'

export const prefixName = (prefix: string | null | undefined, name: string) => {
  return prefix ? `${prefix}-${name}` : name
}
export const pascalCaseFromPath = (prefix: string | null, filePath: string) => {
  let name = path.basename(filePath, path.extname(filePath))
  name = prefixName(prefix, name)
  return name
    .split(/[-.]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}
