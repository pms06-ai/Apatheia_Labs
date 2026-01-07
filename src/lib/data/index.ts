/**
 * Unified Data Layer
 * 
 * Environment-aware data access layer that routes to Tauri IPC (desktop)
 * or provides mock data (web) based on runtime environment.
 * 
 * For Tauri-only builds, this always uses the local SQLite database
 * via the Rust backend.
 */

import { isDesktop } from '@/lib/tauri'
import type {
  Case,
  Document,
  Entity,
  Finding,
  Claim,
  Contradiction,
  Omission,
  CaseType,
  DocType,
  AnalysisResult,
  EngineResult,
  Engine,
  SAMPhase,
  SAMStatus,
  ClaimOrigin,
  ClaimPropagation,
  AuthorityMarker,
  SAMOutcome,
} from '@/CONTRACT'

// ============================================
// Types
// ============================================

export interface CreateCaseInput {
  reference: string
  name: string
  case_type: CaseType
  description?: string
}

export interface UploadDocumentInput {
  caseId: string
  file: File
  docType?: DocType
}

export interface RunEngineInput {
  caseId: string
  engineId: string
  documentIds: string[]
  options?: Record<string, unknown>
}

export interface SubmitAnalysisInput {
  caseId: string
  documentIds: string[]
  engines: string[]
  options?: Record<string, unknown>
}

export interface UpdateEntityLinkageInput {
  linkageId: string
  status: 'confirmed' | 'rejected'
  reviewedBy?: string
}

export interface EntityLinkageUpdate {
  linkageId: string
  status: 'confirmed' | 'rejected'
  reviewedBy?: string
  reviewedAt: string
}

export interface JobProgress {
  jobId: string
  status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed'
  engines: string[]
  completedEngines: number
  totalEngines: number
  currentEngine?: string
  startedAt?: string
  completedAt?: string
}

// ============================================
// S.A.M. Types
// ============================================

export interface SAMAnalysisInput {
  caseId: string
  documentIds: string[]
  focusClaims?: string[]
  stopAfterPhase?: SAMPhase
}

export interface SAMAnalysisProgress {
  analysisId: string
  status: SAMStatus
  currentPhase: SAMPhase | null
  anchorStartedAt?: string
  anchorCompletedAt?: string
  inheritStartedAt?: string
  inheritCompletedAt?: string
  compoundStartedAt?: string
  compoundCompletedAt?: string
  arriveStartedAt?: string
  arriveCompletedAt?: string
  falsePremisesFound: number
  propagationChainsFound: number
  authorityAccumulationsFound: number
  outcomesLinked: number
  errorMessage?: string
  errorPhase?: string
}

export interface SAMAnalysisResult {
  origins: ClaimOrigin[]
  propagations: ClaimPropagation[]
  authorityMarkers: AuthorityMarker[]
  outcomes: SAMOutcome[]
  falsePremises: ClaimOrigin[]
  authorityLaundering: AuthorityMarker[]
  causationChains: Array<{
    outcomeId: string
    rootClaims: string[]
    propagationPath: string[]
    authorityAccumulation: number
  }>
}

// ============================================
// Data Layer Interface
// ============================================

export interface DataLayer {
  // Cases
  getCases(): Promise<Case[]>
  getCase(caseId: string): Promise<Case | null>
  createCase(input: CreateCaseInput): Promise<Case>
  deleteCase(caseId: string): Promise<void>

  // Documents
  getDocuments(caseId: string): Promise<Document[]>
  getDocument(documentId: string): Promise<Document | null>
  uploadDocument(input: UploadDocumentInput): Promise<Document>
  deleteDocument(documentId: string): Promise<void>

  // Entities
  getEntities(caseId: string): Promise<Entity[]>

  // Findings
  getFindings(caseId: string, engine?: string): Promise<Finding[]>

  // Claims
  getClaims(caseId: string): Promise<Claim[]>

  // Contradictions
  getContradictions(caseId: string): Promise<Contradiction[]>

