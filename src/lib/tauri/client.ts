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
  Contradiction,
  Omission,
  CaseType,
  DocType,
  ProcessingStatus,
} from '@/CONTRACT'

// ============================================
// Environment Detection
// ============================================

/**
 * Check if running in Tauri desktop environment
 */
export const isDesktop = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window
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
  error?: string
}

interface EngineResult {
  success: boolean
  engine_id: string
  findings: Finding[]
  duration_ms: number
  error?: string
}

interface JobProgress {
  job_id: string
  status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed'
  engines: string[]
  completed_engines: number
  total_engines: number
  current_engine?: string
  started_at?: string
  completed_at?: string
}

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
    contradictions: Contradiction[]
    omissions: Omission[]
  }> {
    const result = await this.call<AnalysisResult>('get_analysis', { case_id: caseId })
    if (!result.success) throw new Error(result.error || 'Failed to get analysis')
    return {
      findings: result.findings,
      contradictions: result.contradictions,
      omissions: result.omissions,
    }
  }

  async runEngine(input: {
    case_id: string
    engine_id: string
    document_ids: string[]
    options?: Record<string, unknown>
  }): Promise<EngineResult> {
    const result = await this.call<EngineResult>('run_engine', { input })
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
    }>('get_job_progress', { jobId })
    return result.progress || null
  }

  async cancelJob(jobId: string): Promise<void> {
    const result = await this.call<SubmitAnalysisResult>('cancel_job', { jobId })
    if (!result.success) throw new Error(result.error || 'Failed to cancel job')
  }

  async listJobs(): Promise<JobProgress[]> {
    const result = await this.call<ListJobsResult>('list_jobs')
    if (!result.success) throw new Error(result.error || 'Failed to list jobs')
    return result.jobs
  }

  // ==========================================
  // File Picker Operations
  // ==========================================

  async pickDocuments(): Promise<{ path: string; filename: string }[]> {
    if (!isDesktop()) {
      throw new Error('File picker only available in desktop mode')
    }

    try {
      const { open } = await import('@tauri-apps/plugin-dialog')

      const selected = await open({
        multiple: true,
        filters: [
          {
            name: 'Documents',
            extensions: ['pdf', 'txt', 'md', 'json', 'csv', 'html', 'docx']
          },
          {
            name: 'All Files',
            extensions: ['*']
          }
        ]
      })

      if (!selected) return []

      const paths = Array.isArray(selected) ? selected : [selected]

      return paths.map(path => {
        // Extract filename from path (handles Windows backslashes and Unix slashes)
        const filename = path.split(/[/\\]/).pop() || 'unknown'
        return { path, filename }
      })
    } catch (e) {
      console.error('Failed to pick documents:', e)
      throw new Error('Failed to open file picker')
    }
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

