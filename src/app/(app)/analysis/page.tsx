'use client'

import { useState, useEffect } from 'react'
import { Play, FileText, AlertTriangle, Clock, Share2, Filter, Layers } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { FindingsList } from '@/components/analysis/findings-list'
import { TimelineView } from '@/components/analysis/timeline-view'
import { NetworkGraph } from '@/components/analysis/network-graph'
import { ExportButton } from '@/components/analysis/ExportButton'
import { useDocuments, useFindings, useRunEngine } from '@/hooks/use-api'
import { ENGINE_REGISTRY } from '@/lib/engines/metadata'
import { useCaseStore } from '@/hooks/use-case-store'
import { isDesktop } from '@/lib/tauri'
import toast from 'react-hot-toast'
import { getDataLayer } from '@/lib/data'

// Engine icons mapping
const ENGINE_ICONS: Record<string, string> = {
  contradiction: 'Κ',
  omission: 'Ο',
  expert_witness: 'Ξ',
  narrative: 'Μ',
  coordination: 'Σ',
  entity_resolution: 'Ε',
  temporal_parser: 'Τ',
  argumentation: 'Α',
  bias_detection: 'Β',
  accountability_audit: 'Λ',
  professional_tracker: 'Π',
  documentary: 'Δ'
}

interface EngineStatus {
  running: boolean
  progress: number
  lastRun?: string
  findingsCount?: number
  error?: string
}

interface JobProgress {
  jobId: string
  status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed'
  engines: string[]
  completedEngines: number
  totalEngines: number
  currentEngine?: string
}

