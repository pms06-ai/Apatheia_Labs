/**
 * FCIP Engine Registry AND Execution Logic
 *
 * All 16 FCIP Engines - Unified interface for execution (SERVER SIDE ONLY)
 *
 * Core Engines (7):
 * - Ε Entity Resolution
 * - Τ Temporal Parser
 * - Α Argumentation
 * - Β Bias Detection
 * - Κ Contradiction
 * - Λ Accountability Audit
 * - Π Professional Tracker
 *
 * V6.0 Priority Engines (5):
 * - Ο Omission Detection (P1)
 * - Ξ Expert Witness (P2)
 * - Δ Documentary Analysis (P3)
 * - Μ Narrative Evolution (P4)
 * - Σ Cross-Institutional (P5)
 *
 * Future Engines (4 - Planned):
 * - Ν Network Analysis (P6)
 * - Μν Institutional Memory (P7)
 * - Λγ Linguistic Analysis (P8)
 * - Βκ Bias Cascade (P9)
 */

// Core engine imports
import { entityResolutionEngine, type EntityResolutionResult } from './entity-resolution'
import { temporalEngine, type TemporalAnalysisResult } from './temporal'
import { argumentationEngine, type ArgumentAnalysisResult } from './argumentation'
import {
  biasDetectionEngine,
  type BiasAnalysisResult,
  type CombinedBiasAnalysis,
} from './bias-detection'
import { contradictionEngine, type ContradictionAnalysisResult } from './contradiction'
import { accountabilityAuditEngine, type AccountabilityAuditResult } from './accountability-audit'
import { professionalTrackerEngine, type ProfessionalTrackingResult } from './professional-tracker'

// V6.0 priority engine imports
import { omissionEngine, type OmissionAnalysisResult } from './omission'
import { expertWitnessEngine, type ExpertAnalysisResult } from './expert-witness'
import { documentaryEngine, type DocumentaryAnalysisResult } from './documentary'
import { narrativeEngine, type NarrativeAnalysisResult } from './narrative'
import { coordinationEngine, type CoordinationAnalysisResult } from './coordination'

// Future engine imports (planned)
import { networkEngine, type NetworkAnalysisResult } from './network'
import { memoryEngine, type MemoryAnalysisResult } from './memory'
import { linguisticEngine, type LinguisticAnalysisResult } from './linguistic'
import { biasCascadeEngine, type BiasCascadeResult } from './bias-cascade'

import { supabaseAdmin } from '@/lib/supabase/server'
import { type EngineId } from './metadata'

async function fetchDocs(caseId: string, ids: string[]) {
  const { data } = await supabaseAdmin.from('documents').select('*').in('id', ids)
  return data || []
}

// Re-export Metadata for convenience in server files
export {
  ENGINE_REGISTRY,
  getEngine,
  getActiveEngines,
  getNewEngines,
  getEngineSummary,
} from './metadata'
export type { EngineId } from './metadata'

// Unified engine result type
export type EngineAnalysisResult =
  // Core engines
  | EntityResolutionResult
  | TemporalAnalysisResult
  | ArgumentAnalysisResult
  | BiasAnalysisResult
  | CombinedBiasAnalysis
  | ContradictionAnalysisResult
  | AccountabilityAuditResult
  | ProfessionalTrackingResult
  // V6.0 engines
  | OmissionAnalysisResult
  | ExpertAnalysisResult
  | DocumentaryAnalysisResult
  | NarrativeAnalysisResult
  | CoordinationAnalysisResult
  // Future engines (planned)
  | NetworkAnalysisResult
  | MemoryAnalysisResult
  | LinguisticAnalysisResult
  | BiasCascadeResult

export interface EngineRunParams {
  engineId: EngineId
  caseId: string
  documentIds: string[]
  options?: Record<string, unknown>
}

export interface EngineRunResult {
  engineId: EngineId
  success: boolean
  result?: EngineAnalysisResult
  error?: string
  duration: number
}

/**
 * Run an analysis engine
 */
