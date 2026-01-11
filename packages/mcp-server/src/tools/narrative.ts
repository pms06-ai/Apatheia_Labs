/**
 * Narrative Evolution Tool
 *
 * Track how claims mutate and evolve across documents over time
 */

import { getDocumentsByIds, getDocumentContent, storeFindings } from '../db/connection.js'
import { v4 as uuidv4 } from 'uuid'

export interface ClaimVersion {
  documentId: string
  documentName: string
  date: string
  text: string
  certainty: 'definite' | 'probable' | 'possible' | 'uncertain'
}

export interface ClaimEvolution {
  id: string
  originalClaim: string
  versions: ClaimVersion[]
  mutationType: 'amplification' | 'attenuation' | 'drift' | 'stable'
  significance: string
}

export interface NarrativeAnalysisResult {
  evolutions: ClaimEvolution[]
  storyFraming: {
    dominant: string
    alternatives: string[]
  }
  summary: {
    trackedClaims: number
    significantMutations: number
    dominantPattern: string
  }
}

/**
 * Analyze narrative evolution across documents
 */
export async function analyzeNarrative(
  documentIds?: string[],
  caseId?: string,
  content?: string
): Promise<NarrativeAnalysisResult> {
  const startTime = Date.now()

  // For direct content, we can only analyze within the document itself
  if (content) {
    const keyClaims = extractKeyClaims(content)
    const storyFraming = analyzeStoryFraming([{ id: 'inline-content', content }])

    return {
      evolutions: [],
      storyFraming,
      summary: { trackedClaims: keyClaims.length, significantMutations: 0, dominantPattern: 'single_document' },
    }
  }

  if (!documentIds || documentIds.length === 0) {
    return {
      evolutions: [],
      storyFraming: { dominant: '', alternatives: [] },
      summary: { trackedClaims: 0, significantMutations: 0, dominantPattern: 'none' },
    }
  }

  const docs = getDocumentsByIds(documentIds)
  if (docs.length === 0) {
    return {
      evolutions: [],
      storyFraming: { dominant: '', alternatives: [] },
      summary: { trackedClaims: 0, significantMutations: 0, dominantPattern: 'none' },
    }
  }

  // Sort by date
  const sortedDocs = docs.sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  // Extract claims from first document
  const firstContent = getDocumentContent(sortedDocs[0].id)
  const keyClaims = extractKeyClaims(firstContent)

  // Track evolution of each claim
  const evolutions: ClaimEvolution[] = []

  for (const claim of keyClaims.slice(0, 10)) {
    const versions: ClaimVersion[] = [{
      documentId: sortedDocs[0].id,
      documentName: sortedDocs[0].filename,
      date: sortedDocs[0].created_at,
      text: claim,
      certainty: assessCertainty(claim),
    }]

    // Find claim in subsequent documents
    for (let i = 1; i < sortedDocs.length; i++) {
      const content = getDocumentContent(sortedDocs[i].id)
      const relatedText = findRelatedClaim(claim, content)

      if (relatedText) {
        versions.push({
          documentId: sortedDocs[i].id,
          documentName: sortedDocs[i].filename,
          date: sortedDocs[i].created_at,
          text: relatedText,
          certainty: assessCertainty(relatedText),
        })
      }
    }

    if (versions.length > 1) {
      const mutationType = detectMutationType(versions)

      evolutions.push({
        id: uuidv4(),
        originalClaim: claim,
        versions,
        mutationType,
        significance: describeMutationSignificance(mutationType, versions),
      })
    }
  }

  // Analyze story framing
  const storyFraming = analyzeStoryFraming(docs.map(d => ({
    id: d.id,
    content: getDocumentContent(d.id),
  })))

  // Calculate patterns
  const mutationCounts = {
    amplification: evolutions.filter(e => e.mutationType === 'amplification').length,
    attenuation: evolutions.filter(e => e.mutationType === 'attenuation').length,
    drift: evolutions.filter(e => e.mutationType === 'drift').length,
    stable: evolutions.filter(e => e.mutationType === 'stable').length,
  }

  const dominantPattern = Object.entries(mutationCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none'

  const result: NarrativeAnalysisResult = {
    evolutions,
    storyFraming,
    summary: {
      trackedClaims: evolutions.length,
      significantMutations: evolutions.filter(e => e.mutationType !== 'stable').length,
      dominantPattern,
    },
  }

  // Store findings
  if (caseId) {
    const significantEvolutions = evolutions.filter(e => e.mutationType === 'amplification')
    if (significantEvolutions.length > 0) {
      const findings = significantEvolutions.map(e => ({
        id: e.id,
        case_id: caseId,
        engine: 'narrative',
        finding_type: 'claim_mutation',
        title: `Claim ${e.mutationType}: ${e.originalClaim.slice(0, 50)}`,
        description: e.significance,
        severity: e.mutationType === 'amplification' ? 'high' as const : 'medium' as const,
        confidence: 0.7,
        document_ids: JSON.stringify(e.versions.map(v => v.documentId)),
        evidence: JSON.stringify({ versions: e.versions.map(v => v.text) }),
      }))
      storeFindings(findings)
    }
  }

  console.error(`[narrative] Analysis complete in ${Date.now() - startTime}ms. Tracked ${evolutions.length} claims.`)

  return result
}

/**
 * Extract key claims from content
 */
function extractKeyClaims(content: string): string[] {
  const claims: string[] = []
  const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 30)

  // Look for claim-like statements
  const claimPatterns = [
    /(?:alleged|claimed|stated|reported|said|confirmed)\s+(?:that\s+)?(.{20,100})/gi,
    /(?:investigation|inquiry|report)\s+(?:found|revealed|showed)\s+(?:that\s+)?(.{20,100})/gi,
    /(?:evidence|documentation|records)\s+(?:shows?|indicates?|suggests?)\s+(?:that\s+)?(.{20,100})/gi,
  ]

  for (const sentence of sentences.slice(0, 100)) {
    for (const pattern of claimPatterns) {
      const match = pattern.exec(sentence)
      if (match) {
        claims.push(sentence.slice(0, 200))
        break
      }
    }
  }

  return claims.slice(0, 20)
}

