'use client'

/**
 * S.A.M. Analysis Page
 *
 * Systematic Adversarial Methodology - 4-phase analysis pipeline:
 * ANCHOR → INHERIT → COMPOUND → ARRIVE
 */

import { useState } from 'react'
import { Play, FileText, Square, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Spinner } from '@/components/ui/spinner'
import {
  PhaseProgress,
  OriginTimeline,
  PropagationFlow,
  AuthorityAccumulation,
  OutcomeCausation,
} from '@/components/sam'
import { useDocuments } from '@/hooks/use-api'
import { useCaseStore } from '@/hooks/use-case-store'
import {
  useRunSAMAnalysis,
  useSAMProgress,
  useSAMResults,
  useCancelSAMAnalysis,
  useResumeSAMAnalysis,
} from '@/hooks/use-sam-analysis'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function SAMPage() {
  const { activeCase } = useCaseStore()
  const caseId = activeCase?.id || ''

  // Document selection
  const { data: documents } = useDocuments(caseId)
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])

  // Analysis state
  const [analysisId, setAnalysisId] = useState<string | null>(null)

  // Hooks
  const runMutation = useRunSAMAnalysis()
  const cancelMutation = useCancelSAMAnalysis()
  const resumeMutation = useResumeSAMAnalysis()
  const { data: progress, isLoading: _isLoadingProgress } = useSAMProgress(analysisId)
  const { data: results, isLoading: isLoadingResults } = useSAMResults(
    progress?.status === 'completed' ? analysisId : null
  )

  // Derived state
  const isRunning = progress?.status === 'pending' || progress?.status?.endsWith('_running')
  const isComplete = progress?.status === 'completed'
  const isFailed = progress?.status === 'failed'
  const isCancelled = progress?.status === 'cancelled'

  // Handlers
  const handleRun = async () => {
    if (!caseId) {
      toast.error('No active case selected')
      return
    }

    const docIds = selectedDocs.length > 0 ? selectedDocs : documents?.map(d => d.id) || []

    if (docIds.length === 0) {
      toast.error('No documents available for analysis')
      return
    }

    try {
      const id = await runMutation.mutateAsync({
        caseId,
        documentIds: docIds,
      })
      setAnalysisId(id)
      toast.success('S.A.M. analysis started')
    } catch (_error) {
      toast.error('Failed to start analysis')
    }
  }

  const handleCancel = async () => {
    if (!analysisId) return
    try {
      await cancelMutation.mutateAsync(analysisId)
      toast.success('Analysis cancelled')
    } catch (_error) {
      toast.error('Failed to cancel analysis')
    }
  }

  const handleResume = async () => {
    if (!analysisId) return
    try {
      await resumeMutation.mutateAsync(analysisId)
      toast.success('Analysis resumed')
    } catch (_error) {
      toast.error('Failed to resume analysis')
    }
  }

  const toggleDocSelection = (docId: string) => {
    setSelectedDocs(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    )
  }

  const selectAllDocs = () => {
    if (documents) {
      setSelectedDocs(documents.map(d => d.id))
    }
  }

  const clearSelection = () => {
    setSelectedDocs([])
  }

  // No active case
  if (!caseId) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="border-charcoal-800 bg-charcoal-900 p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-charcoal-500" />
          <h2 className="text-ivory-100 mb-2 text-lg font-semibold">No Case Selected</h2>
          <p className="text-charcoal-400">
            Select a case from the sidebar to begin S.A.M. analysis.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-charcoal-800 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-ivory-100 font-display text-2xl">S.A.M. Analysis</h1>
            <p className="mt-1 text-sm text-charcoal-400">
              Systematic Adversarial Methodology - Trace false premises to outcomes
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Badge */}
            {progress && (
              <Badge
                variant={
                  isComplete ? 'default' : isFailed ? 'critical' : isRunning ? 'default' : 'default'
                }
                className={cn(
                  isRunning && 'bg-bronze-600/20 text-bronze-400',
                  isComplete && 'bg-status-success-bg text-status-success'
                )}
              >
                {isRunning && <Spinner size="sm" className="mr-1" />}
                {isComplete && <CheckCircle2 className="mr-1 h-3 w-3" />}
                {progress.status?.replace('_', ' ').toUpperCase()}
              </Badge>
            )}

            {/* Cancel Button - Show when running */}
            {isRunning && (
              <button
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-all',
                  cancelMutation.isPending
                    ? 'cursor-not-allowed bg-charcoal-700 text-charcoal-400'
                    : 'border border-status-critical/30 bg-status-critical/20 text-status-critical hover:bg-status-critical/30'
                )}
              >
                {cancelMutation.isPending ? <Spinner size="sm" /> : <Square className="h-4 w-4" />}
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
              </button>
            )}

            {/* Resume Button - Show when cancelled or failed */}
            {(isCancelled || isFailed) && (
              <button
                onClick={handleResume}
                disabled={resumeMutation.isPending}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-all',
                  resumeMutation.isPending
                    ? 'cursor-not-allowed bg-charcoal-700 text-charcoal-400'
                    : 'border border-bronze-600/30 bg-bronze-600/20 text-bronze-400 hover:bg-bronze-600/30'
                )}
              >
                {resumeMutation.isPending ? (
                  <Spinner size="sm" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                {resumeMutation.isPending ? 'Resuming...' : 'Resume'}
              </button>
            )}

            {/* Run Button */}
            <button
              onClick={handleRun}
              disabled={runMutation.isPending || isRunning}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-all',
                runMutation.isPending || isRunning
                  ? 'cursor-not-allowed bg-charcoal-700 text-charcoal-400'
                  : 'text-ivory-100 bg-bronze-600 hover:bg-bronze-500'
              )}
            >
              {runMutation.isPending ? <Spinner size="sm" /> : <Play className="h-4 w-4" />}
              {runMutation.isPending ? 'Starting...' : isRunning ? 'Running...' : 'Run Analysis'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Document Selection & Progress */}
        <div className="flex w-80 flex-col border-r border-charcoal-800">
          {/* Document Selection */}
          <div className="border-b border-charcoal-800 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-ivory-100 text-sm font-semibold">Documents</h3>
              <div className="flex gap-2 text-xs">
                <button onClick={selectAllDocs} className="text-bronze-400 hover:text-bronze-300">
                  All
                </button>
                <span className="text-charcoal-600">|</span>
                <button
                  onClick={clearSelection}
                  className="text-charcoal-400 hover:text-charcoal-300"
                >
                  None
                </button>
              </div>
            </div>

            <div className="max-h-48 space-y-1 overflow-y-auto">
              {documents?.map(doc => (
                <label
                  key={doc.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded p-2 transition-colors',
                    selectedDocs.includes(doc.id)
                      ? 'text-ivory-100 bg-bronze-600/20'
                      : 'text-charcoal-300 hover:bg-charcoal-800'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedDocs.includes(doc.id)}
                    onChange={() => toggleDocSelection(doc.id)}
                    className="rounded border-charcoal-600"
                  />
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate text-xs">{doc.filename}</span>
                </label>
              ))}

              {(!documents || documents.length === 0) && (
                <p className="p-2 text-xs italic text-charcoal-500">No documents in this case</p>
              )}
            </div>

            <p className="mt-2 text-xs text-charcoal-500">
              {selectedDocs.length > 0
                ? `${selectedDocs.length} selected`
                : 'All documents will be analyzed'}
            </p>
          </div>

          {/* Phase Progress */}
          {(progress || analysisId) && (
            <div className="flex-1 overflow-y-auto p-4">
              <PhaseProgress
                currentPhase={progress?.currentPhase ?? null}
                status={
                  !progress
                    ? 'pending'
                    : isComplete
                      ? 'completed'
                      : isFailed
                        ? 'failed'
                        : isCancelled
                          ? 'cancelled'
                          : isRunning
                            ? 'running'
                            : 'pending'
                }
                phaseTimestamps={{
                  anchorStartedAt: progress?.anchorStartedAt,
                  anchorCompletedAt: progress?.anchorCompletedAt,
                  inheritStartedAt: progress?.inheritStartedAt,
                  inheritCompletedAt: progress?.inheritCompletedAt,
                  compoundStartedAt: progress?.compoundStartedAt,
                  compoundCompletedAt: progress?.compoundCompletedAt,
                  arriveStartedAt: progress?.arriveStartedAt,
                  arriveCompletedAt: progress?.arriveCompletedAt,
                }}
                metrics={{
                  falsePremisesFound: progress?.falsePremisesFound,
                  propagationChainsFound: progress?.propagationChainsFound,
                  authorityAccumulationsFound: progress?.authorityAccumulationsFound,
                  outcomesLinked: progress?.outcomesLinked,
                }}
                errorMessage={progress?.errorMessage}
                errorPhase={progress?.errorPhase}
              />
            </div>
          )}

          {/* Empty State */}
          {!progress && !analysisId && (
            <div className="flex flex-1 items-center justify-center p-4">
              <div className="text-center">
                <div className="mb-2 font-serif text-5xl text-charcoal-700">S</div>
                <p className="text-xs text-charcoal-500">
                  Click Run to start
                  <br />
                  S.A.M. analysis
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Main Content - Results */}
        <div className="flex-1 overflow-hidden">
          {/* Loading State */}
          {isLoadingResults && isComplete && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Spinner size="lg" className="mx-auto mb-4" />
                <p className="text-charcoal-400">Loading results...</p>
              </div>
            </div>
          )}

          {/* Results Tabs */}
          {results && isComplete && (
            <Tabs defaultValue="origins" className="flex h-full flex-col">
              <div className="border-b border-charcoal-800 px-4">
                <TabsList className="gap-1 bg-transparent">
                  <TabsTrigger value="origins" className="data-[state=active]:bg-charcoal-800">
                    Origins
                    {results.falsePremises && results.falsePremises.length > 0 && (
                      <Badge variant="critical" className="ml-2 px-1.5 text-[10px]">
                        {results.falsePremises.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="propagation" className="data-[state=active]:bg-charcoal-800">
                    Propagation
                    {results.propagations && results.propagations.length > 0 && (
                      <Badge className="ml-2 bg-charcoal-700 px-1.5 text-[10px]">
                        {results.propagations.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="authority" className="data-[state=active]:bg-charcoal-800">
                    Authority
                  </TabsTrigger>
                  <TabsTrigger value="outcomes" className="data-[state=active]:bg-charcoal-800">
                    Outcomes
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="origins" className="m-0 flex-1 overflow-y-auto p-6">
                <OriginTimeline origins={results.origins || []} showFalsePremisesOnly={false} />
              </TabsContent>

              <TabsContent value="propagation" className="m-0 flex-1 overflow-y-auto p-6">
                <PropagationFlow propagations={results.propagations || []} />
              </TabsContent>

              <TabsContent value="authority" className="m-0 flex-1 overflow-y-auto p-6">
                <AuthorityAccumulation
                  markers={results.authorityMarkers || []}
                  laundering={results.authorityLaundering || []}
                />
              </TabsContent>

              <TabsContent value="outcomes" className="m-0 flex-1 overflow-y-auto p-6">
                <OutcomeCausation
                  outcomes={results.outcomes || []}
                  chains={
                    results.causationChains?.map(c => ({
                      outcome_id: c.outcomeId,
                      root_claims: c.rootClaims,
                      propagation_path: c.propagationPath,
                      authority_accumulation: c.authorityAccumulation,
                    })) || []
                  }
                />
              </TabsContent>
            </Tabs>
          )}

          {/* Running State */}
          {isRunning && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="relative">
                  <Spinner size="lg" className="mx-auto" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-serif text-2xl text-bronze-500">
                      {progress?.currentPhase?.[0]?.toUpperCase() || 'S'}
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-charcoal-400">
                  {progress?.currentPhase
                    ? `Running ${progress.currentPhase.toUpperCase()} phase...`
                    : 'Initializing analysis...'}
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {isFailed && (
            <div className="flex h-full items-center justify-center">
              <Card className="max-w-md border-status-critical/30 bg-status-critical-bg/10 p-8 text-center">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-status-critical" />
                <h2 className="text-ivory-100 mb-2 text-lg font-semibold">Analysis Failed</h2>
                <p className="mb-4 text-sm text-charcoal-400">
                  {progress?.errorMessage || 'An error occurred during analysis'}
                </p>
                {progress?.errorPhase && (
                  <Badge variant="critical">Failed at {progress.errorPhase.toUpperCase()}</Badge>
                )}
              </Card>
            </div>
          )}

          {/* Empty State - No Analysis Yet */}
          {!analysisId && !progress && (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-md text-center">
                <div className="mb-4 font-serif text-6xl text-charcoal-700">S.A.M.</div>
                <h2 className="text-ivory-100 mb-2 text-xl font-semibold">
                  Systematic Adversarial Methodology
                </h2>
                <p className="mb-6 text-sm text-charcoal-400">
                  Trace how false premises propagate through institutional documents, accumulate
                  authority through repetition, and cause harmful outcomes.
                </p>
                <div className="flex justify-center gap-4 text-xs text-charcoal-500">
                  <div className="text-center">
                    <div className="font-serif text-lg text-bronze-500">A</div>
                    <div>ANCHOR</div>
                  </div>
                  <div className="text-charcoal-700">→</div>
                  <div className="text-center">
                    <div className="font-serif text-lg text-bronze-500">N</div>
                    <div>INHERIT</div>
                  </div>
                  <div className="text-charcoal-700">→</div>
                  <div className="text-center">
                    <div className="font-serif text-lg text-bronze-500">C</div>
                    <div>COMPOUND</div>
                  </div>
                  <div className="text-charcoal-700">→</div>
                  <div className="text-center">
                    <div className="font-serif text-lg text-bronze-500">R</div>
                    <div>ARRIVE</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
