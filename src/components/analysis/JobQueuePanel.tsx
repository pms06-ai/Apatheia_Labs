'use client'

/**
 * JobQueuePanel Component
 *
 * Displays active and recently completed analysis jobs with
 * progress tracking and cancel capability.
 */

import { useState, memo, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  Square,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { SkeletonJob } from '@/components/ui/skeleton'
import { useJobs, useCancelJob } from '@/hooks/use-jobs'
import { cn } from '@/lib/utils'
import type { JobProgress } from '@/lib/data'

// ============================================
// Types
// ============================================

interface JobQueuePanelProps {
  className?: string
  collapsible?: boolean
}

// ============================================
// Constants
// ============================================

const STATUS_CONFIG = {
  pending: { Icon: Clock, color: 'charcoal-400', label: 'Pending' },
  running: { Icon: Loader2, color: 'bronze-400', label: 'Running' },
  completed: { Icon: CheckCircle2, color: 'status-success', label: 'Completed' },
  failed: { Icon: XCircle, color: 'status-critical', label: 'Failed' },
  cancelled: { Icon: Square, color: 'charcoal-500', label: 'Cancelled' },
}

// ============================================
// Sub-Components
// ============================================

interface JobRowProps {
  job: JobProgress
  onCancel: (jobId: string) => void
  isCancelling: boolean
}

/**
 * Individual job row component - memoized to prevent re-renders when job hasn't changed
 */
const JobRow = memo(function JobRow({ job, onCancel, isCancelling }: JobRowProps) {
  const config = STATUS_CONFIG[job.status]
  const StatusIcon = config.Icon
  const isRunning = job.status === 'running' || job.status === 'pending'

  // Memoize progress calculation
  const progress = useMemo(
    () => (job.totalEngines > 0 ? Math.round((job.completedEngines / job.totalEngines) * 100) : 0),
    [job.completedEngines, job.totalEngines]
  )

  // Memoize cancel handler
  const handleCancelClick = useCallback(() => {
    onCancel(job.jobId)
  }, [onCancel, job.jobId])

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3 transition-colors',
        job.status === 'failed'
          ? 'border-status-critical/30 bg-status-critical-bg/10'
          : job.status === 'completed'
            ? 'border-status-success/20 bg-status-success/5'
            : isRunning
              ? 'border-bronze-500/20 bg-bronze-500/5'
              : 'border-charcoal-700 bg-charcoal-800/50'
      )}
    >
      {/* Status Icon */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          `bg-${config.color}/10`
        )}
      >
        <StatusIcon
          className={cn(
            'h-4 w-4',
            `text-${config.color}`,
            job.status === 'running' && 'animate-spin'
          )}
        />
      </div>

      {/* Job Info */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="truncate font-mono text-xs text-charcoal-300">
            {job.jobId.slice(0, 8)}
          </span>
          <Badge
            variant={
              job.status === 'failed'
                ? 'critical'
                : job.status === 'completed'
                  ? 'default'
                  : 'default'
            }
            className={cn('px-1.5 text-[10px]', isRunning && 'bg-bronze-500/20 text-bronze-400')}
          >
            {config.label}
          </Badge>
        </div>

        {/* Current Engine / Status */}
        <div className="truncate text-xs text-charcoal-400">
          {job.currentEngine
            ? `Running: ${job.currentEngine}`
            : `${job.totalEngines} engine${job.totalEngines !== 1 ? 's' : ''}`}
        </div>

        {/* Progress Bar */}
        {isRunning && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-charcoal-800">
            <motion.div
              className="h-full rounded-full bg-bronze-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        {/* Progress Text */}
        {isRunning && job.totalEngines > 0 && (
          <div className="mt-1 text-xs text-charcoal-400">
            {job.completedEngines} / {job.totalEngines} engines
          </div>
        )}
      </div>

      {/* Progress/Actions */}
      <div className="flex shrink-0 items-center gap-2">
        {isRunning && (
          <>
            <span className="font-mono text-xs text-charcoal-400">{progress}%</span>
            <button
              onClick={handleCancelClick}
              disabled={isCancelling}
              className={cn(
                'rounded p-1.5 transition-colors',
                isCancelling
                  ? 'cursor-not-allowed bg-charcoal-700 text-charcoal-500'
                  : 'bg-status-critical/10 text-status-critical hover:bg-status-critical/20'
              )}
              title="Cancel job"
            >
              {isCancelling ? <Spinner size="sm" /> : <Square className="h-3 w-3" />}
            </button>
          </>
        )}
      </div>
    </div>
  )
})
JobRow.displayName = 'JobRow'

// ============================================
// Main Component
// ============================================

export function JobQueuePanel({ className, collapsible = true }: JobQueuePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const { data: jobs, isLoading } = useJobs()
  const cancelMutation = useCancelJob()

  // Memoize split jobs to avoid re-filtering on every render
  const activeJobs = useMemo(
    () => jobs?.filter(j => j.status === 'pending' || j.status === 'running') || [],
    [jobs]
  )

  const recentJobs = useMemo(
    () =>
      jobs
        ?.filter(j => j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled')
        .slice(0, 3) || [], // Keep only 3 most recent
    [jobs]
  )

  const hasJobs = activeJobs.length > 0 || recentJobs.length > 0

  // Memoize cancel handler to maintain stable reference
  const handleCancel = useCallback(
    async (jobId: string) => {
      try {
        await cancelMutation.mutateAsync(jobId)
      } catch {
        // Error handled by mutation
      }
    },
    [cancelMutation]
  )

  // Memoize toggle handler
  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  // Don't render if no jobs
  if (!hasJobs && !isLoading) {
    return null
  }

  return (
    <Card className={cn('overflow-hidden border-charcoal-700', className)}>
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between border-b border-charcoal-700 p-3',
          collapsible && 'cursor-pointer hover:bg-charcoal-800/50'
        )}
        onClick={collapsible ? handleToggleExpand : undefined}
      >
        <div className="flex items-center gap-2">
          <Activity
            className={cn(
              'h-4 w-4',
              activeJobs.length > 0 ? 'text-bronze-400' : 'text-charcoal-400'
            )}
          />
          <span className="text-ivory-100 text-sm font-medium">Jobs</span>
          {activeJobs.length > 0 && (
            <Badge variant="default" className="bg-bronze-500/20 text-[10px] text-bronze-400">
              {activeJobs.length} running
            </Badge>
          )}
        </div>

        {collapsible && (
          <button className="text-charcoal-400 hover:text-charcoal-300">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 p-3">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <SkeletonJob key={i} />
                  ))}
                </div>
              ) : (
                <>
                  {/* Active Jobs */}
                  {activeJobs.map(job => (
                    <JobRow
                      key={job.jobId}
                      job={job}
                      onCancel={handleCancel}
                      isCancelling={
                        cancelMutation.isPending && cancelMutation.variables === job.jobId
                      }
                    />
                  ))}

                  {/* Recent Jobs */}
                  {recentJobs.length > 0 && activeJobs.length > 0 && (
                    <div className="my-2 border-t border-charcoal-700" />
                  )}
                  {recentJobs.map(job => (
                    <JobRow
                      key={job.jobId}
                      job={job}
                      onCancel={handleCancel}
                      isCancelling={false}
                    />
                  ))}

                  {/* Empty State */}
                  {activeJobs.length === 0 && recentJobs.length === 0 && (
                    <div className="py-4 text-center text-xs text-charcoal-500">No active jobs</div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
