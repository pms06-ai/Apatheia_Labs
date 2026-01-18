import { FullConfig } from '@playwright/test'

/**
 * Global setup for Playwright tests.
 * Runs once before all tests to verify server readiness.
 */
async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:5173'

  console.log(`\n[Global Setup] Checking server readiness at ${baseURL}...`)

  const maxRetries = 30
  const retryDelay = 1000

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(baseURL, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok || response.status === 304) {
        console.log(`[Global Setup] Server is ready (status: ${response.status})`)
        return
      }

      console.log(`[Global Setup] Server returned ${response.status}, retrying...`)
    } catch (_error) {
      if (i < maxRetries - 1) {
        console.log(`[Global Setup] Waiting for server... (attempt ${i + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
  }

  throw new Error(
    `[Global Setup] Server at ${baseURL} did not become ready within ${(maxRetries * retryDelay) / 1000} seconds`
  )
}

export default globalSetup
