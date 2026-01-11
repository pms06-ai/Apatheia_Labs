/**
 * S.A.M. Pipeline Tool
 *
 * Full Systematic Adversarial Methodology:
 * ANCHOR → INHERIT → COMPOUND → ARRIVE
 */

import { getDocumentsByIds, getDocumentContent, storeFindings, getDatabase } from '../db/connection.js'
import type {
  SAMPhase,
  SAMPipelineResult,
  ClaimOrigin,
  ClaimPropagation,
  AuthorityMarker,
  SAMOutcome,
} from '../types/index.js'
import { v4 as uuidv4 } from 'uuid'

/**
 * Run full S.A.M. pipeline
 */
export async function runSAMPipeline(
  documentIds: string[],
  caseId: string,
  startPhase?: SAMPhase
): Promise<SAMPipelineResult> {
  const startTime = Date.now()
  console.error(`[SAM] Starting pipeline for case ${caseId} with ${documentIds.length} documents`)

  const docs = getDocumentsByIds(documentIds)
  if (docs.length === 0) {
    throw new Error('No documents found')
  }

  // Get content for all documents
  const docsWithContent = docs.map(d => ({
    id: d.id,
    name: d.filename,
    date: d.created_at,
    type: d.doc_type,
    content: getDocumentContent(d.id),
  }))

  // Phase 1: ANCHOR - Find claim origins
  console.error('[SAM] Phase 1: ANCHOR - Finding claim origins')
  const anchorResult = await runAnchorPhase(docsWithContent, caseId)

  // Phase 2: INHERIT - Track propagation
  console.error('[SAM] Phase 2: INHERIT - Tracking propagation')
  const inheritResult = await runInheritPhase(docsWithContent, anchorResult.claimOrigins, caseId)

  // Phase 3: COMPOUND - Map authority accumulation
  console.error('[SAM] Phase 3: COMPOUND - Mapping authority')
  const compoundResult = await runCompoundPhase(docsWithContent, anchorResult.claimOrigins, caseId)

  // Phase 4: ARRIVE - Link to outcomes
  console.error('[SAM] Phase 4: ARRIVE - Linking outcomes')
  const arriveResult = await runArrivePhase(docsWithContent, anchorResult.claimOrigins, caseId)

  const result: SAMPipelineResult = {
    phases: {
      anchor: anchorResult,
      inherit: inheritResult,
      compound: compoundResult,
      arrive: arriveResult,
    },
    summary: {
      totalClaims: anchorResult.claimOrigins.length,
      falsePremises: anchorResult.falsePremiseCount,
      propagationChains: inheritResult.chainsFound,
      authorityLaundering: compoundResult.authorityMarkers.filter(m => m.isLaundering).length,
      harmfulOutcomes: arriveResult.outcomes.filter(o => o.harmLevel === 'catastrophic' || o.harmLevel === 'severe').length,
    },
  }

  // Store summary finding
  storeFindings([{
    id: uuidv4(),
    case_id: caseId,
    engine: 'sam_pipeline',
    finding_type: 'pipeline_complete',
    title: `S.A.M. Analysis: ${result.summary.falsePremises} false premises, ${result.summary.harmfulOutcomes} harmful outcomes`,
    description: `Traced ${result.summary.totalClaims} claims through ${result.summary.propagationChains} chains`,
    severity: result.summary.harmfulOutcomes > 0 ? 'critical' : result.summary.falsePremises > 0 ? 'high' : 'medium',
    confidence: 0.75,
    document_ids: JSON.stringify(documentIds),
    evidence: JSON.stringify(result.summary),
  }])

  console.error(`[SAM] Pipeline complete in ${Date.now() - startTime}ms`)

  return result
}

/**
 * ANCHOR Phase: Identify claim origins
 */
async function runAnchorPhase(
  docs: { id: string; name: string; date: string; content: string }[],
  caseId: string
): Promise<{ claimOrigins: ClaimOrigin[]; falsePremiseCount: number }> {
  const origins: ClaimOrigin[] = []

  // Sort by date to find earliest occurrences
  const sorted = [...docs].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Extract claims and their origins
  for (const doc of sorted) {
    const claims = extractClaimsWithOrigin(doc.content, doc.id)
    origins.push(...claims)
  }

  // Identify false premises
  for (const origin of origins) {
    origin.isFalsePremise = await checkFalsePremise(origin)
    origin.confidence = calculateOriginConfidence(origin)
  }

  const falsePremiseCount = origins.filter(o => o.isFalsePremise).length

  return { claimOrigins: origins.slice(0, 50), falsePremiseCount }
}

