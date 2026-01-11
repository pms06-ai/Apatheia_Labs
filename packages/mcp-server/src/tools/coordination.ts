/**
 * Coordination Detection Tool
 *
 * Detect hidden coordination between supposedly independent institutions
 */

import { getDocumentsByIds, getDocumentContent, storeFindings } from '../db/connection.js'
import { v4 as uuidv4 } from 'uuid'

export interface SharedLanguageFinding {
  id: string
  phrase: string
  occurrences: { documentId: string; context: string }[]
  significance: 'high' | 'medium' | 'low'
  explanation: string
}

export interface InformationFlowFinding {
  id: string
  fromDocument: string
  toDocument: string
  information: string
  timeGap: string
  suspicionLevel: 'high' | 'medium' | 'low'
}

export interface CoordinationAnalysisResult {
  sharedLanguage: SharedLanguageFinding[]
  informationFlows: InformationFlowFinding[]
  circularReferences: { claim: string; documents: string[] }[]
  summary: {
    coordinationIndicators: number
    sharedPhrases: number
    suspiciousFlows: number
    overallAssessment: 'strong_coordination' | 'possible_coordination' | 'independent'
  }
}

/**
 * Analyze documents for coordination patterns
 */
export async function analyzeCoordination(
  documentIds?: string[],
  caseId?: string,
  content?: string
): Promise<CoordinationAnalysisResult> {
  const startTime = Date.now()

  // Coordination analysis requires multiple documents
  // For direct content, we return empty result
  if (content || !documentIds || documentIds.length < 2) {
    return {
      sharedLanguage: [],
      informationFlows: [],
      circularReferences: [],
      summary: {
        coordinationIndicators: 0,
        sharedPhrases: 0,
        suspiciousFlows: 0,
        overallAssessment: 'independent',
      },
    }
  }

  const docs = getDocumentsByIds(documentIds)
  if (docs.length < 2) {
    return {
      sharedLanguage: [],
      informationFlows: [],
      circularReferences: [],
      summary: {
        coordinationIndicators: 0,
        sharedPhrases: 0,
        suspiciousFlows: 0,
        overallAssessment: 'independent',
      },
    }
  }

  // Get content for all documents
  const docsWithContent = docs.map(d => ({
    id: d.id,
    name: d.filename,
    date: d.created_at,
    type: d.doc_type,
    content: getDocumentContent(d.id),
  }))

  // Find shared language
  const sharedLanguage = findSharedLanguage(docsWithContent)

  // Detect information flows
  const informationFlows = detectInformationFlows(docsWithContent)

  // Find circular references
  const circularReferences = findCircularReferences(docsWithContent)

  // Calculate overall assessment
  const indicators = sharedLanguage.filter(s => s.significance === 'high').length +
    informationFlows.filter(f => f.suspicionLevel === 'high').length +
    circularReferences.length

  let overallAssessment: 'strong_coordination' | 'possible_coordination' | 'independent' = 'independent'
  if (indicators >= 5) overallAssessment = 'strong_coordination'
  else if (indicators >= 2) overallAssessment = 'possible_coordination'

  const result: CoordinationAnalysisResult = {
    sharedLanguage,
    informationFlows,
    circularReferences,
    summary: {
      coordinationIndicators: indicators,
      sharedPhrases: sharedLanguage.length,
      suspiciousFlows: informationFlows.filter(f => f.suspicionLevel === 'high').length,
      overallAssessment,
    },
  }

  // Store findings
  if (caseId && (sharedLanguage.length > 0 || informationFlows.length > 0)) {
    const findings: Parameters<typeof storeFindings>[0] = []

    for (const sl of sharedLanguage.filter(s => s.significance === 'high').slice(0, 5)) {
      findings.push({
        id: sl.id,
        case_id: caseId,
        engine: 'coordination',
        finding_type: 'shared_language',
        title: `Shared phrase: "${sl.phrase.slice(0, 30)}..."`,
        description: sl.explanation,
        severity: sl.significance === 'high' ? 'high' : 'medium',
        confidence: 0.7,
        document_ids: JSON.stringify(sl.occurrences.map(o => o.documentId)),
        evidence: JSON.stringify({ phrase: sl.phrase, occurrences: sl.occurrences.length }),
      })
    }

    for (const flow of informationFlows.filter(f => f.suspicionLevel === 'high').slice(0, 5)) {
      findings.push({
        id: flow.id,
        case_id: caseId,
        engine: 'coordination',
        finding_type: 'information_flow',
        title: `Suspicious information flow`,
        description: `Information appeared in ${flow.toDocument} ${flow.timeGap} after ${flow.fromDocument}`,
        severity: 'high',
        confidence: 0.65,
        document_ids: JSON.stringify([flow.fromDocument, flow.toDocument]),
        evidence: JSON.stringify({ information: flow.information, timeGap: flow.timeGap }),
      })
    }

    if (findings.length > 0) {
      storeFindings(findings)
    }
  }

  console.error(`[coordination] Analysis complete in ${Date.now() - startTime}ms. Found ${indicators} coordination indicators.`)

  return result
}

/**
 * Find shared unusual phrases across documents
 */
