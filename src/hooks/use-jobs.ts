'use client'

/**
 * Job Queue Hooks
 *
 * React Query hooks for managing engine analysis jobs.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDataLayer } from '@/lib/data'

/**
 * Get list of all jobs (active and completed)
 */
export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const dataLayer = await getDataLayer()
      return dataLayer.listJobs()
    },
    refetchInterval: (query) => {
      // Poll every 2s if there are running jobs
      const jobs = query.state.data
      if (!jobs) return false
      const hasRunning = jobs.some(
        (j: { status: string }) => j.status === 'pending' || j.status === 'running'
      )
      return hasRunning ? 2000 : false
    },
  })
}

/**
 * Get progress for a specific job
 */
export function useJobProgress(jobId: string | null) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const dataLayer = await getDataLayer()
      return dataLayer.getJobProgress(jobId!)
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const progress = query.state.data
      if (!progress) return 1000
      if (progress.status === 'completed' || progress.status === 'failed') {
        return false
      }
      return 1000
    },
  })
}

/**
 * Cancel a running job
 */
export function useCancelJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (jobId: string) => {
      const dataLayer = await getDataLayer()
      return dataLayer.cancelJob(jobId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

/**
 * Submit a new batch analysis job
 */
export function useSubmitAnalysis() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: { caseId: string; engines: string[]; documentIds: string[] }) => {
      const dataLayer = await getDataLayer()
      return dataLayer.submitAnalysis({
        caseId: params.caseId,
        engines: params.engines,
        documentIds: params.documentIds,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['findings'] })
    },
  })
}

/**
 * Hook to get active/running jobs count
 */
export function useActiveJobsCount() {
  const { data: jobs } = useJobs()
  const activeCount = jobs?.filter(
    (j: { status: string }) => j.status === 'pending' || j.status === 'running'
  ).length || 0
  return activeCount
}
