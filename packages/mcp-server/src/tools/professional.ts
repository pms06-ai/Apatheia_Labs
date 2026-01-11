/**
 * Professional Conduct Tracker Tool
 *
 * Track professional conduct incidents by individual
 */

import { getDocumentsByIds, getDocumentContent, storeFindings } from '../db/connection.js'
import { v4 as uuidv4 } from 'uuid'

export interface ProfessionalProfile {
  id: string
  name: string
  role: string
  registrationBody?: 'HCPC' | 'GMC' | 'NMC' | 'SRA' | 'SWE'
  incidents: ConductIncident[]
  overallAssessment: 'concerning' | 'questionable' | 'satisfactory'
}

export interface ConductIncident {
  id: string
  description: string
  category: 'competence' | 'ethics' | 'communication' | 'record_keeping' | 'boundaries'
  severity: 'serious' | 'moderate' | 'minor'
  documentId: string
  context: string
}

export interface ReferralRecommendation {
  professional: string
  body: string
  grounds: string[]
  priority: 'urgent' | 'standard' | 'monitor'
}

export interface ProfessionalResult {
  profiles: ProfessionalProfile[]
  referrals: ReferralRecommendation[]
  summary: {
    totalProfessionals: number
    concerning: number
    incidentsByCategory: Record<string, number>
  }
}

/**
 * Analyze documents for professional conduct
 */
export async function analyzeProfessional(
  documentIds?: string[],
  caseId?: string,
  content?: string
): Promise<ProfessionalResult> {
  const startTime = Date.now()

  const profiles: Map<string, ProfessionalProfile> = new Map()

  if (content) {
    const extracted = extractProfessionalIncidents(content, 'inline-content')

    for (const { professional, incident } of extracted) {
      const key = professional.toLowerCase()
      const existing = profiles.get(key)

      if (existing) {
        existing.incidents.push(incident)
      } else {
        profiles.set(key, {
          id: uuidv4(),
          name: professional,
          role: inferRole(professional, content),
          registrationBody: inferRegistrationBody(professional, content),
          incidents: [incident],
          overallAssessment: 'satisfactory',
        })
      }
    }
  } else if (documentIds && documentIds.length > 0) {
    const docs = getDocumentsByIds(documentIds)
    if (docs.length === 0) {
      return {
        profiles: [],
        referrals: [],
        summary: { totalProfessionals: 0, concerning: 0, incidentsByCategory: {} },
      }
    }

    for (const doc of docs) {
      const docContent = getDocumentContent(doc.id)
      const extracted = extractProfessionalIncidents(docContent, doc.id)

      for (const { professional, incident } of extracted) {
        const key = professional.toLowerCase()
        const existing = profiles.get(key)

        if (existing) {
          existing.incidents.push(incident)
        } else {
          profiles.set(key, {
            id: uuidv4(),
            name: professional,
            role: inferRole(professional, docContent),
            registrationBody: inferRegistrationBody(professional, docContent),
            incidents: [incident],
            overallAssessment: 'satisfactory',
          })
        }
      }
    }
  } else {
    return {
      profiles: [],
      referrals: [],
      summary: { totalProfessionals: 0, concerning: 0, incidentsByCategory: {} },
    }
  }

  // Calculate overall assessment
  for (const profile of profiles.values()) {
    const seriousCount = profile.incidents.filter(i => i.severity === 'serious').length
    const moderateCount = profile.incidents.filter(i => i.severity === 'moderate').length

    if (seriousCount >= 2 || (seriousCount >= 1 && moderateCount >= 2)) {
      profile.overallAssessment = 'concerning'
    } else if (seriousCount >= 1 || moderateCount >= 2) {
      profile.overallAssessment = 'questionable'
    }
  }

  const profilesArray = [...profiles.values()]

  // Generate referral recommendations
  const referrals = generateReferrals(profilesArray)

  // Calculate summary
  const incidentsByCategory: Record<string, number> = {}
  for (const profile of profilesArray) {
    for (const incident of profile.incidents) {
      incidentsByCategory[incident.category] = (incidentsByCategory[incident.category] || 0) + 1
    }
  }

  const summary = {
    totalProfessionals: profilesArray.length,
    concerning: profilesArray.filter(p => p.overallAssessment === 'concerning').length,
    incidentsByCategory,
  }

  // Store findings
  if (caseId) {
    const findings = profilesArray
      .filter(p => p.overallAssessment === 'concerning')
      .map(p => ({
        id: p.id,
        case_id: caseId,
        engine: 'professional_tracker',
        finding_type: 'professional_conduct',
        title: `Concerning conduct: ${p.name}`,
        description: `${p.incidents.length} incidents identified for ${p.role}`,
        severity: 'high' as const,
        confidence: 0.7,
        document_ids: JSON.stringify([...new Set(p.incidents.map(i => i.documentId))]),
        evidence: JSON.stringify({ incidents: p.incidents.map(i => i.description) }),
      }))

    if (findings.length > 0) {
      storeFindings(findings)
    }
  }

  console.error(`[professional] Analysis complete in ${Date.now() - startTime}ms. Found ${profilesArray.length} professionals.`)

  return { profiles: profilesArray, referrals, summary }
}

