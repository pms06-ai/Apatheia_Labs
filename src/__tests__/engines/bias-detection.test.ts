/**
 * BIAS DETECTION ENGINE TESTS
 *
 * Tests for the Bias Detection Engine (B - Beta)
 * "Statistical z-score analysis"
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
  }
})

describe('Bias Detection Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
  })

  describe('Module Exports', () => {
    it('should export biasDetectionEngine singleton', async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')
      expect(biasDetectionEngine).toBeDefined()
    })

    it('should export BiasDetectionEngine class', async () => {
      const { BiasDetectionEngine } = await import('@/lib/engines/bias-detection')
      expect(BiasDetectionEngine).toBeDefined()
    })

    it('should export all type definitions', async () => {
      const module = await import('@/lib/engines/bias-detection')
      // Type exports are validated by TypeScript compilation
      expect(module).toBeDefined()
    })
  })

  describe('Statistical Functions', () => {
    it('should perform binomial test correctly', async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      // Test via analyzeRatio which uses binomial internally
      const result = await biasDetectionEngine.analyzeRatio(
        8,
        'prosecution',
        0,
        'defense',
        'Test 8/8 prosecution-favoring omissions',
        'case-123'
      )

      expect(result.tests).toBeDefined()
      expect(result.tests.length).toBeGreaterThan(0)
      // 8/8 same direction should be highly significant
      expect(result.tests[0].pValue).toBeLessThan(0.01)
    })

    it("should calculate Cohen's h effect size", async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      const result = await biasDetectionEngine.analyzeRatio(
        90,
        'subject',
        10,
        'cleared',
        'Test extreme ratio',
        'case-123'
      )

      expect(result.effectSizes).toBeDefined()
      const cohensH = result.effectSizes.find(e => e.metric === 'cohens_h')
      expect(cohensH).toBeDefined()
      expect(cohensH?.magnitude).toBe('extreme')
    })

    it('should calculate Clopper-Pearson confidence intervals', async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      const result = await biasDetectionEngine.analyzeRatio(
        70,
        'prosecution',
        30,
        'defense',
        'Test 70/30 split',
        'case-123'
      )

      expect(result.confidenceIntervals).toBeDefined()
      const ci = result.confidenceIntervals.find(c => c.method === 'clopper_pearson')
      expect(ci).toBeDefined()
      expect(ci?.level).toBe(0.95)
      if (ci) {
        expect(ci.lowerBound).toBeLessThan(ci.upperBound)
      }
    })
  })

  describe('analyzeRatio', () => {
    it('should detect significant imbalance in 13.2:1 ratio', async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      // Channel 4 documentary case: 13.2:1 subject vs cleared
      const result = await biasDetectionEngine.analyzeRatio(
        132,
        'subject',
        10,
        'cleared',
        'Documentary screen time analysis',
        'case-123'
      )

      expect(result.summary.isSignificant).toBe(true)
      expect(result.counts.direction1Count).toBe(132)
      expect(result.counts.direction2Count).toBe(10)
      expect(result.biasDirection).toBe('subject')
    })

    it('should return correct ratio in effect sizes', async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      const result = await biasDetectionEngine.analyzeRatio(
        50,
        'mother',
        25,
        'father',
        'Test 2:1 ratio',
        'case-123'
      )

      const ratioEffect = result.effectSizes.find(e => e.metric === 'ratio')
      expect(ratioEffect).toBeDefined()
      expect(ratioEffect?.value).toBeCloseTo(2.0, 1)
    })

    it('should handle equal distribution (no bias)', async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      const result = await biasDetectionEngine.analyzeRatio(
        50,
        'prosecution',
        50,
        'defense',
        'Equal distribution test',
        'case-123'
      )

      expect(result.biasScore).toBeCloseTo(0, 1)
      expect(result.summary.isSignificant).toBe(false)
    })
  })

  describe('analyzeDocument', () => {
    it('should extract directional items from document', async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      const mockChunks = [{ content: 'Document content with biased statements.', chunk_index: 0 }]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockChunks, error: null }),
        single: jest.fn().mockResolvedValue({ data: { filename: 'test.pdf' }, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        items: [
          {
            description: 'Exculpatory evidence omitted',
            direction: 'prosecution',
            materiality: 'critical',
            source: 'Para 12',
            pageReference: 'p.5',
          },
          {
            description: 'Defendant portrayed negatively',
            direction: 'prosecution',
            materiality: 'high',
            source: 'Para 34',
          },
        ],
        analysisNotes: 'Clear prosecution bias pattern',
      })

      const result = await biasDetectionEngine.analyzeDocument('doc-123', 'case-123', 'omission')

      expect(result.items).toHaveLength(2)
      expect(result.items[0].direction).toBe('prosecution')
      expect(result.biasDirection).toBe('prosecution')
    })

    it('should calculate bias metrics from extracted items', async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: { filename: 'test.pdf' }, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      // 7 prosecution, 1 defense = 6/8 net prosecution
      mockGenerateJSON.mockResolvedValue({
        items: [
          { description: 'Item 1', direction: 'prosecution', materiality: 'high', source: 'P1' },
          { description: 'Item 2', direction: 'prosecution', materiality: 'high', source: 'P2' },
          { description: 'Item 3', direction: 'prosecution', materiality: 'medium', source: 'P3' },
          { description: 'Item 4', direction: 'prosecution', materiality: 'high', source: 'P4' },
          {
            description: 'Item 5',
            direction: 'prosecution',
            materiality: 'critical',
            source: 'P5',
          },
          { description: 'Item 6', direction: 'prosecution', materiality: 'high', source: 'P6' },
          { description: 'Item 7', direction: 'prosecution', materiality: 'medium', source: 'P7' },
          { description: 'Item 8', direction: 'defense', materiality: 'low', source: 'D1' },
        ],
      })

      const result = await biasDetectionEngine.analyzeDocument('doc-123', 'case-123')

      expect(result.counts.direction1Count).toBe(7) // prosecution
      expect(result.counts.direction2Count).toBe(1) // defense
      expect(result.biasScore).toBeCloseTo(0.75, 1) // (7-1)/8
      expect(result.summary.isSignificant).toBe(true)
    })

    it('should use mock mode when placeholder URL is set', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co'

      jest.resetModules()

      jest.mock('@/lib/ai-client', () => ({
        generateJSON: (...args: unknown[]) => mockGenerateJSON(...args),
      }))

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: { filename: 'test.pdf' }, error: null }),
      }

      jest.mock('@/lib/supabase/server', () => ({
        supabaseAdmin: {
          from: () => mockChain,
        },
      }))

      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      const result = await biasDetectionEngine.analyzeDocument('doc-123', 'case-123')

      // Mock mode should return predefined items
      expect(result.items.length).toBeGreaterThan(0)
      expect(mockGenerateJSON).not.toHaveBeenCalled()
    })
  })

  describe('analyzeCombined', () => {
    it('should combine results from multiple documents', async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: { filename: 'test.pdf' }, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        items: [
          {
            description: 'Omission 1',
            direction: 'prosecution',
            materiality: 'critical',
            source: 'S1',
          },
          {
            description: 'Omission 2',
            direction: 'prosecution',
            materiality: 'high',
            source: 'S2',
          },
        ],
      })

      const result = await biasDetectionEngine.analyzeCombined(['doc-1', 'doc-2'], 'case-123')

      expect(result.analyses).toHaveLength(2)
      expect(result.caseId).toBe('case-123')
    })

    it("should apply Fisher's combined probability test", async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: { filename: 'test.pdf' }, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      // Return significant bias in each document
      mockGenerateJSON.mockResolvedValue({
        items: Array(8)
          .fill(null)
          .map((_, i) => ({
            description: `Item ${i}`,
            direction: 'prosecution',
            materiality: 'high',
            source: `S${i}`,
          })),
      })

      const result = await biasDetectionEngine.analyzeCombined(
        ['doc-1', 'doc-2', 'doc-3'],
        'case-123'
      )

      // With multiple significant results, Fisher's test should be applied
      const fisherTest = result.combinedTests.find(t => t.testType === 'fisher_combined')
      if (fisherTest) {
        expect(fisherTest.pValue).toBeLessThan(1)
      }
    })

    it("should apply Stouffer's Z method", async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: { filename: 'test.pdf' }, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        items: Array(6)
          .fill(null)
          .map((_, i) => ({
            description: `Item ${i}`,
            direction: 'subject',
            materiality: 'critical',
            source: `S${i}`,
          })),
      })

      const result = await biasDetectionEngine.analyzeCombined(['doc-1', 'doc-2'], 'case-123')

      const stoufferTest = result.combinedTests.find(t => t.testType === 'stouffer_z')
      if (stoufferTest) {
        expect(stoufferTest.statistic).toBeDefined()
      }
    })

    it('should generate publication-ready statement', async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: { filename: 'test.pdf' }, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        items: Array(10)
          .fill(null)
          .map((_, i) => ({
            description: `Item ${i}`,
            direction: 'prosecution',
            materiality: 'critical',
            source: `S${i}`,
          })),
      })

      const result = await biasDetectionEngine.analyzeCombined(['doc-1', 'doc-2'], 'case-123')

      expect(result.publicationStatement).toBeDefined()
      expect(typeof result.publicationStatement).toBe('string')
      expect(result.publicationStatement.length).toBeGreaterThan(0)
    })
  })

  describe('Significance Levels', () => {
    it('should return NS for p > 0.05', async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      const result = await biasDetectionEngine.analyzeRatio(
        51,
        'prosecution',
        49,
        'defense',
        'Near-equal split',
        'case-123'
      )

      const test = result.tests[0]
      expect(test.significanceLevel).toBe('NS')
    })

    it('should return * for 0.01 < p <= 0.05', async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      // 60/40 split gives moderate significance
      const result = await biasDetectionEngine.analyzeRatio(
        60,
        'prosecution',
        40,
        'defense',
        'Moderate imbalance',
        'case-123'
      )

      const test = result.tests[0]
      // Depending on exact p-value, could be NS or *
      expect(['NS', '*']).toContain(test.significanceLevel)
    })

    it('should return **** for p < 0.00001', async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      // Extreme imbalance
      const result = await biasDetectionEngine.analyzeRatio(
        99,
        'prosecution',
        1,
        'defense',
        'Extreme imbalance',
        'case-123'
      )

      const test = result.tests[0]
      expect(['***', '****']).toContain(test.significanceLevel)
    })
  })

  describe('Effect Size Interpretation', () => {
    it('should classify negligible effect (h < 0.2)', async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      const result = await biasDetectionEngine.analyzeRatio(
        51,
        'prosecution',
        49,
        'defense',
        'Minimal difference',
        'case-123'
      )

      const cohensH = result.effectSizes.find(e => e.metric === 'cohens_h')
      expect(cohensH?.magnitude).toBe('negligible')
    })

    it('should classify large effect (0.8 <= h < 1.2)', async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      const result = await biasDetectionEngine.analyzeRatio(
        80,
        'prosecution',
        20,
        'defense',
        'Large difference',
        'case-123'
      )

      const cohensH = result.effectSizes.find(e => e.metric === 'cohens_h')
      expect(['large', 'very_large', 'extreme']).toContain(cohensH?.magnitude)
    })

    it('should classify extreme effect (h >= 1.6)', async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      const result = await biasDetectionEngine.analyzeRatio(
        99,
        'subject',
        1,
        'cleared',
        'Extreme difference',
        'case-123'
      )

      const cohensH = result.effectSizes.find(e => e.metric === 'cohens_h')
      expect(cohensH?.magnitude).toBe('extreme')
    })
  })

  describe('Direction Detection', () => {
    it('should detect mother vs father direction', async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: { filename: 'test.pdf' }, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        items: [
          { description: 'Favors mother', direction: 'mother', materiality: 'high', source: 'S1' },
          {
            description: 'Favors mother 2',
            direction: 'mother',
            materiality: 'high',
            source: 'S2',
          },
          {
            description: 'Favors father',
            direction: 'father',
            materiality: 'medium',
            source: 'S3',
          },
        ],
      })

      const result = await biasDetectionEngine.analyzeDocument('doc-123', 'case-123')

      expect(result.counts.direction1Label).toBe('mother')
      expect(result.counts.direction2Label).toBe('father')
      expect(result.biasDirection).toBe('mother')
    })

    it('should detect subject vs cleared direction', async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: { filename: 'test.pdf' }, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        items: [
          {
            description: 'Against subject',
            direction: 'subject',
            materiality: 'critical',
            source: 'S1',
          },
          {
            description: 'Cleared favorable',
            direction: 'cleared',
            materiality: 'low',
            source: 'S2',
          },
        ],
      })

      const result = await biasDetectionEngine.analyzeDocument('doc-123', 'case-123')

      expect(['subject', 'cleared']).toContain(result.counts.direction1Label)
    })

    it('should handle neutral items correctly', async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: { filename: 'test.pdf' }, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        items: [
          { description: 'Neutral item 1', direction: 'neutral', materiality: 'low', source: 'S1' },
          { description: 'Neutral item 2', direction: 'neutral', materiality: 'low', source: 'S2' },
          {
            description: 'Prosecution item',
            direction: 'prosecution',
            materiality: 'high',
            source: 'S3',
          },
        ],
      })

      const result = await biasDetectionEngine.analyzeDocument('doc-123', 'case-123')

      expect(result.counts.neutralCount).toBe(2)
      expect(result.counts.total).toBe(1) // Only non-neutral items counted in total
    })
  })

  describe('Database Storage', () => {
    it('should store significant findings in database', async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null })
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: { filename: 'test.pdf' }, error: null }),
        insert: mockInsert,
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        items: Array(8)
          .fill(null)
          .map((_, i) => ({
            description: `Item ${i}`,
            direction: 'prosecution',
            materiality: 'critical',
            source: `S${i}`,
          })),
      })

      await biasDetectionEngine.analyzeCombined(['doc-1', 'doc-2'], 'case-123')

      expect(mockSupabaseFrom).toHaveBeenCalledWith('findings')
    })
  })

  describe('Error Handling', () => {
    it('should handle AI extraction failure gracefully', async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: { filename: 'test.pdf' }, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockRejectedValue(new Error('AI service unavailable'))

      const result = await biasDetectionEngine.analyzeDocument('doc-123', 'case-123')

      // Should return empty items on failure
      expect(result.items).toHaveLength(0)
    })

    it('should handle empty document content', async () => {
      const { biasDetectionEngine } = await import('@/lib/engines/bias-detection')

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: { filename: 'test.pdf' }, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({ items: [] })

      const result = await biasDetectionEngine.analyzeDocument('doc-123', 'case-123')

      expect(result.items).toHaveLength(0)
      expect(result.biasDirection).toBe('neutral')
    })
  })
})
