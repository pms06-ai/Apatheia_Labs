/**
 * Claude Code CLI Client
 *
 * Executes analysis tasks via Claude Code CLI subprocess.
 * This allows Phronesis to leverage Claude Code's capabilities
 * including its context, tools, and conversation history.
 */

import { spawn } from 'child_process'

export interface ClaudeCodeRequest {
  prompt: string
  /** Working directory for Claude Code */
  cwd?: string
  /** Timeout in milliseconds (default: 120000) */
  timeout?: number
  /** Print mode - just print response without interactive features */
  print?: boolean
}

export interface ClaudeCodeResponse {
  success: boolean
  output: string
  error?: string
  exitCode: number
}

/**
 * Execute a prompt via Claude Code CLI
 *
 * Uses --print mode for non-interactive execution.
 * The prompt is passed via stdin to avoid shell escaping issues.
 */
export async function executeClaudeCode(
  request: ClaudeCodeRequest
): Promise<ClaudeCodeResponse> {
  const {
    prompt,
    cwd = process.cwd(),
    timeout = 120000,
    print = true,
  } = request

  return new Promise((resolve) => {
    const args = print ? ['--print', '-'] : ['-']

    const child = spawn('claude', args, {
      cwd,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let resolved = false

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true
        child.kill('SIGTERM')
        resolve({
          success: false,
          output: stdout,
          error: `Timeout after ${timeout}ms`,
          exitCode: -1,
        })
      }
    }, timeout)

    child.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('close', (code) => {
      if (resolved) return
      resolved = true
      clearTimeout(timeoutId)

      resolve({
        success: code === 0,
        output: stdout.trim(),
        error: stderr.trim() || undefined,
        exitCode: code ?? -1,
      })
    })

    child.on('error', (err) => {
      if (resolved) return
      resolved = true
      clearTimeout(timeoutId)

      resolve({
        success: false,
        output: stdout,
        error: err.message,
        exitCode: -1,
      })
    })

    // Send prompt via stdin
    child.stdin?.write(prompt)
    child.stdin?.end()
  })
}

/**
 * Analyze text using Claude Code CLI
 *
 * Wraps the prompt in a structured analysis request.
 */
export async function analyzeWithClaudeCode(
  text: string,
  task: 'extract_entities' | 'detect_contradictions' | 'analyze_claims' | 'summarize' | 'custom',
  customPrompt?: string
): Promise<{ result: unknown; model: string }> {
  const prompt = buildAnalysisPrompt(text, task, customPrompt)

  const response = await executeClaudeCode({
    prompt,
    timeout: 180000, // 3 minutes for analysis
  })

  if (!response.success) {
    throw new Error(`Claude Code analysis failed: ${response.error || 'Unknown error'}`)
  }

  // Try to parse JSON from response
  try {
    const jsonMatch = response.output.match(/```json\n([\s\S]*?)\n```/)
    if (jsonMatch) {
      return {
        result: JSON.parse(jsonMatch[1]),
        model: 'claude-code-cli',
      }
    }

    // Try direct JSON parse
    const parsed = JSON.parse(response.output)
    return { result: parsed, model: 'claude-code-cli' }
  } catch {
    // Return raw text if not JSON
    return {
      result: { text: response.output },
      model: 'claude-code-cli',
    }
  }
}

function buildAnalysisPrompt(
  text: string,
  task: string,
  customPrompt?: string
): string {
  const taskPrompts: Record<string, string> = {
    extract_entities: `Extract all named entities (people, organizations, locations, dates) from the following text. Return as JSON with format: { "entities": [{ "text": string, "type": "PERSON"|"ORGANIZATION"|"LOCATION"|"DATE", "context": string }] }`,

    detect_contradictions: `Analyze the following text for contradictions using CASCADE methodology. Look for: SELF (internal), INTER_DOC (cross-document), TEMPORAL (timeline), EVIDENTIARY (claim vs evidence). Return as JSON: { "contradictions": [{ "type": string, "title": string, "description": string, "severity": "low"|"medium"|"high" }] }`,

    analyze_claims: `Extract all claims from the text and assess their evidentiary support. Return as JSON: { "claims": [{ "claim_text": string, "claim_type": "factual"|"opinion"|"inference", "foundation_type": "supported"|"unsupported"|"contradicted", "confidence": number }] }`,

    summarize: `Provide a concise summary of the following text, focusing on key facts, actors, and events. Return as JSON: { "summary": string, "key_points": string[], "actors": string[] }`,

    custom: customPrompt || 'Analyze the following text:',
  }

  const taskInstruction = taskPrompts[task] || taskPrompts.custom

  return `${taskInstruction}

---
TEXT TO ANALYZE:
${text}
---

Respond with valid JSON only.`
}

/**
 * Check if Claude Code CLI is available
 */
export async function isClaudeCodeAvailable(): Promise<boolean> {
  try {
    const response = await executeClaudeCode({
      prompt: 'echo "ok"',
      timeout: 5000,
      print: true,
    })
    return response.success
  } catch {
    return false
  }
}
