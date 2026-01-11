/**
 * Omission Detection Tool
 *
 * Detects what was selectively omitted from target documents compared to sources
 */

import { getDocumentsByIds, getDocumentContent, storeFindings } from '../db/connection.js'
import type { OmissionFinding, OmissionAnalysisResult, OmissionCategory, Severity } from '../types/index.js'
import { v4 as uuidv4 } from 'uuid'

/**
 * Analyze for omissions between source and target documents
 */
export async function analyzeOmissions(
  sourceDocumentIds?: string[],
  targetDocumentIds?: string[],
  caseId?: string,
  content?: string
): Promise<OmissionAnalysisResult> {
  const startTime = Date.now()

  let sourceContents: { id: string; name: string; content: string }[] = []
  let targetContents: { id: string; name: string; content: string }[] = []

  // If direct content provided, analyze it for self-contained omissions
  if (content) {
    sourceContents = [{
      id: 'inline-content',
      name: 'Selected Text',
      content: content,
    }]
    // For inline content, we analyze against itself (look for gaps)
    targetContents = sourceContents
  } else {
    // Get documents
    const sourceDocs = sourceDocumentIds ? getDocumentsByIds(sourceDocumentIds) : []
    const targetDocs = targetDocumentIds ? getDocumentsByIds(targetDocumentIds) : []

    if (sourceDocs.length === 0 || targetDocs.length === 0) {
      return {
        omissions: [],
        biasScore: 0,
        summary: {
          totalOmissions: 0,
          byCategory: {
            exculpatory: 0,
            contextual: 0,
            procedural: 0,
            temporal: 0,
            contradicting: 0,
          },
          overallBiasDirection: 'neutral',
        },
      }
    }

    // Get content
    sourceContents = sourceDocs.map(doc => ({
      id: doc.id,
      name: doc.filename,
      content: getDocumentContent(doc.id),
    }))

    targetContents = targetDocs.map(doc => ({
      id: doc.id,
      name: doc.filename,
      content: getDocumentContent(doc.id),
    }))
  }

  // Find omissions
  const omissions: OmissionFinding[] = []

  for (const source of sourceContents) {
    for (const target of targetContents) {
      const found = findOmissions(source, target)
      omissions.push(...found)
    }
  }

  // Calculate bias score
  let prosecutionCount = 0
  let defenseCount = 0

  for (const o of omissions) {
    if (o.biasDirection === 'prosecution') prosecutionCount++
    else if (o.biasDirection === 'defense') defenseCount++
  }

  const total = prosecutionCount + defenseCount
  const biasScore = total > 0 ? (prosecutionCount - defenseCount) / total : 0

  // Categorize
  const byCategory: Record<OmissionCategory, number> = {
    exculpatory: 0,
    contextual: 0,
    procedural: 0,
    temporal: 0,
    contradicting: 0,
  }

  for (const o of omissions) {
    byCategory[o.category]++
  }

  const result: OmissionAnalysisResult = {
    omissions,
    biasScore,
    summary: {
      totalOmissions: omissions.length,
      byCategory,
      overallBiasDirection: biasScore > 0.2 ? 'prosecution' : biasScore < -0.2 ? 'defense' : 'neutral',
    },
  }

  // Store findings
  if (caseId && omissions.length > 0) {
    const findings = omissions.map(o => ({
      id: o.id,
      case_id: caseId,
      engine: 'omission',
      finding_type: o.category,
      title: `${o.category} omission: ${o.omittedContent.slice(0, 50)}...`,
      description: o.context,
      severity: o.severity,
      confidence: 0.75,
      document_ids: JSON.stringify([o.sourceDocumentId, o.targetDocumentId]),
      evidence: JSON.stringify({
        category: o.category,
        biasDirection: o.biasDirection,
        impact: o.impact,
      }),
    }))
    storeFindings(findings)
  }

  console.error(`[omission] Analysis complete in ${Date.now() - startTime}ms. Found ${omissions.length} omissions.`)

  return result
}

/**
 * Find omissions between source and target document
 */
