'use client'

import { useState } from 'react'
import {
  ChevronRight,
  Link2,
  Check,
  X,
  Users,
  Building2,
  Gavel,
  User,
  AlertTriangle,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { EntityLinkageProposal } from '@/lib/engines/entity-resolution'
import {
  usePendingLinkages,
  useConfirmLinkage,
  useRejectLinkage,
} from '@/hooks/use-entity-resolution'

interface EntityLinkagePanelProps {
  caseId: string
  onLinkageUpdate?: (linkage: EntityLinkageProposal, action: 'confirmed' | 'rejected') => void
}

interface LinkageCardProps {
  linkage: EntityLinkageProposal
  onConfirm: () => void
  onReject: () => void
  isUpdating?: boolean
}

/**
 * Get the icon for an entity type based on algorithm/name patterns
 */
function getEntityIcon(name: string) {
  const lowerName = name.toLowerCase()
  if (lowerName.includes('court') || lowerName.includes('judge')) {
    return <Gavel className="h-4 w-4" />
  }
  if (
    lowerName.includes('ltd') ||
    lowerName.includes('inc') ||
    lowerName.includes('council') ||
    lowerName.includes('authority') ||
    lowerName.includes('service')
  ) {
    return <Building2 className="h-4 w-4" />
  }
  if (lowerName.includes('dr.') || lowerName.includes('sw ') || lowerName.includes('prof')) {
    return <User className="h-4 w-4" />
  }
  return <Users className="h-4 w-4" />
}

/**
 * Get confidence level styling
 */
function getConfidenceStyle(confidence: number): {
  label: string
  variant: 'success' | 'medium' | 'low'
  borderClass: string
} {
  if (confidence >= 0.8) {
    return {
      label: 'High',
      variant: 'success',
      borderClass: 'border-l-status-success',
    }
  }
  if (confidence >= 0.5) {
    return {
      label: 'Medium',
      variant: 'medium',
      borderClass: 'border-l-status-medium',
    }
  }
  return {
    label: 'Low',
    variant: 'low',
    borderClass: 'border-l-status-low',
  }
}

/**
 * Format algorithm name for display
 */
function formatAlgorithm(algorithm: string): string {
  const algorithmLabels: Record<string, string> = {
    exact: 'Exact Match',
    normalized: 'Normalized',
    levenshtein: 'Fuzzy Match',
    variant: 'Name Variant',
    alias: 'Known Alias',
    partial: 'Partial Match',
    component: 'Name Component',
  }
  return algorithmLabels[algorithm] || algorithm
}

/**
 * Individual linkage card with confirm/reject actions
 */
function LinkageCard({ linkage, onConfirm, onReject, isUpdating }: LinkageCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const confidenceStyle = getConfidenceStyle(linkage.confidence)

  return (
    <div className={`group relative transition-all duration-300 ${isExpanded ? 'my-4' : 'my-2'}`}>
      {/* Hover glow effect */}
      <div className="absolute -inset-[1px] rounded-lg opacity-0 transition duration-300 group-hover:opacity-100 bg-gradient-to-r from-bronze-600/20 via-transparent to-transparent blur-sm" />

      <Card
        className={`relative overflow-hidden border border-charcoal-700 bg-charcoal-800/80 backdrop-blur-sm transition-all duration-300
          ${isExpanded ? 'border-bronze-600/30 bg-charcoal-800' : 'hover:border-bronze-600/30'}`}
      >
        {/* Main interactive header */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className={`relative flex cursor-pointer items-start gap-4 p-4 ${confidenceStyle.borderClass} border-l-4`}
        >
          {/* Expand Icon with animation */}
          <div
            className={`mt-1 text-bronze-500 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
          >
            <ChevronRight className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            {/* Entity names with link icon */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-2 text-charcoal-100 font-display">
                {getEntityIcon(linkage.entity1Name)}
                <span className="truncate max-w-[200px]">{linkage.entity1Name}</span>
              </span>
              <Link2 className="h-4 w-4 text-bronze-500 flex-shrink-0" />
              <span className="flex items-center gap-2 text-charcoal-100 font-display">
                {getEntityIcon(linkage.entity2Name)}
                <span className="truncate max-w-[200px]">{linkage.entity2Name}</span>
              </span>
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={confidenceStyle.variant} className="uppercase tracking-wider font-mono text-[10px] px-2">
                {Math.round(linkage.confidence * 100)}% conf
              </Badge>
              <Badge variant="outline" className="text-[10px] px-2 bg-charcoal-900/50 border-charcoal-600">
                {formatAlgorithm(linkage.algorithm)}
              </Badge>
              <Badge variant="info" className="uppercase tracking-wider font-mono text-[10px] px-2">
                {linkage.status}
              </Badge>
            </div>
          </div>

          {/* Action buttons (always visible) */}
          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onConfirm}
              disabled={isUpdating}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors
                ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
                bg-status-success/20 text-status-success border border-status-success/30 hover:bg-status-success/30`}
              title="Confirm linkage"
            >
              <Check className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Confirm</span>
            </button>
            <button
              onClick={onReject}
              disabled={isUpdating}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors
                ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
                bg-status-critical/20 text-status-critical border border-status-critical/30 hover:bg-status-critical/30`}
              title="Reject linkage"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reject</span>
            </button>
          </div>
        </div>

        {/* Expanded Content Area */}
        <div
          className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-charcoal-700/50 p-6 space-y-4">
              {/* Linkage details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-charcoal-900/50 rounded border border-charcoal-700/50 p-4">
                  <div className="text-xs text-charcoal-500 uppercase tracking-wide mb-2 font-mono">
                    Entity A
                  </div>
                  <div className="flex items-center gap-2 text-charcoal-100">
                    {getEntityIcon(linkage.entity1Name)}
                    <span className="font-display">{linkage.entity1Name}</span>
                  </div>
                </div>
                <div className="bg-charcoal-900/50 rounded border border-charcoal-700/50 p-4">
                  <div className="text-xs text-charcoal-500 uppercase tracking-wide mb-2 font-mono">
                    Entity B
                  </div>
                  <div className="flex items-center gap-2 text-charcoal-100">
                    {getEntityIcon(linkage.entity2Name)}
                    <span className="font-display">{linkage.entity2Name}</span>
                  </div>
                </div>
              </div>

              {/* Matching analysis */}
              <div className="bg-charcoal-900/50 rounded border border-charcoal-700/50 p-4 font-mono text-xs">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-charcoal-700/50">
                  <span className="text-bronze-400 uppercase tracking-wider">Match Analysis</span>
                  <span className="text-charcoal-500">ID: {linkage.id}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-charcoal-300">
                  <div>
                    <div className="text-charcoal-500 text-[10px] uppercase mb-1">Algorithm</div>
                    <div>{formatAlgorithm(linkage.algorithm)}</div>
                  </div>
                  <div>
                    <div className="text-charcoal-500 text-[10px] uppercase mb-1">Confidence</div>
                    <div className="flex items-center gap-2">
                      <span>{(linkage.confidence * 100).toFixed(1)}%</span>
                      <div
                        className="h-1.5 flex-1 max-w-[60px] bg-charcoal-700 rounded-full overflow-hidden"
                      >
                        <div
                          className={`h-full rounded-full ${linkage.confidence >= 0.8 ? 'bg-status-success' : linkage.confidence >= 0.5 ? 'bg-status-medium' : 'bg-status-low'}`}
                          style={{ width: `${linkage.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-charcoal-500 text-[10px] uppercase mb-1">Status</div>
                    <div className="capitalize">{linkage.status}</div>
                  </div>
                </div>
              </div>

              {/* Review guidance */}
              <div className="text-xs text-charcoal-400 italic">
                Review the proposed entity linkage above. If the two names refer to the same
                person/organization, click <span className="text-status-success">Confirm</span>. If
                they are different entities, click <span className="text-status-critical">Reject</span>.
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Decorative side line for timeline effect */}
      <div className="absolute -left-3 top-6 bottom-6 w-px bg-charcoal-700/50 hidden md:block" />
      <div
        className={`absolute -left-[14px] top-8 h-2 w-2 rounded-full border border-charcoal-600 bg-charcoal-900 hidden md:block transition-colors duration-300 ${isExpanded ? 'border-bronze-500 bg-bronze-600' : ''}`}
      />
    </div>
  )
}

/**
 * Entity Linkage Review Panel
 *
 * Displays pending entity linkages for user review.
 * Users can confirm or reject proposed linkages between entities
 * identified by the fuzzy matching algorithm.
 */
export function EntityLinkagePanel({ caseId, onLinkageUpdate }: EntityLinkagePanelProps) {
  const { data: pendingLinkages, isLoading, error } = usePendingLinkages(caseId)
  const { confirmLinkage, isPending: isConfirming } = useConfirmLinkage()
  const { rejectLinkage, isPending: isRejecting } = useRejectLinkage()
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleConfirm = async (linkage: EntityLinkageProposal) => {
    setUpdatingId(linkage.id)
    try {
      confirmLinkage(caseId, linkage.id)
      onLinkageUpdate?.(linkage, 'confirmed')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleReject = async (linkage: EntityLinkageProposal) => {
    setUpdatingId(linkage.id)
    try {
      rejectLinkage(caseId, linkage.id)
      onLinkageUpdate?.(linkage, 'rejected')
    } finally {
      setUpdatingId(null)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="p-8 text-center bg-charcoal-800/50 border-charcoal-700">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-10 w-10 bg-charcoal-700 rounded-full" />
          <div className="h-4 w-48 bg-charcoal-700 rounded" />
          <div className="h-3 w-64 bg-charcoal-700/50 rounded" />
        </div>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="p-8 text-center bg-charcoal-800/50 border-charcoal-700">
        <AlertTriangle className="mx-auto h-10 w-10 text-status-critical/50" />
        <p className="mt-4 text-sm text-charcoal-300 font-display">Error loading linkages</p>
        <p className="mt-1 text-xs text-charcoal-500 font-mono">
          {error instanceof Error ? error.message : 'An unknown error occurred'}
        </p>
      </Card>
    )
  }

  // Empty state
  if (!pendingLinkages || pendingLinkages.length === 0) {
    return (
      <Card className="p-8 text-center bg-charcoal-800/50 border-charcoal-700">
        <Link2 className="mx-auto h-10 w-10 text-bronze-500/50" />
        <p className="mt-4 text-sm text-charcoal-300 font-display">No pending linkages to review</p>
        <p className="mt-1 text-xs text-charcoal-500 font-mono">
          All entity linkages have been reviewed or none were detected
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-medium text-charcoal-100 flex items-center gap-2">
            <Link2 className="h-5 w-5 text-bronze-500" />
            Entity Linkage Review
          </h3>
          <p className="text-xs text-charcoal-400 font-mono mt-1">
            {pendingLinkages.length} pending {pendingLinkages.length === 1 ? 'linkage' : 'linkages'}{' '}
            awaiting review
          </p>
        </div>
        <Badge variant="info" className="uppercase tracking-wider font-mono text-[10px] px-2">
          {pendingLinkages.length} Pending
        </Badge>
      </div>

      {/* Linkage list */}
      <div className="space-y-1 pl-4 md:pl-6 border-l border-dashed border-charcoal-700/30 ml-2">
        {pendingLinkages.map((linkage) => (
          <LinkageCard
            key={linkage.id}
            linkage={linkage}
            onConfirm={() => handleConfirm(linkage)}
            onReject={() => handleReject(linkage)}
            isUpdating={updatingId === linkage.id || isConfirming || isRejecting}
          />
        ))}
      </div>
    </div>
  )
}

export default EntityLinkagePanel
