/**
 * ENTITY RESOLUTION ENGINE (Ε)
 * "Who's Who Across Documents"
 *
 * Extracts and resolves entities (people, organizations, professionals, courts)
 * across multiple documents using Compromise NLP library.
 * Uses fuzzy matching to identify entity linkages and merge name variations.
 *
 * Core Question: Who are all the people/entities mentioned across documents?
 */

import { extractEntitiesFromDocuments } from '@/lib/nlp/entity-extractor'
import type { ExtractedEntityType } from '@/lib/nlp/entity-extractor'
import type { Document } from '@/CONTRACT'
import {
  fuzzyMatch,
  generateLinkageProposals,
  type MatchOptions,
  type EntityLinkage,
  type MatchAlgorithm,
} from '@/lib/nlp/fuzzy-matcher'

/**
 * A resolved entity with all its mentions across documents
 */
export interface ResolvedEntity {
  /** Unique identifier for this entity */
  id: string
  /** The canonical (most common/complete) form of the name */
  canonicalName: string
  /** Type of entity */
  type: 'person' | 'organization' | 'professional' | 'court'
  /** Role if detected (e.g., 'social_worker', 'judge') */
  role?: string
  /** All mentions of this entity across documents */
  mentions: {
    docId: string
    text: string
    context: string
  }[]
  /** All name variants found */
  aliases: string[]
  /** Confidence score (0-1) */
  confidence: number
}

/**
 * Proposed entity linkage from fuzzy matching
 */
export interface EntityLinkageProposal {
  /** Unique identifier for this linkage */
  id: string
  /** First entity name */
  entity1Name: string
  /** Second entity name */
  entity2Name: string
  /** Confidence score (0-1) */
  confidence: number
  /** Algorithm that identified this linkage */
  algorithm: MatchAlgorithm
  /** Status of the linkage */
  status: 'pending' | 'confirmed' | 'rejected'
  /** Entity IDs linked (after resolution) */
  entityIds: string[]
}

/**
 * Result from entity resolution
 */
export interface EntityResolutionResult {
  /** All resolved entities */
  entities: ResolvedEntity[]
  /** Entity linkages identified by fuzzy matching */
  linkages: EntityLinkageProposal[]
  /** Summary statistics */
  summary: {
    totalEntities: number
    peopleCount: number
    professionalCount: number
    organizationCount: number
    courtCount: number
    /** Number of entity linkages identified */
    linkagesIdentified: number
    /** Number of high-confidence linkages (>0.8) */
    highConfidenceLinkages: number
  }
  /** Processing metadata */
  metadata: {
    textLength: number
    processingTimeMs: number
    extractionMethod: 'compromise'
    /** Whether fuzzy matching was applied */
    fuzzyMatchingApplied: boolean
  }
}

/**
 * Map extracted entity type to resolved entity type
 * Filters out 'place' type as it's not supported in ResolvedEntity
 */
function mapEntityType(type: ExtractedEntityType): ResolvedEntity['type'] | null {
  switch (type) {
    case 'person':
      return 'person'
    case 'organization':
      return 'organization'
    case 'professional':
      return 'professional'
    case 'court':
      return 'court'
    case 'place':
      // Places are not supported in ResolvedEntity
      return null
    default:
      return 'person'
  }
}

/**
 * Convert role format from extractor to human-readable form
 */
function formatRole(role: string | undefined): string | undefined {
  if (!role) return undefined

  const roleMap: Record<string, string> = {
    'social_worker': 'Social Worker',
    'judge': 'Judge',
    'doctor': 'Doctor',
    'professor': 'Professor',
    'psychologist': 'Psychologist',
    'psychiatrist': 'Psychiatrist',
    'barrister': 'Barrister',
    'solicitor': 'Solicitor',
    'guardian': 'Guardian',
  }

  return roleMap[role] || role
}

/**
 * Generate a unique entity ID
 */
function generateEntityId(index: number): string {
  return `ent-${Date.now().toString(36)}-${index}`
}

/**
 * Generate a unique linkage ID
 */
function generateLinkageId(index: number): string {
  return `link-${Date.now().toString(36)}-${index}`
}

/**
 * Fuzzy match options for entity matching
 */
