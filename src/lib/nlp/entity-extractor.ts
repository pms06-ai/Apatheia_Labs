/**
 * ENTITY EXTRACTOR
 *
 * Rule-based entity extraction using Compromise NLP library.
 * Extracts people, organizations, places, and other named entities
 * from document text with position tracking and context extraction.
 */

import nlp from 'compromise'
import { normalizeName, detectRoleReference, generateNameVariants } from './name-normalizer'

/**
 * Types of entities that can be extracted
 */
export type ExtractedEntityType = 'person' | 'organization' | 'professional' | 'court' | 'place'

/**
 * Position information for an entity mention in text
 */
export interface TextPosition {
  /** Character offset from start of text */
  start: number
  /** Character offset for end of mention */
  end: number
}

/**
 * A single mention of an entity in text
 */
export interface EntityMention {
  /** The exact text as it appears in the document */
  text: string
  /** Normalized form for matching */
  normalizedText: string
  /** Position in the source text */
  position: TextPosition
  /** Surrounding context (sentence or nearby text) */
  context: string
  /** Confidence score for this mention (0-1) */
  confidence: number
}

/**
 * An extracted entity with all its mentions
 */
export interface ExtractedEntity {
  /** Unique identifier for this entity */
  id: string
  /** The canonical (most common/complete) form of the name */
  canonicalName: string
  /** Type of entity */
  type: ExtractedEntityType
  /** Role if detected (e.g., 'social_worker', 'judge') */
  role?: string
  /** All mentions of this entity */
  mentions: EntityMention[]
  /** All name variants found */
  aliases: string[]
  /** Overall confidence score (0-1) */
  confidence: number
}

/**
 * Result from entity extraction
 */
export interface ExtractionResult {
  /** All extracted entities */
  entities: ExtractedEntity[]
  /** Summary statistics */
  summary: {
    totalEntities: number
    peopleCount: number
    organizationCount: number
    professionalCount: number
    courtCount: number
    placeCount: number
  }
  /** Processing metadata */
  metadata: {
    textLength: number
    processingTimeMs: number
    extractionMethod: 'compromise'
  }
}

/**
 * Options for entity extraction
 */
export interface ExtractionOptions {
  /** Minimum confidence threshold (0-1). Default: 0.3 */
  minConfidence?: number
  /** Include place entities. Default: false */
  includePlaces?: boolean
  /** Context window size in characters. Default: 100 */
  contextWindow?: number
  /** Document ID for tracking mentions */
  documentId?: string
}

/**
 * Default extraction options
 */
export const DEFAULT_EXTRACTION_OPTIONS: ExtractionOptions = {
  minConfidence: 0.3,
  includePlaces: false,
  contextWindow: 100,
  documentId: undefined,
}

/**
 * Professional title patterns that indicate professional entity type
 */
const PROFESSIONAL_INDICATORS = [
  'dr',
  'doctor',
  'professor',
  'prof',
  'judge',
  'sw',
  'social worker',
  'psychologist',
  'psychiatrist',
  'barrister',
  'solicitor',
  'counsel',
  'qc',
  'guardian',
  'cafcass',
  'expert',
  'officer',
]

/**
 * Court and legal organization patterns
 */
const COURT_PATTERNS = [
  'court',
  'tribunal',
  'family court',
  'high court',
  'magistrate',
  'crown court',
  'county court',
  'supreme court',
]

/**
 * Generate a unique ID for an entity
 */
function generateEntityId(type: ExtractedEntityType, index: number): string {
  return `ext-${type.charAt(0)}-${Date.now().toString(36)}-${index}`
}

/**
 * Extract context around a position in text
 */
function extractContext(
  text: string,
  start: number,
  end: number,
  windowSize: number = 100
): string {
  const contextStart = Math.max(0, start - windowSize)
  const contextEnd = Math.min(text.length, end + windowSize)

  let context = text.slice(contextStart, contextEnd)

  // Add ellipsis if truncated
  if (contextStart > 0) {
    context = '...' + context
  }
  if (contextEnd < text.length) {
    context = context + '...'
  }

  // Clean up whitespace
  return context.replace(/\s+/g, ' ').trim()
}

