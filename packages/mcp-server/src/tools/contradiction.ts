/**
 * Contradiction Analysis Tool
 *
 * Detects contradictions using 8-type CASCADE methodology
 */

import { getDocumentsByIds, getDocumentContent, storeFindings } from '../db/connection.js'
import type { CascadeType, ContradictionFinding, ContradictionAnalysisResult, Severity } from '../types/index.js'
import { v4 as uuidv4 } from 'uuid'

interface DocumentWithContent {
  id: string
  name: string
  type: string
  date: string
  content: string
}

/**
 * Analyze documents for contradictions
 */
export async function analyzeContradictions(
  documentIds?: string[],
  cascadeTypes?: CascadeType[],
  caseId?: string,
  content?: string
): Promise<ContradictionAnalysisResult> {
  const startTime = Date.now()
  let docsWithContent: DocumentWithContent[] = []

  // If direct content provided, use it
  if (content) {
    docsWithContent = [{
      id: 'inline-content',
      name: 'Selected Text',
      type: 'user-selection',
      date: new Date().toISOString(),
      content: content.slice(0, 50000),
    }]
  } else if (documentIds && documentIds.length > 0) {
    // Get documents from database
    const docs = getDocumentsByIds(documentIds)
    if (docs.length === 0) {
      return {
        contradictions: [],
        claimClusters: [],
        summary: {
          totalContradictions: 0,
          criticalCount: 0,
          mostContradictedTopics: [],
          credibilityImpact: 'none',
        },
      }
    }

    // Get content for each document
    docsWithContent = docs.map(doc => ({
      id: doc.id,
      name: doc.filename,
      type: doc.doc_type,
      date: doc.created_at,
      content: getDocumentContent(doc.id).slice(0, 50000),
    }))
  } else {
    // No content or document IDs provided
    return {
      contradictions: [],
      claimClusters: [],
      summary: {
        totalContradictions: 0,
        criticalCount: 0,
        mostContradictedTopics: [],
        credibilityImpact: 'none',
      },
    }
  }

  // Analyze contradictions (simplified version - in production, this calls Claude API)
  const contradictions = await detectContradictionsInContent(docsWithContent, cascadeTypes)

  // Calculate summary
  const criticalCount = contradictions.filter(c => c.severity === 'critical').length
  const highCount = contradictions.filter(c => c.severity === 'high').length

  let credibilityImpact: 'severe' | 'moderate' | 'minor' | 'none' = 'none'
  if (criticalCount >= 3 || (criticalCount >= 1 && highCount >= 3)) {
    credibilityImpact = 'severe'
  } else if (criticalCount >= 1 || highCount >= 3) {
    credibilityImpact = 'moderate'
  } else if (highCount >= 1 || contradictions.length >= 3) {
    credibilityImpact = 'minor'
  }

  // Extract topics from contradictions
  const topics = extractTopicsFromContradictions(contradictions)

  const result: ContradictionAnalysisResult = {
    contradictions,
    claimClusters: [], // Would be populated by full analysis
    summary: {
      totalContradictions: contradictions.length,
      criticalCount,
      mostContradictedTopics: topics.slice(0, 5),
      credibilityImpact,
    },
  }

  // Store findings if case ID provided
  if (caseId && contradictions.length > 0) {
    const findings = contradictions.map(c => ({
      id: c.id,
      case_id: caseId,
      engine: 'contradiction',
      finding_type: c.type,
      title: `${c.type} contradiction: ${c.explanation.slice(0, 50)}...`,
      description: c.explanation,
      severity: c.severity,
      confidence: 0.8,
      document_ids: JSON.stringify([c.claim1.documentId, c.claim2.documentId]),
      evidence: JSON.stringify({
        type: c.type,
        cascadeType: c.cascadeType,
        claim1: c.claim1,
        claim2: c.claim2,
        implication: c.implication,
      }),
    }))
    storeFindings(findings)
  }

  console.error(`[contradiction] Analysis complete in ${Date.now() - startTime}ms. Found ${contradictions.length} contradictions.`)

  return result
}

/**
 * Detect contradictions in document content
 * In production, this would call Claude API for deep analysis
 */
