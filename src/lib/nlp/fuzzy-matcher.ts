/**
 * FUZZY MATCHER
 *
 * Implements Levenshtein-based fuzzy matching for entity name variations.
 * Provides confidence scoring for entity matches across different naming conventions.
 *
 * Core capability: Match "Dr. Smith" = "John Smith" = "J. Smith" with confidence scores
 */

import { distance } from 'fastest-levenshtein'
import {
  normalizeName,
  generateNameVariants,
  extractFirstName,
  extractLastName,
  extractInitials,
  normalizeOrganization,
  getOrganizationAliases,
} from './name-normalizer'

/**
 * Types of entity matching algorithms
 */
export type MatchAlgorithm =
  | 'exact'
  | 'normalized'
  | 'levenshtein'
  | 'variant'
  | 'alias'
  | 'partial'

/**
 * Confidence level thresholds
 */
export interface ConfidenceThresholds {
  /** High confidence threshold (default: 0.8) */
  high: number
  /** Medium confidence threshold (default: 0.5) */
  medium: number
  /** Low confidence threshold (default: 0.3) */
  low: number
}

/**
 * Default confidence thresholds
 */
export const DEFAULT_THRESHOLDS: ConfidenceThresholds = {
  high: 0.8,
  medium: 0.5,
  low: 0.3,
}

/**
 * Result of a fuzzy match comparison
 */
export interface MatchResult {
  /** Whether the entities are considered a match */
  isMatch: boolean
  /** Confidence score (0-1) for the match */
  confidence: number
  /** Confidence level classification */
  confidenceLevel: 'high' | 'medium' | 'low' | 'no_match'
  /** Algorithm that produced the best match */
  algorithm: MatchAlgorithm
  /** Explanation of how the match was determined */
  explanation: string
  /** Details about the matching process */
  details: {
    /** Normalized form of first name */
    normalized1: string
    /** Normalized form of second name */
    normalized2: string
    /** Levenshtein edit distance */
    editDistance?: number
    /** Matching variants found */
    matchingVariants?: string[]
  }
}

/**
 * Options for fuzzy matching
 */
export interface MatchOptions {
  /** Minimum confidence threshold for considering a match (default: 0.3) */
  minConfidence?: number
  /** Entity type for type-specific matching (default: 'person') */
  entityType?: 'person' | 'organization'
  /** Custom confidence thresholds */
  thresholds?: Partial<ConfidenceThresholds>
  /** Enable partial name matching (default: true) */
  allowPartialMatch?: boolean
  /** Maximum edit distance for Levenshtein matching (default: 3) */
  maxEditDistance?: number
}

/**
 * Default matching options
 */
export const DEFAULT_MATCH_OPTIONS: Required<MatchOptions> = {
  minConfidence: 0.3,
  entityType: 'person',
  thresholds: DEFAULT_THRESHOLDS,
  allowPartialMatch: true,
  maxEditDistance: 3,
}

/**
 * Batch match result for multiple entity comparisons
 */
export interface BatchMatchResult {
  /** Array of match results */
  matches: Array<{
    entity1: string
    entity2: string
    result: MatchResult
  }>
  /** Summary statistics */
  summary: {
    totalComparisons: number
    matchCount: number
    highConfidenceCount: number
    mediumConfidenceCount: number
    lowConfidenceCount: number
    processingTimeMs: number
  }
}

/**
 * Entity linkage proposal from fuzzy matching
 */
export interface EntityLinkage {
  /** ID for this linkage proposal */
  id: string
  /** First entity name */
  entity1: string
  /** Second entity name */
  entity2: string
  /** Confidence score (0-1) */
  confidence: number
  /** Algorithm used for matching */
  algorithm: MatchAlgorithm
  /** Status of the linkage proposal */
  status: 'pending' | 'confirmed' | 'rejected'
  /** When the linkage was created */
  createdAt: string
}

/**
 * Calculate Levenshtein similarity score between two strings
 * Returns normalized score between 0 and 1
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score (0-1, where 1 is identical)
 */
export function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) {
    return 0
  }

  if (str1 === str2) {
    return 1
  }

  const maxLen = Math.max(str1.length, str2.length)
  if (maxLen === 0) {
    return 1
  }

  const editDistance = distance(str1, str2)
  return 1 - editDistance / maxLen
}

