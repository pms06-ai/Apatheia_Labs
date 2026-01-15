'use client'

import { useCallback } from 'react'
import { FileText, Download, Eye, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SkeletonList } from '@/components/ui/skeleton'
import { VirtualList, VIRTUALIZATION_THRESHOLD } from '@/components/ui/virtual-list'
import { ErrorCard } from '@/components/ui/error-card'
import { EmptyState } from '@/components/ui/empty-state'
import { useDocuments } from '@/hooks/use-api'
import { useCaseStore } from '@/hooks/use-case-store'
import type { Document } from '@/CONTRACT'

const DOC_TYPE_COLORS: Record<string, string> = {
  police_bundle: 'bg-status-critical/20 text-status-critical',
  social_work_assessment: 'bg-status-high/20 text-status-high',
  expert_report: 'bg-status-medium/20 text-status-medium',
  court_order: 'bg-bronze-500/20 text-bronze-500',
  witness_statement: 'bg-status-low/20 text-status-low',
  disclosure: 'bg-charcoal-500/20 text-charcoal-300',
  other: 'bg-charcoal-600/20 text-charcoal-400',
}

// Estimated height of a document row (card height + gap)
const DOCUMENT_ROW_ESTIMATED_HEIGHT = 88

export function DocumentsList() {
  const { activeCase } = useCaseStore()
  const caseId = activeCase?.id || ''
  const { data: documents, isLoading, error, refetch } = useDocuments(caseId)

  // Move hooks before early returns to comply with Rules of Hooks
  const renderDocument = useCallback((doc: Document) => <DocumentRow doc={doc} />, [])
  const getItemKey = useCallback((doc: Document) => doc.id, [])

  if (!caseId) {
    return (
      <EmptyState
        icon={<FileText className="h-12 w-12" />}
        title="No case selected"
        description="Select a case to view document corpus"
        className="rounded-lg border border-dashed border-charcoal-700 bg-charcoal-800/30"
      />
    )
  }

  if (isLoading) {
    return <SkeletonList count={3} variant="document" />
  }

  if (error) {
    return (
      <ErrorCard
        title="Failed to load documents"
        message={error instanceof Error ? error.message : 'Failed to retrieve document corpus'}
        onRetry={() => refetch()}
        variant="card"
      />
    )
  }

  if (!documents || documents.length === 0) {
    return (
      <EmptyState
        icon={<Upload className="h-12 w-12" />}
        title="No documents ingested"
        description="Upload PDF or text files to begin the breakdown"
        className="rounded-lg border border-dashed border-charcoal-700 bg-charcoal-800/30"
      />
    )
  }

  // Use virtualization for large lists to improve performance
  const documentGrid =
    documents.length > VIRTUALIZATION_THRESHOLD ? (
      <VirtualList
        items={documents}
        estimateSize={DOCUMENT_ROW_ESTIMATED_HEIGHT}
        renderItem={renderDocument}
        getItemKey={getItemKey}
        className="h-[500px]"
        overscan={5}
      />
    ) : (
      <div className="grid gap-3">
        {documents.map(doc => (
          <DocumentRow key={doc.id} doc={doc} />
        ))}
      </div>
    )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="font-display text-sm uppercase tracking-widest text-charcoal-400">
          Corpus Inventory ({documents.length})
        </h2>
      </div>
      {documentGrid}
    </div>
  )
}

/**
 * Individual document row component - extracted for virtualization support
 */
function DocumentRow({ doc }: { doc: Document }) {
  return (
    <Link to={`/documents/${doc.id}`} className="group block">
      <Card className="flex items-center gap-4 border-charcoal-700 bg-charcoal-800/40 p-4 transition-all duration-300 hover:border-bronze-500/50 hover:bg-charcoal-800/80 hover:shadow-[0_0_15px_rgba(184,134,11,0.1)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-charcoal-700 bg-charcoal-900 transition-colors group-hover:border-bronze-500/30">
          <FileText className="h-6 w-6 text-charcoal-400 transition-colors group-hover:text-bronze-500" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="truncate font-medium text-charcoal-100 transition-colors group-hover:text-white">
              {doc.filename}
            </span>
            <Badge
              variant="outline"
              className={`border-0 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${DOC_TYPE_COLORS[doc.doc_type || 'other'] || DOC_TYPE_COLORS.other}`}
            >
              {(doc.doc_type || 'other').replace(/_/g, ' ')}
            </Badge>
          </div>
          <div className="mt-1.5 flex items-center gap-4 font-mono text-xs text-charcoal-500">
            <span>{formatFileSize(doc.file_size || 0)}</span>
            <span className="h-3 w-px bg-charcoal-700" />
            {doc.page_count && (
              <>
                <span>{doc.page_count} PAGES</span>
                <span className="h-3 w-px bg-charcoal-700" />
              </>
            )}
            <span>{formatDate(doc.created_at)}</span>
          </div>
        </div>

        <div className="flex translate-x-2 transform items-center gap-2 opacity-0 transition-opacity duration-300 group-hover:translate-x-0 group-hover:opacity-100">
          <div className="rounded-lg border border-charcoal-700 bg-charcoal-900 p-2 text-bronze-500">
            <Eye className="h-4 w-4" />
          </div>
          <div
            className="rounded-lg border border-charcoal-700 bg-charcoal-900 p-2 text-charcoal-400 transition-colors hover:text-white"
            onClick={e => {
              e.preventDefault()
              // TODO: Implement download
            }}
          >
            <Download className="h-4 w-4" />
          </div>
        </div>
      </Card>
    </Link>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'Unknown date'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
