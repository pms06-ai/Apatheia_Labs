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
import { PhaseProgress } from '@/components/sam'
import { OriginTimeline } from '@/components/sam'
import { useDocuments } from '@/hooks/use-api'
import { useCaseStore } from '@/hooks/use-case-store'
import {
  useSAMAnalysis,
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
  const { data: progress, isLoading: isLoadingProgress } = useSAMProgress(analysisId)
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

    const docIds = selectedDocs.length > 0 ? selectedDocs : documents?.map((d) => d.id) || []

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
    } catch (error) {
      toast.error('Failed to start analysis')
    }
  }

  const handleCancel = async () => {
    if (!analysisId) return
    try {
      await cancelMutation.mutateAsync(analysisId)
      toast.success('Analysis cancelled')
    } catch (error) {
      toast.error('Failed to cancel analysis')
    }
  }

  const handleResume = async () => {
    if (!analysisId) return
    try {
      await resumeMutation.mutateAsync(analysisId)
      toast.success('Analysis resumed')
    } catch (error) {
      toast.error('Failed to resume analysis')
    }
  }

  const toggleDocSelection = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    )
  }

  const selectAllDocs = () => {
    if (documents) {
      setSelectedDocs(documents.map((d) => d.id))
    }
  }

  const clearSelection = () => {
    setSelectedDocs([])
  }

  // No active case
  if (!caseId) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8 text-center bg-charcoal-900 border-charcoal-800">
          <AlertCircle className="h-12 w-12 text-charcoal-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-ivory-100 mb-2">No Case Selected</h2>
          <p className="text-charcoal-400">Select a case from the sidebar to begin S.A.M. analysis.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-charcoal-800 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display text-ivory-100">
              S.A.M. Analysis
            </h1>
            <p className="text-sm text-charcoal-400 mt-1">
              Systematic Adversarial Methodology - Trace false premises to outcomes
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Badge */}
            {progress && (
              <Badge
                variant={
                  isComplete ? 'default' :
                  isFailed ? 'critical' :
                  isRunning ? 'default' :
                  'default'
                }
                className={cn(
                  isRunning && 'bg-bronze-600/20 text-bronze-400',
                  isComplete && 'bg-status-success-bg text-status-success'
                )}
              >
                {isRunning && <Spinner size="sm" className="mr-1" />}
                {isComplete && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {progress.status?.replace('_', ' ').toUpperCase()}
              </Badge>
            )}

            {/* Cancel Button - Show when running */}
            {isRunning && (
              <button
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
                  cancelMutation.isPending
                    ? 'bg-charcoal-700 text-charcoal-400 cursor-not-allowed'
                    : 'bg-status-critical/20 text-status-critical hover:bg-status-critical/30 border border-status-critical/30'
                )}
              >
                {cancelMutation.isPending ? (
                  <Spinner size="sm" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
              </button>
            )}

            {/* Resume Button - Show when cancelled or failed */}
            {(isCancelled || isFailed) && (
              <button
                onClick={handleResume}
                disabled={resumeMutation.isPending}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
                  resumeMutation.isPending
                    ? 'bg-charcoal-700 text-charcoal-400 cursor-not-allowed'
                    : 'bg-bronze-600/20 text-bronze-400 hover:bg-bronze-600/30 border border-bronze-600/30'
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
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
                runMutation.isPending || isRunning
                  ? 'bg-charcoal-700 text-charcoal-400 cursor-not-allowed'
                  : 'bg-bronze-600 text-ivory-100 hover:bg-bronze-500'
              )}
            >
              {runMutation.isPending ? (
                <Spinner size="sm" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {runMutation.isPending ? 'Starting...' : isRunning ? 'Running...' : 'Run Analysis'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Document Selection & Progress */}
        <div className="w-80 border-r border-charcoal-800 flex flex-col">
          {/* Document Selection */}
          <div className="p-4 border-b border-charcoal-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-ivory-100">Documents</h3>
              <div className="flex gap-2 text-xs">
                <button
                  onClick={selectAllDocs}
                  className="text-bronze-400 hover:text-bronze-300"
                >
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

            <div className="space-y-1 max-h-48 overflow-y-auto">
              {documents?.map((doc) => (
                <label
                  key={doc.id}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded cursor-pointer transition-colors',
                    selectedDocs.includes(doc.id)
                      ? 'bg-bronze-600/20 text-ivory-100'
                      : 'hover:bg-charcoal-800 text-charcoal-300'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedDocs.includes(doc.id)}
                    onChange={() => toggleDocSelection(doc.id)}
                    className="rounded border-charcoal-600"
                  />
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="text-xs truncate">{doc.filename}</span>
                </label>
              ))}

              {(!documents || documents.length === 0) && (
                <p className="text-xs text-charcoal-500 italic p-2">
                  No documents in this case
                </p>
              )}
            </div>

            <p className="text-xs text-charcoal-500 mt-2">
              {selectedDocs.length > 0
                ? `${selectedDocs.length} selected`
                : 'All documents will be analyzed'}
            </p>
          </div>

          {/* Phase Progress */}
          {(progress || analysisId) && (
            <div className="flex-1 p-4 overflow-y-auto">
              <PhaseProgress
                currentPhase={progress?.currentPhase ?? null}
                status={
                  !progress ? 'pending' :
                  isComplete ? 'completed' :
                  isFailed ? 'failed' :
                  isCancelled ? 'cancelled' :
                  isRunning ? 'running' :
                  'pending'
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
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <div className="text-5xl font-serif text-charcoal-700 mb-2">S</div>
                <p className="text-xs text-charcoal-500">
                  Click Run to start<br />S.A.M. analysis
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Main Content - Results */}
        <div className="flex-1 overflow-hidden">
          {/* Loading State */}
          {isLoadingResults && isComplete && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Spinner size="lg" className="mx-auto mb-4" />
                <p className="text-charcoal-400">Loading results...</p>
              </div>
            </div>
          )}

          {/* Results Tabs */}
          {results && isComplete && (
            <Tabs defaultValue="origins" className="h-full flex flex-col">
              <div className="border-b border-charcoal-800 px-4">
                <TabsList className="bg-transparent gap-1">
                  <TabsTrigger value="origins" className="data-[state=active]:bg-charcoal-800">
                    Origins
                    {results.falsePremises && results.falsePremises.length > 0 && (
                      <Badge variant="critical" className="ml-2 text-[10px] px-1.5">
                        {results.falsePremises.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="propagation" className="data-[state=active]:bg-charcoal-800">
                    Propagation
                    {results.propagations && results.propagations.length > 0 && (
                      <Badge className="ml-2 text-[10px] px-1.5 bg-charcoal-700">
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

              <TabsContent value="origins" className="flex-1 overflow-y-auto p-6 m-0">
                <OriginTimeline
                  origins={results.origins || []}
                  showFalsePremisesOnly={false}
                />
              </TabsContent>

              <TabsContent value="propagation" className="flex-1 overflow-y-auto p-6 m-0">
                <div className="text-center text-charcoal-500 py-12">
                  <p className="text-lg mb-2">Propagation Flow</p>
                  <p className="text-sm">Coming in Phase 5</p>
                  <div className="mt-4 text-xs">
                    <p>{results.propagations?.length || 0} propagations tracked</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="authority" className="flex-1 overflow-y-auto p-6 m-0">
                <div className="text-center text-charcoal-500 py-12">
                  <p className="text-lg mb-2">Authority Accumulation</p>
                  <p className="text-sm">Coming in Phase 6</p>
                  <div className="mt-4 text-xs">
                    <p>{results.authorityMarkers?.length || 0} authority markers</p>
                    <p>{results.authorityLaundering?.length || 0} laundering patterns</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="outcomes" className="flex-1 overflow-y-auto p-6 m-0">
                <div className="text-center text-charcoal-500 py-12">
                  <p className="text-lg mb-2">Outcome Causation</p>
                  <p className="text-sm">Coming in Phase 7</p>
                  <div className="mt-4 text-xs">
                    <p>{results.outcomes?.length || 0} outcomes identified</p>
                    <p>{results.causationChains?.length || 0} causation chains</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Running State */}
          {isRunning && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="relative">
                  <Spinner size="lg" className="mx-auto" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-serif text-bronze-500">
                      {progress?.currentPhase?.[0]?.toUpperCase() || 'S'}
                    </span>
                  </div>
                </div>
                <p className="text-charcoal-400 mt-4">
                  {progress?.currentPhase
                    ? `Running ${progress.currentPhase.toUpperCase()} phase...`
                    : 'Initializing analysis...'}
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {isFailed && (
            <div className="flex items-center justify-center h-full">
              <Card className="p-8 text-center bg-status-critical-bg/10 border-status-critical/30 max-w-md">
                <AlertCircle className="h-12 w-12 text-status-critical mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-ivory-100 mb-2">Analysis Failed</h2>
                <p className="text-charcoal-400 text-sm mb-4">
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
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="text-6xl font-serif text-charcoal-700 mb-4">S.A.M.</div>
                <h2 className="text-xl font-semibold text-ivory-100 mb-2">
                  Systematic Adversarial Methodology
                </h2>
                <p className="text-charcoal-400 text-sm mb-6">
                  Trace how false premises propagate through institutional documents,
                  accumulate authority through repetition, and cause harmful outcomes.
                </p>
                <div className="flex justify-center gap-4 text-xs text-charcoal-500">
                  <div className="text-center">
                    <div className="text-lg font-serif text-bronze-500">A</div>
                    <div>ANCHOR</div>
                  </div>
                  <div className="text-charcoal-700">→</div>
                  <div className="text-center">
                    <div className="text-lg font-serif text-bronze-500">N</div>
                    <div>INHERIT</div>
                  </div>
                  <div className="text-charcoal-700">→</div>
                  <div className="text-center">
                    <div className="text-lg font-serif text-bronze-500">C</div>
                    <div>COMPOUND</div>
                  </div>
                  <div className="text-charcoal-700">→</div>
                  <div className="text-center">
                    <div className="text-lg font-serif text-bronze-500">R</div>
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
