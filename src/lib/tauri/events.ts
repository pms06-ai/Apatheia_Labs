/**
 * Phronesis FCIP - Tauri Event System
 * 
 * Provides listeners for real-time updates from the Rust backend.
 */

import { isDesktop } from './client'
import type { Finding } from '@/CONTRACT'

// ============================================
// Event Types
// ============================================

export interface DocumentProcessingProgress {
  document_id: string
  progress: number
  stage: 'reading_file' | 'extracting_text' | 'chunking' | 'saving'
}

export interface DocumentProcessingComplete {
  document_id: string
  text_length: number
  chunk_count: number
}

export interface DocumentProcessingError {
  document_id: string
  error: string
}

export interface EngineProgress {
  job_id: string
  engine_id: string
  completed: number
  total: number
  status: 'running' | 'completed' | 'failed'
}

export interface EngineFinding {
  job_id: string
  engine_id: string
  finding_count: number
}

export interface EngineError {
  job_id: string
  engine_id: string
  error: string
}

export interface EngineMockMode {
  job_id?: string
  message: string
}

export interface EngineComplete {
  job_id: string
  status: 'completed' | 'failed' | 'cancelled'
}

export interface JobStarted {
  job_id: string
  case_id: string
  engines: string[]
}

// ============================================
// Event Listener Factory
// ============================================

type UnlistenFn = () => void

/**
 * Create an event listener that works in both desktop and web modes
 */
async function createListener<T>(
  event: string,
  callback: (payload: T) => void
): Promise<UnlistenFn> {
  if (!isDesktop()) {
    // Web mode - no Tauri events, return no-op
    console.log(`[Web Mode] Event ${event} not available`)
    return () => {}
  }

  try {
    const { listen } = await import('@tauri-apps/api/event')
    const unlisten = await listen<T>(event, (e) => {
      callback(e.payload)
    })
    return unlisten
  } catch (error) {
    console.warn(`Failed to set up listener for ${event}:`, error)
    return () => {}
  }
}

// ============================================
// Document Processing Events
// ============================================

/**
 * Listen for document processing start
 */
export function onDocumentProcessingStart(
  callback: (documentId: string) => void
): Promise<UnlistenFn> {
  return createListener<string>('document:processing_start', callback)
}

/**
 * Listen for document processing progress updates
 */
export function onDocumentProcessingProgress(
  callback: (progress: DocumentProcessingProgress) => void
): Promise<UnlistenFn> {
  return createListener('document:processing_progress', callback)
}

/**
 * Listen for document processing completion
 */
export function onDocumentProcessingComplete(
  callback: (result: DocumentProcessingComplete) => void
): Promise<UnlistenFn> {
  return createListener('document:processing_complete', callback)
}

/**
 * Listen for document processing errors
 */
export function onDocumentProcessingError(
  callback: (error: DocumentProcessingError) => void
): Promise<UnlistenFn> {
  return createListener('document:processing_error', callback)
}

// ============================================
// Engine Events
// ============================================

/**
 * Listen for analysis job started
 */
export function onJobStarted(
  callback: (job: JobStarted) => void
): Promise<UnlistenFn> {
  return createListener('engine:job_started', callback)
}

/**
 * Listen for engine progress updates
 */
export function onEngineProgress(
  callback: (progress: EngineProgress) => void
): Promise<UnlistenFn> {
  return createListener('engine:progress', callback)
}

/**
 * Listen for new findings from an engine
 */
export function onEngineFinding(
  callback: (finding: EngineFinding) => void
): Promise<UnlistenFn> {
  return createListener('engine:finding', callback)
}

/**
 * Listen for engine/job completion
 */
export function onEngineComplete(
  callback: (result: EngineComplete) => void
): Promise<UnlistenFn> {
  return createListener('engine:complete', callback)
}

/**
 * Listen for engine errors
 */
export function onEngineError(
  callback: (error: EngineError) => void
): Promise<UnlistenFn> {
  return createListener('engine:error', callback)
}

/**
 * Listen for mock mode warnings
 */
export function onEngineMockMode(
  callback: (payload: EngineMockMode) => void
): Promise<UnlistenFn> {
  return createListener('engine:mock_mode', callback)
}

/**
 * Listen for job cancellation
 */
export function onEngineCancelled(
  callback: (payload: { job_id: string }) => void
): Promise<UnlistenFn> {
  return createListener('engine:cancelled', callback)
}

// ============================================
// Combined Event Manager
// ============================================

export interface EventListeners {
  unlistenAll: () => void
}

/**
 * Set up all event listeners at once
 * Returns a function to clean up all listeners
 */
export async function setupEventListeners(handlers: {
  onDocumentProgress?: (progress: DocumentProcessingProgress) => void
  onDocumentComplete?: (result: DocumentProcessingComplete) => void
  onDocumentError?: (error: DocumentProcessingError) => void
  onJobStarted?: (job: JobStarted) => void
  onEngineProgress?: (progress: EngineProgress) => void
  onEngineFinding?: (finding: EngineFinding) => void
  onEngineComplete?: (result: EngineComplete) => void
  onEngineError?: (error: EngineError) => void
  onEngineMockMode?: (payload: EngineMockMode) => void
}): Promise<EventListeners> {
  const unlisteners: UnlistenFn[] = []

  if (handlers.onDocumentProgress) {
    unlisteners.push(await onDocumentProcessingProgress(handlers.onDocumentProgress))
  }
  if (handlers.onDocumentComplete) {
    unlisteners.push(await onDocumentProcessingComplete(handlers.onDocumentComplete))
  }
  if (handlers.onDocumentError) {
    unlisteners.push(await onDocumentProcessingError(handlers.onDocumentError))
  }
  if (handlers.onJobStarted) {
    unlisteners.push(await onJobStarted(handlers.onJobStarted))
  }
  if (handlers.onEngineProgress) {
    unlisteners.push(await onEngineProgress(handlers.onEngineProgress))
  }
  if (handlers.onEngineFinding) {
    unlisteners.push(await onEngineFinding(handlers.onEngineFinding))
  }
  if (handlers.onEngineComplete) {
    unlisteners.push(await onEngineComplete(handlers.onEngineComplete))
  }
  if (handlers.onEngineError) {
    unlisteners.push(await onEngineError(handlers.onEngineError))
  }
  if (handlers.onEngineMockMode) {
    unlisteners.push(await onEngineMockMode(handlers.onEngineMockMode))
  }

  return {
    unlistenAll: () => {
      unlisteners.forEach((fn) => fn())
    },
  }
}

