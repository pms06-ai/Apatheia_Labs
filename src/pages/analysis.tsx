import { useState } from 'react'
import { Play, FileText, AlertTriangle, Clock, Share2, Filter, Layers, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { FindingsList } from '@/components/analysis/findings-list'
import { TimelineView } from '@/components/analysis/timeline-view'
import { NetworkGraph } from '@/components/analysis/network-graph'
import { ExportButton } from '@/components/analysis/ExportButton'
import { EntityLinkagePanel } from '@/components/analysis/entity-linkage-panel'
import { JobQueuePanel } from '@/components/analysis/JobQueuePanel'
import { useDocuments, useFindings, useRunEngine } from '@/hooks/use-api'
import { usePendingLinkages } from '@/hooks/use-entity-resolution'
import { ENGINE_REGISTRY } from '@/lib/engines/metadata'
import { useCaseStore } from '@/hooks/use-case-store'
import { isDesktop } from '@/lib/tauri'
import toast from 'react-hot-toast'
import { getDataLayer } from '@/lib/data'
import { useEngineProgress } from '@/hooks/use-engine-progress'
import { useMultiSelect } from '@/hooks/use-multi-select'
import { asNarrativeEvidence } from '@/lib/analysis/evidence'
import { buildCoordinationGraph, getGraphStats } from '@/lib/analysis/graph-transformer'
import type { Severity } from '@/CONTRACT'

// Engine icons mapping
const ENGINE_ICONS: Record<string, string> = {
  contradiction: 'K',
  omission: 'O',
  expert_witness: 'Xi',
  narrative: 'M',
  coordination: 'Sigma',
  entity_resolution: 'E',
  temporal_parser: 'T',
  argumentation: 'A',
  bias_detection: 'B',
  accountability_audit: 'Lambda',
  professional_tracker: 'Pi',
  documentary: 'Delta',
}

function toTimelineSeverity(
  severity: Severity | null
): 'critical' | 'high' | 'medium' | 'low' | undefined {
  if (!severity || severity === 'info') return undefined
  return severity
}

export default function AnalysisPage() {
  const { activeCase } = useCaseStore()
  const caseId = activeCase?.id || ''

  const { data: documents } = useDocuments(caseId)
  const { data: findings, refetch: refetchFindings } = useFindings(caseId)
  const runEngineMutation = useRunEngine()
  const { data: pendingLinkages } = usePendingLinkages(caseId)
  const pendingCount = pendingLinkages?.length || 0

  const [selectedEngine, setSelectedEngine] = useState<string | null>('omission')
  const [batchMode, setBatchMode] = useState(false)
  const {
    selected: selectedDocs,
    toggle: toggleDocSelection,
    clear: clearSelectedDocs,
    selectAll: selectAllDocs,
  } = useMultiSelect<string>([])
  const {
    selected: selectedEngines,
    toggle: toggleEngineSelection,
    clear: clearSelectedEngines,
  } = useMultiSelect<string>([])
  const { engineStatuses, currentJob, mockModeWarning, clearMockModeWarning, setEngineStatuses } =
    useEngineProgress({
      onFindingsUpdate: refetchFindings,
      onMockModeWarning: () => {
        toast.error('AI Analysis Unavailable - Using Mock Data', {
          duration: 5000,
          icon: '??',
        })
      },
    })

  const engines = Object.values(ENGINE_REGISTRY)
    .filter(engine => engine.status === 'active')
    .sort((a, b) => {
      // Sort by priority first (V6.0 engines), then alphabetically by name
      const aPriority = a.priority || 99
      const bPriority = b.priority || 99
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }
      return a.name.localeCompare(b.name)
    })

  const handleRunEngine = async (engineId: string) => {
    if (!caseId || selectedDocs.length === 0) return

    setEngineStatuses(prev => ({
      ...prev,
      [engineId]: { running: true, progress: 0 },
    }))

    try {
      await runEngineMutation.mutateAsync({
        engineId,
        caseId,
        documentIds: selectedDocs,
      })

      setEngineStatuses(prev => ({
        ...prev,
        [engineId]: {
          running: false,
          progress: 100,
          lastRun: new Date().toISOString(),
        },
      }))

      refetchFindings()
    } catch (error) {
      setEngineStatuses(prev => ({
        ...prev,
        [engineId]: {
          running: false,
          progress: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }))
    }
  }

  const handleRunBatch = async () => {
    if (!caseId || selectedDocs.length === 0 || selectedEngines.length === 0) return

    try {
      const dataLayer = await getDataLayer()
      await dataLayer.submitAnalysis({
        caseId,
        documentIds: selectedDocs,
        engines: selectedEngines,
      })
    } catch (error) {
      console.error('Failed to submit batch analysis:', error)
    }
  }

  const engineFindings = findings?.filter(f => f.engine === selectedEngine) || []

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Mock Mode Warning Banner */}
      {mockModeWarning && (
        <div className="mx-2 flex items-center justify-between rounded-lg border border-amber-500/50 bg-amber-900/30 p-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <span className="text-sm font-medium text-amber-200">Mock Mode Active</span>
              <span className="ml-2 text-sm text-amber-300/80">
                AI analysis unavailable - findings are placeholder data only. Check sidecar
                configuration.
              </span>
            </div>
          </div>
          <button
            onClick={clearMockModeWarning}
            className="px-2 text-sm text-amber-500 hover:text-amber-400"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 gap-8 p-2">
        {/* Left Panel - Engine Selector */}
        <div className="flex w-80 shrink-0 flex-col gap-6">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl tracking-tight text-charcoal-100">
                Analysis Engines
              </h2>
              {isDesktop() && (
                <button
                  onClick={() => setBatchMode(!batchMode)}
                  className={`rounded-lg p-2 transition-colors ${batchMode ? 'bg-bronze-500/20 text-bronze-500' : 'text-charcoal-400 hover:text-charcoal-200'}`}
                  title="Toggle batch mode"
                >
                  <Layers className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-charcoal-400">
              {batchMode
                ? 'Select multiple engines to run in batch. Progress will show in real-time.'
                : 'Select an analytic engine to process case documents and extract findings.'}
            </p>
          </div>

          {/* Batch Mode Progress Bar */}
          {currentJob && currentJob.status === 'running' && (
            <div className="animate-pulse-subtle rounded-lg border border-bronze-500/30 bg-charcoal-800 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-bronze-500">Processing</span>
                <span className="text-sm text-charcoal-200">
                  {currentJob.completedEngines}/{currentJob.totalEngines}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-charcoal-700">
                <div
                  className="h-full bg-gradient-to-r from-bronze-600 to-bronze-500 transition-all duration-300"
                  style={{
                    width: `${(currentJob.completedEngines / currentJob.totalEngines) * 100}%`,
                  }}
                />
              </div>
              {currentJob.currentEngine && (
                <div className="mt-2 text-xs text-charcoal-400">
                  Running:{' '}
                  {ENGINE_REGISTRY[currentJob.currentEngine as keyof typeof ENGINE_REGISTRY]
                    ?.name || currentJob.currentEngine}
                </div>
              )}
            </div>
          )}

          <div className="scrollbar-hide flex-1 space-y-3 overflow-y-auto pr-2">
            {engines.map(engine => {
              const status = engineStatuses[engine.id]
              const isSelected = batchMode
                ? selectedEngines.includes(engine.id)
                : selectedEngine === engine.id

              return (
                <div
                  key={engine.id}
                  onClick={() =>
                    batchMode ? toggleEngineSelection(engine.id) : setSelectedEngine(engine.id)
                  }
                  className={`group relative cursor-pointer rounded-xl border border-transparent p-4 transition-all duration-300 ${
                    isSelected
                      ? 'border-bronze-500/50 bg-gradient-to-br from-charcoal-800 to-charcoal-900 shadow-[0_0_20px_rgba(184,134,11,0.1)]'
                      : 'bg-charcoal-800/50 hover:border-charcoal-600 hover:bg-charcoal-800'
                  } `}
                >
                  {/* Active Indicator Line */}
                  {isSelected && (
                    <div className="absolute bottom-3 left-0 top-3 w-1 rounded-r bg-bronze-500 shadow-[0_0_10px_rgba(184,134,11,0.5)]" />
                  )}

                  {/* Batch mode checkbox */}
                  {batchMode && (
                    <div
                      className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${isSelected ? 'border-bronze-500 bg-bronze-500' : 'border-charcoal-600'}`}
                    >
                      {isSelected && <span className="text-xs text-white">checkmark</span>}
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 font-display text-xl transition-all duration-300 ${
                        isSelected
                          ? 'border-bronze-500 bg-bronze-500/10 text-bronze-500 shadow-inner'
                          : 'border-charcoal-700 bg-charcoal-800 text-charcoal-500 group-hover:border-charcoal-500 group-hover:text-charcoal-300'
                      } `}
                    >
                      {ENGINE_ICONS[engine.id] || '?'}
                    </div>

                    <div className="min-w-0 flex-1 pt-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-medium transition-colors ${isSelected ? 'text-charcoal-100' : 'text-charcoal-300'}`}
                        >
                          {engine.name}
                        </span>
                        {status?.running && (
                          <Clock className="h-3 w-3 animate-spin text-bronze-500" />
                        )}
                        {status?.lastRun && !status.running && (
                          <div className="h-2 w-2 rounded-full bg-status-success shadow-[0_0_5px_rgba(74,154,106,0.6)]" />
                        )}
                        {status?.error && (
                          <div
                            className="h-2 w-2 rounded-full bg-status-critical"
                            title={status.error}
                          />
                        )}
                      </div>
                      <div className="mt-1 line-clamp-2 text-xs text-charcoal-500">
                        {engine.tagline}
                      </div>
                      {status?.findingsCount !== undefined && (
                        <div className="mt-1 text-xs text-bronze-500">
                          {status.findingsCount} findings
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Selected Engine Context */}
          {!batchMode &&
            selectedEngine &&
            ENGINE_REGISTRY[selectedEngine as keyof typeof ENGINE_REGISTRY] && (
              <div className="rounded-xl border border-bronze-500/20 bg-gradient-to-b from-bronze-900/10 to-transparent p-5 backdrop-blur-sm">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-bronze-500">
                  {ENGINE_REGISTRY[selectedEngine as keyof typeof ENGINE_REGISTRY].greek}{' '}
                  METHODOLOGY
                </h3>
                <p className="font-serif text-sm italic leading-relaxed text-charcoal-200">
                  &quot;
                  {ENGINE_REGISTRY[selectedEngine as keyof typeof ENGINE_REGISTRY].keyQuestion}
                  &quot;
                </p>
              </div>
            )}

          {/* Batch Mode Actions */}
          {batchMode && selectedEngines.length > 0 && (
            <div className="rounded-xl border border-bronze-500/20 bg-charcoal-800 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-charcoal-300">
                  {selectedEngines.length} engines selected
                </span>
                <button
                  onClick={clearSelectedEngines}
                  className="text-xs text-charcoal-400 hover:text-charcoal-200"
                >
                  Clear
                </button>
              </div>
              <button
                onClick={handleRunBatch}
                disabled={selectedDocs.length === 0 || currentJob?.status === 'running'}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-bronze-600 to-bronze-700 px-4 py-2.5 font-medium text-white shadow-lg transition-all hover:from-bronze-500 hover:to-bronze-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {currentJob?.status === 'running' ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    <span>Run All Selected</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Center Panel - Main Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Document Selection Strip */}
          <Card className="shrink-0 border-charcoal-700 bg-charcoal-800/30 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-charcoal-700/50 p-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-bronze-500" />
                <h3 className="font-medium text-charcoal-100">Document Corpus</h3>
                <Badge variant="outline" className="ml-2 border-charcoal-600 text-charcoal-400">
                  {selectedDocs.length} selected
                </Badge>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => selectAllDocs(documents?.map(d => d.id) || [])}
                  className="text-xs font-medium text-bronze-500 transition-colors hover:text-bronze-400"
                >
                  Select All
                </button>
                <div className="h-4 w-px bg-charcoal-700" />
                <button
                  onClick={clearSelectedDocs}
                  className="text-xs text-charcoal-400 transition-colors hover:text-charcoal-300"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="scrollbar-thin scrollbar-thumb-charcoal-600 scrollbar-track-transparent flex min-h-[80px] items-center gap-2 overflow-x-auto whitespace-nowrap p-2">
              {documents?.length === 0 ? (
                <div className="w-full py-2 text-center text-sm text-charcoal-500">
                  No documents found. Upload documents to begin analysis.
                </div>
              ) : (
                documents?.map(doc => {
                  const isSelected = selectedDocs.includes(doc.id)
                  return (
                    <label
                      key={doc.id}
                      className={`inline-flex cursor-pointer select-none items-center gap-3 rounded-lg border px-3 py-2 transition-all duration-200 ${
                        isSelected
                          ? 'border-bronze-500/30 bg-bronze-500/10 text-charcoal-100'
                          : 'border-charcoal-700/50 bg-bg-tertiary text-charcoal-400 hover:border-charcoal-600'
                      } `}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDocSelection(doc.id)}
                        className="hidden"
                      />
                      <div
                        className={`h-2 w-2 rounded-full ${isSelected ? 'bg-bronze-500 shadow-[0_0_6px_rgba(184,134,11,0.6)]' : 'bg-charcoal-600'}`}
                      />
                      <span className="max-w-[150px] truncate text-sm font-medium">
                        {doc.filename}
                      </span>
                    </label>
                  )
                })
              )}
            </div>

            {/* Action Bar */}
            {!batchMode && (
              <div className="flex justify-end border-t border-charcoal-700/50 bg-charcoal-900/50 px-4 py-3">
                <button
                  onClick={() => selectedEngine && handleRunEngine(selectedEngine)}
                  disabled={
                    !selectedEngine ||
                    selectedDocs.length === 0 ||
                    engineStatuses[selectedEngine || '']?.running
                  }
                  className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-bronze-600 to-bronze-700 px-6 py-2 font-medium text-white shadow-lg shadow-bronze-900/20 transition-all hover:-translate-y-0.5 hover:from-bronze-500 hover:to-bronze-600 hover:shadow-bronze-500/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
                >
                  {engineStatuses[selectedEngine || '']?.running ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>Execute Analysis</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </Card>

          {/* Results Workspace */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-charcoal-800 bg-bg-secondary/50">
            <Tabs defaultValue="list" className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-charcoal-800 bg-charcoal-900/50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-display text-lg text-charcoal-100">
                    {selectedEngine
                      ? ENGINE_REGISTRY[selectedEngine as keyof typeof ENGINE_REGISTRY]?.name
                      : ''}{' '}
                    Results
                  </h3>
                  <Badge variant="outline" className="border-charcoal-700 text-charcoal-400">
                    {engineFindings.length} Items
                  </Badge>
                </div>

                <div className="flex items-center gap-4">
                  <ExportButton
                    caseId={caseId}
                    disabled={!caseId || !findings || findings.length === 0}
                  />

                  <TabsList className="border border-charcoal-700 bg-charcoal-800 p-1">
                    <TabsTrigger
                      value="list"
                      className="gap-2 data-[state=active]:bg-charcoal-700 data-[state=active]:text-charcoal-100"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      List
                    </TabsTrigger>
                    <TabsTrigger
                      value="timeline"
                      className="gap-2 data-[state=active]:bg-charcoal-700 data-[state=active]:text-charcoal-100"
                      disabled={
                        selectedEngine !== 'narrative' && selectedEngine !== 'temporal_parser'
                      }
                    >
                      <Clock className="h-3.5 w-3.5" />
                      Timeline
                    </TabsTrigger>
                    <TabsTrigger
                      value="network"
                      className="gap-2 data-[state=active]:bg-charcoal-700 data-[state=active]:text-charcoal-100"
                      disabled={selectedEngine !== 'coordination'}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Network
                    </TabsTrigger>
                    <TabsTrigger
                      value="entities"
                      className="gap-2 data-[state=active]:bg-charcoal-700 data-[state=active]:text-charcoal-100"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Entities
                      {pendingCount > 0 && (
                        <Badge variant="info" className="ml-1 px-1.5 py-0 text-[10px]">
                          {pendingCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-charcoal-900/20">
                <TabsContent value="list" className="m-0 h-full">
                  {engineFindings.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-charcoal-700 bg-charcoal-800">
                        <AlertTriangle className="h-8 w-8 text-charcoal-600" />
                      </div>
                      <h4 className="text-lg font-medium text-charcoal-200">
                        No Findings Available
                      </h4>
                      <p className="mt-2 max-w-xs text-sm text-charcoal-400">
                        Select documents and run the {selectedEngine?.replace('_', ' ')} engine to
                        generate analysis results.
                      </p>
                    </div>
                  ) : (
                    <div className="p-6">
                      <FindingsList findings={engineFindings} />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="timeline" className="m-0 h-full p-6">
                  <TimelineView
                    events={engineFindings.map(f => {
                      const narrativeEvidence = asNarrativeEvidence(f.evidence)
                      const driftDirection = narrativeEvidence.driftDirection
                      const type =
                        driftDirection === 'toward_finding'
                          ? 'strengthened'
                          : driftDirection === 'toward_exoneration'
                            ? 'weakened'
                            : 'anomaly'
                      return {
                        id: f.id,
                        date: narrativeEvidence.date || new Date().toISOString(),
                        title: f.title,
                        description: f.description || '',
                        type,
                        severity: toTimelineSeverity(f.severity),
                      }
                    })}
                  />
                </TabsContent>

                <TabsContent value="network" className="m-0 flex h-full flex-col p-6">
                  {(() => {
                    const graph = buildCoordinationGraph(engineFindings)
                    const stats = getGraphStats(graph)

                    return (
                      <>
                        <NetworkGraph nodes={graph.nodes} links={graph.links} />

                        <div className="mt-8 grid grid-cols-3 gap-4">
                          <div className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
                            <div className="mb-1 font-display text-2xl text-status-critical">
                              {stats.independenceViolations}
                            </div>
                            <div className="text-xs uppercase tracking-wide text-charcoal-400">
                              Independence Violations
                            </div>
                          </div>
                          <div className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
                            <div className="mb-1 font-display text-2xl text-bronze-500">
                              {stats.linguisticCollusions}
                            </div>
                            <div className="text-xs uppercase tracking-wide text-charcoal-400">
                              Linguistic Collusions
                            </div>
                          </div>
                          <div className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
                            <div className="mb-1 font-display text-2xl text-charcoal-200">
                              {stats.nodesAnalyzed}
                            </div>
                            <div className="text-xs uppercase tracking-wide text-charcoal-400">
                              Nodes Analyzed
                            </div>
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </TabsContent>

                <TabsContent value="entities" className="m-0 h-full p-6">
                  <EntityLinkagePanel caseId={caseId} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* Right Panel - Context & Export */}
        <div className="flex w-64 shrink-0 flex-col gap-4">
          <h3 className="font-display text-lg text-charcoal-100">Actions & Reports</h3>

          {/* Job Queue Panel - shows when jobs exist */}
          <JobQueuePanel />

          <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
            <div className="mb-3">
              <p className="mb-3 text-xs text-charcoal-400">
                Export analysis findings with legal citations and audit trails.
              </p>
              <ExportButton
                caseId={caseId}
                disabled={!caseId || !findings || findings.length === 0}
                className="w-full"
              />
            </div>
          </Card>

          <Card className="border-charcoal-700 bg-gradient-to-br from-charcoal-800 to-charcoal-900 p-4">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-charcoal-400">
              Run Statistics
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-charcoal-300">Total Findings</span>
                <span className="font-display text-xl text-white">{findings?.length || 0}</span>
              </div>
              <div className="h-px w-full bg-charcoal-700" />
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded border border-status-critical/20 bg-status-critical-bg/20 p-2 text-center">
                  <div className="text-lg font-medium text-status-critical">
                    {findings?.filter(f => f.severity === 'critical').length || 0}
                  </div>
                  <div className="text-[10px] uppercase text-status-critical/80">Critical</div>
                </div>
                <div className="rounded border border-status-high/20 bg-status-high-bg/20 p-2 text-center">
                  <div className="text-lg font-medium text-status-high">
                    {findings?.filter(f => f.severity === 'high').length || 0}
                  </div>
                  <div className="text-[10px] uppercase text-status-high/80">High</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Desktop Mode Indicator */}
          {isDesktop() && (
            <div className="py-2 text-center text-xs text-charcoal-500">
              Desktop Mode - Local Processing
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