  // Analysis
  getAnalysis(caseId: string): Promise<AnalysisResult>
  runEngine(input: RunEngineInput): Promise<EngineResult>
  
  // Orchestrator (job-based analysis)
  submitAnalysis(input: SubmitAnalysisInput): Promise<string>
  getJobProgress(jobId: string): Promise<JobProgress | null>
  cancelJob(jobId: string): Promise<void>
  listJobs(): Promise<JobProgress[]>

  // S.A.M. (Systematic Adversarial Methodology)
  runSAMAnalysis(input: SAMAnalysisInput): Promise<string>
  getSAMProgress(analysisId: string): Promise<SAMAnalysisProgress | null>
  getSAMResults(analysisId: string): Promise<SAMAnalysisResult | null>
  cancelSAMAnalysis(analysisId: string): Promise<void>
  resumeSAMAnalysis(analysisId: string): Promise<void>

  // Entity Resolution
  updateEntityLinkage(input: UpdateEntityLinkageInput): Promise<EntityLinkageUpdate>
  getEntityLinkageUpdates(caseId: string): Promise<EntityLinkageUpdate[]>
}

// ============================================
// Tauri Implementation
// ============================================

async function createTauriDataLayer(): Promise<DataLayer> {
  const tauri = await import('@/lib/tauri/commands')
  const { getTauriClient } = await import('@/lib/tauri/client')
  const client = getTauriClient()
  
  return {
    // Cases
    async getCases() {
      return tauri.getCases()
    },
    async getCase(caseId: string) {
      return tauri.getCase(caseId)
    },
    async createCase(input: CreateCaseInput) {
      return tauri.createCase(input)
    },
    async deleteCase(caseId: string) {
      return tauri.deleteCase(caseId)
    },

    // Documents
    async getDocuments(caseId: string) {
      return tauri.getDocuments(caseId)
    },
    async getDocument(documentId: string) {
      return tauri.getDocument(documentId)
    },
    async uploadDocument(input: UploadDocumentInput) {
      return tauri.uploadDocument(input.caseId, input.file, input.docType)
    },
    async deleteDocument(documentId: string) {
      return tauri.deleteDocument(documentId)
    },

    // Entities - fetched from analysis results
    async getEntities(caseId: string) {
      // Entities are extracted by the entity_resolution engine
      // For now, return empty - would query entities table via IPC
      console.log('[Tauri] getEntities - querying local database', caseId)
      return []
    },

    // Findings
    async getFindings(caseId: string, _engine?: string) {
      return tauri.getFindings(caseId)
    },

    // Claims
    async getClaims(caseId: string) {
      // Claims are extracted by engines
      console.log('[Tauri] getClaims - querying local database', caseId)
      return []
    },

    // Contradictions
    async getContradictions(caseId: string) {
      const analysis = await tauri.getAnalysis(caseId)
      return analysis.contradictions
    },

    // Analysis
    async getAnalysis(caseId: string) {
      const analysis = await tauri.getAnalysis(caseId)
      return {
        findings: analysis.findings || [],
        entities: analysis.entities || [],
        claims: analysis.claims || [],
        contradictions: analysis.contradictions || [],
        omissions: analysis.omissions || [],
      }
    },
    
    async runEngine(input: RunEngineInput) {
      const result = await tauri.runEngine({
        case_id: input.caseId,
        engine_id: input.engineId,
        document_ids: input.documentIds,
        options: input.options,
      })
      return {
        success: result.success,
        engineId: result.engine_id as Engine,
        findings: result.findings,
        durationMs: result.duration_ms,
        error: result.error,
      }
    },

    // Orchestrator (job-based analysis)
    async submitAnalysis(input: SubmitAnalysisInput) {
      return client.submitAnalysis({
        case_id: input.caseId,
        document_ids: input.documentIds,
        engines: input.engines,
        options: input.options,
      })
    },
    
    async getJobProgress(jobId: string) {
      const progress = await client.getJobProgress(jobId)
      if (!progress) return null
      return {
        jobId: progress.job_id,
        status: progress.status,
        engines: progress.engines,
        completedEngines: progress.completed_engines,
        totalEngines: progress.total_engines,
        currentEngine: progress.current_engine,
        startedAt: progress.started_at,
        completedAt: progress.completed_at,
      }
    },
    
    async cancelJob(jobId: string) {
      return client.cancelJob(jobId)
    },
    
    async listJobs() {
      const jobs = await client.listJobs()
      return jobs.map(j => ({
        jobId: j.job_id,
        status: j.status,
        engines: j.engines,
        completedEngines: j.completed_engines,
        totalEngines: j.total_engines,
        currentEngine: j.current_engine,
        startedAt: j.started_at,
        completedAt: j.completed_at,
      }))
    },

    // S.A.M. (Systematic Adversarial Methodology)
    async runSAMAnalysis(input: SAMAnalysisInput) {
      return tauri.runSAMAnalysis({
        case_id: input.caseId,
        document_ids: input.documentIds,
        focus_claims: input.focusClaims,
        stop_after_phase: input.stopAfterPhase,
      })
    },

    async getSAMProgress(analysisId: string) {
      const progress = await tauri.getSAMProgress(analysisId)
      if (!progress) return null
      return {
        analysisId: progress.analysis_id,
        status: progress.status,
        currentPhase: progress.current_phase,
        anchorStartedAt: progress.anchor_started_at,
        anchorCompletedAt: progress.anchor_completed_at,
        inheritStartedAt: progress.inherit_started_at,
        inheritCompletedAt: progress.inherit_completed_at,
        compoundStartedAt: progress.compound_started_at,
        compoundCompletedAt: progress.compound_completed_at,
        arriveStartedAt: progress.arrive_started_at,
        arriveCompletedAt: progress.arrive_completed_at,
        falsePremisesFound: progress.false_premises_found,
        propagationChainsFound: progress.propagation_chains_found,
        authorityAccumulationsFound: progress.authority_accumulations_found,
        outcomesLinked: progress.outcomes_linked,
        errorMessage: progress.error_message,
        errorPhase: progress.error_phase,
      }
    },

    async getSAMResults(analysisId: string) {
      const results = await tauri.getSAMResults(analysisId)
      if (!results) return null
      return {
        origins: results.origins,
        propagations: results.propagations,
        authorityMarkers: results.authority_markers,
        outcomes: results.outcomes,
        falsePremises: results.false_premises,
        authorityLaundering: results.authority_laundering,
        causationChains: results.causation_chains.map((c: any) => ({
          outcomeId: c.outcome_id,
          rootClaims: c.root_claims,
          propagationPath: c.propagation_path,
          authorityAccumulation: c.authority_accumulation,
        })),
      }
    },

    async cancelSAMAnalysis(analysisId: string) {
      return tauri.cancelSAMAnalysis(analysisId)
    },

    async resumeSAMAnalysis(analysisId: string) {
      return tauri.resumeSAMAnalysis(analysisId)
    },

    // Entity Resolution - persisted to localStorage until Rust backend is implemented
    async updateEntityLinkage(input: UpdateEntityLinkageInput) {
      const update: EntityLinkageUpdate = {
        linkageId: input.linkageId,
        status: input.status,
        reviewedBy: input.reviewedBy,
        reviewedAt: new Date().toISOString(),
      }

      // Store in localStorage for persistence
      const storageKey = 'entity-linkage-updates'
      const existingData = localStorage.getItem(storageKey)
      const updates: Record<string, EntityLinkageUpdate> = existingData
        ? JSON.parse(existingData)
        : {}

      updates[input.linkageId] = update
      localStorage.setItem(storageKey, JSON.stringify(updates))

      return update
    },

    async getEntityLinkageUpdates(_caseId: string) {
      const storageKey = 'entity-linkage-updates'
      const existingData = localStorage.getItem(storageKey)
      if (!existingData) return []

      const updates: Record<string, EntityLinkageUpdate> = JSON.parse(existingData)
      return Object.values(updates)
    },
  }
}

