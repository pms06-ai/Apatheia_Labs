/**
 * Phronesis Plugin Settings
 */

import { App, PluginSettingTab, Setting } from 'obsidian'
import type PhronesisPlugin from './main'

export interface PhronesisSettings {
  apiEndpoint: string
  defaultEngines: string[]
  inlineAnnotations: boolean
  autoAnalyze: boolean
  severityThreshold: 'low' | 'medium' | 'high' | 'critical'
  caseId: string
  connectionTimeout: number
}

export const DEFAULT_SETTINGS: PhronesisSettings = {
  apiEndpoint: 'http://localhost:3847',
  defaultEngines: ['contradiction', 'omission', 'bias'],
  inlineAnnotations: true,
  autoAnalyze: false,
  severityThreshold: 'medium',
  caseId: '',
  connectionTimeout: 30000,
}

export class PhronesisSettingTab extends PluginSettingTab {
  plugin: PhronesisPlugin

  constructor(app: App, plugin: PhronesisPlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    const { containerEl } = this

    containerEl.empty()
    containerEl.createEl('h2', { text: 'Phronesis Settings' })

    // Connection settings
    containerEl.createEl('h3', { text: 'Connection' })

    new Setting(containerEl)
      .setName('API Endpoint')
      .setDesc('URL of the Phronesis analysis server')
      .addText(text =>
        text
          .setPlaceholder('http://localhost:3847')
          .setValue(this.plugin.settings.apiEndpoint)
          .onChange(async value => {
            this.plugin.settings.apiEndpoint = value
            await this.plugin.saveSettings()
          })
      )

    new Setting(containerEl)
      .setName('Connection Timeout')
      .setDesc('Timeout in milliseconds for API requests')
      .addText(text =>
        text
          .setPlaceholder('30000')
          .setValue(String(this.plugin.settings.connectionTimeout))
          .onChange(async value => {
            const num = parseInt(value, 10)
            if (!isNaN(num) && num > 0) {
              this.plugin.settings.connectionTimeout = num
              await this.plugin.saveSettings()
            }
          })
      )

    new Setting(containerEl)
      .setName('Test Connection')
      .setDesc('Check if the Phronesis server is running')
      .addButton(button =>
        button
          .setButtonText('Test')
          .onClick(async () => {
            button.setButtonText('Testing...')
            const connected = await this.plugin.apiClient.checkStatus()
            button.setButtonText(connected ? 'Connected!' : 'Failed')
            setTimeout(() => button.setButtonText('Test'), 2000)
          })
      )

    // Case settings
    containerEl.createEl('h3', { text: 'Case Configuration' })

    new Setting(containerEl)
      .setName('Current Case ID')
      .setDesc('Case identifier for storing analysis results')
      .addText(text =>
        text
          .setPlaceholder('PE23C50095')
          .setValue(this.plugin.settings.caseId)
          .onChange(async value => {
            this.plugin.settings.caseId = value
            await this.plugin.saveSettings()
          })
      )

    // Analysis settings
    containerEl.createEl('h3', { text: 'Analysis' })

    new Setting(containerEl)
      .setName('Default Engines')
      .setDesc('Engines to run by default (comma-separated)')
      .addText(text =>
        text
          .setPlaceholder('contradiction, omission, bias')
          .setValue(this.plugin.settings.defaultEngines.join(', '))
          .onChange(async value => {
            this.plugin.settings.defaultEngines = value.split(',').map(e => e.trim()).filter(e => e)
            await this.plugin.saveSettings()
          })
      )

    new Setting(containerEl)
      .setName('Severity Threshold')
      .setDesc('Only show findings at or above this severity')
      .addDropdown(dropdown =>
        dropdown
          .addOption('low', 'Low')
          .addOption('medium', 'Medium')
          .addOption('high', 'High')
          .addOption('critical', 'Critical')
          .setValue(this.plugin.settings.severityThreshold)
          .onChange(async value => {
            this.plugin.settings.severityThreshold = value as PhronesisSettings['severityThreshold']
            await this.plugin.saveSettings()
          })
      )

    // Display settings
    containerEl.createEl('h3', { text: 'Display' })

    new Setting(containerEl)
      .setName('Inline Annotations')
      .setDesc('Show analysis findings as inline callouts')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.inlineAnnotations)
          .onChange(async value => {
            this.plugin.settings.inlineAnnotations = value
            await this.plugin.saveSettings()
          })
      )

    new Setting(containerEl)
      .setName('Auto-Analyze')
      .setDesc('Automatically analyze documents on save')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.autoAnalyze)
          .onChange(async value => {
            this.plugin.settings.autoAnalyze = value
            await this.plugin.saveSettings()
          })
      )
  }
}
