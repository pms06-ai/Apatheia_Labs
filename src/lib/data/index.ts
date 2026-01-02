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

export interface AnalysisResult {
  findings: Finding[]
  contradictions: Contradiction[]
  omissions: Omission[]
}

export interface EngineResult {
  success: boolean
  engineId: string
  findings: Finding[]
  durationMs: number
  error?: string
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
      return tauri.getAnalysis(caseId)
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
        engineId: result.engine_id,
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
    async getAnalysis() { return { findings: [], contradictions: [], omissions: [] } },
    async runEngine() { throw new Error('Mock mode - use Tauri desktop app') },
    async submitAnalysis() { throw new Error('Mock mode - use Tauri desktop app') },
    async getJobProgress() { return null },
    async cancelJob() { throw new Error('Mock mode - use Tauri desktop app') },
    async listJobs() { return [] },
  }
}

// ============================================
// Data Layer Singleton
// ============================================

let _dataLayer: DataLayer | null = null

/**
 * Get the data layer singleton
 * Automatically routes to Tauri (desktop) or mock (web)
 */
export async function getDataLayer(): Promise<DataLayer> {
  if (_dataLayer) return _dataLayer

  if (isDesktop()) {
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
