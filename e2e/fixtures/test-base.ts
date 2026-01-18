import { test as base } from '@playwright/test'
import { BasePage } from '../pages/base.page'
import { AnalysisPage } from '../pages/analysis.page'

/**
 * Custom Playwright fixtures with page objects.
 * Provides pre-initialized page objects for tests.
 */

// Define fixture types
type Fixtures = {
  basePage: BasePage
  analysisPage: AnalysisPage
}

/**
 * Extended test with custom page object fixtures.
 */
export const test = base.extend<Fixtures>({
  // Base page fixture
  basePage: async ({ page }, _use) => {
    const basePage = new BasePage(page)
    await _use(basePage)
  },

  // Analysis page fixture
  analysisPage: async ({ page }, _use) => {
    const analysisPage = new AnalysisPage(page)
    await _use(analysisPage)
  },
})

// Re-export expect for convenience
export { expect } from '@playwright/test'
