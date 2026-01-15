'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  Clock,
  AlertTriangle,
  FileText,
  ChevronRight,
  ChevronDown,
  Activity,
  Hourglass,
  Zap,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type {
  TemporalEngineResult,
  NativeTimelineEvent,
  TimelineGap,
  NativeTemporalAnomaly,
  NativeSeverity,
  TemporalEventType,
} from '@/CONTRACT'
import { cn } from '@/lib/utils'

interface TemporalResultsProps {
  result: TemporalEngineResult
}

const severityVariant: Record<NativeSeverity, 'critical' | 'high' | 'medium' | 'low'> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
}

const eventTypeColors: Record<TemporalEventType, string> = {
  document: 'bg-status-info',
  meeting: 'bg-bronze-500',
  decision: 'bg-status-critical',
  communication: 'bg-charcoal-500',
  investigation: 'bg-institution-police',
  assessment: 'bg-institution-expert',
  complaint: 'bg-status-high',
  contact: 'bg-status-success',
  deadline: 'bg-status-critical',
  status_change: 'bg-bronze-600',
  other: 'bg-charcoal-600',
}

const eventTypeIcons: Record<TemporalEventType, typeof FileText> = {
  document: FileText,
  meeting: Calendar,
  decision: Zap,
  communication: Activity,
  investigation: Activity,
  assessment: FileText,
  complaint: AlertTriangle,
  contact: Calendar,
  deadline: Clock,
  status_change: Activity,
  other: FileText,
}

