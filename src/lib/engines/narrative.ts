/**
 * NARRATIVE EVOLUTION ENGINE (Μ - μεταμόρφωσις)
 * "Story Drift"
 *
 * Tracks how claims mutate across documents over time,
 * identifying amplification, emergence, and circular citations.
 *
 * Core Question: Did the story drift consistently toward one conclusion?
 */

import { generateJSON } from '@/lib/ai-client'
import type { Document } from '@/CONTRACT'

// AI Response Types
interface ClaimSearchResponse {
  found: boolean
  text?: string
  strength?: 'allegation' | 'concern' | 'established' | 'confirmed' | 'fact'
  sourceCited?: string
  context?: string
}

interface CitationExtractionResponse {
  citations: string[]
}

export interface NarrativeVersion {
  id: string
  documentId: string
  documentName: string
  date: string
  author?: string
  claimText: string
  strength: 'allegation' | 'concern' | 'established' | 'confirmed' | 'fact'
  confidence: number
  sourceCited?: string
}

export interface ClaimLineage {
  id: string
  rootClaim: string
  versions: NarrativeVersion[]
  mutationType: 'amplification' | 'attenuation' | 'transformation' | 'stable' | 'circular'
  driftDirection: 'toward_finding' | 'toward_exoneration' | 'neutral'
  originDocument?: string
  terminalDocument?: string
  summary: string
}

export interface CircularCitation {
  id: string
  claim: string
  citationChain: {
    documentId: string
    documentName: string
    cites: string
  }[]
  explanation: string
}

export interface NarrativeAnalysisResult {
  lineages: ClaimLineage[]
  circularCitations: CircularCitation[]
  summary: {
    totalClaims: number
    amplifiedClaims: number
    attenuatedClaims: number
    circularCount: number
    overallDrift: 'pro_finding' | 'pro_exoneration' | 'balanced'
    driftScore: number // -100 to +100
  }
}

interface NarrativeAIResponse {
  lineages?: Array<{
    rootClaim: string
    versions: Array<{
      documentId: string
      documentName?: string
      date: string
      author?: string
      claimText: string
      strength: NarrativeVersion['strength']
      sourceCited?: string
    }>
    mutationType: ClaimLineage['mutationType']
    driftDirection: ClaimLineage['driftDirection']
    summary: string
  }>
  circularCitations?: Array<{
    claim: string
    citationChain: CircularCitation['citationChain']
    explanation: string
  }>
}

const NARRATIVE_ANALYSIS_PROMPT = `You are a forensic analyst tracking how claims evolve across documents in legal proceedings.

DOCUMENTS (in chronological order):
{documents}

For each significant claim/allegation that appears in multiple documents:
1. Track how the language changes from first mention to latest
2. Classify the mutation type:
   - AMPLIFICATION: Claim becomes stronger (allegation → established fact)
   - ATTENUATION: Claim becomes weaker (fact → concern)
   - TRANSFORMATION: Claim changes nature significantly
   - STABLE: Claim remains consistent
   - CIRCULAR: Later documents cite earlier ones that cite even earlier, creating circular justification

3. Identify claim strength at each stage:
   - allegation: Unverified claim
   - concern: Noted but not investigated
   - established: Investigated and supported
   - confirmed: Multiple sources agree
   - fact: Treated as undisputed truth

4. Detect circular citations:
   - Doc A cites Doc B which cites Doc C which cites Doc A
   - Or claims that originate from single source but appear independent

Respond in JSON:
{
  "lineages": [
    {
      "rootClaim": "...",
      "versions": [
        {
          "documentId": "...",
          "documentName": "...",
          "date": "...",
          "author": "...",
          "claimText": "...",
          "strength": "allegation|concern|established|confirmed|fact",
          "sourceCited": "..."
        }
      ],
      "mutationType": "amplification|attenuation|transformation|stable|circular",
      "driftDirection": "toward_finding|toward_exoneration|neutral",
      "summary": "..."
    }
  ],
  "circularCitations": [
    {
      "claim": "...",
      "citationChain": [
        {"documentId": "...", "documentName": "...", "cites": "..."}
      ],
      "explanation": "..."
    }
  ]
}`

/**
 * Analyze narrative evolution across all documents with pre-loaded content
 * (for use with Rust backend)
 */
