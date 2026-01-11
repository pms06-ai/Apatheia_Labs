/**
 * CROSS-INSTITUTIONAL COORDINATION ENGINE (Σ - συνέργεια)
 * "Hidden Coordination"
 *
 * Detects improper coordination between institutions that should
 * operate independently (police, social services, courts, experts).
 *
 * Core Question: Were "independent" sources actually independent?
 */

import { generateJSON } from '@/lib/ai-client'
import { supabaseAdmin } from '@/lib/supabase/server'
import type { Document } from '@/CONTRACT'

// AI Response Types
interface CoordinationAIResponse {
  sharedLanguage: Array<{
    phrase: string
    wordCount: number
    documents: Array<{
      documentId: string
      institution: string
      date: string
      context: string
    }>
    probability: 'coincidence' | 'template' | 'coordination' | 'copy'
    significance: number
  }>
  informationFlow: Array<{
    sourceInstitution: string
    targetInstitution: string
    informationType: 'conclusion' | 'evidence' | 'opinion' | 'allegation'
    predatesDisclosure: boolean
    description: string
    evidence: string
    severity: 'critical' | 'high' | 'medium' | 'low'
  }>
  independenceViolations: Array<{
    type: 'pre_disclosure' | 'shared_language' | 'circular_reference' | 'timing_anomaly'
    institutions: string[]
    description: string
    evidence: string[]
    severity: 'critical' | 'high' | 'medium' | 'low'
  }>
}

export interface SharedLanguageFinding {
  id: string
  phrase: string
  wordCount: number
  documents: {
    documentId: string
    documentName: string
    institution: string
    date: string
    context: string
  }[]
  probability: 'coincidence' | 'template' | 'coordination' | 'copy'
  significance: number
}

