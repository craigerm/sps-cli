declare global {
  interface JSON {
    parse(text: string, reviver?: (key: any, value: string) => any): unknown
  }
}
