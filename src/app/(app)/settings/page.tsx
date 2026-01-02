'use client'

import { useState, useEffect } from 'react'
import { Key, Shield, Palette, Check, AlertCircle, Loader2, Eye, EyeOff, Terminal, Zap } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { isDesktop } from '@/lib/tauri'

interface AppSettings {
  anthropic_api_key?: string
  use_claude_code?: boolean
  mock_mode: boolean
  default_model: string
  theme: string
}

interface ClaudeCodeStatus {
  installed: boolean
  version?: string
  error?: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false)
  const [claudeCodeStatus, setClaudeCodeStatus] = useState<ClaudeCodeStatus | null>(null)
  const [checkingClaudeCode, setCheckingClaudeCode] = useState(false)

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    if (!isDesktop()) {
      setLoading(false)
      return
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core')
      
      const [settingsResult, hasKey, ccStatus] = await Promise.all([
        invoke<{ success: boolean; settings?: AppSettings; error?: string }>('get_settings'),
        invoke<boolean>('check_api_key'),
        invoke<ClaudeCodeStatus>('check_claude_code_status'),
      ])
      
      if (settingsResult.success && settingsResult.settings) {
        setSettings(settingsResult.settings)
        setApiKeyConfigured(hasKey)
      } else {
        setError(settingsResult.error || 'Failed to load settings')
      }
      
      setClaudeCodeStatus(ccStatus)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings(updates: Partial<{
    anthropic_api_key: string
    use_claude_code: boolean
    mock_mode: boolean
    default_model: string
    theme: string
  }>) {
    if (!isDesktop()) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const { invoke } = await import('@tauri-apps/api/core')
      
      const result = await invoke<{ success: boolean; settings?: AppSettings; error?: string }>('update_settings', {
        anthropicApiKey: updates.anthropic_api_key,
        useClaudeCode: updates.use_claude_code,
        mockMode: updates.mock_mode,
        defaultModel: updates.default_model,
        theme: updates.theme,
      })
      
      if (result.success && result.settings) {
        setSettings(result.settings)
        setSuccess('Settings saved successfully')
        
        // Check if API key is now configured
        const hasKey = await invoke<boolean>('check_api_key')
        setApiKeyConfigured(hasKey)
        
        // Clear API key input after save
        if (updates.anthropic_api_key) {
          setApiKeyInput('')
        }
        
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(result.error || 'Failed to save settings')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function validateApiKey() {
    if (!isDesktop()) return

    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const valid = await invoke<boolean>('validate_api_key')
      
      if (valid) {
        setSuccess('API key is valid')
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'API key validation failed')
    }
  }

  async function recheckClaudeCode() {
    if (!isDesktop()) return
    
    setCheckingClaudeCode(true)
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const status = await invoke<ClaudeCodeStatus>('check_claude_code_status')
      setClaudeCodeStatus(status)
      
      if (status.installed) {
        setSuccess(`Claude Code detected: ${status.version}`)
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to check Claude Code')
    } finally {
      setCheckingClaudeCode(false)
    }
  }

  if (!isDesktop()) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8 bg-charcoal-800 border-charcoal-700 text-center">
          <AlertCircle className="h-12 w-12 text-charcoal-500 mx-auto mb-4" />
          <h2 className="text-xl font-display text-charcoal-200 mb-2">Desktop Only</h2>
          <p className="text-charcoal-400">
            Settings are only available in the desktop application.
          </p>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-bronze-500" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl text-charcoal-100 tracking-tight">Settings</h1>
        <p className="mt-2 text-charcoal-400">Configure your Phronesis FCIP installation.</p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-status-critical/10 border border-status-critical/30 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-status-critical shrink-0" />
          <span className="text-status-critical">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 rounded-lg bg-status-success/10 border border-status-success/30 flex items-center gap-3">
          <Check className="h-5 w-5 text-status-success shrink-0" />
          <span className="text-status-success">{success}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Claude Max Integration (Featured) */}
        <Card className="p-6 bg-gradient-to-br from-bronze-900/20 to-charcoal-800 border-bronze-500/30">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-lg bg-bronze-500/20">
              <Zap className="h-6 w-6 text-bronze-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-xl text-charcoal-100">Claude Max Integration</h2>
                <Badge variant="outline" className="border-bronze-500/50 text-bronze-400 text-xs">
                  Recommended
                </Badge>
              </div>
              <p className="text-sm text-charcoal-400 mt-1">
                Use your Claude Max subscription instead of API credits.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Claude Code Status */}
            <div className="p-4 rounded-lg bg-charcoal-900/50 border border-charcoal-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-charcoal-400" />
                  <span className="text-sm font-medium text-charcoal-200">Claude Code CLI</span>
                </div>
                <button
                  onClick={recheckClaudeCode}
                  disabled={checkingClaudeCode}
                  className="text-xs text-bronze-500 hover:text-bronze-400"
                >
                  {checkingClaudeCode ? 'Checking...' : 'Recheck'}
                </button>
              </div>
              
              {claudeCodeStatus?.installed ? (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-status-success" />
                  <span className="text-sm text-status-success">
                    Installed: {claudeCodeStatus.version}
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-charcoal-500" />
                    <span className="text-sm text-charcoal-400">Not installed</span>
                  </div>
                  <div className="p-2 rounded bg-charcoal-800 font-mono text-xs text-charcoal-300">
                    npm install -g @anthropic-ai/claude-code
                  </div>
                  {claudeCodeStatus?.error && (
                    <p className="text-xs text-charcoal-500">{claudeCodeStatus.error}</p>
                  )}
                </div>
              )}
            </div>

            {/* Enable Claude Code Toggle */}
            <div className="pt-2">
              <label className={`flex items-center gap-3 cursor-pointer ${!claudeCodeStatus?.installed ? 'opacity-50' : ''}`}>
                <input
                  type="checkbox"
                  checked={settings?.use_claude_code || false}
                  onChange={(e) => saveSettings({ use_claude_code: e.target.checked })}
                  disabled={!claudeCodeStatus?.installed}
                  className="w-5 h-5 rounded border-charcoal-600 bg-charcoal-800 text-bronze-500 focus:ring-bronze-500/20 disabled:cursor-not-allowed"
                />
                <div>
                  <span className="text-charcoal-200 font-medium">Use Claude Max via Claude Code</span>
                  <p className="text-xs text-charcoal-500">
                    {claudeCodeStatus?.installed 
                      ? 'Run engines using your Max subscription quota'
                      : 'Install Claude Code first to enable this option'}
                  </p>
                </div>
              </label>
            </div>

            {settings?.use_claude_code && claudeCodeStatus?.installed && (
              <div className="p-3 rounded-lg bg-bronze-500/10 border border-bronze-500/20">
                <p className="text-sm text-bronze-400">
                  Engines will use your Claude Max subscription. Make sure you are logged in via{' '}
                  <code className="px-1 py-0.5 rounded bg-charcoal-800 text-xs">claude login</code>
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* API Configuration */}
        <Card className={`p-6 bg-charcoal-800/50 border-charcoal-700 ${settings?.use_claude_code ? 'opacity-60' : ''}`}>
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-lg bg-bronze-500/10">
              <Key className="h-6 w-6 text-bronze-500" />
            </div>
            <div>
              <h2 className="font-display text-xl text-charcoal-100">API Key (Alternative)</h2>
              <p className="text-sm text-charcoal-400 mt-1">
                {settings?.use_claude_code 
                  ? 'Disabled while Claude Code is active'
                  : 'Configure your Anthropic API key for pay-per-use access.'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal-300 mb-2">
                Anthropic API Key
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder={apiKeyConfigured ? '••••••••••••••••' : 'sk-ant-api03-...'}
                    disabled={settings?.use_claude_code}
                    className="w-full px-4 py-2.5 rounded-lg bg-charcoal-900 border border-charcoal-700 text-charcoal-100 placeholder:text-charcoal-600 focus:outline-none focus:border-bronze-500/50 focus:ring-1 focus:ring-bronze-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-500 hover:text-charcoal-300"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  onClick={() => saveSettings({ anthropic_api_key: apiKeyInput })}
                  disabled={!apiKeyInput || saving || settings?.use_claude_code}
                  className="px-4 py-2.5 rounded-lg bg-bronze-600 text-white font-medium hover:bg-bronze-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {apiKeyConfigured && !settings?.use_claude_code ? (
                  <>
                    <div className="h-2 w-2 rounded-full bg-status-success" />
                    <span className="text-xs text-status-success">API key configured</span>
                    <button
                      onClick={validateApiKey}
                      className="text-xs text-bronze-500 hover:text-bronze-400 ml-2"
                    >
                      Validate
                    </button>
                  </>
                ) : !settings?.use_claude_code ? (
                  <>
                    <div className="h-2 w-2 rounded-full bg-charcoal-600" />
                    <span className="text-xs text-charcoal-500">Not configured - engines will run in mock mode</span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="pt-4 border-t border-charcoal-700">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.mock_mode || false}
                  onChange={(e) => saveSettings({ mock_mode: e.target.checked })}
                  className="w-5 h-5 rounded border-charcoal-600 bg-charcoal-800 text-bronze-500 focus:ring-bronze-500/20"
                />
                <div>
                  <span className="text-charcoal-200 font-medium">Mock Mode</span>
                  <p className="text-xs text-charcoal-500">Run engines without making API calls (for testing)</p>
                </div>
              </label>
            </div>
          </div>
        </Card>

        {/* Model Selection */}
        <Card className="p-6 bg-charcoal-800/50 border-charcoal-700">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-lg bg-bronze-500/10">
              <Shield className="h-6 w-6 text-bronze-500" />
            </div>
            <div>
              <h2 className="font-display text-xl text-charcoal-100">Model Selection</h2>
              <p className="text-sm text-charcoal-400 mt-1">
                Choose the default Claude model for analysis.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'claude-3-haiku-20240307', name: 'Haiku', desc: 'Fast & affordable', badge: 'Speed' },
              { id: 'claude-3-5-sonnet-20241022', name: 'Sonnet 3.5', desc: 'Best balance', badge: 'Recommended' },
              { id: 'claude-sonnet-4-20250514', name: 'Sonnet 4', desc: 'Most capable', badge: 'Latest' },
            ].map((model) => (
              <button
                key={model.id}
                onClick={() => saveSettings({ default_model: model.id })}
                className={`p-4 rounded-lg border text-left transition-all ${
                  settings?.default_model === model.id
                    ? 'bg-bronze-500/10 border-bronze-500/50'
                    : 'bg-charcoal-900 border-charcoal-700 hover:border-charcoal-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-charcoal-200">{model.name}</span>
                  <Badge variant="outline" className={`text-xs ${
                    settings?.default_model === model.id
                      ? 'border-bronze-500/50 text-bronze-500'
                      : 'border-charcoal-600 text-charcoal-500'
                  }`}>
                    {model.badge}
                  </Badge>
                </div>
                <span className="text-xs text-charcoal-500">{model.desc}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Theme */}
        <Card className="p-6 bg-charcoal-800/50 border-charcoal-700">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-lg bg-bronze-500/10">
              <Palette className="h-6 w-6 text-bronze-500" />
            </div>
            <div>
              <h2 className="font-display text-xl text-charcoal-100">Appearance</h2>
              <p className="text-sm text-charcoal-400 mt-1">
                Customize the application appearance.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            {[
              { id: 'dark', name: 'Dark', icon: '🌙' },
              { id: 'light', name: 'Light', icon: '☀️', disabled: true },
              { id: 'system', name: 'System', icon: '💻', disabled: true },
            ].map((theme) => (
              <button
                key={theme.id}
                onClick={() => !theme.disabled && saveSettings({ theme: theme.id })}
                disabled={theme.disabled}
                className={`flex-1 p-4 rounded-lg border text-center transition-all ${
                  settings?.theme === theme.id
                    ? 'bg-bronze-500/10 border-bronze-500/50'
                    : theme.disabled
                    ? 'bg-charcoal-900/50 border-charcoal-700 opacity-50 cursor-not-allowed'
                    : 'bg-charcoal-900 border-charcoal-700 hover:border-charcoal-600'
                }`}
              >
                <span className="text-2xl mb-2 block">{theme.icon}</span>
                <span className="text-sm font-medium text-charcoal-200">{theme.name}</span>
                {theme.disabled && <span className="block text-xs text-charcoal-600 mt-1">Coming soon</span>}
              </button>
            ))}
          </div>
        </Card>

        {/* Info Card */}
        <Card className="p-6 bg-gradient-to-br from-charcoal-800 to-charcoal-900 border-charcoal-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-2 w-2 rounded-full bg-status-success animate-pulse" />
            <span className="text-xs text-charcoal-400 uppercase tracking-wide">Local-First Architecture</span>
          </div>
          <p className="text-sm text-charcoal-300 leading-relaxed">
            All settings and documents are stored locally on your machine. 
            API keys are encrypted at rest and never transmitted to any server except the AI provider.
            Your case data never leaves your device.
          </p>
        </Card>
      </div>
    </div>
  )
}
