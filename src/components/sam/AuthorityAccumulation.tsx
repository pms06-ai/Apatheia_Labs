'use client'

/**
 * AuthorityAccumulation Component
 *
 * Visualizes COMPOUND phase results showing how claims accumulate
 * authority through endorsements and repetition.
 */

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Scale, Building2, Briefcase, GraduationCap, AlertTriangle, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AuthorityMarker, AuthorityType, EndorsementType } from '@/CONTRACT'

// ============================================
// Types
// ============================================

interface AuthorityAccumulationProps {
  markers: AuthorityMarker[]
  laundering?: AuthorityMarker[]
  cumulativeScores?: Record<string, number>
  onMarkerClick?: (marker: AuthorityMarker) => void
  className?: string
}

type FilterType = 'all' | 'laundering' | 'high_weight'

// ============================================
// Constants
// ============================================

const AUTHORITY_TYPE_CONFIG: Record<
  AuthorityType,
  { Icon: typeof Scale; color: string; label: string }
> = {
  court_finding: { Icon: Scale, color: 'bronze-500', label: 'Court Finding' },
  expert_opinion: { Icon: GraduationCap, color: 'status-success', label: 'Expert Opinion' },
  official_report: { Icon: Briefcase, color: 'charcoal-300', label: 'Official Report' },
  professional_assessment: { Icon: Building2, color: 'bronze-400', label: 'Professional' },
  police_conclusion: { Icon: Building2, color: 'charcoal-400', label: 'Police' },
  agency_determination: { Icon: Building2, color: 'charcoal-400', label: 'Agency' },
}

const ENDORSEMENT_LABELS: Record<EndorsementType, { label: string; color: string }> = {
  explicit_adoption: { label: 'Explicit', color: 'status-success' },
  implicit_reliance: { label: 'Implicit', color: 'bronze-400' },
  qualified_acceptance: { label: 'Qualified', color: 'status-high' },
  referenced_without_verification: { label: 'Unverified Ref', color: 'status-critical' },
}

// ============================================
// Helper Functions
// ============================================

function getWeightClass(weight: number): { bar: string; text: string } {
  if (weight >= 0.8) return { bar: 'bg-status-critical', text: 'text-status-critical' }
  if (weight >= 0.6) return { bar: 'bg-status-high', text: 'text-status-high' }
  if (weight >= 0.4) return { bar: 'bg-bronze-500', text: 'text-bronze-400' }
  return { bar: 'bg-charcoal-500', text: 'text-charcoal-400' }
}

// ============================================
// Sub-Components
// ============================================

interface AuthorityBarProps {
  marker: AuthorityMarker
  isLaundering: boolean
  index: number
  onClick?: (marker: AuthorityMarker) => void
}

function AuthorityBar({ marker, isLaundering, index, onClick }: AuthorityBarProps) {
  const typeConfig = marker.authority_type ? AUTHORITY_TYPE_CONFIG[marker.authority_type] : null
  const TypeIcon = typeConfig?.Icon || Building2
  const weightStyle = getWeightClass(marker.authority_weight)
  const endorsement = marker.endorsement_type ? ENDORSEMENT_LABELS[marker.endorsement_type] : null

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className={cn(
          'group relative overflow-hidden border-charcoal-700 transition-all duration-300',
          'hover:border-bronze-500/30 hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]',
          isLaundering && 'border-status-critical/30 bg-status-critical-bg/5',
          onClick && 'cursor-pointer'
        )}
        onClick={() => onClick?.(marker)}
      >
        {/* Hover Gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bronze-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <div className="relative p-4">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                typeConfig ? `bg-${typeConfig.color}/10` : 'bg-charcoal-800'
              )}
            >
              <TypeIcon
                className={cn(
                  'h-5 w-5',
                  typeConfig ? `text-${typeConfig.color}` : 'text-charcoal-400'
                )}
              />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              {/* Type & Endorsement */}
              <div className="mb-1 flex flex-wrap items-center gap-2">
                {typeConfig && (
                  <span className={cn('text-xs font-medium', `text-${typeConfig.color}`)}>
                    {typeConfig.label}
                  </span>
                )}
                {endorsement && (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px]',
                      `bg-${endorsement.color}/10 text-${endorsement.color}`
                    )}
                  >
                    {endorsement.label}
                  </span>
                )}
                {isLaundering && (
                  <Badge variant="critical" className="text-[10px]">
                    <AlertTriangle className="mr-1 h-2.5 w-2.5" />
                    Authority Laundering
                  </Badge>
                )}
              </div>

              {/* Laundering Path (if applicable) */}
              {marker.laundering_path && (
                <p className="truncate text-sm text-charcoal-300">{marker.laundering_path}</p>
              )}

              {/* Date */}
              {marker.authority_date && (
                <span className="text-xs text-charcoal-500">
                  {new Date(marker.authority_date).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Weight Visualization */}
            <div className="flex w-24 shrink-0 flex-col items-end gap-1">
              <span className={cn('font-mono text-lg font-semibold', weightStyle.text)}>
                {Math.round(marker.authority_weight * 100)}%
              </span>
              <div className="h-2 w-full overflow-hidden rounded-full bg-charcoal-800">
                <motion.div
                  className={cn('h-full rounded-full', weightStyle.bar)}
                  initial={{ width: 0 }}
                  animate={{ width: `${marker.authority_weight * 100}%` }}
                  transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

interface CumulativeScoreCardProps {
  claimId: string
  score: number
  rank: number
}

function CumulativeScoreCard({ claimId, score, rank }: CumulativeScoreCardProps) {
  const weightStyle = getWeightClass(score / 10) // Normalize assuming max ~10

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3 transition-colors',
        rank <= 3
          ? 'border-status-critical/30 bg-status-critical-bg/10'
          : 'border-charcoal-700 bg-charcoal-800/50'
      )}
    >
      <div
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
          rank <= 3
            ? 'bg-status-critical/20 text-status-critical'
            : 'bg-charcoal-700 text-charcoal-400'
        )}
      >
        {rank}
      </div>
      <div className="min-w-0 flex-1">
        <span className="block truncate font-mono text-xs text-charcoal-400">
          {claimId.slice(0, 12)}...
        </span>
      </div>
      <div className="flex items-center gap-1">
        <TrendingUp className={cn('h-3 w-3', weightStyle.text)} />
        <span className={cn('font-mono text-sm font-semibold', weightStyle.text)}>
          {score.toFixed(1)}
        </span>
      </div>
    </div>
  )
}