function TimelineEventCard({
  event,
  isAnomaly,
}: {
  event: NativeTimelineEvent
  isAnomaly?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const Icon = eventTypeIcons[event.event_type] || FileText

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative"
    >
      {/* Timeline Node */}
      <div
        className={cn(
          'absolute -left-[29px] top-4 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-bg-tertiary',
          isAnomaly
            ? 'border-status-critical shadow-[0_0_15px_rgba(201,74,74,0.4)]'
            : 'border-charcoal-600'
        )}
      >
        <div
          className={cn(
            'h-2 w-2 rounded-full',
            isAnomaly ? 'animate-pulse bg-status-critical' : eventTypeColors[event.event_type]
          )}
        />
      </div>

      <Card
        className={cn(
          'cursor-pointer border-charcoal-700 transition-all hover:border-charcoal-600',
          isAnomaly && 'border-status-critical/30 bg-status-critical-bg/5'
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3 p-4">
          <div className={cn('transition-transform duration-200', expanded && 'rotate-90')}>
            <ChevronRight className="h-4 w-4 text-charcoal-400" />
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            {/* Date and Type */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded bg-bronze-500/10 px-2 py-1 font-mono text-xs text-bronze-500">
                <Calendar className="h-3 w-3" />
                <time>
                  {new Date(event.date).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </time>
                {event.time && <span className="text-charcoal-400">{event.time}</span>}
              </div>
              <Badge variant="outline" className="text-xs">
                {event.event_type.replace(/_/g, ' ')}
              </Badge>
              {event.date_precision !== 'exact' && (
                <span className="text-xs text-charcoal-500">({event.date_precision})</span>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-charcoal-200">{event.description}</p>

            {/* Document reference */}
            <div className="flex items-center gap-2 text-xs text-charcoal-500">
              <FileText className="h-3 w-3" />
              <span className="truncate">{event.document_name}</span>
              {event.page_ref && <span className="text-bronze-500">p.{event.page_ref}</span>}
            </div>
          </div>

          <Icon className="h-4 w-4 shrink-0 text-charcoal-500" />
        </div>

        {expanded && (
          <div className="space-y-3 border-t border-charcoal-700/50 p-4">
            {/* Significance */}
            <div className="rounded-lg border border-bronze-600/20 bg-bronze-900/10 p-3">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-bronze-500">
                Significance
              </div>
              <p className="text-sm text-charcoal-200">{event.significance}</p>
            </div>

            {/* Entities Involved */}
            {event.entities_involved.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-charcoal-400">
                  Entities Involved
                </div>
                <div className="flex flex-wrap gap-2">
                  {event.entities_involved.map((entity, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {entity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  )
}

function GapCard({ gap }: { gap: TimelineGap }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card
      className="cursor-pointer border-status-high/30 bg-status-high-bg/10 transition-all hover:border-status-high/50"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3 p-4">
        <div className={cn('transition-transform duration-200', expanded && 'rotate-90')}>
          <ChevronRight className="h-4 w-4 text-status-high" />
        </div>
        <Hourglass className="h-5 w-5 shrink-0 text-status-high" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="font-display text-lg text-status-high">
              {gap.duration_days} day gap
            </span>
            <span className="text-xs text-charcoal-400">
              {new Date(gap.start_date).toLocaleDateString()} -{' '}
              {new Date(gap.end_date).toLocaleDateString()}
            </span>
          </div>
          <p className="mt-1 text-sm text-charcoal-300">{gap.significance}</p>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-status-high/20 p-4">
          {/* Context */}
          <div className="grid gap-3 md:grid-cols-2">
            {gap.preceding_event && (
              <div className="rounded-lg bg-charcoal-800 p-3">
                <div className="mb-1 text-xs text-charcoal-500">Preceding Event</div>
                <p className="text-sm text-charcoal-300">{gap.preceding_event}</p>
              </div>
            )}
            {gap.following_event && (
              <div className="rounded-lg bg-charcoal-800 p-3">
                <div className="mb-1 text-xs text-charcoal-500">Following Event</div>
                <p className="text-sm text-charcoal-300">{gap.following_event}</p>
              </div>
            )}
          </div>

          {/* Expected Events */}
          {gap.expected_events.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-charcoal-400">
                Expected Events (Missing)
              </div>
              <div className="flex flex-wrap gap-2">
                {gap.expected_events.map((event, idx) => (
                  <Badge key={idx} variant="high" className="text-xs">
                    {event}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function AnomalyCard({ anomaly }: { anomaly: NativeTemporalAnomaly }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card
      className="cursor-pointer border-status-critical/30 bg-status-critical-bg/10 transition-all hover:border-status-critical/50"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3 p-4">
        <div className={cn('transition-transform duration-200', expanded && 'rotate-90')}>
          <ChevronRight className="h-4 w-4 text-status-critical" />
        </div>
        <AlertTriangle className="h-5 w-5 shrink-0 text-status-critical" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs uppercase tracking-wide text-status-critical">
              {anomaly.anomaly_type.replace(/_/g, ' ')}
            </span>
            <Badge variant={severityVariant[anomaly.severity]}>{anomaly.severity}</Badge>
          </div>
          <p className="mt-1 text-sm text-charcoal-200">{anomaly.description}</p>
          <span className="mt-1 text-xs text-charcoal-500">{anomaly.date_range}</span>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-status-critical/20 p-4">
          {/* Evidence */}
          <div className="rounded-lg border border-charcoal-700 bg-charcoal-900/50 p-3">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-charcoal-400">
              Evidence
            </div>
            <p className="text-sm text-charcoal-300">{anomaly.evidence}</p>
          </div>

          {/* Implication */}
          <div className="rounded-lg border border-status-critical/20 bg-status-critical-bg/20 p-3">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-status-critical">
              Implication
            </div>
            <p className="text-sm text-charcoal-200">{anomaly.implication}</p>
          </div>

          {/* Affected Events */}
          {anomaly.affected_events.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-charcoal-400">
                Affected Events
              </div>
              <div className="flex flex-wrap gap-2">
                {anomaly.affected_events.map((event, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {event}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export function TemporalResults({ result }: TemporalResultsProps) {
  const [view, setView] = useState<'timeline' | 'gaps' | 'anomalies'>('timeline')

  // Sort events by date - must be before early return
  const sortedEvents = useMemo(() => {
    if (!result.success || !result.analysis) return []
    return [...result.analysis.events].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }, [result])

  // Get anomaly event IDs for highlighting - must be before early return
  const anomalyEventIds = useMemo(() => {
    if (!result.success || !result.analysis) return new Set<string>()
    return new Set(result.analysis.anomalies.flatMap(a => a.affected_events))
  }, [result])

  if (!result.success || !result.analysis) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <Clock className="h-12 w-12 text-charcoal-500" />
        <p className="text-charcoal-400">{result.error || 'No temporal analysis available'}</p>
      </div>
    )
  }

  const { events, gaps, anomalies, summary, is_mock } = result.analysis

  return (
    <div className="space-y-6 p-6">
      {/* Mock Mode Indicator */}
      {is_mock && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-900/20 px-4 py-2 text-center text-sm text-amber-400">
          Mock data - configure AI provider for live analysis
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-charcoal-400">Total Events</div>
          <div className="mt-1 font-display text-3xl text-charcoal-100">{summary.total_events}</div>
        </Card>
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-charcoal-400">Duration</div>
          <div className="mt-1 font-display text-2xl text-charcoal-100">
            {summary.total_duration_days} days
          </div>
        </Card>
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-charcoal-400">Gaps Found</div>
          <div className="mt-1 font-display text-3xl text-status-high">{summary.gaps_found}</div>
        </Card>
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-charcoal-400">Anomalies</div>
          <div className="mt-1 font-display text-3xl text-status-critical">
            {summary.anomalies_found}
          </div>
        </Card>
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-4 md:col-span-2">
          <div className="text-xs uppercase tracking-wide text-charcoal-400">Date Range</div>
          <div className="mt-1 text-sm text-charcoal-200">
            {new Date(summary.date_range_start).toLocaleDateString()} -{' '}
            {new Date(summary.date_range_end).toLocaleDateString()}
          </div>
        </Card>
      </div>

      {/* Activity Periods */}
      <Card className="border-charcoal-700 bg-charcoal-800/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4 text-bronze-500" />
            Activity Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 text-xs">
          <div>
            <span className="text-charcoal-400">Most Active: </span>
            {summary.most_active_periods.map((period, idx) => (
              <Badge key={idx} variant="outline" className="ml-1">
                {period}
              </Badge>
            ))}
          </div>
          <div>
            <span className="text-charcoal-400">Quietest: </span>
            {summary.quietest_periods.map((period, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="ml-1 border-charcoal-600 text-charcoal-500"
              >
                {period}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-charcoal-700 pb-2">
        <button
          onClick={() => setView('timeline')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors',
            view === 'timeline'
              ? 'bg-bronze-600/20 text-bronze-500'
              : 'text-charcoal-400 hover:text-charcoal-200'
          )}
        >
          <Calendar className="h-4 w-4" />
          Timeline ({events.length})
        </button>
        <button
          onClick={() => setView('gaps')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors',
            view === 'gaps'
              ? 'bg-status-high/20 text-status-high'
              : 'text-charcoal-400 hover:text-charcoal-200'
          )}
        >
          <Hourglass className="h-4 w-4" />
          Gaps ({gaps.length})
        </button>
        <button
          onClick={() => setView('anomalies')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors',
            view === 'anomalies'
              ? 'bg-status-critical/20 text-status-critical'
              : 'text-charcoal-400 hover:text-charcoal-200'
          )}
        >
          <AlertTriangle className="h-4 w-4" />
          Anomalies ({anomalies.length})
        </button>
      </div>

      {/* Content */}
      {view === 'timeline' && (
        <div className="relative space-y-4 py-4 pl-8">
          {/* Vertical timeline line */}
          <div className="absolute bottom-2 left-3 top-2 w-px bg-gradient-to-b from-charcoal-700 via-bronze-500/50 to-charcoal-700" />

          {sortedEvents.length === 0 ? (
            <div className="py-12 text-center text-charcoal-500">No timeline events</div>
          ) : (
            sortedEvents.map((event, idx) => (
              <TimelineEventCard
                key={event.id}
                event={event}
                isAnomaly={anomalyEventIds.has(event.id)}
              />
            ))
          )}
        </div>
      )}

      {view === 'gaps' && (
        <div className="space-y-3">
          {gaps.length === 0 ? (
            <div className="py-12 text-center text-charcoal-500">No significant gaps detected</div>
          ) : (
            gaps.map(gap => <GapCard key={gap.id} gap={gap} />)
          )}
        </div>
      )}

      {view === 'anomalies' && (
        <div className="space-y-3">
          {anomalies.length === 0 ? (
            <div className="py-12 text-center text-charcoal-500">No anomalies detected</div>
          ) : (
            anomalies.map(anomaly => <AnomalyCard key={anomaly.id} anomaly={anomaly} />)
          )}
        </div>
      )}

      {/* Duration */}
      <div className="text-right text-xs text-charcoal-500">
        Analysis completed in {result.duration_ms}ms
      </div>
    </div>
  )
}
