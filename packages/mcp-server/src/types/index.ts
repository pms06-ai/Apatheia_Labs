/**
 * Phronesis MCP Server Types
 *
 * Shared types for the MCP server and HTTP API
 */

// ═══════════════════════════════════════════════════════════════════════════
// CASCADE Contradiction Types
// ═══════════════════════════════════════════════════════════════════════════

export type CascadeType =
  | 'SELF'              // Internal contradiction within single document
  | 'INTER_DOC'         // Contradictions between documents
  | 'TEMPORAL'          // Timeline/date inconsistencies
  | 'EVIDENTIARY'       // Evidence vs claims mismatch
  | 'MODALITY_SHIFT'    // Tone/certainty changes without justification
  | 'SELECTIVE_CITATION'// Cherry-picked references
  | 'SCOPE_SHIFT'       // Unexplained scope changes
  | 'UNEXPLAINED_CHANGE'// Position changes without justification

export type Severity = 'critical' | 'high' | 'medium' | 'low'

// ═══════════════════════════════════════════════════════════════════════════
// Engine IDs
// ═══════════════════════════════════════════════════════════════════════════

export type EngineId =
  // Core engines
  | 'entity_resolution'
  | 'temporal_parser'
  | 'argumentation'
  | 'bias_detection'
  | 'contradiction'
  | 'accountability_audit'
  | 'professional_tracker'
  // V6.0 priority engines
  | 'omission'
  | 'expert_witness'
  | 'documentary'
  | 'narrative'
  | 'coordination'
  // S.A.M. pipeline
  | 'sam_pipeline'

// ═══════════════════════════════════════════════════════════════════════════
// Common Types
// ═══════════════════════════════════════════════════════════════════════════

export interface ClaimReference {
  documentId: string
  documentName: string
  text: string
  date?: string
  author?: string
  pageRef?: number
}

export interface AnalysisRequest {
  documentIds?: string[]
  content?: string  // Direct content for analysis (alternative to documentIds)
  caseId?: string
  options?: Record<string, unknown>
}

export interface AnalysisResult<T> {
  success: boolean
  data?: T
  error?: string
  duration: number
}

// ═══════════════════════════════════════════════════════════════════════════
// Contradiction Types
// ═══════════════════════════════════════════════════════════════════════════

export interface ContradictionFinding {
  id: string
  type: 'direct' | 'implicit' | 'temporal' | 'quantitative' | 'attributional'
  cascadeType?: CascadeType
  severity: Severity
  claim1: ClaimReference
  claim2: ClaimReference
  explanation: string
  implication: string
  suggestedResolution?: string
}

export interface ContradictionAnalysisResult {
  contradictions: ContradictionFinding[]
  claimClusters: {
    topic: string
    claims: { docId: string; text: string; stance: string }[]
    consensus: boolean
  }[]
  summary: {
    totalContradictions: number
    criticalCount: number
    mostContradictedTopics: string[]
    credibilityImpact: 'severe' | 'moderate' | 'minor' | 'none'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Omission Types
// ═══════════════════════════════════════════════════════════════════════════

export type OmissionCategory =
  | 'exculpatory'    // Evidence favoring defense
  | 'contextual'     // Missing context
  | 'procedural'     // Process/procedure gaps
  | 'temporal'       // Timeline gaps
  | 'contradicting'  // Contradicts included material

export interface OmissionFinding {
  id: string
  category: OmissionCategory
  severity: Severity
  sourceDocumentId: string
  targetDocumentId: string
  omittedContent: string
  context: string
  biasDirection: 'prosecution' | 'defense' | 'neutral'
  impact: string
}

export interface OmissionAnalysisResult {
  omissions: OmissionFinding[]
  biasScore: number  // -1 to +1 (negative = defense, positive = prosecution)
  summary: {
    totalOmissions: number
    byCategory: Record<OmissionCategory, number>
    overallBiasDirection: 'prosecution' | 'defense' | 'neutral'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Bias Types
// ═══════════════════════════════════════════════════════════════════════════

export interface BiasAnalysisResult {
  framingRatio: number
  statisticalSignificance: {
    zScore: number
    pValue: number
  }
  biasIndicators: {
    indicator: string
    count: number
    examples: string[]
  }[]
  summary: {
    overallBias: 'strong' | 'moderate' | 'weak' | 'none'
    direction: 'prosecution' | 'defense' | 'balanced'
    confidence: number
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// S.A.M. Pipeline Types
// ═══════════════════════════════════════════════════════════════════════════

export type SAMPhase = 'anchor' | 'inherit' | 'compound' | 'arrive'

export interface ClaimOrigin {
  claimId: string
  claimText: string
  originType: 'primary_source' | 'professional_opinion' | 'hearsay' | 'speculation' | 'misattribution' | 'fabrication'
  originDocumentId: string
  isFalsePremise: boolean
  confidence: number
}

export interface ClaimPropagation {
  claimId: string
  fromDocumentId: string
  toDocumentId: string
  mutation: 'none' | 'amplification' | 'attenuation' | 'certainty_drift' | 'scope_expansion' | 'context_loss'
  verificationGap: boolean
}

export interface AuthorityMarker {
  claimId: string
  documentId: string
  authorityType: 'court_finding' | 'expert_opinion' | 'official_report' | 'professional_assessment' | 'police_conclusion' | 'agency_determination'
  authorityWeight: number
  isLaundering: boolean
}

export interface SAMOutcome {
  rootClaimId: string
  outcomeType: 'contact_loss' | 'placement_change' | 'service_termination' | 'criminal_charge' | 'reputational_harm' | 'other'
  harmLevel: 'catastrophic' | 'severe' | 'moderate' | 'minor'
  causationStrength: number
  butForAnalysis: string
}

export interface SAMPipelineResult {
  phases: {
    anchor: {
      claimOrigins: ClaimOrigin[]
      falsePremiseCount: number
    }
    inherit: {
      propagations: ClaimPropagation[]
      chainsFound: number
    }
    compound: {
      authorityMarkers: AuthorityMarker[]
      launderingDetected: boolean
    }
    arrive: {
      outcomes: SAMOutcome[]
      catastrophicCount: number
    }
  }
  summary: {
    totalClaims: number
    falsePremises: number
    propagationChains: number
    authorityLaundering: number
    harmfulOutcomes: number
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Database Document Type
// ═══════════════════════════════════════════════════════════════════════════

export interface Document {
  id: string
  case_id: string
  filename: string
  doc_type: string
  extracted_text: string | null
  content_hash: string
  status: string
  created_at: string
  updated_at: string
}
