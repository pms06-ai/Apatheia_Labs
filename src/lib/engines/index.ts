/**
 * FCIP Engine Registry AND Execution Logic
 * 
 * Unified interface for execution (SERVER SIDE ONLY)
 */

import { omissionEngine, type OmissionAnalysisResult } from './omission'
import { expertWitnessEngine, type ExpertAnalysisResult } from './expert-witness'
import { contradictionEngine, type ContradictionAnalysisResult } from './contradiction'
import { narrativeEngine, type NarrativeAnalysisResult } from './narrative'
import { coordinationEngine, type CoordinationAnalysisResult } from './coordination'
import { temporalEngine, type TemporalAnalysisResult } from './temporal'
import { entityResolutionEngine, type EntityResolutionResult } from './entity-resolution'
import { documentaryEngine, type DocumentaryAnalysisResult } from './documentary'
import { supabaseAdmin } from '@/lib/supabase/server'
import { type EngineId } from './metadata'

async function fetchDocs(caseId: string, ids: string[]) {
  const { data } = await supabaseAdmin.from('documents').select('*').in('id', ids)
  return data || []
}

// Re-export Metadata for convenience in server files, BUT strictly speaking client files should import from ./metadata directly
export { ENGINE_REGISTRY, getEngine, getActiveEngines, getNewEngines } from './metadata'
export type { EngineId } from './metadata'

// Engine types
export type EngineAnalysisResult =
  | OmissionAnalysisResult
  | ExpertAnalysisResult
  | ContradictionAnalysisResult
  | NarrativeAnalysisResult
  | CoordinationAnalysisResult
  | TemporalAnalysisResult
  | EntityResolutionResult
  | DocumentaryAnalysisResult

export interface EngineRunParams {
  engineId: EngineId
  caseId: string
  documentIds: string[]
  options?: Record<string, any>
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
  const { engineId, caseId, documentIds } = params

  try {
    let result: EngineAnalysisResult | undefined

    switch (engineId) {
      case 'omission': {
        if (documentIds.length < 2) {
          throw new Error('Omission detection requires at least 2 documents (source and target)')
        }
        // For omission, first doc is source, rest are targets
        const results = await omissionEngine.runFullOmissionAnalysis(caseId, documentIds.slice(1), [documentIds[0]])
        result = results[0] // Return first result
        break
      }

      case 'expert_witness': {
        const [reportDocId, instructionDocId] = documentIds
        result = await expertWitnessEngine.analyze(reportDocId, instructionDocId || null, caseId)
        break
      }

      case 'contradiction': {
        const results = await contradictionEngine.detectContradictions(await fetchDocs(caseId, documentIds), caseId)
        result = results
        break
      }

      case 'narrative': {
        const results = await narrativeEngine.analyzeNarrativeEvolution(await fetchDocs(caseId, documentIds), caseId)
        result = results
        break
      }

      case 'coordination': {
        const results = await coordinationEngine.analyzeCoordination(await fetchDocs(caseId, documentIds), caseId)
        result = results
        break
      }

      case 'temporal_parser': {
        const results = await temporalEngine.parseTemporalEvents(await fetchDocs(caseId, documentIds), caseId)
        result = results
        break
      }

      case 'entity_resolution': {
        const results = await entityResolutionEngine.resolveEntities(await fetchDocs(caseId, documentIds), caseId)
        result = results
        break
      }

      case 'documentary': {
        const results = await documentaryEngine.analyzeDocumentaryBias(await fetchDocs(caseId, documentIds), caseId)
        result = results
        break
      }

      default:
        throw new Error(`Unknown engine: ${engineId}`)
    }

    return {
      engineId,
      success: true,
      result,
      duration: Date.now() - startTime
    }
  } catch (error) {
    return {
      engineId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime
    }
  }
}

/**
 * Run multiple engines in parallel
 */
export async function runEngines(
  params: EngineRunParams[]
): Promise<EngineRunResult[]> {
  return Promise.all(params.map(runEngine))
}

// Re-export engine executors
export { omissionEngine } from './omission'
export { expertWitnessEngine, ExpertWitnessEngine } from './expert-witness'
export { temporalEngine } from './temporal'
export { entityResolutionEngine } from './entity-resolution'
export { documentaryEngine } from './documentary'
export type { OmissionAnalysisResult, OmissionFinding } from './omission'
export type { ExpertAnalysisResult, ExpertViolation } from './expert-witness'
export type { TemporalAnalysisResult, TemporalEvent, TemporalInconsistency } from './temporal'
export type { EntityResolutionResult, ResolvedEntity, EntityLinkageProposal, EntityGraphData } from './entity-resolution'
export type { DocumentaryAnalysisResult, DocumentaryFinding } from './documentary'