// ============================================
// Mock/Web Implementation (for development only)
// ============================================

function createMockDataLayer(): DataLayer {
  console.warn('[DataLayer] Running in mock mode - no persistence')
  
  return {
    async getCases() { return [] },
    async getCase() { return null },
    async createCase() { throw new Error('Mock mode - use Tauri desktop app') },
    async deleteCase() { throw new Error('Mock mode - use Tauri desktop app') },
    async getDocuments() { return [] },
    async getDocument() { return null },
    async uploadDocument() { throw new Error('Mock mode - use Tauri desktop app') },
    async deleteDocument() { throw new Error('Mock mode - use Tauri desktop app') },
    async getEntities() { return [] },
    async getFindings() { return [] },
    async getClaims() { return [] },
    async getContradictions() { return [] },
    async getAnalysis() { return { findings: [], entities: [], claims: [], contradictions: [], omissions: [] } },
    async runEngine() { throw new Error('Mock mode - use Tauri desktop app') },
    async submitAnalysis() { throw new Error('Mock mode - use Tauri desktop app') },
    async getJobProgress() { return null },
    async cancelJob() { throw new Error('Mock mode - use Tauri desktop app') },
    async listJobs() { return [] },
    // S.A.M.
    async runSAMAnalysis() { throw new Error('Mock mode - use Tauri desktop app') },
    async getSAMProgress() { return null },
    async getSAMResults() { return null },
    async cancelSAMAnalysis() { throw new Error('Mock mode - use Tauri desktop app') },
    async resumeSAMAnalysis() { throw new Error('Mock mode - use Tauri desktop app') },
    // Entity Resolution - use localStorage in mock mode too
    async updateEntityLinkage(input: UpdateEntityLinkageInput) {
      const update: EntityLinkageUpdate = {
        linkageId: input.linkageId,
        status: input.status,
        reviewedBy: input.reviewedBy,
        reviewedAt: new Date().toISOString(),
      }

      const storageKey = 'entity-linkage-updates'
      const existingData = localStorage.getItem(storageKey)
      const updates: Record<string, EntityLinkageUpdate> = existingData
        ? JSON.parse(existingData)
        : {}

      updates[input.linkageId] = update
      localStorage.setItem(storageKey, JSON.stringify(updates))

      return update
    },
    async getEntityLinkageUpdates() {
      const storageKey = 'entity-linkage-updates'
      const existingData = localStorage.getItem(storageKey)
      if (!existingData) return []

      const updates: Record<string, EntityLinkageUpdate> = JSON.parse(existingData)
      return Object.values(updates)
    },
  }
}

// ============================================
// Data Layer Singleton
// ============================================

let _dataLayer: DataLayer | null = null
let _wasDesktop: boolean | null = null

/**
 * Get the data layer singleton
 * Automatically routes to Tauri (desktop) or mock (web)
 * Re-creates data layer if environment changes (e.g., Tauri globals become available)
 */
export async function getDataLayer(): Promise<DataLayer> {
  const currentlyDesktop = isDesktop()

  // Re-create data layer if environment changed (Tauri globals became available)
  if (_dataLayer && _wasDesktop !== currentlyDesktop) {
    console.log('[DataLayer] Environment changed, recreating data layer')
    _dataLayer = null
  }

  if (_dataLayer) return _dataLayer

  _wasDesktop = currentlyDesktop

  if (currentlyDesktop) {
    console.log('[DataLayer] Using Tauri backend (local SQLite)')
    _dataLayer = await createTauriDataLayer()
  } else {
    console.log('[DataLayer] Running in browser - mock mode')
    _dataLayer = createMockDataLayer()
  }

  return _dataLayer
}

/**
 * Synchronous check if we're in desktop mode
 */
export { isDesktop } from '@/lib/tauri'
