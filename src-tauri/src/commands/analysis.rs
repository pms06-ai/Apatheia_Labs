//! Analysis and engine commands

use crate::db::schema::{Finding, Contradiction, Omission};
use crate::orchestrator::{AnalysisRequest, EngineOrchestrator, JobProgress};
use crate::AppState;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;
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
