/**
 * Legal Citation Formatter
 *
 * Provides Bluebook-style legal citation formatting for evidence export.
 * Supports multiple citation styles and configurable formatting options.
 *
 * Based on patterns from scripts/export-analysis.js and export type definitions.
 */

import type { Document, DocType, Finding } from '@/CONTRACT'
import type {
  Citation,
  CitationOptions,
  CitationStyle,
  DocumentQuote,
} from '@/lib/types/export'
import {
  MAX_QUOTE_LENGTH,
  TRUNCATION_INDICATOR,
} from '@/lib/types/export'

// ============================================
// CITATION FORMATTING CONSTANTS
// ============================================

/**
 * Human-readable labels for document types in citations
 */
export const DOC_TYPE_LABELS: Record<DocType, string> = {
  court_order: 'Court Order',
  witness_statement: 'Witness Statement',
  expert_report: 'Expert Report',
  police_bundle: 'Police Bundle',
  social_work_assessment: 'Social Work Assessment',
  transcript: 'Transcript',
  correspondence: 'Correspondence',
  media: 'Media',
  disclosure: 'Disclosure',
  threshold_document: 'Threshold Document',
  position_statement: 'Position Statement',
  other: 'Document',
}

/**
 * Default citation formatting options
 */
export const DEFAULT_CITATION_OPTIONS: CitationOptions = {
  style: 'bluebook',
  includeDate: true,
  includeParagraph: false,
  useShortForm: true,
}

// ============================================
// CITATION FORMATTING UTILITIES
// ============================================

/**
 * Format a document name for citation purposes.
 * Removes file extensions and cleans up the name.
 *
 * @param filename - The document filename
 * @param docType - The document type (optional)
 * @returns Formatted document name
 */
export function formatDocumentName(
  filename: string,
  docType?: DocType | null
): string {
  if (!filename) {
    return '[Untitled Document]'
  }

  // Remove common file extensions
  let name = filename.replace(/\.(pdf|docx?|txt|rtf|odt)$/i, '')

  // Clean up underscores and excessive whitespace
  name = name.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()

  // Capitalize first letter of each word for proper title case
  // but preserve existing capitalization patterns like acronyms
  if (name === name.toLowerCase() || name === name.toUpperCase()) {
    name = name
      .split(' ')
      .map((word) =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join(' ')
  }

  // If name is empty after processing, use doc type or default
  if (!name) {
    if (docType && docType !== 'other') {
      return DOC_TYPE_LABELS[docType]
    }
    return '[Untitled Document]'
  }

  return name
}

/**
 * Format a page reference in legal citation style.
 *
 * @param pageNumber - The page number (1-indexed)
 * @param style - Citation style to use
 * @returns Formatted page reference string
 */
export function formatPageReference(
  pageNumber: number | null | undefined,
  style: CitationStyle = 'bluebook'
): string {
  if (pageNumber === null || pageNumber === undefined || pageNumber < 1) {
    return ''
  }

  switch (style) {
    case 'bluebook':
      // Bluebook uses "at" for pinpoint citations: ", at 5"
      return `, at ${pageNumber}`
    case 'oscola':
      // OSCOLA uses square brackets: " [5]"
      return ` [${pageNumber}]`
    case 'neutral':
      // Simple format: ", p. 5"
      return `, p. ${pageNumber}`
    default:
      return `, p. ${pageNumber}`
  }
}

/**
 * Format a paragraph/section reference in legal citation style.
 *
 * @param paragraph - The paragraph or section reference
 * @param style - Citation style to use
 * @returns Formatted paragraph reference string
 */
export function formatParagraphReference(
  paragraph: string | null | undefined,
  style: CitationStyle = 'bluebook'
): string {
  if (!paragraph || paragraph.trim() === '') {
    return ''
  }

  const trimmed = paragraph.trim()

  switch (style) {
    case 'bluebook':
      // Bluebook uses paragraph symbol: " para. 5" or " ¶ 5"
      if (/^\d+$/.test(trimmed)) {
        return ` para. ${trimmed}`
      }
      return ` ${trimmed}`
    case 'oscola':
      // OSCOLA uses para: " para 5"
      if (/^\d+$/.test(trimmed)) {
        return ` para ${trimmed}`
      }
      return ` ${trimmed}`
    case 'neutral':
      // Simple format with section symbol
      if (/^\d+$/.test(trimmed)) {
        return ` sec. ${trimmed}`
      }
      return ` ${trimmed}`
    default:
      return ` ${trimmed}`
  }
}

/**
 * Format a date for citation purposes.
 *
 * @param dateString - ISO date string or similar
 * @param style - Citation style to use
 * @returns Formatted date string
 */
export function formatCitationDate(
  dateString: string | null | undefined,
  style: CitationStyle = 'bluebook'
): string {
  if (!dateString) {
    return ''
  }

  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return ''
    }

    switch (style) {
      case 'bluebook':
        // Bluebook: "Jan. 15, 2024"
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      case 'oscola':
        // OSCOLA: "15 January 2024"
        return date.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      case 'neutral':
        // ISO format: "2024-01-15"
        return date.toISOString().split('T')[0]
      default:
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
    }
  } catch {
    return ''
  }
}

