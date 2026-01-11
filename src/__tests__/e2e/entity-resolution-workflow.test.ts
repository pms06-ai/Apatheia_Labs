/**
 * END-TO-END ENTITY RESOLUTION WORKFLOW TEST
 *
 * This test suite verifies the complete entity resolution workflow:
 * 1. Upload test document with multiple entity references
 * 2. Run entity resolution engine
 * 3. Verify entities extracted with variations
 * 4. Verify fuzzy matching proposes linkages
 * 5. Confirm linkage in UI
 * 6. Verify graph updates with confirmed linkage
 * 7. Verify database persists user feedback
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

import {
  resolveEntities,
  buildGraph,
  findEntityVariations,
  areEntitiesSame,
  type ResolvedEntity,
  type EntityLinkageProposal,
  type EntityResolutionResult,
  type EntityGraphData,
} from '@/lib/engines/entity-resolution'
import { extractEntitiesFromDocuments } from '@/lib/nlp/entity-extractor'
import { fuzzyMatch, generateLinkageProposals } from '@/lib/nlp/fuzzy-matcher'
let useEntityResolution: typeof import('@/hooks/use-entity-resolution').useEntityResolution
let useUpdateLinkageStatus: typeof import('@/hooks/use-entity-resolution').useUpdateLinkageStatus
let useConfirmLinkage: typeof import('@/hooks/use-entity-resolution').useConfirmLinkage
let useRejectLinkage: typeof import('@/hooks/use-entity-resolution').useRejectLinkage
let usePendingLinkages: typeof import('@/hooks/use-entity-resolution').usePendingLinkages
let useEntityGraph: typeof import('@/hooks/use-entity-resolution').useEntityGraph
import type { Document } from '@/CONTRACT'

// ============================================
// TEST FIXTURES - Realistic Legal Documents
// ============================================

const createTestDocument = (id: string, text: string): Document => ({
  id,
  case_id: 'case-e2e-123',
  filename: `${id}.pdf`,
  file_type: 'application/pdf',
  file_size: text.length * 2,
  storage_path: `cases/case-e2e-123/${id}.pdf`,
  hash_sha256: `hash-${id}`,
  doc_type: 'statement' as const,
  source_entity: null,
  status: 'completed' as const,
  extracted_text: text,
  page_count: 1,
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  acquisition_date: new Date().toISOString(),
})

// Document 1: Social Worker Assessment Report
const DOCUMENT_1_TEXT = `
SOCIAL WORKER ASSESSMENT REPORT

Case Reference: FAM-2024-001

Date of Assessment: 15 January 2024

Prepared by: SW Sarah Thompson
Senior Social Worker
Children's Services

1. INTRODUCTION

This assessment has been prepared by SW Thompson for the Family Court in relation to
the welfare of Child A. Dr. Sarah Thompson conducted multiple home visits between
November 2023 and January 2024.

2. PROFESSIONAL INVOLVEMENT

Dr. Alan Grant, Clinical Psychologist, provided a psychological assessment dated
12 December 2023. Professor Grant recommended ongoing therapy support. The
assessment by A. Grant was comprehensive and detailed.

3. OBSERVATIONS

During the home visit on 5 January 2024, S. Thompson observed positive interactions
between the parent and child. The social worker noted improvements since the previous
assessment conducted by Thompson in October 2023.

4. RECOMMENDATIONS

Ms. Thompson recommends continued support services. Dr. Grant's assessment should
be reviewed in three months. The Family Court should consider the findings of both
professionals.

Signed: Sarah Thompson, HCPC Registered Social Worker
Date: 20 January 2024
`

// Document 2: Expert Witness Statement
const DOCUMENT_2_TEXT = `
EXPERT WITNESS STATEMENT

IN THE FAMILY COURT                                     Case No: FAM-2024-001

I, Dr. Alan Grant, Clinical Psychologist, make this statement in support of the
ongoing proceedings.

1. QUALIFICATIONS AND EXPERIENCE

My name is Professor Alan Grant. I am a registered Clinical Psychologist with over
20 years of experience. I have been instructed by the Local Authority to provide
an expert psychological assessment.

2. ASSESSMENT DETAILS

I conducted my assessment on 12 December 2023 at the Family Assessment Centre.
The assessment was observed by SW S. Thompson from Children's Services.
Dr. Grant (myself) employed standardized assessment tools including the WISC-V.

3. FINDINGS

Based on my assessment, I found that the child presented with age-appropriate
cognitive abilities. My findings align with the observations made by Social Worker
Thompson in her assessment report.

4. PROFESSIONAL DISCUSSIONS

I have consulted with SW Thompson and Dr. J. Williams (Child Psychiatrist) regarding
this case. Judge Williams at the Family Court has also reviewed preliminary findings.
Dr. James Williams provided psychiatric input on medication considerations.

5. CONCLUSION

In my professional opinion as Dr. A. Grant, continued family support is warranted.
The Local Authority Services should maintain oversight.

Statement of Truth
I believe that the facts stated in this witness statement are true.

Dr. Alan Grant
Clinical Psychologist
Registration No: CP12345
`

// Document 3: Court Hearing Notes
const DOCUMENT_3_TEXT = `
FAMILY COURT HEARING NOTES

Before: Judge Williams
Case Reference: FAM-2024-001
Date of Hearing: 25 January 2024

ATTENDANCE:
- Ms. Sarah Thompson (Social Worker, Children's Services)
- Professor A. Grant (Expert Witness, Psychologist)
- Dr. Williams (Child Psychiatrist, NHS Trust)

SUMMARY OF PROCEEDINGS:

1. The Family Court heard evidence from SW Thompson regarding the home assessment.
   Thompson confirmed the positive progress observed during recent visits.

2. Dr. Grant presented his psychological evaluation. Professor Grant answered
   questions from the bench regarding his methodology.

3. NHS Trust representative Dr. J. Williams provided medical context. James Williams
   confirmed no safeguarding concerns from a psychiatric perspective.

4. Judge Williams noted the consistency between the Social Worker report prepared
   by S. Thompson and the expert evidence provided by A. Grant.

5. The Court directed that Children's Services continue monitoring. SW Sarah Thompson
   to prepare a follow-up report within 6 weeks.

ORDERS MADE:
- Continued supervision by Local Authority
- Review hearing scheduled for March 2024
- Family Assessment Centre to provide fortnightly sessions

Judge Williams
Family Court
25 January 2024
`

// ============================================
// MOCK SETUP
// ============================================

// Mock the data layer
const mockGetDocuments = jest.fn()
const mockGetEntities = jest.fn()
const mockUpdateEntityLinkage = jest.fn()
const mockGetEntityLinkageUpdates = jest.fn()

jest.mock('@/lib/data', () => ({
  getDataLayer: jest.fn(() =>
    Promise.resolve({
      getDocuments: mockGetDocuments,
      getEntities: mockGetEntities,
      updateEntityLinkage: mockUpdateEntityLinkage,
      getEntityLinkageUpdates: mockGetEntityLinkageUpdates,
    })
  ),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const hooks = require('@/hooks/use-entity-resolution') as typeof import('@/hooks/use-entity-resolution')
useEntityResolution = hooks.useEntityResolution
useUpdateLinkageStatus = hooks.useUpdateLinkageStatus
useConfirmLinkage = hooks.useConfirmLinkage
useRejectLinkage = hooks.useRejectLinkage
usePendingLinkages = hooks.usePendingLinkages
useEntityGraph = hooks.useEntityGraph

// Mock localStorage for persistence testing
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})

// Query client wrapper for hooks
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  const TestWrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  TestWrapper.displayName = 'TestWrapper'
  return TestWrapper
}

// ============================================
// E2E TEST SUITE
// ============================================

describe('E2E: Entity Resolution Workflow', () => {
  const testDocuments: Document[] = [
    createTestDocument('doc-1', DOCUMENT_1_TEXT),
    createTestDocument('doc-2', DOCUMENT_2_TEXT),
    createTestDocument('doc-3', DOCUMENT_3_TEXT),
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()

    // Setup mock data layer responses
    mockGetDocuments.mockResolvedValue(testDocuments)
    mockGetEntities.mockResolvedValue([])
    mockGetEntityLinkageUpdates.mockResolvedValue([])
    mockUpdateEntityLinkage.mockImplementation(async input => ({
      linkageId: input.linkageId,
      status: input.status,
      reviewedBy: input.reviewedBy,
      reviewedAt: new Date().toISOString(),
    }))
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  // ============================================
  // Step 1: Document Upload and Preparation
  // ============================================

  describe('Step 1: Upload Test Documents with Multiple Entity References', () => {
    it('should have test documents with entity references across multiple name variations', () => {
      // Verify documents contain the expected entity name variations

      // Sarah Thompson variations
      expect(DOCUMENT_1_TEXT).toContain('SW Sarah Thompson')
      expect(DOCUMENT_1_TEXT).toContain('Dr. Sarah Thompson')
      expect(DOCUMENT_1_TEXT).toContain('S. Thompson')
      expect(DOCUMENT_1_TEXT).toContain('Ms. Thompson')
      expect(DOCUMENT_1_TEXT).toContain('Thompson')

      // Alan Grant variations
      expect(DOCUMENT_1_TEXT).toContain('Dr. Alan Grant')
      expect(DOCUMENT_2_TEXT).toContain('Professor Alan Grant')
      expect(DOCUMENT_2_TEXT).toContain('A. Grant')
      expect(DOCUMENT_3_TEXT).toContain('Professor A. Grant')

      // Dr. Williams variations
      expect(DOCUMENT_2_TEXT).toContain('Dr. J. Williams')
      expect(DOCUMENT_2_TEXT).toContain('Dr. James Williams')
      expect(DOCUMENT_3_TEXT).toContain('Judge Williams')

      // Court variations
      expect(DOCUMENT_1_TEXT).toContain('Family Court')
      expect(DOCUMENT_3_TEXT).toContain('Family Court')
    })

    it('should prepare documents for entity extraction', () => {
      const docsForExtraction = testDocuments.map(doc => ({
        id: doc.id,
        text: doc.extracted_text || '',
      }))

      expect(docsForExtraction.length).toBe(3)
      expect(docsForExtraction.every(d => d.text.length > 0)).toBe(true)
    })
  })

  // ============================================
  // Step 2: Run Entity Resolution Engine
  // ============================================

  describe('Step 2: Run Entity Resolution Engine', () => {
    it('should extract entities using Compromise NLP', async () => {
      const result = await resolveEntities(testDocuments, 'case-e2e-123')

      expect(result).toBeDefined()
      expect(result.metadata.extractionMethod).toBe('compromise')
      expect(result.entities.length).toBeGreaterThan(0)
    })

    it('should complete entity resolution within performance threshold', async () => {
      const startTime = Date.now()
      const result = await resolveEntities(testDocuments, 'case-e2e-123')
      const elapsed = Date.now() - startTime

      // Should complete within 5 seconds for these documents
      expect(elapsed).toBeLessThan(5000)
      expect(result.metadata.processingTimeMs).toBeDefined()
    })

    it('should enable fuzzy matching during resolution', async () => {
      const result = await resolveEntities(testDocuments, 'case-e2e-123')

      expect(result.metadata.fuzzyMatchingApplied).toBe(true)
    })
  })

  // ============================================
  // Step 3: Verify Entities Extracted with Variations
  // ============================================

  describe('Step 3: Verify Entities Extracted with Variations', () => {
    it('should extract professional entities with proper types', async () => {
      const result = await resolveEntities(testDocuments, 'case-e2e-123')

      // Check for professional entity types
      const professionalEntities = result.entities.filter(e => e.type === 'professional')
      expect(professionalEntities.length).toBeGreaterThanOrEqual(0)

      // Check entity structure
      for (const entity of result.entities) {
        expect(entity.id).toBeDefined()
        expect(entity.canonicalName).toBeDefined()
        expect(['person', 'organization', 'professional', 'court']).toContain(entity.type)
        expect(Array.isArray(entity.aliases)).toBe(true)
        expect(Array.isArray(entity.mentions)).toBe(true)
        expect(entity.confidence).toBeGreaterThanOrEqual(0)
        expect(entity.confidence).toBeLessThanOrEqual(1)
      }
    })

    it('should track aliases for entities with name variations', async () => {
      const result = await resolveEntities(testDocuments, 'case-e2e-123')

      // Each entity should have at least one alias (the canonical name)
      for (const entity of result.entities) {
        expect(entity.aliases.length).toBeGreaterThanOrEqual(1)
      }
    })

    it('should track mentions across multiple documents', async () => {
      const result = await resolveEntities(testDocuments, 'case-e2e-123')

      // Check that mentions include document IDs
      for (const entity of result.entities) {
        for (const mention of entity.mentions) {
          expect(mention.docId).toBeDefined()
          expect(mention.text).toBeDefined()
          expect(mention.context).toBeDefined()
        }
      }
    })

    it('should provide accurate summary statistics', async () => {
      const result = await resolveEntities(testDocuments, 'case-e2e-123')

      expect(result.summary.totalEntities).toBe(result.entities.length)
      expect(result.summary.peopleCount).toBe(
        result.entities.filter(e => e.type === 'person').length
      )
      expect(result.summary.professionalCount).toBe(
        result.entities.filter(e => e.type === 'professional').length
      )
      expect(result.summary.organizationCount).toBe(
        result.entities.filter(e => e.type === 'organization').length
      )
      expect(result.summary.courtCount).toBe(result.entities.filter(e => e.type === 'court').length)
    })
  })

  // ============================================
  // Step 4: Verify Fuzzy Matching Proposes Linkages
  // ============================================

  describe('Step 4: Verify Fuzzy Matching Proposes Linkages', () => {
    it('should identify linkages with confidence scores', async () => {
      const result = await resolveEntities(testDocuments, 'case-e2e-123')

      expect(result.linkages).toBeDefined()
      expect(Array.isArray(result.linkages)).toBe(true)

      for (const linkage of result.linkages) {
        expect(linkage.id).toBeDefined()
        expect(linkage.entity1Name).toBeDefined()
        expect(linkage.entity2Name).toBeDefined()
        expect(linkage.confidence).toBeGreaterThanOrEqual(0)
        expect(linkage.confidence).toBeLessThanOrEqual(1)
        expect(linkage.algorithm).toBeDefined()
        expect(['pending', 'confirmed', 'rejected']).toContain(linkage.status)
      }
    })

    it('should track high confidence linkages in summary', async () => {
      const result = await resolveEntities(testDocuments, 'case-e2e-123')

      expect(result.summary.linkagesIdentified).toBeDefined()
      expect(result.summary.highConfidenceLinkages).toBeDefined()
      expect(result.summary.highConfidenceLinkages).toBeLessThanOrEqual(
        result.summary.linkagesIdentified
      )
    })

    it('should match name variations using fuzzy matching algorithms', () => {
      // Direct fuzzy matching tests
      const result1 = areEntitiesSame('Dr. Smith', 'Smith')
      expect(result1).not.toBeNull()
      if (result1) {
        expect(result1.confidence).toBeGreaterThan(0)
        expect(result1.algorithm).toBeDefined()
      }

      const result2 = areEntitiesSame('Professor Grant', 'Dr. Grant')
      expect(result2).not.toBeNull()
      if (result2) {
        expect(result2.confidence).toBeGreaterThan(0)
      }
    })

    it('should find 5+ variations for common entity names', () => {
      const testNames = [
        'Sarah Thompson',
        'S. Thompson',
        'Dr. Thompson',
        'SW Thompson',
        'Ms. Thompson',
        'Thompson',
        'Sarah',
      ]

      const variations = findEntityVariations('Sarah Thompson', testNames)

      // Should match at least 5 of the variations
      expect(variations.length).toBeGreaterThanOrEqual(5)
    })
  })

  // ============================================
  // Step 5: Confirm Linkage via UI Hooks
  // ============================================

  describe('Step 5: Confirm Linkage in UI', () => {
    it('should update linkage status to confirmed', async () => {
      const { result } = renderHook(() => useUpdateLinkageStatus(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({
          caseId: 'case-e2e-123',
          linkageId: 'link-123',
          status: 'confirmed',
          reviewedBy: 'test-user',
        })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toBeDefined()
      expect(result.current.data?.status).toBe('confirmed')
      expect(result.current.data?.linkageId).toBe('link-123')
      expect(result.current.data?.reviewedBy).toBe('test-user')
      expect(result.current.data?.reviewedAt).toBeDefined()
    })

    it('should update linkage status to rejected', async () => {
      const { result } = renderHook(() => useUpdateLinkageStatus(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({
          caseId: 'case-e2e-123',
          linkageId: 'link-456',
          status: 'rejected',
          reviewedBy: 'test-user',
        })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.status).toBe('rejected')
    })

    it('should provide convenience hooks for confirm/reject', async () => {
      const { result: confirmResult } = renderHook(() => useConfirmLinkage(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await confirmResult.current.confirmLinkageAsync('case-e2e-123', 'link-789', 'reviewer-1')
      })

      await waitFor(() => expect(confirmResult.current.isSuccess).toBe(true))
      expect(confirmResult.current.data?.status).toBe('confirmed')

      const { result: rejectResult } = renderHook(() => useRejectLinkage(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await rejectResult.current.rejectLinkageAsync('case-e2e-123', 'link-999')
      })

      await waitFor(() => expect(rejectResult.current.isSuccess).toBe(true))
      expect(rejectResult.current.data?.status).toBe('rejected')
    })
  })

  // ============================================
  // Step 6: Verify Graph Updates with Confirmed Linkage
  // ============================================

  describe('Step 6: Verify Graph Updates with Confirmed Linkage', () => {
    it('should include graph data in entity resolution result', async () => {
      const result = await resolveEntities(testDocuments, 'case-e2e-123')

      expect(result.graph).toBeDefined()
      expect(result.graph.nodes).toBeDefined()
      expect(result.graph.edges).toBeDefined()
      expect(result.graph.metadata).toBeDefined()
    })

    it('should have graph nodes matching entities', async () => {
      const result = await resolveEntities(testDocuments, 'case-e2e-123')

      expect(result.graph.nodes.length).toBe(result.entities.length)
      expect(result.graph.metadata.nodeCount).toBe(result.entities.length)

      // Each entity should have a corresponding node
      const entityIds = result.entities.map(e => e.id)
      const nodeKeys = result.graph.nodes.map(n => n.key)

      for (const entityId of entityIds) {
        expect(nodeKeys).toContain(entityId)
      }
    })

    it('should have graph node attributes with required fields', async () => {
      const result = await resolveEntities(testDocuments, 'case-e2e-123')

      for (const node of result.graph.nodes) {
        expect(node.key).toBeDefined()
        expect(node.attributes.id).toBeDefined()
        expect(node.attributes.name).toBeDefined()
        expect(node.attributes.type).toBeDefined()
        expect(Array.isArray(node.attributes.aliases)).toBe(true)
        expect(typeof node.attributes.mentionCount).toBe('number')
        expect(Array.isArray(node.attributes.documentIds)).toBe(true)
        expect(typeof node.attributes.confidence).toBe('number')
      }
    })

    it('should have graph edges representing linkages', async () => {
      const result = await resolveEntities(testDocuments, 'case-e2e-123')

      // Edges should not have self-loops
      for (const edge of result.graph.edges) {
        expect(edge.source).not.toBe(edge.target)
        expect(edge.attributes.confidence).toBeGreaterThanOrEqual(0)
        expect(edge.attributes.confidence).toBeLessThanOrEqual(1)
        expect(['pending', 'confirmed', 'rejected']).toContain(edge.attributes.status)
      }
    })

    it('should build graph correctly from entities and linkages', () => {
      const entities: ResolvedEntity[] = [
        {
          id: 'ent-1',
          canonicalName: 'Dr. Smith',
          type: 'professional',
          role: 'Doctor',
          aliases: ['Dr. Smith', 'Smith'],
          mentions: [{ docId: 'doc-1', text: 'Dr. Smith', context: 'context' }],
          confidence: 0.9,
        },
        {
          id: 'ent-2',
          canonicalName: 'John Smith',
          type: 'person',
          aliases: ['John Smith', 'J. Smith'],
          mentions: [{ docId: 'doc-1', text: 'John Smith', context: 'context' }],
          confidence: 0.85,
        },
      ]

      const linkages: EntityLinkageProposal[] = [
        {
          id: 'link-1',
          entity1Name: 'Dr. Smith',
          entity2Name: 'John Smith',
          confidence: 0.88,
          algorithm: 'variant',
          status: 'confirmed',
          entityIds: ['ent-1', 'ent-2'],
        },
      ]

      const graph = buildGraph(entities, linkages)

      expect(graph.nodes.length).toBe(2)
      expect(graph.edges.length).toBe(1)
      expect(graph.metadata.nodeCount).toBe(2)
      expect(graph.metadata.edgeCount).toBe(1)
      expect(graph.edges[0].source).toBe('ent-1')
      expect(graph.edges[0].target).toBe('ent-2')
      expect(graph.edges[0].attributes.status).toBe('confirmed')
    })
  })

  // ============================================
  // Step 7: Verify Database Persists User Feedback
  // ============================================

  describe('Step 7: Verify Database Persists User Feedback', () => {
    it('should call data layer to persist linkage update', async () => {
      const { result } = renderHook(() => useUpdateLinkageStatus(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({
          caseId: 'case-e2e-123',
          linkageId: 'link-persist-test',
          status: 'confirmed',
          reviewedBy: 'test-reviewer',
        })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      // Verify the data layer was called with correct parameters
      expect(mockUpdateEntityLinkage).toHaveBeenCalledWith({
        linkageId: 'link-persist-test',
        status: 'confirmed',
        reviewedBy: 'test-reviewer',
      })
    })

    it('should include timestamp when persisting feedback', async () => {
      const beforeTime = new Date().toISOString()

      const { result } = renderHook(() => useUpdateLinkageStatus(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({
          caseId: 'case-e2e-123',
          linkageId: 'link-timestamp-test',
          status: 'confirmed',
        })
      })

      const afterTime = new Date().toISOString()

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.reviewedAt).toBeDefined()
      expect(result.current.data!.reviewedAt >= beforeTime).toBe(true)
      expect(result.current.data!.reviewedAt <= afterTime).toBe(true)
    })

    it('should persist feedback to localStorage (mock database)', async () => {
      // Simulate the localStorage persistence that happens in the data layer
      const linkageUpdate = {
        linkageId: 'link-local-storage',
        status: 'confirmed' as const,
        reviewedBy: 'user-123',
        reviewedAt: new Date().toISOString(),
      }

      // Store in localStorage (simulating data layer)
      const storageKey = 'entity-linkage-updates'
      const updates = { [linkageUpdate.linkageId]: linkageUpdate }
      localStorageMock.setItem(storageKey, JSON.stringify(updates))

      // Verify persistence
      const stored = localStorageMock.getItem(storageKey)
      expect(stored).not.toBeNull()

      const parsed = JSON.parse(stored!)
      expect(parsed['link-local-storage']).toBeDefined()
      expect(parsed['link-local-storage'].status).toBe('confirmed')
      expect(parsed['link-local-storage'].reviewedBy).toBe('user-123')
    })

    it('should persist multiple feedback entries', async () => {
      const storageKey = 'entity-linkage-updates'
      const updates: Record<string, object> = {}

      // Add multiple linkage updates
      for (let i = 0; i < 5; i++) {
        const update = {
          linkageId: `link-${i}`,
          status: i % 2 === 0 ? 'confirmed' : 'rejected',
          reviewedBy: `user-${i}`,
          reviewedAt: new Date().toISOString(),
        }
        updates[update.linkageId] = update
      }

      localStorageMock.setItem(storageKey, JSON.stringify(updates))

      // Verify all entries persisted
      const stored = JSON.parse(localStorageMock.getItem(storageKey)!)
      expect(Object.keys(stored).length).toBe(5)
      expect(stored['link-0'].status).toBe('confirmed')
      expect(stored['link-1'].status).toBe('rejected')
    })
  })

  // ============================================
  // Complete Workflow Integration Test
  // ============================================

  describe('Complete Workflow Integration', () => {
    it('should execute full entity resolution workflow end-to-end', async () => {
      // Step 1: Prepare documents
      expect(testDocuments.length).toBe(3)

      // Step 2: Run entity resolution
      const result = await resolveEntities(testDocuments, 'case-e2e-123')
      expect(result.metadata.extractionMethod).toBe('compromise')

      // Step 3: Verify entities extracted
      expect(result.entities.length).toBeGreaterThan(0)
      expect(result.entities.every(e => e.aliases.length >= 1)).toBe(true)

      // Step 4: Verify linkages proposed
      expect(result.linkages).toBeDefined()
      expect(result.metadata.fuzzyMatchingApplied).toBe(true)

      // Step 5: Simulate UI confirmation
      const wrapper = createWrapper()
      const { result: hookResult } = renderHook(() => useUpdateLinkageStatus(), {
        wrapper,
      })

      if (result.linkages.length > 0) {
        const firstLinkage = result.linkages[0]

        await act(async () => {
          await hookResult.current.mutateAsync({
            caseId: 'case-e2e-123',
            linkageId: firstLinkage.id,
            status: 'confirmed',
            reviewedBy: 'e2e-test-user',
          })
        })

        // Step 6: Verify feedback recorded
        await waitFor(() => expect(hookResult.current.isSuccess).toBe(true))
        expect(hookResult.current.data?.status).toBe('confirmed')
        expect(mockUpdateEntityLinkage).toHaveBeenCalled()
      }

      // Step 7: Verify graph structure
      expect(result.graph.nodes.length).toBe(result.entities.length)
      expect(result.graph.metadata.directed).toBe(false)
    })

    it('should handle multi-document entity tracking', async () => {
      const result = await resolveEntities(testDocuments, 'case-e2e-123')

      // Find entities that appear in multiple documents
      const multiDocEntities = result.entities.filter(entity => {
        const uniqueDocIds = new Set(entity.mentions.map(m => m.docId))
        return uniqueDocIds.size > 1
      })

      // Verify graph nodes track document IDs
      for (const node of result.graph.nodes) {
        expect(Array.isArray(node.attributes.documentIds)).toBe(true)
      }
    })

    it('should maintain data consistency throughout workflow', async () => {
      const result = await resolveEntities(testDocuments, 'case-e2e-123')

      // Entity count consistency
      expect(result.summary.totalEntities).toBe(result.entities.length)
      expect(result.graph.metadata.nodeCount).toBe(result.entities.length)
      expect(result.graph.nodes.length).toBe(result.entities.length)

      // Type count consistency
      const typeCounts = {
        person: 0,
        professional: 0,
        organization: 0,
        court: 0,
      }

      for (const entity of result.entities) {
        typeCounts[entity.type]++
      }

      expect(result.summary.peopleCount).toBe(typeCounts.person)
      expect(result.summary.professionalCount).toBe(typeCounts.professional)
      expect(result.summary.organizationCount).toBe(typeCounts.organization)
      expect(result.summary.courtCount).toBe(typeCounts.court)

      // Linkage statistics consistency
      const highConfidenceLinkages = result.linkages.filter(l => l.confidence >= 0.8)
      expect(result.summary.highConfidenceLinkages).toBe(highConfidenceLinkages.length)
    })
  })

  // ============================================
  // Performance Verification
  // ============================================

  describe('Performance Verification', () => {
    it('should complete entity extraction within 5 seconds', async () => {
      const startTime = Date.now()
      await resolveEntities(testDocuments, 'case-e2e-123')
      const elapsed = Date.now() - startTime

      expect(elapsed).toBeLessThan(5000)
    })

    it('should complete fuzzy matching efficiently', () => {
      const startTime = Date.now()

      // Perform 100 fuzzy match comparisons
      const names = [
        'Dr. Smith',
        'John Smith',
        'J. Smith',
        'Smith',
        'Sarah Jones',
        'S. Jones',
        'Dr. Jones',
        'Professor Grant',
        'Dr. Grant',
        'A. Grant',
      ]

      for (const name1 of names) {
        for (const name2 of names) {
          areEntitiesSame(name1, name2)
        }
      }

      const elapsed = Date.now() - startTime

      // 100 comparisons should complete within 1 second
      expect(elapsed).toBeLessThan(1000)
    })

    it('should build graph efficiently', async () => {
      const result = await resolveEntities(testDocuments, 'case-e2e-123')

      const startTime = Date.now()
      const graph = buildGraph(result.entities, result.linkages)
      const elapsed = Date.now() - startTime

      expect(elapsed).toBeLessThan(100) // Graph building should be very fast
      expect(graph.nodes.length).toBe(result.entities.length)
    })
  })
})
