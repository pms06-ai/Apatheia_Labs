/**
 * Phronesis FCIP - Tauri Sync Hook
 * 
/**
 * Phronesis FCIP - Tauri Sync Hook
 * 
 * Provides bidirectional state synchronization between the React frontend
 * and the Tauri Rust backend via events.
 */

'use client'

import { useEffect, useRef, useCallback, useMemo } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { isDesktop } from '@/lib/tauri'
import {
  setupEventListeners,
  type DocumentProcessingProgress,
  type DocumentProcessingComplete,
  type DocumentProcessingError,
  type EngineProgress,
  type EngineFinding,
  type EngineError,
  type EngineMockMode,
  type EngineComplete,
  type JobStarted,
} from '@/lib/tauri/events'
import toast from 'react-hot-toast'

// ============================================
// Types
// ============================================

export interface AnalysisProgress {
  jobId: string
  caseId: string
  engines: string[]
  completed: number
  total: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  currentEngine?: string
  findings: number
}

export interface DocumentProgress {
  documentId: string
  progress: number
  stage: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  error?: string
}

export interface SyncState {
  analysisJobs: Map<string, AnalysisProgress>
  documentProgress: Map<string, DocumentProgress>
}

export interface UseTauriSyncOptions {
  onDocumentComplete?: (documentId: string) => void
  onAnalysisComplete?: (jobId: string) => void
  showToasts?: boolean
}

// ============================================
// Hook
// ============================================

/**
 * Hook that syncs Tauri events with React Query cache
 *
 * Automatically:
 * - Invalidates queries when documents are processed
 * - Invalidates queries when analysis jobs complete
 * - Tracks progress of ongoing operations
 */
