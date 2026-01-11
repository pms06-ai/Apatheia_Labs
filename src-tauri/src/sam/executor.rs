//! S.A.M. Executor - Runs analysis phases via TypeScript sidecar
//!
//! Uses the EngineRunner to execute prompts via the TypeScript sidecar,
//! parsing structured JSON output and storing results in SQLite.

use log::{info, warn};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tokio::time::Duration;
use tokio_util::sync::CancellationToken;
use uuid::Uuid;

use crate::orchestrator::{EngineId, EngineRunner};

/// S.A.M. analysis phases
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SAMPhase {
    Anchor,
    Inherit,
    Compound,
    Arrive,
}

impl SAMPhase {
    pub fn as_str(&self) -> &'static str {
        match self {
            SAMPhase::Anchor => "anchor",
            SAMPhase::Inherit => "inherit",
            SAMPhase::Compound => "compound",
            SAMPhase::Arrive => "arrive",
        }
    }

    pub fn from_str(s: &str) -> Option<SAMPhase> {
        match s {
            "anchor" => Some(SAMPhase::Anchor),
            "inherit" => Some(SAMPhase::Inherit),
            "compound" => Some(SAMPhase::Compound),
            "arrive" => Some(SAMPhase::Arrive),
            _ => None,
        }
    }

    pub fn status_running(&self) -> &'static str {
        match self {
            SAMPhase::Anchor => "anchor_running",
            SAMPhase::Inherit => "inherit_running",
            SAMPhase::Compound => "compound_running",
            SAMPhase::Arrive => "arrive_running",
        }
    }

    pub fn status_complete(&self) -> &'static str {
        match self {
            SAMPhase::Anchor => "anchor_complete",
            SAMPhase::Inherit => "inherit_complete",
            SAMPhase::Compound => "compound_complete",
            SAMPhase::Arrive => "completed",
        }
    }

    pub fn next(&self) -> Option<SAMPhase> {
        match self {
            SAMPhase::Anchor => Some(SAMPhase::Inherit),
            SAMPhase::Inherit => Some(SAMPhase::Compound),
            SAMPhase::Compound => Some(SAMPhase::Arrive),
            SAMPhase::Arrive => None,
        }
    }

    /// Determine which phase to resume from based on analysis status
    pub fn from_status(status: &str) -> SAMPhase {
        match status {
            "arrive_running" | "arrive_complete" => SAMPhase::Arrive,
            "compound_running" | "compound_complete" => SAMPhase::Compound,
            "inherit_running" | "inherit_complete" => SAMPhase::Inherit,
            _ => SAMPhase::Anchor,
        }
    }
}

/// Configuration for S.A.M. analysis
#[derive(Debug, Clone)]
pub struct SAMConfig {
    pub analysis_id: String,
    pub case_id: String,
    pub document_ids: Vec<String>,
    pub focus_claims: Option<Vec<String>>,
    pub stop_after_phase: Option<SAMPhase>,
    pub timeout_seconds: u64,
}

impl Default for SAMConfig {
    fn default() -> Self {
        Self {
            analysis_id: Uuid::new_v4().to_string(),
            case_id: String::new(),
            document_ids: Vec::new(),
            focus_claims: None,
            stop_after_phase: None,
            timeout_seconds: 300, // 5 minutes per phase
        }
    }
}

/// Phase result from Claude Code
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct PhaseResult {
    success: bool,
    phase: String,
    #[serde(default)]
    data: serde_json::Value,
    #[serde(default)]
    error: Option<String>,
}

/// ANCHOR phase output structure
#[derive(Debug, Deserialize)]
struct AnchorOutput {
    #[serde(default)]
    origins: Vec<ClaimOriginData>,
    #[serde(default)]
    false_premises: Vec<ClaimOriginData>,
}

#[derive(Debug, Deserialize)]
struct ClaimOriginData {
    claim_id: String,
    origin_document_id: String,
    origin_entity_id: Option<String>,
    origin_date: String,
    origin_page: Option<i32>,
    origin_context: Option<String>,
    origin_type: String,
    is_false_premise: bool,
    false_premise_type: Option<String>,
    contradicting_evidence: Option<String>,
    confidence_score: f64,
}

