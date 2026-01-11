/**
 * Phronesis FCIP - Tauri Desktop Client
 * 
 * Provides IPC communication with the Rust backend when running in Tauri.
 * Falls back to mock data in browser mode.
 */

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
  ProcessingStatus,
  SemanticSearchResult,
  JobProgress,
} from '@/CONTRACT'

// ============================================
// Environment Detection
// ============================================

/**
 * Check if running in Tauri desktop environment
 * Tauri 2.x uses __TAURI_INTERNALS__ for IPC
 */
export const isDesktop = (): boolean => {
  if (typeof window === 'undefined') return false
  // Tauri 2.x detection
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window
}

/**
 * Check if running in browser/web mode
 */
export const isWeb = (): boolean => !isDesktop()

// ============================================
// Tauri API Types
// ============================================

interface TauriInvokeOptions {
  [key: string]: unknown
}

interface TauriAPI {
  invoke<T>(cmd: string, args?: TauriInvokeOptions): Promise<T>
}

/**
 * Get Tauri invoke function if available
 */
async function getTauriInvoke(): Promise<TauriAPI['invoke'] | null> {
  if (!isDesktop()) return null

  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke
  } catch {
    console.warn('Failed to load Tauri API')
    return null
  }
}

// ============================================
// Response Types (matching Rust structs)
// ============================================

interface ApiResult<T> {
  success: boolean
  data?: T
  error?: string
}

interface CasesListResult {
  success: boolean
  data: Case[]
  error?: string
}

interface DocumentsListResult {
  success: boolean
  data: Document[]
  error?: string
}

interface FindingsResult {
  success: boolean
  data: Finding[]
  error?: string
}

interface AnalysisResult {
  success: boolean
  findings: Finding[]
  contradictions: Contradiction[]
  omissions: Omission[]
  entities?: Entity[]
  claims?: Claim[]
  error?: string
}

interface EngineRunResponse {
  success: boolean
  engine_id: string
  findings: Finding[]
  duration_ms: number
  error?: string
}

// JobProgress imported from CONTRACT.ts (matches Rust job.rs)

interface SubmitAnalysisResult {
  success: boolean
  job_id?: string
  error?: string
}

interface ListJobsResult {
  success: boolean
  jobs: JobProgress[]
  error?: string
}

interface SearchResponse {
  success: boolean
  results: SemanticSearchResult[]
  error?: string
}

interface PickedFile {
  path: string
  filename: string
}

interface PickFilesResult {
  success: boolean
  files: PickedFile[]
  error?: string
}

// Settings Types (exported for use elsewhere)
export interface PythonConfig {
  python_path?: string
  venv_path?: string
  ocr_script_path?: string
}

export interface AppSettings {
  anthropic_api_key?: string
  use_claude_code: boolean
  mock_mode: boolean
  default_model: string
  theme: string
  python: PythonConfig
}

interface SettingsResponse {
  success: boolean
  settings?: AppSettings
  error?: string
}

export interface PythonStatus {
  available: boolean
  version?: string
  path: string
  venv_active: boolean
  ocr_script_found: boolean
  error?: string
}

export interface ClaudeCodeStatus {
  installed: boolean
  version?: string
  error?: string
}

// ============================================
// Tauri Client Class
// ============================================

/**
 * Tauri client for desktop IPC operations
 */
export class TauriClient {
  private invoke: TauriAPI['invoke'] | null = null
  private initialized = false

  async init(): Promise<void> {
    if (this.initialized) return
    this.invoke = await getTauriInvoke()
    this.initialized = true
  }

  private async call<T>(cmd: string, args?: TauriInvokeOptions): Promise<T> {
    await this.init()

    if (!this.invoke) {
      throw new Error('Tauri API not available - running in browser mode')
    }

    return this.invoke<T>(cmd, args)
  }

  // ==========================================
  // Case Operations
  // ==========================================

  async getCases(): Promise<Case[]> {
    const result = await this.call<CasesListResult>('get_cases')
    if (!result.success) throw new Error(result.error || 'Failed to get cases')
    return result.data
  }

  async getCase(caseId: string): Promise<Case | null> {
    const result = await this.call<ApiResult<Case>>('get_case', { case_id: caseId })
    return result.data ?? null
  }