/**
 * INHERIT Phase: Track claim propagation
 */
async function runInheritPhase(
  docs: { id: string; name: string; date: string; content: string }[],
  origins: ClaimOrigin[],
  caseId: string
): Promise<{ propagations: ClaimPropagation[]; chainsFound: number }> {
  const propagations: ClaimPropagation[] = []

  // Sort by date
  const sorted = [...docs].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Track each claim through documents
  for (const origin of origins.slice(0, 20)) {
    for (let i = 0; i < sorted.length - 1; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const propagation = detectPropagation(origin, sorted[i], sorted[j])
        if (propagation) {
          propagations.push(propagation)
        }
      }
    }
  }

  // Count unique chains
  const chains = new Set(propagations.map(p => p.claimId))

  return { propagations, chainsFound: chains.size }
}

/**
 * COMPOUND Phase: Map authority accumulation
 */
async function runCompoundPhase(
  docs: { id: string; name: string; date: string; content: string }[],
  origins: ClaimOrigin[],
  caseId: string
): Promise<{ authorityMarkers: AuthorityMarker[]; launderingDetected: boolean }> {
  const markers: AuthorityMarker[] = []

  for (const doc of docs) {
    for (const origin of origins.slice(0, 20)) {
      const marker = detectAuthorityMarker(origin, doc)
      if (marker) {
        markers.push(marker)
      }
    }
  }

  // Detect authority laundering (claim gains authority through repetition)
  for (const marker of markers) {
    const claimMarkers = markers.filter(m => m.claimId === marker.claimId)
    if (claimMarkers.length >= 3) {
      // Multiple authority sources citing same claim = potential laundering
      marker.isLaundering = true
    }
  }

  const launderingDetected = markers.some(m => m.isLaundering)

  return { authorityMarkers: markers, launderingDetected }
}

/**
 * ARRIVE Phase: Link to outcomes
 */
async function runArrivePhase(
  docs: { id: string; name: string; date: string; content: string }[],
  origins: ClaimOrigin[],
  caseId: string
): Promise<{ outcomes: SAMOutcome[]; catastrophicCount: number }> {
  const outcomes: SAMOutcome[] = []

  // Look for outcome indicators in documents
  for (const doc of docs) {
    const docOutcomes = detectOutcomes(doc.content, origins)
    outcomes.push(...docOutcomes)
  }

  const catastrophicCount = outcomes.filter(o => o.harmLevel === 'catastrophic').length

  return { outcomes, catastrophicCount }
}

// Helper functions

function extractClaimsWithOrigin(content: string, documentId: string): ClaimOrigin[] {
  const claims: ClaimOrigin[] = []
  const sentences = content.split(/[.!?]+/).map(s => s.trim())

  for (const sentence of sentences) {
    if (sentence.length < 30) continue

    // Detect origin type
    let originType: ClaimOrigin['originType'] = 'hearsay'

    if (/(?:police|officer|detective)\s+(?:confirmed|stated|reported)/i.test(sentence)) {
      originType = 'professional_opinion'
    } else if (/(?:court|judge|tribunal)\s+(?:found|determined|ordered)/i.test(sentence)) {
      originType = 'primary_source'
    } else if (/(?:allegedly|reportedly|claimed|said to)/i.test(sentence)) {
      originType = 'speculation'
    } else if (/(?:it is understood|sources say|believed to)/i.test(sentence)) {
      originType = 'hearsay'
    }

    // Extract factual claims
    if (/(?:stated|claimed|alleged|reported|found|determined)/i.test(sentence)) {
      claims.push({
        claimId: uuidv4(),
        claimText: sentence.slice(0, 300),
        originType,
        originDocumentId: documentId,
        isFalsePremise: false,
        confidence: 0.5,
      })
    }
  }

  return claims.slice(0, 30)
}

async function checkFalsePremise(origin: ClaimOrigin): Promise<boolean> {
  // Heuristic check for false premise indicators
  const lower = origin.claimText.toLowerCase()

  // Check for contradicted or disproven indicators
  if (/no evidence|disproven|contradicted|refuted|cleared/i.test(lower)) {
    return true
  }

  // Check for speculation presented as fact
  if (origin.originType === 'speculation' && /definitely|certainly|clearly|undoubtedly/i.test(lower)) {
    return true
  }

  return false
}

