/**
 * Phronesis FCIP - Tauri Command Definitions
 * 
 * Type-safe wrappers for all Tauri IPC commands.
 */

import { getTauriClient, isDesktop, fileToBytes } from './client'
import type {
  Case,
  Document,
  Finding,
  CaseType,
  DocType,
  ProcessingStatus,
} from '@/CONTRACT'

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
export async function getAnalysis(caseId: string) {
  if (isDesktop()) {
    return getTauriClient().getAnalysis(caseId)
  }
  return { findings: [], contradictions: [], omissions: [] }
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
