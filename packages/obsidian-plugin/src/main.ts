/**
 * Phronesis - Forensic Document Analysis Plugin for Obsidian
 *
 * Provides access to S.A.M. methodology engines for detecting:
 * - Contradictions (8-type CASCADE)
 * - Omissions (5 categories)
 * - Bias (statistical analysis)
 * - Entity relationships
 * - Timeline anomalies
 * - Professional conduct issues
 * - And more...
 */

import {
  App,
  Editor,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  TFile,
} from 'obsidian'

import { PhronesisApiClient } from './services/api-client'
import { PhronesisSettings, DEFAULT_SETTINGS, PhronesisSettingTab } from './settings'
import { ResultsView, VIEW_TYPE_RESULTS } from './views/results-view'
import type { EngineResult, ContradictionResult, BiasResult, OmissionResult } from './types'

export default class PhronesisPlugin extends Plugin {
  settings: PhronesisSettings
  apiClient: PhronesisApiClient

  async onload() {
    await this.loadSettings()

    // Initialize API client
    this.apiClient = new PhronesisApiClient({
      endpoint: this.settings.apiEndpoint,
      timeout: this.settings.connectionTimeout,
    })

    // Register results view
    this.registerView(VIEW_TYPE_RESULTS, leaf => new ResultsView(leaf, this))

    // Add ribbon icon
    this.addRibbonIcon('search', 'Phronesis Analysis', () => {
      this.activateResultsView()
    })

    // Add commands
    this.addCommand({
      id: 'analyze-selection-contradictions',
      name: 'Analyze selection for contradictions',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.analyzeSelection(editor, 'contradiction')
      },
    })

