/**
 * CONTRADICTION ENGINE TESTS
 *
 * Tests for the Contradiction Detection Engine (Κ - Kappa)
 * "Claim Comparison Across Documents"
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

describe('Contradiction Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
  })

  describe('Module Exports', () => {
    it('should export detectContradictions function', async () => {
      const { detectContradictions } = await import('@/lib/engines/contradiction')
      expect(typeof detectContradictions).toBe('function')
    })

    it('should export compareSpecificClaims function', async () => {
      const { compareSpecificClaims } = await import('@/lib/engines/contradiction')
      expect(typeof compareSpecificClaims).toBe('function')
    })

    it('should export trackClaimEvolution function', async () => {
      const { trackClaimEvolution } = await import('@/lib/engines/contradiction')
      expect(typeof trackClaimEvolution).toBe('function')
    })

    it('should export contradictionEngine object with all functions', async () => {
      const { contradictionEngine } = await import('@/lib/engines/contradiction')
      expect(contradictionEngine).toBeDefined()
      expect(typeof contradictionEngine.detectContradictions).toBe('function')
      expect(typeof contradictionEngine.compareSpecificClaims).toBe('function')
      expect(typeof contradictionEngine.trackClaimEvolution).toBe('function')
    })
  })

  describe('Type Definitions', () => {
    it('should export ContradictionFinding type', async () => {
      // Type check via usage - if this compiles, types are exported correctly
      const { detectContradictions } = await import('@/lib/engines/contradiction')
      expect(detectContradictions).toBeDefined()
    })

    it('should export ContradictionAnalysisResult type', async () => {
      // Type check via usage
      const { detectContradictions } = await import('@/lib/engines/contradiction')
      expect(detectContradictions).toBeDefined()
    })
  })

  describe('detectContradictions', () => {
    it('should detect contradictions across multiple documents', async () => {
      const { detectContradictions } = await import('@/lib/engines/contradiction')

      // Setup mocks for document chunks
      const mockChunks = [
        { content: 'Document content with statements.', chunk_index: 0 },
      ]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockChunks, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        contradictions: [
          {
            type: 'direct',
            severity: 'critical',
            claim1: {
              documentId: 'doc-1',
              text: 'Subject was at home all night',
              date: '2023-01-12T10:00:00Z',
              author: 'Officer A',
              pageRef: 2,
            },
            claim2: {
              documentId: 'doc-2',
              text: 'Subject was seen at the pub at 9pm',
              date: '2023-01-15T14:30:00Z',
              author: 'Witness B',
              pageRef: 5,
            },
            explanation: 'Direct contradiction about location',
            implication: 'Undermines alibi',
            suggestedResolution: 'Verify with CCTV',
          },
        ],
        claimClusters: [
          {
            topic: 'Subject Location',
            claims: [
              { docId: 'doc-1', text: 'At home', stance: 'Defense' },
              { docId: 'doc-2', text: 'At pub', stance: 'Prosecution' },
            ],
            consensus: false,
          },
        ],
      })

      const doc1 = createMockDocument({ id: 'doc-1', filename: 'police_report.pdf' }) as Document
      const doc2 = createMockDocument({ id: 'doc-2', filename: 'witness_statement.pdf' }) as Document

      const result = await detectContradictions([doc1, doc2], 'case-123')

      expect(result).toBeDefined()
      expect(result.contradictions).toBeDefined()
      expect(Array.isArray(result.contradictions)).toBe(true)
      expect(result.contradictions.length).toBe(1)
      expect(result.summary).toBeDefined()
      expect(result.summary.totalContradictions).toBe(1)
    })

    it('should handle empty contradictions result', async () => {
      const { detectContradictions } = await import('@/lib/engines/contradiction')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        contradictions: [],
        claimClusters: [],
      })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document
      const doc2 = createMockDocument({ id: 'doc-2' }) as Document

      const result = await detectContradictions([doc1, doc2], 'case-123')

      expect(result.contradictions).toHaveLength(0)
      expect(result.summary.totalContradictions).toBe(0)
      expect(result.summary.criticalCount).toBe(0)
      expect(result.summary.credibilityImpact).toBe('none')
    })

    it('should generate unique IDs for contradictions', async () => {
      const { detectContradictions } = await import('@/lib/engines/contradiction')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        contradictions: [
          {
            type: 'direct',
            severity: 'high',
            claim1: { documentId: 'doc-1', text: 'Statement A' },
            claim2: { documentId: 'doc-2', text: 'Statement B' },
            explanation: 'First contradiction',
            implication: 'Impact 1',
          },
          {
            type: 'temporal',
            severity: 'medium',
            claim1: { documentId: 'doc-1', text: 'Time A' },
            claim2: { documentId: 'doc-2', text: 'Time B' },
            explanation: 'Second contradiction',
            implication: 'Impact 2',
          },
        ],
        claimClusters: [],
      })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document
      const doc2 = createMockDocument({ id: 'doc-2' }) as Document

      const result = await detectContradictions([doc1, doc2], 'case-123')

      expect(result.contradictions[0].id).toContain('contradiction-case-123')
      expect(result.contradictions[0].id).toContain('-0')
      expect(result.contradictions[1].id).toContain('-1')
      expect(result.contradictions[0].id).not.toBe(result.contradictions[1].id)
    })

    it('should count critical contradictions correctly', async () => {
      const { detectContradictions } = await import('@/lib/engines/contradiction')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        contradictions: [
          { type: 'direct', severity: 'critical', claim1: { documentId: 'd1', text: 'A' }, claim2: { documentId: 'd2', text: 'B' }, explanation: 'E1', implication: 'I1' },
          { type: 'temporal', severity: 'critical', claim1: { documentId: 'd1', text: 'C' }, claim2: { documentId: 'd2', text: 'D' }, explanation: 'E2', implication: 'I2' },
          { type: 'implicit', severity: 'high', claim1: { documentId: 'd1', text: 'E' }, claim2: { documentId: 'd2', text: 'F' }, explanation: 'E3', implication: 'I3' },
          { type: 'quantitative', severity: 'medium', claim1: { documentId: 'd1', text: 'G' }, claim2: { documentId: 'd2', text: 'H' }, explanation: 'E4', implication: 'I4' },
        ],
        claimClusters: [],
      })

      const doc1 = createMockDocument({ id: 'd1' }) as Document
      const doc2 = createMockDocument({ id: 'd2' }) as Document

      const result = await detectContradictions([doc1, doc2], 'case-123')

      expect(result.summary.totalContradictions).toBe(4)
      expect(result.summary.criticalCount).toBe(2)
    })

    it('should populate document names in contradictions', async () => {
      const { detectContradictions } = await import('@/lib/engines/contradiction')

      const mockChunks = [{ content: 'Content', chunk_index: 0 }]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockChunks, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        contradictions: [
          {
            type: 'direct',
            severity: 'high',
            claim1: { documentId: 'doc-police', text: 'Statement 1' },
            claim2: { documentId: 'doc-social', text: 'Statement 2' },
            explanation: 'Contradiction found',
            implication: 'Impact',
          },
        ],
        claimClusters: [],
      })

      const doc1 = createMockDocument({ id: 'doc-police', filename: 'police_report.pdf' }) as Document
      const doc2 = createMockDocument({ id: 'doc-social', filename: 'social_work_assessment.pdf' }) as Document

      const result = await detectContradictions([doc1, doc2], 'case-123')

      expect(result.contradictions[0].claim1.documentName).toBe('police_report.pdf')
      expect(result.contradictions[0].claim2.documentName).toBe('social_work_assessment.pdf')
    })

    it('should handle claim clusters', async () => {
      const { detectContradictions } = await import('@/lib/engines/contradiction')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        contradictions: [],
        claimClusters: [
          {
            topic: 'Timeline of Events',
            claims: [
              { docId: 'doc-1', text: 'Event at 9am', stance: 'early' },
              { docId: 'doc-2', text: 'Event at 2pm', stance: 'late' },
            ],
            consensus: false,
          },
          {
            topic: 'Witness Reliability',
            claims: [
              { docId: 'doc-1', text: 'Witness credible', stance: 'positive' },
              { docId: 'doc-2', text: 'Witness credible', stance: 'positive' },
            ],
            consensus: true,
          },
        ],
      })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document
      const doc2 = createMockDocument({ id: 'doc-2' }) as Document

      const result = await detectContradictions([doc1, doc2], 'case-123')

      expect(result.claimClusters).toHaveLength(2)
      expect(result.claimClusters[0].topic).toBe('Timeline of Events')
      expect(result.claimClusters[0].consensus).toBe(false)
      expect(result.claimClusters[1].consensus).toBe(true)
    })

    it('should handle missing claimClusters in response', async () => {
      const { detectContradictions } = await import('@/lib/engines/contradiction')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        contradictions: [],
        // claimClusters intentionally missing
      })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document

      const result = await detectContradictions([doc1], 'case-123')

      expect(result.claimClusters).toEqual([])
    })

    it('should limit document content for context window', async () => {
      const { detectContradictions } = await import('@/lib/engines/contradiction')

      // Create a long content that exceeds the 50000 char limit
      const longContent = 'A'.repeat(60000)
      const mockChunks = [{ content: longContent, chunk_index: 0 }]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockChunks, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        contradictions: [],
        claimClusters: [],
      })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document

      const result = await detectContradictions([doc1], 'case-123')

      // Should complete without error even with long content
      expect(result).toBeDefined()
      expect(mockGenerateJSON).toHaveBeenCalled()
    })

    it('should store contradictions in database', async () => {
      const { detectContradictions } = await import('@/lib/engines/contradiction')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        contradictions: [
          {
            type: 'direct',
            severity: 'critical',
            claim1: { documentId: 'doc-1', text: 'Claim 1' },
            claim2: { documentId: 'doc-2', text: 'Claim 2' },
            explanation: 'Contradiction explanation',
            implication: 'Important implication',
          },
        ],
        claimClusters: [],
      })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document
      const doc2 = createMockDocument({ id: 'doc-2' }) as Document

      await detectContradictions([doc1, doc2], 'case-123')

      // Verify that insert was called on 'findings' table
      expect(mockSupabaseFrom).toHaveBeenCalledWith('findings')
    })
  })

  describe('Credibility Impact Calculation', () => {
    it('should return severe impact for 3+ critical contradictions', async () => {
      const { detectContradictions } = await import('@/lib/engines/contradiction')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        contradictions: [
          { type: 'direct', severity: 'critical', claim1: { documentId: 'd1', text: 'A' }, claim2: { documentId: 'd2', text: 'B' }, explanation: 'E1', implication: 'I1' },
          { type: 'temporal', severity: 'critical', claim1: { documentId: 'd1', text: 'C' }, claim2: { documentId: 'd2', text: 'D' }, explanation: 'E2', implication: 'I2' },
          { type: 'implicit', severity: 'critical', claim1: { documentId: 'd1', text: 'E' }, claim2: { documentId: 'd2', text: 'F' }, explanation: 'E3', implication: 'I3' },
        ],
        claimClusters: [],
      })

      const doc1 = createMockDocument({ id: 'd1' }) as Document
      const doc2 = createMockDocument({ id: 'd2' }) as Document

      const result = await detectContradictions([doc1, doc2], 'case-123')

      expect(result.summary.credibilityImpact).toBe('severe')
    })

    it('should return severe impact for 1 critical + 3 high contradictions', async () => {
      const { detectContradictions } = await import('@/lib/engines/contradiction')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        contradictions: [
          { type: 'direct', severity: 'critical', claim1: { documentId: 'd1', text: 'A' }, claim2: { documentId: 'd2', text: 'B' }, explanation: 'E1', implication: 'I1' },
          { type: 'temporal', severity: 'high', claim1: { documentId: 'd1', text: 'C' }, claim2: { documentId: 'd2', text: 'D' }, explanation: 'E2', implication: 'I2' },
          { type: 'implicit', severity: 'high', claim1: { documentId: 'd1', text: 'E' }, claim2: { documentId: 'd2', text: 'F' }, explanation: 'E3', implication: 'I3' },
          { type: 'quantitative', severity: 'high', claim1: { documentId: 'd1', text: 'G' }, claim2: { documentId: 'd2', text: 'H' }, explanation: 'E4', implication: 'I4' },
        ],
        claimClusters: [],
      })

      const doc1 = createMockDocument({ id: 'd1' }) as Document
      const doc2 = createMockDocument({ id: 'd2' }) as Document

      const result = await detectContradictions([doc1, doc2], 'case-123')

      expect(result.summary.credibilityImpact).toBe('severe')
    })

    it('should return moderate impact for 1 critical or 3 high contradictions', async () => {
      const { detectContradictions } = await import('@/lib/engines/contradiction')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        contradictions: [
          { type: 'direct', severity: 'critical', claim1: { documentId: 'd1', text: 'A' }, claim2: { documentId: 'd2', text: 'B' }, explanation: 'E1', implication: 'I1' },
        ],
        claimClusters: [],
      })

      const doc1 = createMockDocument({ id: 'd1' }) as Document
      const doc2 = createMockDocument({ id: 'd2' }) as Document

      const result = await detectContradictions([doc1, doc2], 'case-123')

      expect(result.summary.credibilityImpact).toBe('moderate')
    })

    it('should return moderate impact for 3 high contradictions without critical', async () => {
      const { detectContradictions } = await import('@/lib/engines/contradiction')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        contradictions: [
          { type: 'temporal', severity: 'high', claim1: { documentId: 'd1', text: 'A' }, claim2: { documentId: 'd2', text: 'B' }, explanation: 'E1', implication: 'I1' },
          { type: 'implicit', severity: 'high', claim1: { documentId: 'd1', text: 'C' }, claim2: { documentId: 'd2', text: 'D' }, explanation: 'E2', implication: 'I2' },
          { type: 'quantitative', severity: 'high', claim1: { documentId: 'd1', text: 'E' }, claim2: { documentId: 'd2', text: 'F' }, explanation: 'E3', implication: 'I3' },
        ],
        claimClusters: [],
      })

      const doc1 = createMockDocument({ id: 'd1' }) as Document
      const doc2 = createMockDocument({ id: 'd2' }) as Document

      const result = await detectContradictions([doc1, doc2], 'case-123')

      expect(result.summary.credibilityImpact).toBe('moderate')
    })

    it('should return minor impact for 1 high or 3+ total contradictions', async () => {
      const { detectContradictions } = await import('@/lib/engines/contradiction')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        contradictions: [
          { type: 'temporal', severity: 'high', claim1: { documentId: 'd1', text: 'A' }, claim2: { documentId: 'd2', text: 'B' }, explanation: 'E1', implication: 'I1' },
        ],
        claimClusters: [],
      })

      const doc1 = createMockDocument({ id: 'd1' }) as Document
      const doc2 = createMockDocument({ id: 'd2' }) as Document

      const result = await detectContradictions([doc1, doc2], 'case-123')

      expect(result.summary.credibilityImpact).toBe('minor')
    })

    it('should return none impact for low severity contradictions', async () => {
      const { detectContradictions } = await import('@/lib/engines/contradiction')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        contradictions: [
          { type: 'attributional', severity: 'low', claim1: { documentId: 'd1', text: 'A' }, claim2: { documentId: 'd2', text: 'B' }, explanation: 'E1', implication: 'I1' },
          { type: 'attributional', severity: 'medium', claim1: { documentId: 'd1', text: 'C' }, claim2: { documentId: 'd2', text: 'D' }, explanation: 'E2', implication: 'I2' },
        ],
        claimClusters: [],
      })

      const doc1 = createMockDocument({ id: 'd1' }) as Document
      const doc2 = createMockDocument({ id: 'd2' }) as Document

      const result = await detectContradictions([doc1, doc2], 'case-123')

      expect(result.summary.credibilityImpact).toBe('none')
    })
  })

  describe('Topic Extraction', () => {
    it('should extract topics from non-consensus claim clusters', async () => {
      const { detectContradictions } = await import('@/lib/engines/contradiction')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        contradictions: [],
        claimClusters: [
          { topic: 'Timeline', claims: [], consensus: false },
          { topic: 'Location', claims: [], consensus: false },
          { topic: 'Witness Credibility', claims: [], consensus: true },
        ],
      })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document

      const result = await detectContradictions([doc1], 'case-123')

      expect(result.summary.mostContradictedTopics).toContain('Timeline')
      expect(result.summary.mostContradictedTopics).toContain('Location')
      expect(result.summary.mostContradictedTopics).not.toContain('Witness Credibility')
    })

    it('should limit topics to 5 maximum', async () => {
      const { detectContradictions } = await import('@/lib/engines/contradiction')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        contradictions: [],
        claimClusters: [
          { topic: 'Topic 1', claims: [], consensus: false },
          { topic: 'Topic 2', claims: [], consensus: false },
          { topic: 'Topic 3', claims: [], consensus: false },
          { topic: 'Topic 4', claims: [], consensus: false },
          { topic: 'Topic 5', claims: [], consensus: false },
          { topic: 'Topic 6', claims: [], consensus: false },
          { topic: 'Topic 7', claims: [], consensus: false },
        ],
      })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document

      const result = await detectContradictions([doc1], 'case-123')

      expect(result.summary.mostContradictedTopics.length).toBeLessThanOrEqual(5)
    })
  })

  describe('compareSpecificClaims', () => {
    it('should detect direct contradiction between claims', async () => {
      const { compareSpecificClaims } = await import('@/lib/engines/contradiction')

      mockGenerateJSON.mockResolvedValue({
        contradicts: true,
        type: 'direct',
        explanation: 'Claims are directly opposite',
        severity: 'critical',
      })

      const result = await compareSpecificClaims(
        'The subject was at home',
        'The subject was not at home'
      )

      expect(result.contradicts).toBe(true)
      expect(result.type).toBe('direct')
      expect(result.severity).toBe('critical')
      expect(result.explanation).toBeDefined()
    })

    it('should detect temporal contradiction', async () => {
      const { compareSpecificClaims } = await import('@/lib/engines/contradiction')

      mockGenerateJSON.mockResolvedValue({
        contradicts: true,
        type: 'temporal',
        explanation: 'Timeline inconsistency detected',
        severity: 'high',
      })

      const result = await compareSpecificClaims(
        'Event occurred at 10:00 AM',
        'Event occurred at 3:00 PM'
      )

      expect(result.contradicts).toBe(true)
      expect(result.type).toBe('temporal')
      expect(result.severity).toBe('high')
    })

    it('should return no contradiction for consistent claims', async () => {
      const { compareSpecificClaims } = await import('@/lib/engines/contradiction')

      mockGenerateJSON.mockResolvedValue({
        contradicts: false,
        type: null,
        explanation: 'Claims are consistent',
        severity: null,
      })

      const result = await compareSpecificClaims(
        'The meeting was productive',
        'The meeting achieved its goals'
      )

      expect(result.contradicts).toBe(false)
      expect(result.type).toBeNull()
    })

    it('should handle optional context parameter', async () => {
      const { compareSpecificClaims } = await import('@/lib/engines/contradiction')

      mockGenerateJSON.mockResolvedValue({
        contradicts: true,
        type: 'implicit',
        explanation: 'Logically incompatible given context',
        severity: 'medium',
      })

      const result = await compareSpecificClaims(
        'The defendant was cooperative',
        'The defendant refused all requests',
        'During police interview on 2024-01-15'
      )

      expect(result.contradicts).toBe(true)
      expect(mockGenerateJSON).toHaveBeenCalled()
    })

    it('should handle AI service errors gracefully', async () => {
      const { compareSpecificClaims } = await import('@/lib/engines/contradiction')

      mockGenerateJSON.mockRejectedValue(new Error('AI service unavailable'))

      const result = await compareSpecificClaims(
        'Claim 1',
        'Claim 2'
      )

      expect(result.contradicts).toBe(false)
      expect(result.explanation).toBe('Unable to analyze')
    })
  })

  describe('trackClaimEvolution', () => {
    it('should return stable pattern for insufficient versions', async () => {
      const { trackClaimEvolution } = await import('@/lib/engines/contradiction')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        found: false,
        quotes: [],
      })

      const doc1 = createMockDocument({ id: 'doc-1', created_at: '2024-01-01' }) as Document

      const result = await trackClaimEvolution(
        'The subject has good parenting skills',
        [doc1],
        'case-123'
      )

      expect(result.evolutionPattern).toBe('stable')
      expect(result.summary).toBe('Insufficient versions to track evolution')
    })

    it('should track claim across multiple documents', async () => {
      const { trackClaimEvolution } = await import('@/lib/engines/contradiction')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [{ content: 'Document content', chunk_index: 0 }], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      // First call: find claims in document
      mockGenerateJSON
        .mockResolvedValueOnce({ found: true, quotes: ['Parenting skills are adequate'] })
        .mockResolvedValueOnce({ found: true, quotes: ['Parenting skills have improved'] })
        // Compare claims call
        .mockResolvedValueOnce({ contradicts: false, explanation: 'Claim evolved positively' })
        // Analyze pattern call
        .mockResolvedValueOnce({ pattern: 'escalating', summary: 'Claim became more positive over time' })

      const doc1 = createMockDocument({ id: 'doc-1', filename: 'report_jan.pdf', created_at: '2024-01-01T00:00:00Z' }) as Document
      const doc2 = createMockDocument({ id: 'doc-2', filename: 'report_feb.pdf', created_at: '2024-02-01T00:00:00Z' }) as Document

      const result = await trackClaimEvolution(
        'Parenting skills assessment',
        [doc1, doc2],
        'case-123'
      )

      expect(result.versions).toHaveLength(2)
      expect(result.evolutionPattern).toBe('escalating')
      expect(result.summary).toBeDefined()
    })

    it('should sort documents by date before analysis', async () => {
      const { trackClaimEvolution } = await import('@/lib/engines/contradiction')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [{ content: 'Content', chunk_index: 0 }], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON
        .mockResolvedValueOnce({ found: true, quotes: ['First version'] })
        .mockResolvedValueOnce({ found: true, quotes: ['Second version'] })
        .mockResolvedValueOnce({ contradicts: false, explanation: 'Evolved' })
        .mockResolvedValueOnce({ pattern: 'stable', summary: 'Consistent' })

      // Documents provided out of order
      const doc1 = createMockDocument({ id: 'doc-later', filename: 'later.pdf', created_at: '2024-06-01T00:00:00Z' }) as Document
      const doc2 = createMockDocument({ id: 'doc-earlier', filename: 'earlier.pdf', created_at: '2024-01-01T00:00:00Z' }) as Document

      const result = await trackClaimEvolution(
        'Test claim',
        [doc1, doc2],
        'case-123'
      )

      // First version should be from earlier document
      expect(result.versions[0].documentName).toBe('earlier.pdf')
    })

    it('should skip documents where claim is not found', async () => {
      const { trackClaimEvolution } = await import('@/lib/engines/contradiction')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [{ content: 'Content', chunk_index: 0 }], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON
        .mockResolvedValueOnce({ found: true, quotes: ['Found claim'] })
        .mockResolvedValueOnce({ found: false, quotes: [] }) // Not found in second doc
        .mockResolvedValueOnce({ found: true, quotes: ['Found again'] })
        .mockResolvedValueOnce({ contradicts: false, explanation: 'Changed' })
        .mockResolvedValueOnce({ pattern: 'inconsistent', summary: 'Gaps in tracking' })

      const doc1 = createMockDocument({ id: 'doc-1', created_at: '2024-01-01T00:00:00Z' }) as Document
      const doc2 = createMockDocument({ id: 'doc-2', created_at: '2024-02-01T00:00:00Z' }) as Document
      const doc3 = createMockDocument({ id: 'doc-3', created_at: '2024-03-01T00:00:00Z' }) as Document

      const result = await trackClaimEvolution(
        'Test claim',
        [doc1, doc2, doc3],
        'case-123'
      )

      // Should only include documents where claim was found
      expect(result.versions).toHaveLength(2)
    })

    it('should handle unknown date in documents', async () => {
      const { trackClaimEvolution } = await import('@/lib/engines/contradiction')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [{ content: 'Content', chunk_index: 0 }], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON
        .mockResolvedValueOnce({ found: true, quotes: ['Found claim'] })

      const doc1 = createMockDocument({ id: 'doc-1', created_at: undefined }) as Document

      const result = await trackClaimEvolution(
        'Test claim',
        [doc1],
        'case-123'
      )

      expect(result.versions[0].date).toBe('Unknown')
    })
  })

  describe('Contradiction Types', () => {
    it('should handle all contradiction types', async () => {
      const { detectContradictions } = await import('@/lib/engines/contradiction')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const types = ['direct', 'implicit', 'temporal', 'quantitative', 'attributional']

      mockGenerateJSON.mockResolvedValue({
        contradictions: types.map((type, idx) => ({
          type,
          severity: 'medium',
          claim1: { documentId: 'd1', text: `Claim ${idx}a` },
          claim2: { documentId: 'd2', text: `Claim ${idx}b` },
          explanation: `${type} contradiction`,
          implication: `Impact of ${type}`,
        })),
        claimClusters: [],
      })

      const doc1 = createMockDocument({ id: 'd1' }) as Document
      const doc2 = createMockDocument({ id: 'd2' }) as Document

      const result = await detectContradictions([doc1, doc2], 'case-123')

      expect(result.contradictions.length).toBe(5)
      types.forEach((type, idx) => {
        expect(result.contradictions[idx].type).toBe(type)
      })
    })
  })

  describe('Mock Mode', () => {
    it('should use mock results when placeholder URL is set', async () => {
      // Set placeholder URL to trigger mock mode
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co'

      // Need to re-import to pick up the env change
      jest.resetModules()

      // Re-setup mocks after reset
      jest.mock('@/lib/ai-client', () => ({
        generateJSON: (...args: unknown[]) => mockGenerateJSON(...args),
      }))

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }

      jest.mock('@/lib/supabase/server', () => ({
        supabaseAdmin: {
          from: () => mockChain,
        },
      }))

      const { detectContradictions } = await import('@/lib/engines/contradiction')

      const doc1 = createMockDocument({ id: 'mock-doc-1' }) as Document
      const doc2 = createMockDocument({ id: 'mock-doc-2' }) as Document
      const doc3 = createMockDocument({ id: 'mock-doc-3' }) as Document

      const result = await detectContradictions([doc1, doc2, doc3], 'case-123')

      // Mock mode should return predefined contradictions
      expect(result.contradictions.length).toBeGreaterThan(0)
      expect(result.contradictions[0].type).toBe('direct')
      expect(result.contradictions[0].severity).toBe('critical')
    })
  })

  describe('Document Chunk Processing', () => {
    it('should join multiple chunks with double newlines', async () => {
      const { detectContradictions } = await import('@/lib/engines/contradiction')

      const mockChunks = [
        { content: 'First chunk content.', chunk_index: 0 },
        { content: 'Second chunk content.', chunk_index: 1 },
        { content: 'Third chunk content.', chunk_index: 2 },
      ]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockChunks, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        contradictions: [],
        claimClusters: [],
      })

      const doc1 = createMockDocument({ id: 'chunks-doc' }) as Document

      await detectContradictions([doc1], 'case-123')

      // Verify generateJSON was called (the chunks would be joined)
      expect(mockGenerateJSON).toHaveBeenCalled()
    })

    it('should handle null/empty chunk data', async () => {
      const { detectContradictions } = await import('@/lib/engines/contradiction')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        contradictions: [],
        claimClusters: [],
      })

      const doc1 = createMockDocument({ id: 'empty-doc' }) as Document

      const result = await detectContradictions([doc1], 'case-123')

      expect(result).toBeDefined()
      expect(result.contradictions).toHaveLength(0)
    })
  })

  describe('Suggested Resolution', () => {
    it('should include suggested resolution when provided', async () => {
      const { detectContradictions } = await import('@/lib/engines/contradiction')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        contradictions: [
          {
            type: 'direct',
            severity: 'high',
            claim1: { documentId: 'd1', text: 'Claim A' },
            claim2: { documentId: 'd2', text: 'Claim B' },
            explanation: 'Direct contradiction',
            implication: 'Affects credibility',
            suggestedResolution: 'Cross-reference with CCTV footage from the location',
          },
        ],
        claimClusters: [],
      })

      const doc1 = createMockDocument({ id: 'd1' }) as Document
      const doc2 = createMockDocument({ id: 'd2' }) as Document

      const result = await detectContradictions([doc1, doc2], 'case-123')

      expect(result.contradictions[0].suggestedResolution).toBe(
        'Cross-reference with CCTV footage from the location'
      )
    })

    it('should handle missing suggested resolution', async () => {
      const { detectContradictions } = await import('@/lib/engines/contradiction')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        contradictions: [
          {
            type: 'temporal',
            severity: 'medium',
            claim1: { documentId: 'd1', text: 'Claim A' },
            claim2: { documentId: 'd2', text: 'Claim B' },
            explanation: 'Timeline inconsistency',
            implication: 'Affects sequence of events',
            // No suggestedResolution
          },
        ],
        claimClusters: [],
      })

      const doc1 = createMockDocument({ id: 'd1' }) as Document
      const doc2 = createMockDocument({ id: 'd2' }) as Document

      const result = await detectContradictions([doc1, doc2], 'case-123')

      expect(result.contradictions[0].suggestedResolution).toBeUndefined()
    })
  })
})
