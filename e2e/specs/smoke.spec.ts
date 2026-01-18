import { test, expect } from '../fixtures/test-base'

/**
 * Smoke tests for quick CI validation.
 * These tests verify basic app functionality without deep interactions.
 */

test.describe('Smoke Tests', () => {
  test('app loads successfully', async ({ page, basePage }) => {
    await basePage.goto('/')
    await expect(page).toHaveTitle(/Phronesis|Apatheia/i)
    await expect(basePage.mainContent).toBeVisible()
  })

  test('dashboard renders', async ({ basePage }) => {
    await basePage.goto('/')
    await basePage.waitForPageLoad()
    // Dashboard should have some content
    await expect(basePage.mainContent).toBeVisible()
  })

  test('analysis page loads', async ({ analysisPage }) => {
    await analysisPage.navigate()
    await expect(analysisPage.analysisEnginesHeading).toBeVisible()
  })

  test('documents page loads', async ({ basePage }) => {
    await basePage.goto('/documents')
    await basePage.waitForPageLoad()
    await expect(basePage.mainContent).toBeVisible()
  })

  test('settings page loads', async ({ basePage }) => {
    await basePage.goto('/settings')
    await basePage.waitForPageLoad()
    await expect(basePage.mainContent).toBeVisible()
  })

  test('404 page for invalid routes', async ({ basePage, page }) => {
    await basePage.goto('/invalid-route-that-does-not-exist')
    await expect(page.locator('text=404')).toBeVisible()
  })
})
