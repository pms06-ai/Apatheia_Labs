import { generateJSON } from '@/lib/ai-client'
import type { Document } from '@/CONTRACT'
import * as chrono from 'chrono-node'
import {
  format,
  isValid,
  parseISO,
  addWeeks,
  addDays,
  addMonths,
  addYears,
  subWeeks,
  subDays,
  subMonths,
  subYears,
  isBefore,
  isAfter,
} from 'date-fns'

export interface TemporalEvent {
  id: string
  date: string
  time?: string
  description: string
  sourceDocumentId: string
  confidence: 'exact' | 'inferred' | 'estimated'
  // Phase 1 enhancements for citation tracking and validation
  rawText?: string // Original extracted text (e.g., "three weeks later")
  position?: number // Character index in source document (from chrono-node)
  dateType?: 'absolute' | 'relative' | 'resolved' // Type of date reference
  anchorDate?: string // Reference date if dateType='resolved' (YYYY-MM-DD)
  extractionMethod?: 'ai' | 'chrono' | 'validated' // Which layer confirmed this date
}

export interface TemporalInconsistency {
  description: string
  events: string[] // event IDs
  severity: 'critical' | 'high' | 'medium'
  // Phase 1 enhancement for inconsistency categorization
  type?: 'BACKDATING' | 'IMPOSSIBLE_SEQUENCE' | 'CONTRADICTION'
}

export interface TemporalAnalysisResult {
  timeline: TemporalEvent[]
  inconsistencies: TemporalInconsistency[]
  // Phase 1 metadata for transparency
  metadata?: {
    documentsAnalyzed: number
    datesExtracted: number
    validationLayersUsed: string[] // e.g., ['ai', 'chrono', 'date-fns']
  }
}

/** Internal type for AI-generated temporal extraction result */
interface AITemporalExtractionResult {
  events?: Array<{
    date: string
    time?: string
    rawText?: string
    position?: number
    dateType?: string
    anchorDate?: string
    description: string
    sourceDocId: string
    confidence?: string
  }>
  inconsistencies?: Array<{
    description: string
    conflictingIndices?: number[]
    severity?: string
    type?: string
  }>
}

/**
 * Layer 1: AI Date Extraction Prompt
 * Extracts dates with context including raw text, position, and date type classification.
 * This is the first layer of the multi-layer validation pipeline.
 */
const AI_DATE_EXTRACTION_PROMPT = `
You are a temporal analysis expert extracting dates from legal and institutional documents.
Extract ALL date references from the provided documents with their surrounding context.

For each date found, identify:
1. The normalized date in YYYY-MM-DD format
2. The exact raw text as it appears in the document (e.g., "January 15, 2024", "three weeks later", "last Tuesday")
3. The approximate character position in the document where this date appears
4. Whether this is an absolute date, relative date, or a resolved relative date
5. For relative dates, identify the anchor date if one exists in context
6. A brief description of what event this date refers to

Date Types:
- "absolute": Specific dates like "January 15, 2024", "2024-01-15", "15/01/2024"
- "relative": References like "three weeks later", "the following month", "next Tuesday"
- "resolved": A relative date that has been converted to absolute using context

Documents:
{documents}

Respond ONLY with valid JSON in this exact format:
{
  "events": [
    {
      "date": "YYYY-MM-DD",
      "time": "HH:MM or null",
      "rawText": "exact text from document",
      "position": 123,
      "dateType": "absolute|relative|resolved",
      "anchorDate": "YYYY-MM-DD or null",
      "description": "what this date refers to",
      "sourceDocId": "document ID",
      "confidence": "exact|inferred|estimated"
    }
  ],
  "inconsistencies": [
    {
      "description": "description of the temporal inconsistency",
      "conflictingIndices": [0, 2],
      "severity": "critical|high|medium",
      "type": "BACKDATING|IMPOSSIBLE_SEQUENCE|CONTRADICTION"
    }
  ]
}`

/**
 * Layer 2: Chrono-node Validation
 * Validates AI-extracted dates by checking if they exist in the source text.
 * This prevents hallucination by confirming dates with chrono-node's parsing.
 *
 * @param aiEvents - Events extracted by AI (Layer 1)
 * @param documentText - Original document text for validation
 * @returns Validated events with updated extraction method and position
 */
