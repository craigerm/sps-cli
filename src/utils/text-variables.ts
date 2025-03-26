export type TextVariables = Record<string, string | number | boolean>

export function replaceVariables(content: string, variables: TextVariables) {
  return content.replace(/%(\w+)%/g, (match, key: string) => {
    return String(variables.hasOwnProperty(key) ? variables[key] : match)
  })
}
