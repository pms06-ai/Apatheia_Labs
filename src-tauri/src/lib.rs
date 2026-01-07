//! Phronesis FCIP - Tauri Backend Library
//! 
//! Local-first forensic case intelligence platform.

pub mod commands;
pub mod db;
pub mod orchestrator;
pub mod processing;
pub mod sam;
pub mod storage;

use tauri::Manager;

use db::Database;
use orchestrator::EngineOrchestrator;
use storage::Storage;
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use tokio_util::sync::CancellationToken;

/// Application state shared across commands
pub struct AppState {
    pub db: Arc<Mutex<Database>>,
    pub storage: Arc<Mutex<Storage>>,
    /// Cancellation tokens for running S.A.M. analyses
    pub sam_tokens: Arc<Mutex<HashMap<String, CancellationToken>>>,
    /// Allowlist for file uploads (security)
    pub allowed_uploads: Arc<Mutex<HashSet<String>>>,
}

impl AppState {
    pub async fn new(app_data_dir: PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        let db_path = app_data_dir.join("phronesis.db");
        let storage_path = app_data_dir.join("storage");

        let db = Database::new(db_path).await?;
        let storage = Storage::new(storage_path);

        Ok(Self {
            db: Arc::new(Mutex::new(db)),
            storage: Arc::new(Mutex::new(storage)),
            sam_tokens: Arc::new(Mutex::new(HashMap::new())),
            allowed_uploads: Arc::new(Mutex::new(HashSet::new())),
        })
    }
}

/// Find the sidecar path, checking multiple locations
fn find_sidecar_path(app: &tauri::App) -> Option<PathBuf> {
    // Try resource directory first (bundled app)
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir.join("sidecars").join("engine-runner.js");
        if bundled.exists() {
            log::info!("Found bundled sidecar: {}", bundled.display());
            return Some(bundled);
        }
    }
    
    // Try development paths
    let dev_paths = vec![
        PathBuf::from("sidecars/engine-runner.js"),
        PathBuf::from("src-tauri/sidecars/engine-runner.js"),
        PathBuf::from("../src-tauri/sidecars/engine-runner.js"),
    ];
    
    for path in dev_paths {
        if path.exists() {
            log::info!("Found development sidecar: {}", path.display());
            return Some(path);
        }
    }
    
    log::warn!("Sidecar not found, engines will run in mock mode");
    None
}

/// Initialize Tauri application with all plugins and commands
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Get app data directory
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");
            
            log::info!("App data directory: {}", app_data_dir.display());
            
            // Find sidecar path
            let sidecar_path = find_sidecar_path(app);
            
            // Initialize orchestrator with app handle and sidecar path
            let mut orchestrator = EngineOrchestrator::new()
                .with_app_handle(app.handle().clone());
            
            if let Some(path) = sidecar_path {
                orchestrator = orchestrator.with_sidecar_path(path);
                log::info!("Engine orchestrator initialized with sidecar");
            } else {
                orchestrator = orchestrator.with_mock_mode(true);
                log::info!("Engine orchestrator initialized in MOCK mode");
            }
            
            app.manage(Arc::new(RwLock::new(orchestrator)));
            
            // Initialize state synchronously so commands always have access
            let state = tauri::async_runtime::block_on(AppState::new(app_data_dir))
                .map_err(|e| {
                    log::error!("Failed to initialize application state: {}", e);
                    e
                })?;
            app.manage(state);
            log::info!("Application state initialized successfully");
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Case commands
            commands::get_cases,
            commands::get_case,
            commands::create_case,
            commands::delete_case,
            // Document commands
            commands::get_documents,
            commands::get_document,
            commands::upload_document,
            commands::update_document_status,
            commands::delete_document,
            commands::process_document,
            commands::pick_documents,
            commands::upload_from_path,
            // Analysis commands
            commands::get_findings,
            commands::get_analysis,
            commands::run_engine,
            commands::save_finding,
            // Orchestrator commands
            commands::submit_analysis,
            commands::get_job_progress,
            commands::cancel_job,
            commands::list_jobs,
            // Settings commands
            commands::get_settings,
            commands::update_settings,
            commands::check_api_key,
            commands::validate_api_key,
            commands::check_claude_code_status,
            commands::check_python_status,
            // S.A.M. (Systematic Adversarial Methodology) commands
            commands::run_sam_analysis,
            commands::get_sam_progress,
            commands::get_sam_results,
            commands::cancel_sam_analysis,
            commands::resume_sam_analysis,
            // Export commands
            commands::save_export_file,
            // Search commands
            commands::search_documents,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
