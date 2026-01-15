'use client'

import { useMemo, useState } from 'react'
import {
  EyeOff,
  FileText,
  ChevronRight,
  ArrowRight,
  Scale,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type {
  OmissionEngineResult,
  NativeOmissionFinding,
  NativeOmissionType,
  BiasDirection,
  NativeSeverity,
  BiasAnalysis,
} from '@/CONTRACT'
import { cn } from '@/lib/utils'

interface OmissionResultsProps {
  result: OmissionEngineResult
}

const severityVariant: Record<NativeSeverity, 'critical' | 'high' | 'medium' | 'low'> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
}

const severityWeight: Record<NativeSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

const biasDirectionColors: Record<BiasDirection, string> = {
  prosecution_favoring: 'text-status-critical',
  defense_favoring: 'text-status-success',
  institution_favoring: 'text-status-high',
  individual_favoring: 'text-status-info',
  neutral: 'text-charcoal-400',
}

const biasDirectionLabels: Record<BiasDirection, string> = {
  prosecution_favoring: 'Prosecution Favoring',
  defense_favoring: 'Defense Favoring',
  institution_favoring: 'Institution Favoring',
  individual_favoring: 'Individual Favoring',
  neutral: 'Neutral',
}

const biasDirectionIcons: Record<BiasDirection, string> = {
  prosecution_favoring: '+',
  defense_favoring: '-',
  institution_favoring: 'I',
  individual_favoring: 'P',
  neutral: '~',
}

const omissionTypeLabels: Record<NativeOmissionType, string> = {
  selective_quoting: 'Selective Quoting',
  complete_exclusion: 'Complete Exclusion',
  context_stripping: 'Context Stripping',
  cherry_picking: 'Cherry Picking',
  exculpatory_omission: 'Exculpatory Omission',
  procedural_omission: 'Procedural Omission',
  contradictory_omission: 'Contradictory Omission',
}

function OmissionCard({ omission }: { omission: NativeOmissionFinding }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="border-charcoal-700 bg-charcoal-800/60 transition-all hover:border-charcoal-600">
      <div
        className="flex cursor-pointer items-start gap-3 p-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={cn('mt-1 transition-transform duration-200', expanded && 'rotate-90')}>
          <ChevronRight className="h-4 w-4 text-charcoal-400" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <EyeOff className="h-4 w-4 text-status-high" />
            <span className="font-mono text-xs uppercase tracking-wide text-charcoal-400">
              {omissionTypeLabels[omission.type]}
            </span>
            <span
              className={cn(
                'flex items-center gap-1 text-xs font-medium',
                biasDirectionColors[omission.bias_direction]
              )}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-charcoal-700 text-[10px] font-bold">
                {biasDirectionIcons[omission.bias_direction]}
              </span>
              {biasDirectionLabels[omission.bias_direction]}
            </span>
            <Badge variant={severityVariant[omission.severity]}>{omission.severity}</Badge>
          </div>
          <p className="text-sm text-charcoal-200">{omission.significance}</p>
        </div>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-charcoal-700/50 p-4">
          {/* Source to Report Comparison */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Source */}
            <div className="rounded-lg border border-charcoal-700 bg-charcoal-900/50 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs text-charcoal-400">
                <FileText className="h-3 w-3" />
                <span className="font-medium text-bronze-500">Source Document</span>
              </div>
              <div className="mb-2 text-xs text-charcoal-500">
                {omission.source.document_name}
                {omission.source.page_ref && (
                  <span className="ml-1 text-bronze-500">p.{omission.source.page_ref}</span>
                )}
                {omission.source.date && (
                  <span className="ml-2">
                    {new Date(omission.source.date).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-sm italic text-charcoal-200">
                &ldquo;{omission.source.text}&rdquo;
              </p>
            </div>

            {/* Report */}
            <div className="rounded-lg border border-charcoal-700 bg-charcoal-900/50 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs text-charcoal-400">
                <FileText className="h-3 w-3" />
                <span className="font-medium text-charcoal-300">Omitting Report</span>
              </div>
              <div className="mb-2 text-xs text-charcoal-500">
                {omission.report.document_name}
                {omission.report.author && (
                  <span className="ml-2">by {omission.report.author}</span>
                )}
                {omission.report.date && (
                  <span className="ml-2">
                    {new Date(omission.report.date).toLocaleDateString()}
                  </span>
                )}
              </div>
              {omission.report.substitute_text ? (
                <p className="text-sm text-charcoal-300">
                  Substitute text:{' '}
                  <span className="italic">&ldquo;{omission.report.substitute_text}&rdquo;</span>
                </p>
              ) : (
                <p className="text-sm italic text-charcoal-500">
                  No substitute text - content simply omitted
                </p>
              )}
            </div>
          </div>

          {/* Omitted Content */}
          <div className="rounded-lg border border-status-high/30 bg-status-high-bg/10 p-3">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-status-high">
              Omitted Content
            </div>
            <p className="text-sm italic text-charcoal-200">
              &ldquo;{omission.omitted_content}&rdquo;
            </p>
          </div>

          {/* Impact */}
          <div className="rounded-lg border border-bronze-600/20 bg-bronze-900/10 p-3">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-bronze-500">
              Impact
            </div>
            <p className="text-sm text-charcoal-200">{omission.impact}</p>
          </div>
        </div>
      )}
    </Card>
  )
}

