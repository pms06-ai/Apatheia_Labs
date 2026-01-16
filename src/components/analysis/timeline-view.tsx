import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Calendar, FileText } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TimelineEvent {
  id: string
  date: string
  title: string
  description?: string
  documentName?: string
  type: 'strengthened' | 'weakened' | 'unchanged' | 'first' | 'anomaly'
  severity?: 'critical' | 'high' | 'medium' | 'low'
}

interface TimelineViewProps {
  events: TimelineEvent[]
}

/**
 * Timeline view for narrative/temporal findings
 * Memoized to prevent re-renders when events haven't changed
 */
export const TimelineView = memo(function TimelineView({ events }: TimelineViewProps) {
  // Memoize sorted events to avoid re-sorting on every render
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [events]
  )

  return (
    <div className="relative space-y-8 py-4 pl-8">
      {/* Continuous Gradient Line */}
      <div className="absolute bottom-2 left-3 top-2 w-px bg-gradient-to-b from-charcoal-700 via-bronze-500/50 to-charcoal-700" />

      {sortedEvents.map((event, index) => {
        const isCritical = event.severity === 'critical'
        const isStrengthened = event.type === 'strengthened'

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            {/* Connector Node with Glow Effect */}
            <div
              className={`absolute -left-[29px] top-4 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-bg-tertiary ${
                isCritical
                  ? 'border-status-critical shadow-[0_0_15px_rgba(201,74,74,0.4)]'
                  : event.severity === 'high'
                    ? 'border-status-high'
                    : isStrengthened
                      ? 'border-bronze-500 shadow-[0_0_10px_rgba(184,134,11,0.3)]'
                      : 'border-charcoal-600'
              } `}
            >
              {/* Inner Dot */}
              <div
                className={`h-2 w-2 rounded-full ${
                  isCritical
                    ? 'animate-pulse bg-status-critical'
                    : event.severity === 'high'
                      ? 'bg-status-high'
                      : isStrengthened
                        ? 'bg-bronze-500'
                        : 'bg-charcoal-400'
                }`}
              />
            </div>

            <Card
              className={`group relative overflow-hidden border-charcoal-700 transition-all duration-300 hover:border-bronze-500/30 hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] ${isCritical ? 'border-status-critical/30 bg-status-critical-bg/5' : 'bg-bg-elevated/40'} `}
            >
              {/* Hover Gradient Overlay */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bronze-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              <div className="relative flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
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
                    </div>
                    {event.documentName && (
                      <span className="flex items-center gap-1 text-xs text-charcoal-400">
                        <FileText className="h-3 w-3" />
                        {event.documentName}
                      </span>
                    )}
                  </div>

                  <h4
                    className={`font-display text-lg ${isCritical ? 'text-status-critical' : 'text-charcoal-100'}`}
                  >
                    {event.title}
                  </h4>

                  {event.description && (
                    <p className="max-w-2xl font-sans text-sm leading-relaxed text-charcoal-300">
                      {event.description}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end">
                  {event.severity && (
                    <Badge variant={event.severity} className="shadow-lg">
                      {event.severity}
                    </Badge>
                  )}

                  {event.type !== 'unchanged' && event.type !== 'first' && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                        event.type === 'strengthened'
                          ? 'bg-bronze-500/10 text-bronze-500'
                          : event.type === 'weakened'
                            ? 'bg-charcoal-700 text-charcoal-400'
                            : 'bg-charcoal-800 text-charcoal-500'
                      }`}
                    >
                      {event.type}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )
      })}

      {sortedEvents.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-charcoal-800 py-12 text-center italic text-charcoal-500">
          No timeline events generated yet. Run the narrative engine to populate this view.
        </div>
      )}
    </div>
  )
})
TimelineView.displayName = 'TimelineView'