/// INHERIT phase output structure
#[derive(Debug, Deserialize)]
struct InheritOutput {
    #[serde(default)]
    propagations: Vec<PropagationData>,
    chains_found: i32,
}

#[derive(Debug, Deserialize)]
struct PropagationData {
    source_claim_id: String,
    source_document_id: String,
    source_entity_id: Option<String>,
    source_date: String,
    target_document_id: String,
    target_entity_id: Option<String>,
    target_date: String,
    propagation_type: Option<String>,
    verification_performed: bool,
    crossed_institutional_boundary: bool,
    source_institution: Option<String>,
    target_institution: Option<String>,
    mutation_detected: bool,
    mutation_type: Option<String>,
    original_text: Option<String>,
    mutated_text: Option<String>,
}

/// COMPOUND phase output structure
#[derive(Debug, Deserialize)]
struct CompoundOutput {
    #[serde(default)]
    authority_markers: Vec<AuthorityData>,
    #[serde(default)]
    authority_laundering: Vec<AuthorityData>,
}

#[derive(Debug, Deserialize)]
struct AuthorityData {
    claim_id: String,
    authority_entity_id: Option<String>,
    authority_document_id: String,
    authority_date: String,
    authority_type: String,
    authority_weight: i32,
    endorsement_type: Option<String>,
    is_authority_laundering: bool,
    laundering_path: Option<String>,
    cumulative_authority_score: Option<i32>,
}

/// ARRIVE phase output structure
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct ArriveOutput {
    #[serde(default)]
    outcomes: Vec<OutcomeData>,
    #[serde(default)]
    causation_chains: Vec<CausationChainData>,
}

#[derive(Debug, Deserialize)]
struct OutcomeData {
    outcome_type: String,
    outcome_description: String,
    outcome_date: Option<String>,
    outcome_document_id: String,
    harm_level: String,
    harm_description: Option<String>,
    root_claim_ids: Vec<String>,
    but_for_analysis: Option<String>,
    causation_confidence: f64,
    remediation_possible: bool,
    remediation_actions: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct CausationChainData {
    outcome_id: String,
    root_claims: Vec<String>,
    propagation_path: Vec<String>,
    authority_accumulation: i32,
}

/// S.A.M. Executor - orchestrates phase execution
pub struct SAMExecutor {
    pool: SqlitePool,
    config: SAMConfig,
    cancel_token: CancellationToken,
}

impl SAMExecutor {
    pub fn new(pool: SqlitePool, config: SAMConfig, cancel_token: CancellationToken) -> Self {
        Self { pool, config, cancel_token }
    }

    /// Execute all S.A.M. phases
    pub async fn execute(&self) -> Result<(), String> {
        // Validate documents have extracted text before starting
        self.validate_documents().await?;
        self.execute_from_phase(SAMPhase::Anchor).await
    }

    /// Validate that all documents have extracted text
    async fn validate_documents(&self) -> Result<(), String> {
        if self.config.document_ids.is_empty() {
            return Err("No documents selected for analysis".to_string());
        }

        for doc_id in &self.config.document_ids {
            let row: Option<(String, Option<String>)> = sqlx::query_as(
                "SELECT filename, extracted_text FROM documents WHERE id = ?"
            )
            .bind(doc_id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| format!("Failed to fetch document {}: {}", doc_id, e))?;

            match row {
                None => {
                    return Err(format!("Document {} not found", doc_id));
                }
                Some((filename, text_opt)) => {
                    let has_text = text_opt
                        .as_ref()
                        .map(|t| !t.trim().is_empty())
                        .unwrap_or(false);

                    if !has_text {
                        return Err(format!(
                            "Document '{}' ({}) has no extracted text. Please process the document first.",
                            filename, doc_id
                        ));
                    }
                }
            }
        }

        info!("Validated {} documents for analysis {}", self.config.document_ids.len(), self.config.analysis_id);
        Ok(())
    }

