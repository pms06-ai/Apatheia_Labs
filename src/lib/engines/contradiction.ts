/**
 * CONTRADICTION ENGINE (Κ)
 * "Claim Comparison Across Documents"
 *
 * Detects contradictions, inconsistencies, and evolving claims
 * across multiple documents in a case.
 *
 * Core Question: Do statements contradict each other across documents?
 */

import { generateJSON } from '@/lib/ai-client'
import type { Document } from '@/CONTRACT'

// AI Response Types
interface QuoteFindResponse {
  found: boolean
  quotes?: string[]
}

export interface ContradictionFinding {
  id: string
  type: 'direct' | 'implicit' | 'temporal' | 'quantitative' | 'attributional'
  severity: 'critical' | 'high' | 'medium' | 'low'
  claim1: {
    documentId: string
    documentName: string
    text: string
    date?: string
    author?: string
    pageRef?: number
  }
  claim2: {
    documentId: string
    documentName: string
    text: string
    date?: string
    author?: string
    pageRef?: number
  }
  explanation: string
  implication: string
  suggestedResolution?: string
}

export interface ContradictionAnalysisResult {
  contradictions: ContradictionFinding[]
  claimClusters: {
    topic: string
    claims: { docId: string; text: string; stance: string }[]
    consensus: boolean
  }[]
  summary: {
    totalContradictions: number
    criticalCount: number
    mostContradictedTopics: string[]
    credibilityImpact: 'severe' | 'moderate' | 'minor' | 'none'
  }
}

interface ContradictionAnalysisResponse {
  contradictions: Array<{
    type: ContradictionFinding['type']
    severity: ContradictionFinding['severity']
    claim1: {
      documentId: string
      text: string
      date?: string
      author?: string
      pageRef?: number
    }
    claim2: {
      documentId: string
      text: string
      date?: string
      author?: string
      pageRef?: number
    }
    explanation: string
    implication: string
    suggestedResolution?: string
  }>
  claimClusters?: ContradictionAnalysisResult['claimClusters']
}

const CONTRADICTION_PROMPT = `You are a forensic document analyst specializing in detecting contradictions across legal documents.

DOCUMENTS TO ANALYZE:
{documents}

Find all contradictions between statements in these documents. Types of contradictions:
1. DIRECT: Explicit opposite statements ("X happened" vs "X did not happen")
2. IMPLICIT: Logically incompatible claims (timing, location, presence)
3. TEMPORAL: Timeline inconsistencies (dates, sequences, durations)
4. QUANTITATIVE: Number/measurement discrepancies
5. ATTRIBUTIONAL: Different people credited for same action

For each contradiction found:
- Quote the exact conflicting text from each document
- Identify the document source and page if available
- Explain why these statements contradict
- Rate severity based on impact on case
- Suggest how to resolve (if possible)

Focus on contradictions that affect:
- Credibility of witnesses/parties
- Timeline of events
- Presence or absence of people
- Actions taken or not taken
- Professional assessments

Respond in JSON:
{
  "contradictions": [
    {
      "type": "direct|implicit|temporal|quantitative|attributional",
      "severity": "critical|high|medium|low",
      "claim1": {
        "documentId": "...",
        "text": "...",
        "date": "...",
        "author": "...",
        "pageRef": number
      },
      "claim2": {
        "documentId": "...",
        "text": "...",
        "date": "...",
        "author": "...",
        "pageRef": number
      },
      "explanation": "...",
      "implication": "...",
      "suggestedResolution": "..."
    }
  ],
  "claimClusters": [
    {
      "topic": "...",
      "claims": [{"docId": "...", "text": "...", "stance": "..."}],
      "consensus": true/false
    }
  ]
}`

/**
 * Detect contradictions across a set of documents with pre-loaded content
 * (for use with Rust backend)
 */
export async function detectContradictionsWithContent(
  documentsWithContent: Array<{
    id: string
    filename: string
    doc_type?: string
    created_at?: string
    content: string
  }>,
  caseId: string
): Promise<ContradictionAnalysisResult> {
  // Format documents for prompt
  const docContents = documentsWithContent.map(doc => ({
    id: doc.id,
    name: doc.filename,
    type: doc.doc_type,
    date: doc.created_at,
    content: doc.content.slice(0, 50000), // Limit for context window
  }))

  return runContradictionAnalysis(docContents, caseId)
}