const FUZZY_MATCH_OPTIONS: MatchOptions = {
  minConfidence: 0.5, // Medium confidence threshold for initial matches
  allowPartialMatch: true,
  maxEditDistance: 3,
}

/**
 * Use fuzzy matching to find and merge similar entities
 * Returns merged entities and the linkages that were identified
 */
function applyFuzzyMatching(
  entities: ResolvedEntity[]
): { mergedEntities: ResolvedEntity[]; linkages: EntityLinkageProposal[] } {
  if (entities.length <= 1) {
    return { mergedEntities: entities, linkages: [] }
  }

  const linkages: EntityLinkageProposal[] = []
  let linkageIndex = 0

  // Group entities by type for type-aware matching
  const entitiesByType: Map<string, ResolvedEntity[]> = new Map()
  for (const entity of entities) {
    const typeKey = entity.type
    if (!entitiesByType.has(typeKey)) {
      entitiesByType.set(typeKey, [])
    }
    entitiesByType.get(typeKey)!.push(entity)
  }

  // Union-Find data structure for merging
  const parent: Map<string, string> = new Map()

  function find(id: string): string {
    if (!parent.has(id)) {
      parent.set(id, id)
      return id
    }
    if (parent.get(id) !== id) {
      parent.set(id, find(parent.get(id)!))
    }
    return parent.get(id)!
  }

  function union(id1: string, id2: string): void {
    const root1 = find(id1)
    const root2 = find(id2)
    if (root1 !== root2) {
      parent.set(root2, root1)
    }
  }

  // Initialize parent for all entities
  for (const entity of entities) {
    parent.set(entity.id, entity.id)
  }

  // Find matching entities within each type group
  for (const [_typeKey, typeEntities] of entitiesByType) {
    // Compare all pairs within this type
    for (let i = 0; i < typeEntities.length; i++) {
      for (let j = i + 1; j < typeEntities.length; j++) {
        const entity1 = typeEntities[i]
        const entity2 = typeEntities[j]

        // Determine entity type for matching
        const matchEntityType = entity1.type === 'organization' ? 'organization' : 'person'

        // Try matching canonical names
        const result = fuzzyMatch(
          entity1.canonicalName,
          entity2.canonicalName,
          { ...FUZZY_MATCH_OPTIONS, entityType: matchEntityType }
        )

        if (result.isMatch && result.confidence >= 0.5) {
          // Create linkage proposal
          const linkage: EntityLinkageProposal = {
            id: generateLinkageId(linkageIndex++),
            entity1Name: entity1.canonicalName,
            entity2Name: entity2.canonicalName,
            confidence: result.confidence,
            algorithm: result.algorithm,
            status: result.confidence >= 0.8 ? 'confirmed' : 'pending',
            entityIds: [entity1.id, entity2.id],
          }
          linkages.push(linkage)

          // Merge high-confidence matches automatically
          if (result.confidence >= 0.7) {
            union(entity1.id, entity2.id)
          }
        } else {
          // Also try matching all aliases
          let foundAliasMatch = false
          for (const alias1 of entity1.aliases) {
            if (foundAliasMatch) break
            for (const alias2 of entity2.aliases) {
              const aliasResult = fuzzyMatch(
                alias1,
                alias2,
                { ...FUZZY_MATCH_OPTIONS, entityType: matchEntityType }
              )
              if (aliasResult.isMatch && aliasResult.confidence >= 0.6) {
                const linkage: EntityLinkageProposal = {
                  id: generateLinkageId(linkageIndex++),
                  entity1Name: alias1,
                  entity2Name: alias2,
                  confidence: aliasResult.confidence,
                  algorithm: aliasResult.algorithm,
                  status: aliasResult.confidence >= 0.8 ? 'confirmed' : 'pending',
                  entityIds: [entity1.id, entity2.id],
                }
                linkages.push(linkage)

                if (aliasResult.confidence >= 0.7) {
                  union(entity1.id, entity2.id)
                }
                foundAliasMatch = true
                break
              }
            }
          }
        }
      }
    }
  }

  // Group entities by their root in Union-Find
  const groups: Map<string, ResolvedEntity[]> = new Map()
  for (const entity of entities) {
    const root = find(entity.id)
    if (!groups.has(root)) {
      groups.set(root, [])
    }
    groups.get(root)!.push(entity)
  }

  // Merge each group into a single entity
  const mergedEntities: ResolvedEntity[] = []
  let newEntityIndex = 0

  for (const group of groups.values()) {
    if (group.length === 1) {
      mergedEntities.push(group[0])
    } else {
      // Merge multiple entities into one
      const merged = mergeEntityGroup(group, newEntityIndex++)
      mergedEntities.push(merged)
    }
  }

  // Sort by confidence
  mergedEntities.sort((a, b) => b.confidence - a.confidence)

  return { mergedEntities, linkages }
}