  async createCase(input: {
    reference: string
    name: string
    case_type: CaseType
    description?: string
  }): Promise<Case> {
    const result = await this.call<ApiResult<Case>>('create_case', { input })
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create case')
    }
    return result.data
  }

  async deleteCase(caseId: string): Promise<void> {
    const result = await this.call<ApiResult<null>>('delete_case', { case_id: caseId })
    if (!result.success) throw new Error(result.error || 'Failed to delete case')
  }

  // ==========================================
  // Document Operations
  // ==========================================

  async getDocuments(caseId: string): Promise<Document[]> {
    const result = await this.call<DocumentsListResult>('get_documents', { case_id: caseId })
    if (!result.success) throw new Error(result.error || 'Failed to get documents')
    return result.data
  }

  async getDocument(documentId: string): Promise<Document | null> {
    const result = await this.call<ApiResult<Document>>('get_document', { document_id: documentId })
    return result.data ?? null
  }

  async uploadDocument(input: {
    case_id: string
    filename: string
    file_type: string
    doc_type?: DocType
    data: number[] // Uint8Array as number array for IPC
  }): Promise<Document> {
    const result = await this.call<ApiResult<Document>>('upload_document', { input })
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to upload document')
    }
    return result.data
  }

  async updateDocumentStatus(
    documentId: string,
    status: ProcessingStatus,
    extractedText?: string
  ): Promise<Document> {
    const result = await this.call<ApiResult<Document>>('update_document_status', {
      document_id: documentId,
      status,
      extracted_text: extractedText,
    })
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to update document status')
    }
    return result.data
  }

  async deleteDocument(documentId: string): Promise<void> {
    const result = await this.call<ApiResult<null>>('delete_document', { document_id: documentId })
    if (!result.success) throw new Error(result.error || 'Failed to delete document')
  }

  async processDocument(documentId: string): Promise<Document> {
    const result = await this.call<ApiResult<Document>>('process_document', { document_id: documentId })
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to process document')
    }
    return result.data
  }

  // ==========================================
  // Analysis Operations
  // ==========================================

  async getFindings(caseId: string): Promise<Finding[]> {
    const result = await this.call<FindingsResult>('get_findings', { case_id: caseId })
    if (!result.success) throw new Error(result.error || 'Failed to get findings')
    return result.data
  }

  async getAnalysis(caseId: string): Promise<{
    findings: Finding[]
    entities: Entity[]
    claims: Claim[]
    contradictions: Contradiction[]
    omissions: Omission[]
  }> {
    const result = await this.call<AnalysisResult>('get_analysis', { case_id: caseId })
    if (!result.success) throw new Error(result.error || 'Failed to get analysis')
    return {
      findings: result.findings,
      entities: result.entities || [],
      claims: result.claims || [],
      contradictions: result.contradictions,
      omissions: result.omissions,
    }
  }

  async runEngine(input: {
    case_id: string
    engine_id: string
    document_ids: string[]
    options?: Record<string, unknown>
  }): Promise<EngineRunResponse> {
    const result = await this.call<EngineRunResponse>('run_engine', { input })
    if (!result.success) throw new Error(result.error || 'Failed to run engine')
    return result
  }

  async saveFinding(finding: Finding): Promise<void> {
    const result = await this.call<FindingsResult>('save_finding', { finding })
    if (!result.success) throw new Error(result.error || 'Failed to save finding')
  }

  // ==========================================
  // Orchestrator Operations (Job-based Analysis)
  // ==========================================

  async submitAnalysis(request: {
    case_id: string
    document_ids: string[]
    engines: string[]
    options?: Record<string, unknown>
  }): Promise<string> {
    const result = await this.call<SubmitAnalysisResult>('submit_analysis', { request })
    if (!result.success || !result.job_id) {
      throw new Error(result.error || 'Failed to submit analysis')
    }
    return result.job_id
  }

  async getJobProgress(jobId: string): Promise<JobProgress | null> {
    const result = await this.call<{
      success: boolean
      progress?: JobProgress
      error?: string
    }>('get_job_progress', { job_id: jobId })
    return result.progress || null
  }

  async cancelJob(jobId: string): Promise<void> {
    const result = await this.call<SubmitAnalysisResult>('cancel_job', { job_id: jobId })
    if (!result.success) throw new Error(result.error || 'Failed to cancel job')
  }

  async listJobs(): Promise<JobProgress[]> {
    const result = await this.call<ListJobsResult>('list_jobs')
    if (!result.success) throw new Error(result.error || 'Failed to list jobs')
    return result.jobs
  }

  async searchDocuments(query: string, caseId: string): Promise<SemanticSearchResult[]> {
    const result = await this.call<SearchResponse>('search_documents', {
      query,
      case_id: caseId,
    })
    if (!result.success) {
      throw new Error(result.error || 'Search failed')
    }
    return result.results
  }

  // ==========================================
  // File Picker Operations
  // ==========================================

  async pickDocuments(): Promise<{ path: string; filename: string }[]> {
    if (!isDesktop()) {
      throw new Error('File picker only available in desktop mode')
    }

    const result = await this.call<PickFilesResult>('pick_documents')
    if (!result.success) {
      throw new Error(result.error || 'Failed to open file picker')
    }

    return result.files || []
  }

  async uploadFromPath(
    caseId: string,
    filePath: string,
    docType?: string
  ): Promise<Document> {
    console.log('[TauriClient] uploadFromPath called:', { caseId, filePath, docType })
    console.log('[TauriClient] isDesktop?', isDesktop())

    try {
      const result = await this.call<ApiResult<Document>>('upload_from_path', {
        case_id: caseId,
        file_path: filePath,
        doc_type: docType,
      })
      console.log('[TauriClient] upload_from_path result:', result)

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to upload document')
      }
      return result.data
    } catch (err) {
      console.error('[TauriClient] uploadFromPath error:', err)
      throw err
    }
  }

  // ==========================================
  // Settings Operations
  // ==========================================

  async getSettings(): Promise<AppSettings> {
    const result = await this.call<SettingsResponse>('get_settings')
    if (!result.success || !result.settings) {
      throw new Error(result.error || 'Failed to get settings')
    }
    return result.settings
  }

  async updateSettings(settings: Partial<{
    anthropic_api_key: string
    use_claude_code: boolean
    mock_mode: boolean
    default_model: string
    theme: string
    python_path: string
    venv_path: string
    ocr_script_path: string
  }>): Promise<AppSettings> {
    const result = await this.call<SettingsResponse>('update_settings', settings)
    if (!result.success || !result.settings) {
      throw new Error(result.error || 'Failed to update settings')
    }
    return result.settings
  }

  async checkApiKey(): Promise<boolean> {
    return this.call<boolean>('check_api_key')
  }

  async validateApiKey(): Promise<boolean> {
    return this.call<boolean>('validate_api_key')
  }

  async checkClaudeCodeStatus(): Promise<ClaudeCodeStatus> {
    return this.call<ClaudeCodeStatus>('check_claude_code_status')
  }

  async checkPythonStatus(): Promise<PythonStatus> {
    return this.call<PythonStatus>('check_python_status')
  }

  // ==========================================
  // S.A.M. Operations (Systematic Adversarial Methodology)
  // ==========================================

  async runSAMAnalysis(input: {
    case_id: string
    document_ids: string[]
    focus_claims?: string[]
    stop_after_phase?: string
  }): Promise<string> {
    const result = await this.call<{
      success: boolean
      analysis_id?: string
      error?: string
    }>('run_sam_analysis', { input })
    if (!result.success || !result.analysis_id) {
      throw new Error(result.error || 'Failed to start S.A.M. analysis')
    }
    return result.analysis_id
  }

  async getSAMProgress(analysisId: string): Promise<{
    analysis_id: string
    status: string
    current_phase: string | null
    anchor_started_at?: string
    anchor_completed_at?: string
    inherit_started_at?: string
    inherit_completed_at?: string
    compound_started_at?: string
    compound_completed_at?: string
    arrive_started_at?: string
    arrive_completed_at?: string
    false_premises_found: number
    propagation_chains_found: number
    authority_accumulations_found: number
    outcomes_linked: number
    error_message?: string
    error_phase?: string
  } | null> {
    const result = await this.call<{
      success: boolean
      progress?: any
      error?: string
    }>('get_sam_progress', { analysis_id: analysisId })
    return result.progress || null
  }

  async getSAMResults(analysisId: string): Promise<{
    origins: any[]
    propagations: any[]
    authority_markers: any[]
    outcomes: any[]
    false_premises: any[]
    authority_laundering: any[]
    causation_chains: any[]
  } | null> {
    const result = await this.call<{
      success: boolean
      results?: any
      error?: string
    }>('get_sam_results', { analysis_id: analysisId })
    return result.results || null
  }

  async cancelSAMAnalysis(analysisId: string): Promise<void> {
    const result = await this.call<{ success: boolean; error?: string }>('cancel_sam_analysis', {
      analysis_id: analysisId
    })
    if (!result.success) throw new Error(result.error || 'Failed to cancel S.A.M. analysis')
  }

  async resumeSAMAnalysis(analysisId: string): Promise<void> {
    const result = await this.call<{ success: boolean; error?: string }>('resume_sam_analysis', {
      analysis_id: analysisId
    })
    if (!result.success) throw new Error(result.error || 'Failed to resume S.A.M. analysis')
  }
}

// ============================================
// Singleton Instance
// ============================================

let _tauriClient: TauriClient | null = null

/**
 * Get the Tauri client singleton
 */
export function getTauriClient(): TauriClient {
  if (!_tauriClient) {
    _tauriClient = new TauriClient()
  }
  return _tauriClient
}

// ============================================
// Helper for File Upload
// ============================================

/**
 * Convert File to array of bytes for Tauri IPC
 */
export async function fileToBytes(file: File): Promise<number[]> {
  const buffer = await file.arrayBuffer()
  return Array.from(new Uint8Array(buffer))
}