/**
 * Calculate similarity based on name components
 * Considers first name, last name, and initials separately
 *
 * @param name1 - First name
 * @param name2 - Second name
 * @returns Component-based similarity score (0-1)
 */
export function calculateComponentSimilarity(name1: string, name2: string): number {
  const first1 = extractFirstName(name1)
  const first2 = extractFirstName(name2)
  const last1 = extractLastName(name1)
  const last2 = extractLastName(name2)
  const initials1 = extractInitials(name1).toLowerCase()
  const initials2 = extractInitials(name2).toLowerCase()

  let score = 0
  let components = 0

  // Last name comparison (most important)
  if (last1 && last2) {
    const lastSimilarity = calculateLevenshteinSimilarity(last1, last2)
    score += lastSimilarity * 0.5 // 50% weight for last name
    components++
  }

  // First name comparison
  if (first1 && first2) {
    // Check for initial match (J matches John)
    if (
      (first1.length === 1 && first2.startsWith(first1)) ||
      (first2.length === 1 && first1.startsWith(first2))
    ) {
      score += 0.35 // High score for initial match
    } else {
      const firstSimilarity = calculateLevenshteinSimilarity(first1, first2)
      score += firstSimilarity * 0.35 // 35% weight for first name
    }
    components++
  } else if (first1 || first2) {
    // One has first name, other doesn't - partial match
    score += 0.1
    components++
  }

  // Initials comparison (for names like JKS)
  if (initials1.length >= 2 && initials2.length >= 2) {
    if (initials1 === initials2) {
      score += 0.15 // 15% weight for matching initials
    } else if (initials1.startsWith(initials2) || initials2.startsWith(initials1)) {
      score += 0.1
    }
    components++
  }

  // Normalize by number of components compared
  return components > 0 ? Math.min(1, score) : 0
}

/**
 * Check if two names share common variants
 *
 * @param name1 - First name
 * @param name2 - Second name
 * @returns Object with match status and matching variants
 */
export function checkVariantMatch(
  name1: string,
  name2: string
): { matches: boolean; variants: string[]; score: number } {
  const variants1 = generateNameVariants(name1)
  const variants2 = generateNameVariants(name2)

  const matchingVariants: string[] = []

  for (const v1 of variants1) {
    if (variants2.includes(v1)) {
      matchingVariants.push(v1)
    }
  }

  if (matchingVariants.length > 0) {
    // Score based on number of matching variants and their specificity
    const maxVariants = Math.max(variants1.length, variants2.length)
    const matchRatio = matchingVariants.length / maxVariants

    // Bonus for full name variants matching
    const hasFullNameMatch = matchingVariants.some((v) => v.split(/\s+/).length >= 2)

    let score = 0.6 + matchRatio * 0.3
    if (hasFullNameMatch) {
      score += 0.1
    }

    return {
      matches: true,
      variants: matchingVariants,
      score: Math.min(1, score),
    }
  }

  return { matches: false, variants: [], score: 0 }
}

/**
 * Determine confidence level from score
 */
export function getConfidenceLevel(
  score: number,
  thresholds: ConfidenceThresholds = DEFAULT_THRESHOLDS
): 'high' | 'medium' | 'low' | 'no_match' {
  if (score >= thresholds.high) return 'high'
  if (score >= thresholds.medium) return 'medium'
  if (score >= thresholds.low) return 'low'
  return 'no_match'
}

/**
 * Perform fuzzy matching between two person names
 *
 * @param name1 - First name to compare
 * @param name2 - Second name to compare
 * @param options - Matching options
 * @returns Match result with confidence score
 *
 * @example
 * matchPersonNames('Dr. Smith', 'John Smith')
 * // Returns: { isMatch: true, confidence: 0.85, algorithm: 'variant', ... }
 *
 * @example
 * matchPersonNames('J. Smith', 'John Smith')
 * // Returns: { isMatch: true, confidence: 0.9, algorithm: 'variant', ... }
 */
