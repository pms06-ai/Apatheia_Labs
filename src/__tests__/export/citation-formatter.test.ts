/**
 * Citation Formatter Tests
 *
 * Tests for Bluebook-style legal citation formatting utilities.
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import type { Document, DocType, Finding } from '@/CONTRACT'
import type { Citation, CitationOptions, CitationStyle } from '@/lib/types/export'
import {
  // Constants
  DOC_TYPE_LABELS,
  DEFAULT_CITATION_OPTIONS,
  // Utility functions
  formatDocumentName,
  formatPageReference,
  formatParagraphReference,
  formatCitationDate,
  // Main citation functions
  formatCitation,
  formatCitationWithParagraph,
  formatShortCitation,
  // Quote functions
  escapeQuoteText,
  truncateQuote,
  formatQuote,
  // Reference functions
  formatReference,
  citationFromEvidence,
  // Batch citation
  CitationTracker,
  // Placeholder functions
  getSourceUnavailablePlaceholder,
  createPlaceholderCitation,
} from '@/lib/export/citation-formatter'
import { MAX_QUOTE_LENGTH, TRUNCATION_INDICATOR } from '@/lib/types/export'

// ============================================
// TEST FIXTURES
// ============================================

const createMockDocument = (overrides: Partial<Document> = {}): Document => ({
  id: 'doc-123',
  case_id: 'case-456',
  filename: 'witness_statement.pdf',
  file_type: 'application/pdf',
  file_size: 1024,
  file_path: '/documents/witness_statement.pdf',
  hash_sha256: 'abc123',
  acquisition_date: '2024-01-15T10:30:00Z',
  doc_type: 'witness_statement' as DocType,
  source_entity: null,
  status: 'completed',
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-15T10:30:00Z',
  ...overrides,
})

const createMockFinding = (overrides: Partial<Finding> = {}): Finding => ({
  id: 'finding-123',
  case_id: 'case-456',
  document_id: 'doc-123',
  engine: 'contradiction',
  title: 'Inconsistent Timeline',
  description: 'The witness timeline contradicts the official record.',
  severity: 'high',
  confidence: 0.85,
  evidence: JSON.stringify({ quotes: ['The event occurred on March 15'] }),
  metadata: {},
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-15T10:30:00Z',
  ...overrides,
})

// ============================================
// UTILITY FUNCTION TESTS
// ============================================

describe('formatDocumentName', () => {
  it('should remove file extensions', () => {
    expect(formatDocumentName('report.pdf')).toBe('Report')
    expect(formatDocumentName('document.docx')).toBe('Document')
    expect(formatDocumentName('file.txt')).toBe('File')
    expect(formatDocumentName('memo.rtf')).toBe('Memo')
    expect(formatDocumentName('notes.odt')).toBe('Notes')
  })

  it('should convert underscores to spaces', () => {
    expect(formatDocumentName('witness_statement.pdf')).toBe('Witness Statement')
    expect(formatDocumentName('court_order_2024.pdf')).toBe('Court Order 2024')
  })

  it('should handle title case conversion', () => {
    expect(formatDocumentName('all lower case.pdf')).toBe('All Lower Case')
    expect(formatDocumentName('ALL UPPER CASE.pdf')).toBe('All Upper Case')
  })

  it('should preserve mixed case', () => {
    expect(formatDocumentName('FBI Report.pdf')).toBe('FBI Report')
    expect(formatDocumentName('McDonalds Invoice.pdf')).toBe('McDonalds Invoice')
  })

  it('should return placeholder for empty filename', () => {
    expect(formatDocumentName('')).toBe('[Untitled Document]')
    expect(formatDocumentName('   ')).toBe('[Untitled Document]')
  })

  it('should use doc type label when filename results in empty', () => {
    expect(formatDocumentName('.pdf', 'court_order')).toBe('Court Order')
    expect(formatDocumentName('.pdf', 'witness_statement')).toBe('Witness Statement')
  })

  it('should use default placeholder for "other" doc type', () => {
    expect(formatDocumentName('.pdf', 'other')).toBe('[Untitled Document]')
  })
})

describe('formatPageReference', () => {
  describe('Bluebook style', () => {
    it('should format page reference with "at"', () => {
      expect(formatPageReference(5, 'bluebook')).toBe(', at 5')
      expect(formatPageReference(123, 'bluebook')).toBe(', at 123')
    })
  })

  describe('OSCOLA style', () => {
    it('should format page reference with brackets', () => {
      expect(formatPageReference(5, 'oscola')).toBe(' [5]')
      expect(formatPageReference(123, 'oscola')).toBe(' [123]')
    })
  })

  describe('Neutral style', () => {
    it('should format page reference with "p."', () => {
      expect(formatPageReference(5, 'neutral')).toBe(', p. 5')
      expect(formatPageReference(123, 'neutral')).toBe(', p. 123')
    })
  })

  it('should return empty string for null/undefined page', () => {
    expect(formatPageReference(null)).toBe('')
    expect(formatPageReference(undefined)).toBe('')
  })

  it('should return empty string for invalid page numbers', () => {
    expect(formatPageReference(0)).toBe('')
    expect(formatPageReference(-1)).toBe('')
  })

  it('should default to bluebook style', () => {
    expect(formatPageReference(5)).toBe(', at 5')
  })
})

describe('formatParagraphReference', () => {
  describe('Bluebook style', () => {
    it('should format numeric paragraph with "para."', () => {
      expect(formatParagraphReference('5', 'bluebook')).toBe(' para. 5')
      expect(formatParagraphReference('123', 'bluebook')).toBe(' para. 123')
    })

    it('should preserve non-numeric references', () => {
      expect(formatParagraphReference('Section A', 'bluebook')).toBe(' Section A')
    })
  })

  describe('OSCOLA style', () => {
    it('should format numeric paragraph with "para"', () => {
      expect(formatParagraphReference('5', 'oscola')).toBe(' para 5')
    })
  })

  describe('Neutral style', () => {
    it('should format numeric paragraph with "sec."', () => {
      expect(formatParagraphReference('5', 'neutral')).toBe(' sec. 5')
    })
  })

  it('should return empty string for null/undefined/empty', () => {
    expect(formatParagraphReference(null)).toBe('')
    expect(formatParagraphReference(undefined)).toBe('')
    expect(formatParagraphReference('')).toBe('')
    expect(formatParagraphReference('   ')).toBe('')
  })
})

describe('formatCitationDate', () => {
  describe('Bluebook style', () => {
    it('should format date as "Mon. DD, YYYY"', () => {
      const result = formatCitationDate('2024-01-15T10:30:00Z', 'bluebook')
      expect(result).toMatch(/Jan\.?\s+15,?\s+2024/)
    })
  })

  describe('OSCOLA style', () => {
    it('should format date as "DD Month YYYY"', () => {
      const result = formatCitationDate('2024-01-15T10:30:00Z', 'oscola')
      expect(result).toMatch(/15\s+January\s+2024/)
    })
  })

  describe('Neutral style', () => {
    it('should format date as ISO format', () => {
      const result = formatCitationDate('2024-01-15T10:30:00Z', 'neutral')
      expect(result).toBe('2024-01-15')
    })
  })

  it('should return empty string for null/undefined', () => {
    expect(formatCitationDate(null)).toBe('')
    expect(formatCitationDate(undefined)).toBe('')
  })

  it('should return empty string for invalid dates', () => {
    expect(formatCitationDate('not-a-date')).toBe('')
    expect(formatCitationDate('')).toBe('')
  })
})

// ============================================
// MAIN CITATION FUNCTION TESTS
// ============================================

describe('formatCitation', () => {
  it('should format a basic citation', () => {
    const doc = createMockDocument()
    const citation = formatCitation(doc, 5)

    expect(citation.documentId).toBe('doc-123')
    expect(citation.documentName).toBe('Witness Statement')
    expect(citation.pageNumber).toBe(5)
    expect(citation.docType).toBe('witness_statement')
  })

  it('should include page reference in formatted string', () => {
    const doc = createMockDocument()
    const citation = formatCitation(doc, 5)

    // Should contain page reference
    expect(citation.formatted).toContain('at 5')
  })

  it('should include date when includeDate is true', () => {
    const doc = createMockDocument()
    const citation = formatCitation(doc, 5, { includeDate: true })

    // Should contain year
    expect(citation.formatted).toContain('2024')
  })

  it('should exclude date when includeDate is false', () => {
    const doc = createMockDocument()
    const citation = formatCitation(doc, 5, { includeDate: false })

    // Should not contain parenthesized date
    expect(citation.formatted).not.toMatch(/\(\w+\.?\s+\d+,?\s+\d{4}\)/)
  })

  it('should handle null page number', () => {
    const doc = createMockDocument()
    const citation = formatCitation(doc, null)

    expect(citation.pageNumber).toBeNull()
    expect(citation.formatted).not.toContain('at')
  })

  it('should handle different citation styles', () => {
    const doc = createMockDocument()

    const bluebook = formatCitation(doc, 5, { style: 'bluebook' })
    const oscola = formatCitation(doc, 5, { style: 'oscola' })
    const neutral = formatCitation(doc, 5, { style: 'neutral' })

    expect(bluebook.formatted).toContain('at 5')
    expect(oscola.formatted).toContain('[5]')
    expect(neutral.formatted).toContain('p. 5')
  })

  it('should work with minimal document object', () => {
    const minimalDoc = {
      id: 'min-doc',
      filename: 'report.pdf',
    }

    const citation = formatCitation(minimalDoc, 10)

    expect(citation.documentId).toBe('min-doc')
    expect(citation.documentName).toBe('Report')
    expect(citation.pageNumber).toBe(10)
    expect(citation.docType).toBeNull()
  })
})

describe('formatCitationWithParagraph', () => {
  it('should include paragraph when option is enabled', () => {
    const doc = createMockDocument()
    const citation = formatCitationWithParagraph(doc, 5, '12', {
      includeParagraph: true,
    })

    expect(citation.paragraph).toBe('12')
    expect(citation.formatted).toContain('para')
  })

  it('should exclude paragraph when option is disabled', () => {
    const doc = createMockDocument()
    const citation = formatCitationWithParagraph(doc, 5, '12', {
      includeParagraph: false,
    })

    expect(citation.paragraph).toBe('12')
    expect(citation.formatted).not.toContain('para')
  })
})

describe('formatShortCitation', () => {
  it('should abbreviate long document names', () => {
    const citation: Citation = {
      formatted: 'This Is A Very Long Document Name With Many Words',
      documentId: 'doc-123',
      documentName: 'This Is A Very Long Document Name With Many Words',
      pageNumber: 1,
      docType: null,
    }

    const short = formatShortCitation(citation, 10)

    expect(short).toContain('...')
    expect(short).toContain('at 10')
    expect(short.length).toBeLessThan(citation.documentName.length + 10)
  })

  it('should not abbreviate short document names', () => {
    const citation: Citation = {
      formatted: 'Short Name',
      documentId: 'doc-123',
      documentName: 'Short Name',
      pageNumber: 1,
      docType: null,
    }

    const short = formatShortCitation(citation, 10, { useShortForm: true })

    expect(short).not.toContain('...')
    expect(short).toContain('Short Name')
  })

  it('should return full name when useShortForm is false', () => {
    const citation: Citation = {
      formatted: 'This Is A Very Long Document Name',
      documentId: 'doc-123',
      documentName: 'This Is A Very Long Document Name',
      pageNumber: 1,
      docType: null,
    }

    const result = formatShortCitation(citation, 10, { useShortForm: false })

    expect(result).toContain('This Is A Very Long Document Name')
    expect(result).not.toContain('...')
  })
})

// ============================================
// QUOTE FUNCTION TESTS
// ============================================

describe('escapeQuoteText', () => {
  it('should normalize smart quotes', () => {
    expect(escapeQuoteText('\u201CHello\u201D')).toBe('"Hello"')
    expect(escapeQuoteText('\u2018Hello\u2019')).toBe("'Hello'")
  })

  it('should escape ampersands', () => {
    expect(escapeQuoteText('Tom & Jerry')).toBe('Tom &amp; Jerry')
  })

  it('should normalize line endings', () => {
    expect(escapeQuoteText('Line1\r\nLine2')).toBe('Line1\nLine2')
    expect(escapeQuoteText('Line1\rLine2')).toBe('Line1\nLine2')
  })

  it('should convert tabs to spaces', () => {
    expect(escapeQuoteText('Col1\tCol2')).toBe('Col1    Col2')
  })

  it('should handle empty string', () => {
    expect(escapeQuoteText('')).toBe('')
  })
})

describe('truncateQuote', () => {
  it('should not truncate text under max length', () => {
    const text = 'Short quote text'
    const result = truncateQuote(text, 100)

    expect(result.text).toBe(text)
    expect(result.truncated).toBe(false)
  })

  it('should truncate text over max length', () => {
    const text = 'A'.repeat(100)
    const result = truncateQuote(text, 50)

    expect(result.truncated).toBe(true)
    expect(result.text).toContain(TRUNCATION_INDICATOR)
    expect(result.text.length).toBeLessThanOrEqual(60) // 50 + some buffer + indicator
  })

  it('should break at sentence end when possible', () => {
    const text = 'First sentence. Second sentence continues for a while. Third.'
    const result = truncateQuote(text, 30)

    expect(result.truncated).toBe(true)
    // Should break at sentence boundary
    expect(result.text.includes('. ')).toBe(true)
  })

  it('should handle empty string', () => {
    const result = truncateQuote('')

    expect(result.text).toBe('')
    expect(result.truncated).toBe(false)
  })

  it('should use default MAX_QUOTE_LENGTH', () => {
    const longText = 'A'.repeat(MAX_QUOTE_LENGTH + 100)
    const result = truncateQuote(longText)

    expect(result.truncated).toBe(true)
  })
})

describe('formatQuote', () => {
  it('should create a complete DocumentQuote object', () => {
    const citation: Citation = {
      formatted: 'Test Document, at 5',
      documentId: 'doc-123',
      documentName: 'Test Document',
      pageNumber: 5,
      docType: null,
    }

    const quote = formatQuote('This is the quoted text.', citation)

    expect(quote.text).toBe('This is the quoted text.')
    expect(quote.documentId).toBe('doc-123')
    expect(quote.pageNumber).toBe(5)
    expect(quote.citation).toBe(citation)
    expect(quote.truncated).toBe(false)
  })

  it('should handle context before and after', () => {
    const citation: Citation = {
      formatted: 'Test Document',
      documentId: 'doc-123',
      documentName: 'Test Document',
      pageNumber: null,
      docType: null,
    }

    const quote = formatQuote('Main quote', citation, {
      contextBefore: 'Before text',
      contextAfter: 'After text',
    })

    expect(quote.contextBefore).toBe('Before text')
    expect(quote.contextAfter).toBe('After text')
  })

  it('should override page number from options', () => {
    const citation: Citation = {
      formatted: 'Test Document',
      documentId: 'doc-123',
      documentName: 'Test Document',
      pageNumber: 5,
      docType: null,
    }

    const quote = formatQuote('Quote text', citation, { pageNumber: 10 })

    expect(quote.pageNumber).toBe(10)
  })

  it('should escape special characters in quote text', () => {
    const citation: Citation = {
      formatted: 'Test Document',
      documentId: 'doc-123',
      documentName: 'Test Document',
      pageNumber: null,
      docType: null,
    }

    const quote = formatQuote('Tom & Jerry', citation)

    expect(quote.text).toBe('Tom &amp; Jerry')
  })
})

// ============================================
// REFERENCE FUNCTION TESTS
// ============================================

describe('formatReference', () => {
  it('should format a finding reference', () => {
    const finding = createMockFinding()
    const ref = formatReference(finding)

    expect(ref).toContain('Inconsistent Timeline')
    expect(ref).toContain('[HIGH]')
  })

  it('should include document citation when provided', () => {
    const finding = createMockFinding()
    const doc = createMockDocument()
    const ref = formatReference(finding, doc)

    expect(ref).toContain('Inconsistent Timeline')
    expect(ref).toContain('Witness Statement')
  })

  it('should handle finding without severity', () => {
    const finding = createMockFinding({ severity: null })
    const ref = formatReference(finding)

    expect(ref).toContain('Inconsistent Timeline')
    expect(ref).not.toContain('[')
  })
})

describe('citationFromEvidence', () => {
  it('should create citation from evidence metadata', () => {
    const evidence = {
      document_id: 'doc-123',
      document_name: 'Evidence Report',
      page: 15,
    }

    const citation = citationFromEvidence(evidence)

    expect(citation).not.toBeNull()
    expect(citation!.documentId).toBe('doc-123')
    expect(citation!.documentName).toBe('Evidence Report')
    expect(citation!.pageNumber).toBe(15)
  })

  it('should use filename if document_name not provided', () => {
    const evidence = {
      document_id: 'doc-123',
      filename: 'report.pdf',
    }

    const citation = citationFromEvidence(evidence)

    expect(citation).not.toBeNull()
    expect(citation!.documentName).toBe('Report')
  })

  it('should return null if required fields missing', () => {
    expect(citationFromEvidence({})).toBeNull()
    expect(citationFromEvidence({ document_id: 'doc-123' })).toBeNull()
    expect(citationFromEvidence({ document_name: 'Test' })).toBeNull()
  })

  it('should handle page_number alternative field', () => {
    const evidence = {
      document_id: 'doc-123',
      filename: 'test.pdf',
      page_number: 20,
    }

    const citation = citationFromEvidence(evidence)

    expect(citation!.pageNumber).toBe(20)
  })
})

// ============================================
// CITATION TRACKER TESTS
// ============================================

describe('CitationTracker', () => {
  let tracker: CitationTracker

  beforeEach(() => {
    tracker = new CitationTracker()
  })

  it('should return full citation on first occurrence', () => {
    const doc = createMockDocument()
    const result = tracker.cite(doc, 5)

    expect(result).toContain('Witness Statement')
    expect(result).toContain('at 5')
  })

  it('should return short form on subsequent occurrences', () => {
    const doc = createMockDocument({
      filename: 'This Is A Very Long Document Name.pdf',
    })

    const first = tracker.cite(doc, 5)
    const second = tracker.cite(doc, 10)

    expect(first.length).toBeGreaterThan(second.length)
    expect(second).toContain('at 10')
  })

  it('should track if document has been cited', () => {
    const doc = createMockDocument()

    expect(tracker.hasCited(doc.id)).toBe(false)
    tracker.cite(doc, 5)
    expect(tracker.hasCited(doc.id)).toBe(true)
  })

  it('should get citation by document ID', () => {
    const doc = createMockDocument()
    tracker.cite(doc, 5)

    const citation = tracker.getCitation(doc.id)

    expect(citation).toBeDefined()
    expect(citation!.documentId).toBe(doc.id)
  })

  it('should get all citations', () => {
    const doc1 = createMockDocument({ id: 'doc-1', filename: 'doc1.pdf' })
    const doc2 = createMockDocument({ id: 'doc-2', filename: 'doc2.pdf' })

    tracker.cite(doc1, 1)
    tracker.cite(doc2, 2)

    const all = tracker.getAllCitations()

    expect(all.length).toBe(2)
    expect(all.map((c) => c.documentId)).toContain('doc-1')
    expect(all.map((c) => c.documentId)).toContain('doc-2')
  })

  it('should reset tracker', () => {
    const doc = createMockDocument()
    tracker.cite(doc, 5)

    tracker.reset()

    expect(tracker.hasCited(doc.id)).toBe(false)
    expect(tracker.getAllCitations().length).toBe(0)
  })

  it('should return full citation when useShortForm is false', () => {
    const doc = createMockDocument({
      filename: 'This Is A Very Long Document Name.pdf',
    })

    tracker.cite(doc, 5, { useShortForm: false })
    const second = tracker.cite(doc, 10, { useShortForm: false })

    // Should still return full name even on second cite
    expect(second).toContain('This Is A Very Long Document Name')
  })
})

// ============================================
// PLACEHOLDER FUNCTION TESTS
// ============================================

describe('getSourceUnavailablePlaceholder', () => {
  it('should return placeholder with document ID', () => {
    const result = getSourceUnavailablePlaceholder('doc-123')
    expect(result).toBe('[Source unavailable: doc-123]')
  })

  it('should return generic placeholder without document ID', () => {
    const result = getSourceUnavailablePlaceholder()
    expect(result).toBe('[Source unavailable]')
  })
})

describe('createPlaceholderCitation', () => {
  it('should create placeholder citation with document name', () => {
    const citation = createPlaceholderCitation('doc-123', 'Known Document')

    expect(citation.documentId).toBe('doc-123')
    expect(citation.documentName).toBe('Known Document')
    expect(citation.formatted).toContain('Known Document')
    expect(citation.formatted).toContain('[Source unavailable]')
    expect(citation.pageNumber).toBeNull()
    expect(citation.docType).toBeNull()
  })

  it('should create placeholder citation without document name', () => {
    const citation = createPlaceholderCitation('doc-123')

    expect(citation.documentId).toBe('doc-123')
    expect(citation.documentName).toBe('[Unknown Document]')
    expect(citation.formatted).toContain('doc-123')
  })
})

// ============================================
// DOC TYPE LABELS TEST
// ============================================

describe('DOC_TYPE_LABELS', () => {
  it('should have labels for all doc types', () => {
    const docTypes: DocType[] = [
      'court_order',
      'witness_statement',
      'expert_report',
      'police_bundle',
      'social_work_assessment',
      'transcript',
      'correspondence',
      'media',
      'disclosure',
      'threshold_document',
      'position_statement',
      'other',
    ]

    docTypes.forEach((docType) => {
      expect(DOC_TYPE_LABELS[docType]).toBeDefined()
      expect(typeof DOC_TYPE_LABELS[docType]).toBe('string')
    })
  })

  it('should have human-readable labels', () => {
    expect(DOC_TYPE_LABELS.court_order).toBe('Court Order')
    expect(DOC_TYPE_LABELS.witness_statement).toBe('Witness Statement')
    expect(DOC_TYPE_LABELS.expert_report).toBe('Expert Report')
  })
})

// ============================================
// DEFAULT OPTIONS TEST
// ============================================

describe('DEFAULT_CITATION_OPTIONS', () => {
  it('should use Bluebook style by default', () => {
    expect(DEFAULT_CITATION_OPTIONS.style).toBe('bluebook')
  })

  it('should include date by default', () => {
    expect(DEFAULT_CITATION_OPTIONS.includeDate).toBe(true)
  })

  it('should exclude paragraph by default', () => {
    expect(DEFAULT_CITATION_OPTIONS.includeParagraph).toBe(false)
  })

  it('should use short form by default', () => {
    expect(DEFAULT_CITATION_OPTIONS.useShortForm).toBe(true)
  })
})