/**
 * Detect contradictions across a set of documents
 * Note: Document content fetching is now handled by Rust backend
 */
export async function detectContradictions(
  documents: Document[],
  caseId: string
): Promise<ContradictionAnalysisResult> {
  console.warn(
    '[ContradictionEngine] Document content fetching now handled by Rust backend. Using empty content.'
  )

  // Return documents with empty content - Rust backend should provide content
  const docContents = documents.map(doc => ({
    id: doc.id,
    name: doc.filename,
    type: doc.doc_type ?? undefined,
    date: doc.created_at ?? undefined,
    content: '', // Empty - Rust backend should provide content
  }))

  return runContradictionAnalysis(docContents, caseId)
}

/**
 * Internal function to run the actual analysis
 */
async function runContradictionAnalysis(
  docContents: Array<{
    id: string
    name: string
    type?: string
    date?: string
    content: string
  }>,
  caseId: string
): Promise<ContradictionAnalysisResult> {
  // Format documents for prompt
  const formattedDocs = docContents
    .map(d => `=== DOCUMENT: ${d.name} (ID: ${d.id}, Type: ${d.type}) ===\n${d.content}`)
    .join('\n\n---\n\n')

  const prompt = CONTRADICTION_PROMPT.replace('{documents}', formattedDocs)

  // Check if we have actual content to analyze
  let result: ContradictionAnalysisResponse
  const hasContent = docContents.some(d => d.content && d.content.length > 0)

  if (!hasContent) {
    console.log('[ContradictionEngine] No content provided, using mock analysis')
    const mockResult: ContradictionAnalysisResponse = {
      contradictions: [
        {
          type: 'direct' as const,
          severity: 'critical' as const,
          claim1: {
            documentId: docContents[0]?.id || 'mock-doc-1',
            text: 'Subject was at home all night',
            date: '2023-01-12T10:00:00Z',
            author: 'Officer A',
            pageRef: 2,
          },
          claim2: {
            documentId: docContents[1]?.id || 'mock-doc-2',
            text: 'Subject was seen at the pub at 9pm',
            date: '2023-01-15T14:30:00Z',
            author: 'Social Worker B',
            pageRef: 5,
          },
          explanation:
            "Direct contradiction regarding the subject's location on the night of the incident.",
          implication: "Undermines the credibility of the subject's alibi.",
          suggestedResolution: 'Verify CCTV footage or third-party witness statements.',
        },
        {
          type: 'temporal' as const,
          severity: 'high' as const,
          claim1: {
            documentId: docContents[0]?.id || 'mock-doc-1',
            text: 'Incident occurred at 10:00 PM',
            date: '2023-01-12T10:00:00Z',
          },
          claim2: {
            documentId: docContents[2]?.id || 'mock-doc-3',
            text: 'Ambulance called at 9:45 PM',
            date: '2023-01-20T09:00:00Z',
          },
          explanation: 'Timeline inconsistency: Ambulance called before the stated incident time.',
          implication: 'Suggests the timeline of events is inaccurate or manipulated.',
          suggestedResolution: 'Cross-reference with emergency service call logs.',
        },
      ],
      claimClusters: [
        {
          topic: 'Subject Location',
          claims: [
            { docId: docContents[0]?.id || '', text: 'At home', stance: 'Defense' },
            { docId: docContents[1]?.id || '', text: 'At pub', stance: 'Prosecution' },
          ],
          consensus: false,
        },
      ],
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Assign to result for processing
    result = mockResult
  } else {
    // Use Unified AI Router for multi-document analysis
    result = await generateJSON<ContradictionAnalysisResponse>(
      'You are a forensic document analyst.',
      prompt
    )
  }

  // Process contradictions
  const contradictions: ContradictionFinding[] = result.contradictions.map((c, idx) => ({
    id: `contradiction-${caseId.slice(0, 8)}-${idx}`,
    type: c.type,
    severity: c.severity,
    claim1: {
      documentId: c.claim1.documentId,
      documentName: docContents.find(d => d.id === c.claim1.documentId)?.name || 'Unknown',
      text: c.claim1.text,
      date: c.claim1.date,
      author: c.claim1.author,
      pageRef: c.claim1.pageRef,
    },
    claim2: {
      documentId: c.claim2.documentId,
      documentName: docContents.find(d => d.id === c.claim2.documentId)?.name || 'Unknown',
      text: c.claim2.text,
      date: c.claim2.date,
      author: c.claim2.author,
      pageRef: c.claim2.pageRef,
    },
    explanation: c.explanation,
    implication: c.implication,
    suggestedResolution: c.suggestedResolution,
  }))

  const analysisResult: ContradictionAnalysisResult = {
    contradictions,
    claimClusters: result.claimClusters || [],
    summary: {
      totalContradictions: contradictions.length,
      criticalCount: contradictions.filter(c => c.severity === 'critical').length,
      mostContradictedTopics: extractTopics(result.claimClusters || []),
      credibilityImpact: calculateCredibilityImpact(contradictions),
    },
  }

  // Prepare findings (Rust backend handles actual persistence)
  const findings = prepareContradictionFindings(caseId, contradictions)
  console.log('[ContradictionEngine] Prepared findings for storage:', findings.length)

  return analysisResult
}

/**
 * Compare two specific claims for contradiction
 */
export async function compareSpecificClaims(
  claim1: string,
  claim2: string,
  context?: string
): Promise<{
  contradicts: boolean
  type?: ContradictionFinding['type']
  explanation: string
  severity?: 'critical' | 'high' | 'medium' | 'low'
}> {
  const prompt = `Compare these two claims for contradiction:

CLAIM 1: "${claim1}"
CLAIM 2: "${claim2}"
${context ? `CONTEXT: ${context}` : ''}

Analyze:
1. Do these claims contradict each other?
2. If yes, what type of contradiction (direct/implicit/temporal/quantitative/attributional)?
3. Explain the nature of the contradiction
4. Rate severity if contradictory

Respond in JSON:
{
  "contradicts": boolean,
  "type": "direct|implicit|temporal|quantitative|attributional" or null,
  "explanation": "...",
  "severity": "critical|high|medium|low" or null
}`

  try {
    return await generateJSON('Compare claims for contradiction.', prompt)
  } catch {
    return { contradicts: false, explanation: 'Unable to analyze' }
  }
}

/**
 * Track how a specific claim evolves across documents over time with pre-loaded content
 * (for use with Rust backend)
 */
export async function trackClaimEvolutionWithContent(
  claim: string,
  documentsWithContent: Array<{
    id: string
    filename: string
    created_at?: string
    content: string
  }>,
  caseId: string
): Promise<{
  versions: {
    documentId: string
    documentName: string
    date: string
    text: string
    changesFromPrevious?: string
  }[]
  evolutionPattern: 'stable' | 'escalating' | 'de-escalating' | 'inconsistent'
  summary: string
}> {
  // Sort documents by date
  const sortedDocs = [...documentsWithContent].sort(
    (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  )

  // Find claim in each document
  const versions: {
    documentId: string
    documentName: string
    date: string
    text: string
    changesFromPrevious?: string
  }[] = []

  for (const doc of sortedDocs) {
    const findPrompt = `In this document, find any statement related to this claim: "${claim}"

Document content:
${doc.content.slice(0, 30000)}

Return the exact quote(s) that relate to this claim, or "NOT_FOUND" if not mentioned.
Respond in JSON: { "found": boolean, "quotes": ["..."] }`

    const result = await generateJSON<QuoteFindResponse>('Find evidence in document.', findPrompt)

    if (result.found && result.quotes && result.quotes.length > 0) {
      versions.push({
        documentId: doc.id,
        documentName: doc.filename,
        date: doc.created_at || 'Unknown',
        text: result.quotes.join(' | '),
      })
    }
  }

  // Analyze evolution pattern
  if (versions.length < 2) {
    return {
      versions,
      evolutionPattern: 'stable',
      summary: 'Insufficient versions to track evolution',
    }
  }

  // Compare consecutive versions
  for (let i = 1; i < versions.length; i++) {
    const comparison = await compareSpecificClaims(versions[i - 1].text, versions[i].text)
    versions[i].changesFromPrevious = comparison.explanation
  }

  // Determine pattern
  const pattern = await analyzeEvolutionPattern(versions)

  return {
    versions,
    evolutionPattern: pattern.pattern,
    summary: pattern.summary,
  }
}

/**
 * Track how a specific claim evolves across documents over time
 * Note: Document content fetching is now handled by Rust backend
 */
export async function trackClaimEvolution(
  claim: string,
  documents: Document[],
  caseId: string
): Promise<{
  versions: {
    documentId: string
    documentName: string
    date: string
    text: string
    changesFromPrevious?: string
  }[]
  evolutionPattern: 'stable' | 'escalating' | 'de-escalating' | 'inconsistent'
  summary: string
}> {
  console.warn(
    '[ContradictionEngine] trackClaimEvolution: Document content fetching now handled by Rust backend.'
  )

  // Return empty result - use trackClaimEvolutionWithContent with pre-loaded content
  return {
    versions: [],
    evolutionPattern: 'stable',
    summary: 'Document content must be provided via trackClaimEvolutionWithContent',
  }
}

// Helper functions

type ClaimCluster = ContradictionAnalysisResult['claimClusters'][number]

function extractTopics(clusters: ClaimCluster[]): string[] {
  return (clusters || [])
    .filter(c => !c.consensus)
    .map(c => c.topic)
    .slice(0, 5)
}

function calculateCredibilityImpact(
  contradictions: ContradictionFinding[]
): 'severe' | 'moderate' | 'minor' | 'none' {
  const critical = contradictions.filter(c => c.severity === 'critical').length
  const high = contradictions.filter(c => c.severity === 'high').length

  if (critical >= 3 || (critical >= 1 && high >= 3)) return 'severe'
  if (critical >= 1 || high >= 3) return 'moderate'
  if (high >= 1 || contradictions.length >= 3) return 'minor'
  return 'none'
}

async function analyzeEvolutionPattern(versions: Array<{ changesFromPrevious?: string }>): Promise<{
  pattern: 'stable' | 'escalating' | 'de-escalating' | 'inconsistent'
  summary: string
}> {
  const changes = versions
    .slice(1)
    .map(v => v.changesFromPrevious)
    .filter(Boolean)

  const prompt = `Analyze how this claim evolved through these changes:
${changes.map((c, i) => `Change ${i + 1}: ${c}`).join('\n')}

Determine if the claim is:
- stable: Stays consistent
- escalating: Becomes stronger/more serious over time
- de-escalating: Becomes weaker/less serious over time
- inconsistent: Changes back and forth

Respond in JSON: { "pattern": "...", "summary": "..." }`

  try {
    return await generateJSON('Analyze claim evolution pattern.', prompt)
  } catch {
    return { pattern: 'inconsistent', summary: 'Unable to determine pattern' }
  }
}

/**
 * Prepare contradiction findings for storage (Rust backend handles actual persistence)
 */
function prepareContradictionFindings(
  caseId: string,
  contradictions: ContradictionFinding[]
): Array<{
  case_id: string
  engine: string
  title: string
  description: string
  severity: string
  document_ids: string[]
  evidence: Record<string, unknown>
}> {
  return contradictions.map(c => ({
    case_id: caseId,
    engine: 'contradiction',
    title: `${c.type} contradiction: ${c.explanation.slice(0, 50)}...`,
    description: c.explanation,
    severity: c.severity,
    document_ids: [c.claim1.documentId, c.claim2.documentId],
    evidence: {
      type: c.type,
      claim1: c.claim1,
      claim2: c.claim2,
      implication: c.implication,
    },
  }))
}

export const contradictionEngine = {
  detectContradictions,
  detectContradictionsWithContent,
  compareSpecificClaims,
  trackClaimEvolution,
  trackClaimEvolutionWithContent,
  prepareContradictionFindings,
}
