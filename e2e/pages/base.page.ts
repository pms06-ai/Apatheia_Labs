import { Page, Locator } from '@playwright/test'

/**
 * Base page object with shared navigation and utility methods.
 * Handles HashRouter navigation pattern used by the app.
 */
export class BasePage {
  readonly page: Page
  readonly sidebar: Locator
  readonly mainContent: Locator
  readonly spinner: Locator

  constructor(page: Page) {
    this.page = page
    this.sidebar = page.locator('aside, nav').first()
    this.mainContent = page.locator('main[role="main"]')
    this.spinner = page.locator('[class*="animate-spin"], [data-testid="spinner"]')
  }

  /**
   * Navigate to a path using hash router.
   * @param path Path without hash prefix (e.g., '/analysis')
   */
  async goto(path: string): Promise<void> {
    const hashPath = path.startsWith('/') ? `/#${path}` : `/#/${path}`
    await this.page.goto(hashPath, { waitUntil: 'domcontentloaded' })
    await this.waitForPageLoad()
  }

  /**
   * Wait for lazy-loaded components to finish loading.
   */
  async waitForPageLoad(): Promise<void> {
    // Wait for any spinners to disappear
    await this.spinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      // Spinner may not exist, that's fine
    })

    // Wait for main content to be visible
    await this.mainContent.waitFor({ state: 'visible', timeout: 10000 })
  }

  /**
   * Navigate using sidebar link.
   * @param linkText Text of the sidebar link to click
   */
  async navigateTo(linkText: string): Promise<void> {
    const link = this.page.locator(`a:has-text("${linkText}")`).first()
    await link.click()
    await this.waitForPageLoad()
  }

  /**
   * Get the current hash path.
   */
  async getCurrentPath(): Promise<string> {
    const url = this.page.url()
    const hash = new URL(url).hash
    return hash.replace('#', '') || '/'
  }

  /**
   * Wait for text to appear on the page.
   */
  async waitForText(text: string, timeout = 5000): Promise<void> {
    await this.page.locator(`text=${text}`).first().waitFor({
      state: 'visible',
      timeout,
    })
  }

  /**
   * Check if text is visible on the page.
   */
  async isTextVisible(text: string): Promise<boolean> {
    return this.page.locator(`text=${text}`).first().isVisible()
  }

  /**
   * Take a screenshot with a descriptive name.
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: false,
    })
  }
}