function findSharedLanguage(docs: { id: string; name: string; content: string }[]): SharedLanguageFinding[] {
  const findings: SharedLanguageFinding[] = []

  // Extract n-grams from each document
  const docNgrams: Map<string, Map<string, string[]>> = new Map()

  for (const doc of docs) {
    const ngrams = extractNgrams(doc.content, 4, 8)
    docNgrams.set(doc.id, ngrams)
  }

  // Find ngrams that appear in multiple documents
  const sharedNgrams: Map<string, { documentId: string; context: string }[]> = new Map()

  for (const [docId, ngrams] of docNgrams) {
    for (const [ngram, contexts] of ngrams) {
      // Check if this ngram appears in other documents
      for (const [otherDocId, otherNgrams] of docNgrams) {
        if (docId !== otherDocId && otherNgrams.has(ngram)) {
          if (!sharedNgrams.has(ngram)) {
            sharedNgrams.set(ngram, [])
          }

          const existing = sharedNgrams.get(ngram)!
          if (!existing.some(o => o.documentId === docId)) {
            existing.push({ documentId: docId, context: contexts[0] || '' })
          }
          if (!existing.some(o => o.documentId === otherDocId)) {
            const otherContexts = otherNgrams.get(ngram)
            existing.push({ documentId: otherDocId, context: otherContexts?.[0] || '' })
          }
        }
      }
    }
  }

  // Filter to significant shared phrases
  for (const [phrase, occurrences] of sharedNgrams) {
    if (occurrences.length >= 2 && !isCommonPhrase(phrase)) {
      const significance = occurrences.length >= 3 ? 'high' :
        phrase.split(' ').length >= 6 ? 'high' : 'medium'

      findings.push({
        id: uuidv4(),
        phrase,
        occurrences,
        significance,
        explanation: `Identical phrase appears in ${occurrences.length} documents from different sources`,
      })
    }
  }

  return findings.sort((a, b) => {
    const sigOrder = { high: 0, medium: 1, low: 2 }
    return sigOrder[a.significance] - sigOrder[b.significance]
  }).slice(0, 20)
}

/**
 * Extract n-grams from text
 */
function extractNgrams(text: string, minWords: number, maxWords: number): Map<string, string[]> {
  const ngrams: Map<string, string[]> = new Map()
  const sentences = text.split(/[.!?]+/).map(s => s.trim().toLowerCase())

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/)

    for (let n = minWords; n <= maxWords; n++) {
      for (let i = 0; i <= words.length - n; i++) {
        const ngram = words.slice(i, i + n).join(' ')
        if (ngram.length >= 20) {
          if (!ngrams.has(ngram)) {
            ngrams.set(ngram, [])
          }
          ngrams.get(ngram)!.push(sentence)
        }
      }
    }
  }

  return ngrams
}

/**
 * Check if phrase is common legal/professional language
 */
function isCommonPhrase(phrase: string): boolean {
  const commonPhrases = [
    'in accordance with',
    'with respect to',
    'in relation to',
    'on the basis of',
    'for the purposes of',
    'in the matter of',
    'at the time of',
    'as a result of',
    'in light of the',
    'it is submitted that',
    'it is noted that',
  ]

  return commonPhrases.some(common => phrase.includes(common))
}

/**
 * Detect suspicious information flows
 */
function detectInformationFlows(
  docs: { id: string; name: string; date: string; content: string }[]
): InformationFlowFinding[] {
  const flows: InformationFlowFinding[] = []

  // Sort by date
  const sorted = [...docs].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Look for information appearing in later documents that references earlier ones
  for (let i = 0; i < sorted.length - 1; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const earlier = sorted[i]
      const later = sorted[j]

      // Find specific claims that appear in both
      const earlierClaims = extractClaims(earlier.content)
      const laterContent = later.content.toLowerCase()

      for (const claim of earlierClaims) {
        const claimWords = claim.toLowerCase().split(/\s+/).filter(w => w.length > 5)
        const matches = claimWords.filter(w => laterContent.includes(w))

        if (matches.length >= 4 && matches.length >= claimWords.length * 0.7) {
          const timeDiff = new Date(later.date).getTime() - new Date(earlier.date).getTime()
          const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24))

          // Suspicious if very quick turnaround
          const suspicionLevel = daysDiff < 7 ? 'high' : daysDiff < 30 ? 'medium' : 'low'

          flows.push({
            id: uuidv4(),
            fromDocument: earlier.id,
            toDocument: later.id,
            information: claim.slice(0, 200),
            timeGap: `${daysDiff} days`,
            suspicionLevel,
          })
        }
      }
    }
  }

  return flows.slice(0, 15)
}

/**
 * Extract claims from content
 */
function extractClaims(content: string): string[] {
  const claims: string[] = []
  const sentences = content.split(/[.!?]+/).map(s => s.trim())

  for (const sentence of sentences) {
    if (sentence.length > 50 && /stated|claimed|reported|alleged|confirmed|determined|concluded/i.test(sentence)) {
      claims.push(sentence.slice(0, 300))
    }
  }

  return claims.slice(0, 30)
}

/**
 * Find circular references between documents
 */
function findCircularReferences(docs: { id: string; name: string; content: string }[]): { claim: string; documents: string[] }[] {
  const circularRefs: { claim: string; documents: string[] }[] = []

  // Look for citations that form cycles
  // This is simplified - production would use NLP

  return circularRefs
}