/**
 * Calculate confidence score for a mention based on various factors
 */
function calculateMentionConfidence(
  text: string,
  type: ExtractedEntityType,
  hasTitle: boolean
): number {
  let confidence = 0.6 // Base confidence

  // Boost for longer names (more specific)
  const wordCount = text.split(/\s+/).length
  if (wordCount >= 2) {
    confidence += 0.15
  }
  if (wordCount >= 3) {
    confidence += 0.05
  }

  // Boost for professional indicators
  if (hasTitle) {
    confidence += 0.1
  }

  // Boost for specific entity types with clear patterns
  if (type === 'professional') {
    confidence += 0.05
  }
  if (type === 'court') {
    confidence += 0.1
  }

  // Penalize very short names
  if (text.length < 4) {
    confidence -= 0.2
  }

  // Clamp to 0-1 range
  return Math.max(0, Math.min(1, confidence))
}

/**
 * Determine entity type based on text patterns and Compromise tags
 */
function determineEntityType(text: string, isOrganization: boolean): ExtractedEntityType {
  const lowerText = text.toLowerCase()

  // Check for court patterns
  for (const pattern of COURT_PATTERNS) {
    if (lowerText.includes(pattern)) {
      return 'court'
    }
  }

  // Check for professional indicators
  for (const indicator of PROFESSIONAL_INDICATORS) {
    if (lowerText.includes(indicator)) {
      return 'professional'
    }
  }

  // Use Compromise's detection
  if (isOrganization) {
    return 'organization'
  }

  return 'person'
}

/**
 * Check if text contains a professional title
 */
function hasProfessionalTitle(text: string): boolean {
  const lowerText = text.toLowerCase()
  return PROFESSIONAL_INDICATORS.some(
    indicator =>
      lowerText.startsWith(indicator + ' ') ||
      lowerText.startsWith(indicator + '.') ||
      lowerText.includes(' ' + indicator + ' ')
  )
}

/**
 * Find the position of a mention in the original text
 * Handles case-insensitive matching
 */
function findMentionPosition(
  text: string,
  mention: string,
  startFrom: number = 0
): TextPosition | null {
  const lowerText = text.toLowerCase()
  const lowerMention = mention.toLowerCase()

  const start = lowerText.indexOf(lowerMention, startFrom)
  if (start === -1) {
    return null
  }

  return {
    start,
    end: start + mention.length,
  }
}

/**
 * Group mentions that refer to the same entity
 * Uses name normalization and variant matching
 */
function groupMentions(
  mentions: Array<{
    text: string
    type: ExtractedEntityType
    position: TextPosition
    context: string
    confidence: number
  }>
): Map<string, typeof mentions> {
  const groups = new Map<string, typeof mentions>()
  const processedNormalizations = new Map<string, string>() // Maps normalized name to group key

  for (const mention of mentions) {
    const normalized = normalizeName(mention.text)

    // Check if we've seen this normalization or a variant
    let foundGroup = processedNormalizations.get(normalized)

    if (!foundGroup) {
      // Check against existing groups for variant matches
      const variants = generateNameVariants(mention.text)
      for (const [groupKey] of groups) {
        const groupNormalized = normalizeName(groupKey)
        const groupVariants = generateNameVariants(groupKey)

        // Check if any variants match
        const hasMatch =
          variants.some(v => groupVariants.includes(v)) ||
          normalized === groupNormalized ||
          variants.includes(groupNormalized) ||
          groupVariants.includes(normalized)

        if (hasMatch) {
          foundGroup = groupKey
          break
        }
      }
    }

    if (foundGroup) {
      // Add to existing group
      groups.get(foundGroup)!.push(mention)
      processedNormalizations.set(normalized, foundGroup)
    } else {
      // Create new group
      groups.set(mention.text, [mention])
      processedNormalizations.set(normalized, mention.text)
    }
  }

  return groups
}

/**
 * Select the canonical name from a group of mentions
 * Prefers the longest, most complete version
 */