/**
 * Merge a group of related entities into a single entity
 */
function mergeEntityGroup(group: ResolvedEntity[], index: number): ResolvedEntity {
  // Select the entity with highest confidence as the base
  const sorted = [...group].sort((a, b) => b.confidence - a.confidence)
  const primary = sorted[0]

  // Collect all unique aliases from all entities
  const allAliases = new Set<string>()
  for (const entity of group) {
    allAliases.add(entity.canonicalName)
    for (const alias of entity.aliases) {
      allAliases.add(alias)
    }
  }

  // Choose canonical name (longest full name from aliases)
  const canonicalName = selectCanonicalName([...allAliases], primary.canonicalName)

  // Collect all mentions
  const allMentions: ResolvedEntity['mentions'] = []
  const seenMentions = new Set<string>()
  for (const entity of group) {
    for (const mention of entity.mentions) {
      const key = `${mention.docId}:${mention.text}`
      if (!seenMentions.has(key)) {
        seenMentions.add(key)
        allMentions.push(mention)
      }
    }
  }

  // Average confidence, weighted by mention count
  let totalConfidence = 0
  let totalMentions = 0
  for (const entity of group) {
    totalConfidence += entity.confidence * entity.mentions.length
    totalMentions += entity.mentions.length
  }
  const avgConfidence = totalMentions > 0 ? totalConfidence / totalMentions : primary.confidence

  return {
    id: generateEntityId(index),
    canonicalName,
    type: primary.type,
    role: primary.role,
    mentions: allMentions,
    aliases: [...allAliases],
    confidence: Math.min(1, avgConfidence + 0.05), // Small boost for having multiple mentions
  }
}

/**
 * Select the best canonical name from a list of aliases
 * Prefers full names over initials or abbreviations
 */
function selectCanonicalName(aliases: string[], fallback: string): string {
  // Score each alias: prefer longer names with more parts
  let best = fallback
  let bestScore = scoreNameQuality(fallback)

  for (const alias of aliases) {
    const score = scoreNameQuality(alias)
    if (score > bestScore) {
      bestScore = score
      best = alias
    }
  }

  return best
}

/**
 * Score a name's quality for use as canonical name
 * Higher scores = better canonical name candidates
 */
function scoreNameQuality(name: string): number {
  const parts = name.trim().split(/\s+/)
  let score = 0

  // More name parts is better
  score += parts.length * 10

  // Longer total length is better
  score += name.length

  // Penalize single-character parts (initials)
  for (const part of parts) {
    if (part.length === 1 || (part.length === 2 && part.endsWith('.'))) {
      score -= 5
    }
  }

  // Bonus for having titles like Dr., Prof., etc.
  if (/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)/i.test(name)) {
    score += 3
  }

  return score
}

/**
 * Resolve entities across a set of documents using Compromise NLP
 *
 * @param documents - Array of documents to analyze
 * @param caseId - Case ID for tracking (used for future database storage)
 * @returns Entity resolution result with entities and statistics
 */