    /// Execute phases starting from a specific phase (used for resume)
    pub async fn execute_from_phase(&self, start_phase: SAMPhase) -> Result<(), String> {
        let phases = [
            SAMPhase::Anchor,
            SAMPhase::Inherit,
            SAMPhase::Compound,
            SAMPhase::Arrive,
        ];

        for phase in phases {
            // Skip phases before start_phase (for resume)
            if phase < start_phase {
                continue;
            }

            // Check cancellation
            if self.cancel_token.is_cancelled() {
                info!("Analysis {} cancelled before {:?} phase", self.config.analysis_id, phase);
                self.update_status("cancelled").await?;
                return Ok(());
            }

            // Check stop condition
            if let Some(stop_after) = &self.config.stop_after_phase {
                if phase > *stop_after {
                    info!("Stopping after {:?} phase as configured", stop_after);
                    break;
                }
            }

            // Execute phase
            if let Err(e) = self.execute_phase(phase).await {
                self.record_error(&phase, &e).await?;
                return Err(e);
            }
        }

        // Mark as completed
        self.update_status("completed").await?;
        Ok(())
    }

    /// Execute a single phase
    async fn execute_phase(&self, phase: SAMPhase) -> Result<(), String> {
        info!("Starting {:?} phase for analysis {}", phase, self.config.analysis_id);

        // Update status to running
        self.update_status(phase.status_running()).await?;
        self.update_phase_timestamp(&phase, "started").await?;

        // Build prompt for this phase
        let prompt = self.build_phase_prompt(&phase).await?;

        // Run via TypeScript sidecar
        let result = self.run_via_sidecar(&prompt).await?;

        // Parse and store results
        self.store_phase_results(&phase, &result).await?;

        // Update status to complete
        self.update_status(phase.status_complete()).await?;
        self.update_phase_timestamp(&phase, "completed").await?;

        info!("Completed {:?} phase for analysis {}", phase, self.config.analysis_id);
        Ok(())
    }