export interface InformationFlowFinding {
  id: string
  sourceInstitution: string
  targetInstitution: string
  informationType: 'conclusion' | 'evidence' | 'opinion' | 'allegation'
  predatesDisclosure: boolean
  description: string
  evidence: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

export interface IndependenceViolation {
  id: string
  type: 'pre_disclosure' | 'shared_language' | 'circular_reference' | 'timing_anomaly'
  institutions: string[]
  description: string
  evidence: string[]
  severity: 'critical' | 'high' | 'medium' | 'low'
}

export interface CoordinationAnalysisResult {
  sharedLanguage: SharedLanguageFinding[]
  informationFlow: InformationFlowFinding[]
  independenceViolations: IndependenceViolation[]
  institutionMap: {
    institution: string
    documentCount: number
    firstAppearance: string
    keyPersonnel: string[]
  }[]
  summary: {
    totalFindings: number
    criticalViolations: number
    independenceScore: number // 0-100, lower = more coordination
    mostConnectedInstitutions: [string, string][]
  }
}

// Known institution patterns
const INSTITUTION_PATTERNS: Record<string, RegExp[]> = {
  police: [/police/i, /constabulary/i, /officer/i, /pc\s/i, /detective/i],
  social_services: [
    /social\s*work/i,
    /children.?s\s*services/i,
    /safeguarding/i,
    /local\s*authority/i,
    /la\s/i,
  ],
  cafcass: [/cafcass/i, /children.?s\s*guardian/i, /family\s*court\s*advisor/i],
  court: [/court/i, /judge/i, /magistrate/i, /recorder/i, /hm\s*courts/i],
  expert: [/expert/i, /psycholog/i, /psychiatr/i, /consultant/i, /dr\.?\s/i],
  health: [/nhs/i, /hospital/i, /gp\s/i, /health\s*visitor/i, /midwife/i],
  education: [/school/i, /teacher/i, /head\s*teacher/i, /senco/i, /education/i],
}

const COORDINATION_ANALYSIS_PROMPT = `You are a forensic analyst detecting improper coordination between institutions in legal proceedings.

DOCUMENTS FROM MULTIPLE INSTITUTIONS:
{documents}

Analyze for signs of coordination that undermines institutional independence:

1. SHARED LANGUAGE DETECTION:
- Find phrases of 5+ words that appear verbatim in documents from different institutions
- Look for unusual terminology that appears across institutional boundaries
- Identify template language that shouldn't appear in "independent" reports

2. INFORMATION FLOW ANALYSIS:
- Track how information flows between institutions
- Identify if conclusions appear before formal disclosure
- Note if opinions from one institution appear as facts in another

3. INDEPENDENCE VIOLATIONS:
Types to detect:
- PRE_DISCLOSURE: Information shared before formal disclosure processes
- SHARED_LANGUAGE: Verbatim phrases suggesting copy/paste or template
- CIRCULAR_REFERENCE: Institution A cites B which cites A
- TIMING_ANOMALY: Conclusions reached impossibly quickly

4. MAP INSTITUTIONAL RELATIONSHIPS:
- Who communicated with whom
- When did communication occur
- Was formal process followed

Respond in JSON:
{
  "sharedLanguage": [
    {
      "phrase": "exact phrase found",
      "wordCount": number,
      "documents": [
        {
          "documentId": "...",
          "institution": "police|social_services|cafcass|court|expert|health|education",
          "date": "...",
          "context": "surrounding text"
        }
      ],
      "probability": "coincidence|template|coordination|copy",
      "significance": 0-100
    }
  ],
  "informationFlow": [
    {
      "sourceInstitution": "...",
      "targetInstitution": "...",
      "informationType": "conclusion|evidence|opinion|allegation",
      "predatesDisclosure": true/false,
      "description": "...",
      "evidence": "quote or reference",
      "severity": "critical|high|medium|low"
    }
  ],
  "independenceViolations": [
    {
      "type": "pre_disclosure|shared_language|circular_reference|timing_anomaly",
      "institutions": ["...", "..."],
      "description": "...",
      "evidence": ["..."],
      "severity": "critical|high|medium|low"
    }
  ]
}`

/**
 * Analyze coordination patterns across documents
 */
export async function analyzeCoordination(
  documents: Document[],
  caseId: string
): Promise<CoordinationAnalysisResult> {
  // Classify documents by institution
  const classifiedDocs = await classifyByInstitution(documents)

  // Get content and format for prompt
  const docContents = await Promise.all(
    documents.map(async doc => {
      const content = await getDocumentContent(doc.id)
      const institution = classifiedDocs.get(doc.id) || 'unknown'
      return {
        id: doc.id,
        name: doc.filename,
        institution,
        date: doc.created_at,
        content: content.slice(0, 30000),
      }
    })
  )

  const formattedDocs = docContents
    .map(d => `=== ${d.name} ===\nInstitution: ${d.institution}\nDate: ${d.date}\n\n${d.content}`)
    .join('\n\n---\n\n')

  const prompt = COORDINATION_ANALYSIS_PROMPT.replace('{documents}', formattedDocs)

  let result: CoordinationAIResponse

  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
    console.log('[MOCK ENGINE] Using Mock Coordination Analysis')
    await new Promise(resolve => setTimeout(resolve, 2000))

    result = {
      sharedLanguage: [
        {
          phrase: 'risk of significant harm due to emotional abuse',
          wordCount: 8,
          documents: [
            {
              documentId: documents[0]?.id || 'doc1',
              institution: 'social_services',
              date: '2023-01-15',
              context: 'Initial assessment conclusion',
            },
            {
              documentId: documents[1]?.id || 'doc2',
              institution: 'police',
              date: '2023-01-16',
              context: 'Police referral form',
            },
          ],
          probability: 'copy',
          significance: 90,
        },
      ],
      informationFlow: [
        {
          sourceInstitution: 'social_services',
          targetInstitution: 'expert',
          informationType: 'opinion',
          predatesDisclosure: true,
          description:
            'Expert opinion mirrors social work phrasing prior to receiving instructions',
          evidence: 'The child presents as hyper-vigilant',
          severity: 'high',
        },
      ],
      independenceViolations: [
        {
          type: 'pre_disclosure',
          institutions: ['social_services', 'police'],
          description: 'Police report cites social work findings before they were finalized',
          evidence: ['Report dated 12th cites assessment dated 14th'],
          severity: 'critical',
        },
      ],
    }
  } else {
    // Real AI Analysis via Router
    result = await generateJSON<CoordinationAIResponse>('You are a forensic analyst.', prompt)
  }

  const rawSharedLanguage = Array.isArray((result as any).sharedLanguage)
    ? (result as any).sharedLanguage
    : []
  const rawInformationFlow = Array.isArray((result as any).informationFlow)
    ? (result as any).informationFlow
    : []
  const rawIndependenceViolations = Array.isArray((result as any).independenceViolations)
    ? (result as any).independenceViolations
    : []

  // Process findings
  const sharedLanguage: SharedLanguageFinding[] = rawSharedLanguage.map((s: any, idx: number) => ({
    id: `shared-${idx}`,
    phrase: s.phrase,
    wordCount: s.wordCount,
    documents: s.documents.map((d: any) => ({
      documentId: d.documentId,
      documentName: docContents.find(dc => dc.id === d.documentId)?.name || 'Unknown',
      institution: d.institution,
      date: d.date,
      context: d.context,
    })),
    probability: s.probability,
    significance: s.significance,
  }))