export async function resolveEntities(
  documents: Document[],
  caseId: string
): Promise<EntityResolutionResult> {
  const startTime = Date.now()

  // Mock Mode Check - return mock data for development
  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
    await new Promise(resolve => setTimeout(resolve, 500))

    // Mock entities demonstrating 5+ name variations for same entity
    const mockEntities: ResolvedEntity[] = [
      {
        id: generateEntityId(0),
        canonicalName: 'Dr. Sarah Jones',
        type: 'professional',
        role: 'Social Worker',
        // 6 name variations for Sarah Jones
        aliases: ['Dr. Sarah Jones', 'Sarah Jones', 'S. Jones', 'SW Jones', 'Ms. Jones', 'Dr. Jones'],
        mentions: [
          {
            docId: documents[0]?.id || 'd1',
            text: 'SW Jones',
            context: '...SW Jones attended the meeting on behalf of the local authority...'
          },
          {
            docId: documents[0]?.id || 'd1',
            text: 'Dr. Sarah Jones',
            context: '...Dr. Sarah Jones provided her professional opinion...'
          },
          {
            docId: documents[1]?.id || 'd2',
            text: 'S. Jones',
            context: '...report prepared by S. Jones on behalf of...'
          }
        ],
        confidence: 0.92
      },
      {
        id: generateEntityId(1),
        canonicalName: 'Dr. Alan Grant',
        type: 'professional',
        role: 'Psychologist',
        // 5 name variations for Dr. Grant
        aliases: ['Dr. Alan Grant', 'Dr. Grant', 'Alan Grant', 'A. Grant', 'Professor Grant'],
        mentions: [
          {
            docId: documents[0]?.id || 'd1',
            text: 'Dr. Grant',
            context: '...Dr. Grant provided a psychological assessment...'
          },
          {
            docId: documents[1]?.id || 'd2',
            text: 'Professor Grant',
            context: '...Professor Grant testified regarding...'
          }
        ],
        confidence: 0.9
      },
      {
        id: generateEntityId(2),
        canonicalName: 'Family Court',
        type: 'court',
        aliases: ['Family Court', 'the Family Court', 'Family Division'],
        mentions: [
          {
            docId: documents[0]?.id || 'd1',
            text: 'Family Court',
            context: '...the matter was heard at the Family Court...'
          }
        ],
        confidence: 0.95
      }
    ]

    // Mock linkages showing fuzzy matching identified name variations
    const mockLinkages: EntityLinkageProposal[] = [
      {
        id: generateLinkageId(0),
        entity1Name: 'Dr. Sarah Jones',
        entity2Name: 'SW Jones',
        confidence: 0.85,
        algorithm: 'variant',
        status: 'confirmed',
        entityIds: [mockEntities[0].id, mockEntities[0].id]
      },
      {
        id: generateLinkageId(1),
        entity1Name: 'S. Jones',
        entity2Name: 'Sarah Jones',
        confidence: 0.9,
        algorithm: 'variant',
        status: 'confirmed',
        entityIds: [mockEntities[0].id, mockEntities[0].id]
      },
      {
        id: generateLinkageId(2),
        entity1Name: 'Dr. Grant',
        entity2Name: 'Alan Grant',
        confidence: 0.88,
        algorithm: 'partial',
        status: 'confirmed',
        entityIds: [mockEntities[1].id, mockEntities[1].id]
      }
    ]

    const highConfidenceLinkages = mockLinkages.filter(l => l.confidence >= 0.8).length

    return {
      entities: mockEntities,
      linkages: mockLinkages,
      summary: {
        totalEntities: 3,
        peopleCount: 0,
        professionalCount: 2,
        organizationCount: 0,
        courtCount: 1,
        linkagesIdentified: mockLinkages.length,
        highConfidenceLinkages
      },
      metadata: {
        textLength: 0,
        processingTimeMs: Date.now() - startTime,
        extractionMethod: 'compromise',
        fuzzyMatchingApplied: true
      }
    }
  }

  // Prepare documents for extraction
  // Limit to first 5 documents and 10000 chars each for performance
  const docsForExtraction = documents.slice(0, 5).map(doc => ({
    id: doc.id,
    text: doc.extracted_text?.slice(0, 10000) || ''
  })).filter(doc => doc.text.length > 0)

  // Handle empty documents
  if (docsForExtraction.length === 0) {
    return {
      entities: [],
      linkages: [],
      summary: {
        totalEntities: 0,
        peopleCount: 0,
        professionalCount: 0,
        organizationCount: 0,
        courtCount: 0,
        linkagesIdentified: 0,
        highConfidenceLinkages: 0
      },
      metadata: {
        textLength: 0,
        processingTimeMs: Date.now() - startTime,
        extractionMethod: 'compromise',
        fuzzyMatchingApplied: false
      }
    }
  }

  // Extract entities using Compromise NLP
  const extractionResult = extractEntitiesFromDocuments(docsForExtraction, {
    minConfidence: 0.4,
    includePlaces: false,
    contextWindow: 100
  })

  // Map extracted entities to resolved entities
  const resolvedEntities: ResolvedEntity[] = []
  let entityIndex = 0

  for (const extracted of extractionResult.entities) {
    const mappedType = mapEntityType(extracted.type)

    // Skip unsupported types (like 'place')
    if (!mappedType) continue

    // Map mentions to include document ID
    // Since extractEntitiesFromDocuments groups across docs, we need to track doc IDs
    const mentions = extracted.mentions.map(mention => ({
      docId: findDocumentIdForMention(mention.text, docsForExtraction),
      text: mention.text,
      context: mention.context
    }))

    const resolvedEntity: ResolvedEntity = {
      id: generateEntityId(entityIndex++),
      canonicalName: extracted.canonicalName,
      type: mappedType,
      role: formatRole(extracted.role),
      mentions,
      aliases: extracted.aliases,
      confidence: extracted.confidence
    }

    resolvedEntities.push(resolvedEntity)
  }

  // Apply fuzzy matching to identify and merge similar entities
  const { mergedEntities, linkages } = applyFuzzyMatching(resolvedEntities)

  // Calculate linkage statistics
  const highConfidenceLinkages = linkages.filter(l => l.confidence >= 0.8).length

  return {
    entities: mergedEntities,
    linkages,
    summary: {
      totalEntities: mergedEntities.length,
      peopleCount: mergedEntities.filter(e => e.type === 'person').length,
      professionalCount: mergedEntities.filter(e => e.type === 'professional').length,
      organizationCount: mergedEntities.filter(e => e.type === 'organization').length,
      courtCount: mergedEntities.filter(e => e.type === 'court').length,
      linkagesIdentified: linkages.length,
      highConfidenceLinkages
    },
    metadata: {
      textLength: extractionResult.metadata.textLength,
      processingTimeMs: Date.now() - startTime,
      extractionMethod: 'compromise',
      fuzzyMatchingApplied: true
    }
  }
}

