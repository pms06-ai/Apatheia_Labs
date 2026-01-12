import { getPreferredAIProvider } from './env'
import { analyze as analyzeGroq, MODELS as GROQ_MODELS } from './groq'
import { analyze as analyzeAnthropic, MODELS as ANTHROPIC_MODELS } from './anthropic'
import { analyzeWithClaudeCode } from './claude-code-client'
import type { AnalysisRequest as GroqAnalysisRequest } from './groq'
import type { AnalysisRequest as AnthropicAnalysisRequest } from './anthropic'

export type AIProvider = 'anthropic' | 'groq' | 'gemini' | 'openai' | 'claude-code' | 'mock'

interface AnalysisRequest {
  text: string
  task: 'extract_entities' | 'detect_contradictions' | 'analyze_claims' | 'summarize' | 'custom'
  customPrompt?: string
  model?: string // Generic model support
  jsonMode?: boolean
}

interface AnalysisResponse {
  result: unknown
  model: string
  usage?: {
    input_tokens: number
    output_tokens: number
  }
}

/**
 * Route analysis request to the preferred provider
 */
export async function analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
  const provider = getPreferredAIProvider()

  switch (provider) {
    case 'anthropic':
      // Map generic request to Anthropic specific if needed
      return analyzeAnthropic(toAnthropicRequest(request))

    case 'groq': {
      const gResponse = await analyzeGroq(toGroqRequest(request))
      return {
        ...gResponse,
        usage: {
          input_tokens: gResponse.usage.prompt_tokens,
          output_tokens: gResponse.usage.completion_tokens,
        },
      }
    }

    case 'claude-code': {
      // Use Claude Code CLI for analysis
      const ccResponse = await analyzeWithClaudeCode(
        request.text,
        request.task,
        request.customPrompt
      )
      return {
        result: ccResponse.result,
        model: ccResponse.model,
        usage: { input_tokens: 0, output_tokens: 0 }, // CLI doesn't report usage
      }
    }

    // Future providers
    case 'gemini':
    case 'openai':
      throw new Error(`Provider ${provider} not yet implemented in unified client`)

    case 'mock':
      console.log(`[MOCK AI] Analyzing task: ${request.task}`)
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Return context-aware mock data
      return {
        model: 'mock-model-v1',
        result: getMockResponse(request),
        usage: { input_tokens: 100, output_tokens: 50 },
      }

    default:
      // Fallback
      throw new Error('Unknown AI provider')
  }
}

function toAnthropicRequest(request: AnalysisRequest): AnthropicAnalysisRequest {
  const model = resolveAnthropicModel(request.model)
  return {
    text: request.text,
    task: request.task,
    customPrompt: request.customPrompt,
    model,
    jsonMode: request.jsonMode,
  }
}

function toGroqRequest(request: AnalysisRequest): GroqAnalysisRequest {
  const model = resolveGroqModel(request.model)
  return {
    text: request.text,
    task: request.task,
    customPrompt: request.customPrompt,
    model,
  }
}

function resolveAnthropicModel(model?: string): AnthropicAnalysisRequest['model'] {
  if (!model) return undefined
  return isValidAnthropicModel(model) ? model : undefined
}

function resolveGroqModel(model?: string): GroqAnalysisRequest['model'] {
  if (!model) return undefined
  return isValidGroqModel(model) ? model : undefined
}

function isValidAnthropicModel(model: string): model is keyof typeof ANTHROPIC_MODELS {
  return Object.prototype.hasOwnProperty.call(ANTHROPIC_MODELS, model)
}

function isValidGroqModel(model: string): model is keyof typeof GROQ_MODELS {
  return Object.prototype.hasOwnProperty.call(GROQ_MODELS, model)
}

function getMockResponse(request: AnalysisRequest): any {
  switch (request.task) {
    case 'extract_entities':
      return {
        entities: [
          { text: 'John Doe', type: 'PERSON', context: 'Mentioned in statement' },
          { text: 'Metropolitan Police', type: 'ORGANIZATION', context: 'Investigating body' },
        ],
      }
    case 'detect_contradictions':
      return {
        contradictions: [
          {
            title: 'Conflicting dates',
            type: 'temporal',
            description: 'Date mismatch between reports',
            explanation: 'One report says Jan 1st, another Jan 2nd',
            severity: 'medium',
          },
        ],
      }
    case 'analyze_claims':
      return {
        claims: [
          {
            claim_text: 'Subject was present',
            claim_type: 'factual',
            foundation_type: 'supported',
            confidence: 0.9,
          },
        ],
      }
    case 'summarize':
      return { summary: 'This is a mock summary of the provided document content.' }

    case 'custom':
    default:
      // Try to guess based on prompt content if it's a JSON request
      if (request.jsonMode || request.text?.includes('JSON')) {
        if (request.text?.includes('citations')) return { citations: ['Doc A', 'Report B'] }
        if (request.text?.includes('violation'))
          return {
            violations: [
              {
                type: 'scope_exceeded',
                title: 'Mock Violation',
                severity: 'medium',
                description: 'Mock violation description',
              },
            ],
            summary: { criticalCount: 0, overallAssessment: 'Compliant' },
          }
        if (request.text?.includes('shared language'))
          return {
            sharedLanguage: [],
            informationFlow: [],
            independenceViolations: [],
          }
        return {
          analysis: 'Mock custom analysis result',
          mock_data: true,
        }
      }
      return 'This is a mock response for the custom task.'
  }
}

/**
 * Direct JSON generation helper (Provider agnostic)
 * Supports two call signatures:
 * 1. generateJSON<T>(prompt) - single prompt containing instructions
 * 2. generateJSON<T>(systemPrompt, userContent) - system + user
 */
export async function generateJSON<T = unknown>(
  promptOrSystem: string,
  userContent?: string
): Promise<T> {
  const response = await analyze({
    task: 'custom',
    customPrompt: userContent ? promptOrSystem : '',
    text: userContent || promptOrSystem,
    jsonMode: true,
  })

  return response.result as T
}