/**
 * Assess certainty level of a claim
 */
function assessCertainty(text: string): ClaimVersion['certainty'] {
  const lower = text.toLowerCase()

  if (/certainly|definitely|clearly|undoubtedly|confirmed/i.test(lower)) {
    return 'definite'
  }
  if (/likely|probably|appears|seems|suggests/i.test(lower)) {
    return 'probable'
  }
  if (/possibly|may|might|could|potential/i.test(lower)) {
    return 'possible'
  }
  if (/allegedly|reportedly|claimed|uncertain/i.test(lower)) {
    return 'uncertain'
  }

  return 'probable'
}

/**
 * Find related claim in content
 */
function findRelatedClaim(originalClaim: string, content: string): string | null {
  const keyWords = originalClaim.toLowerCase().split(/\s+/)
    .filter(w => w.length > 5)
    .slice(0, 5)

  const sentences = content.split(/[.!?]+/).map(s => s.trim())

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase()
    const matches = keyWords.filter(word => lower.includes(word))

    if (matches.length >= 3) {
      return sentence.slice(0, 200)
    }
  }

  return null
}

/**
 * Detect type of mutation between versions
 */
function detectMutationType(versions: ClaimVersion[]): ClaimEvolution['mutationType'] {
  if (versions.length < 2) return 'stable'

  const certaintyLevels: Record<ClaimVersion['certainty'], number> = {
    uncertain: 1,
    possible: 2,
    probable: 3,
    definite: 4,
  }

  const firstCertainty = certaintyLevels[versions[0].certainty]
  const lastCertainty = certaintyLevels[versions[versions.length - 1].certainty]

  if (lastCertainty > firstCertainty + 1) return 'amplification'
  if (lastCertainty < firstCertainty - 1) return 'attenuation'

  // Check for content drift
  const firstWords = new Set(versions[0].text.toLowerCase().split(/\s+/))
  const lastWords = new Set(versions[versions.length - 1].text.toLowerCase().split(/\s+/))
  const overlap = [...firstWords].filter(w => lastWords.has(w) && w.length > 4)

  if (overlap.length < 5) return 'drift'

  return 'stable'
}

/**
 * Describe significance of mutation
 */
function describeMutationSignificance(type: ClaimEvolution['mutationType'], versions: ClaimVersion[]): string {
  switch (type) {
    case 'amplification':
      return `Claim certainty increased from "${versions[0].certainty}" to "${versions[versions.length - 1].certainty}" across ${versions.length} documents`
    case 'attenuation':
      return `Claim certainty decreased from "${versions[0].certainty}" to "${versions[versions.length - 1].certainty}" across ${versions.length} documents`
    case 'drift':
      return `Claim content changed significantly while maintaining similar language`
    case 'stable':
      return `Claim remained consistent across ${versions.length} documents`
  }
}

/**
 * Analyze overall story framing
 */
function analyzeStoryFraming(docs: { id: string; content: string }[]): { dominant: string; alternatives: string[] } {
  const framingPatterns: [string, RegExp][] = [
    ['Investigation narrative', /investigation|inquiry|police|detectives/gi],
    ['Family conflict', /family|custody|contact|child/gi],
    ['Professional misconduct', /professional|standards|conduct|duty/gi],
    ['Institutional failure', /failure|breach|neglect|maladministration/gi],
    ['Media coverage', /broadcast|documentary|programme|reporter/gi],
  ]

  const counts: Map<string, number> = new Map()

  for (const doc of docs) {
    for (const [frame, pattern] of framingPatterns) {
      const matches = doc.content.match(pattern) || []
      counts.set(frame, (counts.get(frame) || 0) + matches.length)
    }
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])

  return {
    dominant: sorted[0]?.[0] || 'Unknown',
    alternatives: sorted.slice(1, 4).map(([frame]) => frame),
  }
}
