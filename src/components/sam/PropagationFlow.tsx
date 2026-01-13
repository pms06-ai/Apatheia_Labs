'use client'

/**
 * PropagationFlow Component
 *
 * Visualizes INHERIT phase results showing how claims propagate
 * across documents with verification status and mutation detection.
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, CheckCircle2, HelpCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ClaimPropagation, PropagationType, MutationType } from '@/CONTRACT'

// ============================================
// Types
// ============================================

interface PropagationFlowProps {
  propagations: ClaimPropagation[]
  onPropagationClick?: (prop: ClaimPropagation) => void
  className?: string
}

type FilterType = 'all' | 'unverified' | 'mutated' | 'boundary'

// ============================================
// Constants
// ============================================

const PROPAGATION_TYPE_CONFIG: Record<
  PropagationType,
  { color: string; label: string; icon: string }
> = {
  verbatim: { color: 'status-success', label: 'Verbatim', icon: '=' },
  paraphrase: { color: 'bronze-500', label: 'Paraphrase', icon: '~' },
  citation: { color: 'charcoal-400', label: 'Citation', icon: '"' },
  implicit_adoption: { color: 'status-high', label: 'Implicit', icon: '?' },
  circular_reference: { color: 'status-critical', label: 'Circular', icon: '∞' },
  authority_appeal: { color: 'bronze-400', label: 'Authority', icon: '!' },
}

const MUTATION_LABELS: Record<MutationType, string> = {
  amplification: 'Amplified',
  attenuation: 'Attenuated',
  certainty_drift: 'Certainty Drift',
  attribution_shift: 'Attribution Shift',
  scope_expansion: 'Scope Expanded',
  scope_contraction: 'Scope Contracted',
}

// ============================================
// Sub-Components
// ============================================

interface PropagationNodeProps {
  propagation: ClaimPropagation
  index: number
  isExpanded: boolean
  onToggle: () => void
  onClick?: (prop: ClaimPropagation) => void
}

function PropagationNode({
  propagation,
  index,
  isExpanded,
  onToggle,
  onClick,
}: PropagationNodeProps) {
  const typeConfig = propagation.propagation_type
    ? PROPAGATION_TYPE_CONFIG[propagation.propagation_type]
    : null
  const hasMutation = propagation.mutation_detected
  const isVerified = propagation.verification_performed
  const crossedBoundary = propagation.crossed_institutional_boundary

  // Derive verification status for display
  const VerificationIcon = isVerified ? CheckCircle2 : HelpCircle
  const verificationColor = isVerified ? 'text-status-success' : 'text-status-high'
  const verificationLabel = isVerified ? 'Verified' : 'Unverified'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Card
        className={cn(
          'group relative overflow-hidden border-charcoal-700 transition-all duration-300',
          'hover:border-bronze-500/30 hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]',
          hasMutation && 'border-status-high/30 bg-status-high/5',
          !isVerified && 'border-status-critical/30 bg-status-critical-bg/5',
          onClick && 'cursor-pointer'
        )}
        onClick={() => onClick?.(propagation)}
      >
        {/* Hover Gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bronze-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <div className="relative p-5">
          {/* Flow Visualization */}
          <div className="mb-4 flex items-center gap-4">
            {/* Source */}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-charcoal-400" />
                <span className="text-xs uppercase tracking-wider text-charcoal-400">Source</span>
              </div>
              <p className="text-ivory-100 truncate text-sm">
                {propagation.source_document_id
                  ? `Doc ${propagation.source_document_id.slice(0, 8)}...`
                  : 'Unknown Source'}
              </p>
              {propagation.source_date && (
                <span className="text-xs text-charcoal-500">
                  {new Date(propagation.source_date).toLocaleDateString()}
                </span>
              )}
              {propagation.source_institution && (
                <span className="block truncate text-xs text-charcoal-400">
                  {propagation.source_institution}
                </span>
              )}
            </div>

            {/* Arrow with Type */}
            <div className="flex shrink-0 flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2',
                  typeConfig
                    ? `border-${typeConfig.color} bg-${typeConfig.color}/10`
                    : 'border-charcoal-600 bg-charcoal-800'
                )}
              >
                <span className="font-mono text-sm">{typeConfig?.icon || '→'}</span>
              </div>
              {typeConfig && (
                <span
                  className={cn('text-[9px] uppercase tracking-wider', `text-${typeConfig.color}`)}
                >
                  {typeConfig.label}
                </span>
              )}
            </div>

            {/* Target */}
            <div className="min-w-0 flex-1 text-right">
              <div className="mb-1 flex items-center justify-end gap-2">
                <span className="text-xs uppercase tracking-wider text-charcoal-400">Target</span>
                <FileText className="h-4 w-4 shrink-0 text-charcoal-400" />
              </div>
              <p className="text-ivory-100 truncate text-sm">
                {propagation.target_document_id
                  ? `Doc ${propagation.target_document_id.slice(0, 8)}...`
                  : 'Unknown Target'}
              </p>
              {propagation.target_date && (
                <span className="text-xs text-charcoal-500">
                  {new Date(propagation.target_date).toLocaleDateString()}
                </span>
              )}
              {propagation.target_institution && (
                <span className="block truncate text-xs text-charcoal-400">
                  {propagation.target_institution}
                </span>
              )}
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Verification Status */}
              <div className={cn('flex items-center gap-1', verificationColor)}>
                <VerificationIcon className="h-3.5 w-3.5" />
                <span className="text-xs">{verificationLabel}</span>
              </div>

              {/* Mutation Badge */}
              {hasMutation && propagation.mutation_type && (
                <Badge variant="high" className="text-[10px]">
                  <RefreshCw className="mr-1 h-2.5 w-2.5" />
                  {MUTATION_LABELS[propagation.mutation_type]}
                </Badge>
              )}

              {/* Boundary Crossing */}
              {crossedBoundary && (
                <Badge variant="default" className="bg-bronze-500/20 text-[10px] text-bronze-400">
                  Cross-Institutional
                </Badge>
              )}
            </div>

            {/* Verification Outcome */}
            {propagation.verification_outcome && (
              <span className="max-w-[150px] truncate text-xs text-charcoal-400">
                {propagation.verification_outcome}
              </span>
            )}
          </div>

          {/* Expandable Text Comparison */}
          {(propagation.original_text || propagation.mutated_text) && (
            <div className="mt-3">
              <button
                onClick={e => {
                  e.stopPropagation()
                  onToggle()
                }}
                className="flex items-center gap-1 text-xs text-bronze-400 transition-colors hover:text-bronze-300"
              >
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                View Text Comparison
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-2">
                      {propagation.original_text && (
                        <div className="rounded border border-charcoal-700 bg-charcoal-800/50 p-3">
                          <span className="mb-1 block text-[10px] uppercase tracking-wider text-charcoal-400">
                            Original
                          </span>
                          <p className="text-xs text-charcoal-300">{propagation.original_text}</p>
                        </div>
                      )}
                      {propagation.mutated_text && (
                        <div className="rounded border border-status-high/20 bg-status-high/5 p-3">
                          <span className="mb-1 block text-[10px] uppercase tracking-wider text-status-high">
                            Mutated
                          </span>
                          <p className="text-xs text-charcoal-300">{propagation.mutated_text}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

// ============================================
// Main Component
// ============================================

export function PropagationFlow({
  propagations,
  onPropagationClick,
  className,
}: PropagationFlowProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Filter
  const filtered = useMemo(() => {
    return propagations.filter(p => {
      if (filter === 'all') return true
      if (filter === 'unverified') return !p.verification_performed
      if (filter === 'mutated') return p.mutation_detected
      if (filter === 'boundary') return p.crossed_institutional_boundary
      return true
    })
  }, [propagations, filter])

  // Sort by date
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (!a.source_date && !b.source_date) return 0
        if (!a.source_date) return 1
        if (!b.source_date) return -1
        return new Date(a.source_date).getTime() - new Date(b.source_date).getTime()
      }),
    [filtered]
  )

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Counts
  const unverifiedCount = propagations.filter(p => !p.verification_performed).length
  const mutatedCount = propagations.filter(p => p.mutation_detected).length
  const boundaryCount = propagations.filter(p => p.crossed_institutional_boundary).length

  return (
    <div className={cn('', className)}>
      {/* Header with Stats & Filter */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-ivory-100 text-sm font-semibold">Propagation Flow</h3>
          <span className="text-xs text-charcoal-500">
            {sorted.length} of {propagations.length}
          </span>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'rounded px-3 py-1.5 text-xs transition-colors',
              filter === 'all'
                ? 'bg-bronze-500/20 text-bronze-400'
                : 'bg-charcoal-800 text-charcoal-400 hover:text-charcoal-300'
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unverified')}
            className={cn(
              'flex items-center gap-1 rounded px-3 py-1.5 text-xs transition-colors',
              filter === 'unverified'
                ? 'bg-status-high/20 text-status-high'
                : 'bg-charcoal-800 text-charcoal-400 hover:text-charcoal-300'
            )}
          >
            <HelpCircle className="h-3 w-3" />
            Unverified ({unverifiedCount})
          </button>
          <button
            onClick={() => setFilter('mutated')}
            className={cn(
              'flex items-center gap-1 rounded px-3 py-1.5 text-xs transition-colors',
              filter === 'mutated'
                ? 'bg-status-critical/20 text-status-critical'
                : 'bg-charcoal-800 text-charcoal-400 hover:text-charcoal-300'
            )}
          >
            <RefreshCw className="h-3 w-3" />
            Mutated ({mutatedCount})
          </button>
          {boundaryCount > 0 && (
            <button
              onClick={() => setFilter('boundary')}
              className={cn(
                'flex items-center gap-1 rounded px-3 py-1.5 text-xs transition-colors',
                filter === 'boundary'
                  ? 'bg-bronze-500/20 text-bronze-400'
                  : 'bg-charcoal-800 text-charcoal-400 hover:text-charcoal-300'
              )}
            >
              Cross-Institution ({boundaryCount})
            </button>
          )}
        </div>
      </div>

      {/* Propagation List */}
      <div className="space-y-4">
        {sorted.map((propagation, index) => (
          <PropagationNode
            key={propagation.id}
            propagation={propagation}
            index={index}
            isExpanded={expandedIds.has(propagation.id)}
            onToggle={() => toggleExpanded(propagation.id)}
            onClick={onPropagationClick}
          />
        ))}

        {sorted.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-charcoal-800 py-12 text-center italic text-charcoal-500">
            {filter !== 'all'
              ? `No ${filter} propagations found.`
              : 'No propagations found. Run INHERIT phase to populate this view.'}
          </div>
        )}
      </div>
    </div>
  )
}