export async function runEngine(params: EngineRunParams): Promise<EngineRunResult> {
  const startTime = Date.now()
  const { engineId, caseId, documentIds, options } = params

  try {
    let result: EngineAnalysisResult | undefined

    switch (engineId) {
      // ═══════════════════════════════════════════════════════════════
      // CORE ENGINES
      // ═══════════════════════════════════════════════════════════════

      case 'entity_resolution': {
        const results = await entityResolutionEngine.resolveEntities(
          await fetchDocs(caseId, documentIds),
          caseId
        )
        result = results
        break
      }

      case 'temporal_parser': {
        const results = await temporalEngine.parseTemporalEvents(
          await fetchDocs(caseId, documentIds),
          caseId
        )
        result = results
        break
      }

      case 'argumentation': {
        const docs = await fetchDocs(caseId, documentIds)
        result = await argumentationEngine.analyzeCase(docs, caseId)
        break
      }

      case 'bias_detection': {
        result = await biasDetectionEngine.analyzeCombined(documentIds, caseId)
        break
      }

      case 'contradiction': {
        const results = await contradictionEngine.detectContradictions(
          await fetchDocs(caseId, documentIds),
          caseId
        )
        result = results
        break
      }

      case 'accountability_audit': {
        const institution = (options?.institution as string) || 'Unknown Institution'
        const institutionType = (options?.institutionType as string) || 'local_authority'
        result = await accountabilityAuditEngine.runFullAudit(caseId, [
          {
            institution,
            institutionType: institutionType as 'local_authority',
            documentIds,
          },
        ])
        break
      }

      case 'professional_tracker': {
        const docs = await fetchDocs(caseId, documentIds)
        result = await professionalTrackerEngine.trackProfessionals(docs, caseId)
        break
      }

      // ═══════════════════════════════════════════════════════════════
      // V6.0 PRIORITY ENGINES
      // ═══════════════════════════════════════════════════════════════

      case 'omission': {
        if (documentIds.length < 2) {
          throw new Error('Omission detection requires at least 2 documents (source and target)')
        }
        const results = await omissionEngine.runFullOmissionAnalysis(caseId, documentIds.slice(1), [
          documentIds[0],
        ])
        if (results.length === 0) {
          result = {
            findings: [],
            summary: {
              totalOmissions: 0,
              criticalCount: 0,
              biasScore: 0,
              systematicPattern: false,
              affectedTopics: [],
            },
            methodology: 'Source-to-report comparison with selective quoting detection',
          }
        } else {
          result = results[0]
        }
        break
      }

      case 'expert_witness': {
        const [reportDocId, instructionDocId] = documentIds
        result = await expertWitnessEngine.analyze(reportDocId, instructionDocId || null, caseId)
        break
      }

      case 'documentary': {
        const results = await documentaryEngine.analyzeDocumentaryBias(
          await fetchDocs(caseId, documentIds),
          caseId
        )
        result = results
        break
      }

      case 'narrative': {
        const results = await narrativeEngine.analyzeNarrativeEvolution(
          await fetchDocs(caseId, documentIds),
          caseId
        )
        result = results
        break
      }

      case 'coordination': {
        const results = await coordinationEngine.analyzeCoordination(
          await fetchDocs(caseId, documentIds),
          caseId
        )
        result = results
        break
      }

      // ═══════════════════════════════════════════════════════════════
      // FUTURE ENGINES (Planned - Stub implementations)
      // ═══════════════════════════════════════════════════════════════

      case 'network': {
        result = await networkEngine.analyzeNetwork(await fetchDocs(caseId, documentIds), caseId)
        break
      }

      case 'memory': {
        result = await memoryEngine.analyzeMemory(await fetchDocs(caseId, documentIds), caseId)
        break
      }

      case 'linguistic': {
        result = await linguisticEngine.analyzeLinguistics(
          await fetchDocs(caseId, documentIds),
          caseId
        )
        break
      }

      case 'bias_cascade': {
        result = await biasCascadeEngine.analyzeBiasCascade(
          await fetchDocs(caseId, documentIds),
          caseId
        )
        break
      }

      default:
        throw new Error(`Unknown engine: ${engineId}`)
    }

    return {
      engineId,
      success: true,
      result,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    return {
      engineId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Run multiple engines in parallel
 */
export async function runEngines(params: EngineRunParams[]): Promise<EngineRunResult[]> {
  return Promise.all(params.map(runEngine))
}

/**
 * Run all applicable engines for a document set
 */
export async function runAllEngines(
  caseId: string,
  documentIds: string[],
  options?: {
    excludeEngines?: EngineId[]
    institution?: string
    institutionType?: string
  }
): Promise<EngineRunResult[]> {
  const exclude = new Set(options?.excludeEngines || [])

  const engineParams: EngineRunParams[] = [
    !exclude.has('entity_resolution') && {
      engineId: 'entity_resolution' as EngineId,
      caseId,
      documentIds,
    },
    !exclude.has('temporal_parser') && {
      engineId: 'temporal_parser' as EngineId,
      caseId,
      documentIds,
    },
    !exclude.has('contradiction') && { engineId: 'contradiction' as EngineId, caseId, documentIds },
    !exclude.has('bias_detection') && {
      engineId: 'bias_detection' as EngineId,
      caseId,
      documentIds,
    },
    !exclude.has('narrative') && { engineId: 'narrative' as EngineId, caseId, documentIds },
    !exclude.has('coordination') && { engineId: 'coordination' as EngineId, caseId, documentIds },
    !exclude.has('argumentation') && { engineId: 'argumentation' as EngineId, caseId, documentIds },
    !exclude.has('professional_tracker') && {
      engineId: 'professional_tracker' as EngineId,
      caseId,
      documentIds,
    },
    !exclude.has('accountability_audit') && {
      engineId: 'accountability_audit' as EngineId,
      caseId,
      documentIds,
      options: {
        institution: options?.institution,
        institutionType: options?.institutionType,
      },
    },
  ].filter(Boolean) as EngineRunParams[]

  return runEngines(engineParams)
}

// ═══════════════════════════════════════════════════════════════════════════
// RE-EXPORTS: Engine instances
// ═══════════════════════════════════════════════════════════════════════════

export { entityResolutionEngine } from './entity-resolution'
export { temporalEngine } from './temporal'
export { argumentationEngine } from './argumentation'
export { biasDetectionEngine } from './bias-detection'
export { contradictionEngine } from './contradiction'
export { accountabilityAuditEngine } from './accountability-audit'
export { professionalTrackerEngine } from './professional-tracker'
export { omissionEngine } from './omission'
export { expertWitnessEngine, ExpertWitnessEngine } from './expert-witness'
export { documentaryEngine } from './documentary'
export { narrativeEngine } from './narrative'
export { coordinationEngine } from './coordination'
export { networkEngine } from './network'
export { memoryEngine } from './memory'
export { linguisticEngine } from './linguistic'
export { biasCascadeEngine } from './bias-cascade'

// ═══════════════════════════════════════════════════════════════════════════
// RE-EXPORTS: Types
// ═══════════════════════════════════════════════════════════════════════════

// Entity Resolution
export type {
  EntityResolutionResult,
  ResolvedEntity,
  EntityLinkageProposal,
  EntityGraphData,
} from './entity-resolution'

// Temporal Parser
export type { TemporalAnalysisResult, TemporalEvent, TemporalInconsistency } from './temporal'

// Argumentation
export type {
  ArgumentAnalysisResult,
  ToulminArgument,
  ArgumentChain,
  ArgumentStrength,
} from './argumentation'

// Bias Detection
export type {
  BiasAnalysisResult,
  BiasTestResult,
  BiasDirection,
  EffectSize,
  CombinedBiasAnalysis,
} from './bias-detection'

// Contradiction
export type { ContradictionAnalysisResult, ContradictionFinding } from './contradiction'

// Accountability Audit
export type {
  AccountabilityAuditResult,
  DutyBreach,
  DutyBreachMatrix,
  StatutoryDuty,
  Remedy,
} from './accountability-audit'

// Professional Tracker
export type {
  ProfessionalTrackingResult,
  ProfessionalProfile,
  ConductIncident,
  ReferralRecommendation,
} from './professional-tracker'

// Omission Detection
export type { OmissionAnalysisResult, OmissionFinding } from './omission'

// Expert Witness
export type { ExpertAnalysisResult, ExpertViolation } from './expert-witness'

// Documentary Analysis
export type { DocumentaryAnalysisResult, DocumentaryFinding } from './documentary'

// Narrative Evolution
export type { NarrativeAnalysisResult } from './narrative'

// Coordination
export type {
  CoordinationAnalysisResult,
  SharedLanguageFinding,
  InformationFlowFinding,
} from './coordination'

// Network Analysis (Planned)
export type {
  NetworkAnalysisResult,
  NetworkRelationship,
  NetworkCluster,
  NetworkInfluence,
} from './network'

// Memory Analysis (Planned)
export type { MemoryAnalysisResult, MemoryGap, MemoryTrace, RecordingPattern } from './memory'

// Linguistic Analysis (Planned)
export type {
  LinguisticAnalysisResult,
  HedgingAnalysis,
  CertaintyAnalysis,
  SentimentAnalysis,
} from './linguistic'

// Bias Cascade (Planned)
export type {
  BiasCascadeResult,
  AnchorBias,
  CascadeStep,
  BiasCascadeChain,
  ConfirmationBiasInstance,
} from './bias-cascade'
