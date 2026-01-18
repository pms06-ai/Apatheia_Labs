import { Page, Locator } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Analysis page object for interacting with the analysis workflow.
 * Converted from scripts/visual-test.mjs
 */
export class AnalysisPage extends BasePage {
  readonly analysisEnginesHeading: Locator
  readonly documentCorpusSection: Locator
  readonly selectAllButton: Locator
  readonly executeButton: Locator
  readonly exportButton: Locator
  readonly runStatisticsPanel: Locator

  // Available analysis engines
  static readonly ENGINES = [
    'Entity Resolution',
    'Temporal Parser',
    'Argumentation',
    'Bias Detection',
    'Contradiction',
    'Accountability',
    'Professional',
    'Omission Detection',
    'Expert Witness',
    'Documentary Analysis',
    'Narrative Evolution',
  ] as const

  // Results tabs
  static readonly TABS = ['List', 'Engine', 'Timeline', 'Network', 'Entities'] as const

  constructor(page: Page) {
    super(page)
    this.analysisEnginesHeading = page.locator('text=Analysis Engines').first()
    this.documentCorpusSection = page.locator('text=Document Corpus').first()
    this.selectAllButton = page.locator('text=Select All').first()
    this.executeButton = page.locator('button:has-text("Execute Analysis")').first()
    this.exportButton = page.locator('button:has-text("Export Evidence")').first()
    this.runStatisticsPanel = page.locator('text=Run Statistics').first()
  }

  /**
   * Navigate to the analysis page.
   */
  async navigate(): Promise<void> {
    await this.goto('/analysis')
  }

  /**
   * Wait for the analysis page to fully load.
   */
  async waitForLoad(): Promise<void> {
    await this.waitForPageLoad()
    await this.analysisEnginesHeading.waitFor({ state: 'visible', timeout: 10000 })
  }

  /**
   * Select all documents in the corpus.
   */
  async selectAllDocuments(): Promise<void> {
    if (await this.selectAllButton.isVisible()) {
      await this.selectAllButton.click()
      // Wait for selection to register
      await this.page.waitForTimeout(500)
    }
  }

  /**
   * Get the count of selected documents from the badge.
   */
  async getSelectedCount(): Promise<string | null> {
    const badge = this.page.locator('text=/\\d+ SELECTED/i').first()
    if (await badge.isVisible()) {
      return badge.textContent()
    }
    return null
  }

  /**
   * Select an analysis engine by name.
   * @param engineName Name of the engine to select
   */
  async selectEngine(engineName: string): Promise<boolean> {
    const engineCard = this.page.locator(`text=${engineName}`).first()
    if (await engineCard.isVisible()) {
      await engineCard.click()
      await this.page.waitForTimeout(300)
      return true
    }
    return false
  }

  /**
   * Find and select the first available engine.
   */
  async selectFirstAvailableEngine(): Promise<string | null> {
    for (const engine of AnalysisPage.ENGINES) {
      if (await this.selectEngine(engine)) {
        return engine
      }
    }
    return null
  }

  /**
   * Check if the execute button is enabled.
   */
  async isExecuteButtonEnabled(): Promise<boolean> {
    await this.executeButton.waitFor({ state: 'visible', timeout: 5000 })
    return !(await this.executeButton.isDisabled())
  }

  /**
   * Execute the analysis.
   */
  async executeAnalysis(): Promise<void> {
    const isEnabled = await this.isExecuteButtonEnabled()
    if (isEnabled) {
      await this.executeButton.click()
      // Wait for analysis to start
      await this.page.waitForTimeout(2000)
    }
  }

  /**
   * Wait for analysis to complete with progress monitoring.
   * @param maxWaitSeconds Maximum seconds to wait
   */
  async waitForAnalysisComplete(maxWaitSeconds = 30): Promise<boolean> {
    const checkpoints = Math.ceil(maxWaitSeconds / 2)

    for (let i = 0; i < checkpoints; i++) {
      await this.page.waitForTimeout(2000)

      // Check for completion indicators
      const completeIndicators = [
        this.page.locator('text=/Complete|Finished|Results/i').first(),
        this.page.locator('text=/Total Findings/i').first(),
      ]

      for (const indicator of completeIndicators) {
        if (await indicator.isVisible()) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Click on a results tab.
   * @param tabName Name of the tab to click
   */
  async clickTab(tabName: string): Promise<boolean> {
    const tab = this.page.locator(`[role="tab"]:has-text("${tabName}")`).first()

    if (await tab.isVisible()) {
      const isDisabled = await tab.getAttribute('data-disabled')
      const isButtonDisabled = await tab.getAttribute('disabled')

      if (!isDisabled && !isButtonDisabled) {
        try {
          await tab.click({ timeout: 2000 })
          await this.page.waitForTimeout(500)
          return true
        } catch {
          return false
        }
      }
    }
    return false
  }

  /**
   * Get all visible and clickable tabs.
   */
  async getAvailableTabs(): Promise<string[]> {
    const availableTabs: string[] = []

    for (const tabName of AnalysisPage.TABS) {
      const tab = this.page.locator(`[role="tab"]:has-text("${tabName}")`).first()
      if (await tab.isVisible()) {
        const isDisabled = await tab.getAttribute('data-disabled')
        if (!isDisabled) {
          availableTabs.push(tabName)
        }
      }
    }

    return availableTabs
  }

  /**
   * Check if the run statistics panel is visible.
   */
  async isRunStatisticsVisible(): Promise<boolean> {
    return this.runStatisticsPanel.isVisible()
  }

  /**
   * Get the total findings count from statistics.
   */
  async getTotalFindings(): Promise<string | null> {
    const findings = this.page.locator('text=/Total Findings/i').first()
    if (await findings.isVisible()) {
      const parent = findings.locator('..')
      return parent.textContent()
    }
    return null
  }

  /**
   * Check if export button is visible and enabled.
   */
  async isExportEnabled(): Promise<boolean> {
    if (await this.exportButton.isVisible()) {
      return !(await this.exportButton.isDisabled())
    }
    return false
  }

  /**
   * Open the export dropdown.
   */
  async openExportDropdown(): Promise<boolean> {
    if (await this.isExportEnabled()) {
      await this.exportButton.click({ timeout: 2000 })
      await this.page.waitForTimeout(500)
      return true
    }
    return false
  }

  /**
   * Close any open dropdown by pressing Escape.
   */
  async closeDropdown(): Promise<void> {
    await this.page.keyboard.press('Escape')
  }
}
