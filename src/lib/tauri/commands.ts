/**
 * Phronesis FCIP - Tauri Command Definitions
 * 
 * Type-safe wrappers for all Tauri IPC commands.
 */

import { getTauriClient, isDesktop, fileToBytes } from './client'
import type { AppSettings, PythonStatus, ClaudeCodeStatus } from './client'
import type {
  Case,
  Document,
  Finding,
  CaseType,
  DocType,
  ProcessingStatus,
  SemanticSearchResult,
  AnalysisResult,
} from '@/CONTRACT'

// Re-export settings types for convenience
export type { AppSettings, PythonStatus, ClaudeCodeStatus }

// ============================================
// Environment-Aware API
// ============================================

/**
 * Get cases - works in both desktop and web modes
 */
export async function getCases(): Promise<Case[]> {
  if (isDesktop()) {
    return getTauriClient().getCases()
  }
  // Web mode: return empty for now (would use Supabase)
  console.log('[Web Mode] getCases - would fetch from Supabase')
  return []
}

/**
 * Get single case by ID
 */
export async function getCase(caseId: string): Promise<Case | null> {
  if (isDesktop()) {
    return getTauriClient().getCase(caseId)
  }
  console.log('[Web Mode] getCase - would fetch from Supabase')
  return null
}

/**
 * Create a new case
 */
export async function createCase(input: {
  reference: string
  name: string
  case_type: CaseType
  description?: string
}): Promise<Case> {
  if (isDesktop()) {
    return getTauriClient().createCase(input)
  }
  throw new Error('Web mode not implemented')
}

/**
 * Delete a case
 */
export async function deleteCase(caseId: string): Promise<void> {
  if (isDesktop()) {
    return getTauriClient().deleteCase(caseId)
  }
  throw new Error('Web mode not implemented')
}

/**
 * Get documents for a case
 */
export async function getDocuments(caseId: string): Promise<Document[]> {
  if (isDesktop()) {
    return getTauriClient().getDocuments(caseId)
  }
  console.log('[Web Mode] getDocuments - would fetch from Supabase')
  return []
}

/**
 * Get single document by ID
 */
export async function getDocument(documentId: string): Promise<Document | null> {
  if (isDesktop()) {
    return getTauriClient().getDocument(documentId)
  }
  return null
}

/**
 * Upload a document (desktop mode)
 */
export async function uploadDocument(
  caseId: string,
  file: File,
  docType?: DocType
): Promise<Document> {
  if (!isDesktop()) {
    throw new Error('Document upload only available in desktop mode')
  }

  const data = await fileToBytes(file)

  return getTauriClient().uploadDocument({
    case_id: caseId,
    filename: file.name,
    file_type: file.type || 'application/octet-stream',
    doc_type: docType,
    data,
  })
}

/**
 * Update document processing status
 */
export async function updateDocumentStatus(
  documentId: string,
  status: ProcessingStatus,
  extractedText?: string
): Promise<Document> {
  if (!isDesktop()) {
    throw new Error('Document update only available in desktop mode')
  }

  return getTauriClient().updateDocumentStatus(documentId, status, extractedText)
}

/**
 * Delete a document
 */
export async function deleteDocument(documentId: string): Promise<void> {
  if (isDesktop()) {
    return getTauriClient().deleteDocument(documentId)
  }
  throw new Error('Web mode not implemented')
}

/**
 * Process a document
 */
export async function processDocument(documentId: string): Promise<Document> {
  if (isDesktop()) {
    return getTauriClient().processDocument(documentId)
  }
  throw new Error('Web mode not implemented')
}

/**
 * Get findings for a case
 */
export async function getFindings(caseId: string): Promise<Finding[]> {
  if (isDesktop()) {
    return getTauriClient().getFindings(caseId)
  }
  console.log('[Web Mode] getFindings - would fetch from Supabase')
  return []
}

/**
 * Get full analysis results
 */
export async function getAnalysis(caseId: string): Promise<AnalysisResult> {
  if (isDesktop()) {
    return getTauriClient().getAnalysis(caseId)
  }
  return { findings: [], entities: [], claims: [], contradictions: [], omissions: [] }
}

/**
 * Run an analysis engine
 */
export async function runEngine(input: {
  case_id: string
  engine_id: string
  document_ids: string[]
  options?: Record<string, unknown>
}) {
  if (!isDesktop()) {
    throw new Error('Engine execution only available in desktop mode')
  }

  return getTauriClient().runEngine(input)
}

/**
 * Save a finding
 */
export async function saveFinding(finding: Finding): Promise<void> {
  if (!isDesktop()) {
    throw new Error('Saving findings only available in desktop mode')
  }

  return getTauriClient().saveFinding(finding)
}

/**
 * Open file picker dialog for document selection
 */
export async function pickDocuments(): Promise<{ path: string; filename: string }[]> {
  if (!isDesktop()) {
    throw new Error('File picker only available in desktop mode')
  }

  return getTauriClient().pickDocuments()
}

/**
 * Upload a document from a file path
 */
export async function uploadFromPath(
  caseId: string,
  filePath: string,
  docType?: DocType
): Promise<Document> {
  if (!isDesktop()) {
    throw new Error('Upload from path only available in desktop mode')
  }

  return getTauriClient().uploadFromPath(caseId, filePath, docType)
}

// ============================================
// Settings Commands
// ============================================

/**
 * Get application settings
 */
export async function getSettings(): Promise<AppSettings> {
  if (!isDesktop()) {
    throw new Error('Settings only available in desktop mode')
  }
  return getTauriClient().getSettings()
}

/**
 * Update application settings
 */
