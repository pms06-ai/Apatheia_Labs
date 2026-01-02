//! Engine Orchestrator Module
//!
//! Manages the execution of FCIP analysis engines with job queue,
//! parallel execution, and progress tracking.

pub mod job;
pub mod runner;

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex, RwLock};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use tauri::{AppHandle, Emitter};
use log::{info, error, warn};

pub use job::{EngineJob, JobStatus, JobProgress};
pub use runner::{EngineRunner, EngineResult};

/// Engine identifiers matching the FCIP v6.0 specification
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EngineId {
    // Existing engines
    EntityResolution,
    TemporalParser,
    Argumentation,
    BiasDetection,
    Contradiction,
    AccountabilityAudit,
    ProfessionalTracker,
    // V6.0 engines
    Omission,
    ExpertWitness,
    Documentary,
    Narrative,
    Coordination,
    // Future engines
    Network,
    Memory,
    Linguistic,
    BiasCascade,
}

impl std::fmt::Display for EngineId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::EntityResolution => write!(f, "entity_resolution"),
            Self::TemporalParser => write!(f, "temporal_parser"),
            Self::Argumentation => write!(f, "argumentation"),
            Self::BiasDetection => write!(f, "bias_detection"),
            Self::Contradiction => write!(f, "contradiction"),
            Self::AccountabilityAudit => write!(f, "accountability_audit"),
            Self::ProfessionalTracker => write!(f, "professional_tracker"),
            Self::Omission => write!(f, "omission"),
            Self::ExpertWitness => write!(f, "expert_witness"),
            Self::Documentary => write!(f, "documentary"),
            Self::Narrative => write!(f, "narrative"),
            Self::Coordination => write!(f, "coordination"),
            Self::Network => write!(f, "network"),
            Self::Memory => write!(f, "memory"),
            Self::Linguistic => write!(f, "linguistic"),
            Self::BiasCascade => write!(f, "bias_cascade"),
        }
    }
}

impl EngineId {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            // Canonical names
            "entity_resolution" => Some(Self::EntityResolution),
            "temporal_parser" => Some(Self::TemporalParser),
            "argumentation" => Some(Self::Argumentation),
            "bias_detection" => Some(Self::BiasDetection),
            "contradiction" => Some(Self::Contradiction),
            "accountability_audit" => Some(Self::AccountabilityAudit),
            "professional_tracker" => Some(Self::ProfessionalTracker),
            "omission" => Some(Self::Omission),
            "expert_witness" => Some(Self::ExpertWitness),
            "documentary" => Some(Self::Documentary),
            "narrative" => Some(Self::Narrative),
            "coordination" => Some(Self::Coordination),
            "network" => Some(Self::Network),
            "memory" => Some(Self::Memory),
            "linguistic" => Some(Self::Linguistic),
            "bias_cascade" => Some(Self::BiasCascade),
            // Aliases (for backward compatibility)
            "temporal" => Some(Self::TemporalParser), // legacy alias
            _ => None,
        }
    }
    
    /// Get the list of active/implemented engines
    pub fn active_engines() -> Vec<Self> {
        vec![
            Self::EntityResolution,
            Self::TemporalParser,
            Self::Argumentation,
            Self::BiasDetection,
            Self::Contradiction,
            Self::AccountabilityAudit,
            Self::ProfessionalTracker,
            Self::Omission,
            Self::ExpertWitness,
            Self::Documentary,
            Self::Narrative,
            Self::Coordination,
        ]
    }
}

/// Analysis request submitted to the orchestrator
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisRequest {
    pub case_id: String,
    pub document_ids: Vec<String>,
    pub engines: Vec<String>,
    pub options: Option<serde_json::Value>,
}

/// Engine orchestrator that manages analysis job execution
pub struct EngineOrchestrator {
    /// Active jobs being processed
    active_jobs: Arc<RwLock<HashMap<String, Arc<Mutex<EngineJob>>>>>,
    /// Job queue sender
    #[allow(dead_code)]
    job_sender: mpsc::Sender<EngineJob>,
    /// Engine runner for TypeScript sidecar execution
    runner: Arc<EngineRunner>,
    /// Tauri app handle for emitting events
    app_handle: Option<AppHandle>,
}

impl EngineOrchestrator {
    /// Create a new orchestrator
    pub fn new() -> Self {
        let (tx, _rx) = mpsc::channel(100);
        
        Self {
            active_jobs: Arc::new(RwLock::new(HashMap::new())),
            job_sender: tx,
            runner: Arc::new(EngineRunner::new()),
            app_handle: None,
        }
    }
    
