//! Engine runner - executes TypeScript engines via sidecar
//!
//! This module handles communication with the Node.js sidecar process
//! that runs the FCIP analysis engines.

use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::Command;
use tokio::time::{timeout, Duration};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use serde::{Deserialize, Serialize};
use log::{info, debug, error, warn};

use super::{EngineId, job::EngineFinding};

/// Request sent to the TypeScript engine runner
#[derive(Debug, Serialize)]
struct EngineRequest {
    engine_id: String,
    case_id: String,
    document_ids: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    options: Option<serde_json::Value>,
}

/// Response from the TypeScript engine runner
#[derive(Debug, Deserialize)]
struct EngineResponse {
    success: bool,
    #[serde(rename = "engine_id")]
    _engine_id: String,
    findings: Option<Vec<EngineFinding>>,
    error: Option<String>,
    #[allow(dead_code)]
    duration_ms: u64,
}

/// Result from engine execution, includes mock mode indicator
#[derive(Debug)]
pub struct EngineResult {
    pub findings: Vec<EngineFinding>,
    pub used_mock_mode: bool,
}

/// Engine runner that communicates with TypeScript sidecar
pub struct EngineRunner {
    /// Path to the engine runner JavaScript file
    sidecar_path: Option<PathBuf>,
    /// Whether to use mock mode (no real AI calls)
    mock_mode: bool,
}

impl EngineRunner {
    pub fn new() -> Self {
        Self {
            sidecar_path: None,
            mock_mode: false,
        }
    }
    
    /// Set the sidecar path
    pub fn with_sidecar_path(mut self, path: PathBuf) -> Self {
        self.sidecar_path = Some(path);
        self
    }
    
    /// Enable mock mode (no real AI calls)
    pub fn with_mock_mode(mut self, mock: bool) -> Self {
        self.mock_mode = mock;
        self
    }

    /// Check if runner is in mock mode or will fall back to mock
    pub fn is_mock_mode(&self) -> bool {
        if self.mock_mode {
            return true;
        }
        // Also mock if no valid sidecar path
        match &self.sidecar_path {
            Some(path) => !path.exists(),
            None => true,
        }
    }
    
    /// Try to find the sidecar in common locations
    pub fn find_sidecar(&mut self) -> Option<PathBuf> {
        let candidates = vec![
            // Development: relative to src-tauri
            PathBuf::from("sidecars/engine-runner.js"),
            // Development: from workspace root
            PathBuf::from("src-tauri/sidecars/engine-runner.js"),
            // Bundled: in resources directory (set by Tauri at runtime)
            // This would be set via set_resource_path
        ];
        
        for path in candidates {
            if path.exists() {
                info!("Found sidecar at: {}", path.display());
                self.sidecar_path = Some(path.clone());
                return Some(path);
            }
        }
        
        warn!("Sidecar not found in default locations, will use mock mode");
        None
    }
    
    /// Set the sidecar path from Tauri resource directory
    pub fn set_resource_path(&mut self, resource_dir: PathBuf) {
        let sidecar = resource_dir.join("sidecars").join("engine-runner.js");
        if sidecar.exists() {
            info!("Using bundled sidecar: {}", sidecar.display());
            self.sidecar_path = Some(sidecar);
        } else {
            warn!("Bundled sidecar not found at: {}", sidecar.display());
        }
    }
    
    /// Run an engine and return findings with mock mode indicator
    pub async fn run_engine(
        &self,
        engine_id: EngineId,
        case_id: &str,
        document_ids: &[String],
    ) -> Result<EngineResult, String> {
        self.run_engine_with_options(engine_id, case_id, document_ids, None).await
    }

    /// Run an engine with custom options (for S.A.M. prompt execution)
    pub async fn run_engine_with_options(
        &self,
        engine_id: EngineId,
        case_id: &str,
        document_ids: &[String],
        options: Option<serde_json::Value>,
    ) -> Result<EngineResult, String> {
        info!("Running engine {} for case {} with {} documents",
              engine_id, case_id, document_ids.len());

        // If mock mode or no sidecar, return mock data
        if self.mock_mode {
            debug!("Using mock mode (explicitly configured)");
            let findings = self.run_mock_engine(engine_id, case_id, document_ids).await?;
            return Ok(EngineResult { findings, used_mock_mode: true });
        }

        if let Some(ref sidecar_path) = self.sidecar_path {
            if sidecar_path.exists() {
                let findings = self.run_via_sidecar(sidecar_path, engine_id, case_id, document_ids, options).await?;
                return Ok(EngineResult { findings, used_mock_mode: false });
            } else {
                warn!("Sidecar path does not exist: {}", sidecar_path.display());
            }
        }

        // Fall back to mock if sidecar not available
        warn!("Sidecar not available, falling back to mock engine - AI analysis disabled");
        let findings = self.run_mock_engine(engine_id, case_id, document_ids).await?;
        Ok(EngineResult { findings, used_mock_mode: true })
    }
    