export default function AnalysisPage() {
  const { activeCase } = useCaseStore()
  const caseId = activeCase?.id || ''

  const { data: documents } = useDocuments(caseId)
  const { data: findings, refetch: refetchFindings } = useFindings(caseId)
  const runEngineMutation = useRunEngine()

  const [selectedEngine, setSelectedEngine] = useState<string | null>('omission')
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [engineStatuses, setEngineStatuses] = useState<Record<string, EngineStatus>>({})
  const [currentJob, setCurrentJob] = useState<JobProgress | null>(null)
  const [batchMode, setBatchMode] = useState(false)
  const [selectedEngines, setSelectedEngines] = useState<string[]>([])
  const [mockModeWarning, setMockModeWarning] = useState<string | null>(null)

  const engines = Object.values(ENGINE_REGISTRY).filter(e => e.status === 'active')
    .sort((a, b) => {
      // Sort by priority first (V6.0 engines), then alphabetically by name
      const aPriority = a.priority || 99
      const bPriority = b.priority || 99
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }
      return a.name.localeCompare(b.name)
    })

  // Listen to Tauri events for real-time progress
  useEffect(() => {
    if (!isDesktop()) return

    let unlisten: (() => void) | undefined

    async function setupListeners() {
      const { listen } = await import('@tauri-apps/api/event')

      // Job started
      const unlistenStart = await listen<{ job_id: string; engines: string[] }>('engine:job_started', (event) => {
        setCurrentJob({
          jobId: event.payload.job_id,
          status: 'running',
          engines: event.payload.engines,
          completedEngines: 0,
          totalEngines: event.payload.engines.length,
        })
      })

      // Engine progress
      const unlistenProgress = await listen<{
        job_id: string
        engine_id: string
        completed: number
        total: number
      }>('engine:progress', (event) => {
        setCurrentJob(prev => prev ? {
          ...prev,
          currentEngine: event.payload.engine_id,
          completedEngines: event.payload.completed,
        } : null)

        setEngineStatuses(prev => ({
          ...prev,
          [event.payload.engine_id]: {
            running: true,
            progress: Math.round((event.payload.completed / event.payload.total) * 100),
          }
        }))
      })

      // Engine finding
      const unlistenFinding = await listen<{
        job_id: string
        engine_id: string
        finding_count: number
      }>('engine:finding', (event) => {
        setEngineStatuses(prev => ({
          ...prev,
          [event.payload.engine_id]: {
            running: false,
            progress: 100,
            lastRun: new Date().toISOString(),
            findingsCount: event.payload.finding_count,
          }
        }))
        // Refetch findings to update UI
        refetchFindings()
      })

      // Job complete
      const unlistenComplete = await listen<{ job_id: string }>('engine:complete', () => {
        setCurrentJob(prev => prev ? { ...prev, status: 'completed' } : null)
        setTimeout(() => setCurrentJob(null), 3000) // Clear after 3s
        refetchFindings()
      })

      // Engine error
      const unlistenError = await listen<{
        job_id: string
        engine_id: string
        error: string
      }>('engine:error', (event) => {
        setEngineStatuses(prev => ({
          ...prev,
          [event.payload.engine_id]: {
            running: false,
            progress: 0,
            error: event.payload.error,
          }
        }))
      })

      // Mock mode warning
      const unlistenMockMode = await listen<{
        job_id?: string
        message: string
      }>('engine:mock_mode', (event) => {
        setMockModeWarning(event.payload.message)
        toast.error('AI Analysis Unavailable - Using Mock Data', {
          duration: 5000,
          icon: '⚠️',
        })
      })

      unlisten = () => {
        unlistenStart()
        unlistenProgress()
        unlistenFinding()
        unlistenComplete()
        unlistenError()
        unlistenMockMode()
      }
    }

    setupListeners()

    return () => {
      if (unlisten) unlisten()
    }
  }, [refetchFindings])

  const handleRunEngine = async (engineId: string) => {
    if (!caseId || selectedDocs.length === 0) return

    setEngineStatuses(prev => ({
      ...prev,
      [engineId]: { running: true, progress: 0 }
    }))

    try {
      await runEngineMutation.mutateAsync({
        engineId,
        caseId,
        documentIds: selectedDocs
      })

      setEngineStatuses(prev => ({
        ...prev,
        [engineId]: {
          running: false,
          progress: 100,
          lastRun: new Date().toISOString()
        }
      }))

      refetchFindings()
    } catch (error) {
      setEngineStatuses(prev => ({
        ...prev,
        [engineId]: {
          running: false,
          progress: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
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

  const toggleDocSelection = (docId: string) => {
    setSelectedDocs(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    )
  }

  const toggleEngineSelection = (engineId: string) => {
    setSelectedEngines(prev =>
      prev.includes(engineId)
        ? prev.filter(id => id !== engineId)
        : [...prev, engineId]
    )
  }

  const selectAllDocs = () => {
    setSelectedDocs(documents?.map(d => d.id) || [])
  }

  const engineFindings = findings?.filter(f => f.engine === selectedEngine) || []

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Mock Mode Warning Banner */}
      {mockModeWarning && (
        <div className="mx-2 p-3 rounded-lg bg-amber-900/30 border border-amber-500/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <span className="text-sm font-medium text-amber-200">Mock Mode Active</span>
              <span className="text-sm text-amber-300/80 ml-2">
                AI analysis unavailable - findings are placeholder data only. Check sidecar configuration.
              </span>
            </div>
          </div>
          <button
            onClick={() => setMockModeWarning(null)}
            className="text-amber-500 hover:text-amber-400 text-sm px-2"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-1 gap-8 p-2 min-h-0">
      {/* Left Panel - Engine Selector */}
      <div className="w-80 shrink-0 flex flex-col gap-6">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl text-charcoal-100 tracking-tight">Analysis Engines</h2>
            {isDesktop() && (
              <button
                onClick={() => setBatchMode(!batchMode)}
                className={`p-2 rounded-lg transition-colors ${batchMode ? 'bg-bronze-500/20 text-bronze-500' : 'text-charcoal-400 hover:text-charcoal-200'}`}
                title="Toggle batch mode"
              >
                <Layers className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-2 text-sm text-charcoal-400 leading-relaxed">
            {batchMode
              ? 'Select multiple engines to run in batch. Progress will show in real-time.'
              : 'Select an analytic engine to process case documents and extract findings.'}
          </p>
        </div>

        {/* Batch Mode Progress Bar */}
        {currentJob && currentJob.status === 'running' && (
          <div className="rounded-lg bg-charcoal-800 border border-bronze-500/30 p-4 animate-pulse-subtle">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-bronze-500 uppercase tracking-wide">Processing</span>
              <span className="text-sm text-charcoal-200">
                {currentJob.completedEngines}/{currentJob.totalEngines}
              </span>
            </div>
            <div className="w-full h-2 bg-charcoal-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-bronze-600 to-bronze-500 transition-all duration-300"
                style={{ width: `${(currentJob.completedEngines / currentJob.totalEngines) * 100}%` }}
              />
            </div>
            {currentJob.currentEngine && (
              <div className="mt-2 text-xs text-charcoal-400">
                Running: {ENGINE_REGISTRY[currentJob.currentEngine as keyof typeof ENGINE_REGISTRY]?.name || currentJob.currentEngine}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
          {engines.map((engine) => {
            const status = engineStatuses[engine.id]
            const isSelected = batchMode ? selectedEngines.includes(engine.id) : selectedEngine === engine.id

            return (
              <div
                key={engine.id}
                onClick={() => batchMode ? toggleEngineSelection(engine.id) : setSelectedEngine(engine.id)}
                className={`
                  group relative cursor-pointer rounded-xl border border-transparent p-4 transition-all duration-300
                  ${isSelected
                    ? 'bg-gradient-to-br from-charcoal-800 to-charcoal-900 border-bronze-500/50 shadow-[0_0_20px_rgba(184,134,11,0.1)]'
                    : 'bg-charcoal-800/50 hover:bg-charcoal-800 hover:border-charcoal-600'
                  }
                `}
              >
                {/* Active Indicator Line */}
                {isSelected && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-bronze-500 shadow-[0_0_10px_rgba(184,134,11,0.5)]" />
                )}

                {/* Batch mode checkbox */}
                {batchMode && (
                  <div className={`absolute right-3 top-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-bronze-500 bg-bronze-500' : 'border-charcoal-600'}`}>
                    {isSelected && <span className="text-white text-xs">✓</span>}
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className={`
                    flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 font-display text-xl transition-all duration-300
                    ${isSelected
                      ? 'border-bronze-500 bg-bronze-500/10 text-bronze-500 shadow-inner'
                      : 'border-charcoal-700 bg-charcoal-800 text-charcoal-500 group-hover:border-charcoal-500 group-hover:text-charcoal-300'
                    }
                  `}>
                    {ENGINE_ICONS[engine.id] || '?'}
                  </div>

                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-medium transition-colors ${isSelected ? 'text-charcoal-100' : 'text-charcoal-300'}`}>
                        {engine.name}
                      </span>
                      {status?.running && <Clock className="h-3 w-3 animate-spin text-bronze-500" />}
                      {status?.lastRun && !status.running && <div className="h-2 w-2 rounded-full bg-status-success shadow-[0_0_5px_rgba(74,154,106,0.6)]" />}
                      {status?.error && <div className="h-2 w-2 rounded-full bg-status-critical" title={status.error} />}
                    </div>
                    <div className="text-xs text-charcoal-500 mt-1 line-clamp-2">
                      {engine.tagline}
                    </div>
                    {status?.findingsCount !== undefined && (
                      <div className="text-xs text-bronze-500 mt-1">
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
        {!batchMode && selectedEngine && ENGINE_REGISTRY[selectedEngine as keyof typeof ENGINE_REGISTRY] && (
          <div className="rounded-xl border border-bronze-500/20 bg-gradient-to-b from-bronze-900/10 to-transparent p-5 backdrop-blur-sm">
            <h3 className="mb-2 text-xs font-bold text-bronze-500 uppercase tracking-widest">
              {ENGINE_REGISTRY[selectedEngine as keyof typeof ENGINE_REGISTRY].greek} METHODOLOGY
            </h3>
            <p className="text-sm text-charcoal-200 leading-relaxed font-serif italic">
              &quot;{ENGINE_REGISTRY[selectedEngine as keyof typeof ENGINE_REGISTRY].keyQuestion}&quot;
            </p>
          </div>
        )}

        {/* Batch Mode Actions */}
        {batchMode && selectedEngines.length > 0 && (
          <div className="rounded-xl border border-bronze-500/20 bg-charcoal-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-charcoal-300">{selectedEngines.length} engines selected</span>
              <button
                onClick={() => setSelectedEngines([])}
                className="text-xs text-charcoal-400 hover:text-charcoal-200"
              >
                Clear
              </button>
            </div>
            <button
              onClick={handleRunBatch}
              disabled={selectedDocs.length === 0 || currentJob?.status === 'running'}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-bronze-600 to-bronze-700 px-4 py-2.5 font-medium text-white shadow-lg transition-all hover:from-bronze-500 hover:to-bronze-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="flex-1 flex flex-col gap-6 min-w-0">

        {/* Document Selection Strip */}
        <Card className="shrink-0 border-charcoal-700 bg-charcoal-800/30 backdrop-blur-md">
          <div className="flex items-center justify-between p-4 border-b border-charcoal-700/50">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-bronze-500" />
              <h3 className="font-medium text-charcoal-100">Document Corpus</h3>
              <Badge variant="outline" className="ml-2 border-charcoal-600 text-charcoal-400">
                {selectedDocs.length} selected
              </Badge>
            </div>
            <div className="flex gap-3">
              <button onClick={selectAllDocs} className="text-xs font-medium text-bronze-500 hover:text-bronze-400 transition-colors">
                Select All
              </button>
              <div className="w-px h-4 bg-charcoal-700" />
              <button onClick={() => setSelectedDocs([])} className="text-xs text-charcoal-400 hover:text-charcoal-300 transition-colors">
                Clear
              </button>
            </div>
          </div>

          <div className="p-2 overflow-x-auto whitespace-nowrap min-h-[80px] flex items-center gap-2 scrollbar-thin scrollbar-thumb-charcoal-600 scrollbar-track-transparent">
            {documents?.length === 0 ? (
              <div className="w-full text-center text-charcoal-500 text-sm py-2">
                No documents found. Upload documents to begin analysis.
              </div>
            ) : (
              documents?.map((doc) => {
                const isSelected = selectedDocs.includes(doc.id);
                return (
                  <label
                    key={doc.id}
                    className={`
                      inline-flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 border select-none
                      ${isSelected
                        ? 'bg-bronze-500/10 border-bronze-500/30 text-charcoal-100'
                        : 'bg-bg-tertiary border-charcoal-700/50 text-charcoal-400 hover:border-charcoal-600'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleDocSelection(doc.id)}
                      className="hidden"
                    />
                    <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-bronze-500 shadow-[0_0_6px_rgba(184,134,11,0.6)]' : 'bg-charcoal-600'}`} />
                    <span className="text-sm font-medium truncate max-w-[150px]">
                      {doc.filename}
                    </span>
                  </label>
                )
              })
            )}
          </div>

          {/* Action Bar */}
          {!batchMode && (
            <div className="px-4 py-3 bg-charcoal-900/50 border-t border-charcoal-700/50 flex justify-end">
              <button
                onClick={() => selectedEngine && handleRunEngine(selectedEngine)}
                disabled={!selectedEngine || selectedDocs.length === 0 || engineStatuses[selectedEngine || '']?.running}
                className="
                  flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-bronze-600 to-bronze-700 px-6 py-2 
                  font-medium text-white shadow-lg shadow-bronze-900/20 transition-all 
                  hover:from-bronze-500 hover:to-bronze-600 hover:shadow-bronze-500/20 hover:-translate-y-0.5
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none
                "
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
        <div className="flex-1 min-h-0 bg-bg-secondary/50 rounded-xl border border-charcoal-800 overflow-hidden flex flex-col">
          <Tabs defaultValue="list" className="flex flex-col h-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-800 bg-charcoal-900/50">
              <div className="flex items-center gap-3">
                <h3 className="font-display text-lg text-charcoal-100">
                  {selectedEngine ? ENGINE_REGISTRY[selectedEngine as keyof typeof ENGINE_REGISTRY]?.name : ''} Results
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

                <TabsList className="bg-charcoal-800 p-1 border border-charcoal-700">
                <TabsTrigger value="list" className="gap-2 data-[state=active]:bg-charcoal-700 data-[state=active]:text-charcoal-100">
                  <FileText className="h-3.5 w-3.5" />
                  List
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-2 data-[state=active]:bg-charcoal-700 data-[state=active]:text-charcoal-100" disabled={selectedEngine !== 'narrative' && selectedEngine !== 'temporal_parser'}>
                  <Clock className="h-3.5 w-3.5" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="network" className="gap-2 data-[state=active]:bg-charcoal-700 data-[state=active]:text-charcoal-100" disabled={selectedEngine !== 'coordination'}>
                  <Share2 className="h-3.5 w-3.5" />
                  Network
                </TabsTrigger>
              </TabsList>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-charcoal-900/20">
              <TabsContent value="list" className="h-full m-0">
                {engineFindings.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-charcoal-800 flex items-center justify-center mb-4 border border-charcoal-700">
                      <AlertTriangle className="h-8 w-8 text-charcoal-600" />
                    </div>
                    <h4 className="text-lg font-medium text-charcoal-200">No Findings Available</h4>
                    <p className="mt-2 text-sm text-charcoal-400 max-w-xs">
                      Select documents and run the {selectedEngine?.replace('_', ' ')} engine to generate analysis results.
                    </p>
                  </div>
                ) : (
                  <div className="p-6">
                    <FindingsList findings={engineFindings} />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="h-full m-0 p-6">
                <TimelineView events={engineFindings.map((f, i) => ({
                  id: f.id,
                  date: (f.evidence as any)?.date || new Date().toISOString(),
                  title: f.title,
                  description: f.description || '',
                  type: (f.evidence as any)?.driftDirection === 'toward_finding' ? 'strengthened' :
                    (f.evidence as any)?.driftDirection === 'toward_exoneration' ? 'weakened' : 'anomaly',
                  severity: f.severity as any
                }))} />
              </TabsContent>

              <TabsContent value="network" className="h-full m-0 p-6 flex flex-col">
                {(() => {
                  const nodes = new Map<string, { id: string, label: string, type: any }>()
                  const links: any[] = []

                  // Helper to add node if not exists
                  const addNode = (inst: string) => {
                    const id = inst.toLowerCase().replace(/\s+/g, '_')
                    if (!nodes.has(id)) {
                      nodes.set(id, {
                        id,
                        label: inst.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                        type: id.includes('police') ? 'police' :
                          id.includes('social') ? 'social_services' :
                            id.includes('expert') ? 'expert' :
                              id.includes('court') ? 'court' : 'other'
                      })
                    }
                    return id
                  }

                  engineFindings.forEach(f => {
                    const ev = f.evidence as any
                    if (!ev) return

                    // 1. Information Flow
                    if (ev.source && ev.target) {
                      const s = addNode(ev.source)
                      const t = addNode(ev.target)
                      links.push({
                        source: s,
                        target: t,
                        strength: f.severity === 'critical' ? 4 : f.severity === 'high' ? 3 : 1,
                        label: ev.type
                      })
                    }

                    // 2. Independence Violation (clique)
                    if (ev.institutions && Array.isArray(ev.institutions)) {
                      const ids = ev.institutions.map(addNode)
                      for (let i = 0; i < ids.length; i++) {
                        for (let j = i + 1; j < ids.length; j++) {
                          links.push({
                            source: ids[i],
                            target: ids[j],
                            strength: f.severity === 'critical' ? 5 : 3,
                            label: 'Violation'
                          })
                        }
                      }
                    }

                    // 3. Shared Language (clique)
                    if (ev.documents && Array.isArray(ev.documents)) {
                      const insts = new Set<string>()
                      ev.documents.forEach((d: any) => {
                        if (d.institution) insts.add(d.institution)
                      })
                      const ids = Array.from(insts).map(addNode)
                      for (let i = 0; i < ids.length; i++) {
                        for (let j = i + 1; j < ids.length; j++) {
                          links.push({
                            source: ids[i],
                            target: ids[j],
                            strength: f.severity === 'critical' ? 4 : 2,
                            label: 'Shared Lang'
                          })
                        }
                      }
                    }
                  })

                  // Fallback to default nodes if empty (to show something)
                  if (nodes.size === 0) {
                    addNode('police')
                    addNode('social_services')
                    addNode('expert')
                    addNode('court')
                  }

                  const graphNodes = Array.from(nodes.values())

                  return (
                    <>
                      <NetworkGraph nodes={graphNodes} links={links} />

                      <div className="mt-8 grid grid-cols-3 gap-4">
                        <div className="bg-charcoal-800 p-4 rounded-lg border border-charcoal-700">
                          <div className="text-2xl font-display text-status-critical mb-1">
                            {links.filter((l: any) => l.label === 'Violation').length}
                          </div>
                          <div className="text-xs text-charcoal-400 uppercase tracking-wide">Independence Violations</div>
                        </div>
                        <div className="bg-charcoal-800 p-4 rounded-lg border border-charcoal-700">
                          <div className="text-2xl font-display text-bronze-500 mb-1">
                            {links.filter((l: any) => l.label === 'Shared Lang').length}
                          </div>
                          <div className="text-xs text-charcoal-400 uppercase tracking-wide">Linguistic Collusions</div>
                        </div>
                        <div className="bg-charcoal-800 p-4 rounded-lg border border-charcoal-700">
                          <div className="text-2xl font-display text-charcoal-200 mb-1">
                            {nodes.size}
                          </div>
                          <div className="text-xs text-charcoal-400 uppercase tracking-wide">Nodes Analyzed</div>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Right Panel - Context & Export */}
      <div className="w-64 shrink-0 flex flex-col gap-4">
        <h3 className="font-display text-lg text-charcoal-100">Actions & Reports</h3>

        <Card className="p-4 bg-charcoal-800/50 border-charcoal-700">
          <div className="mb-3">
            <p className="text-xs text-charcoal-400 mb-3">
              Export analysis findings with legal citations and audit trails.
            </p>
            <ExportButton
              caseId={caseId}
              disabled={!caseId || !findings || findings.length === 0}
              className="w-full"
            />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-charcoal-800 to-charcoal-900 border-charcoal-700">
          <h4 className="text-xs font-bold text-charcoal-400 uppercase tracking-widest mb-4">Run Statistics</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-charcoal-300">Total Findings</span>
              <span className="text-xl font-display text-white">{findings?.length || 0}</span>
            </div>
            <div className="w-full h-px bg-charcoal-700" />
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-status-critical-bg/20 rounded border border-status-critical/20 text-center">
                <div className="text-lg font-medium text-status-critical">{findings?.filter(f => f.severity === 'critical').length || 0}</div>
                <div className="text-[10px] text-status-critical/80 uppercase">Critical</div>
              </div>
              <div className="p-2 bg-status-high-bg/20 rounded border border-status-high/20 text-center">
                <div className="text-lg font-medium text-status-high">{findings?.filter(f => f.severity === 'high').length || 0}</div>
                <div className="text-[10px] text-status-high/80 uppercase">High</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Desktop Mode Indicator */}
        {isDesktop() && (
          <div className="text-xs text-charcoal-500 text-center py-2">
            🖥️ Desktop Mode — Local Processing
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
