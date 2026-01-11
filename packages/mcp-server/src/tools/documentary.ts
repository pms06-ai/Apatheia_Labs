/**
 * Documentary Analysis Tool
 *
 * Compare broadcast/published content against source material
 */

import { getDocumentsByIds, getDocumentContent, storeFindings } from '../db/connection.js'
import { v4 as uuidv4 } from 'uuid'

export interface DocumentaryFinding {
  id: string
  type: 'distortion' | 'omission' | 'decontextualization' | 'misattribution' | 'juxtaposition'
  severity: 'critical' | 'high' | 'medium' | 'low'
  broadcastContent: string
  sourceContent?: string
  explanation: string
  editorialImpact: string
}

export interface DocumentaryAnalysisResult {
  findings: DocumentaryFinding[]
  framingAnalysis: {
    subjectFramingRatio: number
    positiveReferences: number
    negativeReferences: number
  }
  summary: {
    totalFindings: number
    criticalFindings: number
    overallBias: 'strong' | 'moderate' | 'weak' | 'balanced'
  }
}

/**
 * Analyze documentary/broadcast content
 */
export async function analyzeDocumentary(
  documentIds?: string[],
  caseId?: string,
  content?: string
): Promise<DocumentaryAnalysisResult> {
  const startTime = Date.now()

  const findings: DocumentaryFinding[] = []
  let positiveRefs = 0
  let negativeRefs = 0

  if (content) {
    const framing = analyzeFraming(content)
    positiveRefs += framing.positive
    negativeRefs += framing.negative

    const docFindings = findDocumentaryIssues(content, 'inline-content')
    findings.push(...docFindings)
  } else if (documentIds && documentIds.length > 0) {
    const docs = getDocumentsByIds(documentIds)
    if (docs.length === 0) {
      return {
        findings: [],
        framingAnalysis: { subjectFramingRatio: 1, positiveReferences: 0, negativeReferences: 0 },
        summary: { totalFindings: 0, criticalFindings: 0, overallBias: 'balanced' },
      }
    }

    for (const doc of docs) {
      const docContent = getDocumentContent(doc.id)

      const framing = analyzeFraming(docContent)
      positiveRefs += framing.positive
      negativeRefs += framing.negative

      const docFindings = findDocumentaryIssues(docContent, doc.id)
      findings.push(...docFindings)
    }
  } else {
    return {
      findings: [],
      framingAnalysis: { subjectFramingRatio: 1, positiveReferences: 0, negativeReferences: 0 },
      summary: { totalFindings: 0, criticalFindings: 0, overallBias: 'balanced' },
    }
  }

  // Calculate framing ratio
  const framingRatio = positiveRefs > 0 ? negativeRefs / positiveRefs : negativeRefs

  let overallBias: 'strong' | 'moderate' | 'weak' | 'balanced' = 'balanced'
  if (framingRatio >= 5) overallBias = 'strong'
  else if (framingRatio >= 3) overallBias = 'moderate'
  else if (framingRatio >= 1.5) overallBias = 'weak'

  const result: DocumentaryAnalysisResult = {
    findings,
    framingAnalysis: {
      subjectFramingRatio: Math.round(framingRatio * 100) / 100,
      positiveReferences: positiveRefs,
      negativeReferences: negativeRefs,
    },
    summary: {
      totalFindings: findings.length,
      criticalFindings: findings.filter(f => f.severity === 'critical').length,
      overallBias,
    },
  }

  // Store findings
  if (caseId && findings.length > 0) {
    const storedFindings = findings.slice(0, 20).map(f => ({
      id: f.id,
      case_id: caseId,
      engine: 'documentary',
      finding_type: f.type,
      title: `Documentary ${f.type}: ${f.explanation.slice(0, 50)}`,
      description: f.explanation,
      severity: f.severity,
      confidence: 0.7,
      document_ids: JSON.stringify(documentIds),
      evidence: JSON.stringify({ broadcastContent: f.broadcastContent, impact: f.editorialImpact }),
    }))
    storeFindings(storedFindings)
  }

  console.error(`[documentary] Analysis complete in ${Date.now() - startTime}ms. Framing ratio: ${framingRatio}:1`)

  return result
}

/**
 * Analyze framing of subjects
 */
function analyzeFraming(content: string): { positive: number; negative: number } {
  const lower = content.toLowerCase()

  // Negative framing indicators
  const negativePatterns = [
    /suspect|accused|alleged|perpetrator|offender|killer|murderer/gi,
    /failed|refused|denied|aggressive|hostile|violent/gi,
    /investigation|arrest|charge|prosecution|conviction/gi,
    /concern|worry|fear|danger|threat|risk/gi,
  ]

  // Positive framing indicators
  const positivePatterns = [
    /cleared|innocent|exonerated|acquitted|no evidence/gi,
    /cooperat|complian|voluntary|helpful/gi,
    /family|loved|caring|support/gi,
    /professional|respected|community/gi,
  ]

  let negative = 0
  let positive = 0

  for (const pattern of negativePatterns) {
    const matches = content.match(pattern) || []
    negative += matches.length
  }

  for (const pattern of positivePatterns) {
    const matches = content.match(pattern) || []
    positive += matches.length
  }

  return { positive, negative }
}

/**
 * Find documentary issues in content
 */
function findDocumentaryIssues(content: string, documentId: string): DocumentaryFinding[] {
  const findings: DocumentaryFinding[] = []
  const sentences = content.split(/[.!?]+/).map(s => s.trim())

  // Look for decontextualization
  for (const sentence of sentences) {
    // Quotes without context
    if (/"[^"]+"/g.test(sentence) && sentence.length < 100) {
      if (!sentence.includes('said') && !sentence.includes('stated') && !sentence.includes('explained')) {
        findings.push({
          id: uuidv4(),
          type: 'decontextualization',
          severity: 'medium',
          broadcastContent: sentence,
          explanation: 'Quote presented without speaker or context',
          editorialImpact: 'Viewers cannot assess the context or reliability of the statement',
        })
      }
    }

    // Juxtaposition of unrelated facts
    if (/\.\.\.|—|–/.test(sentence)) {
      findings.push({
        id: uuidv4(),
        type: 'juxtaposition',
        severity: 'low',
        broadcastContent: sentence,
        explanation: 'Editorial cut or juxtaposition detected',
        editorialImpact: 'May create misleading associations',
      })
    }
  }

  // Look for strong claims without attribution
  const unattributedClaims = [
    /(?<!police|court|expert|official)\s(?:confirmed|revealed|exposed|uncovered)/gi,
  ]

  for (const pattern of unattributedClaims) {
    const matches = content.matchAll(pattern)
    for (const match of matches) {
      const idx = match.index || 0
      const context = content.slice(Math.max(0, idx - 50), idx + 100)

      findings.push({
        id: uuidv4(),
        type: 'distortion',
        severity: 'medium',
        broadcastContent: context,
        explanation: 'Strong claim without clear attribution',
        editorialImpact: 'Presents editorial interpretation as fact',
      })
    }
  }

  return findings.slice(0, 15)
}