    /// Build the prompt for a specific phase
    async fn build_phase_prompt(&self, phase: &SAMPhase) -> Result<String, String> {
        // Fetch document content
        let documents = self.fetch_document_content().await?;

        // Fetch existing claims if needed
        let claims = if *phase != SAMPhase::Anchor {
            self.fetch_claims().await?
        } else {
            String::new()
        };

        // Fetch previous phase results if needed
        let previous_results = match phase {
            SAMPhase::Anchor => String::new(),
            SAMPhase::Inherit => self.fetch_origins().await?,
            SAMPhase::Compound => self.fetch_propagations().await?,
            SAMPhase::Arrive => self.fetch_authority_markers().await?,
        };

        let prompt = match phase {
            SAMPhase::Anchor => format!(
                r#"You are executing the ANCHOR phase of S.A.M. (Systematic Adversarial Methodology).

TASK: Identify the ORIGIN of every claim in the documents. For each claim, trace it back to its first appearance and classify whether it originated from:
- primary_source: Direct observation or primary evidence
- professional_opinion: Expert/professional assessment
- hearsay: Second-hand account
- speculation: Conjecture without evidence
- misattribution: Incorrectly attributed source
- fabrication: No traceable origin

FLAG any claims that appear to be FALSE PREMISES - claims that entered the record without proper foundation or that contradict available evidence.

DOCUMENTS:
{documents}

OUTPUT FORMAT (JSON only, no other text):
{{
  "success": true,
  "phase": "anchor",
  "data": {{
    "origins": [
      {{
        "claim_id": "uuid",
        "origin_document_id": "doc-id",
        "origin_entity_id": "entity-id or null",
        "origin_date": "YYYY-MM-DD",
        "origin_page": 1,
        "origin_context": "surrounding text",
        "origin_type": "primary_source|professional_opinion|hearsay|speculation|misattribution|fabrication",
        "is_false_premise": false,
        "false_premise_type": "null or factual_error|misattribution|speculation_as_fact|context_stripping|selective_quotation|temporal_distortion",
        "contradicting_evidence": "evidence that contradicts this claim, if any",
        "confidence_score": 0.85
      }}
    ],
    "false_premises": [/* same structure, only claims flagged as false premises */]
  }}
}}"#,
                documents = documents
            ),

            SAMPhase::Inherit => format!(
                r#"You are executing the INHERIT phase of S.A.M. (Systematic Adversarial Methodology).

TASK: Track how claims PROPAGATE from their origins through subsequent documents. Identify:
- Which documents adopted claims without verification
- Whether claims crossed institutional boundaries
- Whether claims MUTATED during propagation (amplification, attenuation, certainty drift)
- Circular references where claims cite each other

PREVIOUS PHASE RESULTS (Origins):
{previous_results}

DOCUMENTS:
{documents}

EXISTING CLAIMS:
{claims}

OUTPUT FORMAT (JSON only):
{{
  "success": true,
  "phase": "inherit",
  "data": {{
    "propagations": [
      {{
        "source_claim_id": "uuid",
        "source_document_id": "doc-id",
        "source_entity_id": "entity-id or null",
        "source_date": "YYYY-MM-DD",
        "target_document_id": "doc-id",
        "target_entity_id": "entity-id or null",
        "target_date": "YYYY-MM-DD",
        "propagation_type": "verbatim|paraphrase|citation|implicit_adoption|circular_reference|authority_appeal",
        "verification_performed": false,
        "crossed_institutional_boundary": true,
        "source_institution": "Police",
        "target_institution": "Social Services",
        "mutation_detected": true,
        "mutation_type": "amplification|attenuation|certainty_drift|attribution_shift|scope_expansion|scope_contraction",
        "original_text": "original claim text",
        "mutated_text": "how it appeared after propagation"
      }}
    ],
    "chains_found": 5
  }}
}}"#,
                previous_results = previous_results,
                documents = documents,
                claims = claims
            ),

            SAMPhase::Compound => format!(
                r#"You are executing the COMPOUND phase of S.A.M. (Systematic Adversarial Methodology).

TASK: Track how claims ACCUMULATE AUTHORITY through repetition and endorsement. Identify:
- Which authorities endorsed claims
- Whether authority was properly earned or "laundered" (false claims gaining credibility through repetition)
- Cumulative authority scores (how many sources now treat a claim as established fact)

PREVIOUS PHASE RESULTS (Propagations):
{previous_results}

DOCUMENTS:
{documents}

EXISTING CLAIMS:
{claims}

OUTPUT FORMAT (JSON only):
{{
  "success": true,
  "phase": "compound",
  "data": {{
    "authority_markers": [
      {{
        "claim_id": "uuid",
        "authority_entity_id": "entity-id or null",
        "authority_document_id": "doc-id",
        "authority_date": "YYYY-MM-DD",
        "authority_type": "court_finding|expert_opinion|official_report|professional_assessment|police_conclusion|agency_determination",
        "authority_weight": 3,
        "endorsement_type": "explicit_adoption|implicit_reliance|qualified_acceptance|referenced_without_verification",
        "is_authority_laundering": true,
        "laundering_path": "Speculation → Report → Court Finding",
        "cumulative_authority_score": 7
      }}
    ],
    "authority_laundering": [/* same structure, only items where is_authority_laundering=true */]
  }}
}}"#,
                previous_results = previous_results,
                documents = documents,
                claims = claims
            ),

            SAMPhase::Arrive => format!(
                r#"You are executing the ARRIVE phase of S.A.M. (Systematic Adversarial Methodology).

TASK: Map how false premises LED TO harmful outcomes. For each outcome, trace:
- Which false premises contributed
- The causation chain (false premise → propagation → authority → outcome)
- "But-for" analysis: would the outcome have occurred without the false premise?
- Severity of harm
- Potential for remediation

PREVIOUS PHASE RESULTS (Authority Markers):
{previous_results}

DOCUMENTS:
{documents}

EXISTING CLAIMS:
{claims}

OUTPUT FORMAT (JSON only):
{{
  "success": true,
  "phase": "arrive",
  "data": {{
    "outcomes": [
      {{
        "outcome_type": "court_order|finding_of_fact|recommendation|agency_decision|regulatory_action|media_publication",
        "outcome_description": "Description of the outcome",
        "outcome_date": "YYYY-MM-DD",
        "outcome_document_id": "doc-id",
        "harm_level": "catastrophic|severe|moderate|minor",
        "harm_description": "Description of harm caused",
        "root_claim_ids": ["claim-id-1", "claim-id-2"],
        "but_for_analysis": "Analysis of whether outcome would have occurred without false premises",
        "causation_confidence": 0.85,
        "remediation_possible": true,
        "remediation_actions": ["action1", "action2"]
      }}
    ],
    "causation_chains": [
      {{
        "outcome_id": "outcome-uuid",
        "root_claims": ["claim-id-1"],
        "propagation_path": ["doc-1", "doc-2", "doc-3"],
        "authority_accumulation": 7
      }}
    ]
  }}
}}"#,
                previous_results = previous_results,
                documents = documents,
                claims = claims
            ),
        };

        Ok(prompt)
    }

