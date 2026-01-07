'use client'

import type { OmissionEvidence } from '@/lib/analysis/evidence'

interface OmissionEvidenceProps {
  evidence: OmissionEvidence
}

export function OmissionEvidence({ evidence }: OmissionEvidenceProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-status-success/5 border border-status-success/20 p-3 rounded">
        <div className="text-status-success text-[10px] uppercase tracking-wide mb-2 font-bold">
          Original Source
        </div>
        <div className="text-charcoal-200 italic border-l-2 border-status-success pl-2">
          "{evidence.sourceContent || 'Unknown'}"
        </div>
      </div>
      <div className="bg-status-critical/5 border border-status-critical/20 p-3 rounded">
        <div className="text-status-critical text-[10px] uppercase tracking-wide mb-2 font-bold">
          Report (Omitted)
        </div>
        <div className="text-charcoal-200 italic border-l-2 border-status-critical pl-2">
          "{evidence.reportContent || 'Unknown'}"
        </div>
      </div>
      {evidence.omittedContent && (
        <div className="md:col-span-2 bg-charcoal-800 border border-charcoal-600 p-3 rounded mt-2">
          <div className="text-charcoal-400 text-[10px] uppercase tracking-wide mb-1">
            Specifically Omitted
          </div>
          <div className="text-bronze-100 font-medium">
            "{evidence.omittedContent}"
          </div>
        </div>
      )}
    </div>
  )
}
