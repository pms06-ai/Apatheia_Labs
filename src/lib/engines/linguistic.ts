/**
 * LINGUISTIC ANALYSIS ENGINE (Λγ)
 * "Language Patterns"
 *
 * Analyzes linguistic patterns, hedging language, certainty markers,
 * modal verbs, and sentiment shifts across documents. Detects when
 * language subtly shifts to favor one narrative.
 *
 * Core Question: How does language choice reveal bias or uncertainty?
 *
 * Status: PLANNED - Stub implementation
 */

import type { Document } from '@/CONTRACT'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hedging language detection
 */
export interface HedgingAnalysis {
  /** Document ID */
  documentId: string
  /** Author/source */
  author?: string
  /** Total hedging instances */
  hedgingCount: number
  /** Hedging density (per 1000 words) */
  hedgingDensity: number
  /** Hedging instances */
  instances: {
    text: string
    type: 'epistemic' | 'approximator' | 'shield' | 'attribution'
    context: string
    position: number
  }[]
  /** Topics with most hedging */
  hedgedTopics: { topic: string; count: number }[]
}

/**
 * Certainty marker analysis
 */
export interface CertaintyAnalysis {
  /** Document ID */
  documentId: string
  /** Overall certainty score (0-1) */
  certaintyScore: number
  /** Certainty markers found */
  markers: {
    text: string
    type: 'high_certainty' | 'moderate_certainty' | 'low_certainty'
    claim: string
  }[]
  /** Certainty by topic */
  certaintyByTopic: Record<string, number>
  /** Mismatched certainty (high certainty with weak evidence) */
  mismatches: {
    claim: string
    statedCertainty: 'high' | 'moderate' | 'low'
    evidenceStrength: 'strong' | 'moderate' | 'weak' | 'none'
  }[]
}

/**
 * Sentiment analysis per entity/topic
 */
export interface SentimentAnalysis {
  /** Document ID */
  documentId: string
  /** Overall document sentiment */
  overallSentiment: number // -1 to 1
  /** Sentiment toward specific entities */
  entitySentiment: {
    entityId: string
    entityName: string
    sentiment: number
    mentions: number
    examples: string[]
  }[]
  /** Sentiment shifts within document */
  sentimentShifts: {
    fromSection: string
    toSection: string
    sentimentChange: number
    possibleCause: string
  }[]
}

/**
 * Modal verb analysis
 */
export interface ModalAnalysis {
  /** Document ID */
  documentId: string
  /** Modal verb usage */
  modals: {
    modal: string
    count: number
    contexts: string[]
    impliedObligation: 'strong' | 'moderate' | 'weak'
  }[]
  /** Obligation language toward parties */
  obligationsByParty: Record<
    string,
    {
      mustCount: number
      shouldCount: number
      mayCount: number
    }
  >
}

/**
 * Linguistic analysis result
 */