export async function updateSettings(settings: Partial<{
  anthropic_api_key: string
  use_claude_code: boolean
  mock_mode: boolean
  default_model: string
  theme: string
  python_path: string
  venv_path: string
  ocr_script_path: string
}>): Promise<AppSettings> {
  if (!isDesktop()) {
    throw new Error('Settings only available in desktop mode')
  }
  return getTauriClient().updateSettings(settings)
}

/**
 * Check if API key is configured
 */
export async function checkApiKey(): Promise<boolean> {
  if (!isDesktop()) {
    return false
  }
  return getTauriClient().checkApiKey()
}

/**
 * Validate API key format/connection
 */
export async function validateApiKey(): Promise<boolean> {
  if (!isDesktop()) {
    throw new Error('API validation only available in desktop mode')
  }
  return getTauriClient().validateApiKey()
}

/**
 * Check Claude Code CLI status
 */
export async function checkClaudeCodeStatus(): Promise<ClaudeCodeStatus> {
  if (!isDesktop()) {
    return { installed: false, error: 'Only available in desktop mode' }
  }
  return getTauriClient().checkClaudeCodeStatus()
}

/**
 * Check Python environment status
 */
export async function checkPythonStatus(): Promise<PythonStatus> {
  if (!isDesktop()) {
    return {
      available: false,
      path: '',
      venv_active: false,
      ocr_script_found: false,
      error: 'Only available in desktop mode'
    }
  }
  return getTauriClient().checkPythonStatus()
}

// ============================================
// S.A.M. Commands
// ============================================

import type {
  SAMPhase,
  SAMStatus,
  ClaimOrigin,
  ClaimPropagation,
  AuthorityMarker,
  SAMOutcome,
} from '@/CONTRACT'

export interface SAMAnalysisInput {
  case_id: string
  document_ids: string[]
  focus_claims?: string[]
  stop_after_phase?: SAMPhase
}

export interface SAMProgressResult {
  id?: string
  analysis_id: string
  status: SAMStatus
  current_phase: SAMPhase | null
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
}

export interface SAMResultsData {
  origins: ClaimOrigin[]
  propagations: ClaimPropagation[]
  authority_markers: AuthorityMarker[]
  outcomes: SAMOutcome[]
  false_premises: ClaimOrigin[]
  authority_laundering: AuthorityMarker[]
  causation_chains: Array<{
    outcome_id: string
    root_claims: string[]
    propagation_path: string[]
    authority_accumulation: number
  }>
}

/**
 * Run S.A.M. analysis on a case
 */
export async function runSAMAnalysis(input: SAMAnalysisInput): Promise<string> {
  if (!isDesktop()) {
    throw new Error('S.A.M. analysis only available in desktop mode')
  }
  return getTauriClient().runSAMAnalysis(input)
}

/**
 * Get S.A.M. analysis progress
 */
export async function getSAMProgress(analysisId: string): Promise<SAMProgressResult | null> {
  if (!isDesktop()) {
    return null
  }
  const result = await getTauriClient().getSAMProgress(analysisId)
  if (!result) return null

  // Map the raw result to the typed interface
  return {
    id: result.analysis_id,
    analysis_id: result.analysis_id,
    status: result.status as SAMStatus,
    current_phase: result.current_phase as SAMPhase | null,
    anchor_started_at: result.anchor_started_at,
    anchor_completed_at: result.anchor_completed_at,
    inherit_started_at: result.inherit_started_at,
    inherit_completed_at: result.inherit_completed_at,
    compound_started_at: result.compound_started_at,
    compound_completed_at: result.compound_completed_at,
    arrive_started_at: result.arrive_started_at,
    arrive_completed_at: result.arrive_completed_at,
    false_premises_found: result.false_premises_found,
    propagation_chains_found: result.propagation_chains_found,
    authority_accumulations_found: result.authority_accumulations_found,
    outcomes_linked: result.outcomes_linked,
    error_message: result.error_message,
    error_phase: result.error_phase,
  }
}

/**
 * Get S.A.M. analysis results
 */
export async function getSAMResults(analysisId: string): Promise<SAMResultsData | null> {
  if (!isDesktop()) {
    return null
  }
  const result = await getTauriClient().getSAMResults(analysisId)
  if (!result) return null

  const falsePremises = result.origins.filter((origin) => origin.is_false_premise)
  const authorityLaundering = result.authority_markers.filter(
    (marker) => marker.is_authority_laundering
  )

  return {
    origins: result.origins,
    propagations: result.propagations,
    authority_markers: result.authority_markers,
    outcomes: result.outcomes,
    false_premises: falsePremises,
    authority_laundering: authorityLaundering,
    causation_chains: [],
  }
}

/**
 * Search document chunks (semantic search)
 */
export async function searchDocuments(
  query: string,
  caseId: string
): Promise<SemanticSearchResult[]> {
  if (!isDesktop()) {
    throw new Error('Search only available in desktop mode')
  }
  return getTauriClient().searchDocuments(query, caseId)
}

/**
 * Cancel a running S.A.M. analysis
 */
export async function cancelSAMAnalysis(analysisId: string): Promise<void> {
  if (!isDesktop()) {
    throw new Error('S.A.M. cancellation only available in desktop mode')
  }
  return getTauriClient().cancelSAMAnalysis(analysisId)
}

/**
 * Resume an interrupted S.A.M. analysis
 */
export async function resumeSAMAnalysis(analysisId: string): Promise<void> {
  if (!isDesktop()) {
    throw new Error('S.A.M. resume only available in desktop mode')
  }
  return getTauriClient().resumeSAMAnalysis(analysisId)
}