// ============================================
// MAIN CITATION FUNCTIONS
// ============================================

/**
 * Format a complete citation for a document.
 *
 * Bluebook style: "Document Name, at 5 (Jan. 15, 2024)"
 * OSCOLA style: "Document Name [5] (15 January 2024)"
 * Neutral style: "Document Name, p. 5 (2024-01-15)"
 *
 * @param document - The document to cite
 * @param pageNumber - Optional page number
 * @param options - Citation formatting options
 * @returns Complete Citation object
 */
export function formatCitation(
  document: Document | { id: string; filename: string; doc_type?: DocType | null; created_at?: string },
  pageNumber?: number | null,
  options: Partial<CitationOptions> = {}
): Citation {
  const opts: CitationOptions = { ...DEFAULT_CITATION_OPTIONS, ...options }

  const documentName = formatDocumentName(
    document.filename,
    document.doc_type ?? null
  )
  const pageRef = formatPageReference(pageNumber, opts.style)
  const dateRef = opts.includeDate
    ? formatCitationDate(document.created_at ?? null, opts.style)
    : ''

  // Build the formatted citation string
  let formatted = documentName

  // Add page reference
  if (pageRef) {
    formatted += pageRef
  }

  // Add date in parentheses if available
  if (dateRef) {
    formatted += ` (${dateRef})`
  }

  return {
    formatted,
    documentId: document.id,
    documentName,
    pageNumber: pageNumber ?? null,
    documentDate: document.created_at,
    docType: document.doc_type ?? null,
  }
}

/**
 * Format a citation with paragraph reference.
 *
 * @param document - The document to cite
 * @param pageNumber - Optional page number
 * @param paragraph - Optional paragraph reference
 * @param options - Citation formatting options
 * @returns Complete Citation object with paragraph
 */
export function formatCitationWithParagraph(
  document: Document | { id: string; filename: string; doc_type?: DocType | null; created_at?: string },
  pageNumber?: number | null,
  paragraph?: string | null,
  options: Partial<CitationOptions> = {}
): Citation {
  const opts: CitationOptions = { ...DEFAULT_CITATION_OPTIONS, ...options }

  const documentName = formatDocumentName(
    document.filename,
    document.doc_type ?? null
  )
  const pageRef = formatPageReference(pageNumber, opts.style)
  const paraRef = opts.includeParagraph
    ? formatParagraphReference(paragraph, opts.style)
    : ''
  const dateRef = opts.includeDate
    ? formatCitationDate(document.created_at ?? null, opts.style)
    : ''

  // Build the formatted citation string
  let formatted = documentName

  // Add page reference
  if (pageRef) {
    formatted += pageRef
  }

  // Add paragraph reference
  if (paraRef) {
    formatted += paraRef
  }

  // Add date in parentheses if available
  if (dateRef) {
    formatted += ` (${dateRef})`
  }

  return {
    formatted,
    documentId: document.id,
    documentName,
    pageNumber: pageNumber ?? null,
    paragraph: paragraph ?? undefined,
    documentDate: document.created_at,
    docType: document.doc_type ?? null,
  }
}

