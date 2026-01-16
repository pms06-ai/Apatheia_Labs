/**
 * APATHEIA LABS - LOGGING SERVICE
 *
 * Structured logging with levels, context, and formatting.
 * Supports both development (pretty) and production (JSON) output.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogContext {
  [key: string]: unknown
}

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
}

// Log level priorities
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
}

const env =
  typeof process !== 'undefined' && process.env
    ? process.env
    : ({} as Record<string, string | undefined>)

// Get minimum log level from environment
const MIN_LEVEL = (env.LOG_LEVEL as LogLevel) || (env.NODE_ENV === 'production' ? 'info' : 'debug')

// Check if running in production
const IS_PRODUCTION = env.NODE_ENV === 'production'

// ANSI colors for development
const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m', // Green
  warn: '\x1b[33m', // Yellow
  error: '\x1b[31m', // Red
  fatal: '\x1b[35m', // Magenta
}

/**
 * Format log entry for development (pretty print)
 */
function formatDev(entry: LogEntry): string {
  const color = COLORS[entry.level]
  const levelStr = entry.level.toUpperCase().padEnd(5)
  const time = new Date(entry.timestamp).toLocaleTimeString()

  let output = `${COLORS.dim}${time}${COLORS.reset} ${color}${levelStr}${COLORS.reset} ${entry.message}`

  if (entry.context && Object.keys(entry.context).length > 0) {
    output += ` ${COLORS.dim}${JSON.stringify(entry.context)}${COLORS.reset}`
  }

  if (entry.error) {
    output += `\n  ${COLORS.dim}└─${COLORS.reset} ${color}${entry.error.name}: ${entry.error.message}${COLORS.reset}`
    if (entry.error.stack && entry.level !== 'warn') {
      const stackLines = entry.error.stack.split('\n').slice(1, 4)
      output += `\n${COLORS.dim}${stackLines.join('\n')}${COLORS.reset}`
    }
  }

  return output
}

/**
 * Format log entry for production (JSON)
 */
function formatProd(entry: LogEntry): string {
  return JSON.stringify(entry)
}

/**
 * Check if log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL]
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
  if (!shouldLog(level)) return

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context && { context }),
    ...(error && {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    }),
  }

  const formatted = IS_PRODUCTION ? formatProd(entry) : formatDev(entry)

  switch (level) {
    case 'error':
    case 'fatal':
      console.error(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    default:
      console.log(formatted)
  }
}

// ============================================
// PUBLIC API
// ============================================

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext, error?: Error) =>
    log('warn', message, context, error),
  error: (message: string, error?: Error, context?: LogContext) =>
    log('error', message, context, error),
  fatal: (message: string, error?: Error, context?: LogContext) =>
    log('fatal', message, context, error),
}

/**
 * Create a child logger with preset context
 */
export function createLogger(baseContext: LogContext) {
  return {
    debug: (message: string, context?: LogContext) =>
      log('debug', message, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) =>
      log('info', message, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext, error?: Error) =>
      log('warn', message, { ...baseContext, ...context }, error),
    error: (message: string, error?: Error, context?: LogContext) =>
      log('error', message, { ...baseContext, ...context }, error),
    fatal: (message: string, error?: Error, context?: LogContext) =>
      log('fatal', message, { ...baseContext, ...context }, error),
  }
}

/**
 * Create logger for specific engine
 */
export function engineLogger(engineId: string) {
  return createLogger({ engine: engineId, component: 'engine' })
}

/**
 * Create logger for API routes
 */
export function apiLogger(route: string) {
  return createLogger({ route, component: 'api' })
}

/**
 * Request logging middleware helper
 */
export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  context?: LogContext
) {
  const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
  log(level, `${method} ${path} ${statusCode} ${durationMs}ms`, {
    method,
    path,
    statusCode,
    durationMs,
    ...context,
  })
}

/**
 * Performance timing helper
 */
export function createTimer(label: string) {
  const start = performance.now()
  return {
    end: (context?: LogContext) => {
      const duration = Math.round(performance.now() - start)
      logger.debug(`${label} completed`, { durationMs: duration, ...context })
      return duration
    },
    elapsed: () => Math.round(performance.now() - start),
  }
}

export default logger