export function useTauriSync(options: UseTauriSyncOptions = {}) {
  const queryClient = useQueryClient()
  const stateRef = useRef<SyncState>({
    analysisJobs: new Map(),
    documentProgress: new Map(),
  })
  const { showToasts = true } = options

  // ==========================================
  // Document Processing Handlers
  // ==========================================

  const handleDocumentProgress = useCallback((progress: DocumentProcessingProgress) => {
    const docProgress: DocumentProgress = {
      documentId: progress.document_id,
      progress: progress.progress,
      stage: progress.stage,
      status: 'processing',
    }
    stateRef.current.documentProgress.set(progress.document_id, docProgress)
    // Update React Query cache for reactivity
    queryClient.setQueryData(['doc-progress', progress.document_id], docProgress)
  }, [queryClient])

  const handleDocumentComplete = useCallback(
    (result: DocumentProcessingComplete) => {
      const docProgress: DocumentProgress = {
        documentId: result.document_id,
        progress: 100,
        stage: 'completed',
        status: 'completed',
      }
      stateRef.current.documentProgress.set(result.document_id, docProgress)
      // Update React Query cache for reactivity
      queryClient.setQueryData(['doc-progress', result.document_id], docProgress)

      // Invalidate document queries
      queryClient.invalidateQueries({ queryKey: ['documents'] })

      if (showToasts) {
        toast.success(`Document processed: ${result.chunk_count} chunks extracted`)
      }

      options.onDocumentComplete?.(result.document_id)
    },
    [queryClient, showToasts, options]
  )

  const handleDocumentError = useCallback(
    (error: DocumentProcessingError) => {
      const docProgress: DocumentProgress = {
        documentId: error.document_id,
        progress: 0,
        stage: 'error',
        status: 'error',
        error: error.error,
      }
      stateRef.current.documentProgress.set(error.document_id, docProgress)
      // Update React Query cache for reactivity
      queryClient.setQueryData(['doc-progress', error.document_id], docProgress)

      // Still invalidate to show error state
      queryClient.invalidateQueries({ queryKey: ['documents'] })

      if (showToasts) {
        toast.error(`Document processing failed: ${error.error}`)
      }
    },
    [queryClient, showToasts]
  )

  // ==========================================
  // Analysis Job Handlers
  // ==========================================

  const handleJobStarted = useCallback(
    (job: JobStarted) => {
      const progress: AnalysisProgress = {
        jobId: job.job_id,
        caseId: job.case_id,
        engines: job.engines,
        completed: 0,
        total: job.engines.length,
        status: 'running',
        findings: 0,
      }
      // Store in ref for local access
      stateRef.current.analysisJobs.set(job.job_id, progress)
      // Store in React Query cache for reactivity
      queryClient.setQueryData(['job-progress', job.job_id], progress)

      if (showToasts) {
        toast.loading(`Analysis started: ${job.engines.length} engines`, {
          id: `job-${job.job_id}`,
        })
      }
    },
    [showToasts, queryClient]
  )

  const handleEngineProgress = useCallback((progress: EngineProgress) => {
    const job = stateRef.current.analysisJobs.get(progress.job_id)
    if (job) {
      job.completed = progress.completed
      job.currentEngine = progress.engine_id
      job.status = progress.status === 'completed' ? 'completed' : 'running'
      // Update React Query cache for reactivity
      queryClient.setQueryData(['job-progress', progress.job_id], { ...job })
    }
  }, [queryClient])

  // Debounced invalidation for high-frequency finding events
  const invalidateFindingsDebounced = useMemo(() => {
    let timeoutId: NodeJS.Timeout | null = null
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['findings'] })
      }, 500) // Debounce 500ms
    }
  }, [queryClient])

  const handleEngineFinding = useCallback(
    (finding: EngineFinding) => {
      const job = stateRef.current.analysisJobs.get(finding.job_id)
      if (job) {
        job.findings += finding.finding_count
        // Update React Query cache for reactivity (debounced below)
        queryClient.setQueryData(['job-progress', finding.job_id], { ...job })
      }

      // Debounced invalidation to prevent excessive re-renders
      invalidateFindingsDebounced()
    },
    [invalidateFindingsDebounced, queryClient]
  )

  const handleEngineComplete = useCallback(
    (result: EngineComplete) => {
      const job = stateRef.current.analysisJobs.get(result.job_id)
      if (job) {
        job.status = result.status === 'completed' ? 'completed' : 'failed'
        job.completed = job.total
        // Update React Query cache for reactivity
        queryClient.setQueryData(['job-progress', result.job_id], { ...job })

        // Invalidate all analysis-related queries
        queryClient.invalidateQueries({ queryKey: ['findings', job.caseId] })
        queryClient.invalidateQueries({ queryKey: ['contradictions', job.caseId] })
        queryClient.invalidateQueries({ queryKey: ['entities', job.caseId] })
        queryClient.invalidateQueries({ queryKey: ['analysis', job.caseId] })

        if (showToasts) {
          if (result.status === 'completed') {
            toast.success(`Analysis complete: ${job.findings} findings`, {
              id: `job-${result.job_id}`,
            })
          } else {
            toast.error(`Analysis ${result.status}`, {
              id: `job-${result.job_id}`,
            })
          }
        }

        options.onAnalysisComplete?.(result.job_id)
      }
    },
    [queryClient, showToasts, options]
  )

  const handleEngineError = useCallback(
    (error: EngineError) => {
      if (showToasts) {
        toast.error(`Engine ${error.engine_id} failed: ${error.error}`)
      }
    },
    [showToasts]
  )

  const handleEngineMockMode = useCallback(
    (payload: EngineMockMode) => {
      if (showToasts) {
        toast.error(`Mock mode active: ${payload.message}`)
      }
    },
    [showToasts]
  )

  // ==========================================
  // Setup Effect
  // ==========================================

  useEffect(() => {
    if (!isDesktop()) {
      return
    }

    let listeners: { unlistenAll: () => void } | null = null

    async function setup() {
      listeners = await setupEventListeners({
        onDocumentProgress: handleDocumentProgress,
        onDocumentComplete: handleDocumentComplete,
        onDocumentError: handleDocumentError,
        onJobStarted: handleJobStarted,
        onEngineProgress: handleEngineProgress,
        onEngineFinding: handleEngineFinding,
        onEngineComplete: handleEngineComplete,
        onEngineError: handleEngineError,
        onEngineMockMode: handleEngineMockMode,
      })
    }

    setup()

    return () => {
      listeners?.unlistenAll()
    }
  }, [
    handleDocumentProgress,
    handleDocumentComplete,
    handleDocumentError,
    handleJobStarted,
    handleEngineProgress,
    handleEngineFinding,
    handleEngineComplete,
    handleEngineError,
    handleEngineMockMode,
  ])

  // ==========================================
  // Return State Access
  // ==========================================

  return {
    /**
     * Get progress for a specific document
     */
    getDocumentProgress: useCallback((documentId: string): DocumentProgress | undefined => {
      return stateRef.current.documentProgress.get(documentId)
    }, []),

    /**
     * Get progress for a specific analysis job
     */
    getJobProgress: useCallback((jobId: string): AnalysisProgress | undefined => {
      return stateRef.current.analysisJobs.get(jobId)
    }, []),

    /**
     * Get all active analysis jobs
     */
    getActiveJobs: useCallback((): AnalysisProgress[] => {
      return Array.from(stateRef.current.analysisJobs.values()).filter(
        job => job.status === 'running' || job.status === 'pending'
      )
    }, []),

    /**
     * Check if running in desktop mode
     */
    isDesktop: isDesktop(),
  }
}

// ============================================
// Reactive Hooks (subscribe to progress changes)
// ============================================

/**
 * Subscribe to job progress reactively
 * Re-renders when job progress changes via Tauri events
 */
export function useJobProgressSubscription(jobId: string | undefined) {
  return useQuery<AnalysisProgress | null>({
    queryKey: ['job-progress', jobId],
    queryFn: () => null, // Initial value, updated via setQueryData
    enabled: !!jobId,
    staleTime: Infinity, // Never refetch, only updated via events
  })
}

/**
 * Subscribe to document progress reactively
 * Re-renders when document processing status changes
 */
export function useDocumentProgressSubscription(documentId: string | undefined) {
  return useQuery<DocumentProgress | null>({
    queryKey: ['doc-progress', documentId],
    queryFn: () => null, // Initial value, updated via setQueryData
    enabled: !!documentId,
    staleTime: Infinity, // Never refetch, only updated via events
  })
}