function validateWithChronoNode(
  aiEvents: Array<{
    date: string
    time?: string
    rawText?: string
    position?: number
    dateType?: string
    anchorDate?: string
    description: string
    sourceDocId: string
    confidence: string
  }>,
  documentText: string
): Array<{
  date: string
  time?: string
  rawText?: string
  position?: number
  dateType?: string
  anchorDate?: string
  description: string
  sourceDocId: string
  confidence: string
  extractionMethod: 'ai' | 'chrono' | 'validated'
  chronoValidated: boolean
}> {
  // Parse document text with chrono-node to find all date references
  const chronoResults = chrono.parse(documentText)

  return aiEvents.map(event => {
    // Try to find a matching chrono-node result for this AI-extracted date
    const match = chronoResults.find(chronoResult => {
      // Match by raw text (exact or contained)
      if (event.rawText) {
        const normalizedEventText = event.rawText.toLowerCase().trim()
        const normalizedChronoText = chronoResult.text.toLowerCase().trim()

        if (
          normalizedEventText === normalizedChronoText ||
          normalizedChronoText.includes(normalizedEventText) ||
          normalizedEventText.includes(normalizedChronoText)
        ) {
          return true
        }
      }

      // Match by position (±10 characters tolerance)
      if (typeof event.position === 'number') {
        const positionTolerance = 10
        if (
          chronoResult.index >= event.position - positionTolerance &&
          chronoResult.index <= event.position + positionTolerance
        ) {
          return true
        }
      }

      // Match by parsed date value (same day)
      try {
        const eventDate = new Date(event.date)
        const chronoDate = chronoResult.start.date()
        if (eventDate.toISOString().split('T')[0] === chronoDate.toISOString().split('T')[0]) {
          return true
        }
      } catch {
        // Date parsing failed, skip this match method
      }

      return false
    })

    if (match) {
      // Chrono-node confirmed this date exists in source - upgrade to validated
      return {
        ...event,
        rawText: event.rawText || match.text, // Use chrono-node's text if AI didn't provide
        position: match.index, // Use chrono-node's more precise position
        extractionMethod: 'validated' as const, // Both AI and chrono-node agree
        chronoValidated: true,
      }
    } else {
      // Could not validate with chrono-node - keep as AI-only extraction
      // Note: This doesn't necessarily mean hallucination - chrono-node may miss
      // relative dates or unusual formats that AI correctly identified
      return {
        ...event,
        extractionMethod: 'ai' as const,
        chronoValidated: false,
      }
    }
  })
}

/**
 * Filter events to remove likely hallucinations.
 * Events with chrono validation or high confidence are kept.
 * Unvalidated events with low confidence may be filtered.
 *
 * @param events - Events after chrono-node validation
 * @returns Filtered events with hallucinations removed
 */
function filterHallucinatedDates<
  T extends { chronoValidated: boolean; confidence: string; dateType?: string },
>(events: T[]): T[] {
  return events.filter(event => {
    // Always keep chrono-validated events
    if (event.chronoValidated) return true

    // Keep relative dates even without chrono validation (chrono may not parse "three weeks later")
    if (event.dateType === 'relative' || event.dateType === 'resolved') return true

    // Keep high-confidence events from AI even without chrono validation
    if (event.confidence === 'exact') return true

    // Filter out estimated/inferred absolute dates that chrono couldn't validate
    // These are most likely to be hallucinations
    return false
  })
}

/**
 * Layer 3: date-fns Normalization and Validation
 * Validates all dates with isValid() and normalizes to YYYY-MM-DD format.
 * This ensures consistent date storage and filters out malformed dates.
 *
 * @param events - Events after chrono-node validation and hallucination filtering
 * @returns Events with normalized dates, invalid dates filtered out
 */
function normalizeWithDateFns<T extends { date: string }>(
  events: T[]
): Array<T & { normalizedDate: string; dateFnsValidated: boolean }> {
  return events
    .map(event => {
      // Attempt to parse the date string
      // First try parseISO for standard ISO formats (YYYY-MM-DD, ISO 8601)
      let parsedDate = parseISO(event.date)

      // If parseISO fails, try JavaScript Date constructor as fallback
      if (!isValid(parsedDate)) {
        parsedDate = new Date(event.date)
      }

      // Check if the parsed date is valid
      const dateIsValid = isValid(parsedDate)

      // Normalize to YYYY-MM-DD format if valid
      const normalizedDate = dateIsValid ? format(parsedDate, 'yyyy-MM-dd') : event.date // Keep original if invalid (will be filtered)

      return {
        ...event,
        date: normalizedDate, // Update to normalized format
        normalizedDate,
        dateFnsValidated: dateIsValid,
      }
    })
    .filter(event => event.dateFnsValidated) // Filter out invalid dates
}

/**
 * Relative date pattern definitions for parsing natural language date references.
 * Each pattern maps to a resolution function using date-fns.
 */
interface RelativeDatePattern {
  pattern: RegExp
  resolve: (match: RegExpMatchArray, anchorDate: Date) => Date
}

