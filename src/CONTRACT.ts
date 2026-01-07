// Apatheia Labs — TypeScript Types
// Generated from Supabase schema

export type CaseType = 'family_court' | 'regulatory' | 'criminal' | 'civil' | 'media'
export type CaseStatus = 'active' | 'archived' | 'closed'

export type DocType = 
  | 'court_order' | 'witness_statement' | 'expert_report' | 'police_bundle'
  | 'social_work_assessment' | 'transcript' | 'correspondence' | 'media'
  | 'disclosure' | 'threshold_document' | 'position_statement' | 'other'

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type EntityType = 
  | 'person' | 'organization' | 'professional' | 'institution'
  | 'court' | 'police' | 'social_services' | 'expert' | 'media' | 'other'

export type ClaimType = 'factual' | 'opinion' | 'finding' | 'recommendation' | 'conclusion' | 'allegation'

export type FoundationType = 
  | 'verified' | 'supported' | 'unsupported' | 'contested' 
  | 'circular' | 'contaminated' | 'unfounded'

export type SourceType = 'primary' | 'secondary' | 'derivative' | 'hearsay' | 'expert_opinion'

export type RelationshipType = 
  | 'supports' | 'contradicts' | 'undermines' | 'relies_on' 
  | 'derived_from' | 'ignores' | 'misrepresents'

export type Strength = 'definitive' | 'strong' | 'moderate' | 'weak' | 'asserted'

export type ContradictionType = 'direct' | 'temporal' | 'logical' | 'omission' | 'emphasis'

export type OmissionType = 'selective_quoting' | 'complete_exclusion' | 'context_stripping' | 'cherry_picking'

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export type Engine = 
  | 'entity_resolution' | 'temporal_parser' | 'argumentation' | 'bias_detection'
  | 'contradiction' | 'accountability' | 'professional_tracker' | 'omission'
  | 'expert_witness' | 'documentary' | 'narrative' | 'coordination' | 'evidence_chain'

export type DriftType = 'stable' | 'amplification' | 'minimization' | 'emergence' | 'disappearance' | 'mutation'

// ============================================
// S.A.M. METHODOLOGY TYPES
// ============================================

export type SAMPhase = 'anchor' | 'inherit' | 'compound' | 'arrive'

export type SAMStatus =
  | 'pending' | 'anchor_running' | 'anchor_complete'
  | 'inherit_running' | 'inherit_complete'
  | 'compound_running' | 'compound_complete'
  | 'arrive_running' | 'arrive_complete'
  | 'completed' | 'failed' | 'cancelled'

// ANCHOR Phase types
export type OriginType =
  | 'primary_source' | 'professional_opinion' | 'hearsay'
  | 'speculation' | 'misattribution' | 'fabrication'

export type FalsePremiseType =
  | 'factual_error' | 'misattribution' | 'speculation_as_fact'
  | 'context_stripping' | 'selective_quotation' | 'temporal_distortion'

// INHERIT Phase types
export type PropagationType =
  | 'verbatim' | 'paraphrase' | 'citation'
  | 'implicit_adoption' | 'circular_reference' | 'authority_appeal'

export type MutationType =
  | 'amplification' | 'attenuation' | 'certainty_drift'
  | 'attribution_shift' | 'scope_expansion' | 'scope_contraction'

// COMPOUND Phase types
export type AuthorityType =
  | 'court_finding' | 'expert_opinion' | 'official_report'
  | 'professional_assessment' | 'police_conclusion' | 'agency_determination'

export type EndorsementType =
  | 'explicit_adoption' | 'implicit_reliance'
  | 'qualified_acceptance' | 'referenced_without_verification'

// ARRIVE Phase types
export type OutcomeType =
  | 'court_order' | 'finding_of_fact' | 'recommendation'
  | 'agency_decision' | 'regulatory_action' | 'media_publication'

export type HarmLevel = 'catastrophic' | 'severe' | 'moderate' | 'minor'

// CASCADE 8-Type System
export type CASCADEType =
  | 'SELF' | 'INTER_DOC' | 'TEMPORAL' | 'EVIDENTIARY'
  | 'MODALITY_SHIFT' | 'SELECTIVE_CITATION' | 'SCOPE_SHIFT' | 'UNEXPLAINED_CHANGE'

export type Regulator = 'ofcom' | 'iopc' | 'lgo' | 'ico' | 'hcpc' | 'bps' | 'ofsted' | 'sra' | 'gmc' | 'nmc'

