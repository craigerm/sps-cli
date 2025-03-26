type ContextInfo = {
  type: 'settings' | 'setting' | 'section' | 'blocks' | 'block' | 'schema' | 'partial'
  value: string
}

const DEBUG_STACK = false

export class ParserContext {
  #filename: string
  #callstack: ContextInfo[]
  #partialSet: Set<string>

  constructor(filename: string) {
    this.#filename = filename
    this.#callstack = []
    this.#partialSet = new Set()
  }

  get filename() {
    return this.#filename
  }

  push(info: ContextInfo) {
    if (DEBUG_STACK) {
      console.log('[STACK] Push', info)
    }

    if (
      (info.type === 'schema' || info.type === 'partial') &&
      this.#partialSet.has(info.value)
    ) {
      throw new Error(
        `Circular reference detected for partial "${info.value}" in section "${this.#filename}"`
      )
    }

    this.#callstack.push(info)
  }

  pop() {
    if (DEBUG_STACK) {
      console.log('[STACK] Pop', this.#callstack[this.#callstack.length - 1])
    }

    this.#callstack.pop()
  }

  formatCallstack() {
    if (this.#callstack.length > 0) {
      const str = this.#callstack.map((x) => `-> ${x.type}=${x.value}`).join('\n')

      return `Filename: ${this.#filename}, Callstack: \n${str}`
    }
    return 'Callstack: empty'
  }
}