// ============================================
// Main Component
// ============================================

export function AuthorityAccumulation({
  markers,
  laundering = [],
  cumulativeScores = {},
  onMarkerClick,
  className,
}: AuthorityAccumulationProps) {
  const [filter, setFilter] = useState<FilterType>('all')

  // Build laundering set
  const launderingIds = useMemo(() => new Set(laundering.map(m => m.id)), [laundering])

  // Filter
  const filtered = useMemo(() => {
    return markers.filter(m => {
      if (filter === 'all') return true
      if (filter === 'laundering') return launderingIds.has(m.id) || m.is_authority_laundering
      if (filter === 'high_weight') return m.authority_weight >= 0.6
      return true
    })
  }, [markers, filter, launderingIds])

  // Sort by weight descending
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.authority_weight - a.authority_weight),
    [filtered]
  )

  // Top cumulative scores
  const topScores = useMemo(
    () =>
      Object.entries(cumulativeScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
    [cumulativeScores]
  )

  // Counts
  const launderingCount = markers.filter(
    m => launderingIds.has(m.id) || m.is_authority_laundering
  ).length
  const highWeightCount = markers.filter(m => m.authority_weight >= 0.6).length

  return (
    <div className={cn('', className)}>
      {/* Header with Stats */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-ivory-100 text-sm font-semibold">Authority Accumulation</h3>
          <span className="text-xs text-charcoal-500">
            {sorted.length} of {markers.length}
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
          <button
            onClick={() => setFilter('high_weight')}
            className={cn(
              'flex items-center gap-1 rounded px-3 py-1.5 text-xs transition-colors',
              filter === 'high_weight'
                ? 'bg-status-high/20 text-status-high'
                : 'bg-charcoal-800 text-charcoal-400 hover:text-charcoal-300'
            )}
          >
            <TrendingUp className="h-3 w-3" />
            High Weight ({highWeightCount})
          </button>
          {launderingCount > 0 && (
            <button
              onClick={() => setFilter('laundering')}
              className={cn(
                'flex items-center gap-1 rounded px-3 py-1.5 text-xs transition-colors',
                filter === 'laundering'
                  ? 'bg-status-critical/20 text-status-critical'
                  : 'bg-charcoal-800 text-charcoal-400 hover:text-charcoal-300'
              )}
            >
              <AlertTriangle className="h-3 w-3" />
              Laundering ({launderingCount})
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Authority Markers List */}
        <div className="space-y-3 lg:col-span-2">
          {sorted.map((marker, index) => (
            <AuthorityBar
              key={marker.id}
              marker={marker}
              isLaundering={launderingIds.has(marker.id) || marker.is_authority_laundering}
              index={index}
              onClick={onMarkerClick}
            />
          ))}

          {sorted.length === 0 && (
            <div className="rounded-lg border-2 border-dashed border-charcoal-800 py-12 text-center italic text-charcoal-500">
              {filter !== 'all'
                ? `No ${filter.replace('_', ' ')} markers found.`
                : 'No authority markers found. Run COMPOUND phase to populate this view.'}
            </div>
          )}
        </div>

        {/* Cumulative Scores Sidebar */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-charcoal-400">
            <TrendingUp className="h-4 w-4" />
            <span className="uppercase tracking-wider">Top Accumulated Authority</span>
          </div>

          {topScores.length > 0 ? (
            <div className="space-y-2">
              {topScores.map(([claimId, score], index) => (
                <CumulativeScoreCard
                  key={claimId}
                  claimId={claimId}
                  score={score}
                  rank={index + 1}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-charcoal-800 py-8 text-center text-xs italic text-charcoal-500">
              No cumulative scores available.
            </div>
          )}

          {/* Summary Stats */}
          {markers.length > 0 && (
            <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
              <div className="mb-3 text-xs uppercase tracking-wider text-charcoal-400">Summary</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-charcoal-400">Total Markers</span>
                  <span className="text-ivory-100 font-mono">{markers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal-400">Avg Weight</span>
                  <span className="text-ivory-100 font-mono">
                    {(
                      (markers.reduce((sum, m) => sum + m.authority_weight, 0) / markers.length) *
                      100
                    ).toFixed(0)}
                    %
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-status-critical">Laundering</span>
                  <span className="font-mono text-status-critical">{launderingCount}</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
