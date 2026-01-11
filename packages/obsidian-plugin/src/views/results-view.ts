/**
 * Results View - Sidebar panel for displaying analysis results
 */

import { ItemView, WorkspaceLeaf } from 'obsidian'
import type PhronesisPlugin from '../main'

export const VIEW_TYPE_RESULTS = 'phronesis-results-view'

export class ResultsView extends ItemView {
  plugin: PhronesisPlugin
  private currentDocument: string = ''
  private results: Record<string, unknown> = {}

  constructor(leaf: WorkspaceLeaf, plugin: PhronesisPlugin) {
    super(leaf)
    this.plugin = plugin
  }

  getViewType(): string {
    return VIEW_TYPE_RESULTS
  }

  getDisplayText(): string {
    return 'Phronesis Results'
  }

  getIcon(): string {
    return 'search'
  }

  async onOpen() {
    const container = this.containerEl.children[1]
    container.empty()
    container.addClass('phronesis-results')

    this.renderContent(container as HTMLElement)
  }

  async onClose() {
    // Cleanup
  }

  /**
   * Set analysis results
   */
  setResults(documentName: string, results: Record<string, unknown>) {
    this.currentDocument = documentName
    this.results = results

    const container = this.containerEl.children[1] as HTMLElement
    container.empty()
    this.renderContent(container)
  }

  /**
   * Render the view content
   */
  private renderContent(container: HTMLElement) {
    // Header
    const header = container.createDiv({ cls: 'phronesis-header' })
    header.createEl('h4', { text: 'Phronesis Analysis' })

    // Status indicator
    const statusDiv = header.createDiv({ cls: 'phronesis-status' })
    this.renderStatus(statusDiv)

    // Document info
    if (this.currentDocument) {
      const docInfo = container.createDiv({ cls: 'phronesis-doc-info' })
      docInfo.createEl('strong', { text: 'Document: ' })
      docInfo.createEl('span', { text: this.currentDocument })
    }

    // Results by engine
    if (Object.keys(this.results).length > 0) {
      this.renderResults(container)
    } else {
      const empty = container.createDiv({ cls: 'phronesis-empty' })
      empty.createEl('p', { text: 'No analysis results yet.' })
      empty.createEl('p', { text: 'Use Command Palette (Ctrl/Cmd+P) and search for "Phronesis" to run analysis.' })
    }

    // Actions
    this.renderActions(container)
  }

  /**
   * Render server status
   */
  private async renderStatus(container: HTMLElement) {
    container.empty()
    container.createEl('span', { text: 'Checking...' })

    const connected = await this.plugin.apiClient.checkStatus()
    container.empty()

    const indicator = container.createSpan({
      cls: `phronesis-status-indicator ${connected ? 'connected' : 'disconnected'}`,
    })

    container.createEl('span', { text: connected ? 'Connected' : 'Disconnected' })
  }

  /**
   * Render analysis results
   */
  private renderResults(container: HTMLElement) {
    const resultsDiv = container.createDiv({ cls: 'phronesis-results-list' })

    for (const [engine, result] of Object.entries(this.results)) {
      const engineDiv = resultsDiv.createDiv({ cls: 'phronesis-engine-result' })

      // Engine header
      const engineHeader = engineDiv.createDiv({ cls: 'phronesis-engine-header' })

      engineHeader.createEl('strong', {
        text: this.formatEngineName(engine),
        cls: 'phronesis-engine-name',
      })

      // Summary
      this.renderEngineSummary(engineDiv, engine, result as Record<string, unknown>)

      // Collapsible details
      const detailsBtn = engineHeader.createEl('button', {
        text: 'Details',
        cls: 'phronesis-details-btn',
      })

      const detailsDiv = engineDiv.createDiv({ cls: 'phronesis-engine-details' })

      const pre = detailsDiv.createEl('pre')
      pre.createEl('code', { text: JSON.stringify(result, null, 2) })

      detailsBtn.onclick = () => {
        const isVisible = detailsDiv.hasClass('visible')
        detailsDiv.toggleClass('visible', !isVisible)
        detailsBtn.textContent = isVisible ? 'Details' : 'Hide'
      }
    }
  }

