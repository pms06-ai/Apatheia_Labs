import { useEffect, useState } from 'react'
import { isDesktop } from '@/lib/tauri'

export interface EngineStatus {
  running: boolean
  progress: number
  lastRun?: string
  findingsCount?: number
  error?: string
}

export interface JobProgress {
  jobId: string
  status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed'
  engines: string[]
  completedEngines: number
  totalEngines: number
  currentEngine?: string
}

interface UseEngineProgressOptions {
  enabled?: boolean
  onFindingsUpdate?: () => void
  onMockModeWarning?: (message: string) => void
}

export function useEngineProgress(options: UseEngineProgressOptions = {}) {
  const { enabled = true, onFindingsUpdate, onMockModeWarning } = options
  const [engineStatuses, setEngineStatuses] = useState<Record<string, EngineStatus>>({})
  const [currentJob, setCurrentJob] = useState<JobProgress | null>(null)
  const [mockModeWarning, setMockModeWarning] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !isDesktop()) return

    let unlisten: (() => void) | undefined

    async function setupListeners() {
      const { listen } = await import('@tauri-apps/api/event')

      const unlistenStart = await listen<{ job_id: string; engines: string[] }>('engine:job_started', (event) => {
        setCurrentJob({
          jobId: event.payload.job_id,
          status: 'running',
          engines: event.payload.engines,
          completedEngines: 0,
          totalEngines: event.payload.engines.length,
        })
      })

      const unlistenProgress = await listen<{
        job_id: string
        engine_id: string
        completed: number
        total: number
      }>('engine:progress', (event) => {
        setCurrentJob((prev) => prev ? {
          ...prev,
          currentEngine: event.payload.engine_id,
          completedEngines: event.payload.completed,
        } : null)

        setEngineStatuses((prev) => ({
          ...prev,
          [event.payload.engine_id]: {
            running: true,
            progress: Math.round((event.payload.completed / event.payload.total) * 100),
          }
        }))
      })

      const unlistenFinding = await listen<{
        job_id: string
        engine_id: string
        finding_count: number
      }>('engine:finding', (event) => {
        setEngineStatuses((prev) => ({
          ...prev,
          [event.payload.engine_id]: {
            running: false,
            progress: 100,
            lastRun: new Date().toISOString(),
            findingsCount: event.payload.finding_count,
          }
        }))
        onFindingsUpdate?.()
      })

      const unlistenComplete = await listen<{ job_id: string; status?: string }>('engine:complete', (event) => {
        setCurrentJob((prev) => prev ? { ...prev, status: event.payload.status === 'failed' ? 'failed' : 'completed' } : null)
        setTimeout(() => setCurrentJob(null), 3000)
        onFindingsUpdate?.()
      })

      const unlistenError = await listen<{
        job_id: string
        engine_id: string
        error: string
      }>('engine:error', (event) => {
        setEngineStatuses((prev) => ({
          ...prev,
          [event.payload.engine_id]: {
            running: false,
            progress: 0,
            error: event.payload.error,
          }
        }))
      })

      const unlistenMockMode = await listen<{ job_id?: string; message: string }>('engine:mock_mode', (event) => {
        setMockModeWarning(event.payload.message)
        onMockModeWarning?.(event.payload.message)
      })

      unlisten = () => {
        unlistenStart()
        unlistenProgress()
        unlistenFinding()
        unlistenComplete()
        unlistenError()
        unlistenMockMode()
      }
    }

    setupListeners()

    return () => {
      if (unlisten) unlisten()
    }
  }, [enabled, onFindingsUpdate, onMockModeWarning])

  return {
    engineStatuses,
    currentJob,
    mockModeWarning,
    clearMockModeWarning: () => setMockModeWarning(null),
    setEngineStatuses,
  }
}