    /// Run AI via TypeScript sidecar using prompt_executor engine
    async fn run_via_sidecar(&self, prompt: &str) -> Result<serde_json::Value, String> {
        info!("Running S.A.M. phase via TypeScript sidecar");

        // Create engine runner and find sidecar
        let mut runner = EngineRunner::new();
        runner.find_sidecar();

        // Check if sidecar is available
        if runner.is_mock_mode() {
            warn!("Sidecar not available, using mock mode");
            return self.run_mock_analysis(prompt).await;
        }

        // Call prompt_executor engine with the S.A.M. prompt
        let options = serde_json::json!({
            "system_prompt": "You are a forensic document analyst executing the S.A.M. (Systematic Adversarial Methodology) analysis. You must respond with valid JSON only, no markdown or other formatting.",
            "user_content": prompt
        });

        let result = runner.run_engine_with_options(
            EngineId::PromptExecutor,
            &self.config.case_id,
            &self.config.document_ids,
            Some(options),
        ).await?;

        // Extract AI response from findings[0].evidence
        if let Some(finding) = result.findings.first() {
            // The evidence field contains the raw AI response
            Ok(finding.evidence.clone())
        } else {
            Err("No response from AI sidecar".to_string())
        }
    }

    /// Mock analysis for testing/development
    async fn run_mock_analysis(&self, _prompt: &str) -> Result<serde_json::Value, String> {
        warn!("MOCK MODE ACTIVE: S.A.M. analysis running without AI sidecar. Results will be empty. Configure API key to enable real analysis.");

        // Simulate processing time
        tokio::time::sleep(Duration::from_millis(500)).await;

        // Return mock data with explicit warning
        Ok(serde_json::json!({
            "success": true,
            "phase": "anchor",
            "mock_mode": true,
            "warning": "Analysis ran in mock mode - no AI processing occurred",
            "data": {
                "origins": [],
                "false_premises": []
            }
        }))
    }

    /// Store phase results in the database
    async fn store_phase_results(&self, phase: &SAMPhase, result: &serde_json::Value) -> Result<(), String> {
        let phase_result: PhaseResult = serde_json::from_value(result.clone())
            .map_err(|e| format!("Failed to parse phase result: {}", e))?;

        if !phase_result.success {
            return Err(phase_result.error.unwrap_or_else(|| "Unknown error".to_string()));
        }

        match phase {
            SAMPhase::Anchor => {
                let output: AnchorOutput = serde_json::from_value(phase_result.data)
                    .map_err(|e| format!("Failed to parse ANCHOR output: {}", e))?;
                self.store_origins(&output).await?;
            }
            SAMPhase::Inherit => {
                let output: InheritOutput = serde_json::from_value(phase_result.data)
                    .map_err(|e| format!("Failed to parse INHERIT output: {}", e))?;
                self.store_propagations(&output).await?;
            }
            SAMPhase::Compound => {
                let output: CompoundOutput = serde_json::from_value(phase_result.data)
                    .map_err(|e| format!("Failed to parse COMPOUND output: {}", e))?;
                self.store_authority_markers(&output).await?;
            }
            SAMPhase::Arrive => {
                let output: ArriveOutput = serde_json::from_value(phase_result.data)
                    .map_err(|e| format!("Failed to parse ARRIVE output: {}", e))?;
                self.store_outcomes(&output).await?;
            }
        }

        Ok(())
    }