export interface LinguisticAnalysisResult {
  /** Case ID */
  caseId: string
  /** Hedging analysis per document */
  hedging: HedgingAnalysis[]
  /** Certainty analysis per document */
  certainty: CertaintyAnalysis[]
  /** Sentiment analysis per document */
  sentiment: SentimentAnalysis[]
  /** Modal verb analysis */
  modals: ModalAnalysis[]
  /** Cross-document patterns */
  patterns: {
    type: 'consistent_hedging' | 'sentiment_shift' | 'certainty_inflation' | 'modal_asymmetry'
    description: string
    affectedDocuments: string[]
    severity: 'low' | 'medium' | 'high'
  }[]
  /** Summary statistics */
  statistics: {
    avgHedgingDensity: number
    avgCertaintyScore: number
    sentimentRange: { min: number; max: number }
    documentsAnalyzed: number
  }
  /** Timestamp */
  analyzedAt: string
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/** Hedging words and phrases by type */
const HEDGING_PATTERNS: Record<HedgingAnalysis['instances'][0]['type'], string[]> = {
  epistemic: [
    'may',
    'might',
    'could',
    'possibly',
    'perhaps',
    'probably',
    'likely',
    'appears',
    'seems',
    'suggest',
    'indicate',
    'believe',
    'think',
  ],
  approximator: [
    'about',
    'approximately',
    'around',
    'roughly',
    'nearly',
    'almost',
    'somewhat',
    'fairly',
    'quite',
    'rather',
    'relatively',
  ],
  shield: [
    'in my opinion',
    'in my view',
    'it seems',
    'it appears',
    'one might argue',
    'it could be said',
    'arguably',
  ],
  attribution: [
    'according to',
    'reportedly',
    'allegedly',
    'it is said',
    'sources suggest',
    'it has been reported',
    'claimed',
  ],
}

/** Certainty markers by level */
const CERTAINTY_MARKERS: Record<
  'high_certainty' | 'moderate_certainty' | 'low_certainty',
  string[]
> = {
  high_certainty: [
    'certainly',
    'definitely',
    'absolutely',
    'undoubtedly',
    'clearly',
    'obviously',
    'without doubt',
    'unquestionably',
    'must',
    'will',
    'is',
    'are',
    'proven',
    'established',
    'confirmed',
  ],
  moderate_certainty: [
    'probably',
    'likely',
    'should',
    'would',
    'expect',
    'believe',
    'consider',
    'think',
    'suggest',
    'indicate',
    'reasonable',
  ],
  low_certainty: [
    'may',
    'might',
    'could',
    'possibly',
    'perhaps',
    'uncertain',
    'unclear',
    'questionable',
    'speculative',
    'hypothetical',
  ],
}

/** Sentiment indicator words */
const SENTIMENT_WORDS = {
  positive: [
    'good',
    'positive',
    'excellent',
    'appropriate',
    'suitable',
    'beneficial',
    'supportive',
    'caring',
    'loving',
    'protective',
    'cooperative',
    'compliant',
  ],
  negative: [
    'bad',
    'negative',
    'poor',
    'inappropriate',
    'unsuitable',
    'harmful',
    'dangerous',
    'neglectful',
    'abusive',
    'hostile',
    'uncooperative',
    'risk',
  ],
}

/** Modal verbs and their obligation strength */
const MODAL_VERBS = {
  strong: ['must', 'shall', 'will', 'need to', 'have to', 'required to'],
  moderate: ['should', 'ought to', 'would', 'expected to'],
  weak: ['may', 'might', 'could', 'can', 'permitted to'],
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length
}

function findAllMatches(text: string, pattern: string): Array<{ text: string; position: number }> {
  const regex = new RegExp(`\\b${pattern}\\b`, 'gi')
  const matches: Array<{ text: string; position: number }> = []
  let match
  while ((match = regex.exec(text)) !== null) {
    matches.push({ text: match[0], position: match.index })
  }
  return matches
}

function extractContext(text: string, position: number, windowSize: number = 50): string {
  const start = Math.max(0, position - windowSize)
  const end = Math.min(text.length, position + windowSize)
  return text.slice(start, end).replace(/\s+/g, ' ').trim()
}

function extractTopics(text: string): string[] {
  // Simple topic extraction - nouns after hedging words
  const sentences = text.split(/[.!?]+/)
  const topics: Record<string, number> = {}

  for (const sentence of sentences) {
    // Extract capitalized words (potential topics/entities)
    const capitalWords = sentence.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g) || []
    capitalWords.forEach(w => {
      topics[w] = (topics[w] || 0) + 1
    })
  }

  return Object.entries(topics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic)
}

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