    this.addCommand({
      id: 'analyze-selection-omissions',
      name: 'Analyze selection for omissions',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.analyzeSelection(editor, 'omission')
      },
    })

    this.addCommand({
      id: 'analyze-selection-bias',
      name: 'Analyze selection for bias',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.analyzeSelection(editor, 'bias')
      },
    })

    this.addCommand({
      id: 'analyze-document-full',
      name: 'Run full analysis on current document',
      callback: async () => {
        const file = this.app.workspace.getActiveFile()
        if (file) {
          await this.analyzeDocument(file)
        } else {
          new Notice('No active document')
        }
      },
    })

    this.addCommand({
      id: 'run-sam-pipeline',
      name: 'Run S.A.M. Pipeline',
      callback: () => {
        this.runSAMPipeline()
      },
    })

    this.addCommand({
      id: 'show-results-panel',
      name: 'Show Phronesis Results Panel',
      callback: () => {
        this.activateResultsView()
      },
    })

    this.addCommand({
      id: 'check-server-status',
      name: 'Check Phronesis Server Status',
      callback: async () => {
        const connected = await this.apiClient.checkStatus()
        new Notice(connected ? 'Phronesis server connected' : 'Phronesis server not available')
      },
    })

    // Add settings tab
    this.addSettingTab(new PhronesisSettingTab(this.app, this))

    // Register context menu
    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu, editor, view) => {
        if (editor.getSelection()) {
          menu.addItem(item => {
            item
              .setTitle('Phronesis: Analyze Selection')
              .setIcon('search')
              .onClick(() => this.analyzeSelection(editor, 'contradiction'))
          })
        }
      })
    )

    // Register auto-analyze on file modify
    this.setupAutoAnalyze()

    console.log('Phronesis plugin loaded')
  }

  /**
   * Setup auto-analyze on file save
   */
  private setupAutoAnalyze() {
    if (!this.settings.autoAnalyze) return

    // Debounce timer
    let debounceTimer: NodeJS.Timeout | null = null

    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (!(file instanceof TFile) || file.extension !== 'md') return

        // Clear existing timer
        if (debounceTimer) {
          clearTimeout(debounceTimer)
        }

        // Set new debounced timer (2 seconds after last modification)
        debounceTimer = setTimeout(async () => {
          // Only analyze if file is currently open
          const activeFile = this.app.workspace.getActiveFile()
          if (activeFile && activeFile.path === file.path) {
            await this.analyzeDocument(file)
          }
        }, 2000)
      })
    )
  }

  onunload() {
    console.log('Phronesis plugin unloaded')
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)

    // Reinitialize API client with new settings
    this.apiClient = new PhronesisApiClient({
      endpoint: this.settings.apiEndpoint,
      timeout: this.settings.connectionTimeout,
    })
  }

  /**
   * Activate the results sidebar view
   */
  async activateResultsView() {
    const { workspace } = this.app

    let leaf = workspace.getLeavesOfType(VIEW_TYPE_RESULTS)[0]

    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false)
      if (rightLeaf) {
        await rightLeaf.setViewState({ type: VIEW_TYPE_RESULTS, active: true })
        leaf = rightLeaf
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf)
    }
  }

  /**
   * Analyze selected text
   */
  async analyzeSelection(editor: Editor, engine: string) {
    const selection = editor.getSelection()
    if (!selection) {
      new Notice('No text selected')
      return
    }

    new Notice(`Analyzing with ${engine} engine...`)

    try {
      const result = await this.apiClient.analyzeContent<EngineResult>(
        engine,
        selection,
        this.settings.caseId || undefined
      )

      // Show results in modal
      new AnalysisResultModal(this.app, engine, result).open()

      // Optionally insert as callout
      if (this.settings.inlineAnnotations) {
        this.insertResultAsCallout(editor, engine, result)
      }
    } catch (error) {
      new Notice(`Analysis failed: ${(error as Error).message}`)
    }
  }

  /**
   * Analyze entire document
   */
  async analyzeDocument(file: TFile) {
    new Notice(`Analyzing ${file.name}...`)

    try {
      const content = await this.app.vault.read(file)

      // Run default engines
      const results: Record<string, EngineResult | { error: string }> = {}

      for (const engine of this.settings.defaultEngines) {
        try {
          const result = await this.apiClient.analyzeContent<EngineResult>(
            engine,
            content,
            this.settings.caseId || undefined
          )
          results[engine] = result
        } catch (error) {
          results[engine] = { error: (error as Error).message }
        }
      }

      // Update results view
      const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_RESULTS)
      if (leaves.length > 0) {
        const view = leaves[0].view as ResultsView
        view.setResults(file.name, results)
      }

      new Notice(`Analysis complete for ${file.name}`)
    } catch (error) {
      new Notice(`Analysis failed: ${(error as Error).message}`)
    }
  }

  /**
   * Run S.A.M. pipeline
   */
  async runSAMPipeline() {
    if (!this.settings.caseId) {
      new Notice('Please set a Case ID in settings first')
      return
    }

    new Notice('Running S.A.M. Pipeline...')

    try {
      // Get content from active file if available
      const activeFile = this.app.workspace.getActiveFile()
      let content: string | undefined

      if (activeFile) {
        content = await this.app.vault.read(activeFile)
      }

      const result = await this.apiClient.runSAMPipeline(
        this.settings.caseId,
        content
      )

      // Show results
      new AnalysisResultModal(this.app, 'S.A.M. Pipeline', result).open()
    } catch (error) {
      new Notice(`S.A.M. Pipeline failed: ${(error as Error).message}`)
    }
  }

  /**
   * Insert analysis result as callout
   */
  insertResultAsCallout(editor: Editor, engine: string, result: EngineResult) {
    const calloutType = this.getCalloutType(result)
    const summary = this.summarizeResult(result)

    const callout = `
> [!${calloutType}] Phronesis: ${engine}
> ${summary}
`

    const cursor = editor.getCursor()
    editor.replaceRange(callout, cursor)
  }

  private getCalloutType(result: EngineResult): string {
    // Determine callout type based on severity
    if ('summary' in result && result.summary) {
      const summary = result.summary as Record<string, unknown>
      if ('criticalCount' in summary && (summary.criticalCount as number) > 0) return 'danger'
      if ('totalContradictions' in summary && (summary.totalContradictions as number) > 0) return 'warning'
      if ('criticalBreaches' in summary && (summary.criticalBreaches as number) > 0) return 'danger'
      if ('overallBias' in summary && summary.overallBias === 'strong') return 'warning'
    }

    return 'info'
  }

  private summarizeResult(result: EngineResult): string {
    if ('summary' in result && result.summary) {
      const summary = result.summary as Record<string, unknown>
      const parts: string[] = []

      if ('totalContradictions' in summary) {
        parts.push(`${summary.totalContradictions} contradictions`)
      }
      if ('totalOmissions' in summary) {
        parts.push(`${summary.totalOmissions} omissions`)
      }
      if ('overallBias' in summary) {
        parts.push(`Bias: ${summary.overallBias}`)
      }
      if ('totalBreaches' in summary) {
        parts.push(`${summary.totalBreaches} breaches`)
      }
      if ('totalEntities' in summary) {
        parts.push(`${summary.totalEntities} entities`)
      }
      if ('totalEvents' in summary) {
        parts.push(`${summary.totalEvents} events`)
      }

      return parts.join(', ') || 'Analysis complete'
    }

    return 'Analysis complete'
  }
}

/**
 * Modal for displaying analysis results
 */
class AnalysisResultModal extends Modal {
  engine: string
  result: EngineResult

  constructor(app: App, engine: string, result: EngineResult) {
    super(app)
    this.engine = engine
    this.result = result
  }

  onOpen() {
    const { contentEl } = this

    contentEl.createEl('h2', { text: `Phronesis: ${this.engine}` })

    const pre = contentEl.createEl('pre')
    pre.style.maxHeight = '400px'
    pre.style.overflow = 'auto'
    pre.style.padding = '10px'
    pre.style.background = 'var(--background-secondary)'
    pre.style.borderRadius = '5px'

    pre.createEl('code', {
      text: JSON.stringify(this.result, null, 2),
    })

    const closeBtn = contentEl.createEl('button', { text: 'Close' })
    closeBtn.style.marginTop = '10px'
    closeBtn.onclick = () => this.close()
  }

  onClose() {
    const { contentEl } = this
    contentEl.empty()
  }
}
