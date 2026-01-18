// Apatheia Labs — TypeScript Types
// Generated from Supabase schema

export type CaseType = 'family_court' | 'regulatory' | 'criminal' | 'civil' | 'media'
export type CaseStatus = 'active' | 'archived' | 'closed'

export type DocType =
  | 'court_order'
  | 'witness_statement'
  | 'expert_report'
  | 'police_bundle'
  | 'social_work_assessment'
  | 'transcript'
  | 'correspondence'
  | 'media'
  | 'disclosure'
  | 'threshold_document'
  | 'position_statement'
  | 'other'

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type EntityType =
  | 'person'
  | 'organization'
  | 'professional'
  | 'institution'
  | 'court'
  | 'police'
  | 'social_services'
  | 'expert'
  | 'media'
  | 'other'

export type ClaimType =
  | 'factual'
  | 'opinion'
  | 'finding'
  | 'recommendation'
  | 'conclusion'
  | 'allegation'

export type FoundationType =
  | 'verified'
  | 'supported'
  | 'unsupported'
  | 'contested'
  | 'circular'
  | 'contaminated'
  | 'unfounded'

export type SourceType = 'primary' | 'secondary' | 'derivative' | 'hearsay' | 'expert_opinion'

export type RelationshipType =
  | 'supports'
  | 'contradicts'
  | 'undermines'
  | 'relies_on'
  | 'derived_from'
  | 'ignores'
  | 'misrepresents'

export type Strength = 'definitive' | 'strong' | 'moderate' | 'weak' | 'asserted'

export type ContradictionType = 'direct' | 'temporal' | 'logical' | 'omission' | 'emphasis'

export type OmissionType =
  | 'selective_quoting'
  | 'complete_exclusion'
  | 'context_stripping'
  | 'cherry_picking'

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export type Engine =
  | 'entity_resolution'
  | 'temporal_parser'
  | 'argumentation'
  | 'bias_detection'
  | 'contradiction'
  | 'accountability'
  | 'professional_tracker'
  | 'omission'
  | 'expert_witness'
  | 'documentary'
  | 'narrative'
  | 'coordination'
  | 'evidence_chain'

export type DriftType =
  | 'stable'
  | 'amplification'
  | 'minimization'
  | 'emergence'
  | 'disappearance'
  | 'mutation'

// ============================================
// S.A.M. METHODOLOGY TYPES
// ============================================

export type SAMPhase = 'anchor' | 'inherit' | 'compound' | 'arrive'

// Note: arrive phase transitions directly to 'completed' (no arrive_complete state)
export type SAMStatus =
  | 'pending'
  | 'anchor_running'
  | 'anchor_complete'
  | 'inherit_running'
  | 'inherit_complete'
  | 'compound_running'
  | 'compound_complete'
  | 'arrive_running'
  | 'completed' // Terminal success state (after arrive completes)
  | 'failed'
  | 'cancelled'

// ANCHOR Phase types
export type OriginType =
  | 'primary_source'
  | 'professional_opinion'
  | 'hearsay'
  | 'speculation'
  | 'misattribution'
  | 'fabrication'

export type FalsePremiseType =
  | 'factual_error'
  | 'misattribution'
  | 'speculation_as_fact'
  | 'context_stripping'
  | 'selective_quotation'
  | 'temporal_distortion'

// INHERIT Phase types
export type PropagationType =
  | 'verbatim'
  | 'paraphrase'
  | 'citation'
  | 'implicit_adoption'
  | 'circular_reference'
  | 'authority_appeal'

export type MutationType =
  | 'amplification'
  | 'attenuation'
  | 'certainty_drift'
  | 'attribution_shift'
  | 'scope_expansion'
  | 'scope_contraction'

// COMPOUND Phase types
export type AuthorityType =
  | 'court_finding'
  | 'expert_opinion'
  | 'official_report'
  | 'professional_assessment'
  | 'police_conclusion'
  | 'agency_determination'

export type EndorsementType =
  | 'explicit_adoption'
  | 'implicit_reliance'
  | 'qualified_acceptance'
  | 'referenced_without_verification'

// ARRIVE Phase types
export type OutcomeType =
  | 'court_order'
  | 'finding_of_fact'
  | 'recommendation'
  | 'agency_decision'
  | 'regulatory_action'
  | 'media_publication'

export type HarmLevel = 'catastrophic' | 'severe' | 'moderate' | 'minor'

// CASCADE 8-Type System
export type CASCADEType =
  | 'SELF'
  | 'INTER_DOC'
  | 'TEMPORAL'
  | 'EVIDENTIARY'
  | 'MODALITY_SHIFT'
  | 'SELECTIVE_CITATION'
  | 'SCOPE_SHIFT'
  | 'UNEXPLAINED_CHANGE'

export type Regulator =
  | 'ofcom'
  | 'iopc'
  | 'lgo'
  | 'ico'
  | 'hcpc'
  | 'bps'
  | 'ofsted'
  | 'sra'
  | 'gmc'
  | 'nmc'

export type SubmissionStatus =
  | 'draft'
  | 'in_preparation'
  | 'filed'
  | 'acknowledged'
  | 'investigating'
  | 'concluded'

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
// Source: src-tauri/src/db/schema.rs:497-514
export interface ClaimOrigin {
  id: string
  case_id: string
  claim_id: string
  origin_document_id: string // Required in Rust/SQL
  origin_entity_id: string | null
  origin_date: string
  origin_page: number | null
  origin_context: string | null
  origin_type: OriginType // Required in Rust/SQL (has CHECK constraint)
  is_false_premise: boolean
  false_premise_type: FalsePremiseType | null
  contradicting_evidence: string | null
  confidence_score: number // Required in Rust (defaults to 0.5)
  metadata: Record<string, unknown>
  created_at: string
}