  const informationFlow: InformationFlowFinding[] = rawInformationFlow.map(
    (f: any, idx: number) => ({
      id: `flow-${idx}`,
      sourceInstitution: f.sourceInstitution,
      targetInstitution: f.targetInstitution,
      informationType: f.informationType,
      predatesDisclosure: f.predatesDisclosure,
      description: f.description,
      evidence: f.evidence,
      severity: f.severity,
    })
  )

  const independenceViolations: IndependenceViolation[] = rawIndependenceViolations.map(
    (v: any, idx: number) => ({
      id: `violation-${idx}`,
      type: v.type,
      institutions: v.institutions,
      description: v.description,
      evidence: v.evidence,
      severity: v.severity,
    })
  )

  // Build institution map
  const institutionMap = buildInstitutionMap(docContents)

  // Calculate independence score
  const independenceScore = calculateIndependenceScore(
    sharedLanguage,
    informationFlow,
    independenceViolations
  )

  const analysisResult: CoordinationAnalysisResult = {
    sharedLanguage,
    informationFlow,
    independenceViolations,
    institutionMap,
    summary: {
      totalFindings: sharedLanguage.length + informationFlow.length + independenceViolations.length,
      criticalViolations: independenceViolations.filter(v => v.severity === 'critical').length,
      independenceScore,
      mostConnectedInstitutions: findMostConnected(informationFlow),
    },
  }

  // Store findings
  await storeCoordinationFindings(caseId, analysisResult)

  return analysisResult
}

/**
 * Detect shared language between two specific documents
 */
export async function compareDocumentsForSharing(
  doc1: Document,
  doc2: Document
): Promise<{
  sharedPhrases: { phrase: string; significance: number }[]
  similarity: number
}> {
  const content1 = await getDocumentContent(doc1.id)
  const content2 = await getDocumentContent(doc2.id)

  const prompt = `Compare these two documents for shared language:

DOCUMENT 1 (${doc1.filename}):
${content1.slice(0, 20000)}

DOCUMENT 2 (${doc2.filename}):
${content2.slice(0, 20000)}

Find:
1. Phrases of 5+ words that appear in both
2. Unusual terminology shared between them
3. Structural similarities

Rate overall similarity 0-100.

Respond in JSON:
{
  "sharedPhrases": [{ "phrase": "...", "significance": 0-100 }],
  "similarity": 0-100
}`

  return await generateJSON('Compare documents for shared language.', prompt)
}

/**
 * Build communication timeline between institutions
 */
