import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDataLayer } from '@/lib/data'

// ============================================
// ENTITIES
// ============================================

export function useEntities(caseId: string) {
  return useQuery({
    queryKey: ['entities', caseId],
    queryFn: async () => {
      const db = await getDataLayer()
      return db.getEntities(caseId)
    },
    enabled: !!caseId,
  })
}

// ============================================
// FINDINGS
// ============================================

export function useFindings(caseId: string, engine?: string) {
  return useQuery({
    queryKey: ['findings', caseId, engine],
    queryFn: async () => {
      const db = await getDataLayer()
      return db.getFindings(caseId, engine)
    },
    enabled: !!caseId,
  })
}

// ============================================
// CLAIMS
// ============================================

export function useClaims(caseId: string) {
  return useQuery({
    queryKey: ['claims', caseId],
    queryFn: async () => {
      const db = await getDataLayer()
      return db.getClaims(caseId)
    },
    enabled: !!caseId,
  })
}

// ============================================
// CONTRADICTIONS
// ============================================

export function useContradictions(caseId: string) {
  return useQuery({
    queryKey: ['contradictions', caseId],
    queryFn: async () => {
      const db = await getDataLayer()
      return db.getContradictions(caseId)
    },
    enabled: !!caseId,
  })
}

// ============================================
// ANALYSIS
// ============================================

export function useAnalysis(caseId: string) {
  return useQuery({
    queryKey: ['analysis', caseId],
    queryFn: async () => {
      const db = await getDataLayer()
      return db.getAnalysis(caseId)
    },
    enabled: !!caseId,
  })
}

export function useRunAnalysis() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      caseId,
      analysisType,
      documentIds,
    }: {
      caseId: string
      analysisType: string
      documentIds?: string[]
    }) => {
      const db = await getDataLayer()
      return db.runEngine({
        caseId,
        engineId: analysisType,
        documentIds: documentIds || [],
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['findings', variables.caseId] })
      queryClient.invalidateQueries({ queryKey: ['claims', variables.caseId] })
      queryClient.invalidateQueries({ queryKey: ['contradictions', variables.caseId] })
      queryClient.invalidateQueries({ queryKey: ['entities', variables.caseId] })
      queryClient.invalidateQueries({ queryKey: ['analysis', variables.caseId] })
    },
  })
}

// ============================================
// ENGINES
// ============================================

export function useRunEngine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      engineId,
      caseId,
      documentIds,
      options,
    }: {
      engineId: string
      caseId: string
      documentIds: string[]
      options?: Record<string, unknown>
    }) => {
      const db = await getDataLayer()
      return db.runEngine({
        caseId,
        engineId,
        documentIds,
        options,
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['findings', variables.caseId] })
      queryClient.invalidateQueries({ queryKey: ['entities', variables.caseId] })
      queryClient.invalidateQueries({ queryKey: ['contradictions', variables.caseId] })
      queryClient.invalidateQueries({ queryKey: ['analysis', variables.caseId] })
    },
    onError: error => {
      console.error('[Engine Error]', error)
    },
  })
}