  /**
   * Render engine-specific summary
   */
  private renderEngineSummary(container: HTMLElement, engine: string, result: Record<string, unknown>) {
    const summary = result.summary as Record<string, unknown> | undefined

    if (!summary) {
      if (result.error) {
        container.createEl('p', {
          text: `Error: ${result.error}`,
          cls: 'phronesis-severity-critical',
        })
      }
      return
    }

    const summaryDiv = container.createDiv({ cls: 'phronesis-summary' })

    switch (engine) {
      case 'contradiction':
        this.renderContradictionSummary(summaryDiv, summary)
        break
      case 'omission':
        this.renderOmissionSummary(summaryDiv, summary)
        break
      case 'bias':
        this.renderBiasSummary(summaryDiv, summary, result)
        break
      default:
        // Generic summary
        for (const [key, value] of Object.entries(summary)) {
          const item = summaryDiv.createDiv({ cls: 'phronesis-summary-item' })
          item.createEl('span', { text: `${this.formatKey(key)}: ` })
          item.createEl('strong', { text: String(value) })
        }
    }
  }

  private renderContradictionSummary(container: HTMLElement, summary: Record<string, unknown>) {
    const total = summary.totalContradictions as number || 0
    const critical = summary.criticalCount as number || 0
    const impact = summary.credibilityImpact as string || 'none'

    const line1 = container.createDiv({ cls: 'phronesis-summary-item' })
    line1.createEl('span', { text: 'Contradictions: ' })
    line1.createEl('strong', { text: String(total) })
    if (critical > 0) {
      line1.createEl('span', {
        text: ` (${critical} critical)`,
        cls: 'phronesis-severity-critical',
      })
    }

    const line2 = container.createDiv({ cls: 'phronesis-summary-item' })
    line2.createEl('span', { text: 'Credibility Impact: ' })
    line2.createEl('strong', {
      text: impact,
      cls: impact === 'severe' ? 'phronesis-severity-critical' :
        impact === 'moderate' ? 'phronesis-severity-high' : 'phronesis-severity-low',
    })
  }

  private renderOmissionSummary(container: HTMLElement, summary: Record<string, unknown>) {
    const total = summary.totalOmissions as number || 0
    const direction = summary.overallBiasDirection as string || 'neutral'

    const line1 = container.createDiv({ cls: 'phronesis-summary-item' })
    line1.createEl('span', { text: 'Omissions: ' })
    line1.createEl('strong', { text: String(total) })

    const line2 = container.createDiv({ cls: 'phronesis-summary-item' })
    line2.createEl('span', { text: 'Bias Direction: ' })
    line2.createEl('strong', {
      text: direction,
      cls: direction !== 'neutral' ? 'phronesis-severity-high' : 'phronesis-severity-low',
    })
  }

  private renderBiasSummary(container: HTMLElement, summary: Record<string, unknown>, result: Record<string, unknown>) {
    const bias = summary.overallBias as string || 'none'
    const direction = summary.direction as string || 'balanced'
    const framingRatio = result.framingRatio as number || 1

    const line1 = container.createDiv({ cls: 'phronesis-summary-item' })
    line1.createEl('span', { text: 'Framing Ratio: ' })
    line1.createEl('strong', { text: `${framingRatio}:1` })

    const line2 = container.createDiv({ cls: 'phronesis-summary-item' })
    line2.createEl('span', { text: 'Overall Bias: ' })
    line2.createEl('strong', {
      text: `${bias} (${direction})`,
      cls: bias === 'strong' ? 'phronesis-severity-critical' :
        bias === 'moderate' ? 'phronesis-severity-high' : 'phronesis-severity-low',
    })
  }

  /**
   * Render action buttons
   */
  private renderActions(container: HTMLElement) {
    const actionsDiv = container.createDiv({ cls: 'phronesis-actions' })

    const analyzeBtn = actionsDiv.createEl('button', { text: 'Analyze Current Document' })
    analyzeBtn.onclick = async () => {
      const file = this.app.workspace.getActiveFile()
      if (file) {
        await this.plugin.analyzeDocument(file)
      }
    }

    const samBtn = actionsDiv.createEl('button', { text: 'Run S.A.M.' })
    samBtn.onclick = () => {
      this.plugin.runSAMPipeline()
    }
  }

  /**
   * Format engine name for display
   */
  private formatEngineName(engine: string): string {
    const names: Record<string, string> = {
      contradiction: 'Contradiction (Κ)',
      omission: 'Omission (Ο)',
      bias: 'Bias (Β)',
      entity: 'Entity Resolution (Ε)',
      timeline: 'Timeline (Τ)',
      argumentation: 'Argumentation (Α)',
      accountability: 'Accountability (Λ)',
      professional: 'Professional Tracker (Π)',
      expert_witness: 'Expert Witness (Ξ)',
      documentary: 'Documentary (Δ)',
      narrative: 'Narrative (Μ)',
      coordination: 'Coordination (Σ)',
      sam_pipeline: 'S.A.M. Pipeline',
    }
    return names[engine] || engine
  }

  /**
   * Format key for display
   */
  private formatKey(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }
}
