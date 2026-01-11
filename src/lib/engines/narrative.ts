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
import { supabaseAdmin } from '@/lib/supabase/server'
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
 * Analyze narrative evolution across all documents in a case
 */
export async function analyzeNarrativeEvolution(
  documents: Document[],
  caseId: string
): Promise<NarrativeAnalysisResult> {
  // Sort documents chronologically
  const sortedDocs = [...documents].sort(
    (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  )

  // Get content from all documents
  const docContents = await Promise.all(
    sortedDocs.map(async doc => {
      const content = await getDocumentContent(doc.id)
      return {
        id: doc.id,
        name: doc.filename,
        type: doc.doc_type,
        date: doc.created_at,
        author: doc.metadata?.author,
        content: content.slice(0, 40000),
      }
    })
  )

  // Format for prompt
  const formattedDocs = docContents
    .map(
      d =>
        `=== ${d.name} (${d.date}) ===\nType: ${d.type}\nAuthor: ${d.author || 'Unknown'}\n\n${d.content}`
    )
    .join('\n\n---\n\n')

  const prompt = NARRATIVE_ANALYSIS_PROMPT.replace('{documents}', formattedDocs)

  // Mock Mode Check
  let result: any

  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
    console.log('[MOCK ENGINE] Using Mock Narrative Results')
    const mockResult = {
      lineages: [
        {
          rootClaim: 'Child was neglected',
          versions: [
            {
              documentId: documents[0]?.id || 'mock-doc-1',
              documentName: 'Police Report',
              date: '2023-01-12',
              claimText: 'Officers noted potential neglect',
              strength: 'concern',
              sourceCited: null,
            },
            {
              documentId: documents[1]?.id || 'mock-doc-2',
              documentName: 'SW Assessment',
              date: '2023-02-15',
              claimText: 'Neglect concerns substantiated',
              strength: 'established',
              sourceCited: 'Police Report',
            },
            {
              documentId: documents[2]?.id || 'mock-doc-3',
              documentName: 'Expert Report',
              date: '2023-03-20',
              claimText: 'Clear evidence of chronic neglect',
              strength: 'fact',
              sourceCited: 'SW Assessment',
            },
          ],
          mutationType: 'amplification',
          driftDirection: 'toward_finding',
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
    result = await generateJSON('You are a forensic document analyst.', prompt)
  }

  const rawLineages = Array.isArray((result as any).lineages) ? (result as any).lineages : []
  const rawCircular = Array.isArray((result as any).circularCitations)
    ? (result as any).circularCitations
    : []

  // Process lineages
  const lineages: ClaimLineage[] = rawLineages.map((l: any, idx: number) => ({
    id: `lineage-${caseId.slice(0, 8)}-${idx}`,
    rootClaim: l.rootClaim,
    versions: l.versions.map((v: any, vIdx: number) => ({
      id: `version-${idx}-${vIdx}`,
      documentId: v.documentId,
      documentName: v.documentName || docContents.find(d => d.id === v.documentId)?.name,
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
  const circularCitations: CircularCitation[] = rawCircular.map(
    (c: any, idx: number) => ({
      id: `circular-${idx}`,
      claim: c.claim,
      citationChain: c.citationChain,
      explanation: c.explanation,
    })
  )

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

  // Store findings
  await storeNarrativeFindings(caseId, analysisResult)

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

async function getDocumentContent(docId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('document_chunks')
    .select('content, chunk_index')
    .eq('document_id', docId)
    .order('chunk_index')

  return (data || []).map((c: any) => c.content).join('\n\n')
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

async function storeNarrativeFindings(caseId: string, result: NarrativeAnalysisResult) {
  const findings = []

  // Store amplified claims as findings
  for (const lineage of result.lineages.filter(l => l.mutationType === 'amplification')) {
    findings.push({
      case_id: caseId,
      engine: 'narrative',
      title: `Narrative Amplification: ${lineage.rootClaim.slice(0, 50)}...`,
      description: lineage.summary,
      severity: lineage.driftDirection === 'toward_finding' ? 'high' : 'medium',
      document_ids: lineage.versions.map(v => v.documentId),
      evidence: {
        mutationType: lineage.mutationType,
        versions: lineage.versions.length,
        driftDirection: lineage.driftDirection,
      },
    })
  }

  // Store circular citations
  for (const circular of result.circularCitations) {
    findings.push({
      case_id: caseId,
      engine: 'narrative',
      title: 'Circular Citation Detected',
      description: circular.explanation,
      severity: 'critical',
      document_ids: circular.citationChain.map(c => c.documentId),
      evidence: {
        claim: circular.claim,
        chain: circular.citationChain,
      },
    })
  }

  const hasNarrativeSignals = result.lineages.length > 0 || result.circularCitations.length > 0
  if (!hasNarrativeSignals) {
    return
  }

  const findingsTable = supabaseAdmin.from('findings')
  if (findings.length > 0) {
    await findingsTable.insert(findings)
  }
}

export const narrativeEngine = {
  analyzeNarrativeEvolution,
  trackSpecificClaim,
  detectCircularCitations,
  generateClaimTimeline,
}