function selectCanonicalName(mentions: Array<{ text: string }>): string {
  if (mentions.length === 0) return ''

  // Score each mention - prefer longer names without titles
  const scored = mentions.map(m => {
    const normalized = normalizeName(m.text)
    const wordCount = normalized.split(/\s+/).length
    const hasTitle = hasProfessionalTitle(m.text)

    // Prefer multi-word names, but not those that are just titles
    let score = wordCount * 10 + normalized.length
    if (hasTitle && wordCount > 1) {
      score += 5 // Slight bonus for professional names
    }

    return { text: m.text, score }
  })

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score)

  return scored[0].text
}

/**
 * Resolve the primary entity type from mentions.
 */
function resolveEntityType(mentions: Array<{ type: ExtractedEntityType }>): ExtractedEntityType {
  if (mentions.some(m => m.type === 'court')) {
    return 'court'
  }
  if (mentions.some(m => m.type === 'professional')) {
    return 'professional'
  }
  if (mentions.some(m => m.type === 'organization')) {
    return 'organization'
  }
  if (mentions.some(m => m.type === 'place')) {
    return 'place'
  }
  return 'person'
}

/**
 * Extract entities from text using Compromise NLP
 *
 * @param text - The text to extract entities from
 * @param options - Extraction options
 * @returns Extraction result with entities and statistics
 *
 * @example
 * const result = extractEntities("Dr. John Smith met with SW Jones at the Family Court.");
 * // Returns entities: Dr. John Smith (professional), SW Jones (professional), Family Court (court)
 */