export type SubmissionStatus = 'draft' | 'in_preparation' | 'filed' | 'acknowledged' | 'investigating' | 'concluded'

// ============================================
// DATABASE TYPES
// ============================================

export interface Case {
  id: string
  reference: string
  name: string
  case_type: CaseType
  status: CaseStatus
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  case_id: string
  filename: string
  file_type: string
  file_size: number | null
  storage_path: string
  hash_sha256: string
  acquisition_date: string
  doc_type: DocType | null
  source_entity: string | null
  status: ProcessingStatus
  extracted_text: string | null
  page_count: number | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface DocumentChunk {
  id: string
  document_id: string
  chunk_index: number
  content: string
  page_number: number | null
  embedding: number[] | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface Entity {
  id: string
  case_id: string
  canonical_name: string
  entity_type: EntityType
  aliases: string[]
  role: string | null
  institution: string | null
  professional_registration: string | null
  credibility_score: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface EntityMention {
  id: string
  entity_id: string
  document_id: string
  chunk_id: string
  mention_text: string
  context: string | null
  page_number: number | null
  created_at: string
}

export interface Claim {
  id: string
  case_id: string
  claim_text: string
  claim_type: ClaimType | null
  source_entity_id: string | null
  source_document_id: string | null
  source_page: number | null
  foundation_type: FoundationType | null
  confidence_score: number | null
  claim_date: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface EvidenceSource {
  id: string
  case_id: string
  evidence_number: string
  description: string
  document_id: string | null
  source_type: SourceType | null
  reliability_score: number | null
  acquisition_date: string | null
  acquired_by: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface EvidenceChain {
  id: string
  claim_id: string
  evidence_id: string
  relationship_type: RelationshipType
  strength: Strength | null
  notes: string | null
  created_at: string
}

export interface Contradiction {
  id: string
  case_id: string
  title: string
  description: string | null
  source_a_document_id: string | null
  source_a_entity_id: string | null
  source_a_text: string
  source_a_page: number | null
  source_a_date: string | null
  source_b_document_id: string | null
  source_b_entity_id: string | null
  source_b_text: string
  source_b_page: number | null
  source_b_date: string | null
  contradiction_type: ContradictionType | null
  severity: Severity | null
  resolution: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface Omission {
  id: string
  case_id: string
  title: string
  description: string | null
  omitted_content: string
  source_document_id: string | null
  source_page: number | null
  omitting_document_id: string | null
  omitting_entity_id: string | null
  omission_type: OmissionType | null
  bias_direction: string | null
  severity: Severity | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface Finding {
  id: string
  case_id: string
  engine: Engine
  title: string
  description: string | null
  finding_type: string | null
  severity: Severity | null
  confidence: number | null
  document_ids: string[]
  entity_ids: string[]
  regulatory_targets: string[]
  evidence: Record<string, unknown>
  metadata: Record<string, unknown>
  created_at: string
}

export interface TimelineEvent {
  id: string
  case_id: string
  event_date: string
  event_time: string | null
  date_precision: 'exact' | 'day' | 'week' | 'month' | 'quarter' | 'year'
  description: string
  event_type: string | null
  source_document_id: string | null
  source_page: number | null
  entity_ids: string[]
  is_anomaly: boolean
  anomaly_type: string | null
  anomaly_notes: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface NarrativeVersion {
  id: string
  case_id: string
  claim_subject: string
  version_number: number
  claim_text: string
  source_document_id: string | null
  source_entity_id: string | null
  claim_date: string | null
  drift_type: DriftType | null
  previous_version_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface RegulatorySubmission {
  id: string
  case_id: string
  regulator: Regulator
  status: SubmissionStatus
  reference_number: string | null
  filed_date: string | null
  title: string
  summary: string | null
  content_markdown: string | null
  finding_ids: string[]
  supporting_document_ids: string[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ============================================
// S.A.M. DATABASE TYPES
// ============================================

// ANCHOR Phase: Claim origin tracking
export interface ClaimOrigin {
  id: string
  case_id: string
  claim_id: string
  origin_document_id: string | null
  origin_entity_id: string | null
  origin_date: string
  origin_page: number | null
  origin_context: string | null
  origin_type: OriginType | null
  is_false_premise: boolean
  false_premise_type: FalsePremiseType | null
  contradicting_evidence: string | null
  confidence_score: number | null
  metadata: Record<string, unknown>
  created_at: string
}

// INHERIT Phase: Claim propagation tracking
export interface ClaimPropagation {
  id: string
  case_id: string
  source_claim_id: string | null
  source_document_id: string | null
  source_entity_id: string | null
  source_date: string | null
  target_claim_id: string | null
  target_document_id: string | null
  target_entity_id: string | null
  target_date: string | null
  propagation_type: PropagationType | null
  verification_performed: boolean
  verification_method: string | null
  verification_outcome: string | null
  crossed_institutional_boundary: boolean
  source_institution: string | null
  target_institution: string | null
  mutation_detected: boolean
  mutation_type: MutationType | null
  original_text: string | null
  mutated_text: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// COMPOUND Phase: Authority accumulation tracking
export interface AuthorityMarker {
  id: string
  case_id: string
  claim_id: string
  authority_entity_id: string | null
  authority_document_id: string | null
  authority_date: string | null
  authority_type: AuthorityType | null
  authority_weight: number
  endorsement_type: EndorsementType | null
  is_authority_laundering: boolean
  laundering_path: string | null
  cumulative_authority_score: number | null
  metadata: Record<string, unknown>
  created_at: string
}

// ARRIVE Phase: Outcome mapping
export interface SAMOutcome {
  id: string
  case_id: string
  outcome_type: OutcomeType | null
  outcome_description: string
  outcome_date: string | null
  outcome_document_id: string | null
  harm_level: HarmLevel | null
  harm_description: string | null
  root_claim_ids: string[]
  but_for_analysis: string | null
  causation_confidence: number | null
  remediation_possible: boolean
  remediation_actions: string[]
  metadata: Record<string, unknown>
  created_at: string
}

// S.A.M. Analysis Run (orchestration state)
export interface SAMAnalysis {
  id: string
  case_id: string
  status: SAMStatus
  anchor_started_at: string | null
  anchor_completed_at: string | null
  inherit_started_at: string | null
  inherit_completed_at: string | null
  compound_started_at: string | null
  compound_completed_at: string | null
  arrive_started_at: string | null
  arrive_completed_at: string | null
  document_ids: string[]
  focus_claims: string[]
  false_premises_found: number
  propagation_chains_found: number
  authority_accumulations_found: number
  outcomes_linked: number
  error_message: string | null
  error_phase: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// CASCADE 8-Type contradiction extension
export interface CASCADEContradiction {
  id: string
  case_id: string
  contradiction_id: string | null
  cascade_type: CASCADEType
  detection_method: string | null
  confidence_score: number | null
  affects_anchor: boolean
  affects_inherit: boolean
  affects_compound: boolean
  affects_arrive: boolean
  metadata: Record<string, unknown>
  created_at: string
}

// S.A.M. Phase result types for orchestrator
export interface ANCHORResult {
  origins: ClaimOrigin[]
  false_premises: ClaimOrigin[]
  claims_analyzed: number
  confidence: number
}

export interface INHERITResult {
  propagations: ClaimPropagation[]
  verification_gaps: ClaimPropagation[]
  circular_references: ClaimPropagation[]
  mutations: ClaimPropagation[]
  chains_found: number
}

export interface COMPOUNDResult {
  authority_markers: AuthorityMarker[]
  authority_laundering: AuthorityMarker[]
  cumulative_scores: Record<string, number> // claim_id -> total authority
}

export interface ARRIVEResult {
  outcomes: SAMOutcome[]
  causation_chains: Array<{
    outcome_id: string
    root_claims: string[]
    propagation_path: string[]
    authority_accumulation: number
  }>
}

// ============================================
// API TYPES
// ============================================

export interface SearchResult {
  document_id: string
  filename: string
  doc_type: DocType | null
  relevance: number
  headline: string
}

export interface SemanticSearchResult {
  chunk_id: string
  document_id: string
  content: string
  similarity: number
}

export interface UploadResponse {
  document_id: string
  storage_path: string
  status: ProcessingStatus
}

export interface AnalysisResult {
  findings: Finding[]
  entities: Entity[]
  claims: Claim[]
  contradictions: Contradiction[]
  omissions: Omission[]
}

export interface EngineResult {
  success: boolean
  engineId: Engine
  findings: Finding[]
  durationMs: number
  error?: string
}

// ============================================
// UI TYPES
// ============================================

export interface Tab {
  id: string
  label: string
  icon?: string
}

export interface Badge {
  variant: 'default' | 'critical' | 'high' | 'medium' | 'low' | 'info' | 'success'
  children: React.ReactNode
}

export interface CardProps {
  accent?: boolean
  padding?: number
  onClick?: () => void
  children: React.ReactNode
}