/**
 * Extract professional conduct incidents
 */
function extractProfessionalIncidents(content: string, documentId: string): { professional: string; incident: ConductIncident }[] {
  const results: { professional: string; incident: ConductIncident }[] = []

  // Find professional names with titles
  const professionalPattern = /(?:Dr|Mr|Mrs|Ms|Miss|Professor|Officer|Inspector|DI|DC|PC|Sgt)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g
  const professionals = new Set<string>()

  for (const match of content.matchAll(professionalPattern)) {
    professionals.add(match[1])
  }

  // Incident patterns
  const incidentPatterns: { pattern: RegExp; category: ConductIncident['category']; severity: ConductIncident['severity'] }[] = [
    { pattern: /failed to|did not|omitted to|neglected/i, category: 'competence', severity: 'moderate' },
    { pattern: /inaccurate|incorrect|error|mistake/i, category: 'competence', severity: 'minor' },
    { pattern: /misleading|dishonest|false|untrue/i, category: 'ethics', severity: 'serious' },
    { pattern: /no record|failed to record|inadequate record/i, category: 'record_keeping', severity: 'moderate' },
    { pattern: /inappropriate|unprofessional|boundary/i, category: 'boundaries', severity: 'moderate' },
    { pattern: /no response|failed to respond|did not communicate/i, category: 'communication', severity: 'minor' },
  ]

  const sentences = content.split(/[.!?]+/).map(s => s.trim())

  for (const professional of professionals) {
    for (const sentence of sentences) {
      if (sentence.includes(professional)) {
        for (const { pattern, category, severity } of incidentPatterns) {
          if (pattern.test(sentence)) {
            results.push({
              professional,
              incident: {
                id: uuidv4(),
                description: sentence.slice(0, 300),
                category,
                severity,
                documentId,
                context: sentence,
              },
            })
            break
          }
        }
      }
    }
  }

  return results.slice(0, 50)
}

/**
 * Infer professional role from context
 */
function inferRole(name: string, content: string): string {
  const lower = content.toLowerCase()
  const nameLower = name.toLowerCase()

  const rolePatterns: [string, RegExp][] = [
    ['Social Worker', /social worker|sw\b/],
    ['Police Officer', /police|officer|detective|di\b|dc\b/],
    ['Psychologist', /psychologist|psychology/],
    ['Psychiatrist', /psychiatrist|psychiatry/],
    ['Doctor', /doctor|gp\b|physician/],
    ['Nurse', /nurse|nursing/],
    ['Solicitor', /solicitor|lawyer/],
    ['Barrister', /barrister|counsel/],
  ]

  for (const [role, pattern] of rolePatterns) {
    if (pattern.test(lower)) {
      return role
    }
  }

  return 'Professional'
}

/**
 * Infer registration body
 */
function inferRegistrationBody(name: string, content: string): ProfessionalProfile['registrationBody'] {
  const lower = content.toLowerCase()

  if (/social worker/i.test(lower)) return 'SWE'
  if (/psychologist/i.test(lower)) return 'HCPC'
  if (/doctor|gp\b|physician|psychiatrist/i.test(lower)) return 'GMC'
  if (/nurse/i.test(lower)) return 'NMC'
  if (/solicitor|barrister/i.test(lower)) return 'SRA'

  return undefined
}

/**
 * Generate referral recommendations
 */
function generateReferrals(profiles: ProfessionalProfile[]): ReferralRecommendation[] {
  const referrals: ReferralRecommendation[] = []

  for (const profile of profiles) {
    if (profile.overallAssessment === 'concerning' && profile.registrationBody) {
      const bodyNames: Record<string, string> = {
        HCPC: 'Health and Care Professions Council',
        GMC: 'General Medical Council',
        NMC: 'Nursing and Midwifery Council',
        SRA: 'Solicitors Regulation Authority',
        SWE: 'Social Work England',
      }

      referrals.push({
        professional: profile.name,
        body: bodyNames[profile.registrationBody] || profile.registrationBody,
        grounds: profile.incidents.filter(i => i.severity === 'serious').map(i => i.description.slice(0, 100)),
        priority: profile.incidents.filter(i => i.severity === 'serious').length >= 2 ? 'urgent' : 'standard',
      })
    }
  }

  return referrals
}