// INHERIT Phase: Claim propagation tracking
// Source: src-tauri/src/db/schema.rs:516-541
export interface ClaimPropagation {
  id: string
  case_id: string
  source_claim_id: string // Required in Rust/SQL
  source_document_id: string // Required in Rust/SQL
  source_entity_id: string | null
  source_date: string // Required in Rust/SQL
  target_claim_id: string | null
  target_document_id: string // Required in Rust/SQL
  target_entity_id: string | null
  target_date: string // Required in Rust/SQL
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
// Source: src-tauri/src/db/schema.rs:543-559
export interface AuthorityMarker {
  id: string
  case_id: string
  claim_id: string
  authority_entity_id: string | null
  authority_document_id: string // Required in Rust/SQL
  authority_date: string // Required in Rust/SQL
  authority_type: AuthorityType // Required in Rust/SQL (has CHECK constraint)
  authority_weight: number
  endorsement_type: EndorsementType | null
  is_authority_laundering: boolean
  laundering_path: string | null
  cumulative_authority_score: number | null
  metadata: Record<string, unknown>
  created_at: string
}

// ARRIVE Phase: Outcome mapping
// Source: src-tauri/src/db/schema.rs:561-578
export interface SAMOutcome {
  id: string
  case_id: string
  outcome_type: OutcomeType // Required in Rust/SQL (has CHECK constraint)
  outcome_description: string
  outcome_date: string | null
  outcome_document_id: string // Required in Rust/SQL
  harm_level: HarmLevel // Required in Rust/SQL (has CHECK constraint)
  harm_description: string | null
  root_claim_ids: string[]
  but_for_analysis: string | null
  causation_confidence: number // Required in Rust (defaults to 0.5)
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

/**
 * S.A.M. analysis checkpoint for resumable long-running analysis
 * Rust: src-tauri/src/db/schema.rs::SAMCheckpoint
 * Used for checkpointing phase progress during S.A.M. analysis runs
 */
export interface SAMCheckpoint {
  id: string
  analysis_id: string
  phase: SAMPhase
  data: string // JSON serialized phase results
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
// JOB PROGRESS (matches Rust orchestrator/job.rs)
// ============================================

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

/**
 * Job progress from Rust backend (snake_case via serde)
 * Source of truth: src-tauri/src/orchestrator/job.rs:126-137
 */
export interface JobProgress {
  job_id: string
  case_id: string
  status: JobStatus
  total_engines: number
  completed_engines: number
  succeeded_engines: number
  failed_engines: number
  duration_ms: number | null
  current_engine: string | null
}

// ============================================
// APPLICATION ERROR TYPES
// ============================================

/**
 * Application error type for consistent error handling across IPC.
 * Rust: src-tauri/src/error.rs::AppError
 *
 * Serialized from Rust as:
 * { "error_type": "Database", "message": "Connection failed" }
 */
export type AppErrorType =
  | 'Database'
  | 'Storage'
  | 'Ai'
  | 'Validation'
  | 'NotFound'
  | 'Unauthorized'
  | 'Processing'
  | 'Sidecar'
  | 'Cancelled'

export interface AppError {
  error_type: AppErrorType
  message: string
}

// ============================================
// SETTINGS TYPES
// ============================================

/**
 * Python environment configuration
 * Rust: src-tauri/src/commands/settings.rs::PythonConfig
 */
export interface PythonConfig {
  python_path?: string | null
  venv_path?: string | null
  ocr_script_path?: string | null
}

/**
 * Application settings (stored locally, non-sensitive)
 * Rust: src-tauri/src/commands/settings.rs::AppSettings
 * Note: API keys are stored in OS keyring, not in this struct
 */
export interface AppSettings {
  has_api_key: boolean
  use_claude_code: boolean
  mock_mode: boolean
  default_model: string
  theme: string
  python: PythonConfig
}

/**
 * Settings response sent to frontend (includes masked API key for display)
 * Rust: src-tauri/src/commands/settings.rs::AppSettingsResponse
 */
export interface AppSettingsResponse {
  has_api_key: boolean
  anthropic_api_key_masked?: string | null
  use_claude_code: boolean
  mock_mode: boolean
  default_model: string
  theme: string
  python: PythonConfig
}

/**
 * Claude Code CLI installation status
 * Rust: src-tauri/src/commands/settings.rs::ClaudeCodeStatus
 */
export interface ClaudeCodeStatus {
  installed: boolean
  version?: string | null
  error?: string | null
}

/**
 * Python environment status
 * Rust: src-tauri/src/commands/settings.rs::PythonStatus
 */
export interface PythonStatus {
  available: boolean
  version?: string | null
  path: string
  venv_active: boolean
  ocr_script_found: boolean
  error?: string | null
}

/**
 * Response wrapper for settings commands
 * Rust: src-tauri/src/commands/settings.rs::SettingsResponse
 */
export interface SettingsResponse {
  success: boolean
  settings?: AppSettingsResponse | null
  error?: string | null
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

/**
 * Raw analysis result from Rust backend
 * Source: src-tauri/src/commands/analysis.rs:86-92
 * Note: Rust only returns findings, contradictions, omissions
 */
export interface RustAnalysisResult {
  success: boolean
  findings: Finding[]
  contradictions: Contradiction[]
  omissions: Omission[]
  error?: string
}

/**
 * Extended analysis result for UI consumption
 * client.ts transforms RustAnalysisResult by adding empty entities/claims arrays
 */
export interface AnalysisResult {
  findings: Finding[]
  entities: Entity[] // Populated client-side, not from Rust
  claims: Claim[] // Populated client-side, not from Rust
  contradictions: Contradiction[]
  omissions: Omission[]
}

/**
 * Engine result from Rust backend (snake_case via serde)
 * Source: src-tauri/src/commands/analysis.rs:69-76
 */
export interface RustEngineResult {
  success: boolean
  engine_id: string // snake_case from Rust
  findings: Finding[]
  duration_ms: number // snake_case from Rust
  error?: string
}

/**
 * Engine result transformed to camelCase for UI consumption
 * Used by data layer after transforming RustEngineResult
 */
export interface EngineResult {
  success: boolean
  engineId: Engine
  findings: Finding[]
  durationMs: number
  error?: string
}

// ============================================
// NATIVE RUST ENGINE TYPES
// ============================================

/**
 * Rust: src-tauri/src/engines/contradiction.rs::ContradictionType
 */
export type NativeContradictionType =
  | 'direct'
  | 'implicit'
  | 'temporal'
  | 'quantitative'
  | 'attributional'

/**
 * Rust: src-tauri/src/engines/contradiction.rs::Severity
 */
export type NativeSeverity = 'critical' | 'high' | 'medium' | 'low'

/**
 * Rust: src-tauri/src/engines/contradiction.rs::ClaimReference
 */
export interface ClaimReference {
  document_id: string
  document_name: string
  text: string
  date?: string | null
  author?: string | null
  page_ref?: number | null
}

/**
 * Rust: src-tauri/src/engines/contradiction.rs::ContradictionFinding
 */
export interface NativeContradictionFinding {
  id: string
  type: NativeContradictionType
  severity: NativeSeverity
  claim1: ClaimReference
  claim2: ClaimReference
  explanation: string
  implication: string
  suggested_resolution?: string | null
}

/**
 * Rust: src-tauri/src/engines/contradiction.rs::ClaimCluster
 */
export interface ClaimCluster {
  topic: string
  claims: Array<{ doc_id: string; text: string; stance: string }>
  consensus: boolean
}

/**
 * Rust: src-tauri/src/engines/contradiction.rs::CredibilityImpact
 */
export type CredibilityImpact = 'severe' | 'moderate' | 'minor' | 'none'

/**
 * Rust: src-tauri/src/engines/contradiction.rs::AnalysisSummary
 */
export interface ContradictionSummary {
  total_contradictions: number
  critical_count: number
  most_contradicted_topics: string[]
  credibility_impact: CredibilityImpact
}

/**
 * Rust: src-tauri/src/engines/contradiction.rs::ContradictionAnalysisResult
 */
export interface NativeContradictionAnalysisResult {
  contradictions: NativeContradictionFinding[]
  claim_clusters: ClaimCluster[]
  summary: ContradictionSummary
  /** Whether this result was generated from mock data (true) or real AI analysis (false) */
  is_mock: boolean
}

/**
 * Rust: src-tauri/src/commands/analysis.rs::ContradictionEngineResult
 */
export interface ContradictionEngineResult {
  success: boolean
  analysis?: NativeContradictionAnalysisResult | null
  duration_ms: number
  /** Whether this result was generated from mock data (true) or real AI analysis (false) */
  is_mock: boolean
  error?: string | null
}

/**
 * Rust: src-tauri/src/engines/contradiction.rs::ClaimComparisonResult
 */
export interface ClaimComparisonResult {
  contradicts: boolean
  contradiction_type?: NativeContradictionType | null
  explanation: string
  severity?: NativeSeverity | null
}

/**
 * Rust: src-tauri/src/commands/analysis.rs::CompareClaimsResult
 */
export interface CompareClaimsResponse {
  success: boolean
  comparison?: ClaimComparisonResult | null
  error?: string | null
}

// ============================================
// NATIVE OMISSION ENGINE TYPES
// ============================================

/**
 * Rust: src-tauri/src/engines/omission.rs::OmissionType
 */
export type NativeOmissionType =
  | 'selective_quoting'
  | 'complete_exclusion'
  | 'context_stripping'
  | 'cherry_picking'
  | 'exculpatory_omission'
  | 'procedural_omission'
  | 'contradictory_omission'

/**
 * Rust: src-tauri/src/engines/omission.rs::BiasDirection
 */
export type BiasDirection =
  | 'prosecution_favoring'
  | 'defense_favoring'
  | 'institution_favoring'
  | 'individual_favoring'
  | 'neutral'

/**
 * Rust: src-tauri/src/engines/omission.rs::SourceReference
 */
export interface SourceReference {
  document_id: string
  document_name: string
  text: string
  page_ref?: number | null
  date?: string | null
}

/**
 * Rust: src-tauri/src/engines/omission.rs::ReportReference
 */
export interface ReportReference {
  document_id: string
  document_name: string
  author?: string | null
  date?: string | null
  substitute_text?: string | null
}

/**
 * Rust: src-tauri/src/engines/omission.rs::OmissionFinding
 */
export interface NativeOmissionFinding {
  id: string
  type: NativeOmissionType
  severity: NativeSeverity
  bias_direction: BiasDirection
  source: SourceReference
  report: ReportReference
  omitted_content: string
  significance: string
  impact: string
}

/**
 * Rust: src-tauri/src/engines/omission.rs::BiasAnalysis
 */
export interface BiasAnalysis {
  prosecution_favoring: number
  defense_favoring: number
  bias_score: number
  is_significant: boolean
  assessment: string
}

/**
 * Rust: src-tauri/src/engines/omission.rs::TypeCount
 */
export interface OmissionTypeCount {
  omission_type: string
  count: number
}

/**
 * Rust: src-tauri/src/engines/omission.rs::OmissionSummary
 */
export interface OmissionSummary {
  total_omissions: number
  critical_count: number
  by_type: OmissionTypeCount[]
  bias_analysis: BiasAnalysis
}

/**
 * Rust: src-tauri/src/engines/omission.rs::OmissionAnalysisResult
 */
export interface NativeOmissionAnalysisResult {
  omissions: NativeOmissionFinding[]
  summary: OmissionSummary
  is_mock: boolean
}

/**
 * Rust: src-tauri/src/commands/analysis.rs::OmissionEngineResult
 */
export interface OmissionEngineResult {
  success: boolean
  analysis?: NativeOmissionAnalysisResult | null
  duration_ms: number
  is_mock: boolean
  error?: string | null
}

// ============================================
// NATIVE TEMPORAL ENGINE TYPES
// ============================================

/**
 * Rust: src-tauri/src/engines/temporal.rs::DatePrecision
 */
export type DatePrecision = 'exact' | 'day' | 'week' | 'month' | 'quarter' | 'year' | 'approximate'

/**
 * Rust: src-tauri/src/engines/temporal.rs::EventType
 */
export type TemporalEventType =
  | 'document'
  | 'meeting'
  | 'decision'
  | 'communication'
  | 'investigation'
  | 'assessment'
  | 'complaint'
  | 'contact'
  | 'deadline'
  | 'status_change'
  | 'other'

/**
 * Rust: src-tauri/src/engines/temporal.rs::AnomalyType
 */
export type TemporalAnomalyType =
  | 'unexplained_gap'
  | 'out_of_sequence'
  | 'inconsistent_dates'
  | 'backdated_document'
  | 'impossible_timeline'
  | 'missing_expected'
  | 'clustering_anomaly'

/**
 * Rust: src-tauri/src/engines/temporal.rs::TimelineEvent
 */
export interface NativeTimelineEvent {
  id: string
  date: string
  date_precision: DatePrecision
  time?: string | null
  event_type: TemporalEventType
  description: string
  document_id: string
  document_name: string
  page_ref?: number | null
  entities_involved: string[]
  significance: string
}

/**
 * Rust: src-tauri/src/engines/temporal.rs::TimelineGap
 */
export interface TimelineGap {
  id: string
  start_date: string
  end_date: string
  duration_days: number
  preceding_event?: string | null
  following_event?: string | null
  expected_events: string[]
  significance: string
}

/**
 * Rust: src-tauri/src/engines/temporal.rs::TemporalAnomaly
 */
export interface NativeTemporalAnomaly {
  id: string
  anomaly_type: TemporalAnomalyType
  severity: NativeSeverity
  date_range: string
  description: string
  affected_events: string[]
  evidence: string
  implication: string
}

/**
 * Rust: src-tauri/src/engines/temporal.rs::TemporalSummary
 */
export interface TemporalSummary {
  total_events: number
  date_range_start: string
  date_range_end: string
  total_duration_days: number
  gaps_found: number
  anomalies_found: number
  critical_anomalies: number
  most_active_periods: string[]
  quietest_periods: string[]
}

/**
 * Rust: src-tauri/src/engines/temporal.rs::TemporalAnalysisResult
 */
export interface NativeTemporalAnalysisResult {
  events: NativeTimelineEvent[]
  gaps: TimelineGap[]
  anomalies: NativeTemporalAnomaly[]
  summary: TemporalSummary
  is_mock: boolean
}

/**
 * Rust: src-tauri/src/commands/analysis.rs::TemporalEngineResult
 */
export interface TemporalEngineResult {
  success: boolean
  analysis?: NativeTemporalAnalysisResult | null
  duration_ms: number
  is_mock: boolean
  error?: string | null
}

// ============================================
// NATIVE BIAS DETECTION ENGINE TYPES
// ============================================

/**
 * Rust: src-tauri/src/engines/bias.rs::BiasType
 */
export type BiasType =
  | 'framing_imbalance'
  | 'tone_asymmetry'
  | 'selective_presentation'
  | 'interrogation_asymmetry'
  | 'narrative_privilege'
  | 'expert_imbalance'
  | 'emotive_asymmetry'
  | 'headline_bias'

/**
 * Rust: src-tauri/src/engines/bias.rs::BiasDirection (distinct from omission BiasDirection)
 */
export type BiasDetectionDirection =
  | 'prosecution_favoring'
  | 'defense_favoring'
  | 'institution_favoring'
  | 'individual_favoring'
  | 'unclear'

/**
 * Rust: src-tauri/src/engines/bias.rs::FramingRatio
 */
export interface FramingRatio {
  metric: string
  party_a_label: string
  party_a_count: number
  party_b_label: string
  party_b_count: number
  ratio: number
  ratio_display: string
  z_score?: number | null
  p_value?: number | null
  is_significant: boolean
}

/**
 * Rust: src-tauri/src/engines/bias.rs::BiasFinding
 */
export interface NativeBiasFinding {
  id: string
  bias_type: BiasType
  severity: NativeSeverity
  direction: BiasDetectionDirection
  description: string
  evidence: string
  framing_ratio?: FramingRatio | null
  document_id: string
  document_name: string
  page_ref?: number | null
  regulatory_relevance?: string | null
}

/**
 * Rust: src-tauri/src/engines/bias.rs::BiasStatistics
 */
export interface BiasStatistics {
  total_items_analyzed: number
  items_favoring_prosecution: number
  items_favoring_defense: number
  items_neutral: number
  overall_bias_score: number
  is_statistically_significant: boolean
  dominant_bias_types: string[]
}

/**
 * Rust: src-tauri/src/engines/bias.rs::BiasSummary
 */
export interface BiasSummary {
  total_findings: number
  critical_findings: number
  primary_framing_ratio?: FramingRatio | null
  statistics: BiasStatistics
  regulatory_assessment: string
  ofcom_relevance?: string | null
}

/**
 * Rust: src-tauri/src/engines/bias.rs::BiasAnalysisResult
 */
export interface NativeBiasAnalysisResult {
  findings: NativeBiasFinding[]
  framing_ratios: FramingRatio[]
  summary: BiasSummary
  is_mock: boolean
}

/**
 * Rust: src-tauri/src/commands/analysis.rs::BiasEngineResult
 */
export interface BiasEngineResult {
  success: boolean
  analysis?: NativeBiasAnalysisResult | null
  duration_ms: number
  is_mock: boolean
  error?: string | null
}

// ============================================
// NATIVE ENTITY RESOLUTION ENGINE TYPES
// ============================================

/**
 * Rust: src-tauri/src/engines/entity.rs::EntityType
 */
export type NativeEntityType =
  | 'person'
  | 'organization'
  | 'professional'
  | 'court'
  | 'police'
  | 'agency'
  | 'expert'
  | 'media'
  | 'location'
  | 'document_ref'
  | 'other'

/**
 * Rust: src-tauri/src/engines/entity.rs::EntityRole
 */
export type NativeEntityRole =
  | 'applicant'
  | 'respondent'
  | 'subject'
  | 'adjudicator'
  | 'expert_witness'
  | 'fact_witness'
  | 'assessment_author'
  | 'legal_representative'
  | 'litigation_friend'
  | 'media_entity'
  | 'investigator'
  | 'unknown'

/**
 * Rust: src-tauri/src/engines/entity.rs::Confidence
 */
export type EntityConfidence = 'definite' | 'high' | 'medium' | 'low' | 'speculative'

/**
 * Rust: src-tauri/src/engines/entity.rs::EntityAlias
 */
export interface EntityAlias {
  name: string
  alias_type: string
  document_id: string
  confidence: EntityConfidence
}

/**
 * Rust: src-tauri/src/engines/entity.rs::ProfessionalRegistration
 */
export interface ProfessionalRegistration {
  body: string
  registration_number?: string | null
  status?: string | null
}

/**
 * Rust: src-tauri/src/engines/entity.rs::EntityRelationship
 */
export interface NativeEntityRelationship {
  id: string
  target_entity_id: string
  target_entity_name: string
  relationship_type: string
  confidence: EntityConfidence
  evidence: string
}

/**
 * Rust: src-tauri/src/engines/entity.rs::ResolvedEntity
 */
export interface NativeResolvedEntity {
  id: string
  canonical_name: string
  entity_type: NativeEntityType
  role: NativeEntityRole
  aliases: EntityAlias[]
  first_appearance?: string | null
  documents_mentioned: string[]
  mention_count: number
  professional_registration?: ProfessionalRegistration | null
  description?: string | null
  relationships: NativeEntityRelationship[]
}

/**
 * Rust: src-tauri/src/engines/entity.rs::EntitySummary
 */
export interface EntityResolutionSummary {
  total_entities: number
  persons: number
  organizations: number
  professionals: number
  key_parties: string[]
  aliases_resolved: number
  relationships_found: number
}

/**
 * Rust: src-tauri/src/engines/entity.rs::EntityResolutionResult
 */
export interface NativeEntityResolutionResult {
  entities: NativeResolvedEntity[]
  summary: EntityResolutionSummary
  is_mock: boolean
}

/**
 * Rust: src-tauri/src/commands/analysis.rs::EntityEngineResult
 */
export interface EntityEngineResult {
  success: boolean
  analysis?: NativeEntityResolutionResult | null
  duration_ms: number
  is_mock: boolean
  error?: string | null
}

// ============================================
// NATIVE ACCOUNTABILITY AUDIT ENGINE TYPES
// ============================================

/**
 * Rust: src-tauri/src/engines/accountability.rs::DutyType
 */
export type DutyType =
  | 'verification_duty'
  | 'reporting_duty'
  | 'assessment_duty'
  | 'court_order_compliance'
  | 'confidentiality_duty'
  | 'welfare_duty'
  | 'fairness_duty'
  | 'documentation_duty'
  | 'disclosure_duty'
  | 'supervision_duty'
  | 'timescale_duty'
  | 'regulatory_duty'

/**
 * Rust: src-tauri/src/engines/accountability.rs::DutySource
 */
export type DutySource =
  | 'statute'
  | 'court_order'
  | 'professional_code'
  | 'policy'
  | 'case_law'
  | 'guidance'
  | 'contract'

/**
 * Rust: src-tauri/src/engines/accountability.rs::Duty
 */
export interface Duty {
  id: string
  duty_type: DutyType
  source: DutySource
  source_reference: string
  description: string
  duty_holder: string
  duty_holder_role: string
  beneficiary?: string | null
}

/**
 * Rust: src-tauri/src/engines/accountability.rs::DutyBreach
 */
export interface DutyBreach {
  id: string
  duty: Duty
  severity: NativeSeverity
  breach_date?: string | null
  description: string
  evidence: string
  document_id: string
  document_name: string
  page_ref?: number | null
  impact: string
  regulatory_relevance?: string | null
}

/**
 * Rust: src-tauri/src/engines/accountability.rs::VerificationFailure
 */
export interface VerificationFailure {
  id: string
  claim_accepted: string
  accepted_by: string
  accepted_from: string
  available_verification: string
  verification_performed: boolean
  evidence: string
  impact: string
}

/**
 * Rust: src-tauri/src/engines/accountability.rs::AccountabilitySummary
 */
export interface AccountabilitySummary {
  total_duties_identified: number
  duties_breached: number
  verification_failures: number
  actors_with_breaches: string[]
  most_common_breach_type?: string | null
  regulatory_bodies_relevant: string[]
}

/**
 * Rust: src-tauri/src/engines/accountability.rs::AccountabilityResult
 */
export interface NativeAccountabilityResult {
  duties: Duty[]
  breaches: DutyBreach[]
  verification_failures: VerificationFailure[]
  summary: AccountabilitySummary
  is_mock: boolean
}

/**
 * Rust: src-tauri/src/commands/analysis.rs::AccountabilityEngineResult
 */
export interface AccountabilityEngineResult {
  success: boolean
  analysis?: NativeAccountabilityResult | null
  duration_ms: number
  is_mock: boolean
  error?: string | null
}

// ============================================
// NATIVE PROFESSIONAL TRACKER ENGINE TYPES
// ============================================

/**
 * Rust: src-tauri/src/engines/professional.rs::ProfessionalType
 */
export type NativeProfessionalType =
  | 'social_worker'
  | 'psychologist'
  | 'psychiatrist'
  | 'cafcass'
  | 'guardian'
  | 'solicitor'
  | 'barrister'
  | 'judge'
  | 'police_officer'
  | 'doctor'
  | 'nurse'
  | 'teacher'
  | 'other'

/**
 * Rust: src-tauri/src/engines/professional.rs::RegulatoryBody
 */
export type NativeRegulatoryBody =
  | 'hcpc'
  | 'gmc'
  | 'nmc'
  | 'sra'
  | 'bsb'
  | 'bps'
  | 'swe'
  | 'ofsted'
  | 'other'

/**
 * Rust: src-tauri/src/engines/professional.rs::ConcernType
 */
export type ConcernType =
  | 'verification_failure'
  | 'inconsistency'
  | 'bias'
  | 'timeliness'
  | 'scope_exceeded'
  | 'methodology'
  | 'documentation'
  | 'code_breach'
  | 'conflict_of_interest'
  | 'communication'
  | 'other'

/**
 * Rust: src-tauri/src/engines/professional.rs::ConductConcern
 */
export interface ConductConcern {
  id: string
  concern_type: ConcernType
  severity: NativeSeverity
  description: string
  evidence: string
  document_id: string
  document_name: string
  page_ref?: number | null
  relevant_code?: string | null
  regulatory_relevance?: string | null
}

/**
 * Rust: src-tauri/src/engines/professional.rs::BehavioralPattern
 */
export interface BehavioralPattern {
  id: string
  pattern_type: string
  description: string
  frequency: number
  examples: string[]
  significance: string
}

/**
 * Rust: src-tauri/src/engines/professional.rs::TrackedProfessional
 */
export interface TrackedProfessional {
  id: string
  name: string
  professional_type: NativeProfessionalType
  regulatory_body?: NativeRegulatoryBody | null
  registration_number?: string | null
  role_in_case: string
  documents_authored: string[]
  documents_referenced: string[]
  first_appearance?: string | null
  concerns: ConductConcern[]
  behavioral_patterns: BehavioralPattern[]
}

/**
 * Rust: src-tauri/src/engines/professional.rs::ProfessionalSummary
 */
export interface ProfessionalSummary {
  professionals_tracked: number
  total_concerns: number
  critical_concerns: number
  professionals_with_concerns: string[]
  most_common_concern?: string | null
  regulatory_bodies_involved: string[]
}

/**
 * Rust: src-tauri/src/engines/professional.rs::ProfessionalTrackerResult
 */
export interface NativeProfessionalTrackerResult {
  professionals: TrackedProfessional[]
  summary: ProfessionalSummary
  is_mock: boolean
}

/**
 * Rust: src-tauri/src/commands/analysis.rs::ProfessionalEngineResult
 */
export interface ProfessionalEngineResult {
  success: boolean
  analysis?: NativeProfessionalTrackerResult | null
  duration_ms: number
  is_mock: boolean
  error?: string | null
}

// ============================================
// NATIVE ARGUMENTATION ENGINE TYPES
// ============================================

/**
 * Rust: src-tauri/src/engines/argumentation.rs::ArgumentStrength
 */
export type ArgumentStrength = 'definitive' | 'strong' | 'moderate' | 'weak' | 'asserted'

/**
 * Rust: src-tauri/src/engines/argumentation.rs::FallacyType
 */
export type FallacyType =
  | 'circular_reasoning'
  | 'appeal_to_authority'
  | 'ad_hominem'
  | 'straw_man'
  | 'false_dichotomy'
  | 'slippery_slope'
  | 'hasty_generalization'
  | 'post_hoc'
  | 'non_sequitur'
  | 'begging_the_question'
  | 'red_herring'
  | 'other'

/**
 * Rust: src-tauri/src/engines/argumentation.rs::ToulminArgument
 */
export interface ToulminArgument {
  id: string
  claim: string
  grounds: string[]
  warrant?: string | null
  backing: string[]
  qualifier?: string | null
  rebuttals: string[]
  strength: ArgumentStrength
  document_id: string
  document_name: string
  page_ref?: number | null
  arguer?: string | null
}

/**
 * Rust: src-tauri/src/engines/argumentation.rs::LogicalFallacy
 */
export interface LogicalFallacy {
  id: string
  fallacy_type: FallacyType
  description: string
  argument_text: string
  explanation: string
  document_id: string
  document_name: string
  page_ref?: number | null
}

/**
 * Rust: src-tauri/src/engines/argumentation.rs::ArgumentChain
 */
export interface ArgumentChain {
  id: string
  root_argument_id: string
  chain: string[]
  description: string
}

/**
 * Rust: src-tauri/src/engines/argumentation.rs::ArgumentationSummary
 */
export interface ArgumentationSummary {
  total_arguments: number
  strong_arguments: number
  weak_arguments: number
  fallacies_found: number
  argument_chains: number
  most_common_fallacy?: string | null
  weakest_arguments: string[]
}

/**
 * Rust: src-tauri/src/engines/argumentation.rs::ArgumentationResult
 */
export interface NativeArgumentationResult {
  arguments: ToulminArgument[]
  fallacies: LogicalFallacy[]
  chains: ArgumentChain[]
  summary: ArgumentationSummary
  is_mock: boolean
}

/**
 * Rust: src-tauri/src/commands/analysis.rs::ArgumentationEngineResult
 */
export interface ArgumentationEngineResult {
  success: boolean
  analysis?: NativeArgumentationResult | null
  duration_ms: number
  is_mock: boolean
  error?: string | null
}

// ============================================
// NATIVE DOCUMENTARY ANALYSIS ENGINE TYPES
// ============================================

/**
 * Rust: src-tauri/src/engines/documentary.rs::EditorialChoiceType
 */
export type EditorialChoiceType =
  | 'omission'
  | 'truncation'
  | 'decontextualization'
  | 'resequencing'
  | 'commentary'
  | 'emphasis_added'
  | 'juxtaposition'
  | 'selective_editing'

/**
 * Rust: src-tauri/src/engines/documentary.rs::EditorialDirection
 */
export type EditorialDirection =
  | 'prosecution_favoring'
  | 'defense_favoring'
  | 'sensation_favoring'
  | 'narrative_favoring'
  | 'neutral'

/**
 * Rust: src-tauri/src/engines/documentary.rs::EditorialChoice
 */
export interface EditorialChoice {
  id: string
  choice_type: EditorialChoiceType
  severity: NativeSeverity
  direction: EditorialDirection
  source_content: string
  source_document_id: string
  source_document_name: string
  source_page_ref?: number | null
  broadcast_content?: string | null
  broadcast_timestamp?: string | null
  description: string
  impact: string
  ofcom_section?: string | null
  regulatory_relevance?: string | null
}

/**
 * Rust: src-tauri/src/engines/documentary.rs::SourceMapping
 */
export interface SourceMapping {
  id: string
  source_document_id: string
  source_document_name: string
  source_content: string
  source_page_ref?: number | null
  used_in_broadcast: boolean
  broadcast_timestamp?: string | null
  broadcast_content?: string | null
  accuracy_assessment: string
}

/**
 * Rust: src-tauri/src/engines/documentary.rs::PartyCoverage
 */
export interface PartyCoverage {
  party: string
  screen_time_seconds?: number | null
  word_count: number
  positive_mentions: number
  negative_mentions: number
  neutral_mentions: number
}

/**
 * Rust: src-tauri/src/engines/documentary.rs::BalanceAnalysis
 */
export interface BalanceAnalysis {
  party_coverage: PartyCoverage[]
  balance_score: number
  is_significant: boolean
  assessment: string
}

/**
 * Rust: src-tauri/src/engines/documentary.rs::DocumentarySummary
 */
export interface DocumentarySummary {
  total_editorial_choices: number
  critical_choices: number
  omissions_found: number
  decontextualizations_found: number
  sources_mapped: number
  sources_used: number
  sources_omitted: number
  balance_assessment: string
  ofcom_sections_implicated: string[]
}

/**
 * Rust: src-tauri/src/engines/documentary.rs::DocumentaryResult
 */
export interface NativeDocumentaryResult {
  editorial_choices: EditorialChoice[]
  source_mappings: SourceMapping[]
  balance_analysis: BalanceAnalysis
  summary: DocumentarySummary
  is_mock: boolean
}

/**
 * Rust: src-tauri/src/commands/analysis.rs::DocumentaryEngineResult
 */
export interface DocumentaryEngineResult {
  success: boolean
  analysis?: NativeDocumentaryResult | null
  duration_ms: number
  is_mock: boolean
  error?: string | null
}

// ============================================
// NATIVE NARRATIVE EVOLUTION ENGINE TYPES
// ============================================

/**
 * Rust: src-tauri/src/engines/narrative.rs::MutationType
 */
export type NativeMutationType =
  | 'amplification'
  | 'attenuation'
  | 'certainty_drift'
  | 'attribution_shift'
  | 'scope_expansion'
  | 'scope_contraction'
  | 'context_stripping'
  | 'addition'
  | 'deletion'
  | 'inversion'

/**
 * Rust: src-tauri/src/engines/narrative.rs::CoordinationType
 */
export type CoordinationType =
  | 'shared_language'
  | 'synchronized_timing'
  | 'circular_citation'
  | 'pre_disclosure_knowledge'
  | 'unexplained_consistency'
  | 'coordinated_omissions'

/**
 * Rust: src-tauri/src/engines/narrative.rs::MutationDirection
 */
export type NativeMutationDirection =
  | 'prosecution_favoring'
  | 'defense_favoring'
  | 'institution_favoring'
  | 'individual_favoring'
  | 'neutral'

/**
 * Rust: src-tauri/src/engines/narrative.rs::ClaimVersion
 */
export interface ClaimVersion {
  document_id: string
  document_name: string
  date?: string | null
  author?: string | null
  text: string
  mutation_from_previous?: NativeMutationType | null
  mutation_description?: string | null
  page_ref?: number | null
}

/**
 * Rust: src-tauri/src/engines/narrative.rs::ClaimEvolution
 */
export interface ClaimEvolution {
  id: string
  original_claim: string
  original_document_id: string
  original_document_name: string
  original_date?: string | null
  original_author?: string | null
  versions: ClaimVersion[]
  net_direction: NativeMutationDirection
  mutation_count: number
}

/**
 * Rust: src-tauri/src/engines/narrative.rs::ClaimMutation
 */
export interface ClaimMutation {
  id: string
  claim_evolution_id: string
  mutation_type: NativeMutationType
  severity: NativeSeverity
  direction: NativeMutationDirection
  source_text: string
  source_document_id: string
  source_document_name: string
  source_date?: string | null
  target_text: string
  target_document_id: string
  target_document_name: string
  target_date?: string | null
  description: string
  impact: string
}

/**
 * Rust: src-tauri/src/engines/narrative.rs::CoordinationPattern
 */
export interface CoordinationPattern {
  id: string
  coordination_type: CoordinationType
  severity: NativeSeverity
  document_ids: string[]
  document_names: string[]
  shared_content?: string | null
  timing_analysis?: string | null
  description: string
  significance: string
}

/**
 * Rust: src-tauri/src/engines/narrative.rs::NarrativeSummary
 */
export interface NarrativeSummary {
  claims_tracked: number
  total_mutations: number
  amplifications: number
  attenuations: number
  certainty_drifts: number
  coordination_patterns: number
  prosecution_favoring_mutations: number
  defense_favoring_mutations: number
  most_mutated_claim?: string | null
}

/**
 * Rust: src-tauri/src/engines/narrative.rs::NarrativeResult
 */
export interface NativeNarrativeResult {
  claim_evolutions: ClaimEvolution[]
  mutations: ClaimMutation[]
  coordination_patterns: CoordinationPattern[]
  summary: NarrativeSummary
  is_mock: boolean
}

/**
 * Rust: src-tauri/src/commands/analysis.rs::NarrativeEngineResult
 */
export interface NarrativeEngineResult {
  success: boolean
  analysis?: NativeNarrativeResult | null
  duration_ms: number
  is_mock: boolean
  error?: string | null
}

// ============================================
// NATIVE EXPERT WITNESS ENGINE TYPES
// ============================================

/**
 * Rust: src-tauri/src/engines/expert.rs::ExpertIssueType
 */
export type ExpertIssueType =
  | 'scope_exceed'
  | 'unsupported_conclusion'
  | 'methodology_deficiency'
  | 'alternative_not_considered'
  | 'improperly_caveated'
  | 'apparent_bias'
  | 'unverified_reliance'
  | 'undisclosed_limitation'
  | 'competence_exceed'
  | 'imbalanced_analysis'

/**
 * Rust: src-tauri/src/engines/expert.rs::ExpertType
 */
export type NativeExpertType =
  | 'psychologist'
  | 'psychiatrist'
  | 'social_work_expert'
  | 'medical_expert'
  | 'financial_expert'
  | 'child_development'
  | 'domestic_abuse'
  | 'addictions_expert'
  | 'educational_expert'
  | 'other'

/**
 * Rust: src-tauri/src/engines/expert.rs::FJCCategory
 */
export type FJCCategory =
  | 'scope'
  | 'methodology'
  | 'evidence'
  | 'opinion'
  | 'balance'
  | 'disclosure'

/**
 * Rust: src-tauri/src/engines/expert.rs::ExpertInfo
 */
export interface ExpertInfo {
  name: string
  expert_type: NativeExpertType
  qualifications: string[]
  instructing_party?: string | null
  instruction_date?: string | null
  report_date?: string | null
  declared_scope: string[]
}

/**
 * Rust: src-tauri/src/engines/expert.rs::ExpertIssue
 */
export interface ExpertIssue {
  id: string
  issue_type: ExpertIssueType
  severity: NativeSeverity
  fjc_category: FJCCategory
  content: string
  page_ref?: number | null
  description: string
  fjc_standard: string
  impact: string
  document_id: string
  document_name: string
}

/**
 * Rust: src-tauri/src/engines/expert.rs::ScopeAnalysis
 */
export interface ScopeAnalysis {
  declared_scope: string[]
  addressed_topics: string[]
  exceeded_topics: string[]
  unaddressed_topics: string[]
  assessment: string
}

/**
 * Rust: src-tauri/src/engines/expert.rs::MethodologyAssessment
 */
export interface MethodologyAssessment {
  methods_used: string[]
  methods_missing: string[]
  interviews: string[]
  documents_reviewed: string[]
  assessment_tools: string[]
  assessment: string
}

/**
 * Rust: src-tauri/src/engines/expert.rs::ExpertSummary
 */
export interface ExpertSummary {
  experts_analyzed: number
  total_issues: number
  critical_issues: number
  scope_issues: number
  methodology_issues: number
  evidence_issues: number
  fjc_compliance_score: number
  overall_assessment: string
}

/**
 * Rust: src-tauri/src/engines/expert.rs::ExpertResult
 */
export interface NativeExpertResult {
  experts: ExpertInfo[]
  issues: ExpertIssue[]
  scope_analyses: ScopeAnalysis[]
  methodology_assessments: MethodologyAssessment[]
  summary: ExpertSummary
  is_mock: boolean
}

/**
 * Rust: src-tauri/src/commands/analysis.rs::ExpertEngineResult
 */
export interface ExpertEngineResult {
  success: boolean
  analysis?: NativeExpertResult | null
  duration_ms: number
  is_mock: boolean
  error?: string | null
}

// ============================================
// COMPLAINT GENERATION TYPES
// ============================================

/**
 * Rust: src-tauri/src/complaint/generator.rs::RegulatoryBody
 */
export type RegulatoryBodyId =
  | 'ofcom'
  | 'ico'
  | 'hcpc'
  | 'lgo'
  | 'bps'
  | 'gmc'
  | 'nmc'
  | 'sra'
  | 'bsb'
  | 'swe'

/**
 * Rust: src-tauri/src/complaint/generator.rs::ComplaintFormat
 */
export type ComplaintFormat = 'markdown' | 'text' | 'html'

/**
 * Rust: src-tauri/src/complaint/generator.rs::ComplaintSection
 */
export interface ComplaintSection {
  heading: string
  content: string
  evidence_refs: string[]
}

/**
 * Rust: src-tauri/src/complaint/generator.rs::EvidenceItem
 */
export interface EvidenceItem {
  id: string
  label: string
  description: string
  document_ref?: string | null
  page_ref?: string | null
  quote?: string | null
}

/**
 * Input for generating a complaint
 * Rust: src-tauri/src/commands/complaint.rs::GenerateComplaintInput
 */
export interface GenerateComplaintInput {
  case_id: string
  regulatory_body: RegulatoryBodyId
  format: ComplaintFormat
  complainant_name: string
  complainant_address?: string | null
  complainant_email?: string | null
  complainant_phone?: string | null
  respondent_name: string
  respondent_address?: string | null
  subject: string
  summary?: string | null
  finding_ids: string[]
  additional_context?: string | null
  events_from?: string | null
  events_to?: string | null
}

/**
 * Generated complaint output
 * Rust: src-tauri/src/complaint/generator.rs::ComplaintOutput
 */
export interface ComplaintOutput {
  regulatory_body: RegulatoryBodyId
  format: ComplaintFormat
  title: string
  content: string
  sections: ComplaintSection[]
  evidence_schedule: EvidenceItem[]
  word_count: number
  generated_at: string
}

/**
 * Result of complaint generation
 * Rust: src-tauri/src/commands/complaint.rs::GenerateComplaintResult
 */
export interface GenerateComplaintResult {
  success: boolean
  complaint?: ComplaintOutput | null
  error?: string | null
}

/**
 * Regulatory body information
 * Rust: src-tauri/src/commands/complaint.rs::RegulatoryBodyInfo
 */
export interface RegulatoryBodyInfo {
  id: RegulatoryBodyId
  name: string
  full_name: string
  description: string
}

/**
 * Complaint template information
 * Rust: src-tauri/src/commands/complaint.rs::ComplaintTemplateInfo
 */
export interface ComplaintTemplateInfo {
  regulatory_body: RegulatoryBodyId
  name: string
  required_sections: string[]
  relevant_codes: string[]
}

// ============================================
// CLOUD STORAGE TYPES
// ============================================

/**
 * Google Drive connection status
 * Rust: src-tauri/src/commands/cloud.rs::GoogleConnectionStatus
 */
export interface GoogleConnectionStatus {
  connected: boolean
  email: string | null
  expires_at: string | null
  has_client_id: boolean
}

/**
 * A file or folder in cloud storage
 * Rust: src-tauri/src/cloud/mod.rs::CloudFile
 */
export interface CloudFile {
  id: string
  name: string
  mime_type: string
  size: number | null
  modified_time: string | null
  is_folder: boolean
  icon_link: string | null
}

/**
 * Result of listing files from cloud storage
 * Rust: src-tauri/src/cloud/mod.rs::CloudFileListResult
 */
export interface CloudFileListResult {
  success: boolean
  files: CloudFile[]
  next_page_token: string | null
  error: string | null
}

/**
 * Result for a single file during bulk Drive import
 */
export interface BulkImportResult {
  file_id: string
  file_name: string
  success: boolean
  document_id: string | null
  error: string | null
}

/**
 * Summary of a bulk Drive import
 */
export interface BulkImportProgress {
  total: number
  results: BulkImportResult[]
}

/**
 * Result of starting OAuth flow
 * Rust: src-tauri/src/cloud/mod.rs::AuthFlowResult
 */
export interface AuthFlowResult {
  auth_url: string
  state_token: string
}

// ============================================
// INVESTIGATION TYPES
// ============================================

/**
 * Investigation mode determines which engines run
 * Rust: src-tauri/src/commands/investigate.rs::InvestigationMode
 */
export type InvestigationMode = 'quick' | 'full' | 'custom'

/**
 * Engine selection for custom mode
 * Rust: src-tauri/src/commands/investigate.rs::EngineSelection
 */
export interface EngineSelection {
  sam: boolean
  contradiction: boolean
  omission: boolean
  temporal: boolean
  entity: boolean
  bias: boolean
  professional: boolean
  expert: boolean
  accountability: boolean
  narrative: boolean
  documentary: boolean
}

/**
 * Input for starting an investigation
 * Rust: src-tauri/src/commands/investigate.rs::InvestigateInput
 */
export interface InvestigateInput {
  case_id: string
  document_ids: string[]
  mode?: InvestigationMode
  engines?: EngineSelection | null
  focus_claims?: string[] | null
}

/**
 * Status of the investigation
 * Rust: src-tauri/src/commands/investigate.rs::InvestigationStatus
 */
export type InvestigationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

/**
 * Progress update for a single engine
 * Rust: src-tauri/src/commands/investigate.rs::EngineProgress
 */
export interface EngineProgress {
  engine: string
  status: InvestigationStatus
  started_at: string | null
  completed_at: string | null
  findings_count: number
  error: string | null
}

/**
 * Overall investigation progress
 * Rust: src-tauri/src/commands/investigate.rs::InvestigationProgress
 */
export interface InvestigationProgress {
  investigation_id: string
  case_id: string
  status: InvestigationStatus
  mode: InvestigationMode
  total_engines: number
  completed_engines: number
  current_engine: string | null
  engines: EngineProgress[]
  sam_analysis_id: string | null
  started_at: string
  updated_at: string
  error: string | null
}

/**
 * Result of starting an investigation
 * Rust: src-tauri/src/commands/investigate.rs::InvestigateStartResult
 */
export interface InvestigateStartResult {
  success: boolean
  investigation_id: string | null
  error: string | null
}

/**
 * Result of getting investigation progress
 * Rust: src-tauri/src/commands/investigate.rs::InvestigateProgressResult
 */
export interface InvestigateProgressResult {
  success: boolean
  progress: InvestigationProgress | null
  error: string | null
}

/**
 * S.A.M. analysis summary for investigation results
 * Rust: src-tauri/src/commands/investigate.rs::SAMSummary
 */
export interface InvestigationSAMSummary {
  false_premises_found: number
  propagation_chains_found: number
  authority_accumulations_found: number
  outcomes_linked: number
}

/**
 * Results view with category filtering
 * Rust: src-tauri/src/commands/investigate.rs::InvestigationResults
 */
export interface InvestigationResults {
  investigation_id: string
  case_id: string
  total_findings: number
  findings_by_category: Record<string, number>
  findings: Finding[]
  sam_summary: InvestigationSAMSummary | null
}

/**
 * Result of getting investigation results
 * Rust: src-tauri/src/commands/investigate.rs::InvestigateResultsResponse
 */
export interface InvestigateResultsResponse {
  success: boolean
  results: InvestigationResults | null
  error: string | null
}

/**
 * Generic action result for cancel, etc.
 * Rust: src-tauri/src/commands/investigate.rs::InvestigateActionResult
 */
export interface InvestigateActionResult {
  success: boolean
  error: string | null
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