async function detectContradictionsInContent(
  docs: DocumentWithContent[],
  cascadeTypes?: CascadeType[]
): Promise<ContradictionFinding[]> {
  const contradictions: ContradictionFinding[] = []

  // Simple heuristic-based detection for now
  // In production, this would use Claude API with the full prompt

  // Look for temporal contradictions
  const datePatterns = docs.map(doc => ({
    doc,
    dates: extractDates(doc.content),
  }))

  // Cross-document comparison
  for (let i = 0; i < docs.length; i++) {
    for (let j = i + 1; j < docs.length; j++) {
      const doc1 = docs[i]
      const doc2 = docs[j]

      // Look for direct contradictions (negations)
      const directContradictions = findDirectContradictions(doc1, doc2)
      for (const dc of directContradictions) {
        if (!cascadeTypes || cascadeTypes.includes('INTER_DOC')) {
          contradictions.push({
            id: uuidv4(),
            type: 'direct',
            cascadeType: 'INTER_DOC',
            severity: 'high',
            claim1: {
              documentId: doc1.id,
              documentName: doc1.name,
              text: dc.claim1,
            },
            claim2: {
              documentId: doc2.id,
              documentName: doc2.name,
              text: dc.claim2,
            },
            explanation: dc.explanation,
            implication: 'These statements cannot both be true, undermining at least one document\'s credibility.',
            suggestedResolution: 'Cross-reference with independent evidence.',
          })
        }
      }

      // Look for temporal contradictions
      const temporalContradictions = findTemporalContradictions(doc1, doc2)
      for (const tc of temporalContradictions) {
        if (!cascadeTypes || cascadeTypes.includes('TEMPORAL')) {
          contradictions.push({
            id: uuidv4(),
            type: 'temporal',
            cascadeType: 'TEMPORAL',
            severity: tc.severity,
            claim1: {
              documentId: doc1.id,
              documentName: doc1.name,
              text: tc.claim1,
            },
            claim2: {
              documentId: doc2.id,
              documentName: doc2.name,
              text: tc.claim2,
            },
            explanation: tc.explanation,
            implication: 'Timeline inconsistency suggests unreliable account.',
            suggestedResolution: 'Verify with contemporaneous records.',
          })
        }
      }
    }
  }

  return contradictions
}

/**
 * Find direct contradictions between two documents
 */
function findDirectContradictions(
  doc1: DocumentWithContent,
  doc2: DocumentWithContent
): { claim1: string; claim2: string; explanation: string }[] {
  const results: { claim1: string; claim2: string; explanation: string }[] = []

  // Simple sentence extraction
  const sentences1 = doc1.content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20)
  const sentences2 = doc2.content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20)

  // Look for contradictory statements about same subjects
  for (const s1 of sentences1.slice(0, 100)) { // Limit for performance
    for (const s2 of sentences2.slice(0, 100)) {
      // Check if sentences discuss similar subjects
      const words1 = new Set(s1.toLowerCase().split(/\s+/).filter(w => w.length > 4))
      const words2 = new Set(s2.toLowerCase().split(/\s+/).filter(w => w.length > 4))
      const overlap = [...words1].filter(w => words2.has(w))

      if (overlap.length >= 3) {
        // Check for negation pattern
        if ((s1.includes(' not ') || s1.includes("n't")) !== (s2.includes(' not ') || s2.includes("n't"))) {
          results.push({
            claim1: s1.slice(0, 200),
            claim2: s2.slice(0, 200),
            explanation: `These statements about "${overlap.slice(0, 3).join(', ')}" appear to contradict each other.`,
          })
        }
      }
    }
  }

  return results.slice(0, 10) // Limit results
}

/**
 * Find temporal contradictions between two documents
 */
function findTemporalContradictions(
  doc1: DocumentWithContent,
  doc2: DocumentWithContent
): { claim1: string; claim2: string; explanation: string; severity: Severity }[] {
  const results: { claim1: string; claim2: string; explanation: string; severity: Severity }[] = []

  // Extract date references
  const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/gi

  const dates1 = [...doc1.content.matchAll(datePattern)]
  const dates2 = [...doc2.content.matchAll(datePattern)]

  // Look for the same event with different dates
  // This is a simplified version - production would use NLP

  return results
}

/**
 * Extract dates from content
 */
function extractDates(content: string): string[] {
  const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/gi
  const matches = content.matchAll(datePattern)
  return [...matches].map(m => m[0])
}

/**
 * Extract topics from contradictions
 */
function extractTopicsFromContradictions(contradictions: ContradictionFinding[]): string[] {
  const topics: Map<string, number> = new Map()

  for (const c of contradictions) {
    // Extract key nouns/subjects from explanation
    const words = c.explanation.toLowerCase().split(/\s+/)
    for (const word of words) {
      if (word.length > 5) {
        topics.set(word, (topics.get(word) || 0) + 1)
      }
    }
  }

  // Sort by frequency
  return [...topics.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic)
}
