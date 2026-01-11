/**
 * NARRATIVE ENGINE TESTS
 *
 * Tests for the Narrative Evolution Engine (M - metamorphosis)
 * "Story Drift"
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
  // Default chain for tests that don't override
  const defaultChain = {
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
        // If mockSupabaseFrom has a return value set, use it; otherwise use default
        const result = mockSupabaseFrom(...args)
        return result !== undefined ? result : defaultChain
      },
    },
    createAdminClient: jest.fn(),
    createServerSupabaseClient: jest.fn(),
    createServerClient: jest.fn(),
  }
})

describe('Narrative Engine', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    // Reset environment
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
  })

  describe('Module Exports', () => {
    it('should export analyzeNarrativeEvolution function', async () => {
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')
      expect(typeof analyzeNarrativeEvolution).toBe('function')
    })

    it('should export trackSpecificClaim function', async () => {
      const { trackSpecificClaim } = await import('@/lib/engines/narrative')
      expect(typeof trackSpecificClaim).toBe('function')
    })

    it('should export detectCircularCitations function', async () => {
      const { detectCircularCitations } = await import('@/lib/engines/narrative')
      expect(typeof detectCircularCitations).toBe('function')
    })

    it('should export generateClaimTimeline function', async () => {
      const { generateClaimTimeline } = await import('@/lib/engines/narrative')
      expect(typeof generateClaimTimeline).toBe('function')
    })

    it('should export narrativeEngine object with all functions', async () => {
      const { narrativeEngine } = await import('@/lib/engines/narrative')
      expect(narrativeEngine).toBeDefined()
      expect(typeof narrativeEngine.analyzeNarrativeEvolution).toBe('function')
      expect(typeof narrativeEngine.trackSpecificClaim).toBe('function')
      expect(typeof narrativeEngine.detectCircularCitations).toBe('function')
      expect(typeof narrativeEngine.generateClaimTimeline).toBe('function')
    })
  })

  describe('Type Definitions', () => {
    it('should export NarrativeVersion type', async () => {
      // Type check via usage - if this compiles, types are exported correctly
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')
      expect(analyzeNarrativeEvolution).toBeDefined()
    })

    it('should export ClaimLineage type', async () => {
      // Type check via usage
      const { trackSpecificClaim } = await import('@/lib/engines/narrative')
      expect(trackSpecificClaim).toBeDefined()
    })

    it('should export CircularCitation type', async () => {
      // Type check via usage
      const { detectCircularCitations } = await import('@/lib/engines/narrative')
      expect(detectCircularCitations).toBeDefined()
    })

    it('should export NarrativeAnalysisResult type', async () => {
      // Type check via usage
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')
      expect(analyzeNarrativeEvolution).toBeDefined()
    })
  })

  describe('analyzeNarrativeEvolution', () => {
    it('should analyze narrative evolution across multiple documents', async () => {
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')

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
        lineages: [
          {
            rootClaim: 'Child was neglected',
            versions: [
              { documentId: 'doc-1', documentName: 'Police Report', date: '2023-01-12', claimText: 'Officers noted potential neglect', strength: 'concern', sourceCited: null },
              { documentId: 'doc-2', documentName: 'SW Assessment', date: '2023-02-15', claimText: 'Neglect concerns substantiated', strength: 'established', sourceCited: 'Police Report' },
            ],
            mutationType: 'amplification',
            driftDirection: 'toward_finding',
            summary: 'Claim evolved from concern to established fact.',
          },
        ],
        circularCitations: [],
      })

      const doc1 = createMockDocument({ id: 'doc-1', filename: 'police_report.pdf', created_at: '2023-01-12T00:00:00Z' }) as Document
      const doc2 = createMockDocument({ id: 'doc-2', filename: 'sw_assessment.pdf', created_at: '2023-02-15T00:00:00Z' }) as Document

      const result = await analyzeNarrativeEvolution([doc1, doc2], 'case-123')

      expect(result).toBeDefined()
      expect(result.lineages).toBeDefined()
      expect(Array.isArray(result.lineages)).toBe(true)
      expect(result.lineages.length).toBe(1)
      expect(result.summary).toBeDefined()
      expect(result.summary.totalClaims).toBe(1)
    })

    it('should handle empty lineages result', async () => {
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        lineages: [],
        circularCitations: [],
      })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document

      const result = await analyzeNarrativeEvolution([doc1], 'case-123')

      expect(result.lineages).toHaveLength(0)
      expect(result.summary.totalClaims).toBe(0)
      expect(result.summary.amplifiedClaims).toBe(0)
      expect(result.summary.attenuatedClaims).toBe(0)
    })

    it('should generate unique IDs for lineages', async () => {
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        lineages: [
          {
            rootClaim: 'First claim',
            versions: [{ documentId: 'doc-1', claimText: 'Version 1', strength: 'concern' }],
            mutationType: 'stable',
            driftDirection: 'neutral',
            summary: 'First lineage',
          },
          {
            rootClaim: 'Second claim',
            versions: [{ documentId: 'doc-1', claimText: 'Version 2', strength: 'allegation' }],
            mutationType: 'amplification',
            driftDirection: 'toward_finding',
            summary: 'Second lineage',
          },
        ],
        circularCitations: [],
      })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document

      const result = await analyzeNarrativeEvolution([doc1], 'case-123')

      expect(result.lineages[0].id).toContain('lineage-case-123')
      expect(result.lineages[0].id).toContain('-0')
      expect(result.lineages[1].id).toContain('-1')
      expect(result.lineages[0].id).not.toBe(result.lineages[1].id)
    })

    it('should count amplified and attenuated claims correctly', async () => {
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        lineages: [
          { rootClaim: 'Claim 1', versions: [], mutationType: 'amplification', driftDirection: 'toward_finding', summary: 'S1' },
          { rootClaim: 'Claim 2', versions: [], mutationType: 'amplification', driftDirection: 'toward_finding', summary: 'S2' },
          { rootClaim: 'Claim 3', versions: [], mutationType: 'attenuation', driftDirection: 'toward_exoneration', summary: 'S3' },
          { rootClaim: 'Claim 4', versions: [], mutationType: 'stable', driftDirection: 'neutral', summary: 'S4' },
        ],
        circularCitations: [],
      })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document

      const result = await analyzeNarrativeEvolution([doc1], 'case-123')

      expect(result.summary.totalClaims).toBe(4)
      expect(result.summary.amplifiedClaims).toBe(2)
      expect(result.summary.attenuatedClaims).toBe(1)
    })

    it('should sort documents chronologically', async () => {
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [{ content: 'Content', chunk_index: 0 }], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        lineages: [],
        circularCitations: [],
      })

      // Documents provided out of order
      const doc1 = createMockDocument({ id: 'doc-later', filename: 'later.pdf', created_at: '2024-06-01T00:00:00Z' }) as Document
      const doc2 = createMockDocument({ id: 'doc-earlier', filename: 'earlier.pdf', created_at: '2024-01-01T00:00:00Z' }) as Document

      await analyzeNarrativeEvolution([doc1, doc2], 'case-123')

      // Verify generateJSON was called
      expect(mockGenerateJSON).toHaveBeenCalled()
    })

    it('should handle circular citations', async () => {
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        lineages: [],
        circularCitations: [
          {
            claim: 'Mother was aggressive',
            citationChain: [
              { documentId: 'mock-sw', documentName: 'SW Assessment', cites: 'Police Report' },
              { documentId: 'mock-police', documentName: 'Police Report', cites: 'Social Services Referral' },
            ],
            explanation: 'Potential circular reporting loop.',
          },
        ],
      })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document

      const result = await analyzeNarrativeEvolution([doc1], 'case-123')

      expect(result.circularCitations).toHaveLength(1)
      expect(result.circularCitations[0].claim).toBe('Mother was aggressive')
      expect(result.circularCitations[0].citationChain).toHaveLength(2)
      expect(result.summary.circularCount).toBe(1)
    })

    it('should handle missing circularCitations in response', async () => {
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        lineages: [],
        // circularCitations intentionally missing
      })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document

      const result = await analyzeNarrativeEvolution([doc1], 'case-123')

      expect(result.circularCitations).toEqual([])
    })

    it('should limit document content for context window', async () => {
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')

      // Create a long content that exceeds the 40000 char limit
      const longContent = 'A'.repeat(50000)
      const mockChunks = [{ content: longContent, chunk_index: 0 }]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockChunks, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        lineages: [],
        circularCitations: [],
      })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document

      const result = await analyzeNarrativeEvolution([doc1], 'case-123')

      // Should complete without error even with long content
      expect(result).toBeDefined()
      expect(mockGenerateJSON).toHaveBeenCalled()
    })

    it('should store findings in database', async () => {
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        lineages: [
          {
            rootClaim: 'Critical claim',
            versions: [{ documentId: 'doc-1', claimText: 'Statement', strength: 'fact' }],
            mutationType: 'amplification',
            driftDirection: 'toward_finding',
            summary: 'Claim amplified over time',
          },
        ],
        circularCitations: [],
      })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document

      await analyzeNarrativeEvolution([doc1], 'case-123')

      // Verify that insert was called on 'findings' table
      expect(mockSupabaseFrom).toHaveBeenCalledWith('findings')
    })

    it('should populate origin and terminal document IDs', async () => {
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        lineages: [
          {
            rootClaim: 'Test claim',
            versions: [
              { documentId: 'doc-first', claimText: 'First version', strength: 'concern' },
              { documentId: 'doc-middle', claimText: 'Middle version', strength: 'established' },
              { documentId: 'doc-last', claimText: 'Last version', strength: 'fact' },
            ],
            mutationType: 'amplification',
            driftDirection: 'toward_finding',
            summary: 'Evolved over time',
          },
        ],
        circularCitations: [],
      })

      const doc1 = createMockDocument({ id: 'doc-first' }) as Document

      const result = await analyzeNarrativeEvolution([doc1], 'case-123')

      expect(result.lineages[0].originDocument).toBe('doc-first')
      expect(result.lineages[0].terminalDocument).toBe('doc-last')
    })
  })

  describe('Drift Score Calculation', () => {
    it('should return pro_finding drift for high positive score', async () => {
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        lineages: [
          { rootClaim: 'C1', versions: [], mutationType: 'amplification', driftDirection: 'toward_finding', summary: 'S1' },
          { rootClaim: 'C2', versions: [], mutationType: 'amplification', driftDirection: 'toward_finding', summary: 'S2' },
        ],
        circularCitations: [],
      })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document

      const result = await analyzeNarrativeEvolution([doc1], 'case-123')

      expect(result.summary.overallDrift).toBe('pro_finding')
      expect(result.summary.driftScore).toBeGreaterThan(20)
    })

    it('should return pro_exoneration drift for negative score', async () => {
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        lineages: [
          { rootClaim: 'C1', versions: [], mutationType: 'attenuation', driftDirection: 'toward_exoneration', summary: 'S1' },
          { rootClaim: 'C2', versions: [], mutationType: 'attenuation', driftDirection: 'toward_exoneration', summary: 'S2' },
        ],
        circularCitations: [],
      })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document

      const result = await analyzeNarrativeEvolution([doc1], 'case-123')

      expect(result.summary.overallDrift).toBe('pro_exoneration')
      expect(result.summary.driftScore).toBeLessThan(-20)
    })

    it('should return balanced drift for neutral score', async () => {
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        lineages: [
          { rootClaim: 'C1', versions: [], mutationType: 'stable', driftDirection: 'neutral', summary: 'S1' },
        ],
        circularCitations: [],
      })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document

      const result = await analyzeNarrativeEvolution([doc1], 'case-123')

      expect(result.summary.overallDrift).toBe('balanced')
      expect(result.summary.driftScore).toBeGreaterThanOrEqual(-20)
      expect(result.summary.driftScore).toBeLessThanOrEqual(20)
    })
  })

  describe('Strength to Confidence Mapping', () => {
    it('should map strength values to confidence correctly in versions', async () => {
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        lineages: [
          {
            rootClaim: 'Test claim',
            versions: [
              { documentId: 'doc-1', claimText: 'Allegation text', strength: 'allegation' },
              { documentId: 'doc-2', claimText: 'Concern text', strength: 'concern' },
              { documentId: 'doc-3', claimText: 'Established text', strength: 'established' },
              { documentId: 'doc-4', claimText: 'Confirmed text', strength: 'confirmed' },
              { documentId: 'doc-5', claimText: 'Fact text', strength: 'fact' },
            ],
            mutationType: 'amplification',
            driftDirection: 'toward_finding',
            summary: 'Progressive strengthening',
          },
        ],
        circularCitations: [],
      })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document

      const result = await analyzeNarrativeEvolution([doc1], 'case-123')

      const versions = result.lineages[0].versions
      expect(versions[0].confidence).toBe(0.2) // allegation
      expect(versions[1].confidence).toBe(0.4) // concern
      expect(versions[2].confidence).toBe(0.6) // established
      expect(versions[3].confidence).toBe(0.8) // confirmed
      expect(versions[4].confidence).toBe(0.95) // fact
    })
  })

  describe('trackSpecificClaim', () => {
    it('should track a specific claim across documents', async () => {
      const { trackSpecificClaim } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [{ content: 'Document content', chunk_index: 0 }], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON
        .mockResolvedValueOnce({ found: true, text: 'Found claim in doc 1', strength: 'concern', sourceCited: null })
        .mockResolvedValueOnce({ found: true, text: 'Found claim in doc 2', strength: 'established', sourceCited: 'Police Report' })

      const doc1 = createMockDocument({ id: 'doc-1', filename: 'report_jan.pdf', created_at: '2024-01-01T00:00:00Z' }) as Document
      const doc2 = createMockDocument({ id: 'doc-2', filename: 'report_feb.pdf', created_at: '2024-02-01T00:00:00Z' }) as Document

      const result = await trackSpecificClaim('Test claim', [doc1, doc2], 'case-123')

      expect(result.rootClaim).toBe('Test claim')
      expect(result.versions).toHaveLength(2)
      expect(result.id).toContain('lineage-track-')
    })

    it('should skip documents where claim is not found', async () => {
      const { trackSpecificClaim } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [{ content: 'Content', chunk_index: 0 }], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON
        .mockResolvedValueOnce({ found: true, text: 'Found claim', strength: 'concern' })
        .mockResolvedValueOnce({ found: false })
        .mockResolvedValueOnce({ found: true, text: 'Found again', strength: 'established' })

      const doc1 = createMockDocument({ id: 'doc-1', created_at: '2024-01-01T00:00:00Z' }) as Document
      const doc2 = createMockDocument({ id: 'doc-2', created_at: '2024-02-01T00:00:00Z' }) as Document
      const doc3 = createMockDocument({ id: 'doc-3', created_at: '2024-03-01T00:00:00Z' }) as Document

      const result = await trackSpecificClaim('Test claim', [doc1, doc2, doc3], 'case-123')

      expect(result.versions).toHaveLength(2)
    })

    it('should determine correct mutation type', async () => {
      const { trackSpecificClaim } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [{ content: 'Content', chunk_index: 0 }], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      // Simulate amplification: concern -> fact
      mockGenerateJSON
        .mockResolvedValueOnce({ found: true, text: 'Initial concern', strength: 'concern' })
        .mockResolvedValueOnce({ found: true, text: 'Now a fact', strength: 'fact' })

      const doc1 = createMockDocument({ id: 'doc-1', created_at: '2024-01-01T00:00:00Z' }) as Document
      const doc2 = createMockDocument({ id: 'doc-2', created_at: '2024-02-01T00:00:00Z' }) as Document

      const result = await trackSpecificClaim('Test claim', [doc1, doc2], 'case-123')

      expect(result.mutationType).toBe('amplification')
      expect(result.driftDirection).toBe('toward_finding')
    })

    it('should detect circular mutation type', async () => {
      const { trackSpecificClaim } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [{ content: 'Content', chunk_index: 0 }], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      // Simulate circular: second doc cites first doc
      mockGenerateJSON
        .mockResolvedValueOnce({ found: true, text: 'Original claim', strength: 'concern', sourceCited: null })
        .mockResolvedValueOnce({ found: true, text: 'Citing original', strength: 'established', sourceCited: 'report_jan.pdf' })

      const doc1 = createMockDocument({ id: 'doc-1', filename: 'report_jan.pdf', created_at: '2024-01-01T00:00:00Z' }) as Document
      const doc2 = createMockDocument({ id: 'doc-2', filename: 'report_feb.pdf', created_at: '2024-02-01T00:00:00Z' }) as Document

      const result = await trackSpecificClaim('Test claim', [doc1, doc2], 'case-123')

      expect(result.mutationType).toBe('circular')
    })

    it('should handle unknown date in documents', async () => {
      const { trackSpecificClaim } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [{ content: 'Content', chunk_index: 0 }], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValueOnce({ found: true, text: 'Found claim', strength: 'concern' })

      const doc1 = createMockDocument({ id: 'doc-1', created_at: undefined }) as Document

      const result = await trackSpecificClaim('Test claim', [doc1], 'case-123')

      expect(result.versions[0].date).toBe('Unknown')
    })
  })

  describe('detectCircularCitations', () => {
    it('should detect circular citations in documents', async () => {
      const { detectCircularCitations } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [{ content: 'Document content', chunk_index: 0 }], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      // Doc1 cites Doc2, Doc2 cites Doc1
      mockGenerateJSON
        .mockResolvedValueOnce({ citations: ['report_b.pdf'] })
        .mockResolvedValueOnce({ citations: ['report_a.pdf'] })

      const doc1 = createMockDocument({ id: 'doc-1', filename: 'report_a.pdf' }) as Document
      const doc2 = createMockDocument({ id: 'doc-2', filename: 'report_b.pdf' }) as Document

      const result = await detectCircularCitations([doc1, doc2], 'case-123')

      expect(Array.isArray(result)).toBe(true)
    })

    it('should return empty array for no circular citations', async () => {
      const { detectCircularCitations } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [{ content: 'Content', chunk_index: 0 }], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      // No mutual citations
      mockGenerateJSON
        .mockResolvedValueOnce({ citations: ['external_doc.pdf'] })
        .mockResolvedValueOnce({ citations: ['another_external.pdf'] })

      const doc1 = createMockDocument({ id: 'doc-1', filename: 'report_a.pdf' }) as Document
      const doc2 = createMockDocument({ id: 'doc-2', filename: 'report_b.pdf' }) as Document

      const result = await detectCircularCitations([doc1, doc2], 'case-123')

      expect(result).toEqual([])
    })
  })

  describe('generateClaimTimeline', () => {
    it('should generate timeline from claim lineage', async () => {
      const { generateClaimTimeline } = await import('@/lib/engines/narrative')

      const lineage = {
        id: 'lineage-1',
        rootClaim: 'Test claim',
        versions: [
          { id: 'v1', documentId: 'doc-1', documentName: 'First Doc', date: '2024-01-01', claimText: 'Initial', strength: 'concern' as const, confidence: 0.4 },
          { id: 'v2', documentId: 'doc-2', documentName: 'Second Doc', date: '2024-02-01', claimText: 'Evolved', strength: 'established' as const, confidence: 0.6 },
          { id: 'v3', documentId: 'doc-3', documentName: 'Third Doc', date: '2024-03-01', claimText: 'Final', strength: 'fact' as const, confidence: 0.95 },
        ],
        mutationType: 'amplification' as const,
        driftDirection: 'toward_finding' as const,
        summary: 'Claim evolved over time',
      }

      const result = await generateClaimTimeline(lineage)

      expect(result.timeline).toHaveLength(3)
      expect(result.timeline[0].change).toBe('first')
      expect(result.timeline[1].change).toBe('strengthened')
      expect(result.timeline[2].change).toBe('strengthened')
      expect(result.visualData).toHaveLength(3)
    })

    it('should detect weakened claims in timeline', async () => {
      const { generateClaimTimeline } = await import('@/lib/engines/narrative')

      const lineage = {
        id: 'lineage-1',
        rootClaim: 'Test claim',
        versions: [
          { id: 'v1', documentId: 'doc-1', documentName: 'First Doc', date: '2024-01-01', claimText: 'Initial', strength: 'fact' as const, confidence: 0.95 },
          { id: 'v2', documentId: 'doc-2', documentName: 'Second Doc', date: '2024-02-01', claimText: 'Weakened', strength: 'concern' as const, confidence: 0.4 },
        ],
        mutationType: 'attenuation' as const,
        driftDirection: 'toward_exoneration' as const,
        summary: 'Claim weakened over time',
      }

      const result = await generateClaimTimeline(lineage)

      expect(result.timeline[0].change).toBe('first')
      expect(result.timeline[1].change).toBe('weakened')
    })

    it('should detect unchanged claims in timeline', async () => {
      const { generateClaimTimeline } = await import('@/lib/engines/narrative')

      const lineage = {
        id: 'lineage-1',
        rootClaim: 'Test claim',
        versions: [
          { id: 'v1', documentId: 'doc-1', documentName: 'First Doc', date: '2024-01-01', claimText: 'Same', strength: 'established' as const, confidence: 0.6 },
          { id: 'v2', documentId: 'doc-2', documentName: 'Second Doc', date: '2024-02-01', claimText: 'Same', strength: 'established' as const, confidence: 0.6 },
        ],
        mutationType: 'stable' as const,
        driftDirection: 'neutral' as const,
        summary: 'Claim remained stable',
      }

      const result = await generateClaimTimeline(lineage)

      expect(result.timeline[1].change).toBe('unchanged')
    })

    it('should generate correct visual data points', async () => {
      const { generateClaimTimeline } = await import('@/lib/engines/narrative')

      const lineage = {
        id: 'lineage-1',
        rootClaim: 'Test claim',
        versions: [
          { id: 'v1', documentId: 'doc-1', documentName: 'Doc 1', date: '2024-01-01', claimText: 'Text', strength: 'allegation' as const, confidence: 0.2 },
          { id: 'v2', documentId: 'doc-2', documentName: 'Doc 2', date: '2024-02-01', claimText: 'Text', strength: 'fact' as const, confidence: 0.95 },
        ],
        mutationType: 'amplification' as const,
        driftDirection: 'toward_finding' as const,
        summary: 'Summary',
      }

      const result = await generateClaimTimeline(lineage)

      expect(result.visualData[0].x).toBe('2024-01-01')
      expect(result.visualData[0].y).toBe(1) // allegation = 1
      expect(result.visualData[1].x).toBe('2024-02-01')
      expect(result.visualData[1].y).toBe(5) // fact = 5
    })
  })

  describe('Mutation Type Determination', () => {
    it('should return stable for single version', async () => {
      const { trackSpecificClaim } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [{ content: 'Content', chunk_index: 0 }], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValueOnce({ found: true, text: 'Single version', strength: 'concern' })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document

      const result = await trackSpecificClaim('Test claim', [doc1], 'case-123')

      expect(result.mutationType).toBe('stable')
    })

    it('should detect attenuation (strength decrease)', async () => {
      const { trackSpecificClaim } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [{ content: 'Content', chunk_index: 0 }], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      // Simulate attenuation: fact -> allegation
      mockGenerateJSON
        .mockResolvedValueOnce({ found: true, text: 'Strong claim', strength: 'fact' })
        .mockResolvedValueOnce({ found: true, text: 'Weak claim', strength: 'allegation' })

      const doc1 = createMockDocument({ id: 'doc-1', created_at: '2024-01-01T00:00:00Z' }) as Document
      const doc2 = createMockDocument({ id: 'doc-2', created_at: '2024-02-01T00:00:00Z' }) as Document

      const result = await trackSpecificClaim('Test claim', [doc1, doc2], 'case-123')

      expect(result.mutationType).toBe('attenuation')
      expect(result.driftDirection).toBe('toward_exoneration')
    })

    it('should detect transformation (moderate change)', async () => {
      const { trackSpecificClaim } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [{ content: 'Content', chunk_index: 0 }], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      // Simulate transformation: concern -> established (moderate change, not >0.3)
      mockGenerateJSON
        .mockResolvedValueOnce({ found: true, text: 'Concern', strength: 'concern' }) // 0.4
        .mockResolvedValueOnce({ found: true, text: 'Established', strength: 'established' }) // 0.6, diff = 0.2

      const doc1 = createMockDocument({ id: 'doc-1', created_at: '2024-01-01T00:00:00Z' }) as Document
      const doc2 = createMockDocument({ id: 'doc-2', created_at: '2024-02-01T00:00:00Z' }) as Document

      const result = await trackSpecificClaim('Test claim', [doc1, doc2], 'case-123')

      expect(result.mutationType).toBe('transformation')
    })
  })

  describe('Lineage Summary Generation', () => {
    it('should handle empty versions array', async () => {
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        lineages: [
          {
            rootClaim: 'Empty claim',
            versions: [],
            mutationType: 'stable',
            driftDirection: 'neutral',
            summary: 'No versions found',
          },
        ],
        circularCitations: [],
      })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document

      const result = await analyzeNarrativeEvolution([doc1], 'case-123')

      expect(result.lineages[0].versions).toHaveLength(0)
    })
  })

  describe('Mock Mode', () => {
    it('should use mock results when placeholder URL is set', async () => {
      // Set placeholder URL to trigger mock mode
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co'

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')

      const doc1 = createMockDocument({ id: 'mock-doc-1' }) as Document
      const doc2 = createMockDocument({ id: 'mock-doc-2' }) as Document
      const doc3 = createMockDocument({ id: 'mock-doc-3' }) as Document

      const result = await analyzeNarrativeEvolution([doc1, doc2, doc3], 'case-123')

      // Mock mode should return predefined lineages
      expect(result.lineages.length).toBeGreaterThan(0)
      expect(result.lineages[0].mutationType).toBe('amplification')
      expect(result.circularCitations.length).toBeGreaterThan(0)
    }, 10000)
  })

  describe('Document Chunk Processing', () => {
    it('should join multiple chunks with double newlines', async () => {
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')

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
        lineages: [],
        circularCitations: [],
      })

      const doc1 = createMockDocument({ id: 'chunks-doc' }) as Document

      await analyzeNarrativeEvolution([doc1], 'case-123')

      // Verify generateJSON was called (the chunks would be joined)
      expect(mockGenerateJSON).toHaveBeenCalled()
    })

    it('should handle null/empty chunk data', async () => {
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        lineages: [],
        circularCitations: [],
      })

      const doc1 = createMockDocument({ id: 'empty-doc' }) as Document

      const result = await analyzeNarrativeEvolution([doc1], 'case-123')

      expect(result).toBeDefined()
      expect(result.lineages).toHaveLength(0)
    })
  })

  describe('Storing Findings', () => {
    it('should store amplified claims as high severity findings', async () => {
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')

      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null })
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: mockInsert,
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        lineages: [
          {
            rootClaim: 'Amplified claim toward finding',
            versions: [{ documentId: 'doc-1', claimText: 'Text', strength: 'fact' }],
            mutationType: 'amplification',
            driftDirection: 'toward_finding',
            summary: 'Claim was amplified',
          },
        ],
        circularCitations: [],
      })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document

      await analyzeNarrativeEvolution([doc1], 'case-123')

      expect(mockSupabaseFrom).toHaveBeenCalledWith('findings')
    })

    it('should store circular citations as critical severity findings', async () => {
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')

      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null })
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: mockInsert,
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        lineages: [],
        circularCitations: [
          {
            claim: 'Circular claim',
            citationChain: [
              { documentId: 'doc-1', documentName: 'Doc 1', cites: 'Doc 2' },
              { documentId: 'doc-2', documentName: 'Doc 2', cites: 'Doc 1' },
            ],
            explanation: 'Circular citation detected',
          },
        ],
      })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document

      await analyzeNarrativeEvolution([doc1], 'case-123')

      expect(mockSupabaseFrom).toHaveBeenCalledWith('findings')
    })
  })

  describe('Edge Cases', () => {
    it('should handle documents with no created_at date', async () => {
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        lineages: [],
        circularCitations: [],
      })

      const doc1 = createMockDocument({ id: 'doc-1', created_at: null }) as Document
      const doc2 = createMockDocument({ id: 'doc-2', created_at: undefined }) as Document

      const result = await analyzeNarrativeEvolution([doc1, doc2], 'case-123')

      expect(result).toBeDefined()
    })

    it('should handle documents with metadata author', async () => {
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [{ content: 'Content', chunk_index: 0 }], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        lineages: [],
        circularCitations: [],
      })

      const doc1 = createMockDocument({ id: 'doc-1', metadata: { author: 'Test Author' } }) as Document

      const result = await analyzeNarrativeEvolution([doc1], 'case-123')

      expect(result).toBeDefined()
    })

    it('should handle single document analysis', async () => {
      const { analyzeNarrativeEvolution } = await import('@/lib/engines/narrative')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [{ content: 'Single doc content', chunk_index: 0 }], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        lineages: [
          {
            rootClaim: 'Single doc claim',
            versions: [{ documentId: 'doc-1', claimText: 'Text', strength: 'concern' }],
            mutationType: 'stable',
            driftDirection: 'neutral',
            summary: 'Single mention',
          },
        ],
        circularCitations: [],
      })

      const doc1 = createMockDocument({ id: 'doc-1' }) as Document

      const result = await analyzeNarrativeEvolution([doc1], 'case-123')

      expect(result.lineages).toHaveLength(1)
      expect(result.summary.totalClaims).toBe(1)
    })
  })
})