/**
 * Find which document contains a mention text
 * Returns the first document ID that contains the mention
 */
function findDocumentIdForMention(
  mentionText: string,
  documents: Array<{ id: string; text: string }>
): string {
  const lowerMention = mentionText.toLowerCase()

  for (const doc of documents) {
    if (doc.text.toLowerCase().includes(lowerMention)) {
      return doc.id
    }
  }

  // Fallback to first document if not found
  return documents[0]?.id || 'unknown'
}

/**
 * Find entity linkages for a specific entity name
 * Useful for identifying all name variations of a single entity
 *
 * @param entityName - The entity name to find linkages for
 * @param allEntityNames - List of all entity names to compare against
 * @param entityType - Type of entity for matching (default: 'person')
 * @returns Array of matching entity names with confidence scores
 */
export function findEntityVariations(
  entityName: string,
  allEntityNames: string[],
  entityType: 'person' | 'organization' = 'person'
): Array<{ name: string; confidence: number; algorithm: MatchAlgorithm }> {
  const variations: Array<{ name: string; confidence: number; algorithm: MatchAlgorithm }> = []

  for (const candidate of allEntityNames) {
    if (candidate === entityName) continue

    const result = fuzzyMatch(entityName, candidate, {
      entityType,
      minConfidence: 0.5,
      allowPartialMatch: true,
    })

    if (result.isMatch) {
      variations.push({
        name: candidate,
        confidence: result.confidence,
        algorithm: result.algorithm,
      })
    }
  }

  // Sort by confidence (highest first)
  return variations.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Check if two entity names are likely the same entity
 * Returns confidence score (0-1) if they match, null if no match
 *
 * @param name1 - First entity name
 * @param name2 - Second entity name
 * @param entityType - Type of entity for matching (default: 'person')
 * @returns Match result or null if no match
 */
export function areEntitiesSame(
  name1: string,
  name2: string,
  entityType: 'person' | 'organization' = 'person'
): { confidence: number; algorithm: MatchAlgorithm } | null {
  const result = fuzzyMatch(name1, name2, {
    entityType,
    minConfidence: 0.5,
    allowPartialMatch: true,
  })

  if (result.isMatch) {
    return {
      confidence: result.confidence,
      algorithm: result.algorithm,
    }
  }

  return null
}

/**
 * Entity resolution engine module export
 */
export const entityResolutionEngine = {
  resolveEntities,
  findEntityVariations,
  areEntitiesSame,
}
