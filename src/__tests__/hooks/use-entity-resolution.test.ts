/**
 * ENTITY RESOLUTION HOOK TESTS
 *
 * Tests for the React Query hooks that handle entity resolution
 * data fetching, linkage management, and user feedback.
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'

let useEntityResolution: typeof import('@/hooks/use-entity-resolution').useEntityResolution
let useResolvedEntities: typeof import('@/hooks/use-entity-resolution').useResolvedEntities
let useEntityLinkages: typeof import('@/hooks/use-entity-resolution').useEntityLinkages
let usePendingLinkages: typeof import('@/hooks/use-entity-resolution').usePendingLinkages
let useEntityGraph: typeof import('@/hooks/use-entity-resolution').useEntityGraph
let useUpdateLinkageStatus: typeof import('@/hooks/use-entity-resolution').useUpdateLinkageStatus
let useConfirmLinkage: typeof import('@/hooks/use-entity-resolution').useConfirmLinkage
let useRejectLinkage: typeof import('@/hooks/use-entity-resolution').useRejectLinkage
let useRunEntityResolution: typeof import('@/hooks/use-entity-resolution').useRunEntityResolution
import type {
  EntityResolutionResult,
  EntityLinkageProposal,
  ResolvedEntity,
  EntityGraphData,
} from '@/lib/engines/entity-resolution'

// ============================================
// MOCKS
// ============================================

// Mock the data layer
const mockGetDocuments = jest.fn()
const mockGetEntities = jest.fn()
const mockUpdateEntityLinkage = jest.fn()

jest.mock('@/lib/data', () => ({
  getDataLayer: jest.fn(() =>
    Promise.resolve({
      getDocuments: mockGetDocuments,
      getEntities: mockGetEntities,
      updateEntityLinkage: mockUpdateEntityLinkage,
    })
  ),
}))

// Mock the entity resolution engine
const mockResolveEntities = jest.fn()

jest.mock('@/lib/engines/entity-resolution', () => ({
  entityResolutionEngine: {
    resolveEntities: (...args: unknown[]) => mockResolveEntities(...args),
  },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const hooks = require('@/hooks/use-entity-resolution') as typeof import('@/hooks/use-entity-resolution')
useEntityResolution = hooks.useEntityResolution
useResolvedEntities = hooks.useResolvedEntities
useEntityLinkages = hooks.useEntityLinkages
usePendingLinkages = hooks.usePendingLinkages
useEntityGraph = hooks.useEntityGraph
useUpdateLinkageStatus = hooks.useUpdateLinkageStatus
useConfirmLinkage = hooks.useConfirmLinkage
useRejectLinkage = hooks.useRejectLinkage
useRunEntityResolution = hooks.useRunEntityResolution

// ============================================
// TEST FIXTURES
// ============================================

const createMockDocument = (overrides = {}) => ({
  id: 'doc-123',
  case_id: 'case-123',
  filename: 'test.pdf',
  file_type: 'application/pdf',
  file_size: 1024,
  storage_path: 'path/to/test.pdf',
  hash_sha256: 'abc123',
  doc_type: 'other' as const,
  source_entity: null,
  status: 'completed' as const,
  extracted_text: 'Test document content',
  page_count: 5,
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  acquisition_date: new Date().toISOString(),
  ...overrides,
})

const createMockEntity = (overrides = {}): ResolvedEntity => ({
  id: 'ent-123',
  canonicalName: 'Dr. John Smith',
  type: 'professional',
  role: 'Doctor',
  mentions: [
    {
      docId: 'doc-123',
      text: 'Dr. John Smith',
      context: '...Dr. John Smith prepared the report...',
    },
  ],
  aliases: ['Dr. John Smith', 'J. Smith', 'Smith'],
  confidence: 0.9,
  ...overrides,
})

const createMockLinkage = (overrides = {}): EntityLinkageProposal => ({
  id: 'link-123',
  entity1Name: 'Dr. John Smith',
  entity2Name: 'J. Smith',
  confidence: 0.85,
  algorithm: 'variant' as const,
  status: 'pending' as const,
  entityIds: ['ent-1', 'ent-2'],
  ...overrides,
})

const createMockGraph = (): EntityGraphData => ({
  nodes: [
    {
      key: 'ent-123',
      attributes: {
        id: 'ent-123',
        name: 'Dr. John Smith',
        type: 'professional',
        role: 'Doctor',
        aliases: ['Dr. John Smith', 'J. Smith'],
        mentionCount: 3,
        documentIds: ['doc-123'],
        confidence: 0.9,
      },
    },
  ],
  edges: [],
  metadata: {
    nodeCount: 1,
    edgeCount: 0,
    directed: false,
    createdAt: new Date().toISOString(),
  },
})

const createMockResolutionResult = (overrides = {}): EntityResolutionResult => ({
  entities: [createMockEntity()],
  linkages: [createMockLinkage(), createMockLinkage({ id: 'link-456', status: 'confirmed' })],
  graph: createMockGraph(),
  summary: {
    totalEntities: 1,
    peopleCount: 0,
    professionalCount: 1,
    organizationCount: 0,
    courtCount: 0,
    linkagesIdentified: 2,
    highConfidenceLinkages: 1,
  },
  metadata: {
    textLength: 100,
    processingTimeMs: 50,
    extractionMethod: 'compromise' as const,
    fuzzyMatchingApplied: true,
  },
  ...overrides,
})

// ============================================
// TEST WRAPPER
// ============================================

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  Wrapper.displayName = 'TestQueryClientWrapper'
  return Wrapper
}

// ============================================
// TESTS
// ============================================

describe('Entity Resolution Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetDocuments.mockResolvedValue([createMockDocument()])
    mockGetEntities.mockResolvedValue([])
    mockResolveEntities.mockResolvedValue(createMockResolutionResult())
    // Dynamic mock that echoes the input parameters
    ;(mockUpdateEntityLinkage as jest.Mock).mockImplementation(
      (input: { linkageId: string; status: string; reviewedBy?: string }) =>
        Promise.resolve({
          linkageId: input.linkageId,
          status: input.status,
          reviewedBy: input.reviewedBy,
          reviewedAt: new Date().toISOString(),
        })
    )
  })

  describe('useEntityResolution', () => {
    it('should fetch entity resolution results', async () => {
      const { result } = renderHook(() => useEntityResolution('case-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toBeDefined()
      expect(result.current.data?.entities).toBeDefined()
      expect(result.current.data?.linkages).toBeDefined()
      expect(result.current.data?.graph).toBeDefined()
    })

    it('should call entity resolution engine with documents', async () => {
      const mockDocs = [createMockDocument({ id: 'doc-1' })]
      mockGetDocuments.mockResolvedValue(mockDocs)

      const { result } = renderHook(() => useEntityResolution('case-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetDocuments).toHaveBeenCalledWith('case-123')
      expect(mockResolveEntities).toHaveBeenCalledWith(mockDocs, 'case-123')
    })

    it('should not fetch when caseId is empty', async () => {
      const { result } = renderHook(() => useEntityResolution(''), {
        wrapper: createWrapper(),
      })

      // Give it some time to potentially make a call
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(result.current.isFetching).toBe(false)
      expect(mockGetDocuments).not.toHaveBeenCalled()
    })

    it('should respect enabled flag', async () => {
      const { result } = renderHook(() => useEntityResolution('case-123', false), {
        wrapper: createWrapper(),
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(result.current.isFetching).toBe(false)
      expect(mockGetDocuments).not.toHaveBeenCalled()
    })

    it('should include entities in result', async () => {
      const mockResult = createMockResolutionResult({
        entities: [
          createMockEntity({ id: 'ent-1', canonicalName: 'John Smith' }),
          createMockEntity({ id: 'ent-2', canonicalName: 'Jane Doe' }),
        ],
      })
      mockResolveEntities.mockResolvedValue(mockResult)

      const { result } = renderHook(() => useEntityResolution('case-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.entities.length).toBe(2)
    })

    it('should include linkages in result', async () => {
      const mockResult = createMockResolutionResult({
        linkages: [
          createMockLinkage({ id: 'link-1' }),
          createMockLinkage({ id: 'link-2' }),
          createMockLinkage({ id: 'link-3' }),
        ],
      })
      mockResolveEntities.mockResolvedValue(mockResult)

      const { result } = renderHook(() => useEntityResolution('case-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.linkages.length).toBe(3)
    })

    it('should include graph data in result', async () => {
      const { result } = renderHook(() => useEntityResolution('case-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.graph).toBeDefined()
      expect(result.current.data?.graph.nodes).toBeDefined()
      expect(result.current.data?.graph.edges).toBeDefined()
      expect(result.current.data?.graph.metadata).toBeDefined()
    })
  })

  describe('useResolvedEntities', () => {
    it('should fetch entities using data layer', async () => {
      const mockEntities = [{ id: 'ent-1' }, { id: 'ent-2' }]
      mockGetEntities.mockResolvedValue(mockEntities)

      const { result } = renderHook(() => useResolvedEntities('case-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetEntities).toHaveBeenCalledWith('case-123')
      expect(result.current.data).toEqual(mockEntities)
    })

    it('should not fetch when caseId is empty', async () => {
      const { result } = renderHook(() => useResolvedEntities(''), {
        wrapper: createWrapper(),
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(result.current.isFetching).toBe(false)
      expect(mockGetEntities).not.toHaveBeenCalled()
    })
  })

  describe('useEntityLinkages', () => {
    it('should fetch linkages from entity resolution', async () => {
      const mockResult = createMockResolutionResult({
        linkages: [createMockLinkage({ id: 'link-1' }), createMockLinkage({ id: 'link-2' })],
      })
      mockResolveEntities.mockResolvedValue(mockResult)

      const { result } = renderHook(() => useEntityLinkages('case-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.length).toBe(2)
      expect(result.current.data?.[0].id).toBe('link-1')
    })

    it('should return empty array when no linkages', async () => {
      mockResolveEntities.mockResolvedValue(createMockResolutionResult({ linkages: [] }))

      const { result } = renderHook(() => useEntityLinkages('case-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual([])
    })
  })

  describe('usePendingLinkages', () => {
    it('should filter to only pending linkages', async () => {
      const mockResult = createMockResolutionResult({
        linkages: [
          createMockLinkage({ id: 'link-1', status: 'pending' }),
          createMockLinkage({ id: 'link-2', status: 'confirmed' }),
          createMockLinkage({ id: 'link-3', status: 'pending' }),
          createMockLinkage({ id: 'link-4', status: 'rejected' }),
        ],
      })
      mockResolveEntities.mockResolvedValue(mockResult)

      const { result } = renderHook(() => usePendingLinkages('case-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.length).toBe(2)
      expect(result.current.data?.every(l => l.status === 'pending')).toBe(true)
    })

    it('should return empty array when no pending linkages', async () => {
      mockResolveEntities.mockResolvedValue(
        createMockResolutionResult({
          linkages: [createMockLinkage({ status: 'confirmed' })],
        })
      )

      const { result } = renderHook(() => usePendingLinkages('case-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual([])
    })
  })

  describe('useEntityGraph', () => {
    it('should fetch entity graph', async () => {
      const { result } = renderHook(() => useEntityGraph('case-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toBeDefined()
      expect(result.current.data?.nodes).toBeDefined()
      expect(result.current.data?.edges).toBeDefined()
    })

    it('should have correct graph metadata', async () => {
      const { result } = renderHook(() => useEntityGraph('case-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.metadata.directed).toBe(false)
      expect(typeof result.current.data?.metadata.nodeCount).toBe('number')
      expect(typeof result.current.data?.metadata.edgeCount).toBe('number')
    })
  })

  describe('useUpdateLinkageStatus', () => {
    it('should update linkage status to confirmed', async () => {
      const { result } = renderHook(() => useUpdateLinkageStatus(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({
          caseId: 'case-123',
          linkageId: 'link-123',
          status: 'confirmed',
        })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toBeDefined()
      expect(result.current.data?.status).toBe('confirmed')
      expect(result.current.data?.linkageId).toBe('link-123')
    })

    it('should update linkage status to rejected', async () => {
      const { result } = renderHook(() => useUpdateLinkageStatus(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({
          caseId: 'case-123',
          linkageId: 'link-456',
          status: 'rejected',
        })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.status).toBe('rejected')
    })

    it('should include reviewedBy when provided', async () => {
      const { result } = renderHook(() => useUpdateLinkageStatus(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({
          caseId: 'case-123',
          linkageId: 'link-123',
          status: 'confirmed',
          reviewedBy: 'user-123',
        })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.reviewedBy).toBe('user-123')
    })

    it('should include reviewedAt timestamp', async () => {
      const { result } = renderHook(() => useUpdateLinkageStatus(), {
        wrapper: createWrapper(),
      })

      const before = new Date().toISOString()

      await act(async () => {
        await result.current.mutateAsync({
          caseId: 'case-123',
          linkageId: 'link-123',
          status: 'confirmed',
        })
      })

      const after = new Date().toISOString()

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.reviewedAt).toBeDefined()
      const reviewedAt = result.current.data?.reviewedAt ?? ''
      expect(reviewedAt >= before).toBe(true)
      expect(reviewedAt <= after).toBe(true)
    })
  })

  describe('useConfirmLinkage', () => {
    it('should provide confirmLinkage convenience method', async () => {
      const { result } = renderHook(() => useConfirmLinkage(), {
        wrapper: createWrapper(),
      })

      expect(typeof result.current.confirmLinkage).toBe('function')
      expect(typeof result.current.confirmLinkageAsync).toBe('function')
    })

    it('should confirm linkage with status confirmed', async () => {
      const { result } = renderHook(() => useConfirmLinkage(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.confirmLinkageAsync('case-123', 'link-123', 'user-1')
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.status).toBe('confirmed')
      expect(result.current.data?.linkageId).toBe('link-123')
    })
  })

  describe('useRejectLinkage', () => {
    it('should provide rejectLinkage convenience method', async () => {
      const { result } = renderHook(() => useRejectLinkage(), {
        wrapper: createWrapper(),
      })

      expect(typeof result.current.rejectLinkage).toBe('function')
      expect(typeof result.current.rejectLinkageAsync).toBe('function')
    })

    it('should reject linkage with status rejected', async () => {
      const { result } = renderHook(() => useRejectLinkage(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.rejectLinkageAsync('case-123', 'link-123')
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.status).toBe('rejected')
    })
  })

  describe('useRunEntityResolution', () => {
    it('should run entity resolution on all documents', async () => {
      const mockDocs = [createMockDocument()]
      mockGetDocuments.mockResolvedValue(mockDocs)

      const { result } = renderHook(() => useRunEntityResolution(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({ caseId: 'case-123' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockGetDocuments).toHaveBeenCalledWith('case-123')
      expect(mockResolveEntities).toHaveBeenCalledWith(mockDocs, 'case-123')
      expect(result.current.data).toBeDefined()
    })

    it('should filter to specified documentIds when provided', async () => {
      const mockDocs = [
        createMockDocument({ id: 'doc-1' }),
        createMockDocument({ id: 'doc-2' }),
        createMockDocument({ id: 'doc-3' }),
      ]
      mockGetDocuments.mockResolvedValue(mockDocs)

      const { result } = renderHook(() => useRunEntityResolution(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({
          caseId: 'case-123',
          documentIds: ['doc-1', 'doc-3'],
        })
      })

      expect(mockResolveEntities).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'doc-1' }),
          expect.objectContaining({ id: 'doc-3' }),
        ]),
        'case-123'
      )
      // Should not include doc-2
      expect(mockResolveEntities).not.toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 'doc-2' })]),
        expect.anything()
      )
    })

    it('should return entity resolution result', async () => {
      const mockResult = createMockResolutionResult()
      mockResolveEntities.mockResolvedValue(mockResult)

      const { result } = renderHook(() => useRunEntityResolution(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({ caseId: 'case-123' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.entities).toBeDefined()
      expect(result.current.data?.linkages).toBeDefined()
      expect(result.current.data?.graph).toBeDefined()
      expect(result.current.data?.summary).toBeDefined()
    })
  })

  describe('Hook Integration - Feedback Loop', () => {
    it('should fetch entities, linkages, and provide mutation for feedback', async () => {
      // This test verifies the complete feedback loop workflow
      const mockResult = createMockResolutionResult({
        linkages: [
          createMockLinkage({ id: 'link-1', status: 'pending' }),
          createMockLinkage({ id: 'link-2', status: 'pending' }),
        ],
      })
      mockResolveEntities.mockResolvedValue(mockResult)

      const wrapper = createWrapper()

      // 1. Fetch entity resolution
      const { result: resolutionResult } = renderHook(() => useEntityResolution('case-123'), {
        wrapper,
      })
      await waitFor(() => expect(resolutionResult.current.isSuccess).toBe(true))

      // Verify entities are fetched
      expect(resolutionResult.current.data?.entities.length).toBeGreaterThan(0)

      // 2. Verify linkages are available
      expect(resolutionResult.current.data?.linkages.length).toBe(2)

      // 3. Test mutation for feedback
      const { result: mutationResult } = renderHook(() => useUpdateLinkageStatus(), {
        wrapper,
      })

      await act(async () => {
        await mutationResult.current.mutateAsync({
          caseId: 'case-123',
          linkageId: 'link-1',
          status: 'confirmed',
        })
      })

      await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true))
      expect(mutationResult.current.data?.status).toBe('confirmed')
    })
  })
})
