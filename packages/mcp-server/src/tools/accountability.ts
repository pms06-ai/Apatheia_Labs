/**
 * Accountability Audit Tool
 *
 * Map statutory duties, identify breaches, and recommend remedies
 */

import { getDocumentsByIds, getDocumentContent, storeFindings } from '../db/connection.js'
import { v4 as uuidv4 } from 'uuid'

export interface StatutoryDuty {
  id: string
  statute: string
  section: string
  description: string
  applicableTo: string[]
}

export interface DutyBreach {
  id: string
  duty: StatutoryDuty
  breachDescription: string
  evidence: string[]
  severity: 'critical' | 'high' | 'medium' | 'low'
  documentId: string
}

export interface Remedy {
  type: 'complaint' | 'judicial_review' | 'ombudsman' | 'professional_referral'
  body: string
  basis: string
  timeLimit?: string
}

export interface AccountabilityResult {
  institution: string
  institutionType: string
  applicableDuties: StatutoryDuty[]
  breaches: DutyBreach[]
  remedies: Remedy[]
  summary: {
    totalBreaches: number
    criticalBreaches: number
    recommendedActions: string[]
  }
}

// Common statutory duties
const STATUTORY_DUTIES: StatutoryDuty[] = [
  {
    id: 'ca1989-s17',
    statute: 'Children Act 1989',
    section: 's.17',
    description: 'General duty to safeguard and promote welfare of children in need',
    applicableTo: ['local_authority'],
  },
  {
    id: 'ca1989-s47',
    statute: 'Children Act 1989',
    section: 's.47',
    description: 'Duty to investigate where reasonable cause to suspect significant harm',
    applicableTo: ['local_authority'],
  },
  {
    id: 'ca2004-s11',
    statute: 'Children Act 2004',
    section: 's.11',
    description: 'Duty to make arrangements to safeguard and promote welfare of children',
    applicableTo: ['local_authority', 'police', 'nhs'],
  },
  {
    id: 'hra1998-a8',
    statute: 'Human Rights Act 1998',
    section: 'Article 8',
    description: 'Right to respect for private and family life',
    applicableTo: ['local_authority', 'police', 'court'],
  },
  {
    id: 'dpa2018-gdpr',
    statute: 'Data Protection Act 2018 / UK GDPR',
    section: 'Article 6',
    description: 'Lawful basis for processing personal data',
    applicableTo: ['local_authority', 'police', 'nhs', 'media'],
  },
  {
    id: 'ofcom-s5',
    statute: 'Broadcasting Code',
    section: 'Section 5',
    description: 'Due impartiality in matters of public controversy',
    applicableTo: ['media'],
  },
  {
    id: 'ofcom-s7',
    statute: 'Broadcasting Code',
    section: 'Section 7',
    description: 'Privacy - unwarranted infringement',
    applicableTo: ['media'],
  },
  {
    id: 'ofcom-s8',
    statute: 'Broadcasting Code',
    section: 'Section 8',
    description: 'Fairness - opportunity to respond',
    applicableTo: ['media'],
  },
]

/**
 * Analyze documents for accountability breaches
 */
export async function analyzeAccountability(
  documentIds?: string[],
  institution?: string,
  institutionType?: string,
  caseId?: string,
  content?: string
): Promise<AccountabilityResult> {
  const startTime = Date.now()

  const type = institutionType || 'local_authority'
  const inst = institution || 'Unknown Institution'

  // Get applicable duties
  const applicableDuties = STATUTORY_DUTIES.filter(d => d.applicableTo.includes(type))

  const breaches: DutyBreach[] = []

  if (content) {
    for (const duty of applicableDuties) {
      const breach = detectBreach(content, duty, 'inline-content')
      if (breach) {
        breaches.push(breach)
      }
    }
  } else if (documentIds && documentIds.length > 0) {
    const docs = getDocumentsByIds(documentIds)

    for (const doc of docs) {
      const docContent = getDocumentContent(doc.id)

      for (const duty of applicableDuties) {
        const breach = detectBreach(docContent, duty, doc.id)
        if (breach) {
          breaches.push(breach)
        }
      }
    }
  }

  // Determine remedies based on breaches
  const remedies = determineRemedies(breaches, type)

  const summary = {
    totalBreaches: breaches.length,
    criticalBreaches: breaches.filter(b => b.severity === 'critical').length,
    recommendedActions: remedies.map(r => `${r.type}: ${r.body}`),
  }

  // Store findings
  if (caseId && breaches.length > 0) {
    const findings = breaches.map(b => ({
      id: b.id,
      case_id: caseId,
      engine: 'accountability_audit',
      finding_type: 'duty_breach',
      title: `Breach of ${b.duty.statute} ${b.duty.section}`,
      description: b.breachDescription,
      severity: b.severity,
      confidence: 0.75,
      document_ids: JSON.stringify([b.documentId]),
      evidence: JSON.stringify({ duty: b.duty, evidence: b.evidence }),
    }))
    storeFindings(findings)
  }

  console.error(`[accountability] Analysis complete in ${Date.now() - startTime}ms. Found ${breaches.length} breaches.`)

  return {
    institution: inst,
    institutionType: type,
    applicableDuties,
    breaches,
    remedies,
    summary,
  }
}