/**
 * Format a short-form citation for repeated references.
 * Used when the same document has been cited previously.
 *
 * @param citation - The original full citation
 * @param newPageNumber - New page number for this reference
 * @param options - Citation formatting options
 * @returns Short-form citation string
 */
export function formatShortCitation(
  citation: Citation,
  newPageNumber?: number | null,
  options: Partial<CitationOptions> = {}
): string {
  const opts: CitationOptions = { ...DEFAULT_CITATION_OPTIONS, ...options }

  if (!opts.useShortForm) {
    // Return full document name with new page reference
    const pageRef = formatPageReference(newPageNumber, opts.style)
    return citation.documentName + pageRef
  }

  // Create abbreviated short form
  // Take first few words of document name
  const words = citation.documentName.split(' ')
  const shortName =
    words.length > 3 ? words.slice(0, 3).join(' ') + '...' : citation.documentName

  const pageRef = formatPageReference(newPageNumber, opts.style)
  return shortName + pageRef
}

// ============================================
// QUOTE FORMATTING FUNCTIONS
// ============================================

/**
 * Escape special characters in quote text for safe rendering.
 *
 * @param text - The quote text
 * @returns Escaped text safe for PDF/Word rendering
 */
export function escapeQuoteText(text: string): string {
  if (!text) {
    return ''
  }

  return text
    // Normalize various quote characters
    .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
    .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
    // Escape special characters for rendering
    .replace(/&/g, '&amp;')
    // Normalize whitespace
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, '    ')
}

/**
 * Truncate quote text if it exceeds maximum length.
 *
 * @param text - The quote text
 * @param maxLength - Maximum character length (default: MAX_QUOTE_LENGTH)
 * @returns Object with truncated text and truncation flag
 */
export function truncateQuote(
  text: string,
  maxLength: number = MAX_QUOTE_LENGTH
): { text: string; truncated: boolean } {
  if (!text) {
    return { text: '', truncated: false }
  }

  if (text.length <= maxLength) {
    return { text, truncated: false }
  }

  // Find a good break point (end of sentence or word)
  let breakPoint = maxLength

  // Look for sentence end within last 100 characters
  const sentenceEnd = text.lastIndexOf('.', maxLength)
  if (sentenceEnd > maxLength - 100) {
    breakPoint = sentenceEnd + 1
  } else {
    // Look for word boundary
    const wordEnd = text.lastIndexOf(' ', maxLength)
    if (wordEnd > maxLength - 50) {
      breakPoint = wordEnd
    }
  }

  return {
    text: text.slice(0, breakPoint).trim() + ' ' + TRUNCATION_INDICATOR,
    truncated: true,
  }
}

/**
 * Format a quote with its citation for display.
 *
 * @param text - The quote text
 * @param citation - The citation for the quote source
 * @param options - Citation formatting options
 * @returns Complete DocumentQuote object
 */
export function formatQuote(
  text: string,
  citation: Citation,
  options: {
    pageNumber?: number | null
    charOffset?: number
    charLength?: number
    contextBefore?: string
    contextAfter?: string
    maxLength?: number
  } = {}
): DocumentQuote {
  const escaped = escapeQuoteText(text)
  const { text: truncatedText, truncated } = truncateQuote(
    escaped,
    options.maxLength
  )

  return {
    text: truncatedText,
    documentId: citation.documentId,
    pageNumber: options.pageNumber ?? citation.pageNumber,
    citation,
    charOffset: options.charOffset,
    charLength: options.charLength,
    truncated,
    contextBefore: options.contextBefore
      ? escapeQuoteText(options.contextBefore)
      : undefined,
    contextAfter: options.contextAfter
      ? escapeQuoteText(options.contextAfter)
      : undefined,
  }
}

// ============================================
// FINDING REFERENCE FUNCTIONS
// ============================================

/**
 * Format a reference to a finding for the audit trail.
 *
 * @param finding - The finding to reference
 * @param document - The source document (optional)
 * @param options - Citation formatting options
 * @returns Formatted reference string
 */