    /// Store ANCHOR phase results
    async fn store_origins(&self, output: &AnchorOutput) -> Result<(), String> {
        let now = chrono::Utc::now().to_rfc3339();

        for origin in &output.origins {
            let id = Uuid::new_v4().to_string();
            sqlx::query(
                "INSERT INTO claim_origins (id, case_id, claim_id, origin_document_id, origin_entity_id, origin_date, origin_page, origin_context, origin_type, is_false_premise, false_premise_type, contradicting_evidence, confidence_score, metadata, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?)"
            )
            .bind(&id)
            .bind(&self.config.case_id)
            .bind(&origin.claim_id)
            .bind(&origin.origin_document_id)
            .bind(&origin.origin_entity_id)
            .bind(&origin.origin_date)
            .bind(&origin.origin_page)
            .bind(&origin.origin_context)
            .bind(&origin.origin_type)
            .bind(origin.is_false_premise)
            .bind(&origin.false_premise_type)
            .bind(&origin.contradicting_evidence)
            .bind(origin.confidence_score)
            .bind(&now)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to insert origin: {}", e))?;
        }

        // Update summary
        let false_count = output.false_premises.len() as i32;
        sqlx::query("UPDATE sam_analyses SET false_premises_found = ? WHERE id = ?")
            .bind(false_count)
            .bind(&self.config.analysis_id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to update summary: {}", e))?;

        info!("Stored {} origins ({} false premises)", output.origins.len(), false_count);
        Ok(())
    }

    /// Store INHERIT phase results
    async fn store_propagations(&self, output: &InheritOutput) -> Result<(), String> {
        let now = chrono::Utc::now().to_rfc3339();

        for prop in &output.propagations {
            let id = Uuid::new_v4().to_string();
            sqlx::query(
                "INSERT INTO claim_propagations (id, case_id, source_claim_id, source_document_id, source_entity_id, source_date, target_document_id, target_entity_id, target_date, propagation_type, verification_performed, crossed_institutional_boundary, source_institution, target_institution, mutation_detected, mutation_type, original_text, mutated_text, metadata, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?)"
            )
            .bind(&id)
            .bind(&self.config.case_id)
            .bind(&prop.source_claim_id)
            .bind(&prop.source_document_id)
            .bind(&prop.source_entity_id)
            .bind(&prop.source_date)
            .bind(&prop.target_document_id)
            .bind(&prop.target_entity_id)
            .bind(&prop.target_date)
            .bind(&prop.propagation_type)
            .bind(prop.verification_performed)
            .bind(prop.crossed_institutional_boundary)
            .bind(&prop.source_institution)
            .bind(&prop.target_institution)
            .bind(prop.mutation_detected)
            .bind(&prop.mutation_type)
            .bind(&prop.original_text)
            .bind(&prop.mutated_text)
            .bind(&now)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to insert propagation: {}", e))?;
        }

        // Update summary
        sqlx::query("UPDATE sam_analyses SET propagation_chains_found = ? WHERE id = ?")
            .bind(output.chains_found)
            .bind(&self.config.analysis_id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to update summary: {}", e))?;

        info!("Stored {} propagations", output.propagations.len());
        Ok(())
    }

    /// Store COMPOUND phase results
    async fn store_authority_markers(&self, output: &CompoundOutput) -> Result<(), String> {
        let now = chrono::Utc::now().to_rfc3339();

        for marker in &output.authority_markers {
            let id = Uuid::new_v4().to_string();
            sqlx::query(
                "INSERT INTO authority_markers (id, case_id, claim_id, authority_entity_id, authority_document_id, authority_date, authority_type, authority_weight, endorsement_type, is_authority_laundering, laundering_path, cumulative_authority_score, metadata, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?)"
            )
            .bind(&id)
            .bind(&self.config.case_id)
            .bind(&marker.claim_id)
            .bind(&marker.authority_entity_id)
            .bind(&marker.authority_document_id)
            .bind(&marker.authority_date)
            .bind(&marker.authority_type)
            .bind(marker.authority_weight)
            .bind(&marker.endorsement_type)
            .bind(marker.is_authority_laundering)
            .bind(&marker.laundering_path)
            .bind(&marker.cumulative_authority_score)
            .bind(&now)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to insert authority marker: {}", e))?;
        }

        // Update summary
        let laundering_count = output.authority_laundering.len() as i32;
        sqlx::query("UPDATE sam_analyses SET authority_accumulations_found = ? WHERE id = ?")
            .bind(laundering_count)
            .bind(&self.config.analysis_id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to update summary: {}", e))?;

        info!("Stored {} authority markers ({} laundering)", output.authority_markers.len(), laundering_count);
        Ok(())
    }

    /// Store ARRIVE phase results
    async fn store_outcomes(&self, output: &ArriveOutput) -> Result<(), String> {
        let now = chrono::Utc::now().to_rfc3339();

        for outcome in &output.outcomes {
            let id = Uuid::new_v4().to_string();
            let root_claim_ids = serde_json::to_string(&outcome.root_claim_ids).unwrap_or_default();
            let remediation_actions = serde_json::to_string(&outcome.remediation_actions).unwrap_or_default();

            sqlx::query(
                "INSERT INTO sam_outcomes (id, case_id, outcome_type, outcome_description, outcome_date, outcome_document_id, harm_level, harm_description, root_claim_ids, but_for_analysis, causation_confidence, remediation_possible, remediation_actions, metadata, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?)"
            )
            .bind(&id)
            .bind(&self.config.case_id)
            .bind(&outcome.outcome_type)
            .bind(&outcome.outcome_description)
            .bind(&outcome.outcome_date)
            .bind(&outcome.outcome_document_id)
            .bind(&outcome.harm_level)
            .bind(&outcome.harm_description)
            .bind(&root_claim_ids)
            .bind(&outcome.but_for_analysis)
            .bind(outcome.causation_confidence)
            .bind(outcome.remediation_possible)
            .bind(&remediation_actions)
            .bind(&now)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to insert outcome: {}", e))?;
        }

        // Update summary
        let outcomes_count = output.outcomes.len() as i32;
        sqlx::query("UPDATE sam_analyses SET outcomes_linked = ? WHERE id = ?")
            .bind(outcomes_count)
            .bind(&self.config.analysis_id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to update summary: {}", e))?;

        info!("Stored {} outcomes", outcomes_count);

        // Store causation chains
        for chain in &output.causation_chains {
            let id = Uuid::new_v4().to_string();
            let root_claims = serde_json::to_string(&chain.root_claims).unwrap_or_default();
            let propagation_path = serde_json::to_string(&chain.propagation_path).unwrap_or_default();

            sqlx::query(
                "INSERT INTO sam_causation_chains (id, case_id, outcome_id, root_claims, propagation_path, authority_accumulation, metadata, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, '{}', ?)"
            )
            .bind(&id)
            .bind(&self.config.case_id)
            .bind(&chain.outcome_id)
            .bind(&root_claims)
            .bind(&propagation_path)
            .bind(chain.authority_accumulation)
            .bind(&now)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to insert causation chain: {}", e))?;
        }

        info!("Stored {} causation chains", output.causation_chains.len());
        Ok(())
    }

    // ========================================
    // Helper methods
    // ========================================

    async fn update_status(&self, status: &str) -> Result<(), String> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query("UPDATE sam_analyses SET status = ?, updated_at = ? WHERE id = ?")
            .bind(status)
            .bind(&now)
            .bind(&self.config.analysis_id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to update status: {}", e))?;
        Ok(())
    }

    async fn update_phase_timestamp(&self, phase: &SAMPhase, event: &str) -> Result<(), String> {
        let now = chrono::Utc::now().to_rfc3339();
        let field = format!("{}_{}_at", phase.as_str(), event);
        let query = format!("UPDATE sam_analyses SET {} = ? WHERE id = ?", field);

        sqlx::query(&query)
            .bind(&now)
            .bind(&self.config.analysis_id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to update timestamp: {}", e))?;
        Ok(())
    }

    async fn record_error(&self, phase: &SAMPhase, error: &str) -> Result<(), String> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query("UPDATE sam_analyses SET status = 'failed', error_message = ?, error_phase = ?, updated_at = ? WHERE id = ?")
            .bind(error)
            .bind(phase.as_str())
            .bind(&now)
            .bind(&self.config.analysis_id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to record error: {}", e))?;
        Ok(())
    }

    async fn fetch_document_content(&self) -> Result<String, String> {
        let mut content = String::new();

        for doc_id in &self.config.document_ids {
            let row: Option<(String, Option<String>)> = sqlx::query_as(
                "SELECT filename, extracted_text FROM documents WHERE id = ?"
            )
            .bind(doc_id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| format!("Failed to fetch document: {}", e))?;

            if let Some((filename, Some(text))) = row {
                content.push_str(&format!("\n\n=== {} ===\n{}", filename, text));
            }
        }

        Ok(content)
    }

    async fn fetch_claims(&self) -> Result<String, String> {
        let claims: Vec<(String, String, Option<String>)> = sqlx::query_as(
            "SELECT id, claim_text, claim_type FROM claims WHERE case_id = ?"
        )
        .bind(&self.config.case_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| format!("Failed to fetch claims: {}", e))?;

        let formatted: Vec<String> = claims.iter()
            .map(|(id, text, claim_type)| {
                format!("- [{}] ({}): {}", id, claim_type.as_deref().unwrap_or("unknown"), text)
            })
            .collect();

        Ok(formatted.join("\n"))
    }

    async fn fetch_origins(&self) -> Result<String, String> {
        let origins: Vec<(String, String, String, bool)> = sqlx::query_as(
            "SELECT claim_id, origin_type, origin_date, is_false_premise FROM claim_origins WHERE case_id = ?"
        )
        .bind(&self.config.case_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| format!("Failed to fetch origins: {}", e))?;

        let formatted: Vec<String> = origins.iter()
            .map(|(claim_id, origin_type, date, is_false)| {
                format!("- Claim {} originated as {} on {}{}",
                    claim_id, origin_type, date,
                    if *is_false { " [FALSE PREMISE]" } else { "" }
                )
            })
            .collect();

        Ok(formatted.join("\n"))
    }

    async fn fetch_propagations(&self) -> Result<String, String> {
        let props: Vec<(String, String, String, bool)> = sqlx::query_as(
            "SELECT source_claim_id, source_institution, target_institution, mutation_detected FROM claim_propagations WHERE case_id = ?"
        )
        .bind(&self.config.case_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| format!("Failed to fetch propagations: {}", e))?;

        let formatted: Vec<String> = props.iter()
            .map(|(claim_id, source, target, mutated)| {
                format!("- Claim {} propagated from {} to {}{}",
                    claim_id,
                    source.as_str(),
                    target.as_str(),
                    if *mutated { " [MUTATED]" } else { "" }
                )
            })
            .collect();

        Ok(formatted.join("\n"))
    }

    async fn fetch_authority_markers(&self) -> Result<String, String> {
        let markers: Vec<(String, String, i32, bool)> = sqlx::query_as(
            "SELECT claim_id, authority_type, authority_weight, is_authority_laundering FROM authority_markers WHERE case_id = ?"
        )
        .bind(&self.config.case_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| format!("Failed to fetch authority markers: {}", e))?;

        let formatted: Vec<String> = markers.iter()
            .map(|(claim_id, auth_type, weight, laundering)| {
                format!("- Claim {} endorsed by {} (weight: {}){}",
                    claim_id, auth_type, weight,
                    if *laundering { " [AUTHORITY LAUNDERING]" } else { "" }
                )
            })
            .collect();

        Ok(formatted.join("\n"))
    }
}