export function matchPersonNames(
  name1: string,
  name2: string,
  options: MatchOptions = {}
): MatchResult {
  const opts = { ...DEFAULT_MATCH_OPTIONS, ...options }
  const thresholds = { ...DEFAULT_THRESHOLDS, ...opts.thresholds }

  // Normalize names for comparison
  const normalized1 = normalizeName(name1)
  const normalized2 = normalizeName(name2)

  // Handle empty inputs
  if (!normalized1 || !normalized2) {
    return {
      isMatch: false,
      confidence: 0,
      confidenceLevel: 'no_match',
      algorithm: 'exact',
      explanation: 'One or both names are empty',
      details: { normalized1, normalized2 },
    }
  }

  // 1. Exact match after normalization (highest confidence)
  if (normalized1 === normalized2) {
    return {
      isMatch: true,
      confidence: 1.0,
      confidenceLevel: 'high',
      algorithm: 'exact',
      explanation: 'Names match exactly after normalization',
      details: { normalized1, normalized2 },
    }
  }

  // 2. Check variant matching (handles Dr. Smith = J. Smith = John Smith)
  const variantResult = checkVariantMatch(name1, name2)
  if (variantResult.matches) {
    const confidence = variantResult.score
    const variantHasMultiToken = variantResult.variants.some(
      (variant) => variant.trim().split(/\s+/).length >= 2
    )
    if (!variantHasMultiToken && opts.allowPartialMatch) {
      return {
        isMatch: confidence >= opts.minConfidence,
        confidence,
        confidenceLevel: getConfidenceLevel(confidence, thresholds),
        algorithm: 'partial',
        explanation: 'Names share a last-name-only variant',
        details: {
          normalized1,
          normalized2,
          matchingVariants: variantResult.variants,
        },
      }
    }

    return {
      isMatch: confidence >= opts.minConfidence,
      confidence,
      confidenceLevel: getConfidenceLevel(confidence, thresholds),
      algorithm: 'variant',
      explanation: `Names share common variants: ${variantResult.variants.slice(0, 3).join(', ')}`,
      details: {
        normalized1,
        normalized2,
        matchingVariants: variantResult.variants,
      },
    }
  }

  // 3. Component-based matching (first/last name analysis)
  const componentScore = calculateComponentSimilarity(name1, name2)
  if (componentScore >= opts.minConfidence) {
    return {
      isMatch: true,
      confidence: componentScore,
      confidenceLevel: getConfidenceLevel(componentScore, thresholds),
      algorithm: 'partial',
      explanation: 'Names share matching components (first/last name)',
      details: { normalized1, normalized2 },
    }
  }

  // 4. Levenshtein similarity for typo tolerance
  const levenshteinScore = calculateLevenshteinSimilarity(normalized1, normalized2)
  const editDist = distance(normalized1, normalized2)

  if (editDist <= opts.maxEditDistance && levenshteinScore >= opts.minConfidence) {
    return {
      isMatch: true,
      confidence: levenshteinScore,
      confidenceLevel: getConfidenceLevel(levenshteinScore, thresholds),
      algorithm: 'levenshtein',
      explanation: `Names are similar with edit distance of ${editDist}`,
      details: { normalized1, normalized2, editDistance: editDist },
    }
  }

  // 5. Partial match - one name contains the other
  if (opts.allowPartialMatch) {
    if (
      normalized1.includes(normalized2) ||
      normalized2.includes(normalized1)
    ) {
      const shorterLen = Math.min(normalized1.length, normalized2.length)
      const longerLen = Math.max(normalized1.length, normalized2.length)

      // Only match if the shorter name is reasonably significant
      if (shorterLen >= 3) {
        const partialScore = 0.5 + (shorterLen / longerLen) * 0.3
        return {
          isMatch: partialScore >= opts.minConfidence,
          confidence: partialScore,
          confidenceLevel: getConfidenceLevel(partialScore, thresholds),
          algorithm: 'partial',
          explanation: 'One name contains the other',
          details: { normalized1, normalized2 },
        }
      }
    }
  }

  // No match found
  return {
    isMatch: false,
    confidence: Math.max(levenshteinScore, componentScore, 0),
    confidenceLevel: 'no_match',
    algorithm: 'normalized',
    explanation: 'Names do not match with sufficient confidence',
    details: {
      normalized1,
      normalized2,
      editDistance: editDist,
    },
  }
}