export function formatReference(
  finding: Finding,
  document?: Document | null,
  options: Partial<CitationOptions> = {}
): string {
  const parts: string[] = []

  // Add finding title
  parts.push(finding.title)

  // Add severity if present
  if (finding.severity) {
    parts.push(`[${finding.severity.toUpperCase()}]`)
  }

  // Add source document citation if available
  if (document) {
    const citation = formatCitation(document, null, options)
    parts.push(`(${citation.formatted})`)
  }

  return parts.join(' ')
}

/**
 * Create a citation from evidence metadata.
 * Used when evidence JSON contains document references.
 *
 * @param evidence - Evidence JSON object with document info
 * @param options - Citation formatting options
 * @returns Citation object or null if insufficient data
 */
export function citationFromEvidence(
  evidence: {
    document_id?: string
    document_name?: string
    filename?: string
    page?: number
    page_number?: number
    doc_type?: DocType | null
    date?: string
  },
  options: Partial<CitationOptions> = {}
): Citation | null {
  const documentId = evidence.document_id
  const documentName = evidence.document_name ?? evidence.filename

  if (!documentId || !documentName) {
    return null
  }

  const pageNumber = evidence.page ?? evidence.page_number ?? null

  return formatCitation(
    {
      id: documentId,
      filename: documentName,
      doc_type: evidence.doc_type ?? null,
      created_at: evidence.date,
    },
    pageNumber,
    options
  )
}

// ============================================
// BATCH CITATION FUNCTIONS
// ============================================

/**
 * Track citations for short-form reference optimization.
 */
export class CitationTracker {
  private citedDocuments: Map<string, Citation> = new Map()

  /**
   * Add a citation and return formatted string.
   * First occurrence returns full citation, subsequent returns short form.
   *
   * @param document - The document to cite
   * @param pageNumber - Page number for this citation
   * @param options - Citation formatting options
   * @returns Formatted citation string
   */
  cite(
    document: Document | { id: string; filename: string; doc_type?: DocType | null; created_at?: string },
    pageNumber?: number | null,
    options: Partial<CitationOptions> = {}
  ): string {
    const opts: CitationOptions = { ...DEFAULT_CITATION_OPTIONS, ...options }

    if (this.citedDocuments.has(document.id) && opts.useShortForm) {
      const original = this.citedDocuments.get(document.id)!
      return formatShortCitation(original, pageNumber, opts)
    }

    const citation = formatCitation(document, pageNumber, opts)
    this.citedDocuments.set(document.id, citation)
    return citation.formatted
  }

  /**
   * Get the full citation for a document ID.
   *
   * @param documentId - The document ID
   * @returns The full citation or undefined
   */
  getCitation(documentId: string): Citation | undefined {
    return this.citedDocuments.get(documentId)
  }

  /**
   * Check if a document has been cited.
   *
   * @param documentId - The document ID
   * @returns True if document has been cited
   */
  hasCited(documentId: string): boolean {
    return this.citedDocuments.has(documentId)
  }

  /**
   * Get all cited documents.
   *
   * @returns Array of all citations
   */
  getAllCitations(): Citation[] {
    return Array.from(this.citedDocuments.values())
  }

  /**
   * Reset the tracker for a new section.
   */
  reset(): void {
    this.citedDocuments.clear()
  }
}

// ============================================
// PLACEHOLDER FUNCTIONS
// ============================================

/**
 * Get placeholder text for unavailable source documents.
 *
 * @param documentId - The missing document ID
 * @returns Placeholder citation text
 */
export function getSourceUnavailablePlaceholder(
  documentId?: string
): string {
  if (documentId) {
    return `[Source unavailable: ${documentId}]`
  }
  return '[Source unavailable]'
}

/**
 * Create a placeholder citation for missing documents.
 *
 * @param documentId - The missing document ID
 * @param documentName - Optional known document name
 * @returns Placeholder Citation object
 */
export function createPlaceholderCitation(
  documentId: string,
  documentName?: string
): Citation {
  return {
    formatted: documentName
      ? `${documentName} [Source unavailable]`
      : getSourceUnavailablePlaceholder(documentId),
    documentId,
    documentName: documentName ?? '[Unknown Document]',
    pageNumber: null,
    docType: null,
  }
}
