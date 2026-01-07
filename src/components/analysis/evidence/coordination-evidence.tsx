'use client'

import { ChevronRight } from 'lucide-react'
import type { CoordinationEvidence } from '@/lib/analysis/evidence'

interface CoordinationEvidenceProps {
  evidence: CoordinationEvidence
}

export function CoordinationEvidence({ evidence }: CoordinationEvidenceProps) {
  return (
    <div className="space-y-4">
      {evidence.phrase && (
        <div>
          <div className="text-charcoal-500 mb-1">Shared Phrase</div>
          <div className="text-bronze-200 bg-bronze-500/10 p-2 rounded border border-bronze-500/20 italic">
            "{evidence.phrase}"
          </div>
        </div>
      )}
      {evidence.documents && evidence.documents.length > 0 && (
        <div>
          <div className="text-charcoal-500 mb-1">Involved Documents</div>
          <div className="flex flex-wrap gap-2">
            {evidence.documents.map((doc, index) => (
              <div
                key={`${doc.institution || 'doc'}-${index}`}
                className="flex flex-col bg-charcoal-800 p-2 rounded border border-charcoal-600"
              >
                <span className="text-charcoal-200 font-medium">
                  {doc.institution || 'Unknown'}
                </span>
                <span className="text-charcoal-400 text-[10px]">
                  {doc.documentName || 'Untitled'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {evidence.source && evidence.target && (
        <div className="flex items-center gap-4 p-3 bg-charcoal-800 rounded">
          <div className="text-right">
            <div className="text-charcoal-200 font-bold">{evidence.source}</div>
            <div className="text-charcoal-500 text-[10px]">SOURCE</div>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-charcoal-600 via-bronze-500 to-charcoal-600 relative">
            <ChevronRight className="absolute -right-1 -top-2 h-4 w-4 text-bronze-500" />
          </div>
          <div>
            <div className="text-charcoal-200 font-bold">{evidence.target}</div>
            <div className="text-charcoal-500 text-[10px]">TARGET</div>
          </div>
        </div>
      )}
    </div>
  )
}