/**
 * Detect breach of a specific duty
 */
function detectBreach(content: string, duty: StatutoryDuty, documentId: string): DutyBreach | null {
  const lower = content.toLowerCase()

  // Pattern matching for breach indicators
  const breachIndicators: Record<string, RegExp[]> = {
    'ca1989-s17': [
      /failed to assess|no assessment|inadequate assessment/i,
      /welfare.{0,20}not.{0,20}considered/i,
    ],
    'ca1989-s47': [
      /no investigation|failed to investigate/i,
      /reasonable cause.{0,30}no action/i,
    ],
    'hra1998-a8': [
      /disproportionate|unjustified interference/i,
      /family life.{0,20}violated|breached/i,
    ],
    'dpa2018-gdpr': [
      /no consent|without consent|consent.{0,20}refused/i,
      /data.{0,20}shared.{0,20}without/i,
    ],
    'ofcom-s5': [
      /one.?sided|imbalanced|lack.{0,10}balance/i,
      /no opportunity.{0,20}respond/i,
    ],
    'ofcom-s7': [
      /privacy.{0,20}invaded|without.{0,20}consent/i,
      /filmed.{0,20}without/i,
    ],
  }

  const patterns = breachIndicators[duty.id] || []
  const evidence: string[] = []

  for (const pattern of patterns) {
    if (pattern.test(content)) {
      const sentences = content.split(/[.!?]+/)
      for (const sentence of sentences) {
        if (pattern.test(sentence)) {
          evidence.push(sentence.trim().slice(0, 200))
        }
      }
    }
  }

  if (evidence.length > 0) {
    return {
      id: uuidv4(),
      duty,
      breachDescription: `Evidence suggests potential breach of ${duty.statute} ${duty.section}: ${duty.description}`,
      evidence,
      severity: evidence.length >= 3 ? 'critical' : evidence.length >= 2 ? 'high' : 'medium',
      documentId,
    }
  }

  return null
}

/**
 * Determine appropriate remedies
 */
function determineRemedies(breaches: DutyBreach[], institutionType: string): Remedy[] {
  const remedies: Remedy[] = []
  const seen = new Set<string>()

  for (const breach of breaches) {
    if (breach.duty.id.startsWith('ofcom') && !seen.has('ofcom')) {
      remedies.push({
        type: 'complaint',
        body: 'Ofcom',
        basis: `Broadcasting Code ${breach.duty.section} violation`,
        timeLimit: '20 working days from broadcast',
      })
      seen.add('ofcom')
    }

    if (breach.duty.id.startsWith('dpa') && !seen.has('ico')) {
      remedies.push({
        type: 'complaint',
        body: 'Information Commissioner\'s Office (ICO)',
        basis: 'UK GDPR breach',
        timeLimit: '3 months (extendable)',
      })
      seen.add('ico')
    }

    if ((breach.duty.id.startsWith('ca1989') || breach.duty.id.startsWith('ca2004')) && !seen.has('lgo')) {
      remedies.push({
        type: 'ombudsman',
        body: 'Local Government Ombudsman',
        basis: 'Maladministration causing injustice',
        timeLimit: '12 months from awareness',
      })
      seen.add('lgo')
    }

    if (breach.severity === 'critical' && !seen.has('jr')) {
      remedies.push({
        type: 'judicial_review',
        body: 'Administrative Court',
        basis: 'Unlawful decision or action',
        timeLimit: '3 months (promptly)',
      })
      seen.add('jr')
    }
  }

  return remedies
}