export function extractEntities(text: string, options: ExtractionOptions = {}): ExtractionResult {
  const startTime = Date.now()
  const opts = { ...DEFAULT_EXTRACTION_OPTIONS, ...options }

  // Handle empty or invalid input
  if (!text || typeof text !== 'string') {
    return {
      entities: [],
      summary: {
        totalEntities: 0,
        peopleCount: 0,
        organizationCount: 0,
        professionalCount: 0,
        courtCount: 0,
        placeCount: 0,
      },
      metadata: {
        textLength: 0,
        processingTimeMs: Date.now() - startTime,
        extractionMethod: 'compromise',
      },
    }
  }

  // Parse text with Compromise
  const doc = nlp(text)

  // Extract different entity types
  const rawMentions: Array<{
    text: string
    type: ExtractedEntityType
    position: TextPosition
    context: string
    confidence: number
  }> = []

  // Track positions we've already processed to avoid duplicates
  const processedPositions = new Set<string>()

  // Extract people
  const people = doc.people().out('array') as string[]
  let searchOffset = 0
  for (const person of people) {
    const position = findMentionPosition(text, person, searchOffset)
    if (position) {
      const posKey = `${position.start}-${position.end}`
      if (!processedPositions.has(posKey)) {
        processedPositions.add(posKey)
        const hasTitle = hasProfessionalTitle(person)
        const type = determineEntityType(person, false)
        const confidence = calculateMentionConfidence(person, type, hasTitle)

        if (confidence >= opts.minConfidence!) {
          rawMentions.push({
            text: person,
            type,
            position,
            context: extractContext(text, position.start, position.end, opts.contextWindow),
            confidence,
          })
        }
        searchOffset = position.end
      }
    }
  }

  // Extract organizations
  searchOffset = 0
  const organizations = doc.organizations().out('array') as string[]
  for (const org of organizations) {
    const position = findMentionPosition(text, org, 0) // Search from beginning for orgs
    if (position) {
      const posKey = `${position.start}-${position.end}`
      if (!processedPositions.has(posKey)) {
        processedPositions.add(posKey)
        const type = determineEntityType(org, true)
        const confidence = calculateMentionConfidence(org, type, hasProfessionalTitle(org))

        if (confidence >= opts.minConfidence!) {
          rawMentions.push({
            text: org,
            type,
            position,
            context: extractContext(text, position.start, position.end, opts.contextWindow),
            confidence,
          })
        }
      }
    }
  }

  // Extract places if requested
  if (opts.includePlaces) {
    const places = doc.places().out('array') as string[]
    for (const place of places) {
      const position = findMentionPosition(text, place, 0)
      if (position) {
        const posKey = `${position.start}-${position.end}`
        if (!processedPositions.has(posKey)) {
          processedPositions.add(posKey)
          const confidence = calculateMentionConfidence(place, 'place', false)

          if (confidence >= opts.minConfidence!) {
            rawMentions.push({
              text: place,
              type: 'place',
              position,
              context: extractContext(text, position.start, position.end, opts.contextWindow),
              confidence,
            })
          }
        }
      }
    }
  }

  // Look for professional title + name patterns (e.g., "SW Jones", "Dr. Smith")
  const professionalTitlePattern =
    /\b(SW|Dr|Professor|Prof|Judge|Hon|Honourable|Honorable|Rev|Father|Sister|Brother|Mr|Mrs|Ms|Miss)\.?\s+([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)?)\b/g
  let titleMatch
  while ((titleMatch = professionalTitlePattern.exec(text)) !== null) {
    const fullMatch = titleMatch[0]
    const title = titleMatch[1].toLowerCase()

    const position = {
      start: titleMatch.index,
      end: titleMatch.index + fullMatch.length,
    }
    const posKey = `${position.start}-${position.end}`

    if (!processedPositions.has(posKey)) {
      processedPositions.add(posKey)

      // Determine role based on title
      let role: string | undefined
      if (title === 'sw') {
        role = 'social_worker'
      } else if (
        title === 'judge' ||
        title === 'hon' ||
        title === 'honourable' ||
        title === 'honorable'
      ) {
        role = 'judge'
      } else if (title === 'dr') {
        role = 'doctor'
      } else if (title === 'prof' || title === 'professor') {
        role = 'professor'
      }

      const isProfessional = [
        'sw',
        'dr',
        'professor',
        'prof',
        'judge',
        'hon',
        'honourable',
        'honorable',
        'rev',
      ].includes(title)

      const confidence = calculateMentionConfidence(
        fullMatch,
        isProfessional ? 'professional' : 'person',
        true
      )

      if (confidence >= opts.minConfidence!) {
        rawMentions.push({
          text: fullMatch,
          type: isProfessional ? 'professional' : 'person',
          position,
          context: extractContext(text, position.start, position.end, opts.contextWindow),
          confidence,
        })
      }
    }
  }

  // Look for court names (e.g., "Family Court", "High Court")
  const courtPattern = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\s+Court)\b/g
  let courtMatch
  while ((courtMatch = courtPattern.exec(text)) !== null) {
    const courtName = courtMatch[1]
    const position = {
      start: courtMatch.index,
      end: courtMatch.index + courtName.length,
    }
    const posKey = `${position.start}-${position.end}`

    if (!processedPositions.has(posKey)) {
      processedPositions.add(posKey)

      const confidence = calculateMentionConfidence(courtName, 'court', false)

      if (confidence >= opts.minConfidence!) {
        rawMentions.push({
          text: courtName,
          type: 'court',
          position,
          context: extractContext(text, position.start, position.end, opts.contextWindow),
          confidence,
        })
      }
    }
  }

  // Group mentions by entity
  const groupedMentions = groupMentions(rawMentions)

  // Convert groups to entities
  const entities: ExtractedEntity[] = []
  let entityIndex = 0

  for (const [_groupKey, mentions] of groupedMentions) {
    const canonicalName = selectCanonicalName(mentions)
    const primaryType = resolveEntityType(mentions)
    const aliases = [...new Set(mentions.map(m => m.text))]

    // Calculate overall confidence as weighted average
    const avgConfidence = mentions.reduce((sum, m) => sum + m.confidence, 0) / mentions.length

    // Detect role from canonical name or aliases
    let role: string | undefined
    for (const alias of aliases) {
      const detectedRole = detectRoleReference(alias)
      if (detectedRole) {
        role = detectedRole
        break
      }
    }

    // Check for professional indicators
    if (!role && primaryType === 'professional') {
      const lowerCanonical = canonicalName.toLowerCase()
      if (lowerCanonical.includes('sw ') || lowerCanonical.includes('social worker')) {
        role = 'social_worker'
      } else if (lowerCanonical.includes('dr') || lowerCanonical.includes('doctor')) {
        role = 'doctor'
      } else if (lowerCanonical.includes('judge')) {
        role = 'judge'
      } else if (lowerCanonical.includes('prof')) {
        role = 'professor'
      }
    }

    const entity: ExtractedEntity = {
      id: generateEntityId(primaryType, entityIndex++),
      canonicalName,
      type: primaryType,
      role,
      mentions: mentions.map(m => ({
        text: m.text,
        normalizedText: normalizeName(m.text),
        position: m.position,
        context: m.context,
        confidence: m.confidence,
      })),
      aliases,
      confidence: avgConfidence,
    }

    entities.push(entity)
  }

  // Sort entities by confidence (highest first)
  entities.sort((a, b) => b.confidence - a.confidence)

  // Calculate summary
  const summary = {
    totalEntities: entities.length,
    peopleCount: entities.filter(e => e.type === 'person').length,
    organizationCount: entities.filter(e => e.type === 'organization').length,
    professionalCount: entities.filter(e => e.type === 'professional').length,
    courtCount: entities.filter(e => e.type === 'court').length,
    placeCount: entities.filter(e => e.type === 'place').length,
  }

  return {
    entities,
    summary,
    metadata: {
      textLength: text.length,
      processingTimeMs: Date.now() - startTime,
      extractionMethod: 'compromise',
    },
  }
}

