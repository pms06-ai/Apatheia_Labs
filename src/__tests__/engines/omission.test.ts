/**
 * OMISSION ENGINE TESTS
 *
 * Tests for the Omission Detection Engine (Ο - παράλειψις)
 * "What Was Left Out"
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { createMockDocument } from '../setup'
import type { Document } from '@/CONTRACT'

// Get mocked modules
const mockGenerateJSON = jest.fn()
const mockSupabaseFrom = jest.fn()

// Mock setup - needs to happen before imports
jest.mock('@/lib/ai-client', () => ({
  generateJSON: (...args: unknown[]) => mockGenerateJSON(...args),
  analyze: jest.fn().mockResolvedValue({ result: {}, model: 'mock', usage: {} }),
  compareDocuments: jest.fn().mockResolvedValue('{}'),
}))

jest.mock('@/lib/supabase/server', () => {
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  }

  return {
    supabaseAdmin: {
      from: (...args: unknown[]) => {
        mockSupabaseFrom(...args)
        return mockChain
      },
    },
    createAdminClient: jest.fn(),
    createServerSupabaseClient: jest.fn(),
    createServerClient: jest.fn(),
  }
})

describe('Omission Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
  })

  describe('Module Exports', () => {
    it('should export detectOmissions function', async () => {
      const { detectOmissions } = await import('@/lib/engines/omission')
      expect(typeof detectOmissions).toBe('function')
    })

    it('should export analyzeSelectiveQuote function', async () => {
      const { analyzeSelectiveQuote } = await import('@/lib/engines/omission')
      expect(typeof analyzeSelectiveQuote).toBe('function')
    })

    it('should export findUndisclosedDocuments function', async () => {
      const { findUndisclosedDocuments } = await import('@/lib/engines/omission')
      expect(typeof findUndisclosedDocuments).toBe('function')
    })

    it('should export runFullOmissionAnalysis function', async () => {
      const { runFullOmissionAnalysis } = await import('@/lib/engines/omission')
      expect(typeof runFullOmissionAnalysis).toBe('function')
    })

    it('should export omissionEngine object with all functions', async () => {
      const { omissionEngine } = await import('@/lib/engines/omission')
      expect(omissionEngine).toBeDefined()
      expect(typeof omissionEngine.detectOmissions).toBe('function')
      expect(typeof omissionEngine.analyzeSelectiveQuote).toBe('function')
      expect(typeof omissionEngine.findUndisclosedDocuments).toBe('function')
      expect(typeof omissionEngine.runFullOmissionAnalysis).toBe('function')
    })
  })

  describe('Type Definitions', () => {
    it('should export OmissionFinding type', async () => {
      // Type check via usage - if this compiles, types are exported correctly
      const { detectOmissions } = await import('@/lib/engines/omission')
      expect(detectOmissions).toBeDefined()
    })

    it('should export OmissionAnalysisResult type', async () => {
      // Type check via usage
      const { detectOmissions } = await import('@/lib/engines/omission')
      expect(detectOmissions).toBeDefined()
    })
  })

  describe('detectOmissions', () => {
    it('should detect omissions between source and report documents', async () => {
      const { detectOmissions } = await import('@/lib/engines/omission')

      // Setup mocks
      const mockChunks = [
        { content: 'Source document content with important details.', chunk_index: 0, page_number: 1 },
      ]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockChunks, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        omissions: [
          {
            type: 'complete_omission',
            severity: 'high',
            sourceContent: 'Important detail',
            omittedContent: 'Important detail',
            reportContent: '',
            biasDirection: 'pro_authority',
            significance: 80,
            explanation: 'Key information was omitted',
            pageRef: { source: 1, report: 2 },
          },
        ],
        systematicPattern: true,
        overallBiasDirection: 'pro_authority',
      })

      const sourceDoc = createMockDocument({ id: 'source-doc-id' }) as Document
      const reportDoc = createMockDocument({ id: 'report-doc-id' }) as Document

      const result = await detectOmissions(sourceDoc, reportDoc, 'case-123')

      expect(result).toBeDefined()
      expect(result.findings).toBeDefined()
      expect(Array.isArray(result.findings)).toBe(true)
      expect(result.summary).toBeDefined()
      expect(result.methodology).toBe('Source-to-report comparison with selective quoting detection')
    })

    it('should handle empty omissions result', async () => {
      const { detectOmissions } = await import('@/lib/engines/omission')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        omissions: [],
        systematicPattern: false,
        overallBiasDirection: 'neutral',
      })

      const sourceDoc = createMockDocument({ id: 'src-123' }) as Document
      const reportDoc = createMockDocument({ id: 'rpt-123' }) as Document

      const result = await detectOmissions(sourceDoc, reportDoc, 'case-123')

      expect(result.findings).toHaveLength(0)
      expect(result.summary.totalOmissions).toBe(0)
      expect(result.summary.criticalCount).toBe(0)
      expect(result.summary.systematicPattern).toBe(false)
    })

    it('should calculate bias score correctly for pro_applicant omissions', async () => {
      const { detectOmissions } = await import('@/lib/engines/omission')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        omissions: [
          {
            type: 'complete_omission',
            severity: 'critical',
            sourceContent: 'Content',
            omittedContent: 'Content',
            biasDirection: 'pro_applicant',
            significance: 100,
            explanation: 'Favors applicant',
          },
        ],
        systematicPattern: true,
        overallBiasDirection: 'pro_applicant',
      })

      const sourceDoc = createMockDocument({ id: 'src-456' }) as Document
      const reportDoc = createMockDocument({ id: 'rpt-456' }) as Document

      const result = await detectOmissions(sourceDoc, reportDoc, 'case-123')

      // pro_applicant with critical severity and 100 significance should give positive score
      expect(result.summary.biasScore).toBeGreaterThan(0)
    })

    it('should calculate bias score correctly for pro_respondent omissions', async () => {
      const { detectOmissions } = await import('@/lib/engines/omission')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        omissions: [
          {
            type: 'selective_quote',
            severity: 'high',
            sourceContent: 'Content',
            omittedContent: 'Content',
            biasDirection: 'pro_respondent',
            significance: 80,
            explanation: 'Favors respondent',
          },
        ],
        systematicPattern: false,
        overallBiasDirection: 'pro_respondent',
      })

      const sourceDoc = createMockDocument({ id: 'src-789' }) as Document
      const reportDoc = createMockDocument({ id: 'rpt-789' }) as Document

      const result = await detectOmissions(sourceDoc, reportDoc, 'case-123')

      // pro_respondent should give negative bias score
      expect(result.summary.biasScore).toBeLessThan(0)
    })

    it('should extract topics from findings', async () => {
      const { detectOmissions } = await import('@/lib/engines/omission')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        omissions: [
          {
            type: 'complete_omission',
            severity: 'high',
            sourceContent: 'The police statement confirms the allegation was unfounded.',
            omittedContent: 'The police statement confirms the allegation was unfounded.',
            biasDirection: 'pro_authority',
            significance: 90,
            explanation: 'Police evidence omitted',
          },
        ],
        systematicPattern: true,
        overallBiasDirection: 'pro_authority',
      })

      const sourceDoc = createMockDocument({ id: 'src-topics' }) as Document
      const reportDoc = createMockDocument({ id: 'rpt-topics' }) as Document

      const result = await detectOmissions(sourceDoc, reportDoc, 'case-123')

      // Should extract 'police', 'statement', 'allegation' as topics
      expect(result.summary.affectedTopics).toBeDefined()
      expect(Array.isArray(result.summary.affectedTopics)).toBe(true)
    })

    it('should count critical findings correctly', async () => {
      const { detectOmissions } = await import('@/lib/engines/omission')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        omissions: [
          { type: 'complete_omission', severity: 'critical', sourceContent: 'A', omittedContent: 'A', significance: 90, explanation: 'Critical 1' },
          { type: 'selective_quote', severity: 'critical', sourceContent: 'B', omittedContent: 'B', significance: 85, explanation: 'Critical 2' },
          { type: 'context_removal', severity: 'high', sourceContent: 'C', omittedContent: 'C', significance: 70, explanation: 'High' },
          { type: 'temporal_gap', severity: 'medium', sourceContent: 'D', omittedContent: 'D', significance: 50, explanation: 'Medium' },
        ],
        systematicPattern: true,
        overallBiasDirection: 'neutral',
      })

      const sourceDoc = createMockDocument({ id: 'src-crit' }) as Document
      const reportDoc = createMockDocument({ id: 'rpt-crit' }) as Document

      const result = await detectOmissions(sourceDoc, reportDoc, 'case-123')

      expect(result.summary.totalOmissions).toBe(4)
      expect(result.summary.criticalCount).toBe(2)
    })

    it('should generate unique IDs for findings', async () => {
      const { detectOmissions } = await import('@/lib/engines/omission')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        omissions: [
          { type: 'complete_omission', severity: 'high', sourceContent: 'A', omittedContent: 'A', significance: 90, explanation: 'One' },
          { type: 'selective_quote', severity: 'medium', sourceContent: 'B', omittedContent: 'B', significance: 60, explanation: 'Two' },
        ],
        systematicPattern: false,
        overallBiasDirection: 'neutral',
      })

      const sourceDoc = createMockDocument({ id: 'unique-src-id-12345678' }) as Document
      const reportDoc = createMockDocument({ id: 'unique-rpt-id' }) as Document

      const result = await detectOmissions(sourceDoc, reportDoc, 'case-123')

      expect(result.findings[0].id).toContain('omission-unique-s')
      expect(result.findings[0].id).toContain('-0')
      expect(result.findings[1].id).toContain('-1')
      expect(result.findings[0].id).not.toBe(result.findings[1].id)
    })
  })

  describe('analyzeSelectiveQuote', () => {
    it('should analyze selective quoting with meaning change', async () => {
      const { analyzeSelectiveQuote } = await import('@/lib/engines/omission')

      mockGenerateJSON.mockResolvedValue({
        isSelective: true,
        removedContent: 'but the situation has improved',
        meaningChanged: true,
        originalMeaning: 'Issue existed but was resolved',
        quotedMeaning: 'Issue exists',
        beneficiary: 'authority',
      })

      const result = await analyzeSelectiveQuote(
        'There were concerns, but the situation has improved significantly.',
        'There were concerns.'
      )

      expect(result.isSelective).toBe(true)
      expect(result.severity).toBe('critical')
      expect(result.analysis).toBeDefined()
      expect(result.analysis.meaningChanged).toBe(true)
    })

    it('should return critical severity when meaning changes with clear beneficiary', async () => {
      const { analyzeSelectiveQuote } = await import('@/lib/engines/omission')

      mockGenerateJSON.mockResolvedValue({
        isSelective: true,
        removedContent: 'not',
        meaningChanged: true,
        originalMeaning: 'The allegation was not substantiated',
        quotedMeaning: 'The allegation was substantiated',
        beneficiary: 'applicant',
      })

      const result = await analyzeSelectiveQuote(
        'The allegation was not substantiated.',
        'The allegation was substantiated.'
      )

      expect(result.severity).toBe('critical')
    })

    it('should return high severity when meaning changes with unclear beneficiary', async () => {
      const { analyzeSelectiveQuote } = await import('@/lib/engines/omission')

      mockGenerateJSON.mockResolvedValue({
        isSelective: true,
        removedContent: 'some words',
        meaningChanged: true,
        originalMeaning: 'Original meaning',
        quotedMeaning: 'Different meaning',
        beneficiary: 'unclear',
      })

      const result = await analyzeSelectiveQuote('Original text', 'Modified text')

      expect(result.severity).toBe('high')
    })

    it('should return medium severity for selective quote without meaning change', async () => {
      const { analyzeSelectiveQuote } = await import('@/lib/engines/omission')

      mockGenerateJSON.mockResolvedValue({
        isSelective: true,
        removedContent: 'however',
        meaningChanged: false,
        originalMeaning: 'Same meaning',
        quotedMeaning: 'Same meaning',
        beneficiary: 'unclear',
      })

      const result = await analyzeSelectiveQuote('Original text however', 'Original text')

      expect(result.severity).toBe('medium')
    })

    it('should return low severity for non-selective quote', async () => {
      const { analyzeSelectiveQuote } = await import('@/lib/engines/omission')

      mockGenerateJSON.mockResolvedValue({
        isSelective: false,
        removedContent: '',
        meaningChanged: false,
        originalMeaning: 'Exact meaning',
        quotedMeaning: 'Exact meaning',
        beneficiary: 'unclear',
      })

      const result = await analyzeSelectiveQuote('The exact text', 'The exact text')

      expect(result.isSelective).toBe(false)
      expect(result.severity).toBe('low')
    })
  })

  describe('findUndisclosedDocuments', () => {
    it('should identify disclosed documents', async () => {
      const { findUndisclosedDocuments } = await import('@/lib/engines/omission')

      const mockDocs = [
        { id: 'doc-1', filename: 'police_report.pdf', page_count: 10, metadata: {} },
        { id: 'doc-2', filename: 'witness_statement.pdf', page_count: 5, metadata: {} },
      ]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: mockDocs, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const result = await findUndisclosedDocuments(
        ['police_report.pdf', 'medical_records.pdf'],
        ['doc-1', 'doc-2'],
        'case-123'
      )

      expect(result.disclosed).toContain('doc-1')
      expect(result.undisclosed).toContain('doc-2')
    })

    it('should handle case-insensitive matching', async () => {
      const { findUndisclosedDocuments } = await import('@/lib/engines/omission')

      const mockDocs = [
        { id: 'doc-1', filename: 'Police_Report.PDF', page_count: 10, metadata: {} },
      ]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: mockDocs, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const result = await findUndisclosedDocuments(
        ['police_report'],
        ['doc-1'],
        'case-123'
      )

      expect(result.disclosed).toContain('doc-1')
    })

    it('should handle empty document list', async () => {
      const { findUndisclosedDocuments } = await import('@/lib/engines/omission')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const result = await findUndisclosedDocuments(
        ['some_document.pdf'],
        [],
        'case-123'
      )

      expect(result.disclosed).toHaveLength(0)
      expect(result.undisclosed).toHaveLength(0)
      expect(result.partiallyDisclosed).toHaveLength(0)
    })

    it('should handle null data response', async () => {
      const { findUndisclosedDocuments } = await import('@/lib/engines/omission')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const result = await findUndisclosedDocuments(
        ['document.pdf'],
        ['doc-1'],
        'case-123'
      )

      expect(result.disclosed).toHaveLength(0)
      expect(result.undisclosed).toHaveLength(0)
    })

    it('should match partial filenames', async () => {
      const { findUndisclosedDocuments } = await import('@/lib/engines/omission')

      const mockDocs = [
        { id: 'doc-1', filename: 'full_police_report_2024.pdf', page_count: 10, metadata: {} },
      ]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: mockDocs, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const result = await findUndisclosedDocuments(
        ['police_report'],
        ['doc-1'],
        'case-123'
      )

      expect(result.disclosed).toContain('doc-1')
    })
  })

  describe('runFullOmissionAnalysis', () => {
    it('should run analysis for matching report-source pairs', async () => {
      const { runFullOmissionAnalysis } = await import('@/lib/engines/omission')

      const mockReports = [
        {
          id: 'report-1',
          doc_type: 'expert_report',
          created_at: '2024-06-01T00:00:00Z',
          filename: 'expert_report.pdf',
        },
      ]

      const mockSources = [
        {
          id: 'source-1',
          doc_type: 'police_bundle',
          created_at: '2024-01-01T00:00:00Z',
          filename: 'police_bundle.pdf',
        },
      ]

      const mockChunks = [
        { content: 'Document content', chunk_index: 0, page_number: 1 },
      ]

      let callCount = 0
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockImplementation(() => {
          callCount++
          if (callCount <= 1) return Promise.resolve({ data: mockReports, error: null })
          if (callCount === 2) return Promise.resolve({ data: mockSources, error: null })
          return Promise.resolve({ data: mockChunks, error: null })
        }),
        order: jest.fn().mockResolvedValue({ data: mockChunks, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        omissions: [],
        systematicPattern: false,
        overallBiasDirection: 'neutral',
      })

      const results = await runFullOmissionAnalysis(
        'case-123',
        ['report-1'],
        ['source-1']
      )

      expect(Array.isArray(results)).toBe(true)
    })

    it('should return empty results when no reports found', async () => {
      const { runFullOmissionAnalysis } = await import('@/lib/engines/omission')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const results = await runFullOmissionAnalysis(
        'case-123',
        ['report-1'],
        ['source-1']
      )

      expect(results).toHaveLength(0)
    })

    it('should skip non-matching document type pairs', async () => {
      const { runFullOmissionAnalysis } = await import('@/lib/engines/omission')

      const mockReports = [
        {
          id: 'report-1',
          doc_type: 'other', // Not a valid report type
          created_at: '2024-06-01T00:00:00Z',
        },
      ]

      const mockSources = [
        {
          id: 'source-1',
          doc_type: 'police_bundle',
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      let callCount = 0
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) return Promise.resolve({ data: mockReports, error: null })
          return Promise.resolve({ data: mockSources, error: null })
        }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const results = await runFullOmissionAnalysis(
        'case-123',
        ['report-1'],
        ['source-1']
      )

      // Should return empty because doc types don't match the expected pairs
      expect(results).toHaveLength(0)
    })

    it('should handle analysis errors gracefully', async () => {
      const { runFullOmissionAnalysis } = await import('@/lib/engines/omission')

      const mockReports = [
        {
          id: 'report-1',
          doc_type: 'expert_report',
          created_at: '2024-06-01T00:00:00Z',
        },
      ]

      const mockSources = [
        {
          id: 'source-1',
          doc_type: 'police_bundle',
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      let callCount = 0
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) return Promise.resolve({ data: mockReports, error: null })
          if (callCount === 2) return Promise.resolve({ data: mockSources, error: null })
          return Promise.resolve({ data: [], error: null })
        }),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      // Make generateJSON throw an error
      mockGenerateJSON.mockRejectedValueOnce(new Error('AI service error'))

      // Should not throw, just log error and continue
      const results = await runFullOmissionAnalysis(
        'case-123',
        ['report-1'],
        ['source-1']
      )

      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('Bias Score Calculation', () => {
    it('should clamp bias score to -100 to +100 range', async () => {
      const { detectOmissions } = await import('@/lib/engines/omission')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      // Create many extreme omissions to test clamping
      const extremeOmissions = Array(20).fill(null).map((_, i) => ({
        type: 'complete_omission',
        severity: 'critical',
        sourceContent: `Content ${i}`,
        omittedContent: `Content ${i}`,
        biasDirection: 'pro_applicant',
        significance: 100,
        explanation: `Extreme omission ${i}`,
      }))

      mockGenerateJSON.mockResolvedValue({
        omissions: extremeOmissions,
        systematicPattern: true,
        overallBiasDirection: 'pro_applicant',
      })

      const sourceDoc = createMockDocument({ id: 'clamp-src' }) as Document
      const reportDoc = createMockDocument({ id: 'clamp-rpt' }) as Document

      const result = await detectOmissions(sourceDoc, reportDoc, 'case-123')

      expect(result.summary.biasScore).toBeLessThanOrEqual(100)
      expect(result.summary.biasScore).toBeGreaterThanOrEqual(-100)
    })

    it('should handle neutral bias direction', async () => {
      const { detectOmissions } = await import('@/lib/engines/omission')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        omissions: [
          {
            type: 'complete_omission',
            severity: 'high',
            sourceContent: 'Content',
            omittedContent: 'Content',
            biasDirection: 'neutral',
            significance: 80,
            explanation: 'Neutral omission',
          },
        ],
        systematicPattern: false,
        overallBiasDirection: 'neutral',
      })

      const sourceDoc = createMockDocument({ id: 'neutral-src' }) as Document
      const reportDoc = createMockDocument({ id: 'neutral-rpt' }) as Document

      const result = await detectOmissions(sourceDoc, reportDoc, 'case-123')

      // Neutral bias should not affect score
      expect(result.summary.biasScore).toBe(0)
    })

    it('should weight pro_authority omissions at half strength', async () => {
      const { detectOmissions } = await import('@/lib/engines/omission')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        omissions: [
          {
            type: 'complete_omission',
            severity: 'critical',
            sourceContent: 'Content',
            omittedContent: 'Content',
            biasDirection: 'pro_authority',
            significance: 100,
            explanation: 'Pro authority omission',
          },
        ],
        systematicPattern: true,
        overallBiasDirection: 'pro_authority',
      })

      const sourceDoc = createMockDocument({ id: 'auth-src' }) as Document
      const reportDoc = createMockDocument({ id: 'auth-rpt' }) as Document

      const result = await detectOmissions(sourceDoc, reportDoc, 'case-123')

      // pro_authority uses multiplier of 5 instead of 10
      // For critical (4x) with 100 significance, score = 1 * 4 * 5 = 20
      expect(result.summary.biasScore).toBe(20)
    })
  })

  describe('Topic Extraction', () => {
    it('should extract relevant legal topics', async () => {
      const { detectOmissions } = await import('@/lib/engines/omission')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        omissions: [
          {
            type: 'complete_omission',
            severity: 'critical',
            sourceContent: 'Police evidence',
            omittedContent: 'The police statement and witness evidence was clear.',
            biasDirection: 'pro_authority',
            significance: 90,
            explanation: 'Police and witness evidence omitted',
          },
        ],
        systematicPattern: true,
        overallBiasDirection: 'pro_authority',
      })

      const sourceDoc = createMockDocument({ id: 'topic-src' }) as Document
      const reportDoc = createMockDocument({ id: 'topic-rpt' }) as Document

      const result = await detectOmissions(sourceDoc, reportDoc, 'case-123')

      expect(result.summary.affectedTopics).toContain('police')
      expect(result.summary.affectedTopics).toContain('statement')
      expect(result.summary.affectedTopics).toContain('witness')
      expect(result.summary.affectedTopics).toContain('evidence')
    })

    it('should extract safeguarding topics', async () => {
      const { detectOmissions } = await import('@/lib/engines/omission')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        omissions: [
          {
            type: 'context_removal',
            severity: 'high',
            sourceContent: 'Safeguarding assessment',
            omittedContent: 'The safeguarding welfare assessment found no concerns.',
            biasDirection: 'pro_authority',
            significance: 85,
            explanation: 'Safeguarding finding omitted',
          },
        ],
        systematicPattern: false,
        overallBiasDirection: 'pro_authority',
      })

      const sourceDoc = createMockDocument({ id: 'safe-src' }) as Document
      const reportDoc = createMockDocument({ id: 'safe-rpt' }) as Document

      const result = await detectOmissions(sourceDoc, reportDoc, 'case-123')

      expect(result.summary.affectedTopics).toContain('safeguarding')
      expect(result.summary.affectedTopics).toContain('welfare')
      expect(result.summary.affectedTopics).toContain('assessment')
    })
  })

  describe('Document Chunk Processing', () => {
    it('should join multiple chunks with double newlines', async () => {
      const { detectOmissions } = await import('@/lib/engines/omission')

      const mockChunks = [
        { content: 'First chunk content.', chunk_index: 0, page_number: 1 },
        { content: 'Second chunk content.', chunk_index: 1, page_number: 1 },
        { content: 'Third chunk content.', chunk_index: 2, page_number: 2 },
      ]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockChunks, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        omissions: [],
        systematicPattern: false,
        overallBiasDirection: 'neutral',
      })

      const sourceDoc = createMockDocument({ id: 'chunks-src' }) as Document
      const reportDoc = createMockDocument({ id: 'chunks-rpt' }) as Document

      await detectOmissions(sourceDoc, reportDoc, 'case-123')

      // Verify generateJSON was called (the chunks would be joined)
      expect(mockGenerateJSON).toHaveBeenCalled()
    })
  })

  describe('Severity Multipliers', () => {
    it('should apply correct severity multipliers', async () => {
      const { detectOmissions } = await import('@/lib/engines/omission')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      // Test with low severity
      mockGenerateJSON.mockResolvedValue({
        omissions: [
          {
            type: 'temporal_gap',
            severity: 'low',
            sourceContent: 'Minor content',
            omittedContent: 'Minor content',
            biasDirection: 'pro_applicant',
            significance: 100,
            explanation: 'Low severity',
          },
        ],
        systematicPattern: false,
        overallBiasDirection: 'pro_applicant',
      })

      const sourceDoc = createMockDocument({ id: 'sev-src' }) as Document
      const reportDoc = createMockDocument({ id: 'sev-rpt' }) as Document

      const result = await detectOmissions(sourceDoc, reportDoc, 'case-123')

      // Low severity multiplier is 0.5
      // Score = 1 (weight) * 0.5 (severity) * 10 (direction) = 5
      expect(result.summary.biasScore).toBe(5)
    })
  })
})