export const linguisticEngine = {
  /**
   * Run full linguistic analysis
   * Detects hedging, certainty markers, sentiment, and modal verb patterns
   * @param documents - Documents to analyze
   * @param caseId - Case ID
   * @returns Linguistic analysis result
   */
  async analyzeLinguistics(
    documents: Document[],
    caseId: string
  ): Promise<LinguisticAnalysisResult> {
    if (documents.length === 0) {
      return {
        caseId,
        hedging: [],
        certainty: [],
        sentiment: [],
        modals: [],
        patterns: [],
        statistics: {
          avgHedgingDensity: 0,
          avgCertaintyScore: 0.5,
          sentimentRange: { min: 0, max: 0 },
          documentsAnalyzed: 0,
        },
        analyzedAt: new Date().toISOString(),
      }
    }

    // Analyze each document
    const hedging: HedgingAnalysis[] = []
    const certainty: CertaintyAnalysis[] = []
    const sentiment: SentimentAnalysis[] = []
    const modals: ModalAnalysis[] = []

    for (const doc of documents) {
      hedging.push(await this.analyzeHedging(doc))
      certainty.push(await this.analyzeCertainty(doc))
      sentiment.push(await this.analyzeSentiment(doc, []))
      modals.push(await this.analyzeModals(doc))
    }

    // Detect cross-document patterns
    const patterns = this.detectPatterns(hedging, certainty, sentiment, modals)

    // Calculate statistics
    const avgHedgingDensity = hedging.reduce((sum, h) => sum + h.hedgingDensity, 0) / hedging.length
    const avgCertaintyScore =
      certainty.reduce((sum, c) => sum + c.certaintyScore, 0) / certainty.length
    const sentiments = sentiment.map(s => s.overallSentiment)
    const sentimentRange = {
      min: Math.min(...sentiments),
      max: Math.max(...sentiments),
    }

    return {
      caseId,
      hedging,
      certainty,
      sentiment,
      modals,
      patterns,
      statistics: {
        avgHedgingDensity,
        avgCertaintyScore,
        sentimentRange,
        documentsAnalyzed: documents.length,
      },
      analyzedAt: new Date().toISOString(),
    }
  },

  /**
   * Analyze hedging language in document
   */
  async analyzeHedging(document: Document): Promise<HedgingAnalysis> {
    const text = document.extracted_text || ''
    const wordCount = countWords(text)
    const instances: HedgingAnalysis['instances'] = []
    const topicCounts: Record<string, number> = {}

    // Find all hedging instances
    for (const [type, patterns] of Object.entries(HEDGING_PATTERNS) as Array<
      [HedgingAnalysis['instances'][0]['type'], string[]]
    >) {
      for (const pattern of patterns) {
        const matches = findAllMatches(text, pattern)
        for (const match of matches) {
          const context = extractContext(text, match.position, 80)
          instances.push({
            text: match.text,
            type,
            context,
            position: match.position,
          })

          // Track topics near hedging
          const nearbyTopics = extractTopics(context)
          nearbyTopics.forEach(t => {
            topicCounts[t] = (topicCounts[t] || 0) + 1
          })
        }
      }
    }

    const hedgedTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }))

    return {
      documentId: document.id,
      author: document.metadata?.author as string | undefined,
      hedgingCount: instances.length,
      hedgingDensity: wordCount > 0 ? (instances.length / wordCount) * 1000 : 0,
      instances,
      hedgedTopics,
    }
  },

  /**
   * Analyze certainty markers
   */
  async analyzeCertainty(document: Document): Promise<CertaintyAnalysis> {
    const text = document.extracted_text || ''
    const markers: CertaintyAnalysis['markers'] = []
    const certaintyByTopic: Record<string, number> = {}
    const mismatches: CertaintyAnalysis['mismatches'] = []

    let highCount = 0
    let moderateCount = 0
    let lowCount = 0

    // Find certainty markers
    for (const [level, patterns] of Object.entries(CERTAINTY_MARKERS) as Array<
      [CertaintyAnalysis['markers'][0]['type'], string[]]
    >) {
      for (const pattern of patterns) {
        const matches = findAllMatches(text, pattern)
        for (const match of matches) {
          const context = extractContext(text, match.position, 60)
          markers.push({
            text: match.text,
            type: level,
            claim: context,
          })

          if (level === 'high_certainty') highCount++
          else if (level === 'moderate_certainty') moderateCount++
          else lowCount++

          // Track certainty by topic
          const topics = extractTopics(context)
          const certaintyValue =
            level === 'high_certainty' ? 1 : level === 'moderate_certainty' ? 0.5 : 0.2
          topics.forEach(t => {
            if (!certaintyByTopic[t]) certaintyByTopic[t] = 0
            certaintyByTopic[t] = (certaintyByTopic[t] + certaintyValue) / 2
          })
        }
      }
    }

    // Detect mismatches (high certainty with weak evidence language)
    const sentences = text.split(/[.!?]+/)
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase()
      const hasHighCertainty = CERTAINTY_MARKERS.high_certainty.some(m => lower.includes(m))
      const hasWeakEvidence = ['alleged', 'reported', 'claimed', 'suggested', 'appeared'].some(w =>
        lower.includes(w)
      )

      if (hasHighCertainty && hasWeakEvidence) {
        mismatches.push({
          claim: sentence.trim().slice(0, 100),
          statedCertainty: 'high',
          evidenceStrength: 'weak',
        })
      }
    }

    const total = highCount + moderateCount + lowCount
    const certaintyScore =
      total > 0 ? (highCount * 1 + moderateCount * 0.5 + lowCount * 0.2) / total : 0.5

    return {
      documentId: document.id,
      certaintyScore,
      markers,
      certaintyByTopic,
      mismatches,
    }
  },

  /**
   * Analyze sentiment toward entities
   */
  async analyzeSentiment(document: Document, entityIds: string[]): Promise<SentimentAnalysis> {
    const text = document.extracted_text || ''
    let positiveCount = 0
    let negativeCount = 0
    const entitySentiment: SentimentAnalysis['entitySentiment'] = []
    const sentimentShifts: SentimentAnalysis['sentimentShifts'] = []

    // Count overall sentiment
    for (const word of SENTIMENT_WORDS.positive) {
      positiveCount += (text.toLowerCase().match(new RegExp(`\\b${word}\\b`, 'g')) || []).length
    }
    for (const word of SENTIMENT_WORDS.negative) {
      negativeCount += (text.toLowerCase().match(new RegExp(`\\b${word}\\b`, 'g')) || []).length
    }

    const total = positiveCount + negativeCount
    const overallSentiment = total > 0 ? (positiveCount - negativeCount) / total : 0

    // Analyze sentiment per entity (by name patterns)
    const capitalizedNames = text.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g) || []
    const uniqueNames = [...new Set(capitalizedNames)]

    for (const name of uniqueNames.slice(0, 10)) {
      // Find sentences containing this name
      const sentences = text.split(/[.!?]+/).filter(s => s.includes(name))
      if (sentences.length === 0) continue

      let entityPositive = 0
      let entityNegative = 0
      const examples: string[] = []

      for (const sentence of sentences.slice(0, 5)) {
        const lower = sentence.toLowerCase()
        SENTIMENT_WORDS.positive.forEach(w => {
          if (lower.includes(w)) entityPositive++
        })
        SENTIMENT_WORDS.negative.forEach(w => {
          if (lower.includes(w)) entityNegative++
        })
        examples.push(sentence.trim().slice(0, 80))
      }

      const entityTotal = entityPositive + entityNegative
      entitySentiment.push({
        entityId: name.toLowerCase().replace(/\s+/g, '-'),
        entityName: name,
        sentiment: entityTotal > 0 ? (entityPositive - entityNegative) / entityTotal : 0,
        mentions: sentences.length,
        examples,
      })
    }

    // Detect sentiment shifts between sections
    const paragraphs = text.split(/\n\n+/).filter(p => p.length > 50)
    if (paragraphs.length >= 2) {
      for (let i = 1; i < paragraphs.length; i++) {
        const prev = paragraphs[i - 1]
        const curr = paragraphs[i]

        const prevPos = SENTIMENT_WORDS.positive.filter(w => prev.toLowerCase().includes(w)).length
        const prevNeg = SENTIMENT_WORDS.negative.filter(w => prev.toLowerCase().includes(w)).length
        const currPos = SENTIMENT_WORDS.positive.filter(w => curr.toLowerCase().includes(w)).length
        const currNeg = SENTIMENT_WORDS.negative.filter(w => curr.toLowerCase().includes(w)).length

        const prevSent = prevPos + prevNeg > 0 ? (prevPos - prevNeg) / (prevPos + prevNeg) : 0
        const currSent = currPos + currNeg > 0 ? (currPos - currNeg) / (currPos + currNeg) : 0
        const change = currSent - prevSent

        if (Math.abs(change) > 0.3) {
          sentimentShifts.push({
            fromSection: `Paragraph ${i}`,
            toSection: `Paragraph ${i + 1}`,
            sentimentChange: change,
            possibleCause: change > 0 ? 'Shift to positive framing' : 'Shift to negative framing',
          })
        }
      }
    }

    return {
      documentId: document.id,
      overallSentiment,
      entitySentiment,
      sentimentShifts,
    }
  },

  /**
   * Analyze modal verb usage
   */
  async analyzeModals(document: Document): Promise<ModalAnalysis> {
    const text = document.extracted_text || ''
    const modals: ModalAnalysis['modals'] = []
    const obligationsByParty: Record<
      string,
      { mustCount: number; shouldCount: number; mayCount: number }
    > = {}

    // Count each modal type
    for (const [strength, verbs] of Object.entries(MODAL_VERBS) as Array<
      ['strong' | 'moderate' | 'weak', string[]]
    >) {
      for (const verb of verbs) {
        const matches = findAllMatches(text, verb)
        if (matches.length > 0) {
          const contexts = matches.slice(0, 3).map(m => extractContext(text, m.position, 40))
          modals.push({
            modal: verb,
            count: matches.length,
            contexts,
            impliedObligation: strength,
          })

          // Track by party (look for nearby capitalized names)
          for (const match of matches) {
            const context = extractContext(text, match.position, 30)
            const names = context.match(/\b[A-Z][a-z]+\b/g) || []
            const party = names[0] || 'Unknown'

            if (!obligationsByParty[party]) {
              obligationsByParty[party] = { mustCount: 0, shouldCount: 0, mayCount: 0 }
            }

            if (strength === 'strong') obligationsByParty[party].mustCount++
            else if (strength === 'moderate') obligationsByParty[party].shouldCount++
            else obligationsByParty[party].mayCount++
          }
        }
      }
    }

    return {
      documentId: document.id,
      modals,
      obligationsByParty,
    }
  },

  /**
   * Detect cross-document linguistic patterns
   */
  detectPatterns(
    hedging: HedgingAnalysis[],
    certainty: CertaintyAnalysis[],
    sentiment: SentimentAnalysis[],
    _modals: ModalAnalysis[]
  ): LinguisticAnalysisResult['patterns'] {
    const patterns: LinguisticAnalysisResult['patterns'] = []

    // Check for consistent hedging
    const hedgingDocs = hedging.filter(h => h.hedgingDensity > 5)
    if (hedgingDocs.length >= 2) {
      patterns.push({
        type: 'consistent_hedging',
        description: `${hedgingDocs.length} documents show elevated hedging language`,
        affectedDocuments: hedgingDocs.map(h => h.documentId),
        severity: hedgingDocs.length > 3 ? 'high' : 'medium',
      })
    }

    // Check for certainty inflation (low certainty becoming high)
    const certaintyScores = certainty.map(c => c.certaintyScore)
    if (certaintyScores.length >= 2) {
      const firstHalf = certaintyScores.slice(0, Math.floor(certaintyScores.length / 2))
      const secondHalf = certaintyScores.slice(Math.floor(certaintyScores.length / 2))
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

      if (avgSecond - avgFirst > 0.2) {
        patterns.push({
          type: 'certainty_inflation',
          description: 'Certainty level increases across documents without new evidence',
          affectedDocuments: certainty.map(c => c.documentId),
          severity: 'high',
        })
      }
    }

    // Check for sentiment shifts
    const sentimentScores = sentiment.map(s => s.overallSentiment)
    if (sentimentScores.length >= 2) {
      const range = Math.max(...sentimentScores) - Math.min(...sentimentScores)
      if (range > 0.5) {
        patterns.push({
          type: 'sentiment_shift',
          description: `Significant sentiment variation (range: ${range.toFixed(2)})`,
          affectedDocuments: sentiment.map(s => s.documentId),
          severity: range > 0.7 ? 'high' : 'medium',
        })
      }
    }

    return patterns
  },
}

export default linguisticEngine