/**
 * Extract entities from multiple documents
 *
 * @param documents - Array of documents with id and text
 * @param options - Extraction options
 * @returns Combined extraction result with document tracking
 */
export function extractEntitiesFromDocuments(
  documents: Array<{ id: string; text: string }>,
  options: ExtractionOptions = {}
): ExtractionResult {
  const startTime = Date.now()
  const allMentions: Array<{
    text: string
    type: ExtractedEntityType
    position: TextPosition
    context: string
    confidence: number
    documentId: string
  }> = []

  // Extract from each document
  for (const doc of documents) {
    const result = extractEntities(doc.text, options)

    // Add document ID to each mention
    for (const entity of result.entities) {
      for (const mention of entity.mentions) {
        allMentions.push({
          text: mention.text,
          type: entity.type,
          position: mention.position,
          context: mention.context,
          confidence: mention.confidence,
          documentId: doc.id,
        })
      }
    }
  }

  // Regroup across all documents
  const groupedMentions = groupMentions(allMentions)

  // Convert to entities with cross-document tracking
  const entities: ExtractedEntity[] = []
  let entityIndex = 0

  for (const [_groupKey, mentions] of groupedMentions) {
    const canonicalName = selectCanonicalName(mentions)
    const primaryType = resolveEntityType(mentions)
    const aliases = [...new Set(mentions.map(m => m.text))]
    const avgConfidence = mentions.reduce((sum, m) => sum + m.confidence, 0) / mentions.length

    const entity: ExtractedEntity = {
      id: generateEntityId(primaryType, entityIndex++),
      canonicalName,
      type: primaryType,
      mentions: mentions.map(m => ({
        text: m.text,
        normalizedText: normalizeName(m.text),
        position: m.position,
        context: m.context,
        confidence: m.confidence,
      })),
      aliases,
      confidence: avgConfidence,
    }

    entities.push(entity)
  }

  entities.sort((a, b) => b.confidence - a.confidence)

  const totalTextLength = documents.reduce((sum, d) => sum + d.text.length, 0)

  return {
    entities,
    summary: {
      totalEntities: entities.length,
      peopleCount: entities.filter(e => e.type === 'person').length,
      organizationCount: entities.filter(e => e.type === 'organization').length,
      professionalCount: entities.filter(e => e.type === 'professional').length,
      courtCount: entities.filter(e => e.type === 'court').length,
      placeCount: entities.filter(e => e.type === 'place').length,
    },
    metadata: {
      textLength: totalTextLength,
      processingTimeMs: Date.now() - startTime,
      extractionMethod: 'compromise',
    },
  }
}

/**
 * Entity extractor module export
 */
export const entityExtractor = {
  extractEntities,
  extractEntitiesFromDocuments,
  DEFAULT_EXTRACTION_OPTIONS,
}