    /// Run engine via TypeScript sidecar process
    async fn run_via_sidecar(
        &self,
        sidecar_path: &PathBuf,
        engine_id: EngineId,
        case_id: &str,
        document_ids: &[String],
        options: Option<serde_json::Value>,
    ) -> Result<Vec<EngineFinding>, String> {
        let request = EngineRequest {
            engine_id: engine_id.to_string(),
            case_id: case_id.to_string(),
            document_ids: document_ids.to_vec(),
            options,
        };
        
        let request_json = serde_json::to_string(&request)
            .map_err(|e| format!("Failed to serialize request: {}", e))?;
        
        debug!("Spawning sidecar at: {}", sidecar_path.display());
        
        // Spawn the sidecar process
        let mut child = Command::new("node")
            .arg(sidecar_path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn sidecar: {}. Is Node.js installed?", e))?;
        
        // Run sidecar with a safety timeout to avoid hangs
        let result = timeout(Duration::from_secs(180), async {
            // Send request to stdin
            // Send request to stdin
            if let Some(mut stdin) = child.stdin.take() {
                stdin.write_all(request_json.as_bytes()).await
                    .map_err(|e| format!("Failed to write to sidecar stdin: {}", e))?;
                stdin.write_all(b"\n").await
                    .map_err(|e| format!("Failed to write newline: {}", e))?;
                // Close stdin to signal end of input - this happens automatically when stdin is dropped at end of scope
            }
            
            // Read stderr for logging (sidecar logs to stderr)
            let stderr = child.stderr.take();
            if let Some(stderr) = stderr {
                let mut stderr_reader = BufReader::new(stderr);
                let mut line = String::new();
                while stderr_reader.read_line(&mut line).await.unwrap_or(0) > 0 {
                    debug!("[Sidecar] {}", line.trim());
                    line.clear();
                }
            }
            
            // Read response from stdout
            let stdout = child.stdout.take()
                .ok_or("Failed to get stdout handle")?;
            let mut reader = BufReader::new(stdout);
            let mut response_line = String::new();
            
            // Read the first line (JSON response)
            reader.read_line(&mut response_line).await
                .map_err(|e| format!("Failed to read response: {}", e))?;
            
            // Wait for process to complete
            let status = child.wait().await
                .map_err(|e| format!("Failed to wait for sidecar: {}", e))?;
            
            if !status.success() {
                error!("Sidecar exited with status: {}", status);
                // Don't fail immediately, try to parse response anyway
            }
            
            if response_line.trim().is_empty() {
                return Err("Empty response from sidecar".to_string());
            }
            
            // Parse response
            let response: EngineResponse = serde_json::from_str(&response_line)
                .map_err(|e| format!("Failed to parse response: {}. Response was: {}", e, response_line))?;
            
            if response.success {
                let findings = response.findings.unwrap_or_default();
                info!("Engine {} returned {} findings", engine_id, findings.len());
                Ok(findings)
            } else {
                Err(response.error.unwrap_or_else(|| "Unknown sidecar error".to_string()))
            }
        }).await;

        match result {
            Ok(inner) => inner,
            Err(_) => {
                // Timeout: ensure the child process is terminated to avoid zombies
                if let Err(e) = child.kill().await {
                    warn!("Failed to kill timed-out sidecar: {}", e);
                }
                let _ = child.wait().await;
                Err("Sidecar timed out after 180s".to_string())
            }
        }
    }
    
    /// Mock engine implementation for development/testing
    async fn run_mock_engine(
        &self,
        engine_id: EngineId,
        case_id: &str,
        document_ids: &[String],
    ) -> Result<Vec<EngineFinding>, String> {
        debug!("Running mock engine {} for case {}", engine_id, case_id);
        
        // Simulate processing time
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        
        // Return mock findings based on engine type
        let findings = match engine_id {
            EngineId::Contradiction => vec![
                EngineFinding {
                    id: uuid::Uuid::new_v4().to_string(),
                    engine_id: engine_id.to_string(),
                    finding_type: "factual_contradiction".to_string(),
                    title: "[MOCK] Date discrepancy detected".to_string(),
                    description: "Document A states incident occurred on 15th, Document B states 17th".to_string(),
                    severity: "high".to_string(),
                    confidence: 0.85,
                    document_ids: document_ids.to_vec(),
                    evidence: serde_json::json!({
                        "doc_a_excerpt": "The incident took place on the 15th of March",
                        "doc_b_excerpt": "As recorded on March 17th, the incident...",
                        "mock": true
                    }),
                    metadata: serde_json::json!({"mock": true}),
                },
            ],
            EngineId::Omission => vec![
                EngineFinding {
                    id: uuid::Uuid::new_v4().to_string(),
                    engine_id: engine_id.to_string(),
                    finding_type: "material_omission".to_string(),
                    title: "[MOCK] Key witness not mentioned".to_string(),
                    description: "Source document references witness statements not present in summary".to_string(),
                    severity: "medium".to_string(),
                    confidence: 0.72,
                    document_ids: document_ids.to_vec(),
                    evidence: serde_json::json!({
                        "missing_reference": "Witness John Doe's statement dated 2024-01-15",
                        "mock": true
                    }),
                    metadata: serde_json::json!({"mock": true}),
                },
            ],
            EngineId::ExpertWitness => vec![
                EngineFinding {
                    id: uuid::Uuid::new_v4().to_string(),
                    engine_id: engine_id.to_string(),
                    finding_type: "scope_exceeded".to_string(),
                    title: "[MOCK] Expert exceeded scope".to_string(),
                    description: "Expert made determinations outside their stated field of expertise".to_string(),
                    severity: "high".to_string(),
                    confidence: 0.78,
                    document_ids: document_ids.to_vec(),
                    evidence: serde_json::json!({"mock": true}),
                    metadata: serde_json::json!({"mock": true}),
                },
            ],
            EngineId::Narrative => vec![
                EngineFinding {
                    id: uuid::Uuid::new_v4().to_string(),
                    engine_id: engine_id.to_string(),
                    finding_type: "amplification".to_string(),
                    title: "[MOCK] Narrative amplification detected".to_string(),
                    description: "Claim became stronger across documents without new evidence".to_string(),
                    severity: "medium".to_string(),
                    confidence: 0.68,
                    document_ids: document_ids.to_vec(),
                    evidence: serde_json::json!({"mock": true}),
                    metadata: serde_json::json!({"mock": true}),
                },
            ],
            EngineId::Coordination => vec![
                EngineFinding {
                    id: uuid::Uuid::new_v4().to_string(),
                    engine_id: engine_id.to_string(),
                    finding_type: "shared_language".to_string(),
                    title: "[MOCK] Shared language detected".to_string(),
                    description: "Suspiciously similar phrasing in supposedly independent documents".to_string(),
                    severity: "high".to_string(),
                    confidence: 0.82,
                    document_ids: document_ids.to_vec(),
                    evidence: serde_json::json!({"mock": true}),
                    metadata: serde_json::json!({"mock": true}),
                },
            ],
            EngineId::EntityResolution => vec![
                EngineFinding {
                    id: uuid::Uuid::new_v4().to_string(),
                    engine_id: engine_id.to_string(),
                    finding_type: "extraction".to_string(),
                    title: "[MOCK] Entities extracted".to_string(),
                    description: "Found 12 unique entities across documents".to_string(),
                    severity: "info".to_string(),
                    confidence: 0.90,
                    document_ids: document_ids.to_vec(),
                    evidence: serde_json::json!({"entityCount": 12, "mock": true}),
                    metadata: serde_json::json!({"mock": true}),
                },
            ],
            EngineId::TemporalParser => vec![
                EngineFinding {
                    id: uuid::Uuid::new_v4().to_string(),
                    engine_id: engine_id.to_string(),
                    finding_type: "timeline_gap".to_string(),
                    title: "[MOCK] Timeline gap detected".to_string(),
                    description: "3-month gap in documentation with no explanation".to_string(),
                    severity: "medium".to_string(),
                    confidence: 0.75,
                    document_ids: document_ids.to_vec(),
                    evidence: serde_json::json!({"mock": true}),
                    metadata: serde_json::json!({"mock": true}),
                },
            ],
            _ => vec![
                EngineFinding {
                    id: uuid::Uuid::new_v4().to_string(),
                    engine_id: engine_id.to_string(),
                    finding_type: "general".to_string(),
                    title: format!("[MOCK] {} analysis complete", engine_id),
                    description: "Mock analysis completed successfully".to_string(),
                    severity: "info".to_string(),
                    confidence: 0.5,
                    document_ids: document_ids.to_vec(),
                    evidence: serde_json::json!({"mock": true}),
                    metadata: serde_json::json!({"mock": true}),
                },
            ],
        };
        
        info!("Mock engine {} produced {} findings", engine_id, findings.len());
        
        Ok(findings)
    }
}

impl Default for EngineRunner {
    fn default() -> Self {
        Self::new()
    }
}