    /// Set the app handle for event emission
    pub fn with_app_handle(mut self, handle: AppHandle) -> Self {
        self.app_handle = Some(handle);
        self
    }
    
    /// Set the sidecar path for the engine runner
    pub fn with_sidecar_path(mut self, path: PathBuf) -> Self {
        self.runner = Arc::new(EngineRunner::new().with_sidecar_path(path));
        self
    }
    
    /// Enable mock mode (no real AI calls)
    pub fn with_mock_mode(mut self, mock: bool) -> Self {
        self.runner = Arc::new(EngineRunner::new().with_mock_mode(mock));
        self
    }
    
    /// Submit an analysis request
    pub async fn submit(&self, request: AnalysisRequest) -> Result<String, String> {
        let job_id = Uuid::new_v4().to_string();
        
        // Parse engine IDs
        let engines: Vec<EngineId> = request.engines
            .iter()
            .filter_map(|s| EngineId::from_str(s))
            .collect();
        
        if engines.is_empty() {
            return Err("No valid engines specified".to_string());
        }
        
        let engine_count = engines.len();
        
        // Create job
        let job = EngineJob::new(
            job_id.clone(),
            request.case_id.clone(),
            request.document_ids.clone(),
            engines,
        );
        
        // Store in active jobs
        {
            let mut jobs = self.active_jobs.write().await;
            jobs.insert(job_id.clone(), Arc::new(Mutex::new(job.clone())));
        }
        
        // Emit job started event
        self.emit_event("engine:job_started", &serde_json::json!({
            "job_id": job_id,
            "case_id": request.case_id,
            "engines": request.engines,
        }));
        
        info!("Job {} submitted with {} engines", job_id, engine_count);
        
        // Clone for async processing
        let job_id_clone = job_id.clone();
        let active_jobs = self.active_jobs.clone();
        let runner = self.runner.clone();
        let app_handle = self.app_handle.clone();
        
        // Spawn job processor
        tokio::spawn(async move {
            Self::process_job(job_id_clone, active_jobs, runner, app_handle).await;
        });
        
        Ok(job_id)
    }
    
    /// Process a submitted job
    async fn process_job(
        job_id: String,
        active_jobs: Arc<RwLock<HashMap<String, Arc<Mutex<EngineJob>>>>>,
        runner: Arc<EngineRunner>,
        app_handle: Option<AppHandle>,
    ) {
        info!("Processing job {}", job_id);
        
        // Get job
        let job_arc = {
            let jobs = active_jobs.read().await;
            jobs.get(&job_id).cloned()
        };
        
        let job_arc = match job_arc {
            Some(j) => j,
            None => {
                error!("Job {} not found", job_id);
                return;
            }
        };
        
        // Update status to running
        {
            let mut job = job_arc.lock().await;
            job.status = JobStatus::Running;
            job.started_at = Some(chrono::Utc::now());
        }
        
        // Get engines to run
        let (case_id, document_ids, engines) = {
            let job = job_arc.lock().await;
            (job.case_id.clone(), job.document_ids.clone(), job.engines.clone())
        };
        
        // Track mock mode usage for warning
        let mut mock_mode_detected = false;

        // Run each engine
        let mut completed = 0;
        let total = engines.len();

        for engine_id in engines {
            // Check if job was cancelled
            {
                let job = job_arc.lock().await;
                if job.status == JobStatus::Cancelled {
                    info!("Job {} was cancelled, stopping", job_id);
                    return;
                }
            }
            
            // Emit progress
            if let Some(ref handle) = app_handle {
                let _ = handle.emit("engine:progress", serde_json::json!({
                    "job_id": job_id,
                    "engine_id": engine_id.to_string(),
                    "completed": completed,
                    "total": total,
                    "status": "running",
                }));
            }
            
            info!("Running engine {} for job {} ({}/{})", engine_id, job_id, completed + 1, total);
            
            // Run the engine via sidecar
            let result = runner.run_engine(
                engine_id,
                &case_id,
                &document_ids,
            ).await;
            
            // Update job with result
            {
                let mut job = job_arc.lock().await;
                match result {
                    Ok(engine_result) => {
                        let finding_count = engine_result.findings.len();

                        // Track if mock mode was used
                        if engine_result.used_mock_mode && !mock_mode_detected {
                            mock_mode_detected = true;
                            // Emit mock mode warning event
                            if let Some(ref handle) = app_handle {
                                let _ = handle.emit("engine:mock_mode", serde_json::json!({
                                    "job_id": job_id,
                                    "message": "AI analysis unavailable - showing placeholder data. Check sidecar configuration.",
                                }));
                            }
                            warn!("Mock mode active - findings are placeholder data, not real AI analysis");
                        }

                        job.results.insert(engine_id, Ok(engine_result.findings));

                        info!("Engine {} completed with {} findings (mock: {})",
                              engine_id, finding_count, engine_result.used_mock_mode);

                        // Emit finding event
                        if let Some(ref handle) = app_handle {
                            let _ = handle.emit("engine:finding", serde_json::json!({
                                "job_id": job_id,
                                "engine_id": engine_id.to_string(),
                                "finding_count": finding_count,
                                "mock_mode": engine_result.used_mock_mode,
                            }));
                        }
                    }
                    Err(e) => {
                        warn!("Engine {} failed: {}", engine_id, e);
                        job.results.insert(engine_id, Err(e.clone()));

                        // Emit error event
                        if let Some(ref handle) = app_handle {
                            let _ = handle.emit("engine:error", serde_json::json!({
                                "job_id": job_id,
                                "engine_id": engine_id.to_string(),
                                "error": e,
                            }));
                        }
                    }
                }
            }
            
            completed += 1;
        }
        
        // Mark job as complete
        {
            let mut job = job_arc.lock().await;
            job.status = JobStatus::Completed;
            job.completed_at = Some(chrono::Utc::now());
        }
        
        // Emit completion event
        if let Some(ref handle) = app_handle {
            let _ = handle.emit("engine:complete", serde_json::json!({
                "job_id": job_id,
                "status": "completed",
                "engines_completed": completed,
            }));
        }
        
        info!("Job {} completed ({} engines)", job_id, completed);
    }
    
