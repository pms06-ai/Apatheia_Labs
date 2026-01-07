import Groq from 'groq-sdk'

// Use dummy key if missing to avoid crash on import
// We check for valid key in the analyze function if actually used
export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'gsk_dummy_key_do_not_use',
})

// Available models on Groq free tier
export const MODELS = {
  FAST: 'llama-3.1-8b-instant',      // Fastest, good for simple tasks
  BALANCED: 'llama-3.1-70b-versatile', // Best quality/speed ratio
  MIXTRAL: 'mixtral-8x7b-32768',       // Good for longer context
} as const

export interface AnalysisRequest {
  text: string
  task: 'extract_entities' | 'detect_contradictions' | 'analyze_claims' | 'summarize' | 'custom'
  customPrompt?: string
  model?: keyof typeof MODELS
}

export interface AnalysisResponse {
  result: unknown
  model: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * System prompts for different analysis tasks
 */
const SYSTEM_PROMPTS = {
  extract_entities: `You are a forensic analyst extracting entities from legal documents.
Extract all named entities and classify them:
- PERSON: Individual names
- ORGANIZATION: Companies, institutions, agencies
- PROFESSIONAL: Named professionals with roles (social worker, expert witness, etc.)
- COURT: Court names and references
- DATE: Specific dates and date ranges
- LOCATION: Places and addresses
- DOCUMENT: Document references and exhibits

Return JSON format:
{
  "entities": [
    {"text": "...", "type": "...", "context": "..."}
  ]
}`,

  detect_contradictions: `You are a forensic analyst detecting contradictions in legal documents.
Compare statements and identify:
- Direct contradictions: Statements that cannot both be true
- Temporal contradictions: Timeline inconsistencies
- Logical contradictions: Statements that undermine each other
- Omission contradictions: Key information present in one source but absent in another

Return JSON format:
{
  "contradictions": [
    {
      "type": "direct|temporal|logical|omission",
      "severity": "critical|high|medium|low",
      "statement_a": "...",
      "statement_b": "...",
      "explanation": "..."
    }
  ]
}`,

  analyze_claims: `You are a forensic analyst evaluating institutional claims.
For each claim, assess:
- Foundation type: verified, supported, unsupported, contested, circular, contaminated, unfounded
- Evidence quality: What evidence supports or contradicts this claim?
- Source reliability: Is the source credible and independent?

Return JSON format:
{
  "claims": [
    {
      "claim_text": "...",
      "claim_type": "factual|opinion|finding|recommendation|conclusion|allegation",
      "foundation_type": "...",
      "confidence": 0.0-1.0,
      "evidence": ["..."],
      "concerns": ["..."]
    }
  ]
}`,

  summarize: `You are a forensic analyst summarizing legal documents.
Provide a structured summary including:
- Key facts and findings
- Timeline of events
- Named parties and their roles
- Important claims and allegations
- Evidence referenced

Keep the summary factual and objective.`,
}

/**
 * Run analysis on text using Groq
 */
export async function analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
  const model = MODELS[request.model || 'BALANCED']

  const systemPrompt = request.task === 'custom'
    ? request.customPrompt
    : SYSTEM_PROMPTS[request.task]

  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt || '' },
      { role: 'user', content: request.text }
    ],
    temperature: 0.1, // Low temperature for factual analysis
    max_tokens: 4096,
    response_format: request.task !== 'summarize' ? { type: 'json_object' } : undefined,
  })

  const content = completion.choices[0]?.message?.content || ''

  let result: unknown
  try {
    result = JSON.parse(content)
  } catch {
    result = content
  }

  return {
    result,
    model,
    usage: {
      prompt_tokens: completion.usage?.prompt_tokens || 0,
      completion_tokens: completion.usage?.completion_tokens || 0,
      total_tokens: completion.usage?.total_tokens || 0,
    }
  }
}