function calculateOriginConfidence(origin: ClaimOrigin): number {
  const typeConfidence: Record<ClaimOrigin['originType'], number> = {
    primary_source: 0.9,
    professional_opinion: 0.7,
    hearsay: 0.4,
    speculation: 0.3,
    misattribution: 0.2,
    fabrication: 0.1,
  }

  return typeConfidence[origin.originType] || 0.5
}

function detectPropagation(
  origin: ClaimOrigin,
  fromDoc: { id: string; content: string },
  toDoc: { id: string; content: string }
): ClaimPropagation | null {
  const claimWords = origin.claimText.toLowerCase().split(/\s+/).filter(w => w.length > 5)
  const toContent = toDoc.content.toLowerCase()

  const matches = claimWords.filter(w => toContent.includes(w))

  if (matches.length >= claimWords.length * 0.5) {
    // Detect mutation type
    let mutation: ClaimPropagation['mutation'] = 'none'

    // Check for amplification
    if (/definitely|certainly|clearly|confirmed/i.test(toDoc.content) &&
      !/definitely|certainly|clearly|confirmed/i.test(fromDoc.content)) {
      mutation = 'amplification'
    }

    // Check for certainty drift
    if (/alleged|reportedly/i.test(fromDoc.content) &&
      !/alleged|reportedly/i.test(toDoc.content)) {
      mutation = 'certainty_drift'
    }

    return {
      claimId: origin.claimId,
      fromDocumentId: fromDoc.id,
      toDocumentId: toDoc.id,
      mutation,
      verificationGap: !toDoc.content.toLowerCase().includes('verified') &&
        !toDoc.content.toLowerCase().includes('confirmed'),
    }
  }

  return null
}

function detectAuthorityMarker(
  origin: ClaimOrigin,
  doc: { id: string; content: string }
): AuthorityMarker | null {
  const claimWords = origin.claimText.toLowerCase().split(/\s+/).filter(w => w.length > 5)
  const content = doc.content.toLowerCase()

  const matches = claimWords.filter(w => content.includes(w))

  if (matches.length >= claimWords.length * 0.4) {
    // Detect authority type
    let authorityType: AuthorityMarker['authorityType'] = 'professional_assessment'

    if (/court|judge|tribunal/i.test(content)) {
      authorityType = 'court_finding'
    } else if (/expert|specialist/i.test(content)) {
      authorityType = 'expert_opinion'
    } else if (/police|detective|officer/i.test(content)) {
      authorityType = 'police_conclusion'
    } else if (/official|government|department/i.test(content)) {
      authorityType = 'official_report'
    }

    const authorityWeights: Record<AuthorityMarker['authorityType'], number> = {
      court_finding: 0.95,
      expert_opinion: 0.8,
      official_report: 0.75,
      police_conclusion: 0.7,
      professional_assessment: 0.6,
      agency_determination: 0.65,
    }

    return {
      claimId: origin.claimId,
      documentId: doc.id,
      authorityType,
      authorityWeight: authorityWeights[authorityType],
      isLaundering: false,
    }
  }

  return null
}

function detectOutcomes(content: string, origins: ClaimOrigin[]): SAMOutcome[] {
  const outcomes: SAMOutcome[] = []
  const lower = content.toLowerCase()

  // Outcome patterns
  const outcomePatterns: [RegExp, SAMOutcome['outcomeType'], SAMOutcome['harmLevel']][] = [
    [/no contact|contact.{0,20}stopped|contact.{0,20}ceased/i, 'contact_loss', 'severe'],
    [/removed|placement|foster|care proceedings/i, 'placement_change', 'catastrophic'],
    [/charged|prosecution|arrested/i, 'criminal_charge', 'severe'],
    [/reputation|media|public/i, 'reputational_harm', 'moderate'],
    [/service.{0,20}terminated|case.{0,20}closed/i, 'service_termination', 'moderate'],
  ]

  for (const [pattern, outcomeType, harmLevel] of outcomePatterns) {
    if (pattern.test(lower)) {
      // Find which origin claim might have caused this
      for (const origin of origins.filter(o => o.isFalsePremise).slice(0, 5)) {
        outcomes.push({
          rootClaimId: origin.claimId,
          outcomeType,
          harmLevel,
          causationStrength: origin.isFalsePremise ? 0.8 : 0.4,
          butForAnalysis: `But for the ${origin.originType} claim, this ${outcomeType} may not have occurred`,
        })
      }
    }
  }

  return outcomes.slice(0, 10)
}
