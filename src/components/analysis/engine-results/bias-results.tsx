'use client'

import { useMemo } from 'react'
import { AlertTriangle, BarChart3, TrendingUp, Scale, FileText, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type {
  BiasEngineResult,
  NativeBiasFinding,
  FramingRatio,
  NativeSeverity,
  BiasDetectionDirection,
  BiasStatistics,
} from '@/CONTRACT'
import { cn } from '@/lib/utils'

interface BiasResultsProps {
  result: BiasEngineResult
}

const severityVariant: Record<NativeSeverity, 'critical' | 'high' | 'medium' | 'low'> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
}

const directionColors: Record<BiasDetectionDirection, string> = {
  prosecution_favoring: 'text-status-critical',
  defense_favoring: 'text-status-success',
  institution_favoring: 'text-status-high',
  individual_favoring: 'text-status-info',
  unclear: 'text-charcoal-400',
}

const directionLabels: Record<BiasDetectionDirection, string> = {
  prosecution_favoring: 'Prosecution Favoring',
  defense_favoring: 'Defense Favoring',
  institution_favoring: 'Institution Favoring',
  individual_favoring: 'Individual Favoring',
  unclear: 'Direction Unclear',
}

function FramingRatioGauge({ ratio }: { ratio: FramingRatio }) {
  // Calculate visual representation
  const total = ratio.party_a_count + ratio.party_b_count
  const aPercent = total > 0 ? (ratio.party_a_count / total) * 100 : 50
  const bPercent = total > 0 ? (ratio.party_b_count / total) * 100 : 50

  return (
    <Card className="border-charcoal-700 bg-charcoal-800/50">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-charcoal-200">{ratio.metric}</span>
          <span
            className={cn(
              'font-mono text-lg font-bold',
              ratio.is_significant ? 'text-status-critical' : 'text-charcoal-300'
            )}
          >
            {ratio.ratio_display}
          </span>
        </div>

        {/* Visual Gauge */}
        <div className="relative mb-3">
          <div className="flex h-8 overflow-hidden rounded-lg bg-charcoal-700">
            <div
              className="flex items-center justify-center bg-status-critical/80 transition-all duration-500"
              style={{ width: `${aPercent}%` }}
            >
              <span className="text-xs font-bold text-white">{ratio.party_a_count}</span>
            </div>
            <div
              className="flex items-center justify-center bg-status-success/80 transition-all duration-500"
              style={{ width: `${bPercent}%` }}
            >
              <span className="text-xs font-bold text-white">{ratio.party_b_count}</span>
            </div>
          </div>
          {/* Center line indicator */}
          <div className="absolute inset-y-0 left-1/2 w-0.5 bg-charcoal-500" />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-status-critical">{ratio.party_a_label}</span>
          <span className="text-status-success">{ratio.party_b_label}</span>
        </div>

        {/* Statistical Significance */}
        {(ratio.z_score != null || ratio.p_value != null) && (
          <div className="mt-3 flex items-center justify-center gap-4 border-t border-charcoal-700/50 pt-3 text-xs">
            {ratio.z_score != null && (
              <span className="font-mono text-charcoal-400">
                z ={' '}
                <span className={ratio.is_significant ? 'text-bronze-500' : ''}>
                  {ratio.z_score.toFixed(2)}
                </span>
              </span>
            )}
            {ratio.p_value != null && (
              <span className="font-mono text-charcoal-400">
                p ={' '}
                <span className={ratio.is_significant ? 'text-bronze-500' : ''}>
                  {ratio.p_value.toExponential(2)}
                </span>
              </span>
            )}
            {ratio.is_significant && (
              <Badge variant="critical" className="text-[10px]">
                Significant
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BiasStatisticsChart({ stats }: { stats: BiasStatistics }) {
  if (!stats) return null

  const total = stats.total_items_analyzed
  const prosecutionPercent = total > 0 ? (stats.items_favoring_prosecution / total) * 100 : 0
  const defensePercent = total > 0 ? (stats.items_favoring_defense / total) * 100 : 0
  const neutralPercent = total > 0 ? (stats.items_neutral / total) * 100 : 0

  return (
    <Card className="border-charcoal-700 bg-charcoal-800/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BarChart3 className="h-4 w-4 text-bronze-500" />
          Distribution Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stacked Bar */}
        <div className="flex h-12 overflow-hidden rounded-lg bg-charcoal-700">
          <div
            className="flex items-center justify-center bg-status-critical/80 transition-all"
            style={{ width: `${prosecutionPercent}%` }}
            title={`Prosecution: ${stats.items_favoring_prosecution}`}
          >
            {prosecutionPercent > 10 && (
              <span className="text-xs font-bold text-white">
                {stats.items_favoring_prosecution}
              </span>
            )}
          </div>
          <div
            className="flex items-center justify-center bg-charcoal-500 transition-all"
            style={{ width: `${neutralPercent}%` }}
            title={`Neutral: ${stats.items_neutral}`}
          >
            {neutralPercent > 10 && (
              <span className="text-xs font-bold text-white">{stats.items_neutral}</span>
            )}
          </div>
          <div
            className="flex items-center justify-center bg-status-success/80 transition-all"
            style={{ width: `${defensePercent}%` }}
            title={`Defense: ${stats.items_favoring_defense}`}
          >
            {defensePercent > 10 && (
              <span className="text-xs font-bold text-white">{stats.items_favoring_defense}</span>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-status-critical" />
            Prosecution ({stats.items_favoring_prosecution})
          </span>
          <span className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-charcoal-500" />
            Neutral ({stats.items_neutral})
          </span>
          <span className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-status-success" />
            Defense ({stats.items_favoring_defense})
          </span>
        </div>

        {/* Overall Score */}
        <div className="flex items-center justify-between border-t border-charcoal-700/50 pt-3">
          <span className="text-sm text-charcoal-400">Overall Bias Score</span>
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-charcoal-700">
              <div
                className={cn(
                  'h-full transition-all',
                  stats.overall_bias_score > 0 ? 'bg-status-critical' : 'bg-status-success'
                )}
                style={{
                  width: `${Math.abs(stats.overall_bias_score) * 50 + 50}%`,
                  marginLeft: stats.overall_bias_score < 0 ? 'auto' : 0,
                }}
              />
            </div>
            <span
              className={cn(
                'font-mono text-sm font-bold',
                stats.overall_bias_score > 0.3
                  ? 'text-status-critical'
                  : stats.overall_bias_score < -0.3
                    ? 'text-status-success'
                    : 'text-charcoal-300'
              )}
            >
              {stats.overall_bias_score > 0 ? '+' : ''}
              {stats.overall_bias_score.toFixed(2)}
            </span>
          </div>
        </div>

        {stats.is_statistically_significant && (
          <div className="flex items-center justify-center">
            <Badge variant="critical" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              Statistically Significant Bias Detected
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BiasFindingCard({ finding }: { finding: NativeBiasFinding }) {
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
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-bronze-500" />
              <span className="font-mono text-xs uppercase tracking-wide text-charcoal-400">
                {finding.bias_type.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('text-xs font-medium', directionColors[finding.direction])}>
                {directionLabels[finding.direction]}
              </span>
              <Badge variant={severityVariant[finding.severity]}>{finding.severity}</Badge>
            </div>
          </div>
          <p className="text-sm text-charcoal-200">{finding.description}</p>
        </div>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-charcoal-700/50 p-4">
          {/* Evidence */}
          <div className="rounded-lg border border-charcoal-700 bg-charcoal-900/50 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs text-charcoal-400">
              <FileText className="h-3 w-3" />
              <span className="truncate">{finding.document_name}</span>
              {finding.page_ref && <span className="text-bronze-500">p.{finding.page_ref}</span>}
            </div>
            <p className="text-sm italic text-charcoal-300">{finding.evidence}</p>
          </div>

          {/* Framing Ratio if present */}
          {finding.framing_ratio && <FramingRatioGauge ratio={finding.framing_ratio} />}

          {/* Regulatory Relevance */}
          {finding.regulatory_relevance && (
            <div className="rounded-lg border border-bronze-600/20 bg-bronze-900/10 p-3">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-bronze-500">
                Regulatory Relevance
              </div>
              <p className="text-sm text-charcoal-200">{finding.regulatory_relevance}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export function BiasResults({ result }: BiasResultsProps) {
  // Sort findings by severity - must be before early return
  const sortedFindings = useMemo(() => {
    if (!result.success || !result.analysis) return []
    const severityWeight: Record<NativeSeverity, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    }
    return [...result.analysis.findings].sort(
      (a, b) => severityWeight[b.severity] - severityWeight[a.severity]
    )
  }, [result])

  if (!result.success || !result.analysis) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <AlertTriangle className="h-12 w-12 text-charcoal-500" />
        <p className="text-charcoal-400">{result.error || 'No bias analysis available'}</p>
      </div>
    )
  }

  const { findings, framing_ratios, summary, is_mock } = result.analysis

  return (
    <div className="space-y-6 p-6">
      {/* Mock Mode Indicator */}
      {is_mock && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-900/20 px-4 py-2 text-center text-sm text-amber-400">
          Mock data - configure AI provider for live analysis
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-charcoal-400">Total Findings</div>
          <div className="mt-1 font-display text-3xl text-charcoal-100">
            {summary.total_findings}
          </div>
        </Card>
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-charcoal-400">Critical</div>
          <div className="mt-1 font-display text-3xl text-status-critical">
            {summary.critical_findings}
          </div>
        </Card>
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-charcoal-400">
            Regulatory Assessment
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-charcoal-200">
            {summary.regulatory_assessment}
          </p>
        </Card>
      </div>

      {/* Primary Framing Ratio */}
      {summary.primary_framing_ratio && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-medium text-charcoal-200">
            <BarChart3 className="h-4 w-4 text-bronze-500" />
            Primary Framing Ratio
          </h3>
          <FramingRatioGauge ratio={summary.primary_framing_ratio} />
        </div>
      )}

      {/* Statistics Chart */}
      {summary.statistics && <BiasStatisticsChart stats={summary.statistics} />}

      {/* All Framing Ratios */}
      {framing_ratios.length > 1 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-medium text-charcoal-200">
            <TrendingUp className="h-4 w-4 text-bronze-500" />
            All Framing Ratios ({framing_ratios.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {framing_ratios.map((ratio, idx) => (
              <FramingRatioGauge key={idx} ratio={ratio} />
            ))}
          </div>
        </div>
      )}

      {/* Ofcom Relevance */}
      {summary.ofcom_relevance && (
        <Card className="border-regulator-ofcom/30 bg-regulator-ofcom/10">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-regulator-ofcom" />
            <div>
              <div className="mb-1 text-xs font-bold uppercase tracking-wide text-regulator-ofcom">
                Ofcom Relevance
              </div>
              <p className="text-sm text-charcoal-200">{summary.ofcom_relevance}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Findings List */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-medium text-charcoal-200">
          <Scale className="h-4 w-4 text-bronze-500" />
          Bias Findings ({sortedFindings.length})
        </h3>
        <div className="space-y-3">
          {sortedFindings.map(finding => (
            <BiasFindingCard key={finding.id} finding={finding} />
          ))}
        </div>
      </div>

      {/* Duration */}
      <div className="text-right text-xs text-charcoal-500">
        Analysis completed in {result.duration_ms}ms
      </div>
    </div>
  )
}