/**
 * Perform fuzzy matching between two organization names
 *
 * @param org1 - First organization name
 * @param org2 - Second organization name
 * @param options - Matching options
 * @returns Match result with confidence score
 *
 * @example
 * matchOrganizationNames('FBI', 'Federal Bureau of Investigation')
 * // Returns: { isMatch: true, confidence: 1.0, algorithm: 'alias', ... }
 */
export function matchOrganizationNames(
  org1: string,
  org2: string,
  options: MatchOptions = {}
): MatchResult {
  const opts = { ...DEFAULT_MATCH_OPTIONS, ...options, entityType: 'organization' as const }
  const thresholds = { ...DEFAULT_THRESHOLDS, ...opts.thresholds }

  const normalized1 = normalizeOrganization(org1)
  const normalized2 = normalizeOrganization(org2)
  const rawNormalized1 = org1
    .toLowerCase()
    .replace(/[.,'"!?;:()[\]{}]/g, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const rawNormalized2 = org2
    .toLowerCase()
    .replace(/[.,'"!?;:()[\]{}]/g, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Handle empty inputs
  if (!normalized1 || !normalized2) {
    return {
      isMatch: false,
      confidence: 0,
      confidenceLevel: 'no_match',
      algorithm: 'exact',
      explanation: 'One or both organization names are empty',
      details: { normalized1, normalized2 },
    }
  }

  // 1. Alias matching (FBI = Federal Bureau of Investigation)
  const aliases1 = getOrganizationAliases(org1)
  const aliases2 = getOrganizationAliases(org2)

  const matchingAliases = aliases1.filter((a) => aliases2.includes(a))
  if (matchingAliases.length > 0) {
    return {
      isMatch: true,
      confidence: 1.0,
      confidenceLevel: 'high',
      algorithm: 'alias',
      explanation: `Organizations match via alias: ${matchingAliases[0]}`,
      details: {
        normalized1,
        normalized2,
        matchingVariants: matchingAliases,
      },
    }
  }

  // 2. Exact match after normalization
  if (normalized1 === normalized2) {
    const aliasCandidates = getOrganizationAliases(normalized1)
    const usedAlias =
      (rawNormalized1 !== normalized1 && aliasCandidates.includes(rawNormalized1)) ||
      (rawNormalized2 !== normalized2 && aliasCandidates.includes(rawNormalized2))

    return {
      isMatch: true,
      confidence: 1.0,
      confidenceLevel: 'high',
      algorithm: usedAlias ? 'alias' : 'exact',
      explanation: usedAlias
        ? 'Organization names match via known alias'
        : 'Organization names match exactly after normalization',
      details: { normalized1, normalized2 },
    }
  }

  // 3. Levenshtein similarity
  const levenshteinScore = calculateLevenshteinSimilarity(normalized1, normalized2)
  const editDist = distance(normalized1, normalized2)

  if (levenshteinScore >= opts.minConfidence) {
    return {
      isMatch: true,
      confidence: levenshteinScore,
      confidenceLevel: getConfidenceLevel(levenshteinScore, thresholds),
      algorithm: 'levenshtein',
      explanation: `Organization names are similar with edit distance of ${editDist}`,
      details: { normalized1, normalized2, editDistance: editDist },
    }
  }

  // 4. Substring matching for partial organization names
  if (opts.allowPartialMatch) {
    if (
      normalized1.includes(normalized2) ||
      normalized2.includes(normalized1)
    ) {
      const shorterLen = Math.min(normalized1.length, normalized2.length)
      if (shorterLen >= 4) {
        const partialScore = 0.6 + (shorterLen / Math.max(normalized1.length, normalized2.length)) * 0.3
        return {
          isMatch: partialScore >= opts.minConfidence,
          confidence: partialScore,
          confidenceLevel: getConfidenceLevel(partialScore, thresholds),
          algorithm: 'partial',
          explanation: 'One organization name contains the other',
          details: { normalized1, normalized2 },
        }
      }
    }
  }

  // No match
  return {
    isMatch: false,
    confidence: levenshteinScore,
    confidenceLevel: 'no_match',
    algorithm: 'normalized',
    explanation: 'Organization names do not match with sufficient confidence',
    details: { normalized1, normalized2, editDistance: editDist },
  }
}

/**
 * Universal fuzzy match function that handles both persons and organizations
 *
 * @param entity1 - First entity name
 * @param entity2 - Second entity name
 * @param options - Matching options including entity type
 * @returns Match result with confidence score
 */
export function fuzzyMatch(
  entity1: string,
  entity2: string,
  options: MatchOptions = {}
): MatchResult {
  const entityType = options.entityType || 'person'

  if (entityType === 'organization') {
    return matchOrganizationNames(entity1, entity2, options)
  }

  return matchPersonNames(entity1, entity2, options)
}

/**
 * Batch match multiple entity pairs
 * Optimized for comparing many entities at once
 *
 * @param pairs - Array of entity pairs to compare
 * @param options - Matching options
 * @returns Batch match results with summary
 */
export function batchMatch(
  pairs: Array<{ entity1: string; entity2: string }>,
  options: MatchOptions = {}
): BatchMatchResult {
  const startTime = Date.now()
  const thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds }

  const matches = pairs.map((pair) => ({
    entity1: pair.entity1,
    entity2: pair.entity2,
    result: fuzzyMatch(pair.entity1, pair.entity2, options),
  }))

  const matchResults = matches.filter((m) => m.result.isMatch)

  return {
    matches,
    summary: {
      totalComparisons: pairs.length,
      matchCount: matchResults.length,
      highConfidenceCount: matchResults.filter(
        (m) => m.result.confidence >= thresholds.high
      ).length,
      mediumConfidenceCount: matchResults.filter(
        (m) =>
          m.result.confidence >= thresholds.medium &&
          m.result.confidence < thresholds.high
      ).length,
      lowConfidenceCount: matchResults.filter(
        (m) =>
          m.result.confidence >= thresholds.low &&
          m.result.confidence < thresholds.medium
      ).length,
      processingTimeMs: Date.now() - startTime,
    },
  }
}

/**
 * Find all potential matches for an entity within a list of candidates
 *
 * @param target - Target entity to find matches for
 * @param candidates - List of candidate entities to compare against
 * @param options - Matching options
 * @returns Array of matches sorted by confidence (highest first)
 */
export function findMatches(
  target: string,
  candidates: string[],
  options: MatchOptions = {}
): Array<{ candidate: string; result: MatchResult }> {
  const matches = candidates
    .map((candidate) => ({
      candidate,
      result: fuzzyMatch(target, candidate, options),
    }))
    .filter((m) => m.result.isMatch)
    .sort((a, b) => b.result.confidence - a.result.confidence)

  return matches
}

/**
 * Generate entity linkage proposals from a list of entities
 * Identifies potential same-entity pairs based on fuzzy matching
 *
 * @param entities - Array of entity names to analyze
 * @param options - Matching options
 * @returns Array of linkage proposals
 */
export function generateLinkageProposals(
  entities: string[],
  options: MatchOptions = {}
): EntityLinkage[] {
  const linkages: EntityLinkage[] = []
  const seen = new Set<string>()

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const entity1 = entities[i]
      const entity2 = entities[j]

      // Create a unique key for this pair
      const pairKey = [entity1, entity2].sort().join('|||')
      if (seen.has(pairKey)) continue
      seen.add(pairKey)

      const result = fuzzyMatch(entity1, entity2, options)

      if (result.isMatch) {
        linkages.push({
          id: `linkage-${Date.now().toString(36)}-${linkages.length}`,
          entity1,
          entity2,
          confidence: result.confidence,
          algorithm: result.algorithm,
          status: 'pending',
          createdAt: new Date().toISOString(),
        })
      }
    }
  }

  // Sort by confidence (highest first)
  return linkages.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Export fuzzy matcher module
 */
export const fuzzyMatcher = {
  // Core matching functions
  fuzzyMatch,
  matchPersonNames,
  matchOrganizationNames,
  batchMatch,
  findMatches,
  generateLinkageProposals,

  // Utility functions
  calculateLevenshteinSimilarity,
  calculateComponentSimilarity,
  checkVariantMatch,
  getConfidenceLevel,

  // Constants
  DEFAULT_THRESHOLDS,
  DEFAULT_MATCH_OPTIONS,
}
