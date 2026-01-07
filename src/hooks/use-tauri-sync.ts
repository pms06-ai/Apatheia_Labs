/**
 * Phronesis FCIP - Tauri Sync Hook
 * 
 * Provides bidirectional state synchronization between the React frontend
 * and the Tauri Rust backend via events.
 */

'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
    stateRef.current.documentProgress.set(progress.document_id, {
      documentId: progress.document_id,
      progress: progress.progress,
      stage: progress.stage,
      status: 'processing',
    })
  }, [])

  const handleDocumentComplete = useCallback((result: DocumentProcessingComplete) => {
    stateRef.current.documentProgress.set(result.document_id, {
      documentId: result.document_id,
      progress: 100,
      stage: 'completed',
      status: 'completed',
    })

    // Invalidate document queries
    queryClient.invalidateQueries({ queryKey: ['documents'] })
    
    if (showToasts) {
      toast.success(`Document processed: ${result.chunk_count} chunks extracted`)
    }

    options.onDocumentComplete?.(result.document_id)
  }, [queryClient, showToasts, options])

  const handleDocumentError = useCallback((error: DocumentProcessingError) => {
    stateRef.current.documentProgress.set(error.document_id, {
      documentId: error.document_id,
      progress: 0,
      stage: 'error',
      status: 'error',
      error: error.error,
    })

    // Still invalidate to show error state
    queryClient.invalidateQueries({ queryKey: ['documents'] })

    if (showToasts) {
      toast.error(`Document processing failed: ${error.error}`)
    }
  }, [queryClient, showToasts])

  // ==========================================
  // Analysis Job Handlers
  // ==========================================

  const handleJobStarted = useCallback((job: JobStarted) => {
    stateRef.current.analysisJobs.set(job.job_id, {
      jobId: job.job_id,
      caseId: job.case_id,
      engines: job.engines,
      completed: 0,
      total: job.engines.length,
      status: 'running',
      findings: 0,
    })

    if (showToasts) {
      toast.loading(`Analysis started: ${job.engines.length} engines`, {
        id: `job-${job.job_id}`,
      })
    }
  }, [showToasts])

  const handleEngineProgress = useCallback((progress: EngineProgress) => {
    const job = stateRef.current.analysisJobs.get(progress.job_id)
    if (job) {
      job.completed = progress.completed
      job.currentEngine = progress.engine_id
      job.status = progress.status === 'completed' ? 'completed' : 'running'
    }
  }, [])

  const handleEngineFinding = useCallback((finding: EngineFinding) => {
    const job = stateRef.current.analysisJobs.get(finding.job_id)
    if (job) {
      job.findings += finding.finding_count
    }

    // Invalidate findings queries for real-time updates
    queryClient.invalidateQueries({ queryKey: ['findings'] })
  }, [queryClient])

  const handleEngineComplete = useCallback((result: EngineComplete) => {
    const job = stateRef.current.analysisJobs.get(result.job_id)
    if (job) {
      job.status = result.status === 'completed' ? 'completed' : 'failed'
      job.completed = job.total

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
  }, [queryClient, showToasts, options])

  const handleEngineError = useCallback((error: EngineError) => {
    if (showToasts) {
      toast.error(`Engine ${error.engine_id} failed: ${error.error}`)
    }
  }, [showToasts])

  const handleEngineMockMode = useCallback((payload: EngineMockMode) => {
    if (showToasts) {
      toast.error(`Mock mode active: ${payload.message}`)
    }
  }, [showToasts])

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
        (job) => job.status === 'running' || job.status === 'pending'
      )
    }, []),

    /**
     * Check if running in desktop mode
     */
    isDesktop: isDesktop(),
  }
}