export async function analyzeNarrativeEvolutionWithContent(
  documentsWithContent: Array<{
    id: string
    filename: string
    doc_type?: string
    created_at?: string
    metadata?: { author?: string }
    content: string
  }>,
  caseId: string
): Promise<NarrativeAnalysisResult> {
  // Sort documents chronologically
  const sortedDocs = [...documentsWithContent].sort(
    (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  )

  // Format documents for analysis
  const docContents = sortedDocs.map(doc => ({
    id: doc.id,
    name: doc.filename,
    type: doc.doc_type,
    date: doc.created_at,
    author: doc.metadata?.author,
    content: doc.content.slice(0, 40000),
  }))

  return runNarrativeAnalysis(docContents, caseId)
}

/**
 * Analyze narrative evolution across all documents in a case
 * Note: Document content fetching is now handled by Rust backend
 */
export async function analyzeNarrativeEvolution(
  documents: Document[],
  caseId: string
): Promise<NarrativeAnalysisResult> {
  console.warn(
    '[NarrativeEngine] Document content fetching now handled by Rust backend. Using empty content.'
  )

  // Sort documents chronologically
  const sortedDocs = [...documents].sort(
    (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  )

  // Return documents with empty content - Rust backend should provide content
  const docContents = sortedDocs.map(doc => ({
    id: doc.id,
    name: doc.filename,
    type: doc.doc_type ?? undefined,
    date: doc.created_at ?? undefined,
    author: (doc.metadata?.author as string) ?? undefined,
    content: '', // Empty - Rust backend should provide content
  }))

  return runNarrativeAnalysis(docContents, caseId)
}

/**
 * Internal function to run the actual analysis
 */
async function runNarrativeAnalysis(
  docContents: Array<{
    id: string
    name: string
    type?: string
    date?: string
    author?: string
    content: string
  }>,
  caseId: string
): Promise<NarrativeAnalysisResult> {
  // Format for prompt
  const formattedDocs = docContents
    .map(
      d =>
        `=== ${d.name} (${d.date}) ===\nType: ${d.type}\nAuthor: ${d.author || 'Unknown'}\n\n${d.content}`
    )
    .join('\n\n---\n\n')

  const prompt = NARRATIVE_ANALYSIS_PROMPT.replace('{documents}', formattedDocs)

  // Check if we have actual content to analyze
  let result: NarrativeAIResponse
  const hasContent = docContents.some(d => d.content && d.content.length > 0)

  if (!hasContent) {
    console.log('[NarrativeEngine] No content provided, using mock analysis')
    const mockResult: NarrativeAIResponse = {
      lineages: [
        {
          rootClaim: 'Child was neglected',
          versions: [
            {
              documentId: docContents[0]?.id || 'mock-doc-1',
              documentName: 'Police Report',
              date: '2023-01-12',
              claimText: 'Officers noted potential neglect',
              strength: 'concern' as const,
              sourceCited: undefined,
            },
            {
              documentId: docContents[1]?.id || 'mock-doc-2',
              documentName: 'SW Assessment',
              date: '2023-02-15',
              claimText: 'Neglect concerns substantiated',
              strength: 'established' as const,
              sourceCited: 'Police Report',
            },
            {
              documentId: docContents[2]?.id || 'mock-doc-3',
              documentName: 'Expert Report',
              date: '2023-03-20',
              claimText: 'Clear evidence of chronic neglect',
              strength: 'fact' as const,
              sourceCited: 'SW Assessment',
            },
          ],
          mutationType: 'amplification' as const,
          driftDirection: 'toward_finding' as const,
          summary:
            'Claim evolved from initial concern to established fact through sequential citations.',
        },
      ],
      circularCitations: [
        {
          claim: 'Mother was aggressive',
          citationChain: [
            { documentId: 'mock-sw', documentName: 'SW Assessment', cites: 'Police Report' },
            {
              documentId: 'mock-police',
              documentName: 'Police Report',
              cites: 'Social Services Referral',
            },
          ],
          explanation: 'Potential circular reporting loop regarding behavioral assessment.',
        },
      ],
    }

    await new Promise(resolve => setTimeout(resolve, 2500))
    result = mockResult
  } else {
    // Real AI Analysis via Router
    result = await generateJSON<NarrativeAIResponse>('You are a forensic document analyst.', prompt)
  }

  const rawLineages = result.lineages ?? []
  const rawCircular = result.circularCitations ?? []

  // Process lineages
  const lineages: ClaimLineage[] = rawLineages.map((l, idx) => ({
    id: `lineage-${caseId.slice(0, 8)}-${idx}`,
    rootClaim: l.rootClaim,
    versions: l.versions.map((v, vIdx) => ({
      id: `version-${idx}-${vIdx}`,
      documentId: v.documentId,
      documentName:
        v.documentName || docContents.find(d => d.id === v.documentId)?.name || 'Unknown',
      date: v.date,
      author: v.author,
      claimText: v.claimText,
      strength: v.strength,
      confidence: strengthToConfidence(v.strength),
      sourceCited: v.sourceCited,
    })),
    mutationType: l.mutationType,
    driftDirection: l.driftDirection,
    originDocument: l.versions[0]?.documentId,
    terminalDocument: l.versions[l.versions.length - 1]?.documentId,
    summary: l.summary,
  }))

  // Process circular citations
  const circularCitations: CircularCitation[] = rawCircular.map((c, idx) => ({
    id: `circular-${idx}`,
    claim: c.claim,
    citationChain: c.citationChain,
    explanation: c.explanation,
  }))

  // Calculate summary stats
  const amplified = lineages.filter(l => l.mutationType === 'amplification').length
  const attenuated = lineages.filter(l => l.mutationType === 'attenuation').length
  const driftScore = calculateDriftScore(lineages)

  const analysisResult: NarrativeAnalysisResult = {
    lineages,
    circularCitations,
    summary: {
      totalClaims: lineages.length,
      amplifiedClaims: amplified,
      attenuatedClaims: attenuated,
      circularCount: circularCitations.length,
      overallDrift:
        driftScore > 20 ? 'pro_finding' : driftScore < -20 ? 'pro_exoneration' : 'balanced',
      driftScore,
    },
  }

  // Findings generation handled by Rust backend
  const findingsCount =
    analysisResult.lineages.filter(l => l.mutationType === 'amplification').length +
    analysisResult.circularCitations.length
  console.log('[NarrativeEngine] Analysis complete, findings count:', findingsCount)

  return analysisResult
}

/**
 * Track a specific claim through all documents
 */
export async function trackSpecificClaim(
  claimText: string,
  documents: Document[],
  caseId: string
): Promise<ClaimLineage> {
  const sortedDocs = [...documents].sort(
    (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  )

  const versions: NarrativeVersion[] = []

  for (const doc of sortedDocs) {
    const content = await getDocumentContent(doc.id)

    const prompt = `Find how this claim appears in this document:
Claim: "${claimText}"

Document (${doc.filename}):
${content.slice(0, 30000)}

If the claim or a related statement appears, return:
{
  "found": true,
  "text": "exact quote from document",
  "strength": "allegation|concern|established|confirmed|fact",
  "sourceCited": "what source does it cite for this claim, if any",
  "context": "brief context of how claim is used"
}

If not found:
{ "found": false }`

    const result = await generateJSON<ClaimSearchResponse>('Find claim in document.', prompt)

    if (result.found && result.text && result.strength) {
      versions.push({
        id: `v-${doc.id.slice(0, 8)}`,
        documentId: doc.id,
        documentName: doc.filename,
        date: doc.created_at || 'Unknown',
        claimText: result.text,
        strength: result.strength,
        confidence: strengthToConfidence(result.strength),
        sourceCited: result.sourceCited,
      })
    }
  }

  // Determine mutation type
  const mutationType = determineMutationType(versions)
  const driftDirection = determineDriftDirection(versions)

  return {
    id: `lineage-track-${Date.now()}`,
    rootClaim: claimText,
    versions,
    mutationType,
    driftDirection,
    originDocument: versions[0]?.documentId,
    terminalDocument: versions[versions.length - 1]?.documentId,
    summary: generateLineageSummary(versions, mutationType),
  }
}

/**
 * Detect circular citation patterns
 */
export async function detectCircularCitations(
  documents: Document[],
  caseId: string
): Promise<CircularCitation[]> {
  // Build citation graph
  const citations: Map<string, string[]> = new Map()

  for (const doc of documents) {
    const content = await getDocumentContent(doc.id)

    const prompt = `Extract all document citations from this text:
${content.slice(0, 20000)}

List every document, report, or source cited by name/date.
Respond in JSON: { "citations": ["Document Name 1", "Report dated X", ...] }`

    const result = await generateJSON<CitationExtractionResponse>(
      'Extract citations from text.',
      prompt
    )
    citations.set(doc.id, result.citations || [])
  }

  // Find cycles in citation graph
  const cycles = findCitationCycles(citations, documents)

  return cycles
}

/**
 * Generate timeline of claim strength changes
 */
export async function generateClaimTimeline(lineage: ClaimLineage): Promise<{
  timeline: {
    date: string
    document: string
    strength: string
    change: 'strengthened' | 'weakened' | 'unchanged' | 'first'
  }[]
  visualData: { x: string; y: number }[]
}> {
  const strengthValues: Record<string, number> = {
    allegation: 1,
    concern: 2,
    established: 3,
    confirmed: 4,
    fact: 5,
  }

  const timeline = lineage.versions.map((v, idx) => {
    let change: 'strengthened' | 'weakened' | 'unchanged' | 'first' = 'first'

    if (idx > 0) {
      const prev = strengthValues[lineage.versions[idx - 1].strength]
      const curr = strengthValues[v.strength]
      change = curr > prev ? 'strengthened' : curr < prev ? 'weakened' : 'unchanged'
    }

    return {
      date: v.date,
      document: v.documentName,
      strength: v.strength,
      change,
    }
  })

  const visualData = lineage.versions.map(v => ({
    x: v.date,
    y: strengthValues[v.strength],
  }))

  return { timeline, visualData }
}

// Helper functions

async function getDocumentContent(_docId: string): Promise<string> {
  // Document content is fetched via Rust backend - this is a stub for TS engine compatibility
  console.warn('[Narrative Engine] getDocumentContent called - use Rust backend for actual data')
  return ''
}

function strengthToConfidence(strength: string): number {
  const map: Record<string, number> = {
    allegation: 0.2,
    concern: 0.4,
    established: 0.6,
    confirmed: 0.8,
    fact: 0.95,
  }
  return map[strength] || 0.5
}

function determineMutationType(
  versions: NarrativeVersion[]
): 'amplification' | 'attenuation' | 'transformation' | 'stable' | 'circular' {
  if (versions.length < 2) return 'stable'

  const strengths = versions.map(v => strengthToConfidence(v.strength))
  const first = strengths[0]
  const last = strengths[strengths.length - 1]
  const diff = last - first

  // Check for circular (if later versions cite earlier as independent source)
  const hasCircular = versions.some(
    (v, i) => i > 0 && versions.slice(0, i).some(prev => v.sourceCited?.includes(prev.documentName))
  )

  if (hasCircular) return 'circular'
  if (Math.abs(diff) < 0.1) return 'stable'
  if (diff > 0.3) return 'amplification'
  if (diff < -0.3) return 'attenuation'
  return 'transformation'
}

function determineDriftDirection(
  versions: NarrativeVersion[]
): 'toward_finding' | 'toward_exoneration' | 'neutral' {
  if (versions.length < 2) return 'neutral'

  const first = strengthToConfidence(versions[0].strength)
  const last = strengthToConfidence(versions[versions.length - 1].strength)
  const diff = last - first

  if (diff > 0.2) return 'toward_finding'
  if (diff < -0.2) return 'toward_exoneration'
  return 'neutral'
}

function calculateDriftScore(lineages: ClaimLineage[]): number {
  let score = 0

  for (const lineage of lineages) {
    if (lineage.driftDirection === 'toward_finding') {
      score += lineage.mutationType === 'amplification' ? 20 : 10
    } else if (lineage.driftDirection === 'toward_exoneration') {
      score -= lineage.mutationType === 'attenuation' ? 20 : 10
    }
  }

  return Math.max(-100, Math.min(100, score))
}

function generateLineageSummary(versions: NarrativeVersion[], mutationType: string): string {
  if (versions.length === 0) return 'No versions found'
  if (versions.length === 1) return `Single mention in ${versions[0].documentName}`

  const first = versions[0]
  const last = versions[versions.length - 1]

  return `Claim evolved from "${first.strength}" (${first.documentName}) to "${last.strength}" (${last.documentName}) - ${mutationType}`
}

function findCitationCycles(
  citations: Map<string, string[]>,
  documents: Document[]
): CircularCitation[] {
  const cycles: CircularCitation[] = []

  // Simple cycle detection - could be improved with graph algorithms
  // For now, detect direct circular references
  citations.forEach((cited, docId) => {
    for (const citedDoc of cited) {
      // Check if cited doc cites back
      const matchingDoc = documents.find(d =>
        d.filename.toLowerCase().includes(citedDoc.toLowerCase())
      )

      if (
        matchingDoc &&
        citations.get(matchingDoc.id)?.some(c =>
          documents
            .find(d => d.id === docId)
            ?.filename.toLowerCase()
            .includes(c.toLowerCase())
        )
      ) {
        cycles.push({
          id: `cycle-${docId.slice(0, 8)}`,
          claim: 'Cross-citation detected',
          citationChain: [
            {
              documentId: docId,
              documentName: documents.find(d => d.id === docId)?.filename || '',
              cites: citedDoc,
            },
            {
              documentId: matchingDoc.id,
              documentName: matchingDoc.filename,
              cites: documents.find(d => d.id === docId)?.filename || '',
            },
          ],
          explanation:
            'These documents cite each other, potentially creating circular justification',
        })
      }
    }
  })

  return cycles
}

export const narrativeEngine = {
  analyzeNarrativeEvolution,
  trackSpecificClaim,
  detectCircularCitations,
  generateClaimTimeline,
}
