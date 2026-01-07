'use client'

import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ContradictionEvidence } from '@/lib/analysis/evidence'

interface ContradictionEvidenceProps {
  evidence: ContradictionEvidence
}

export function ContradictionEvidence({ evidence }: ContradictionEvidenceProps) {
  if (!evidence.claim1 || !evidence.claim2) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute left-1/2 -ml-px h-full w-0.5 bg-charcoal-700 hidden md:block"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-charcoal-800 p-3 rounded border border-charcoal-600 relative">
            <div className="absolute top-3 right-full mr-4 hidden md:block text-charcoal-500 font-mono text-[10px]">
              CLAIM 1
            </div>
            <p className="text-charcoal-200">"{evidence.claim1.text || ''}"</p>
            {evidence.claim1.author && (
              <div className="mt-2 flex items-center gap-2 text-[10px] text-bronze-500">
                <FileText className="h-3 w-3" />
                {evidence.claim1.author}
              </div>
            )}
          </div>
          <div className="bg-charcoal-800 p-3 rounded border border-charcoal-600 relative">
            <div className="absolute top-3 left-full ml-4 hidden md:block text-charcoal-500 font-mono text-[10px]">
              CLAIM 2
            </div>
            <p className="text-charcoal-200">"{evidence.claim2.text || ''}"</p>
            {evidence.claim2.author && (
              <div className="mt-2 flex items-center gap-2 text-[10px] text-bronze-500">
                <FileText className="h-3 w-3" />
                {evidence.claim2.author}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="text-center">
        <Badge variant="critical" className="bg-status-critical/10 text-status-critical border-status-critical/20">
          Conflict: {evidence.implication || evidence.explanation || 'Unspecified conflict'}
        </Badge>
      </div>
    </div>
  )
}