    /// Get job progress
    pub async fn get_progress(&self, job_id: &str) -> Option<JobProgress> {
        let jobs = self.active_jobs.read().await;
        if let Some(job_arc) = jobs.get(job_id) {
            let job = job_arc.lock().await;
            Some(job.get_progress())
        } else {
            None
        }
    }
    
    /// Cancel a running job
    pub async fn cancel_job(&self, job_id: &str) -> Result<(), String> {
        let jobs = self.active_jobs.write().await;
        if let Some(job_arc) = jobs.get(job_id) {
            let mut job = job_arc.lock().await;
            if job.status == JobStatus::Running || job.status == JobStatus::Pending {
                job.status = JobStatus::Cancelled;
                self.emit_event("engine:cancelled", &serde_json::json!({
                    "job_id": job_id,
                }));
                Ok(())
            } else {
                Err("Job is not running".to_string())
            }
        } else {
            Err("Job not found".to_string())
        }
    }
    
    /// List all active jobs
    pub async fn list_jobs(&self) -> Vec<JobProgress> {
        let jobs = self.active_jobs.read().await;
        let mut result = Vec::new();
        for job_arc in jobs.values() {
            let job = job_arc.lock().await;
            result.push(job.get_progress());
        }
        result
    }

    /// Run a single engine (not part of a job)
    /// Delegates to the engine runner
    pub async fn run_single_engine(
        &self,
        engine_id: EngineId,
        case_id: &str,
        document_ids: &[String],
    ) -> Result<Vec<job::EngineFinding>, String> {
        let result = self.runner.run_engine(engine_id, case_id, document_ids).await?;

        // Emit mock mode warning if applicable
        if result.used_mock_mode {
            if let Some(ref handle) = self.app_handle {
                let _ = handle.emit("engine:mock_mode", serde_json::json!({
                    "message": "AI analysis unavailable - showing placeholder data. Check sidecar configuration.",
                }));
            }
        }

        Ok(result.findings)
    }
    
    /// Clean up completed jobs older than given duration
    #[allow(dead_code)]
    pub async fn cleanup_old_jobs(&self, max_age: chrono::Duration) {
        let jobs = self.active_jobs.write().await;
        let now = chrono::Utc::now();
        
        for (job_id, job_arc) in jobs.iter() {
            if let Ok(job) = job_arc.try_lock() {
                if let Some(completed_at) = job.completed_at {
                    if now - completed_at >= max_age {
                        log::debug!("Job {} is older than max age", job_id);
                    }
                }
            }
        }
    }
    
    /// Emit an event to the frontend
    fn emit_event(&self, event: &str, payload: &serde_json::Value) {
        if let Some(ref handle) = self.app_handle {
            let _ = handle.emit(event, payload.clone());
        }
    }
}

impl Default for EngineOrchestrator {
    fn default() -> Self {
        Self::new()
    }
}