export async function buildCommunicationTimeline(
  documents: Document[],
  caseId: string
): Promise<{
  events: {
    date: string
    from: string
    to: string
    type: 'email' | 'meeting' | 'report' | 'referral' | 'disclosure'
    description: string
  }[]
  gaps: { from: string; to: string; duration: number }[]
}> {
  const classifiedDocs = await classifyByInstitution(documents)

  const events = []
  const sortedDocs = [...documents].sort(
    (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  )

  for (const doc of sortedDocs) {
    const institution = classifiedDocs.get(doc.id) || 'unknown'
    events.push({
      date: doc.created_at || 'Unknown',
      from: institution,
      to: 'record', // Would need more analysis to determine recipient
      type: determineDocType(doc),
      description: doc.filename,
    })
  }

  // Find gaps in communication
  const gaps = []
  for (let i = 1; i < events.length; i++) {
    const prev = new Date(events[i - 1].date)
    const curr = new Date(events[i].date)
    const duration = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)

    if (duration > 30) {
      // Gap of more than 30 days
      gaps.push({
        from: events[i - 1].date,
        to: events[i].date,
        duration: Math.round(duration),
      })
    }
  }

  return { events, gaps }
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

async function classifyByInstitution(documents: Document[]): Promise<Map<string, string>> {
  const classification = new Map<string, string>()

  for (const doc of documents) {
    // First try based on doc_type
    if (doc.doc_type?.includes('police')) {
      classification.set(doc.id, 'police')
      continue
    }
    if (doc.doc_type?.includes('social') || doc.doc_type?.includes('assessment')) {
      classification.set(doc.id, 'social_services')
      continue
    }
    if (doc.doc_type?.includes('expert')) {
      classification.set(doc.id, 'expert')
      continue
    }

    // Then try filename
    const filename = doc.filename.toLowerCase()
    for (const [institution, patterns] of Object.entries(INSTITUTION_PATTERNS)) {
      if (patterns.some(p => p.test(filename))) {
        classification.set(doc.id, institution)
        break
      }
    }

    // Default to unknown
    if (!classification.has(doc.id)) {
      classification.set(doc.id, 'unknown')
    }
  }

  return classification
}

function buildInstitutionMap(
  docs: { id: string; name: string; institution: string; date: string }[]
): CoordinationAnalysisResult['institutionMap'] {
  const map = new Map<
    string,
    {
      documentCount: number
      firstAppearance: string
      keyPersonnel: Set<string>
    }
  >()

  for (const doc of docs) {
    if (!map.has(doc.institution)) {
      map.set(doc.institution, {
        documentCount: 0,
        firstAppearance: doc.date,
        keyPersonnel: new Set(),
      })
    }

    const entry = map.get(doc.institution)!
    entry.documentCount++
    if (new Date(doc.date) < new Date(entry.firstAppearance)) {
      entry.firstAppearance = doc.date
    }
  }

  return Array.from(map.entries()).map(([institution, data]) => ({
    institution,
    documentCount: data.documentCount,
    firstAppearance: data.firstAppearance,
    keyPersonnel: Array.from(data.keyPersonnel),
  }))
}

function calculateIndependenceScore(
  sharedLanguage: SharedLanguageFinding[],
  informationFlow: InformationFlowFinding[],
  violations: IndependenceViolation[]
): number {
  let score = 100

  // Deduct for shared language
  for (const s of sharedLanguage) {
    if (s.probability === 'copy') score -= 15
    else if (s.probability === 'coordination') score -= 10
    else if (s.probability === 'template') score -= 5
  }

  // Deduct for pre-disclosure information flow
  for (const f of informationFlow) {
    if (f.predatesDisclosure) {
      score -= f.severity === 'critical' ? 20 : f.severity === 'high' ? 10 : 5
    }
  }

  // Deduct for independence violations
  for (const v of violations) {
    score -= v.severity === 'critical' ? 25 : v.severity === 'high' ? 15 : 8
  }

  return Math.max(0, Math.min(100, score))
}

function findMostConnected(flows: InformationFlowFinding[]): [string, string][] {
  const pairs = new Map<string, number>()

  for (const flow of flows) {
    const key = [flow.sourceInstitution, flow.targetInstitution].sort().join('-')
    pairs.set(key, (pairs.get(key) || 0) + 1)
  }

  return Array.from(pairs.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => key.split('-') as [string, string])
}

function determineDocType(
  doc: Document
): 'email' | 'meeting' | 'report' | 'referral' | 'disclosure' {
  const name = doc.filename.toLowerCase()
  if (name.includes('email') || name.includes('correspondence')) return 'email'
  if (name.includes('minute') || name.includes('meeting')) return 'meeting'
  if (name.includes('referral')) return 'referral'
  if (name.includes('disclosure') || name.includes('bundle')) return 'disclosure'
  return 'report'
}

async function storeCoordinationFindings(caseId: string, result: CoordinationAnalysisResult) {
  const findings = []

  // Store independence violations
  for (const violation of result.independenceViolations) {
    findings.push({
      case_id: caseId,
      engine: 'coordination',
      title: `Independence Violation: ${violation.type.replace('_', ' ')}`,
      description: violation.description,
      severity: violation.severity,
      evidence: {
        type: violation.type,
        institutions: violation.institutions,
        evidence: violation.evidence,
      },
    })
  }

  // Store significant shared language
  for (const shared of result.sharedLanguage.filter(s => s.probability !== 'coincidence')) {
    findings.push({
      case_id: caseId,
      engine: 'coordination',
      title: `Shared Language Detected (${shared.documents.length} documents)`,
      description: `"${shared.phrase}" appears in documents from ${[...new Set(shared.documents.map(d => d.institution))].join(', ')}`,
      severity: shared.probability === 'copy' ? 'critical' : 'high',
      document_ids: shared.documents.map(d => d.documentId),
      evidence: {
        phrase: shared.phrase,
        probability: shared.probability,
        documents: shared.documents,
      },
    })
  }

  // Store pre-disclosure flows
  for (const flow of result.informationFlow.filter(f => f.predatesDisclosure)) {
    findings.push({
      case_id: caseId,
      engine: 'coordination',
      title: `Pre-Disclosure Information Flow`,
      description: `${flow.informationType} shared from ${flow.sourceInstitution} to ${flow.targetInstitution} before formal disclosure`,
      severity: 'critical',
      evidence: {
        source: flow.sourceInstitution,
        target: flow.targetInstitution,
        type: flow.informationType,
        quote: flow.evidence,
      },
    })
  }

  if (findings.length > 0) {
    await supabaseAdmin.from('findings').insert(findings)
  }
}

export const coordinationEngine = {
  analyzeCoordination,
  compareDocumentsForSharing,
  buildCommunicationTimeline,
}
