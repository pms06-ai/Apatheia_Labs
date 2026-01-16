'use client'

import { useState, memo, useMemo, useCallback } from 'react'
import { ChevronRight, FileText, ExternalLink, Activity, Scale } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge, EngineBadge } from '@/components/ui/badge'
import type { Finding } from '@/CONTRACT'
import { formatDate } from '@/lib/utils'
import {
  asCoordinationEvidence,
  asOmissionEvidence,
  asContradictionEvidence,
} from '@/lib/analysis/evidence'
import { CoordinationEvidence } from './evidence/coordination-evidence'
import { OmissionEvidence } from './evidence/omission-evidence'
import { ContradictionEvidence } from './evidence/contradiction-evidence'

interface PremiumFindingCardProps {
  finding: Finding
  onSelect?: (finding: Finding) => void
}

/**
 * Premium finding card component with expandable details
 * Memoized to prevent re-renders when finding data hasn't changed
 */
export const PremiumFindingCard = memo(function PremiumFindingCard({
  finding,
  onSelect,
}: PremiumFindingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Memoize expensive evidence parsing
  const coordinationEvidence = useMemo(
    () => asCoordinationEvidence(finding.evidence),
    [finding.evidence]
  )
  const omissionEvidence = useMemo(() => asOmissionEvidence(finding.evidence), [finding.evidence])
  const contradictionEvidence = useMemo(
    () => asContradictionEvidence(finding.evidence),
    [finding.evidence]
  )

  // Memoize toggle handler
  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  // Memoize select handler
  const handleSelect = useCallback(() => {
    onSelect?.(finding)
  }, [onSelect, finding])

  const severityBorder = {
    critical: 'border-l-status-critical',
    high: 'border-l-status-high',
    medium: 'border-l-status-medium',
    low: 'border-l-status-low',
  }

  const badgeVariant =
    finding.severity === 'critical' ||
    finding.severity === 'high' ||
    finding.severity === 'medium' ||
    finding.severity === 'low'
      ? finding.severity
      : 'info'

  return (
    <div className={`group relative transition-all duration-300 ${isExpanded ? 'my-4' : 'my-2'}`}>
      <div
        className={`absolute -inset-[1px] rounded-lg bg-gradient-to-r from-bronze-600/20 via-transparent to-transparent opacity-0 blur-sm transition duration-300 group-hover:opacity-100`}
      />

      <Card
        className={`relative overflow-hidden border border-charcoal-700 bg-charcoal-800/80 backdrop-blur-sm transition-all duration-300 ${isExpanded ? 'border-bronze-600/30 bg-charcoal-800' : 'hover:border-bronze-600/30'}`}
      >
        {/* Main interactive header */}
        <div
          onClick={handleToggle}
          className={`relative flex cursor-pointer items-start gap-4 p-4 ${severityBorder[finding.severity as keyof typeof severityBorder]} border-l-4`}
        >
          {/* Expand Icon with animation */}
          <div
            className={`mt-1 text-bronze-500 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
          >
            <ChevronRight className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            {/* Top Meta Row */}
            <div className="flex items-center gap-3 font-mono text-xs text-charcoal-400">
              <span className="flex items-center gap-1.5 text-bronze-400">
                <Activity className="h-3 w-3" />
                {finding.id}
              </span>
              <span>•</span>
              <span>{formatDate(finding.created_at)}</span>
            </div>

            {/* Title & Badges */}
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <h3 className="font-display text-lg font-medium text-charcoal-100 transition-colors group-hover:text-bronze-100">
                {finding.title}
              </h3>
              <div className="flex items-center gap-2">
                <EngineBadge engine={finding.engine} />
                <Badge
                  variant={badgeVariant}
                  className="px-2 font-mono text-[10px] uppercase tracking-wider"
                >
                  {finding.severity}
                </Badge>
                {finding.confidence && (
                  <Badge
                    variant="outline"
                    className="border-charcoal-600 bg-charcoal-900/50 px-2 text-[10px]"
                  >
                    {Math.round(finding.confidence * 100)}% conf
                  </Badge>
                )}
              </div>
            </div>

            {/* Preview Description */}
            {!isExpanded && (
              <p className="line-clamp-1 font-serif text-sm italic text-charcoal-300/80 text-charcoal-400">
                {finding.description}
              </p>
            )}
          </div>
        </div>

        {/* Expanded Content Area */}
        <div
          className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
        >
          <div className="overflow-hidden">
            <div className="space-y-6 border-t border-charcoal-700/50 p-6">
              {/* Full Description */}
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-bronze-500">
                  <FileText className="h-3 w-3" /> Analysis
                </h4>
                <p className="font-serif text-lg leading-relaxed text-charcoal-200">
                  {finding.description}
                </p>
              </div>

              {/* Technical Evidence Grid */}
              {finding.evidence && (
                <div className="rounded border border-charcoal-700/50 bg-charcoal-900/50 p-4 font-mono text-xs">
                  <div className="mb-3 flex items-center justify-between border-b border-charcoal-700/50 pb-2">
                    <span className="uppercase tracking-wider text-bronze-400">
                      Evidence Payload
                    </span>
                    <span className="text-charcoal-500">
                      {finding.engine.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  {/* Coordination Evidence */}
                  {finding.engine === 'coordination' && (
                    <CoordinationEvidence evidence={coordinationEvidence} />
                  )}

                  {/* Omission Evidence */}
                  {finding.engine === 'omission' && (
                    <OmissionEvidence evidence={omissionEvidence} />
                  )}

                  {/* Contradiction Evidence */}
                  {finding.engine === 'contradiction' && (
                    <ContradictionEvidence evidence={contradictionEvidence} />
                  )}

                  {/* Fallback JSON for other engines or if structure is mismatch */}
                  {!['coordination', 'omission', 'contradiction'].includes(finding.engine) && (
                    <pre className="mt-2 overflow-x-auto text-charcoal-300">
                      {JSON.stringify(finding.evidence, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              {/* Footer Actions & Tags */}
              <div className="flex items-center justify-between border-t border-charcoal-700/50 pt-4">
                <div className="flex flex-wrap gap-2">
                  {finding.regulatory_targets?.map(target => (
                    <span
                      key={target}
                      className="flex items-center gap-1.5 rounded border border-charcoal-600 bg-charcoal-700/50 px-2 py-1 text-xs text-charcoal-300"
                    >
                      <Scale className="h-3 w-3 text-bronze-500" />
                      {target}
                    </span>
                  ))}
                  {finding.document_ids?.map(doc => (
                    <span
                      key={doc}
                      className="flex items-center gap-1.5 rounded border border-charcoal-600 bg-charcoal-700/50 px-2 py-1 text-xs text-charcoal-300"
                    >
                      <FileText className="h-3 w-3 text-charcoal-400" />
                      {doc}
                    </span>
                  ))}
                </div>

                <button
                  onClick={handleSelect}
                  className="flex items-center gap-2 rounded bg-bronze-600 px-4 py-2 text-sm font-medium text-charcoal-900 transition-colors hover:bg-bronze-500"
                >
                  View Full Details <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Decorative side line for timeline effect */}
      <div className="absolute -left-3 bottom-6 top-6 hidden w-px bg-charcoal-700/50 md:block" />
      <div
        className={`absolute -left-[14px] top-8 hidden h-2 w-2 rounded-full border border-charcoal-600 bg-charcoal-900 transition-colors duration-300 md:block ${isExpanded ? 'border-bronze-500 bg-bronze-600' : ''}`}
      />
    </div>
  )
})
PremiumFindingCard.displayName = 'PremiumFindingCard'
