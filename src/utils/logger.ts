import { createConsola } from 'consola'

export type LogLevel = 'trace' | 'debug' | 'info' | 'error'

let currentLogLevel: LogLevel = 'debug'

const LOG_LEVEL_TRACE: LogLevel = 'trace'
const LOG_LEVEL_DEBUG: LogLevel = 'debug'
const LOG_LEVEL_INFO: LogLevel = 'info'
const LOG_LEVEL_ERROR: LogLevel = 'error'

export function setLogLevel(level: LogLevel) {
  currentLogLevel = level
}

export const logger = createConsola({
  formatOptions: {
    date: false,
  },
})

const logLevelPriority: Record<LogLevel, number> = {
  [LOG_LEVEL_TRACE]: 0,
  [LOG_LEVEL_DEBUG]: 1,
  [LOG_LEVEL_INFO]: 2,
  [LOG_LEVEL_ERROR]: 3,
}

export function log(message: string | Error, level: LogLevel = 'debug') {
  if (level === 'error' || message instanceof Error) {
    logger.error(message)
    if (message instanceof Error) {
      logger.error(message.stack)
    }
    return
  }

  if (logLevelPriority[level] >= logLevelPriority[currentLogLevel]) {
    console.log(message)
  }
}

export type LoggerFunc = (message: string | Error, level?: LogLevel) => void

export const loggerWithContext =
  (context: string): LoggerFunc =>
  (message: string | Error, level: LogLevel = 'debug') => {
    log(`[${context}] ${message}`, level)
  }