function BiasIndicator({ analysis }: { analysis: BiasAnalysis }) {
  if (!analysis) return null

  const { prosecution_favoring, defense_favoring, bias_score, is_significant, assessment } =
    analysis

  // Calculate visual representation
  const total = prosecution_favoring + defense_favoring
  const prosecutionPercent = total > 0 ? (prosecution_favoring / total) * 100 : 50
  const defensePercent = total > 0 ? (defense_favoring / total) * 100 : 50

  return (
    <Card className="border-charcoal-700 bg-charcoal-800/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Scale className="h-4 w-4 text-bronze-500" />
          Directional Bias Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visual Gauge */}
        <div>
          <div className="mb-2 flex justify-between text-xs text-charcoal-400">
            <span>Prosecution Favoring ({prosecution_favoring})</span>
            <span>Defense Favoring ({defense_favoring})</span>
          </div>
          <div className="relative h-8 overflow-hidden rounded-lg bg-charcoal-700">
            <div
              className="absolute inset-y-0 left-0 bg-status-critical/80 transition-all duration-500"
              style={{ width: `${prosecutionPercent}%` }}
            />
            <div
              className="absolute inset-y-0 right-0 bg-status-success/80 transition-all duration-500"
              style={{ width: `${defensePercent}%` }}
            />
            {/* Center marker */}
            <div className="absolute inset-y-0 left-1/2 w-0.5 bg-charcoal-300" />
          </div>
        </div>

        {/* Bias Score */}
        <div className="flex items-center justify-between rounded-lg bg-charcoal-800 p-3">
          <span className="text-sm text-charcoal-400">Bias Score</span>
          <div className="flex items-center gap-3">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-charcoal-700">
              <div
                className={cn(
                  'h-full transition-all',
                  bias_score > 0 ? 'bg-status-critical' : 'bg-status-success'
                )}
                style={{
                  width: `${Math.abs(bias_score) * 50 + 50}%`,
                  marginLeft: bias_score < 0 ? 'auto' : 0,
                }}
              />
            </div>
            <span
              className={cn(
                'font-mono text-xl font-bold',
                bias_score > 0.5
                  ? 'text-status-critical'
                  : bias_score < -0.5
                    ? 'text-status-success'
                    : 'text-charcoal-300'
              )}
            >
              {bias_score > 0 ? '+' : ''}
              {bias_score.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Significance Indicator */}
        {is_significant && (
          <div className="flex items-center justify-center">
            <Badge variant="critical" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              Statistically Significant Bias
            </Badge>
          </div>
        )}

        {/* Assessment */}
        <div className="rounded-lg border border-bronze-600/20 bg-bronze-900/10 p-3">
          <p className="text-sm text-charcoal-200">{assessment}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function OmissionResults({ result }: OmissionResultsProps) {
  const [groupBy, setGroupBy] = useState<'type' | 'direction'>('type')

  // Group omissions - must be before early return
  const groupedOmissions = useMemo(() => {
    if (!result.success || !result.analysis) return {} as Record<string, NativeOmissionFinding[]>
    const groups: Record<string, NativeOmissionFinding[]> = {}

    result.analysis.omissions.forEach(omission => {
      const key =
        groupBy === 'type'
          ? omissionTypeLabels[omission.type]
          : biasDirectionLabels[omission.bias_direction]

      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(omission)
    })

    // Sort each group by severity
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity])
    })

    return groups
  }, [result, groupBy])

  if (!result.success || !result.analysis) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <EyeOff className="h-12 w-12 text-charcoal-500" />
        <p className="text-charcoal-400">{result.error || 'No omission analysis available'}</p>
      </div>
    )
  }

  const { omissions, summary, is_mock } = result.analysis

  return (
    <div className="space-y-6 p-6">
      {/* Mock Mode Indicator */}
      {is_mock && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-900/20 px-4 py-2 text-center text-sm text-amber-400">
          Mock data - configure AI provider for live analysis
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-charcoal-400">Total Omissions</div>
          <div className="mt-1 font-display text-3xl text-charcoal-100">
            {summary.total_omissions}
          </div>
        </Card>
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-charcoal-400">Critical</div>
          <div className="mt-1 font-display text-3xl text-status-critical">
            {summary.critical_count}
          </div>
        </Card>
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-charcoal-400">Pro-Prosecution</div>
          <div className="mt-1 font-display text-3xl text-status-critical">
            {summary.bias_analysis.prosecution_favoring}
          </div>
        </Card>
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-charcoal-400">Pro-Defense</div>
          <div className="mt-1 font-display text-3xl text-status-success">
            {summary.bias_analysis.defense_favoring}
          </div>
        </Card>
      </div>

      {/* Bias Analysis */}
      <BiasIndicator analysis={summary.bias_analysis} />

      {/* Type Distribution */}
      <Card className="border-charcoal-700 bg-charcoal-800/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <EyeOff className="h-4 w-4 text-bronze-500" />
            Omission Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {summary.by_type.map(({ omission_type, count }) => (
              <Badge
                key={omission_type}
                variant="outline"
                className="gap-1 border-charcoal-600 px-3 py-1"
              >
                <span className="text-charcoal-400">{omission_type.replace(/_/g, ' ')}:</span>
                <span className="font-bold text-charcoal-200">{count}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Group By Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-charcoal-400">Group by:</span>
        <button
          onClick={() => setGroupBy('type')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm transition-colors',
            groupBy === 'type'
              ? 'bg-bronze-600/20 text-bronze-500'
              : 'text-charcoal-400 hover:text-charcoal-200'
          )}
        >
          Type
        </button>
        <button
          onClick={() => setGroupBy('direction')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm transition-colors',
            groupBy === 'direction'
              ? 'bg-bronze-600/20 text-bronze-500'
              : 'text-charcoal-400 hover:text-charcoal-200'
          )}
        >
          Direction
        </button>
      </div>

      {/* Grouped Omissions */}
      <div className="space-y-6">
        {Object.entries(groupedOmissions).map(([group, items]) => (
          <div key={group} className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-medium text-charcoal-200">
              {groupBy === 'direction' ? (
                <ArrowRight
                  className={cn(
                    'h-4 w-4',
                    group.includes('Prosecution') && 'text-status-critical',
                    group.includes('Defense') && 'text-status-success',
                    group.includes('Institution') && 'text-status-high',
                    group.includes('Individual') && 'text-status-info'
                  )}
                />
              ) : (
                <EyeOff className="h-4 w-4 text-status-high" />
              )}
              {group} ({items.length})
            </h3>
            <div className="space-y-2">
              {items.map(omission => (
                <OmissionCard key={omission.id} omission={omission} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Duration */}
      <div className="text-right text-xs text-charcoal-500">
        Analysis completed in {result.duration_ms}ms
      </div>
    </div>
  )
}
