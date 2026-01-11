'use client'

/**
 * PropagationFlow Component
 *
 * Visualizes INHERIT phase results showing how claims propagate
 * across documents with verification status and mutation detection.
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, FileText, AlertTriangle, CheckCircle2,
  XCircle, HelpCircle, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react'
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

const PROPAGATION_TYPE_CONFIG: Record<PropagationType, { color: string; label: string; icon: string }> = {
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

function PropagationNode({ propagation, index, isExpanded, onToggle, onClick }: PropagationNodeProps) {
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
          'group relative overflow-hidden transition-all duration-300 border-charcoal-700',
          'hover:border-bronze-500/30 hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]',
          hasMutation && 'bg-status-high/5 border-status-high/30',
          !isVerified && 'bg-status-critical-bg/5 border-status-critical/30',
          onClick && 'cursor-pointer'
        )}
        onClick={() => onClick?.(propagation)}
      >
        {/* Hover Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-bronze-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <div className="relative p-5">
          {/* Flow Visualization */}
          <div className="flex items-center gap-4 mb-4">
            {/* Source */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-charcoal-400 shrink-0" />
                <span className="text-xs text-charcoal-400 uppercase tracking-wider">Source</span>
              </div>
              <p className="text-sm text-ivory-100 truncate">
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
                <span className="text-xs text-charcoal-400 block truncate">
                  {propagation.source_institution}
                </span>
              )}
            </div>

            {/* Arrow with Type */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full border-2',
                typeConfig ? `border-${typeConfig.color} bg-${typeConfig.color}/10` : 'border-charcoal-600 bg-charcoal-800'
              )}>
                <span className="text-sm font-mono">
                  {typeConfig?.icon || '→'}
                </span>
              </div>
              {typeConfig && (
                <span className={cn(
                  'text-[9px] uppercase tracking-wider',
                  `text-${typeConfig.color}`
                )}>
                  {typeConfig.label}
                </span>
              )}
            </div>

            {/* Target */}
            <div className="flex-1 min-w-0 text-right">
              <div className="flex items-center gap-2 mb-1 justify-end">
                <span className="text-xs text-charcoal-400 uppercase tracking-wider">Target</span>
                <FileText className="h-4 w-4 text-charcoal-400 shrink-0" />
              </div>
              <p className="text-sm text-ivory-100 truncate">
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
                <span className="text-xs text-charcoal-400 block truncate">
                  {propagation.target_institution}
                </span>
              )}
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {/* Verification Status */}
              <div className={cn('flex items-center gap-1', verificationColor)}>
                <VerificationIcon className="h-3.5 w-3.5" />
                <span className="text-xs">{verificationLabel}</span>
              </div>

              {/* Mutation Badge */}
              {hasMutation && propagation.mutation_type && (
                <Badge variant="high" className="text-[10px]">
                  <RefreshCw className="h-2.5 w-2.5 mr-1" />
                  {MUTATION_LABELS[propagation.mutation_type]}
                </Badge>
              )}

              {/* Boundary Crossing */}
              {crossedBoundary && (
                <Badge variant="default" className="text-[10px] bg-bronze-500/20 text-bronze-400">
                  Cross-Institutional
                </Badge>
              )}
            </div>

            {/* Verification Outcome */}
            {propagation.verification_outcome && (
              <span className="text-xs text-charcoal-400 truncate max-w-[150px]">
                {propagation.verification_outcome}
              </span>
            )}
          </div>

          {/* Expandable Text Comparison */}
          {(propagation.original_text || propagation.mutated_text) && (
            <div className="mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggle()
                }}
                className="flex items-center gap-1 text-xs text-bronze-400 hover:text-bronze-300 transition-colors"
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
                        <div className="p-3 rounded bg-charcoal-800/50 border border-charcoal-700">
                          <span className="text-[10px] text-charcoal-400 uppercase tracking-wider block mb-1">Original</span>
                          <p className="text-xs text-charcoal-300">{propagation.original_text}</p>
                        </div>
                      )}
                      {propagation.mutated_text && (
                        <div className="p-3 rounded bg-status-high/5 border border-status-high/20">
                          <span className="text-[10px] text-status-high uppercase tracking-wider block mb-1">Mutated</span>
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
  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    if (!a.source_date && !b.source_date) return 0
    if (!a.source_date) return 1
    if (!b.source_date) return -1
    return new Date(a.source_date).getTime() - new Date(b.source_date).getTime()
  }), [filtered])

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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-ivory-100">Propagation Flow</h3>
          <span className="text-xs text-charcoal-500">
            {sorted.length} of {propagations.length}
          </span>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'text-xs px-3 py-1.5 rounded transition-colors',
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
              'flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-colors',
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
              'flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-colors',
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
                'flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-colors',
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
          <div className="text-center text-charcoal-500 py-12 italic border-2 border-dashed border-charcoal-800 rounded-lg">
            {filter !== 'all'
              ? `No ${filter} propagations found.`
              : 'No propagations found. Run INHERIT phase to populate this view.'}
          </div>
        )}
      </div>
    </div>
  )
}
