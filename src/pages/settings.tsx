import { useState, useEffect } from 'react'
import {
  Key,
  Shield,
  Palette,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Terminal,
  Zap,
  Code2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { isDesktop } from '@/lib/tauri'

interface PythonConfig {
  python_path?: string
  venv_path?: string
  ocr_script_path?: string
}

interface AppSettings {
  anthropic_api_key?: string
  use_claude_code?: boolean
  mock_mode: boolean
  default_model: string
  theme: string
  python: PythonConfig
}

interface ClaudeCodeStatus {
  installed: boolean
  version?: string
  error?: string
}

interface PythonStatus {
  available: boolean
  version?: string
  path: string
  venv_active: boolean
  ocr_script_found: boolean
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
  const [pythonStatus, setPythonStatus] = useState<PythonStatus | null>(null)
  const [checkingPython, setCheckingPython] = useState(false)
  const [pythonPath, setPythonPath] = useState('')
  const [venvPath, setVenvPath] = useState('')
  const [ocrScriptPath, setOcrScriptPath] = useState('')

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

      const [settingsResult, hasKey, ccStatus, pyStatus] = await Promise.all([
        invoke<{ success: boolean; settings?: AppSettings; error?: string }>('get_settings'),
        invoke<boolean>('check_api_key'),
        invoke<ClaudeCodeStatus>('check_claude_code_status'),
        invoke<PythonStatus>('check_python_status'),
      ])

      if (settingsResult.success && settingsResult.settings) {
        setSettings(settingsResult.settings)
        setApiKeyConfigured(hasKey)
        // Initialize Python path inputs from settings
        setPythonPath(settingsResult.settings.python?.python_path || '')
        setVenvPath(settingsResult.settings.python?.venv_path || '')
        setOcrScriptPath(settingsResult.settings.python?.ocr_script_path || '')
      } else {
        setError(settingsResult.error || 'Failed to load settings')
      }

      setClaudeCodeStatus(ccStatus)
      setPythonStatus(pyStatus)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings(
    updates: Partial<{
      anthropic_api_key: string
      use_claude_code: boolean
      mock_mode: boolean
      default_model: string
      theme: string
      python_path: string
      venv_path: string
      ocr_script_path: string
    }>
  ) {
    if (!isDesktop()) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const { invoke } = await import('@tauri-apps/api/core')

      const result = await invoke<{ success: boolean; settings?: AppSettings; error?: string }>(
        'update_settings',
        {
          anthropicApiKey: updates.anthropic_api_key,
          useClaudeCode: updates.use_claude_code,
          mockMode: updates.mock_mode,
          defaultModel: updates.default_model,
          theme: updates.theme,
          pythonPath: updates.python_path,
          venvPath: updates.venv_path,
          ocrScriptPath: updates.ocr_script_path,
        }
      )

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

  async function checkPythonStatus() {
    if (!isDesktop()) return

    setCheckingPython(true)
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const status = await invoke<PythonStatus>('check_python_status')
      setPythonStatus(status)

      if (status.available) {
        setSuccess(`Python ${status.version} detected${status.venv_active ? ' (venv active)' : ''}`)
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to check Python status')
    } finally {
      setCheckingPython(false)
    }
  }

  async function savePythonSettings() {
    await saveSettings({
      python_path: pythonPath || undefined,
      venv_path: venvPath || undefined,
      ocr_script_path: ocrScriptPath || undefined,
    })
    // Recheck status after saving
    await checkPythonStatus()
  }

  if (!isDesktop()) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="border-charcoal-700 bg-charcoal-800 p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-charcoal-500" />
          <h2 className="mb-2 font-display text-xl text-charcoal-200">Desktop Only</h2>
          <p className="text-charcoal-400">
            Settings are only available in the desktop application.
          </p>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-bronze-500" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl tracking-tight text-charcoal-100">Settings</h1>
        <p className="mt-2 text-charcoal-400">Configure your Phronesis FCIP installation.</p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-status-critical/30 bg-status-critical/10 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-status-critical" />
          <span className="text-status-critical">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-status-success/30 bg-status-success/10 p-4">
          <Check className="h-5 w-5 shrink-0 text-status-success" />
          <span className="text-status-success">{success}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Claude Max Integration (Featured) */}
        <Card className="border-bronze-500/30 bg-gradient-to-br from-bronze-900/20 to-charcoal-800 p-6">
          <div className="mb-6 flex items-start gap-4">
            <div className="rounded-lg bg-bronze-500/20 p-3">
              <Zap className="h-6 w-6 text-bronze-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-xl text-charcoal-100">Claude Max Integration</h2>
                <Badge variant="outline" className="border-bronze-500/50 text-xs text-bronze-400">
                  Recommended
                </Badge>
              </div>
              <p className="mt-1 text-sm text-charcoal-400">
                Use your Claude Max subscription instead of API credits.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Claude Code Status */}
            <div className="rounded-lg border border-charcoal-700 bg-charcoal-900/50 p-4">
              <div className="mb-3 flex items-center justify-between">
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
                  <div className="rounded bg-charcoal-800 p-2 font-mono text-xs text-charcoal-300">
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
              <label
                className={`flex cursor-pointer items-center gap-3 ${!claudeCodeStatus?.installed ? 'opacity-50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={settings?.use_claude_code || false}
                  onChange={e => saveSettings({ use_claude_code: e.target.checked })}
                  disabled={!claudeCodeStatus?.installed}
                  className="h-5 w-5 rounded border-charcoal-600 bg-charcoal-800 text-bronze-500 focus:ring-bronze-500/20 disabled:cursor-not-allowed"
                />
                <div>
                  <span className="font-medium text-charcoal-200">
                    Use Claude Max via Claude Code
                  </span>
                  <p className="text-xs text-charcoal-500">
                    {claudeCodeStatus?.installed
                      ? 'Run engines using your Max subscription quota'
                      : 'Install Claude Code first to enable this option'}
                  </p>
                </div>
              </label>
            </div>

            {settings?.use_claude_code && claudeCodeStatus?.installed && (
              <div className="rounded-lg border border-bronze-500/20 bg-bronze-500/10 p-3">
                <p className="text-sm text-bronze-400">
                  Engines will use your Claude Max subscription. Make sure you are logged in via{' '}
                  <code className="rounded bg-charcoal-800 px-1 py-0.5 text-xs">claude login</code>
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* API Configuration */}
        <Card
          className={`border-charcoal-700 bg-charcoal-800/50 p-6 ${settings?.use_claude_code ? 'opacity-60' : ''}`}
        >
          <div className="mb-6 flex items-start gap-4">
            <div className="rounded-lg bg-bronze-500/10 p-3">
              <Key className="h-6 w-6 text-bronze-500" />
            </div>
            <div>
              <h2 className="font-display text-xl text-charcoal-100">API Key (Alternative)</h2>
              <p className="mt-1 text-sm text-charcoal-400">
                {settings?.use_claude_code
                  ? 'Disabled while Claude Code is active'
                  : 'Configure your Anthropic API key for pay-per-use access.'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-charcoal-300">
                Anthropic API Key
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={e => setApiKeyInput(e.target.value)}
                    placeholder={apiKeyConfigured ? '••••••••••••••••' : 'sk-ant-api03-...'}
                    disabled={settings?.use_claude_code}
                    className="w-full rounded-lg border border-charcoal-700 bg-charcoal-900 px-4 py-2.5 text-charcoal-100 placeholder:text-charcoal-600 focus:border-bronze-500/50 focus:outline-none focus:ring-1 focus:ring-bronze-500/20 disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="rounded-lg bg-bronze-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-bronze-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                {apiKeyConfigured && !settings?.use_claude_code ? (
                  <>
                    <div className="h-2 w-2 rounded-full bg-status-success" />
                    <span className="text-xs text-status-success">API key configured</span>
                    <button
                      onClick={validateApiKey}
                      className="ml-2 text-xs text-bronze-500 hover:text-bronze-400"
                    >
                      Validate
                    </button>
                  </>
                ) : !settings?.use_claude_code ? (
                  <>
                    <div className="h-2 w-2 rounded-full bg-charcoal-600" />
                    <span className="text-xs text-charcoal-500">
                      Not configured - engines will run in mock mode
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="border-t border-charcoal-700 pt-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings?.mock_mode || false}
                  onChange={e => saveSettings({ mock_mode: e.target.checked })}
                  className="h-5 w-5 rounded border-charcoal-600 bg-charcoal-800 text-bronze-500 focus:ring-bronze-500/20"
                />
                <div>
                  <span className="font-medium text-charcoal-200">Mock Mode</span>
                  <p className="text-xs text-charcoal-500">
                    Run engines without making API calls (for testing)
                  </p>
                </div>
              </label>
            </div>
          </div>
        </Card>

        {/* Model Selection */}
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-6">
          <div className="mb-6 flex items-start gap-4">
            <div className="rounded-lg bg-bronze-500/10 p-3">
              <Shield className="h-6 w-6 text-bronze-500" />
            </div>
            <div>
              <h2 className="font-display text-xl text-charcoal-100">Model Selection</h2>
              <p className="mt-1 text-sm text-charcoal-400">
                Choose the default Claude model for analysis.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              {
                id: 'claude-3-haiku-20240307',
                name: 'Haiku',
                desc: 'Fast & affordable',
                badge: 'Speed',
              },
              {
                id: 'claude-3-5-sonnet-20241022',
                name: 'Sonnet 3.5',
                desc: 'Best balance',
                badge: 'Recommended',
              },
              {
                id: 'claude-sonnet-4-20250514',
                name: 'Sonnet 4',
                desc: 'Most capable',
                badge: 'Latest',
              },
            ].map(model => (
              <button
                key={model.id}
                onClick={() => saveSettings({ default_model: model.id })}
                className={`rounded-lg border p-4 text-left transition-all ${
                  settings?.default_model === model.id
                    ? 'border-bronze-500/50 bg-bronze-500/10'
                    : 'border-charcoal-700 bg-charcoal-900 hover:border-charcoal-600'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium text-charcoal-200">{model.name}</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      settings?.default_model === model.id
                        ? 'border-bronze-500/50 text-bronze-500'
                        : 'border-charcoal-600 text-charcoal-500'
                    }`}
                  >
                    {model.badge}
                  </Badge>
                </div>
                <span className="text-xs text-charcoal-500">{model.desc}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Theme */}
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-6">
          <div className="mb-6 flex items-start gap-4">
            <div className="rounded-lg bg-bronze-500/10 p-3">
              <Palette className="h-6 w-6 text-bronze-500" />
            </div>
            <div>
              <h2 className="font-display text-xl text-charcoal-100">Appearance</h2>
              <p className="mt-1 text-sm text-charcoal-400">
                Customize the application appearance.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            {[
              { id: 'dark', name: 'Dark', icon: '🌙' },
              { id: 'light', name: 'Light', icon: '☀️', disabled: true },
              { id: 'system', name: 'System', icon: '💻', disabled: true },
            ].map(theme => (
              <button
                key={theme.id}
                onClick={() => !theme.disabled && saveSettings({ theme: theme.id })}
                disabled={theme.disabled}
                className={`flex-1 rounded-lg border p-4 text-center transition-all ${
                  settings?.theme === theme.id
                    ? 'border-bronze-500/50 bg-bronze-500/10'
                    : theme.disabled
                      ? 'cursor-not-allowed border-charcoal-700 bg-charcoal-900/50 opacity-50'
                      : 'border-charcoal-700 bg-charcoal-900 hover:border-charcoal-600'
                }`}
              >
                <span className="mb-2 block text-2xl">{theme.icon}</span>
                <span className="text-sm font-medium text-charcoal-200">{theme.name}</span>
                {theme.disabled && (
                  <span className="mt-1 block text-xs text-charcoal-600">Coming soon</span>
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* Python Environment */}
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-6">
          <div className="mb-6 flex items-start gap-4">
            <div className="rounded-lg bg-bronze-500/10 p-3">
              <Code2 className="h-6 w-6 text-bronze-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl text-charcoal-100">Python Environment</h2>
                <button
                  onClick={checkPythonStatus}
                  disabled={checkingPython}
                  className="rounded-lg bg-charcoal-700 px-3 py-1.5 text-sm text-charcoal-200 transition-colors hover:bg-charcoal-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {checkingPython ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Checking...
                    </span>
                  ) : (
                    'Check Status'
                  )}
                </button>
              </div>
              <p className="mt-1 text-sm text-charcoal-400">Configure Python for OCR processing.</p>
            </div>
          </div>

          {/* Python Status Indicator */}
          <div className="mb-4 rounded-lg border border-charcoal-700 bg-charcoal-900/50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-charcoal-300">Environment Status</span>
            </div>
            {pythonStatus ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${pythonStatus.available ? 'bg-status-success' : 'bg-status-critical'}`}
                  />
                  <span
                    className={`text-sm ${pythonStatus.available ? 'text-status-success' : 'text-status-critical'}`}
                  >
                    {pythonStatus.available
                      ? `Python ${pythonStatus.version}`
                      : 'Python not available'}
                  </span>
                </div>
                {pythonStatus.available && (
                  <>
                    <div className="flex items-center gap-2 text-xs text-charcoal-400">
                      <span className="font-mono">{pythonStatus.path}</span>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span
                        className={
                          pythonStatus.venv_active ? 'text-status-success' : 'text-charcoal-500'
                        }
                      >
                        {pythonStatus.venv_active ? '✓ Venv active' : '○ No venv'}
                      </span>
                      <span
                        className={
                          pythonStatus.ocr_script_found
                            ? 'text-status-success'
                            : 'text-charcoal-500'
                        }
                      >
                        {pythonStatus.ocr_script_found
                          ? '✓ OCR script found'
                          : '○ OCR script not found'}
                      </span>
                    </div>
                  </>
                )}
                {pythonStatus.error && (
                  <p className="mt-1 text-xs text-status-critical">{pythonStatus.error}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-charcoal-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading status...
              </div>
            )}
          </div>

          {pythonStatus && !pythonStatus.available && (
            <div className="mb-4 rounded-lg border border-status-critical/30 bg-status-critical/10 p-3">
              <div className="flex items-center gap-2 text-sm text-status-critical">
                <AlertCircle className="h-4 w-4" />
                <span>Python not configured. Search and OCR features require Python.</span>
              </div>
              <div className="mt-2 text-xs text-charcoal-400">
                <a
                  className="text-bronze-400 underline hover:text-bronze-300"
                  href="https://www.python.org/downloads/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Download Python
                </a>
              </div>
            </div>
          )}

          {/* Python Path Inputs */}
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-charcoal-300">
                Python Path
                <span className="ml-2 font-normal text-charcoal-500">(optional)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pythonPath}
                  onChange={e => setPythonPath(e.target.value)}
                  placeholder="python or /usr/bin/python3"
                  className="flex-1 rounded-lg border border-charcoal-700 bg-charcoal-900 px-4 py-2.5 font-mono text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-bronze-500/50 focus:outline-none focus:ring-1 focus:ring-bronze-500/20"
                />
              </div>
              <p className="mt-1 text-xs text-charcoal-500">Leave empty to use system Python</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-charcoal-300">
                Virtual Environment Path
                <span className="ml-2 font-normal text-charcoal-500">(optional)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={venvPath}
                  onChange={e => setVenvPath(e.target.value)}
                  placeholder="C:\path\to\venv or /path/to/venv"
                  className="flex-1 rounded-lg border border-charcoal-700 bg-charcoal-900 px-4 py-2.5 font-mono text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-bronze-500/50 focus:outline-none focus:ring-1 focus:ring-bronze-500/20"
                />
              </div>
              <p className="mt-1 text-xs text-charcoal-500">
                If set, will use Python from this venv
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-charcoal-300">
                OCR Script Path
                <span className="ml-2 font-normal text-charcoal-500">(optional)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ocrScriptPath}
                  onChange={e => setOcrScriptPath(e.target.value)}
                  placeholder="tools/ocr/process_ocr_v2.py"
                  className="flex-1 rounded-lg border border-charcoal-700 bg-charcoal-900 px-4 py-2.5 font-mono text-sm text-charcoal-100 placeholder:text-charcoal-600 focus:border-bronze-500/50 focus:outline-none focus:ring-1 focus:ring-bronze-500/20"
                />
              </div>
              <p className="mt-1 text-xs text-charcoal-500">Custom OCR script location</p>
            </div>

            <div className="pt-2">
              <button
                onClick={savePythonSettings}
                disabled={saving}
                className="rounded-lg bg-bronze-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-bronze-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Python Settings'}
              </button>
            </div>
          </div>
        </Card>

        {/* Info Card */}
        <Card className="border-charcoal-700 bg-gradient-to-br from-charcoal-800 to-charcoal-900 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-2 w-2 animate-pulse rounded-full bg-status-success" />
            <span className="text-xs uppercase tracking-wide text-charcoal-400">
              Local-First Architecture
            </span>
          </div>
          <p className="text-sm leading-relaxed text-charcoal-300">
            All settings and documents are stored locally on your machine. API keys are encrypted at
            rest and never transmitted to any server except the AI provider. Your case data never
            leaves your device.
          </p>
        </Card>
      </div>
    </div>
  )
}
