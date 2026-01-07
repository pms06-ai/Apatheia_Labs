'use client'

import { Badge } from '@/components/ui/badge'
import type { EntityGraphNode } from './types'
import { formatConfidence, getEntityTypeBadgeVariant, getNodeColor } from './utils'

interface EntityDetailPanelProps {
  selectedEntity: EntityGraphNode
  onCloseDetail?: () => void
}

export function EntityDetailPanel({ selectedEntity, onCloseDetail }: EntityDetailPanelProps) {
  return (
    <div className="absolute top-4 left-4 w-72 bg-[#1C1C1E]/95 border border-charcoal-700 rounded-lg shadow-xl backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-charcoal-700/50 bg-charcoal-900/50">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getNodeColor(selectedEntity.type) }}
          />
          <span className="font-medium text-charcoal-100 text-sm truncate max-w-[180px]">
            {selectedEntity.name}
          </span>
        </div>
        <button
          onClick={() => onCloseDetail?.()}
          className="text-charcoal-400 hover:text-charcoal-200 transition-colors p-1 hover:bg-charcoal-700/50 rounded"
          aria-label="Close detail panel"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant={getEntityTypeBadgeVariant(selectedEntity.type)}>
            {selectedEntity.type}
          </Badge>
          <div className="flex items-center gap-1.5 text-xs text-charcoal-400">
            <span>Confidence:</span>
            <span
              className={
                selectedEntity.confidence >= 0.8
                  ? 'text-status-success font-semibold'
                  : selectedEntity.confidence >= 0.5
                    ? 'text-status-high font-semibold'
                    : 'text-charcoal-300'
              }
            >
              {formatConfidence(selectedEntity.confidence)}
            </span>
          </div>
        </div>

        {selectedEntity.role && (
          <div className="space-y-1">
            <label className="text-[10px] text-charcoal-500 font-mono uppercase tracking-wider">
              Role
            </label>
            <div className="text-sm text-charcoal-200">{selectedEntity.role}</div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] text-charcoal-500 font-mono uppercase tracking-wider flex items-center gap-2">
            Known Aliases
            <span className="text-charcoal-600">({selectedEntity.aliases.length})</span>
          </label>
          {selectedEntity.aliases.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedEntity.aliases.map((alias, index) => (
                <span
                  key={`alias-${index}`}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-charcoal-800 text-charcoal-300 border border-charcoal-700/50"
                >
                  {alias}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs text-charcoal-500 italic">No aliases found</div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] text-charcoal-500 font-mono uppercase tracking-wider flex items-center gap-2">
            Document Mentions
            <span className="text-charcoal-600">({selectedEntity.documentIds.length})</span>
          </label>
          {selectedEntity.documentIds.length > 0 ? (
            <div className="space-y-1 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
              {selectedEntity.documentIds.map((docId, index) => (
                <div
                  key={`doc-${index}`}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-xs bg-charcoal-800/50 border border-charcoal-700/30 hover:border-charcoal-600/50 transition-colors"
                >
                  <svg
                    className="w-3 h-3 text-charcoal-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="text-charcoal-300 truncate font-mono">
                    {docId.length > 20 ? `${docId.slice(0, 20)}...` : docId}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-charcoal-500 italic">No document mentions</div>
          )}
        </div>

        <div className="pt-2 border-t border-charcoal-700/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-charcoal-500">Total Mentions</span>
            <span className="font-semibold text-charcoal-200">
              {selectedEntity.mentionCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
