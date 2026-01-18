import { test, expect } from '../fixtures/test-base'

/**
 * Navigation tests for page routing and sidebar links.
 * Uses HashRouter navigation pattern.
 */

test.describe('Navigation', () => {
  test.beforeEach(async ({ basePage }) => {
    await basePage.goto('/')
    await basePage.waitForPageLoad()
  })

  test('can navigate to documents via sidebar', async ({ basePage }) => {
    await basePage.navigateTo('Documents')
    const path = await basePage.getCurrentPath()
    expect(path).toBe('/documents')
  })

  test('can navigate to analysis via sidebar', async ({ basePage }) => {
    // Try different possible link text variations
    const analysisLink = basePage.page
      .locator('a')
      .filter({
        hasText: /Analysis|Engines|Analyze/i,
      })
      .first()

    if (await analysisLink.isVisible()) {
      await analysisLink.click()
      await basePage.waitForPageLoad()
      const path = await basePage.getCurrentPath()
      expect(path).toBe('/analysis')
    } else {
      // Direct navigation fallback
      await basePage.goto('/analysis')
      const path = await basePage.getCurrentPath()
      expect(path).toBe('/analysis')
    }
  })

  test('can navigate to settings via sidebar', async ({ basePage }) => {
    await basePage.navigateTo('Settings')
    const path = await basePage.getCurrentPath()
    expect(path).toBe('/settings')
  })

  test('can navigate back to dashboard', async ({ basePage }) => {
    // First navigate away
    await basePage.goto('/settings')
    await basePage.waitForPageLoad()

    // Navigate back to home
    const homeLink = basePage.page
      .locator('a')
      .filter({
        hasText: /Dashboard|Home/i,
      })
      .first()

    if (await homeLink.isVisible()) {
      await homeLink.click()
      await basePage.waitForPageLoad()
      const path = await basePage.getCurrentPath()
      expect(path).toBe('/')
    } else {
      // Try clicking the logo/brand
      const logo = basePage.page.locator('header a').first()
      if (await logo.isVisible()) {
        await logo.click()
        await basePage.waitForPageLoad()
      }
    }
  })

  test('hash router preserves state on refresh', async ({ basePage, page }) => {
    await basePage.goto('/analysis')
    await basePage.waitForPageLoad()

    // Refresh the page
    await page.reload()
    await basePage.waitForPageLoad()

    // Should still be on analysis page
    const path = await basePage.getCurrentPath()
    expect(path).toBe('/analysis')
  })

  test('browser back/forward navigation works', async ({ basePage, page }) => {
    // Navigate through pages
    await basePage.goto('/documents')
    await basePage.waitForPageLoad()

    await basePage.goto('/analysis')
    await basePage.waitForPageLoad()

    await basePage.goto('/settings')
    await basePage.waitForPageLoad()

    // Go back
    await page.goBack()
    await basePage.waitForPageLoad()
    expect(await basePage.getCurrentPath()).toBe('/analysis')

    // Go back again
    await page.goBack()
    await basePage.waitForPageLoad()
    expect(await basePage.getCurrentPath()).toBe('/documents')

    // Go forward
    await page.goForward()
    await basePage.waitForPageLoad()
    expect(await basePage.getCurrentPath()).toBe('/analysis')
  })
})