function findOmissions(
  source: { id: string; name: string; content: string },
  target: { id: string; name: string; content: string }
): OmissionFinding[] {
  const omissions: OmissionFinding[] = []

  // Extract significant statements from source
  const sourceStatements = extractSignificantStatements(source.content)
  const targetContent = target.content.toLowerCase()

  for (const statement of sourceStatements) {
    // Check if statement or its key elements appear in target
    const keyWords = extractKeyWords(statement)
    const found = keyWords.filter(word => targetContent.includes(word.toLowerCase()))

    // If less than 50% of key words found, consider it omitted
    if (found.length < keyWords.length * 0.5) {
      const category = categorizeOmission(statement)
      const biasDirection = determineBiasDirection(statement)

      omissions.push({
        id: uuidv4(),
        category,
        severity: determineSeverity(category, biasDirection),
        sourceDocumentId: source.id,
        targetDocumentId: target.id,
        omittedContent: statement,
        context: `This statement from "${source.name}" was not included in "${target.name}"`,
        biasDirection,
        impact: `Omission of ${category} information may affect understanding of the case.`,
      })
    }
  }

  return omissions.slice(0, 20) // Limit results
}

/**
 * Extract significant statements from content
 */
function extractSignificantStatements(content: string): string[] {
  const statements: string[] = []

  // Split into sentences
  const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 30)

  // Look for significant patterns
  const significantPatterns = [
    /however|but|although|despite|contrary/i,
    /did not|was not|were not|hadn't|hasn't|haven't/i,
    /no evidence|no indication|no record/i,
    /cleared|exonerated|innocent|acquitted/i,
    /cooperat|complian|voluntary/i,
    /prior to|before|after|during/i,
  ]

  for (const sentence of sentences) {
    for (const pattern of significantPatterns) {
      if (pattern.test(sentence)) {
        statements.push(sentence)
        break
      }
    }
  }

  return statements.slice(0, 50) // Limit for performance
}

/**
 * Extract key words from a statement
 */
function extractKeyWords(statement: string): string[] {
  const words = statement.split(/\s+/)
  return words.filter(word => word.length > 5 && !/^(the|and|but|for|are|was|were|been|have|has|had|not|with|from|this|that|which|their|there|about|would|could|should)$/i.test(word))
}

/**
 * Categorize the type of omission
 */
function categorizeOmission(statement: string): OmissionCategory {
  const lower = statement.toLowerCase()

  if (/cleared|innocent|exonerat|no evidence|did not|was not|cooperat/i.test(lower)) {
    return 'exculpatory'
  }
  if (/howeve|but|although|context|background/i.test(lower)) {
    return 'contextual'
  }
  if (/procedure|process|protocol|policy|require/i.test(lower)) {
    return 'procedural'
  }
  if (/before|after|prior|during|timeline|sequence/i.test(lower)) {
    return 'temporal'
  }
  if (/contrary|contradict|inconsistent|differ/i.test(lower)) {
    return 'contradicting'
  }

  return 'contextual'
}

/**
 * Determine bias direction of omission
 */
function determineBiasDirection(statement: string): 'prosecution' | 'defense' | 'neutral' {
  const lower = statement.toLowerCase()

  // Omitting exculpatory evidence favors prosecution
  if (/cleared|innocent|exonerat|no evidence|did not|was not|cooperat|comply|voluntary/i.test(lower)) {
    return 'prosecution'
  }

  // Omitting incriminating context favors defense
  if (/previous|prior offens|history of|pattern of|refused|failed to/i.test(lower)) {
    return 'defense'
  }

  return 'neutral'
}

/**
 * Determine severity based on category and bias
 */
function determineSeverity(category: OmissionCategory, biasDirection: 'prosecution' | 'defense' | 'neutral'): Severity {
  if (category === 'exculpatory' && biasDirection === 'prosecution') {
    return 'critical'
  }
  if (category === 'contradicting') {
    return 'high'
  }
  if (biasDirection !== 'neutral') {
    return 'medium'
  }
  return 'low'
}
