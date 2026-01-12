/**
 * Environment Variable Validation
 * Validates required environment variables at startup
 * 
 * @module lib/env
 */

import { z } from 'zod'

// =============================================================================
// Environment Schema
// =============================================================================

const envSchema = z.object({
  // Supabase (Required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // AI Providers (At least one required)
  GROQ_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Storage (Optional - uses Supabase storage as fallback)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),

  // Modal (Optional - for PDF processing)
  MODAL_TOKEN_ID: z.string().optional(),
  MODAL_TOKEN_SECRET: z.string().optional(),

  // App Config
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Security
  CRON_SECRET: z.string().optional(),
})

// =============================================================================
// Type Definitions
// =============================================================================

export type Env = z.infer<typeof envSchema>

export interface EnvValidationResult {
  success: boolean
  env?: Env
  errors?: string[]
  warnings?: string[]
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validates all environment variables
 * Call this at application startup
 */
export function validateEnv(): EnvValidationResult {
  const warnings: string[] = []

  // Collect environment variables
  const rawEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    MODAL_TOKEN_ID: process.env.MODAL_TOKEN_ID,
    MODAL_TOKEN_SECRET: process.env.MODAL_TOKEN_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    CRON_SECRET: process.env.CRON_SECRET,
  }

  // Parse and validate
  const result = envSchema.safeParse(rawEnv)

  if (!result.success) {
    const errors = result.error.errors.map(
      (err) => `${err.path.join('.')}: ${err.message}`
    )
    return { success: false, errors }
  }

  // Check for warnings (optional but recommended)
  if (!result.data.R2_ACCOUNT_ID) {
    warnings.push('R2 storage not configured - using Supabase storage')
  }
  if (!result.data.MODAL_TOKEN_ID) {
    warnings.push('Modal not configured - PDF processing will be limited')
  }
  if (!result.data.CRON_SECRET) {
    warnings.push('CRON_SECRET not set - cron endpoints unprotected')
  }
  if (!result.data.NEXT_PUBLIC_APP_URL) {
    warnings.push('NEXT_PUBLIC_APP_URL not set - some features may not work correctly')
  }

  return {
    success: true,
    env: result.data,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

/**
 * Get validated environment or throw
 * Use this when you need the env and want to fail fast
 */
export function getEnv(): Env {
  const result = validateEnv()
  if (!result.success) {
    throw new Error(
      `Environment validation failed:\n${result.errors?.join('\n')}`
    )
  }
  return result.env!
}

/**
 * Check if a specific feature is available based on env config
 */
export function hasFeature(feature: 'r2' | 'modal' | 'groq' | 'anthropic' | 'gemini' | 'openai'): boolean {
  switch (feature) {
    case 'r2':
      return !!(
        process.env.R2_ACCOUNT_ID &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY
      )
    case 'modal':
      return !!(process.env.MODAL_TOKEN_ID && process.env.MODAL_TOKEN_SECRET)
    case 'groq':
      return !!process.env.GROQ_API_KEY
    case 'anthropic':
      return !!process.env.ANTHROPIC_API_KEY
    case 'gemini':
      return !!process.env.GOOGLE_AI_API_KEY
    case 'openai':
      return !!process.env.OPENAI_API_KEY
    default:
      return false
  }
}

/**
 * Get the preferred AI provider based on available keys
 *
 * Priority: PREFERRED_AI_PROVIDER env > claude-code (if available) > anthropic > groq > gemini > openai > mock
 */
export function getPreferredAIProvider(): 'anthropic' | 'groq' | 'gemini' | 'openai' | 'claude-code' | 'mock' {
  // Check for explicit preference
  const preferred = process.env.PREFERRED_AI_PROVIDER as string | undefined
  if (preferred === 'claude-code') return 'claude-code'
  if (preferred === 'anthropic' && hasFeature('anthropic')) return 'anthropic'
  if (preferred === 'groq' && hasFeature('groq')) return 'groq'
  if (preferred === 'mock') return 'mock'

  // Auto-detect: prefer claude-code if running in Claude Code context
  if (process.env.CLAUDE_CODE === '1' || process.env.ANTHROPIC_CONTEXT === 'claude-code') {
    return 'claude-code'
  }

  // Fallback to API key detection
  if (hasFeature('anthropic')) return 'anthropic'
  if (hasFeature('groq')) return 'groq'
  if (hasFeature('gemini')) return 'gemini'
  if (hasFeature('openai')) return 'openai'
  return 'mock'
}

// =============================================================================
// Startup Check
// =============================================================================

/**
 * Run environment validation and log results
 * Call this in instrumentation.ts or server startup
 */
export function checkEnvOnStartup(): void {
  const result = validateEnv()

  if (!result.success) {
    console.error('\n❌ Environment validation failed:')
    result.errors?.forEach((err) => console.error(`  - ${err}`))
    console.error('\nPlease check your .env file and ensure all required variables are set.')
    console.error('See .env.example for reference.\n')

    // In production, fail fast
    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    }
  } else {
    console.log('\n✅ Environment validated successfully')

    // Log available features
    const features = {
      'AI Provider': getPreferredAIProvider() || 'none',
      'R2 Storage': hasFeature('r2') ? 'enabled' : 'disabled (using Supabase)',
      'Modal PDF': hasFeature('modal') ? 'enabled' : 'disabled',
    }

    console.log('   Available features:')
    Object.entries(features).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value}`)
    })

    // Log warnings
    if (result.warnings?.length) {
      console.log('\n⚠️  Warnings:')
      result.warnings.forEach((warn) => console.log(`   - ${warn}`))
    }

    console.log('')
  }
}
