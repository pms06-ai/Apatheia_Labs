/**
 * Expert Witness Analysis Tool
 *
 * Evaluate expert reports for FJC compliance and methodology
 */

import { getDocumentById, getDocumentContent, storeFindings } from '../db/connection.js'
import { v4 as uuidv4 } from 'uuid'

export interface ExpertViolation {
  id: string
  type: 'scope' | 'methodology' | 'independence' | 'qualification' | 'disclosure'
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  evidence: string
  fjcGuideline?: string
}

export interface ExpertAnalysisResult {
  reportId: string
  expertName?: string
  qualification?: string
  violations: ExpertViolation[]
  complianceScore: number
  summary: {
    totalViolations: number
    criticalViolations: number
    overallAssessment: 'compliant' | 'concerns' | 'non-compliant'
  }
}

// FJC Guidelines checklist
const FJC_GUIDELINES = [
  { id: 'fjc-1', area: 'scope', requirement: 'Expert must stay within scope of instruction' },
  { id: 'fjc-2', area: 'methodology', requirement: 'Methodology must be clearly stated and recognized' },
  { id: 'fjc-3', area: 'independence', requirement: 'Expert must maintain independence from instructing party' },
  { id: 'fjc-4', area: 'qualification', requirement: 'Expert must have relevant qualifications and experience' },
  { id: 'fjc-5', area: 'disclosure', requirement: 'Expert must disclose limitations and alternative views' },
  { id: 'fjc-6', area: 'disclosure', requirement: 'Expert must distinguish fact from opinion' },
]

/**
 * Analyze expert witness report
 */
export async function analyzeExpertWitness(
  reportDocumentId?: string,
  instructionDocumentId?: string,
  caseId?: string,
  content?: string
): Promise<ExpertAnalysisResult> {
  const startTime = Date.now()

  let reportContent: string
  let reportId: string

  if (content) {
    reportContent = content
    reportId = 'inline-content'
  } else if (reportDocumentId) {
    const reportDoc = getDocumentById(reportDocumentId)
    if (!reportDoc) {
      return {
        reportId: reportDocumentId,
        violations: [],
        complianceScore: 0,
        summary: { totalViolations: 0, criticalViolations: 0, overallAssessment: 'compliant' },
      }
    }
    reportContent = getDocumentContent(reportDocumentId)
    reportId = reportDocumentId
  } else {
    return {
      reportId: 'unknown',
      violations: [],
      complianceScore: 0,
      summary: { totalViolations: 0, criticalViolations: 0, overallAssessment: 'compliant' },
    }
  }

  const instructionContent = instructionDocumentId ? getDocumentContent(instructionDocumentId) : null

  // Extract expert name
  const expertName = extractExpertName(reportContent)

  // Check for violations
  const violations: ExpertViolation[] = []

  // Scope violations
  if (instructionContent) {
    const scopeViolations = checkScopeViolations(reportContent, instructionContent)
    violations.push(...scopeViolations)
  }

  // Methodology violations
  const methodViolations = checkMethodologyViolations(reportContent)
  violations.push(...methodViolations)

  // Independence violations
  const independenceViolations = checkIndependenceViolations(reportContent)
  violations.push(...independenceViolations)

  // Disclosure violations
  const disclosureViolations = checkDisclosureViolations(reportContent)
  violations.push(...disclosureViolations)

  // Calculate compliance score
  const maxScore = 100
  const penaltyPerViolation: Record<string, number> = {
    critical: 25,
    high: 15,
    medium: 8,
    low: 3,
  }

  let penalties = 0
  for (const v of violations) {
    penalties += penaltyPerViolation[v.severity] || 5
  }

  const complianceScore = Math.max(0, maxScore - penalties)

  let overallAssessment: 'compliant' | 'concerns' | 'non-compliant' = 'compliant'
  if (complianceScore < 50) overallAssessment = 'non-compliant'
  else if (complianceScore < 75) overallAssessment = 'concerns'

  const result: ExpertAnalysisResult = {
    reportId,
    expertName,
    violations,
    complianceScore,
    summary: {
      totalViolations: violations.length,
      criticalViolations: violations.filter(v => v.severity === 'critical').length,
      overallAssessment,
    },
  }

  // Store findings
  if (caseId && violations.length > 0) {
    const findings = violations.map(v => ({
      id: v.id,
      case_id: caseId,
      engine: 'expert_witness',
      finding_type: v.type,
      title: `Expert ${v.type} violation: ${v.description.slice(0, 50)}`,
      description: v.description,
      severity: v.severity,
      confidence: 0.75,
      document_ids: JSON.stringify([reportDocumentId]),
      evidence: JSON.stringify({ evidence: v.evidence, fjcGuideline: v.fjcGuideline }),
    }))
    storeFindings(findings)
  }

  console.error(`[expert-witness] Analysis complete in ${Date.now() - startTime}ms. Compliance score: ${complianceScore}%`)

  return result
}

