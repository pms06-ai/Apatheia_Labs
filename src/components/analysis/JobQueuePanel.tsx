'use client'

/**
 * JobQueuePanel Component
 *
 * Displays active and recently completed analysis jobs with
 * progress tracking and cancel capability.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, CheckCircle2, XCircle, Loader2, Square,
  ChevronDown, ChevronUp, Clock
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
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

function JobRow({ job, onCancel, isCancelling }: JobRowProps) {
  const config = STATUS_CONFIG[job.status]
  const StatusIcon = config.Icon
  const isRunning = job.status === 'running' || job.status === 'pending'
  const progress = job.totalEngines > 0
    ? Math.round((job.completedEngines / job.totalEngines) * 100)
    : 0

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg border transition-colors',
      job.status === 'failed' ? 'bg-status-critical-bg/10 border-status-critical/30' :
      job.status === 'completed' ? 'bg-status-success/5 border-status-success/20' :
      isRunning ? 'bg-bronze-500/5 border-bronze-500/20' :
      'bg-charcoal-800/50 border-charcoal-700'
    )}>
      {/* Status Icon */}
      <div className={cn(
        'flex items-center justify-center w-8 h-8 rounded-full shrink-0',
        `bg-${config.color}/10`
      )}>
        <StatusIcon className={cn(
          'h-4 w-4',
          `text-${config.color}`,
          job.status === 'running' && 'animate-spin'
        )} />
      </div>

      {/* Job Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-charcoal-300 font-mono truncate">
            {job.jobId.slice(0, 8)}
          </span>
          <Badge
            variant={job.status === 'failed' ? 'critical' : job.status === 'completed' ? 'default' : 'default'}
            className={cn(
              'text-[10px] px-1.5',
              isRunning && 'bg-bronze-500/20 text-bronze-400'
            )}
          >
            {config.label}
          </Badge>
        </div>

        {/* Current Engine / Status */}
        <div className="text-xs text-charcoal-400 truncate">
          {job.currentEngine
            ? `Running: ${job.currentEngine}`
            : `${job.totalEngines} engine${job.totalEngines !== 1 ? 's' : ''}`}
        </div>

        {/* Progress Bar */}
        {isRunning && (
          <div className="mt-2 w-full h-1.5 bg-charcoal-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-bronze-500 rounded-full"
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
      <div className="flex items-center gap-2 shrink-0">
        {isRunning && (
          <>
            <span className="text-xs text-charcoal-400 font-mono">
              {progress}%
            </span>
            <button
              onClick={() => onCancel(job.jobId)}
              disabled={isCancelling}
              className={cn(
                'p-1.5 rounded transition-colors',
                isCancelling
                  ? 'bg-charcoal-700 text-charcoal-500 cursor-not-allowed'
                  : 'bg-status-critical/10 text-status-critical hover:bg-status-critical/20'
              )}
              title="Cancel job"
            >
              {isCancelling ? (
                <Spinner size="sm" />
              ) : (
                <Square className="h-3 w-3" />
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ============================================
// Main Component
// ============================================

export function JobQueuePanel({ className, collapsible = true }: JobQueuePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const { data: jobs, isLoading } = useJobs()
  const cancelMutation = useCancelJob()

  // Split jobs
  const activeJobs = jobs?.filter(
    (j) => j.status === 'pending' || j.status === 'running'
  ) || []
  const recentJobs = jobs?.filter(
    (j) => j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled'
  ).slice(0, 3) || [] // Keep only 3 most recent

  const hasJobs = activeJobs.length > 0 || recentJobs.length > 0

  // Don't render if no jobs
  if (!hasJobs && !isLoading) {
    return null
  }

  const handleCancel = async (jobId: string) => {
    try {
      await cancelMutation.mutateAsync(jobId)
    } catch {
      // Error handled by mutation
    }
  }

  return (
    <Card className={cn('border-charcoal-700 overflow-hidden', className)}>
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between p-3 border-b border-charcoal-700',
          collapsible && 'cursor-pointer hover:bg-charcoal-800/50'
        )}
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Activity className={cn(
            'h-4 w-4',
            activeJobs.length > 0 ? 'text-bronze-400' : 'text-charcoal-400'
          )} />
          <span className="text-sm font-medium text-ivory-100">Jobs</span>
          {activeJobs.length > 0 && (
            <Badge variant="default" className="bg-bronze-500/20 text-bronze-400 text-[10px]">
              {activeJobs.length} running
            </Badge>
          )}
        </div>

        {collapsible && (
          <button className="text-charcoal-400 hover:text-charcoal-300">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
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
            <div className="p-3 space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner size="sm" />
                </div>
              ) : (
                <>
                  {/* Active Jobs */}
                  {activeJobs.map((job) => (
                    <JobRow
                      key={job.jobId}
                      job={job}
                      onCancel={handleCancel}
                      isCancelling={cancelMutation.isPending && cancelMutation.variables === job.jobId}
                    />
                  ))}

                  {/* Recent Jobs */}
                  {recentJobs.length > 0 && activeJobs.length > 0 && (
                    <div className="my-2 border-t border-charcoal-700" />
                  )}
                  {recentJobs.map((job) => (
                    <JobRow
                      key={job.jobId}
                      job={job}
                      onCancel={handleCancel}
                      isCancelling={false}
                    />
                  ))}

                  {/* Empty State */}
                  {activeJobs.length === 0 && recentJobs.length === 0 && (
                    <div className="text-center text-charcoal-500 py-4 text-xs">
                      No active jobs
                    </div>
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
