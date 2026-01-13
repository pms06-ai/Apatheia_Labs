/**
 * S.A.M. (Systematic Adversarial Methodology) Types
 *
 * Internal types for orchestrator and phase implementations
 */

import type {
  SAMPhase,
  SAMStatus,
  SAMAnalysis,
  ClaimOrigin,
  ClaimPropagation,
  AuthorityMarker,
  SAMOutcome,
  ANCHORResult,
  INHERITResult,
  COMPOUNDResult,
  ARRIVEResult,
  Claim,
  Document,
  Entity,
} from '@/CONTRACT'

// Phase execution context
export interface PhaseContext {
  analysisId: string
  caseId: string
  documents: Document[]
  claims: Claim[]
  entities: Entity[]
  focusClaims?: string[] // Specific claims to trace
}

// Phase handler interface
export interface PhaseHandler<TResult> {
  phase: SAMPhase
  execute: (context: PhaseContext, previousResults?: PhaseResults) => Promise<TResult>
  validate: (context: PhaseContext) => Promise<boolean>
}

// Combined results from all phases
export interface PhaseResults {
  anchor?: ANCHORResult
  inherit?: INHERITResult
  compound?: COMPOUNDResult
  arrive?: ARRIVEResult
}

// Orchestrator configuration
export interface SAMOrchestratorConfig {
  caseId: string
  documentIds: string[]
  focusClaims?: string[]
  stopAfterPhase?: SAMPhase // For partial runs
  onPhaseStart?: (phase: SAMPhase) => void
  onPhaseComplete?: (phase: SAMPhase, result: unknown) => void
  onError?: (phase: SAMPhase, error: Error) => void
}

// Phase transition map
export const PHASE_TRANSITIONS: Record<SAMPhase, SAMPhase | null> = {
  anchor: 'inherit',
  inherit: 'compound',
  compound: 'arrive',
  arrive: null, // Terminal phase
}

// Status mapping for each phase
// Note: arrive phase uses 'completed' as its complete status (terminal success state)
export const PHASE_STATUS_MAP: Record<SAMPhase, { running: SAMStatus; complete: SAMStatus }> = {
  anchor: { running: 'anchor_running', complete: 'anchor_complete' },
  inherit: { running: 'inherit_running', complete: 'inherit_complete' },
  compound: { running: 'compound_running', complete: 'compound_complete' },
  arrive: { running: 'arrive_running', complete: 'completed' },
}

// Re-export CONTRACT types for convenience
export type {
  SAMPhase,
  SAMStatus,
  SAMAnalysis,
  ClaimOrigin,
  ClaimPropagation,
  AuthorityMarker,
  SAMOutcome,
  ANCHORResult,
  INHERITResult,
  COMPOUNDResult,
  ARRIVEResult,
}
