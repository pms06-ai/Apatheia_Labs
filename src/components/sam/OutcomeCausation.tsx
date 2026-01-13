'use client'

/**
 * OutcomeCausation Component
 *
 * Visualizes ARRIVE phase results showing how outcomes trace back
 * to root claims through causation chains.
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Link2,
  AlertOctagon,
  CircleSlash,
  Undo2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SAMOutcome, OutcomeType, HarmLevel } from '@/CONTRACT'

// ============================================
// Types
// ============================================

interface CausationChain {
  outcome_id: string
  root_claims: string[]
  propagation_path: string[]
  authority_accumulation: number
}

interface OutcomeCausationProps {
  outcomes: SAMOutcome[]
  chains?: CausationChain[]
  onOutcomeClick?: (outcome: SAMOutcome) => void
  className?: string
}

type FilterType = 'all' | 'catastrophic' | 'severe' | 'irreversible'

// ============================================
// Constants
// ============================================

const OUTCOME_TYPE_CONFIG: Record<OutcomeType, { icon: string; label: string; color: string }> = {
  court_order: { icon: '???', label: 'Court Order', color: 'bronze-500' },
  finding_of_fact: { icon: '???', label: 'Finding of Fact', color: 'charcoal-300' },
  recommendation: { icon: '???', label: 'Recommendation', color: 'charcoal-400' },
  agency_decision: { icon: '???', label: 'Agency Decision', color: 'bronze-400' },
  regulatory_action: { icon: '!', label: 'Regulatory Action', color: 'status-high' },
  media_publication: { icon: '???', label: 'Media Publication', color: 'charcoal-400' },
}

const HARM_LEVEL_CONFIG: Record<
  HarmLevel,
  { Icon: typeof AlertOctagon; color: string; label: string; bgClass: string }
> = {
  catastrophic: {
    Icon: AlertOctagon,
    color: 'status-critical',
    label: 'Catastrophic',
    bgClass: 'bg-status-critical-bg/10 border-status-critical/40',
  },
  severe: {
    Icon: AlertTriangle,
    color: 'status-critical',
    label: 'Severe',
    bgClass: 'bg-status-critical-bg/5 border-status-critical/30',
  },
  moderate: {
    Icon: AlertTriangle,
    color: 'status-high',
    label: 'Moderate',
    bgClass: 'bg-status-high/5 border-status-high/30',
  },
  minor: {
    Icon: AlertTriangle,
    color: 'bronze-400',
    label: 'Minor',
    bgClass: 'border-charcoal-700',
  },
}

// Remediation is a boolean - true means reversible, false means irreversible
function getRemediationDisplay(possible: boolean) {
  if (possible) {
    return { Icon: Undo2, label: 'Reversible', color: 'status-success' }
  }
  return { Icon: CircleSlash, label: 'Irreversible', color: 'status-critical' }
}

// ============================================
// Sub-Components
// ============================================

interface OutcomeCardProps {
  outcome: SAMOutcome
  chain?: CausationChain
  index: number
  isExpanded: boolean
  onToggle: () => void
  onClick?: (outcome: SAMOutcome) => void
}

function OutcomeCard({ outcome, chain, index, isExpanded, onToggle, onClick }: OutcomeCardProps) {
  const harmConfig = outcome.harm_level ? HARM_LEVEL_CONFIG[outcome.harm_level] : null
  const HarmIcon = harmConfig?.Icon || AlertTriangle
  const outcomeConfig = outcome.outcome_type ? OUTCOME_TYPE_CONFIG[outcome.outcome_type] : null
  const remediation = getRemediationDisplay(outcome.remediation_possible)
  const RemediationIcon = remediation.Icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Card
        className={cn(
          'group relative overflow-hidden transition-all duration-300',
          harmConfig?.bgClass || 'border-charcoal-700',
          'hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]',
          onClick && 'cursor-pointer'
        )}
        onClick={() => onClick?.(outcome)}
      >
        {/* Severity Indicator Bar */}
        {harmConfig && (
          <div className={cn('absolute bottom-0 left-0 top-0 w-1', `bg-${harmConfig.color}`)} />
        )}

        <div className="relative p-5 pl-6">
          {/* Header Row */}
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Harm Level Icon */}
              {harmConfig && (
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                    `bg-${harmConfig.color}/10`
                  )}
                >
                  <HarmIcon className={cn('h-5 w-5', `text-${harmConfig.color}`)} />
                </div>
              )}

              <div>
                {/* Outcome Type */}
                {outcomeConfig && (
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={cn(
                        'text-xs font-medium uppercase tracking-wider',
                        `text-${outcomeConfig.color}`
                      )}
                    >
                      {outcomeConfig.label}
                    </span>
                  </div>
                )}

                {/* Date */}
                {outcome.outcome_date && (
                  <span className="text-xs text-charcoal-500">
                    {new Date(outcome.outcome_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="flex shrink-0 flex-col items-end gap-2">
              {/* Harm Level Badge */}
              {harmConfig && (
                <Badge
                  variant={
                    outcome.harm_level === 'catastrophic' || outcome.harm_level === 'severe'
                      ? 'critical'
                      : 'high'
                  }
                  className="shadow-lg"
                >
                  {harmConfig.label}
                </Badge>
              )}

              {/* Remediation Status */}
              <div className={cn('flex items-center gap-1 text-xs', `text-${remediation.color}`)}>
                <RemediationIcon className="h-3 w-3" />
                {remediation.label}
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="mb-3 text-sm text-charcoal-200">{outcome.outcome_description}</p>

          {/* Harm Description */}
          {outcome.harm_description && (
            <div className="mb-3 rounded border border-charcoal-700 bg-charcoal-800/50 p-3 text-xs text-charcoal-300">
              {outcome.harm_description}
            </div>
          )}

          {/* Causation Chain Summary */}
          {chain && chain.root_claims.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-charcoal-400">
              <Link2 className="h-3 w-3" />
              <span>
                {chain.root_claims.length} root claim{chain.root_claims.length !== 1 ? 's' : ''} via{' '}
                {chain.propagation_path.length} propagation step
                {chain.propagation_path.length !== 1 ? 's' : ''}
              </span>
              {chain.authority_accumulation > 0 && (
                <span className="text-bronze-400">
                  ({(chain.authority_accumulation * 100).toFixed(0)}% authority)
                </span>
              )}
            </div>
          )}

          {/* Expandable But-For Analysis */}
          {outcome.but_for_analysis && (
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
                But-For Analysis
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
                    <div className="mt-2 rounded border border-charcoal-700 bg-charcoal-800/50 p-3 text-xs text-charcoal-300">
                      {outcome.but_for_analysis}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Root Claims Expansion */}
          {chain && chain.root_claims.length > 0 && (
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
                View Causation Chain
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
                      <div className="text-xs uppercase tracking-wider text-charcoal-400">
                        Root Claims:
                      </div>
                      {chain.root_claims.map((claimId, i) => (
                        <div
                          key={claimId}
                          className="flex items-center gap-2 rounded border border-charcoal-700 bg-charcoal-800/50 p-2 text-xs"
                        >
                          <span className="font-mono text-bronze-400">{i + 1}.</span>
                          <span className="truncate font-mono text-charcoal-300">{claimId}</span>
                        </div>
                      ))}
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

export function OutcomeCausation({
  outcomes,
  chains = [],
  onOutcomeClick,
  className,
}: OutcomeCausationProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Build chain lookup
  const chainMap = useMemo(() => {
    const map = new Map<string, CausationChain>()
    chains.forEach(c => map.set(c.outcome_id, c))
    return map
  }, [chains])

  // Filter outcomes
  const filtered = useMemo(() => {
    return outcomes.filter(o => {
      if (filter === 'all') return true
      if (filter === 'catastrophic') return o.harm_level === 'catastrophic'
      if (filter === 'severe') return o.harm_level === 'severe' || o.harm_level === 'catastrophic'
      if (filter === 'irreversible') return !o.remediation_possible
      return true
    })
  }, [outcomes, filter])

  // Sort by harm level
  const sorted = useMemo(() => {
    const harmOrder: Record<HarmLevel, number> = {
      catastrophic: 0,
      severe: 1,
      moderate: 2,
      minor: 3,
    }
    return [...filtered].sort((a, b) => {
      const aOrder = a.harm_level ? harmOrder[a.harm_level] : 99
      const bOrder = b.harm_level ? harmOrder[b.harm_level] : 99
      return aOrder - bOrder
    })
  }, [filtered])

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Counts
  const catastrophicCount = outcomes.filter(o => o.harm_level === 'catastrophic').length
  const severeCount = outcomes.filter(
    o => o.harm_level === 'severe' || o.harm_level === 'catastrophic'
  ).length
  const irreversibleCount = outcomes.filter(o => !o.remediation_possible).length

  return (
    <div className={cn('', className)}>
      {/* Header with Stats */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-ivory-100 text-sm font-semibold">Outcome Causation</h3>
          <span className="text-xs text-charcoal-500">
            {sorted.length} of {outcomes.length}
          </span>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2">
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
          {catastrophicCount > 0 && (
            <button
              onClick={() => setFilter('catastrophic')}
              className={cn(
                'flex items-center gap-1 rounded px-3 py-1.5 text-xs transition-colors',
                filter === 'catastrophic'
                  ? 'bg-status-critical/20 text-status-critical'
                  : 'bg-charcoal-800 text-charcoal-400 hover:text-charcoal-300'
              )}
            >
              <AlertOctagon className="h-3 w-3" />
              Catastrophic ({catastrophicCount})
            </button>
          )}
          {severeCount > 0 && (
            <button
              onClick={() => setFilter('severe')}
              className={cn(
                'flex items-center gap-1 rounded px-3 py-1.5 text-xs transition-colors',
                filter === 'severe'
                  ? 'bg-status-critical/20 text-status-critical'
                  : 'bg-charcoal-800 text-charcoal-400 hover:text-charcoal-300'
              )}
            >
              <AlertTriangle className="h-3 w-3" />
              Severe+ ({severeCount})
            </button>
          )}
          {irreversibleCount > 0 && (
            <button
              onClick={() => setFilter('irreversible')}
              className={cn(
                'flex items-center gap-1 rounded px-3 py-1.5 text-xs transition-colors',
                filter === 'irreversible'
                  ? 'bg-status-critical/20 text-status-critical'
                  : 'bg-charcoal-800 text-charcoal-400 hover:text-charcoal-300'
              )}
            >
              <CircleSlash className="h-3 w-3" />
              Irreversible ({irreversibleCount})
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats Bar */}
      {outcomes.length > 0 && (
        <div className="mb-6 grid grid-cols-4 gap-3">
          <Card className="border-charcoal-700 bg-charcoal-800/50 p-3 text-center">
            <div className="text-ivory-100 font-mono text-2xl font-semibold">{outcomes.length}</div>
            <div className="text-xs text-charcoal-400">Total Outcomes</div>
          </Card>
          <Card className="border-status-critical/30 bg-status-critical-bg/10 p-3 text-center">
            <div className="font-mono text-2xl font-semibold text-status-critical">
              {catastrophicCount}
            </div>
            <div className="text-xs text-status-critical">Catastrophic</div>
          </Card>
          <Card className="border-status-high/30 bg-status-high/5 p-3 text-center">
            <div className="font-mono text-2xl font-semibold text-status-high">
              {severeCount - catastrophicCount}
            </div>
            <div className="text-xs text-status-high">Severe</div>
          </Card>
          <Card className="border-status-critical/30 bg-status-critical-bg/10 p-3 text-center">
            <div className="font-mono text-2xl font-semibold text-status-critical">
              {irreversibleCount}
            </div>
            <div className="text-xs text-status-critical">Irreversible</div>
          </Card>
        </div>
      )}

      {/* Outcomes List */}
      <div className="space-y-4">
        {sorted.map((outcome, index) => (
          <OutcomeCard
            key={outcome.id}
            outcome={outcome}
            chain={chainMap.get(outcome.id)}
            index={index}
            isExpanded={expandedIds.has(outcome.id)}
            onToggle={() => toggleExpanded(outcome.id)}
            onClick={onOutcomeClick}
          />
        ))}

        {sorted.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-charcoal-800 py-12 text-center italic text-charcoal-500">
            {filter !== 'all'
              ? `No ${filter} outcomes found.`
              : 'No outcomes identified. Run ARRIVE phase to populate this view.'}
          </div>
        )}
      </div>
    </div>
  )
}