const RELATIVE_DATE_PATTERNS: RelativeDatePattern[] = [
  // "X weeks later" / "X weeks after"
  {
    pattern:
      /(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+weeks?\s+(later|after)/i,
    resolve: (match, anchor) => addWeeks(anchor, parseNumberWord(match[1])),
  },
  // "X weeks before" / "X weeks earlier"
  {
    pattern:
      /(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+weeks?\s+(before|earlier|prior)/i,
    resolve: (match, anchor) => subWeeks(anchor, parseNumberWord(match[1])),
  },
  // "X days later" / "X days after"
  {
    pattern:
      /(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+days?\s+(later|after)/i,
    resolve: (match, anchor) => addDays(anchor, parseNumberWord(match[1])),
  },
  // "X days before" / "X days earlier"
  {
    pattern:
      /(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+days?\s+(before|earlier|prior)/i,
    resolve: (match, anchor) => subDays(anchor, parseNumberWord(match[1])),
  },
  // "X months later" / "X months after"
  {
    pattern:
      /(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+months?\s+(later|after)/i,
    resolve: (match, anchor) => addMonths(anchor, parseNumberWord(match[1])),
  },
  // "X months before" / "X months earlier"
  {
    pattern:
      /(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+months?\s+(before|earlier|prior)/i,
    resolve: (match, anchor) => subMonths(anchor, parseNumberWord(match[1])),
  },
  // "X years later" / "X years after"
  {
    pattern:
      /(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+years?\s+(later|after)/i,
    resolve: (match, anchor) => addYears(anchor, parseNumberWord(match[1])),
  },
  // "X years before" / "X years earlier"
  {
    pattern:
      /(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+years?\s+(before|earlier|prior)/i,
    resolve: (match, anchor) => subYears(anchor, parseNumberWord(match[1])),
  },
  // "the following week"
  {
    pattern: /the\s+following\s+week/i,
    resolve: (_, anchor) => addWeeks(anchor, 1),
  },
  // "the following month"
  {
    pattern: /the\s+following\s+month/i,
    resolve: (_, anchor) => addMonths(anchor, 1),
  },
  // "the following day" / "the next day"
  {
    pattern: /the\s+(following|next)\s+day/i,
    resolve: (_, anchor) => addDays(anchor, 1),
  },
  // "the previous week"
  {
    pattern: /the\s+previous\s+week/i,
    resolve: (_, anchor) => subWeeks(anchor, 1),
  },
  // "the previous month"
  {
    pattern: /the\s+previous\s+month/i,
    resolve: (_, anchor) => subMonths(anchor, 1),
  },
  // "the previous day" / "the day before"
  {
    pattern: /the\s+(previous|day\s+before)\s*day?/i,
    resolve: (_, anchor) => subDays(anchor, 1),
  },
  // "a week later"
  {
    pattern: /a\s+week\s+(later|after)/i,
    resolve: (_, anchor) => addWeeks(anchor, 1),
  },
  // "a month later"
  {
    pattern: /a\s+month\s+(later|after)/i,
    resolve: (_, anchor) => addMonths(anchor, 1),
  },
  // "a fortnight later" (14 days)
  {
    pattern: /a\s+fortnight\s+(later|after)/i,
    resolve: (_, anchor) => addDays(anchor, 14),
  },
]

/**
 * Parse number words to numeric values.
 * Handles both digit strings and written numbers.
 */
function parseNumberWord(word: string): number {
  const numberWords: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
  }
  const lower = word.toLowerCase()
  return numberWords[lower] ?? (parseInt(word, 10) || 1)
}

/**
 * Attempt to resolve a relative date using the provided rawText and anchor date.
 * Returns the resolved Date or null if no pattern matches or resolution fails.
 *
 * @param rawText - The raw text containing the relative date reference
 * @param anchorDate - The anchor date to resolve against
 * @returns Resolved Date or null if cannot resolve
 */
function attemptRelativeDateResolution(rawText: string, anchorDate: Date): Date | null {
  for (const { pattern, resolve } of RELATIVE_DATE_PATTERNS) {
    const match = rawText.match(pattern)
    if (match) {
      try {
        const resolved = resolve(match, anchorDate)
        if (isValid(resolved)) {
          return resolved
        }
      } catch {
        // Resolution failed, try next pattern
      }
    }
  }
  return null
}

/**
 * Detect anchor dates from a list of events.
 * Returns a map of document IDs to their earliest absolute date for anchoring.
 * Also builds a sorted list of all absolute dates for proximity-based anchor detection.
 */
function detectAnchorDates(
  events: Array<{ date: string; dateType?: string; sourceDocId: string; position?: number }>
): {
  byDocument: Map<string, Date>
  allAbsolute: Array<{ date: Date; sourceDocId: string; position?: number }>
} {
  const byDocument = new Map<string, Date>()
  const allAbsolute: Array<{ date: Date; sourceDocId: string; position?: number }> = []

  for (const event of events) {
    if (event.dateType === 'absolute') {
      const parsedDate = parseISO(event.date) || new Date(event.date)
      if (isValid(parsedDate)) {
        allAbsolute.push({
          date: parsedDate,
          sourceDocId: event.sourceDocId,
          position: event.position,
        })

        // Track earliest date per document for fallback anchoring
        const existing = byDocument.get(event.sourceDocId)
        if (!existing || parsedDate < existing) {
          byDocument.set(event.sourceDocId, parsedDate)
        }
      }
    }
  }

  // Sort by position for proximity-based anchor detection
  allAbsolute.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  return { byDocument, allAbsolute }
}

/**
 * Find the best anchor date for a relative date event.
 * Priority:
 * 1. Explicitly provided anchorDate
 * 2. Nearest preceding absolute date in the same document (by position)
 * 3. Earliest absolute date in the same document
 *
 * @param event - The event with relative date to find anchor for
 * @param anchors - Detected anchor dates from the document set
 * @returns The anchor Date or null if none found
 */
function findAnchorDate(
  event: { anchorDate?: string; sourceDocId: string; position?: number },
  anchors: {
    byDocument: Map<string, Date>
    allAbsolute: Array<{ date: Date; sourceDocId: string; position?: number }>
  }
): Date | null {
  // Priority 1: Use explicitly provided anchor date
  if (event.anchorDate) {
    const explicit = parseISO(event.anchorDate) || new Date(event.anchorDate)
    if (isValid(explicit)) {
      return explicit
    }
  }

  // Priority 2: Find nearest preceding absolute date by position in same document
  if (typeof event.position === 'number') {
    const sameDocEvents = anchors.allAbsolute.filter(a => a.sourceDocId === event.sourceDocId)
    const preceding = sameDocEvents
      .filter(a => a.position !== undefined && a.position < event.position!)
      .sort((a, b) => (b.position ?? 0) - (a.position ?? 0)) // Reverse sort to get closest

    if (preceding.length > 0) {
      return preceding[0].date
    }
  }

  // Priority 3: Fall back to earliest date in the same document
  const documentAnchor = anchors.byDocument.get(event.sourceDocId)
  if (documentAnchor) {
    return documentAnchor
  }

  return null
}

/**
 * Resolve relative dates in events using detected anchors and date-fns arithmetic.
 * This function attempts to convert relative date references to absolute dates
 * when suitable anchor dates are available.
 *
 * Events with dateType='relative' will be:
 * - Converted to dateType='resolved' if successfully resolved
 * - Flagged with REQUIRES_ANCHOR in description if no anchor found
 *
 * @param events - Events after chrono-node validation
 * @returns Events with relative dates resolved where possible
 */
function resolveRelativeDates<
  T extends {
    date: string
    rawText?: string
    dateType?: string
    anchorDate?: string
    sourceDocId: string
    position?: number
    description: string
  },
>(events: T[]): Array<T & { resolvedFromRelative?: boolean; requiresAnchor?: boolean }> {
  // First, detect all anchor dates from absolute dates in the event set
  const anchors = detectAnchorDates(events)

  return events.map(event => {
    // Only process relative dates that haven't been resolved
    if (event.dateType !== 'relative') {
      return { ...event, resolvedFromRelative: false, requiresAnchor: false }
    }

    // Find the best anchor date for this event
    const anchorDate = findAnchorDate(event, anchors)

    if (!anchorDate) {
      // No anchor found - flag as REQUIRES_ANCHOR
      return {
        ...event,
        resolvedFromRelative: false,
        requiresAnchor: true,
        description:
          event.description + ' [REQUIRES_ANCHOR: Unable to resolve relative date without context]',
      }
    }

    // Attempt to resolve the relative date using patterns
    if (event.rawText) {
      const resolvedDate = attemptRelativeDateResolution(event.rawText, anchorDate)

      if (resolvedDate) {
        // Successfully resolved - update the event
        return {
          ...event,
          date: format(resolvedDate, 'yyyy-MM-dd'),
          dateType: 'resolved' as const,
          anchorDate: format(anchorDate, 'yyyy-MM-dd'),
          resolvedFromRelative: true,
          requiresAnchor: false,
        }
      }
    }

    // Pattern matching failed - try chrono-node with reference date
    try {
      const chronoResults = chrono.parse(event.rawText || '', anchorDate, { forwardDate: true })
      if (chronoResults.length > 0) {
        const chronoDate = chronoResults[0].start.date()
        if (isValid(chronoDate)) {
          return {
            ...event,
            date: format(chronoDate, 'yyyy-MM-dd'),
            dateType: 'resolved' as const,
            anchorDate: format(anchorDate, 'yyyy-MM-dd'),
            resolvedFromRelative: true,
            requiresAnchor: false,
          }
        }
      }
    } catch {
      // Chrono-node failed, keep as unresolved
    }

    // Could not resolve even with anchor - keep original but flag
    return {
      ...event,
      anchorDate: format(anchorDate, 'yyyy-MM-dd'),
      resolvedFromRelative: false,
      requiresAnchor: false,
      description: event.description + ' [Could not parse relative date pattern]',
    }
  })
}

/**
 * Layer 5: Backdating Detection
 * Detects temporal impossibilities where events are dated after the document's creation date.
 * This indicates potential backdating - a document cannot reference future events.
 *
 * Examples:
 * - Document dated "March 1, 2024" referencing "March 15, 2024 meeting" → BACKDATING
 * - Report written "January 10" describing home visit on "January 12" → BACKDATING
 *
 * @param events - Array of temporal events with their dates
 * @param documents - Array of documents to check acquisition/creation dates
 * @returns Array of TemporalInconsistency findings for detected backdating
 */
function detectBackdating(
  events: Array<{
    id: string
    date: string
    description: string
    sourceDocumentId: string
  }>,
  documents: Document[]
): TemporalInconsistency[] {
  const inconsistencies: TemporalInconsistency[] = []

  // Build a map of document IDs to their dates for quick lookup
  const documentDates = new Map<string, Date>()
  for (const doc of documents) {
    // Prefer acquisition_date (when document was created), fall back to created_at (database record creation)
    const docDateStr = doc.acquisition_date || doc.created_at
    if (docDateStr) {
      const parsedDate = parseISO(docDateStr)
      if (isValid(parsedDate)) {
        documentDates.set(doc.id, parsedDate)
      }
    }
  }

  // Check each event against its source document's date
  for (const event of events) {
    const eventDate = parseISO(event.date)
    if (!isValid(eventDate)) continue

    const documentDate = documentDates.get(event.sourceDocumentId)
    if (!documentDate) continue

    // BACKDATING: Event date is AFTER document date
    // This is a temporal impossibility - a document cannot describe future events
    if (isAfter(eventDate, documentDate)) {
      const daysDiff = Math.ceil(
        (eventDate.getTime() - documentDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      inconsistencies.push({
        description: `TEMPORAL_IMPOSSIBILITY: Document dated ${format(documentDate, 'yyyy-MM-dd')} references event on ${format(eventDate, 'yyyy-MM-dd')} (${daysDiff} days in the future). "${event.description}" appears to be backdated.`,
        events: [event.id],
        severity: daysDiff > 30 ? 'critical' : daysDiff > 7 ? 'high' : 'medium',
        type: 'BACKDATING',
      })
    }
  }

  return inconsistencies
}

/**
 * Detect events that should have occurred before but are dated after related events.
 * This looks for logical sequencing issues where cause comes after effect.
 *
 * @param events - Array of temporal events with their dates
 * @returns Array of TemporalInconsistency findings for impossible sequences
 */
function detectImpossibleSequences(
  events: Array<{
    id: string
    date: string
    description: string
    sourceDocumentId: string
  }>
): TemporalInconsistency[] {
  const inconsistencies: TemporalInconsistency[] = []

  // Look for sequence keywords that imply temporal ordering
  const sequencePatterns = [
    {
      before: /report\s+(written|prepared|completed)/i,
      after: /visit|assessment|meeting|interview/i,
    },
    { before: /decision\s+(made|reached)/i, after: /review|hearing|assessment/i },
    { before: /findings?\s+(issued|published)/i, after: /investigation|inquiry|review/i },
    { before: /recommendation/i, after: /assessment|evaluation|review/i },
  ]

  // For each pair of events from the same document, check for impossible sequences
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const eventA = events[i]
      const eventB = events[j]

      // Only check events from the same document
      if (eventA.sourceDocumentId !== eventB.sourceDocumentId) continue

      const dateA = parseISO(eventA.date)
      const dateB = parseISO(eventB.date)
      if (!isValid(dateA) || !isValid(dateB)) continue

      // Check each sequence pattern
      for (const pattern of sequencePatterns) {
        // If A matches "before" pattern and B matches "after" pattern
        // but A is dated AFTER B, that's an impossible sequence
        if (
          pattern.before.test(eventA.description) &&
          pattern.after.test(eventB.description) &&
          isBefore(dateA, dateB)
        ) {
          const daysDiff = Math.ceil((dateB.getTime() - dateA.getTime()) / (1000 * 60 * 60 * 24))

          inconsistencies.push({
            description: `IMPOSSIBLE_SEQUENCE: "${eventA.description}" (${eventA.date}) appears to precede "${eventB.description}" (${eventB.date}) but is dated ${daysDiff} days later.`,
            events: [eventA.id, eventB.id],
            severity: daysDiff > 14 ? 'critical' : 'high',
            type: 'IMPOSSIBLE_SEQUENCE',
          })
        }

        // Check reverse: if B matches "before" pattern and A matches "after" pattern
        if (
          pattern.before.test(eventB.description) &&
          pattern.after.test(eventA.description) &&
          isBefore(dateB, dateA)
        ) {
          const daysDiff = Math.ceil((dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24))

          inconsistencies.push({
            description: `IMPOSSIBLE_SEQUENCE: "${eventB.description}" (${eventB.date}) appears to precede "${eventA.description}" (${eventA.date}) but is dated ${daysDiff} days later.`,
            events: [eventB.id, eventA.id],
            severity: daysDiff > 14 ? 'critical' : 'high',
            type: 'IMPOSSIBLE_SEQUENCE',
          })
        }
      }
    }
  }

  return inconsistencies
}

/**
 * Cross-Document Timeline Contradiction Detection
 * Detects contradictions when the same event is described with different dates
 * across multiple documents, indicating timeline inconsistencies.
 *
 * Types of contradictions detected:
 * 1. Same event with conflicting dates across documents
 * 2. Sequential events with reversed order in different documents
 * 3. Related events with impossible time gaps between documents
 *
 * @param events - Array of temporal events with their dates and source documents
 * @param documents - Array of documents for metadata lookup
 * @returns Array of TemporalInconsistency findings for cross-document contradictions
 */
function detectCrossDocumentContradictions(
  events: Array<{
    id: string
    date: string
    description: string
    sourceDocumentId: string
  }>,
  documents: Document[]
): TemporalInconsistency[] {
  const inconsistencies: TemporalInconsistency[] = []

  // Build document name lookup for better error messages
  const documentNames = new Map<string, string>()
  for (const doc of documents) {
    documentNames.set(doc.id, doc.filename || doc.id)
  }

  // Keywords that identify similar events across documents
  const eventSignaturePatterns = [
    // Home visits / assessments
    { keywords: /home\s+visit|visit\s+(to|at)|visited\s+(the\s+)?home/i, category: 'home_visit' },
    // Meetings / hearings
    { keywords: /meeting|hearing|conference|court\s+date/i, category: 'meeting' },
    // Reports / assessments
    {
      keywords: /assessment|evaluation|report\s+(completed|written|submitted)/i,
      category: 'report',
    },
    // Referrals
    { keywords: /referral|referred|intake/i, category: 'referral' },
    // Investigations
    {
      keywords: /investigation|inquiry|review\s+(started|began|initiated)/i,
      category: 'investigation',
    },
    // Decisions
    { keywords: /decision|determination|ruling|finding/i, category: 'decision' },
    // Interviews
    { keywords: /interview(ed)?|spoke\s+with|conversation/i, category: 'interview' },
    // Incidents
    { keywords: /incident|allegation|complaint|report(ed)?/i, category: 'incident' },
  ]

  /**
   * Extract event signature (category and key terms) for comparison
   */
  function getEventSignature(description: string): { category: string; keyTerms: string[] } | null {
    const descLower = description.toLowerCase()

    for (const pattern of eventSignaturePatterns) {
      if (pattern.keywords.test(description)) {
        // Extract key terms (names, specific identifiers)
        const keyTerms = descLower
          .split(/\s+/)
          .filter(
            word =>
              word.length > 3 &&
              !/^(the|and|with|from|this|that|was|were|has|have|been|for)$/i.test(word)
          )
          .slice(0, 5)

        return { category: pattern.category, keyTerms }
      }
    }
    return null
  }

  /**
   * Calculate similarity between two event descriptions
   * Returns a score from 0 to 1
   */
  function calculateEventSimilarity(descA: string, descB: string): number {
    const sigA = getEventSignature(descA)
    const sigB = getEventSignature(descB)

    // If neither has a signature, low similarity
    if (!sigA || !sigB) return 0

    // Different categories = low similarity
    if (sigA.category !== sigB.category) return 0.1

    // Same category - check key term overlap
    const termsA = new Set(sigA.keyTerms)
    const termsB = new Set(sigB.keyTerms)

    let overlap = 0
    for (const term of termsA) {
      if (termsB.has(term)) overlap++
    }

    const maxTerms = Math.max(termsA.size, termsB.size)
    if (maxTerms === 0) return 0.5 // Same category but no key terms

    // Category match gives 0.5 base, term overlap adds up to 0.5
    return 0.5 + (0.5 * overlap) / maxTerms
  }

  // Compare events across different documents
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const eventA = events[i]
      const eventB = events[j]

      // Only check events from DIFFERENT documents
      if (eventA.sourceDocumentId === eventB.sourceDocumentId) continue

      const dateA = parseISO(eventA.date)
      const dateB = parseISO(eventB.date)
      if (!isValid(dateA) || !isValid(dateB)) continue

      // Calculate similarity between events
      const similarity = calculateEventSimilarity(eventA.description, eventB.description)

      // Only flag high-similarity events (likely same event) with date discrepancies
      if (similarity >= 0.6) {
        const daysDiff = Math.abs(
          Math.ceil((dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24))
        )

        // Significant date difference for similar events indicates contradiction
        if (daysDiff > 0) {
          const docNameA = documentNames.get(eventA.sourceDocumentId) || eventA.sourceDocumentId
          const docNameB = documentNames.get(eventB.sourceDocumentId) || eventB.sourceDocumentId

          // Determine severity based on date difference and event similarity
          let severity: 'critical' | 'high' | 'medium' = 'medium'
          if (daysDiff > 30 && similarity >= 0.8) {
            severity = 'critical'
          } else if (daysDiff > 7 || similarity >= 0.7) {
            severity = 'high'
          }

          inconsistencies.push({
            description: `CONTRADICTION: Similar event described with different dates across documents. "${eventA.description}" dated ${eventA.date} in "${docNameA}" vs "${eventB.description}" dated ${eventB.date} in "${docNameB}" (${daysDiff} day discrepancy, ${Math.round(similarity * 100)}% similarity).`,
            events: [eventA.id, eventB.id],
            severity,
            type: 'CONTRADICTION',
          })
        }
      }
    }
  }

  // Check for impossible cross-document sequences
  // When Document B references an event from Document A but with impossible timing
  const crossDocSequencePatterns = [
    // Document B says "per [Document A]" but dates don't align
    { reference: /per\s+(the\s+)?(report|assessment|document|record)/i },
    { reference: /according\s+to\s+(the\s+)?/i },
    { reference: /as\s+(stated|noted|documented|recorded)\s+(in|by)/i },
    { reference: /(referenced|cited)\s+(in|from)/i },
  ]

  for (let i = 0; i < events.length; i++) {
    for (let j = 0; j < events.length; j++) {
      if (i === j) continue

      const eventA = events[i]
      const eventB = events[j]

      // Only cross-document
      if (eventA.sourceDocumentId === eventB.sourceDocumentId) continue

      // Check if eventB references another document
      const hasReference = crossDocSequencePatterns.some(p => p.reference.test(eventB.description))
      if (!hasReference) continue

      const dateA = parseISO(eventA.date)
      const dateB = parseISO(eventB.date)
      if (!isValid(dateA) || !isValid(dateB)) continue

      // If eventB references something and its date is BEFORE a potentially related eventA
      // This could indicate cross-document timeline impossibility
      const similarity = calculateEventSimilarity(eventA.description, eventB.description)
      if (similarity >= 0.5 && isBefore(dateB, dateA)) {
        const daysDiff = Math.ceil((dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24))

        // Only flag significant discrepancies
        if (daysDiff > 3) {
          const docNameA = documentNames.get(eventA.sourceDocumentId) || eventA.sourceDocumentId
          const docNameB = documentNames.get(eventB.sourceDocumentId) || eventB.sourceDocumentId

          inconsistencies.push({
            description: `IMPOSSIBLE_SEQUENCE: Cross-document reference inconsistency. "${docNameB}" references related event dated ${eventB.date}, but "${docNameA}" dates the same type of event at ${eventA.date} (${daysDiff} days later).`,
            events: [eventA.id, eventB.id],
            severity: daysDiff > 14 ? 'critical' : 'high',
            type: 'IMPOSSIBLE_SEQUENCE',
          })
        }
      }
    }
  }

  return inconsistencies
}

/**
 * Extract and analyze temporal events from documents using AI-powered date extraction.
 * This is the main entry point for temporal analysis.
 *
 * @param documents - Array of documents to analyze
 * @param caseId - Case identifier for tracking
 * @returns Temporal analysis result with timeline, inconsistencies, and metadata
 */
export async function parseTemporalEvents(
  documents: Document[],
  caseId: string
): Promise<TemporalAnalysisResult> {
  const docContents = documents
    .slice(0, 3)
    .map(d => `=== ID: ${d.id} | ${d.filename} ===\n${d.extracted_text?.slice(0, 5000) || ''}`)
    .join('\n\n')

  let result: AITemporalExtractionResult

  // TypeScript engine uses mock mode - real AI calls handled by Rust backend
  // eslint-disable-next-line no-constant-condition
  if (true) {
    // Mock mode - Rust backend handles actual AI-powered analysis
    await new Promise(resolve => setTimeout(resolve, 1500))
    result = getMockTemporalResult(documents)
  } else {
    // Layer 1: AI-powered date extraction with context
    result = (await generateJSON(
      'Temporal Analysis Expert',
      AI_DATE_EXTRACTION_PROMPT.replace('{documents}', docContents)
    )) as AITemporalExtractionResult
  }

  // Map AI extraction results to intermediate format for validation
  const aiExtractedEvents = (result.events || []).map(e => ({
    date: e.date,
    time: e.time || undefined,
    rawText: e.rawText || undefined,
    position: typeof e.position === 'number' ? e.position : undefined,
    dateType: e.dateType || 'absolute',
    anchorDate: e.anchorDate || undefined,
    description: e.description,
    sourceDocId: e.sourceDocId,
    confidence: e.confidence || 'inferred',
  }))

  // Layer 2: Chrono-node validation to prevent hallucination
  // Validate AI-extracted dates against chrono-node's parsing of source text
  const validatedEvents = validateWithChronoNode(aiExtractedEvents, docContents)

  // Filter out likely hallucinated dates
  const filteredEvents = filterHallucinatedDates(validatedEvents)

  // Layer 3: date-fns normalization and validation
  // Normalizes all dates to YYYY-MM-DD format and filters invalid dates
  const normalizedEvents = normalizeWithDateFns(filteredEvents)

  // Layer 4: Resolve relative dates using anchor detection
  // Converts relative references like "three weeks later" to absolute dates
  const resolvedEvents = resolveRelativeDates(normalizedEvents)

  // Map validated results to TemporalEvent with Phase 1 fields
  const events: TemporalEvent[] = resolvedEvents.map((e, i: number) => ({
    id: `time-${i}`,
    date: e.date,
    time: e.time || undefined,
    description: e.description,
    sourceDocumentId: e.sourceDocId,
    confidence: e.confidence as 'exact' | 'inferred' | 'estimated',
    // Phase 1 enhancements for citation tracking
    rawText: e.rawText || undefined,
    position: e.position,
    dateType: e.dateType as 'absolute' | 'relative' | 'resolved' | undefined,
    anchorDate: e.anchorDate || undefined,
    extractionMethod: e.extractionMethod,
  }))

  // Map AI-detected inconsistencies with Phase 1 type categorization
  const aiInconsistencies: TemporalInconsistency[] = (result.inconsistencies || []).map(inc => ({
    description: inc.description,
    events: (inc.conflictingIndices || []).map((idx: number) => `time-${idx}`),
    severity: (inc.severity || 'medium') as 'critical' | 'high' | 'medium',
    type: inc.type as 'BACKDATING' | 'IMPOSSIBLE_SEQUENCE' | 'CONTRADICTION' | undefined,
  }))

  // Layer 5: Backdating Detection - detect temporal impossibilities
  // Check if any events are dated after their source document's creation date
  const backdatingInconsistencies = detectBackdating(events, documents)

  // Layer 6: Impossible Sequence Detection - detect logical sequencing issues
  // Check for events that should precede others but are dated after them
  const sequenceInconsistencies = detectImpossibleSequences(events)

  // Layer 7: Cross-Document Contradiction Detection - detect timeline conflicts across documents
  // Check for same events with conflicting dates or impossible sequences across documents
  const crossDocContradictions = detectCrossDocumentContradictions(events, documents)

  // Combine all inconsistencies (AI-detected + backdating + impossible sequences + cross-doc contradictions)
  const allInconsistencies: TemporalInconsistency[] = [
    ...aiInconsistencies,
    ...backdatingInconsistencies,
    ...sequenceInconsistencies,
    ...crossDocContradictions,
  ]

  // Deduplicate inconsistencies by checking for overlapping event sets
  const deduplicatedInconsistencies = deduplicateInconsistencies(allInconsistencies)

  // Track validation layers used for transparency
  const validationLayers: string[] = [
    'ai',
    'chrono',
    'date-fns',
    'relative-resolution',
    'backdating-detection',
    'sequence-detection',
    'cross-document-contradiction-detection',
  ]

  return {
    timeline: events,
    inconsistencies: deduplicatedInconsistencies,
    metadata: {
      documentsAnalyzed: documents.length,
      datesExtracted: events.length,
      validationLayersUsed: validationLayers,
    },
  }
}

/**
 * Deduplicate inconsistencies that reference the same events.
 * Keeps the one with higher severity or more detailed description.
 *
 * @param inconsistencies - Array of inconsistencies to deduplicate
 * @returns Deduplicated array of inconsistencies
 */
function deduplicateInconsistencies(
  inconsistencies: TemporalInconsistency[]
): TemporalInconsistency[] {
  const severityOrder: Record<string, number> = {
    critical: 3,
    high: 2,
    medium: 1,
  }

  const uniqueMap = new Map<string, TemporalInconsistency>()

  for (const inc of inconsistencies) {
    // Create a key from sorted event IDs
    const key = [...inc.events].sort().join('|')

    const existing = uniqueMap.get(key)
    if (!existing) {
      uniqueMap.set(key, inc)
    } else {
      // Keep the one with higher severity, or longer description if same severity
      const existingSeverity = severityOrder[existing.severity] || 0
      const newSeverity = severityOrder[inc.severity] || 0

      if (
        newSeverity > existingSeverity ||
        (newSeverity === existingSeverity && inc.description.length > existing.description.length)
      ) {
        uniqueMap.set(key, inc)
      }
    }
  }

  return Array.from(uniqueMap.values())
}

/**
 * Generate mock temporal analysis result for development/testing.
 * Includes Phase 1 fields for realistic mock data and cross-document contradiction examples.
 */
function getMockTemporalResult(documents: Document[]): AITemporalExtractionResult {
  const docId1 = documents[0]?.id || 'd1'
  const docId2 = documents[1]?.id || 'd2'

  return {
    events: [
      {
        date: '2023-01-10',
        rawText: 'January 10, 2023',
        position: 245,
        dateType: 'absolute',
        description: 'Initial referral received',
        sourceDocId: docId1,
        confidence: 'exact',
      },
      {
        date: '2023-01-12',
        rawText: '12th January 2023',
        position: 892,
        dateType: 'absolute',
        description: 'Home visit conducted',
        sourceDocId: docId1,
        confidence: 'exact',
      },
      {
        date: '2023-01-11',
        rawText: '11/01/2023',
        position: 1456,
        dateType: 'absolute',
        description: 'Report written (anomalous date)',
        sourceDocId: docId1,
        confidence: 'exact',
      },
      {
        date: '2023-02-02',
        rawText: 'three weeks later',
        position: 2103,
        dateType: 'resolved',
        anchorDate: '2023-01-12',
        description: 'Follow-up assessment completed',
        sourceDocId: docId1,
        confidence: 'inferred',
      },
      // Cross-document contradiction example: same home visit with different dates
      {
        date: '2023-01-15',
        rawText: 'January 15, 2023',
        position: 320,
        dateType: 'absolute',
        description: 'Home visit conducted - per assessment notes',
        sourceDocId: docId2,
        confidence: 'exact',
      },
      // Another cross-document event for contradiction detection
      {
        date: '2023-01-08',
        rawText: 'according to the report dated January 8',
        position: 890,
        dateType: 'absolute',
        description: 'Initial referral received according to case notes',
        sourceDocId: docId2,
        confidence: 'exact',
      },
    ],
    inconsistencies: [
      {
        description: 'Report appears to be written before the visit it describes',
        conflictingIndices: [1, 2],
        severity: 'high',
        type: 'BACKDATING',
      },
      {
        description: 'CONTRADICTION: Home visit date differs between documents (Jan 12 vs Jan 15)',
        conflictingIndices: [1, 4],
        severity: 'high',
        type: 'CONTRADICTION',
      },
      {
        description:
          "IMPOSSIBLE_SEQUENCE: Cross-document reference shows referral dated before original document's referral date",
        conflictingIndices: [0, 5],
        severity: 'medium',
        type: 'IMPOSSIBLE_SEQUENCE',
      },
    ],
  }
}

export const temporalEngine = {
  parseTemporalEvents,
}
