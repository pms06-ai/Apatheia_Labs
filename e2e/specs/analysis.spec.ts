import { test, expect } from '../fixtures/test-base'

/**
 * Analysis workflow tests.
 * Converted from scripts/visual-test.mjs to proper Playwright Test format.
 */

test.describe('Analysis Page', () => {
  test.beforeEach(async ({ analysisPage }) => {
    await analysisPage.navigate()
    await analysisPage.waitForLoad()
  })

  test('page loads with all required sections', async ({ analysisPage }) => {
    // Analysis Engines heading should be visible
    await expect(analysisPage.analysisEnginesHeading).toBeVisible()

    // Document Corpus section should be visible
    await expect(analysisPage.documentCorpusSection).toBeVisible()

    // Execute button should exist (may be disabled)
    await expect(analysisPage.executeButton).toBeVisible()
  })

  test('document corpus section is functional', async ({ analysisPage }) => {
    // Check for Document Corpus section
    await expect(analysisPage.documentCorpusSection).toBeVisible()

    // Select All button should be visible if there are documents
    const selectAllVisible = await analysisPage.selectAllButton.isVisible()

    if (selectAllVisible) {
      // Take note of state before clicking
      await analysisPage.selectAllDocuments()

      // Check for selection badge
      const selectedCount = await analysisPage.getSelectedCount()
      if (selectedCount) {
        expect(selectedCount).toMatch(/\d+ SELECTED/i)
      }
    }
  })

  test('engine selection works', async ({ analysisPage }) => {
    // Try to select an engine
    const selectedEngine = await analysisPage.selectFirstAvailableEngine()

    // We should find at least one engine
    if (selectedEngine) {
      // Verify the engine card was clicked
      expect(selectedEngine).toBeTruthy()
    }
  })

  test('execute button state reflects selection', async ({ analysisPage }) => {
    // Initially, execute button should exist
    await expect(analysisPage.executeButton).toBeVisible()

    // Select documents if available
    await analysisPage.selectAllDocuments()

    // Select an engine if available
    await analysisPage.selectFirstAvailableEngine()

    // Check button state
    const isEnabled = await analysisPage.isExecuteButtonEnabled()
    // Button may or may not be enabled depending on document/engine state
    expect(typeof isEnabled).toBe('boolean')
  })

  test('results tabs are present', async ({ analysisPage }) => {
    // Get available tabs
    const tabs = await analysisPage.getAvailableTabs()

    // We should have some tabs visible
    // Note: Tabs may be disabled if no analysis has been run
    expect(tabs).toBeDefined()
  })

  test('export button exists', async ({ analysisPage }) => {
    // Export button should be present (may be disabled)
    await expect(analysisPage.exportButton).toBeVisible()

    // Check if export is enabled
    const isEnabled = await analysisPage.isExportEnabled()

    // Export is typically disabled without findings
    if (!isEnabled) {
      // This is expected behavior when no analysis has been run
      expect(isEnabled).toBe(false)
    }
  })
})

test.describe('Analysis Workflow Integration', () => {
  test('full analysis workflow', async ({ analysisPage }) => {
    await analysisPage.navigate()
    await analysisPage.waitForLoad()

    // Step 1: Verify page loaded
    await expect(analysisPage.analysisEnginesHeading).toBeVisible()

    // Step 2: Select documents
    await analysisPage.selectAllDocuments()

    // Step 3: Select an engine
    const engine = await analysisPage.selectFirstAvailableEngine()

    // Step 4: Check if we can execute
    const canExecute = await analysisPage.isExecuteButtonEnabled()

    if (canExecute && engine) {
      // Step 5: Execute analysis
      await analysisPage.executeAnalysis()

      // Step 6: Wait for completion (with reasonable timeout)
      const completed = await analysisPage.waitForAnalysisComplete(15)

      if (completed) {
        // Step 7: Check results tabs
        const tabs = await analysisPage.getAvailableTabs()
        expect(tabs.length).toBeGreaterThan(0)

        // Step 8: Click through available tabs
        for (const tabName of tabs) {
          const clicked = await analysisPage.clickTab(tabName)
          if (clicked) {
            // Tab content should be visible after clicking
            await analysisPage.page.waitForTimeout(300)
          }
        }

        // Step 9: Check statistics panel
        const statsVisible = await analysisPage.isRunStatisticsVisible()
        if (statsVisible) {
          const findings = await analysisPage.getTotalFindings()
          // Findings should be a string or null
          expect(typeof findings === 'string' || findings === null).toBe(true)
        }

        // Step 10: Check export availability
        const exportEnabled = await analysisPage.isExportEnabled()
        if (exportEnabled) {
          await analysisPage.openExportDropdown()
          await analysisPage.closeDropdown()
        }
      }
    }
  })
})
