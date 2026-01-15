'use client'

import { useMemo, useState } from 'react'
import { AlertCircle, Scale, FileText, ChevronRight, Layers } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type {
  ContradictionEngineResult,
  NativeContradictionFinding,
  ClaimCluster,
  NativeSeverity,
} from '@/CONTRACT'
import { cn } from '@/lib/utils'

interface ContradictionResultsProps {
  result: ContradictionEngineResult
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

function ContradictionCard({ contradiction }: { contradiction: NativeContradictionFinding }) {
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
              <AlertCircle className="h-4 w-4 text-status-critical" />
              <span className="font-mono text-xs uppercase tracking-wide text-charcoal-400">
                {contradiction.type.replace('_', ' ')}
              </span>
            </div>
            <Badge variant={severityVariant[contradiction.severity]}>
              {contradiction.severity}
            </Badge>
          </div>
          <p className="text-sm text-charcoal-200">{contradiction.explanation}</p>
        </div>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-charcoal-700/50 p-4">
          {/* Claim Comparison */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-charcoal-700 bg-charcoal-900/50 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs text-charcoal-400">
                <FileText className="h-3 w-3" />
                <span className="truncate">{contradiction.claim1.document_name}</span>
                {contradiction.claim1.page_ref && (
                  <span className="text-bronze-500">p.{contradiction.claim1.page_ref}</span>
                )}
              </div>
              <p className="text-sm italic text-charcoal-200">
                &ldquo;{contradiction.claim1.text}&rdquo;
              </p>
              {contradiction.claim1.author && (
                <p className="mt-2 text-xs text-charcoal-500">
                  - {contradiction.claim1.author}
                  {contradiction.claim1.date &&
                    `, ${new Date(contradiction.claim1.date).toLocaleDateString()}`}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-charcoal-700 bg-charcoal-900/50 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs text-charcoal-400">
                <FileText className="h-3 w-3" />
                <span className="truncate">{contradiction.claim2.document_name}</span>
                {contradiction.claim2.page_ref && (
                  <span className="text-bronze-500">p.{contradiction.claim2.page_ref}</span>
                )}
              </div>
              <p className="text-sm italic text-charcoal-200">
                &ldquo;{contradiction.claim2.text}&rdquo;
              </p>
              {contradiction.claim2.author && (
                <p className="mt-2 text-xs text-charcoal-500">
                  - {contradiction.claim2.author}
                  {contradiction.claim2.date &&
                    `, ${new Date(contradiction.claim2.date).toLocaleDateString()}`}
                </p>
              )}
            </div>
          </div>

          {/* Implication */}
          <div className="rounded-lg border border-bronze-600/20 bg-bronze-900/10 p-3">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-bronze-500">
              Implication
            </div>
            <p className="text-sm text-charcoal-200">{contradiction.implication}</p>
          </div>

          {/* Suggested Resolution */}
          {contradiction.suggested_resolution && (
            <div className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-3">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-charcoal-400">
                Suggested Resolution
              </div>
              <p className="text-sm text-charcoal-300">{contradiction.suggested_resolution}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function ClaimClusterCard({ cluster }: { cluster: ClaimCluster }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card
      className={cn(
        'border-charcoal-700 bg-charcoal-800/60 transition-all',
        cluster.consensus
          ? 'border-status-success/30 hover:border-status-success/50'
          : 'border-status-high/30 hover:border-status-high/50'
      )}
    >
      <div
        className="flex cursor-pointer items-center gap-3 p-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={cn('transition-transform duration-200', expanded && 'rotate-90')}>
          <ChevronRight className="h-4 w-4 text-charcoal-400" />
        </div>
        <Layers className="h-4 w-4 text-bronze-500" />
        <span className="flex-1 text-sm font-medium text-charcoal-200">{cluster.topic}</span>
        <Badge variant={cluster.consensus ? 'success' : 'high'}>
          {cluster.consensus ? 'Consensus' : 'Disputed'}
        </Badge>
        <span className="text-xs text-charcoal-500">{cluster.claims.length} claims</span>
      </div>

      {expanded && (
        <div className="space-y-2 border-t border-charcoal-700/50 p-3">
          {cluster.claims.map((claim, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-lg bg-charcoal-900/30 p-2 text-sm"
            >
              <span
                className={cn(
                  'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                  claim.stance === 'supports' && 'bg-status-success/20 text-status-success',
                  claim.stance === 'opposes' && 'bg-status-critical/20 text-status-critical',
                  claim.stance === 'neutral' && 'bg-charcoal-700 text-charcoal-400'
                )}
              >
                {claim.stance === 'supports' ? '+' : claim.stance === 'opposes' ? '-' : '~'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-charcoal-300">&ldquo;{claim.text}&rdquo;</p>
                <p className="mt-1 text-xs text-charcoal-500">{claim.doc_id}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function SimilarityHeatmap({ clusters }: { clusters: ClaimCluster[] }) {
  // Build a simple heatmap showing cluster contention levels
  const heatmapData = useMemo(() => {
    return clusters.map(cluster => {
      const supports = cluster.claims.filter(c => c.stance === 'supports').length
      const opposes = cluster.claims.filter(c => c.stance === 'opposes').length
      const total = cluster.claims.length
      const contention = total > 0 ? opposes / total : 0
      return {
        topic: cluster.topic,
        contention,
        supports,
        opposes,
        total,
        consensus: cluster.consensus,
      }
    })
  }, [clusters])

  if (heatmapData.length === 0) {
    return null
  }

  return (
    <Card className="border-charcoal-700 bg-charcoal-800/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Scale className="h-4 w-4 text-bronze-500" />
          Topic Contention Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {heatmapData.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="w-32 truncate text-xs text-charcoal-400" title={item.topic}>
                {item.topic}
              </span>
              <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-charcoal-700">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-status-success to-status-success/80"
                  style={{
                    width: `${((item.total - item.opposes) / Math.max(item.total, 1)) * 100}%`,
                  }}
                />
                <div
                  className="absolute inset-y-0 right-0 bg-gradient-to-l from-status-critical to-status-critical/80"
                  style={{ width: `${(item.opposes / Math.max(item.total, 1)) * 100}%` }}
                />
              </div>
              <span className="w-16 text-right text-xs text-charcoal-500">
                {item.supports}/{item.opposes}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-charcoal-500">
          <span className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-status-success" /> Supporting
          </span>
          <span className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-status-critical" /> Opposing
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export function ContradictionResults({ result }: ContradictionResultsProps) {
  // Sort contradictions by severity - must be before early return
  const sortedContradictions = useMemo(() => {
    if (!result.success || !result.analysis) return []
    return [...result.analysis.contradictions].sort(
      (a, b) => severityWeight[b.severity] - severityWeight[a.severity]
    )
  }, [result])

  if (!result.success || !result.analysis) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <AlertCircle className="h-12 w-12 text-charcoal-500" />
        <p className="text-charcoal-400">{result.error || 'No contradiction analysis available'}</p>
      </div>
    )
  }

  const { contradictions, claim_clusters, summary, is_mock } = result.analysis

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
          <div className="text-xs uppercase tracking-wide text-charcoal-400">
            Total Contradictions
          </div>
          <div className="mt-1 font-display text-3xl text-charcoal-100">
            {summary.total_contradictions}
          </div>
        </Card>
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-charcoal-400">Critical</div>
          <div className="mt-1 font-display text-3xl text-status-critical">
            {summary.critical_count}
          </div>
        </Card>
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-charcoal-400">
            Most Contradicted Topics
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {summary.most_contradicted_topics.slice(0, 3).map(topic => (
              <Badge key={topic} variant="outline" className="text-xs">
                {topic}
              </Badge>
            ))}
          </div>
        </Card>
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-charcoal-400">
            Credibility Impact
          </div>
          <div
            className={cn(
              'mt-1 font-display text-xl uppercase',
              summary.credibility_impact === 'severe' && 'text-status-critical',
              summary.credibility_impact === 'moderate' && 'text-status-high',
              summary.credibility_impact === 'minor' && 'text-charcoal-300',
              summary.credibility_impact === 'none' && 'text-status-success'
            )}
          >
            {summary.credibility_impact}
          </div>
        </Card>
      </div>

      {/* Claim Clusters Heatmap */}
      {claim_clusters.length > 0 && <SimilarityHeatmap clusters={claim_clusters} />}

      {/* Claim Clusters */}
      {claim_clusters.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-medium text-charcoal-200">
            <Layers className="h-4 w-4 text-bronze-500" />
            Claim Clusters ({claim_clusters.length})
          </h3>
          <div className="space-y-2">
            {claim_clusters.map((cluster, idx) => (
              <ClaimClusterCard key={idx} cluster={cluster} />
            ))}
          </div>
        </div>
      )}

      {/* Contradictions List */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-medium text-charcoal-200">
          <AlertCircle className="h-4 w-4 text-status-critical" />
          Contradictions ({sortedContradictions.length})
        </h3>
        <div className="space-y-3">
          {sortedContradictions.map(contradiction => (
            <ContradictionCard key={contradiction.id} contradiction={contradiction} />
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
