"use strict";
/**
 * Claude Code Client
 *
 * Spawns the Claude Code CLI to make requests using the user's
 * Max subscription instead of direct API calls.
 *
 * Prerequisites:
 * - Claude Code installed: npm install -g @anthropic-ai/claude-code
 * - User logged in: claude login
 * - No ANTHROPIC_API_KEY env var (so Claude Code uses Max auth)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkClaudeCodeStatus = checkClaudeCodeStatus;
exports.executePrompt = executePrompt;
exports.executeJSONPrompt = executeJSONPrompt;
exports.log = log;
const child_process_1 = require("child_process");
// =============================================================================
// Status Checking
// =============================================================================
/**
 * Check if Claude Code is installed and authenticated
 */
function checkClaudeCodeStatus() {
    try {
        // Check if claude command exists
        const version = (0, child_process_1.execSync)('claude --version', {
            encoding: 'utf-8',
            timeout: 5000,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, ANTHROPIC_API_KEY: undefined } // Ensure no API key
        }).trim();
        // Try to check auth status
        // Claude Code doesn't have a direct "check auth" command,
        // so we'll assume installed = potentially authenticated
        // The actual auth check happens on first use
        return {
            installed: true,
            authenticated: true, // Assumed - will fail on first use if not
            version,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('not found') || errorMessage.includes('not recognized')) {
            return {
                installed: false,
                authenticated: false,
                error: 'Claude Code not installed. Run: npm install -g @anthropic-ai/claude-code',
            };
        }
        return {
            installed: false,
            authenticated: false,
            error: errorMessage,
        };
    }
}
// =============================================================================
// Prompt Execution
// =============================================================================
/**
 * Execute a prompt using Claude Code CLI
 *
 * Uses the --print flag for single-shot non-interactive responses.
 * The prompt is passed via stdin to avoid command line length limits on Windows.
 */
async function executePrompt(systemPrompt, userContent, options = {}) {
    const { timeout = 180000 } = options; // 3 minute default timeout for large prompts
    return new Promise((resolve) => {
        // Track if we've already resolved to prevent multiple resolutions
        let resolved = false;
        let timeoutId = null;
        const safeResolve = (response) => {
            if (resolved)
                return;
            resolved = true;
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            resolve(response);
        };
        // Build the full prompt
        const fullPrompt = `${systemPrompt}\n\n---\n\n${userContent}`;
        // Spawn claude with --print for single response
        // Pass prompt via stdin (using -p -) to avoid Windows command line length limit
        const child = (0, child_process_1.spawn)('claude', ['--print', '-p', '-'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                ANTHROPIC_API_KEY: undefined, // Force Max subscription usage
                NO_COLOR: '1', // Disable color codes in output
            },
            shell: process.platform === 'win32', // Use shell on Windows for PATH resolution
        });
        let stdout = '';
        let stderr = '';
        child.stdout?.on('data', (data) => {
            stdout += data.toString();
        });
        child.stderr?.on('data', (data) => {
            stderr += data.toString();
        });
        child.on('error', (error) => {
            safeResolve({
                success: false,
                content: '',
                error: `Failed to spawn Claude Code: ${error.message}`,
            });
        });
        child.on('close', (code) => {
            if (code === 0) {
                safeResolve({
                    success: true,
                    content: stdout.trim(),
                });
            }
            else {
                safeResolve({
                    success: false,
                    content: stdout.trim(),
                    error: stderr.trim() || `Claude Code exited with code ${code}`,
                });
            }
        });
        // Write prompt to stdin and close it
        child.stdin?.write(fullPrompt);
        child.stdin?.end();
        // Handle timeout - clear this when process completes
        timeoutId = setTimeout(() => {
            if (!resolved) {
                child.kill('SIGTERM');
                safeResolve({
                    success: false,
                    content: '',
                    error: `Claude Code timed out after ${timeout / 1000} seconds`,
                });
            }
        }, timeout);
    });
}
/**
 * Execute a prompt and parse the response as JSON
 */
async function executeJSONPrompt(systemPrompt, userContent, options = {}) {
    // Add JSON instruction to system prompt
    const jsonSystemPrompt = `${systemPrompt}

IMPORTANT: Respond ONLY with valid JSON. Do not include any text before or after the JSON object. Do not use markdown code blocks.`;
    const response = await executePrompt(jsonSystemPrompt, userContent, options);
    if (!response.success) {
        return {
            success: false,
            result: null,
            error: response.error,
        };
    }
    try {
        // Try to extract JSON from the response
        const content = response.content;
        // First, try direct parse
        try {
            const result = JSON.parse(content);
            return { success: true, result };
        }
        catch {
            // Try to find JSON in markdown code blocks
            const jsonMatch = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[1].trim());
                return { success: true, result };
            }
            // Try to find raw JSON object/array (non-greedy to avoid over-matching)
            const objectMatch = content.match(/\{[\s\S]*?\}(?=\s*$)/);
            const arrayMatch = content.match(/\[[\s\S]*?\](?=\s*$)/);
            const match = objectMatch || arrayMatch;
            if (match) {
                const result = JSON.parse(match[0]);
                return { success: true, result };
            }
            throw new Error('No valid JSON found in response');
        }
    }
    catch (parseError) {
        return {
            success: false,
            result: null,
            error: `Failed to parse JSON from Claude Code response: ${parseError instanceof Error ? parseError.message : String(parseError)}\n\nRaw response:\n${response.content.slice(0, 500)}`,
        };
    }
}
/**
 * Log helper for debugging
 */
function log(message) {
    console.error(`[ClaudeCode] ${message}`);
}
