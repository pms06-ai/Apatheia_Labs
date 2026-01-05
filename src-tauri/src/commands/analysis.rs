//! Analysis and engine commands

use crate::db::schema::{Finding, Contradiction, Omission, SAMAnalysis, ClaimOrigin, ClaimPropagation, AuthorityMarker, SAMOutcome};
use crate::orchestrator::{AnalysisRequest, EngineOrchestrator, JobProgress};
use crate::sam::{SAMExecutor, SAMConfig, SAMPhase};
use crate::AppState;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;
use tokio_util::sync::CancellationToken;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct RunEngineInput {
    pub case_id: String,
    pub engine_id: String,
    pub document_ids: Vec<String>,
    pub options: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EngineResult {
    pub success: bool,
    pub engine_id: String,
    pub findings: Vec<Finding>,
    pub duration_ms: u64,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FindingsResult {
    pub success: bool,
    pub data: Vec<Finding>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub success: bool,
    pub findings: Vec<Finding>,
    pub contradictions: Vec<Contradiction>,
    pub omissions: Vec<Omission>,
    pub error: Option<String>,
}

/// Get all findings for a case
#[tauri::command]
pub async fn get_findings(
    state: State<'_, AppState>,
    case_id: String,
) -> Result<FindingsResult, String> {
    let db = state.db.lock().await;
    
    match sqlx::query_as::<_, Finding>(
        "SELECT * FROM findings WHERE case_id = ? ORDER BY created_at DESC"
    )
    .bind(&case_id)
    .fetch_all(db.pool())
    .await
    {
        Ok(findings) => Ok(FindingsResult {
            success: true,
            data: findings,
            error: None,
        }),
        Err(e) => Ok(FindingsResult {
            success: false,
            data: vec![],
            error: Some(e.to_string()),
        }),
    }
}

/// Get full analysis results for a case
#[tauri::command]
pub async fn get_analysis(
    state: State<'_, AppState>,
    case_id: String,
) -> Result<AnalysisResult, String> {
    let db = state.db.lock().await;
    
    let findings = sqlx::query_as::<_, Finding>(
        "SELECT * FROM findings WHERE case_id = ? ORDER BY created_at DESC"
    )
    .bind(&case_id)
    .fetch_all(db.pool())
    .await
    .unwrap_or_default();
    
    let contradictions = sqlx::query_as::<_, Contradiction>(
        "SELECT * FROM contradictions WHERE case_id = ? ORDER BY created_at DESC"
    )
    .bind(&case_id)
    .fetch_all(db.pool())
    .await
    .unwrap_or_default();
    
    let omissions = sqlx::query_as::<_, Omission>(
        "SELECT * FROM omissions WHERE case_id = ? ORDER BY created_at DESC"
    )
    .bind(&case_id)
    .fetch_all(db.pool())
    .await
    .unwrap_or_default();
    
    Ok(AnalysisResult {
        success: true,
        findings,
        contradictions,
        omissions,
        error: None,
    })
}

/// Run an analysis engine
/// Uses the same sidecar execution path as the orchestrator
#[tauri::command]
pub async fn run_engine(
    state: State<'_, AppState>,
    orchestrator: State<'_, Arc<tokio::sync::RwLock<crate::orchestrator::EngineOrchestrator>>>,
    input: RunEngineInput,
) -> Result<EngineResult, String> {
    let start = std::time::Instant::now();

    // Parse engine ID
    let engine_id = crate::orchestrator::EngineId::from_str(&input.engine_id)
        .ok_or_else(|| format!("Unknown engine ID: {}", input.engine_id))?;

    // Run engine via orchestrator (uses same sidecar logic)
    // Note: The sidecar saves findings directly to the database, so we need to fetch them back
    match orchestrator.read().await.run_single_engine(engine_id, &input.case_id, &input.document_ids).await {
        Ok(_) => {
            // Fetch the findings that were just saved by the sidecar
            let db = state.db.lock().await;
            let saved_findings = sqlx::query_as::<_, Finding>(
                "SELECT * FROM findings WHERE case_id = ? AND engine = ? ORDER BY created_at DESC"
            )
            .bind(&input.case_id)
            .bind(&input.engine_id)
            .fetch_all(db.pool())
            .await
            .unwrap_or_default();

            Ok(EngineResult {
                success: true,
                engine_id: input.engine_id,
                findings: saved_findings,
                duration_ms: start.elapsed().as_millis() as u64,
                error: None,
            })
        }
        Err(e) => Ok(EngineResult {
            success: false,
            engine_id: input.engine_id,
            findings: vec![],
            duration_ms: start.elapsed().as_millis() as u64,
            error: Some(e),
        }),
    }
}

/// Save a finding
#[tauri::command]
pub async fn save_finding(
    state: State<'_, AppState>,
    finding: Finding,
) -> Result<FindingsResult, String> {
    let db = state.db.lock().await;
    let now = chrono::Utc::now().to_rfc3339();
    let id = if finding.id.is_empty() {
        Uuid::new_v4().to_string()
    } else {
        finding.id.clone()
    };
    
    match sqlx::query(
        "INSERT OR REPLACE INTO findings (id, case_id, engine, title, description, finding_type, severity, document_ids, entity_ids, regulatory_targets, evidence, metadata, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&finding.case_id)
    .bind(&finding.engine)
    .bind(&finding.title)
    .bind(&finding.description)
    .bind(&finding.finding_type)
    .bind(&finding.severity)
    .bind(&finding.document_ids)
    .bind(&finding.entity_ids)
    .bind(&finding.regulatory_targets)
    .bind(&finding.evidence)
    .bind(&finding.metadata)
    .bind(&now)
    .execute(db.pool())
    .await
    {
        Ok(_) => Ok(FindingsResult {
            success: true,
            data: vec![],
            error: None,
        }),
        Err(e) => Ok(FindingsResult {
            success: false,
            data: vec![],
            error: Some(e.to_string()),
        }),
    }
}

// ============================================
// Orchestrator Commands
// ============================================

#[derive(Debug, Serialize, Deserialize)]
pub struct SubmitAnalysisResult {
    pub success: bool,
    pub job_id: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JobProgressResult {
    pub success: bool,
    pub progress: Option<JobProgress>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ListJobsResult {
    pub success: bool,
    pub jobs: Vec<JobProgress>,
    pub error: Option<String>,
}

/// Submit an analysis request to the orchestrator
#[tauri::command]
pub async fn submit_analysis(
    orchestrator: State<'_, Arc<RwLock<EngineOrchestrator>>>,
    request: AnalysisRequest,
) -> Result<SubmitAnalysisResult, String> {
    let orch = orchestrator.read().await;
    
    match orch.submit(request).await {
        Ok(job_id) => Ok(SubmitAnalysisResult {
            success: true,
            job_id: Some(job_id),
            error: None,
        }),
        Err(e) => Ok(SubmitAnalysisResult {
            success: false,
            job_id: None,
            error: Some(e),
        }),
    }
}

/// Get progress for a specific job
#[tauri::command]
pub async fn get_job_progress(
    orchestrator: State<'_, Arc<RwLock<EngineOrchestrator>>>,
    job_id: String,
) -> Result<JobProgressResult, String> {
    let orch = orchestrator.read().await;
    
    match orch.get_progress(&job_id).await {
        Some(progress) => Ok(JobProgressResult {
            success: true,
            progress: Some(progress),
            error: None,
        }),
        None => Ok(JobProgressResult {
            success: false,
            progress: None,
            error: Some("Job not found".to_string()),
        }),
    }
}

/// Cancel a running job
#[tauri::command]
pub async fn cancel_job(
    orchestrator: State<'_, Arc<RwLock<EngineOrchestrator>>>,
    job_id: String,
) -> Result<SubmitAnalysisResult, String> {
    let orch = orchestrator.read().await;
    
    match orch.cancel_job(&job_id).await {
        Ok(()) => Ok(SubmitAnalysisResult {
            success: true,
            job_id: Some(job_id),
            error: None,
        }),
        Err(e) => Ok(SubmitAnalysisResult {
            success: false,
            job_id: Some(job_id),
            error: Some(e),
        }),
    }
}

/// List all active jobs
#[tauri::command]
pub async fn list_jobs(
    orchestrator: State<'_, Arc<RwLock<EngineOrchestrator>>>,
) -> Result<ListJobsResult, String> {
    let orch = orchestrator.read().await;
    let jobs = orch.list_jobs().await;

    Ok(ListJobsResult {
        success: true,
        jobs,
        error: None,
    })
}

// ============================================
// S.A.M. (Systematic Adversarial Methodology) Commands
// ============================================

#[derive(Debug, Serialize, Deserialize)]
pub struct SAMAnalysisInput {
    pub case_id: String,
    pub document_ids: Vec<String>,
    pub focus_claims: Option<Vec<String>>,
    pub stop_after_phase: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SAMAnalysisStartResult {
    pub success: bool,
    pub analysis_id: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SAMProgressResponse {
    pub analysis_id: String,
    pub status: String,
    pub current_phase: Option<String>,
    pub anchor_started_at: Option<String>,
    pub anchor_completed_at: Option<String>,
    pub inherit_started_at: Option<String>,
    pub inherit_completed_at: Option<String>,
    pub compound_started_at: Option<String>,
    pub compound_completed_at: Option<String>,
    pub arrive_started_at: Option<String>,
    pub arrive_completed_at: Option<String>,
    pub false_premises_found: i32,
    pub propagation_chains_found: i32,
    pub authority_accumulations_found: i32,
    pub outcomes_linked: i32,
    pub error_message: Option<String>,
    pub error_phase: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SAMProgressResult {
    pub success: bool,
    pub progress: Option<SAMProgressResponse>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SAMResults {
    pub origins: Vec<ClaimOrigin>,
    pub propagations: Vec<ClaimPropagation>,
    pub authority_markers: Vec<AuthorityMarker>,
    pub outcomes: Vec<SAMOutcome>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SAMResultsResponse {
    pub success: bool,
    pub results: Option<SAMResults>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SAMActionResult {
    pub success: bool,
    pub error: Option<String>,
}

/// Start a new S.A.M. analysis
#[tauri::command]
pub async fn run_sam_analysis(
    state: State<'_, AppState>,
    input: SAMAnalysisInput,
) -> Result<SAMAnalysisStartResult, String> {
    let db = state.db.lock().await;
    let now = chrono::Utc::now().to_rfc3339();
    let analysis_id = Uuid::new_v4().to_string();

    // Create the analysis record
    match sqlx::query(
        "INSERT INTO sam_analyses (id, case_id, status, metadata, created_at, updated_at)
         VALUES (?, ?, 'pending', ?, ?, ?)"
    )
    .bind(&analysis_id)
    .bind(&input.case_id)
    .bind(serde_json::json!({
        "document_ids": input.document_ids,
        "focus_claims": input.focus_claims,
        "stop_after_phase": input.stop_after_phase
    }).to_string())
    .bind(&now)
    .bind(&now)
    .execute(db.pool())
    .await
    {
        Ok(_) => {
            // Create cancellation token
            let cancel_token = CancellationToken::new();

            // Store the token for later cancellation
            {
                let mut tokens = state.sam_tokens.lock().await;
                tokens.insert(analysis_id.clone(), cancel_token.clone());
            }

            // Get pool for the spawned task
            let pool = db.pool().clone();
            let analysis_id_clone = analysis_id.clone();
            let analysis_id_cleanup = analysis_id.clone();
            let case_id = input.case_id.clone();
            let document_ids = input.document_ids.clone();
            let focus_claims = input.focus_claims.clone();
            let stop_after_phase = input.stop_after_phase.clone();
            let sam_tokens = state.sam_tokens.clone();

            // Spawn the S.A.M. analysis task
            tokio::spawn(async move {
                let stop_phase = stop_after_phase.and_then(|s| SAMPhase::from_str(&s));

                let config = SAMConfig {
                    analysis_id: analysis_id_clone.clone(),
                    case_id,
                    document_ids,
                    focus_claims,
                    stop_after_phase: stop_phase,
                    timeout_seconds: 300,
                };

                let executor = SAMExecutor::new(pool, config, cancel_token);

                if let Err(e) = executor.execute().await {
                    log::error!("S.A.M. analysis {} failed: {}", analysis_id_clone, e);
                } else {
                    log::info!("S.A.M. analysis {} completed successfully", analysis_id_clone);
                }

                // Clean up the token after completion
                let mut tokens = sam_tokens.lock().await;
                tokens.remove(&analysis_id_cleanup);
            });

            Ok(SAMAnalysisStartResult {
                success: true,
                analysis_id: Some(analysis_id),
                error: None,
            })
        }
        Err(e) => Ok(SAMAnalysisStartResult {
            success: false,
            analysis_id: None,
            error: Some(e.to_string()),
        }),
    }
}

/// Get S.A.M. analysis progress
#[tauri::command]
pub async fn get_sam_progress(
    state: State<'_, AppState>,
    analysis_id: String,
) -> Result<SAMProgressResult, String> {
    let db = state.db.lock().await;

    match sqlx::query_as::<_, SAMAnalysis>(
        "SELECT * FROM sam_analyses WHERE id = ?"
    )
    .bind(&analysis_id)
    .fetch_optional(db.pool())
    .await
    {
        Ok(Some(analysis)) => {
            // Derive current phase from status
            let current_phase = match analysis.status.as_str() {
                "anchor_running" => Some("anchor".to_string()),
                "inherit_running" => Some("inherit".to_string()),
                "compound_running" => Some("compound".to_string()),
                "arrive_running" => Some("arrive".to_string()),
                _ => None,
            };

            Ok(SAMProgressResult {
                success: true,
                progress: Some(SAMProgressResponse {
                    analysis_id: analysis.id,
                    status: analysis.status,
                    current_phase,
                    anchor_started_at: analysis.anchor_started_at,
                    anchor_completed_at: analysis.anchor_completed_at,
                    inherit_started_at: analysis.inherit_started_at,
                    inherit_completed_at: analysis.inherit_completed_at,
                    compound_started_at: analysis.compound_started_at,
                    compound_completed_at: analysis.compound_completed_at,
                    arrive_started_at: analysis.arrive_started_at,
                    arrive_completed_at: analysis.arrive_completed_at,
                    false_premises_found: analysis.false_premises_found,
                    propagation_chains_found: analysis.propagation_chains_found,
                    authority_accumulations_found: analysis.authority_accumulations_found,
                    outcomes_linked: analysis.outcomes_linked,
                    error_message: analysis.error_message,
                    error_phase: analysis.error_phase,
                }),
                error: None,
            })
        }
        Ok(None) => Ok(SAMProgressResult {
            success: false,
            progress: None,
            error: Some("Analysis not found".to_string()),
        }),
        Err(e) => Ok(SAMProgressResult {
            success: false,
            progress: None,
            error: Some(e.to_string()),
        }),
    }
}

/// Get S.A.M. analysis results
#[tauri::command]
pub async fn get_sam_results(
    state: State<'_, AppState>,
    analysis_id: String,
) -> Result<SAMResultsResponse, String> {
    let db = state.db.lock().await;

    // First get the analysis to find the case_id
    let analysis = match sqlx::query_as::<_, SAMAnalysis>(
        "SELECT * FROM sam_analyses WHERE id = ?"
    )
    .bind(&analysis_id)
    .fetch_optional(db.pool())
    .await
    {
        Ok(Some(a)) => a,
        Ok(None) => return Ok(SAMResultsResponse {
            success: false,
            results: None,
            error: Some("Analysis not found".to_string()),
        }),
        Err(e) => return Ok(SAMResultsResponse {
            success: false,
            results: None,
            error: Some(e.to_string()),
        }),
    };

    let case_id = &analysis.case_id;

    // Fetch all S.A.M. results for this case
    let origins = sqlx::query_as::<_, ClaimOrigin>(
        "SELECT * FROM claim_origins WHERE case_id = ? ORDER BY origin_date"
    )
    .bind(case_id)
    .fetch_all(db.pool())
    .await
    .unwrap_or_default();

    let propagations = sqlx::query_as::<_, ClaimPropagation>(
        "SELECT * FROM claim_propagations WHERE case_id = ? ORDER BY source_date"
    )
    .bind(case_id)
    .fetch_all(db.pool())
    .await
    .unwrap_or_default();

    let authority_markers = sqlx::query_as::<_, AuthorityMarker>(
        "SELECT * FROM authority_markers WHERE case_id = ? ORDER BY authority_date"
    )
    .bind(case_id)
    .fetch_all(db.pool())
    .await
    .unwrap_or_default();

    let outcomes = sqlx::query_as::<_, SAMOutcome>(
        "SELECT * FROM sam_outcomes WHERE case_id = ? ORDER BY outcome_date"
    )
    .bind(case_id)
    .fetch_all(db.pool())
    .await
    .unwrap_or_default();

    Ok(SAMResultsResponse {
        success: true,
        results: Some(SAMResults {
            origins,
            propagations,
            authority_markers,
            outcomes,
        }),
        error: None,
    })
}

/// Cancel a running S.A.M. analysis
#[tauri::command]
pub async fn cancel_sam_analysis(
    state: State<'_, AppState>,
    analysis_id: String,
) -> Result<SAMActionResult, String> {
    // First, cancel the token to stop the running task
    {
        let tokens = state.sam_tokens.lock().await;
        if let Some(token) = tokens.get(&analysis_id) {
            token.cancel();
            log::info!("Cancellation signal sent for analysis {}", analysis_id);
        }
    }

    // Update the database status
    let db = state.db.lock().await;
    let now = chrono::Utc::now().to_rfc3339();

    match sqlx::query(
        "UPDATE sam_analyses SET status = 'cancelled', updated_at = ? WHERE id = ? AND status NOT IN ('completed', 'failed', 'cancelled')"
    )
    .bind(&now)
    .bind(&analysis_id)
    .execute(db.pool())
    .await
    {
        Ok(result) => {
            // Clean up the token
            {
                let mut tokens = state.sam_tokens.lock().await;
                tokens.remove(&analysis_id);
            }

            if result.rows_affected() > 0 {
                Ok(SAMActionResult {
                    success: true,
                    error: None,
                })
            } else {
                Ok(SAMActionResult {
                    success: false,
                    error: Some("Analysis not found or already completed/cancelled".to_string()),
                })
            }
        }
        Err(e) => Ok(SAMActionResult {
            success: false,
            error: Some(e.to_string()),
        }),
    }
}

/// Resume a paused or failed S.A.M. analysis
#[tauri::command]
pub async fn resume_sam_analysis(
    state: State<'_, AppState>,
    analysis_id: String,
) -> Result<SAMActionResult, String> {
    let db = state.db.lock().await;
    let now = chrono::Utc::now().to_rfc3339();

    // Get current analysis state
    let analysis = match sqlx::query_as::<_, SAMAnalysis>(
        "SELECT * FROM sam_analyses WHERE id = ?"
    )
    .bind(&analysis_id)
    .fetch_optional(db.pool())
    .await
    {
        Ok(Some(a)) => a,
        Ok(None) => return Ok(SAMActionResult {
            success: false,
            error: Some("Analysis not found".to_string()),
        }),
        Err(e) => return Ok(SAMActionResult {
            success: false,
            error: Some(e.to_string()),
        }),
    };

    // Determine which phase to resume from
    let resume_phase = if analysis.arrive_started_at.is_some() && analysis.arrive_completed_at.is_none() {
        SAMPhase::Arrive
    } else if analysis.compound_started_at.is_some() && analysis.compound_completed_at.is_none() {
        SAMPhase::Compound
    } else if analysis.inherit_started_at.is_some() && analysis.inherit_completed_at.is_none() {
        SAMPhase::Inherit
    } else if analysis.anchor_started_at.is_some() && analysis.anchor_completed_at.is_none() {
        SAMPhase::Anchor
    } else if analysis.anchor_completed_at.is_some() && analysis.inherit_started_at.is_none() {
        SAMPhase::Inherit
    } else if analysis.inherit_completed_at.is_some() && analysis.compound_started_at.is_none() {
        SAMPhase::Compound
    } else if analysis.compound_completed_at.is_some() && analysis.arrive_started_at.is_none() {
        SAMPhase::Arrive
    } else {
        SAMPhase::Anchor // Start from beginning
    };

    // Parse metadata to get document_ids and other config
    let metadata: serde_json::Value = serde_json::from_str(&analysis.metadata)
        .unwrap_or(serde_json::json!({}));

    let document_ids: Vec<String> = metadata.get("document_ids")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    let focus_claims: Option<Vec<String>> = metadata.get("focus_claims")
        .and_then(|v| serde_json::from_value(v.clone()).ok());

    let stop_after_phase: Option<SAMPhase> = metadata.get("stop_after_phase")
        .and_then(|v| v.as_str())
        .and_then(SAMPhase::from_str);

    // Update status
    match sqlx::query(
        "UPDATE sam_analyses SET status = ?, error_message = NULL, error_phase = NULL, updated_at = ? WHERE id = ?"
    )
    .bind(resume_phase.status_running())
    .bind(&now)
    .bind(&analysis_id)
    .execute(db.pool())
    .await
    {
        Ok(_) => {
            // Create cancellation token
            let cancel_token = CancellationToken::new();

            // Store the token
            {
                let mut tokens = state.sam_tokens.lock().await;
                tokens.insert(analysis_id.clone(), cancel_token.clone());
            }

            // Get pool for the spawned task
            let pool = db.pool().clone();
            let analysis_id_clone = analysis_id.clone();
            let analysis_id_cleanup = analysis_id.clone();
            let case_id = analysis.case_id.clone();
            let sam_tokens = state.sam_tokens.clone();

            // Spawn the resume task
            tokio::spawn(async move {
                let config = SAMConfig {
                    analysis_id: analysis_id_clone.clone(),
                    case_id,
                    document_ids,
                    focus_claims,
                    stop_after_phase,
                    timeout_seconds: 300,
                };

                let executor = SAMExecutor::new(pool, config, cancel_token);

                if let Err(e) = executor.execute_from_phase(resume_phase).await {
                    log::error!("S.A.M. analysis {} resume failed: {}", analysis_id_clone, e);
                } else {
                    log::info!("S.A.M. analysis {} resumed and completed successfully", analysis_id_clone);
                }

                // Clean up the token after completion
                let mut tokens = sam_tokens.lock().await;
                tokens.remove(&analysis_id_cleanup);
            });

            Ok(SAMActionResult {
                success: true,
                error: None,
            })
        }
        Err(e) => Ok(SAMActionResult {
            success: false,
            error: Some(e.to_string()),
        }),
    }
}
