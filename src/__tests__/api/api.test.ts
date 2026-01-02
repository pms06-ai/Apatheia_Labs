/**
 * API ROUTE TESTS
 * 
 * Tests for API validation and error handling patterns.
 */

import { describe, it, expect } from '@jest/globals'

// Skip complex mocking - we'll test the actual modules directly
describe('Validation Library', () => {
  it('should validate UUIDs correctly', async () => {
    const { uuidSchema } = await import('@/lib/validation')

    // Valid UUID
    expect(() => uuidSchema.parse('550e8400-e29b-41d4-a716-446655440000')).not.toThrow()

    // Invalid UUID
    expect(() => uuidSchema.parse('not-a-uuid')).toThrow()
    expect(() => uuidSchema.parse('')).toThrow()
  })

  it('should validate engine IDs', async () => {
    const { engineIdSchema } = await import('@/lib/validation')

    expect(() => engineIdSchema.parse('omission')).not.toThrow()
    expect(() => engineIdSchema.parse('contradiction')).not.toThrow()
    expect(() => engineIdSchema.parse('invalid')).toThrow()
  })

  // it('should validate cron route dynamic export', async () => {
  //   // Test that cron routes have dynamic exports to prevent static caching
  //   const cronRoute = await import('@/app/api/cron/process-queue/route')

  //   // Should have dynamic export set to 'force-dynamic'
  //   expect(cronRoute.dynamic).toBe('force-dynamic')
  //   expect(cronRoute.maxDuration).toBeDefined()
  //   expect(typeof cronRoute.maxDuration).toBe('number')
  // })

  it('should validate run engine schema', async () => {
    const { runEngineSchema } = await import('@/lib/validation')

    // Valid input
    const validInput = {
      caseId: '550e8400-e29b-41d4-a716-446655440000',
      documentIds: ['550e8400-e29b-41d4-a716-446655440001'],
    }
    expect(() => runEngineSchema.parse(validInput)).not.toThrow()

    // Invalid - missing caseId
    expect(() => runEngineSchema.parse({ documentIds: ['abc'] })).toThrow()

    // Invalid - empty documentIds
    expect(() => runEngineSchema.parse({ caseId: '550e8400-e29b-41d4-a716-446655440000', documentIds: [] })).toThrow()
  })

  it('should format Zod errors correctly', async () => {
    const { formatZodError, runEngineSchema } = await import('@/lib/validation')

    const result = runEngineSchema.safeParse({})

    if (!result.success) {
      const formatted = formatZodError(result.error)
      expect(formatted.message).toBe('Validation failed')
      expect(formatted.errors).toBeInstanceOf(Array)
      expect(formatted.errors.length).toBeGreaterThan(0)
      expect(formatted.errors[0].path).toBeDefined()
      expect(formatted.errors[0].message).toBeDefined()
    }
  })
})

describe('Error Library', () => {
  it('should create application errors', async () => {
    const { AppError, EngineError } = await import('@/lib/errors')

    // Use a valid ErrorCode
    const error = new AppError('Test error', 'VALIDATION_ERROR', 400)
    expect(error.message).toBe('Test error')
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.statusCode).toBe(400)

    // EngineError takes (engineId, message) in that order
    const engineError = new EngineError('omission', 'Engine failed')
    expect(engineError.engineId).toBe('omission')
    expect(engineError.message).toBe('Engine failed')
  })

  it('should convert errors to AppError', async () => {
    const { toAppError, AppError } = await import('@/lib/errors')

    const standardError = new Error('Standard error')
    const appError = toAppError(standardError)

    expect(appError).toBeInstanceOf(AppError)
    expect(appError.message).toBe('Standard error')
  })

  it('should create specific error types', async () => {
    const { ValidationError, NotFoundError, AuthenticationError } = await import('@/lib/errors')

    const validationError = new ValidationError('Invalid input')
    expect(validationError.code).toBe('VALIDATION_ERROR')
    expect(validationError.statusCode).toBe(400)

    const notFoundError = new NotFoundError('Document', '123')
    expect(notFoundError.code).toBe('NOT_FOUND')
    expect(notFoundError.statusCode).toBe(404)

    const authError = new AuthenticationError()
    expect(authError.code).toBe('AUTH_REQUIRED')
    expect(authError.statusCode).toBe(401)
  })
})

describe('Logger', () => {
  it('should export logger with expected methods', async () => {
    const { logger } = await import('@/lib/logger')

    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.debug).toBe('function')
  })
})