/**
 * Extract expert name from report
 */
function extractExpertName(content: string): string | undefined {
  const patterns = [
    /(?:prepared by|authored by|expert:\s*)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /(?:Dr|Professor|Mr|Mrs|Ms)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
  ]

  for (const pattern of patterns) {
    const match = content.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return undefined
}

/**
 * Check for scope violations
 */
function checkScopeViolations(report: string, instruction: string): ExpertViolation[] {
  const violations: ExpertViolation[] = []

  // Look for opinions outside instruction scope
  const opinionPatterns = [
    /(?:in my opinion|i believe|i conclude|it is my view)/gi,
  ]

  const sentences = report.split(/[.!?]+/).map(s => s.trim())

  for (const sentence of sentences) {
    for (const pattern of opinionPatterns) {
      if (pattern.test(sentence)) {
        // Check if topic is in instruction
        const instructionTopics = extractTopics(instruction)
        const sentenceTopics = extractTopics(sentence)

        const overlap = sentenceTopics.filter(t => instructionTopics.some(it => it.includes(t) || t.includes(it)))

        if (overlap.length === 0 && sentenceTopics.length > 0) {
          violations.push({
            id: uuidv4(),
            type: 'scope',
            severity: 'high',
            description: 'Expert appears to opine on matters outside instruction scope',
            evidence: sentence.slice(0, 200),
            fjcGuideline: FJC_GUIDELINES[0].requirement,
          })
        }
      }
    }
  }

  return violations.slice(0, 5)
}

/**
 * Check for methodology violations
 */
function checkMethodologyViolations(content: string): ExpertViolation[] {
  const violations: ExpertViolation[] = []
  const lower = content.toLowerCase()

  // Check for methodology statement
  if (!lower.includes('methodology') && !lower.includes('method') && !lower.includes('approach')) {
    violations.push({
      id: uuidv4(),
      type: 'methodology',
      severity: 'medium',
      description: 'Report does not clearly state methodology',
      evidence: 'No methodology section found',
      fjcGuideline: FJC_GUIDELINES[1].requirement,
    })
  }

  // Check for unsupported assertions
  const assertionPatterns = [
    /clearly|obviously|undoubtedly|certainly|definitely/gi,
  ]

  const sentences = content.split(/[.!?]+/)
  for (const sentence of sentences) {
    for (const pattern of assertionPatterns) {
      if (pattern.test(sentence) && !sentence.toLowerCase().includes('evidence') && !sentence.toLowerCase().includes('research')) {
        violations.push({
          id: uuidv4(),
          type: 'methodology',
          severity: 'low',
          description: 'Strong assertion without cited evidence',
          evidence: sentence.slice(0, 200).trim(),
        })
        break
      }
    }
  }

  return violations.slice(0, 5)
}

/**
 * Check for independence violations
 */
function checkIndependenceViolations(content: string): ExpertViolation[] {
  const violations: ExpertViolation[] = []

  // Look for advocacy language
  const advocacyPatterns = [
    /(?:on behalf of|for the|representing|instructed by).{0,30}(?:applicant|respondent|claimant|defendant)/i,
    /(?:support|assist|help).{0,20}(?:case|position|argument)/i,
  ]

  for (const pattern of advocacyPatterns) {
    const match = content.match(pattern)
    if (match) {
      violations.push({
        id: uuidv4(),
        type: 'independence',
        severity: 'high',
        description: 'Language suggests expert is advocating for a party',
        evidence: match[0],
        fjcGuideline: FJC_GUIDELINES[2].requirement,
      })
    }
  }

  return violations
}

/**
 * Check for disclosure violations
 */
function checkDisclosureViolations(content: string): ExpertViolation[] {
  const violations: ExpertViolation[] = []
  const lower = content.toLowerCase()

  // Check for limitation disclosure
  if (!lower.includes('limitation') && !lower.includes('caveat') && !lower.includes('uncertainty')) {
    violations.push({
      id: uuidv4(),
      type: 'disclosure',
      severity: 'medium',
      description: 'Report does not disclose limitations or uncertainties',
      evidence: 'No limitations section found',
      fjcGuideline: FJC_GUIDELINES[4].requirement,
    })
  }

  // Check for alternative views
  if (!lower.includes('alternative') && !lower.includes('different view') && !lower.includes('other opinion')) {
    violations.push({
      id: uuidv4(),
      type: 'disclosure',
      severity: 'low',
      description: 'Report does not acknowledge alternative professional views',
      evidence: 'No alternative views discussed',
      fjcGuideline: FJC_GUIDELINES[4].requirement,
    })
  }

  return violations
}

/**
 * Extract topics from text
 */
function extractTopics(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/)
  return words.filter(w => w.length > 6 && !/^(the|and|that|this|which|their|there|about|would|could|should|because)$/.test(w))
}
