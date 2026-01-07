//! Document processing module
//!
//! Handles text extraction, chunking, and verification of documents.

pub mod extractor;
pub mod chunker;

pub use extractor::{extract_text, TextExtractorError};
pub use chunker::{chunk_text, Chunk};

use crate::db::schema::Document;
use crate::commands::settings::{PythonConfig, get_python_command, get_ocr_script_path};
use crate::AppState;
use log::{info, error, warn};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, Manager};
use std::process::Command;
use tempfile::NamedTempFile;

/// RAII guard for temporary file cleanup
struct TempFileGuard {
    path: PathBuf,
}

impl TempFileGuard {
    fn new(path: PathBuf) -> Self {
        Self { path }
    }

    /// Get the path as a string
    fn path_str(&self) -> &str {
        self.path.to_str().unwrap_or("")
    }

    /// Consume the guard and return the path without cleaning up
    /// Use this when you want to keep the file
    #[allow(dead_code)]
    fn keep(self) -> PathBuf {
        let path = self.path.clone();
        std::mem::forget(self); // Don't run drop
        path
    }
}

impl Drop for TempFileGuard {
    fn drop(&mut self) {
        if self.path.exists() {
            if let Err(e) = std::fs::remove_file(&self.path) {
                warn!("Failed to clean up temp file {}: {}", self.path.display(), e);
            }
        }
    }
}

/// Get Python configuration from app settings
fn get_python_config(app_handle: &AppHandle) -> PythonConfig {
    // Try to load settings, fall back to defaults
    let config_path = app_handle
        .path()
        .app_data_dir()
        .ok()
        .map(|p| p.join("config.json"));

    if let Some(path) = config_path {
        if path.exists() {
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Ok(settings) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(python) = settings.get("python") {
                        if let Ok(config) = serde_json::from_value::<PythonConfig>(python.clone()) {
                            return config;
                        }
                    }
                }
            }
        }
    }

    PythonConfig::default()
}

/// Run Python OCR script for high-quality extraction
async fn run_python_ocr(app_handle: &AppHandle, file_path: &str) -> Result<String, String> {
    // Get Python configuration from settings
    let python_config = get_python_config(app_handle);

    // Get configured paths
    let python_cmd = get_python_command(&python_config);
    let script_path_str = get_ocr_script_path(&python_config);
    let script_path = Path::new(&script_path_str);

    // Also check in Tauri resources directory
    let script_exists = if script_path.exists() {
        true
    } else if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let resource_script = resource_dir.join("tools").join("ocr").join("process_messages_ocr.py");
        resource_script.exists()
    } else {
        false
    };

    if !script_exists {
        return Err(format!(
            "OCR script not found at '{}'. Configure ocr_script_path in settings or ensure tools/ocr/process_messages_ocr.py exists.",
            script_path_str
        ));
    }

    // Create a temporary file for output with RAII cleanup
    let output_file = NamedTempFile::new().map_err(|e| format!("Failed to create temp file: {}", e))?;

    // Keep the file handle open but get the path for the guard
    let (file, temp_path) = output_file.keep().map_err(|e| format!("Failed to persist temp file: {}", e))?;
    drop(file); // Close file handle so Python can write

    // Create guard - will clean up on any exit path
    let temp_guard = TempFileGuard::new(temp_path.clone());

    info!("Running Python OCR: {} (script: {})", python_cmd, script_path_str);

    let output = Command::new(&python_cmd)
        .arg(&script_path_str)
        .arg("--file")
        .arg(file_path)
        .arg("--output")
        .arg(temp_guard.path_str())
        .output()
        .map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                format!(
                    "Python not found at '{}'. Install Python or configure python_path in settings.",
                    python_cmd
                )
            } else {
                format!("Failed to execute Python: {}", e)
            }
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        error!("Python OCR failed. stderr: {}, stdout: {}", stderr, stdout);
        // temp_guard will clean up the file automatically here
        return Err(format!("Python script failed: {}", stderr));
    }

    // Read the result
    let result = std::fs::read_to_string(&temp_path)
        .map_err(|e| format!("Failed to read OCR output: {}", e))?;

    // temp_guard will clean up automatically when it goes out of scope
    Ok(result)
}

/// Generate embeddings for a batch of chunks
async fn generate_embeddings_batch(app_handle: &AppHandle, chunks: &mut Vec<Chunk>) -> Result<(), String> {
    if chunks.is_empty() {
        return Ok(());
    }

    let python_config = get_python_config(app_handle);
    let python_cmd = get_python_command(&python_config);
    
    // We assume the script is at scripts/embeddings.py relative to app root
    // In dev:
    let script_path = Path::new("scripts/embeddings.py");
    // In prod, check resources... for now assume dev path or bundled path logic similar to OCR
    let script_path_str = if script_path.exists() {
        "scripts/embeddings.py".to_string()
    } else {
        // resource/tools/embeddings.py ? For now fall back to assumption
        "scripts/embeddings.py".to_string()
    };

    // Prepare input file
    let input_file = NamedTempFile::new().map_err(|e| format!("Failed to create temp input file: {}", e))?;
    let (file, input_path) = input_file.keep().map_err(|e| format!("Failed to keep input file: {}", e))?;
    drop(file);
    let input_guard = TempFileGuard::new(input_path.clone());

    // Write chunks to input file
    let input_data: Vec<_> = chunks.iter().map(|c| {
        serde_json::json!({
            "id": c.id,
            "text": c.text
        })
    }).collect();
    
    let input_json = serde_json::to_string(&input_data).map_err(|e| format!("Failed to serialize chunks: {}", e))?;
    std::fs::write(&input_path, input_json).map_err(|e| format!("Failed to write input file: {}", e))?;

    // Prepare output file
    let output_file = NamedTempFile::new().map_err(|e| format!("Failed to create temp output file: {}", e))?;
    let (file, output_path) = output_file.keep().map_err(|e| format!("Failed to keep output file: {}", e))?;
    drop(file);
    let output_guard = TempFileGuard::new(output_path.clone());

    info!("Generating embeddings for {} chunks...", chunks.len());

    let output = Command::new(&python_cmd)
        .arg(&script_path_str)
        .arg("generate_batch")
        .arg("--input")
        .arg(input_guard.path_str())
        .arg("--output")
        .arg(output_guard.path_str())
        .output()
        .map_err(|e| format!("Failed to execute Python embedding script: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Embedding generation failed: {}", stderr));
    }

    // Read output
    let output_content = std::fs::read_to_string(&output_path).map_err(|e| format!("Failed to read embedding output: {}", e))?;
    
    // Parse output
    // The script should return a list of objects with "embedding" field
    // We need to map them back to our chunks
    let results: Vec<serde_json::Value> = serde_json::from_str(&output_content).map_err(|e| format!("Failed to parse embedding output: {}", e))?;
    
    // Create a map for faster lookup, though order should be preserved
    // Actually, let's just assume order is preserved or match by ID if needed.
    // For simplicity, let's iterate and match by ID.
    
    for result in results {
        if let (Some(id), Some(embedding_val)) = (result.get("id").and_then(|i| i.as_u64()), result.get("embedding")) {
             if let Some(chunk) = chunks.iter_mut().find(|c| c.id == id as usize) {
                 if let Ok(vec) = serde_json::from_value::<Vec<f32>>(embedding_val.clone()) {
                     chunk.embedding = Some(vec);
                 }
             }
        }
    }

    Ok(())
}

/// Process a document after upload
/// - Extract text based on file type
/// - Chunk text for semantic search
/// - Update database with extracted content
/// - Emit progress events
pub async fn process_document(
    app_handle: &AppHandle,
    state: &AppState,
    document_id: &str,
) -> Result<Document, String> {
    info!("Processing document: {}", document_id);
    
    // Emit start event
    let _ = app_handle.emit("document:processing_start", document_id);
    
    // Get document from DB
    let db = state.db.lock().await;
    let doc = sqlx::query_as::<_, Document>("SELECT * FROM documents WHERE id = ?")
        .bind(document_id)
        .fetch_optional(db.pool())
        .await
        .map_err(|e| format!("Database error: {}", e))?
        .ok_or_else(|| "Document not found".to_string())?;
    drop(db);
    
    // Update status to processing
    update_status(state, document_id, "processing", None).await?;
    let _ = app_handle.emit("document:processing_progress", serde_json::json!({
        "document_id": document_id,
        "progress": 10,
        "stage": "reading_file"
    }));
    
    // Read file from storage
    let storage = state.storage.lock().await;
    let file_data = storage
        .read_file(Path::new(&doc.storage_path))
        .map_err(|e| format!("Failed to read file: {}", e))?;
    drop(storage);
    
    let _ = app_handle.emit("document:processing_progress", serde_json::json!({
        "document_id": document_id,
        "progress": 30,
        "stage": "extracting_text"
    }));
    
    // Extract text based on file type
    let extracted_text = if doc.file_type == "application/pdf" {
        // Try Python OCR first for PDFs
        let _ = app_handle.emit("document:processing_progress", serde_json::json!({
            "document_id": document_id,
            "progress": 40,
            "stage": "ocr_processing"
        }));

        match run_python_ocr(app_handle, &doc.storage_path).await {
            Ok(text) => text,
            Err(e) => {
                error!("Python OCR failed for {}: {}, falling back to native", document_id, e);
                // Fallback to native
                 match extract_text(&doc.file_type, &file_data) {
                    Ok(text) => text,
                    Err(e) => {
                         error!("Native extraction also failed: {}", e);
                         update_status(state, document_id, "failed", Some(&e.to_string())).await?;
                         let _ = app_handle.emit("document:processing_error", serde_json::json!({
                             "document_id": document_id,
                             "error": format!("Text extraction failed: {}", e)
                         }));
                         return Err(format!("Text extraction failed: {}", e));
                    }
                 }
            }
        }
    } else {
        match extract_text(&doc.file_type, &file_data) {
            Ok(text) => text,
            Err(e) => {
                error!("Text extraction failed for {}: {}", document_id, e);
                update_status(state, document_id, "failed", Some(&e.to_string())).await?;
                let _ = app_handle.emit("document:processing_error", serde_json::json!({
                    "document_id": document_id,
                    "error": format!("Text extraction failed: {}", e)
                }));
                return Err(format!("Text extraction failed: {}", e));
            }
        }
    };
    
    let _ = app_handle.emit("document:processing_progress", serde_json::json!({
        "document_id": document_id,
        "progress": 60,
        "stage": "chunking"
    }));
    
    // Chunk text for semantic search
    let mut chunks = chunk_text(&extracted_text, 512, 50);
    let chunk_count = chunks.len();

    let _ = app_handle.emit("document:processing_progress", serde_json::json!({
        "document_id": document_id,
        "progress": 70,
        "stage": "generating_embeddings"
    }));

    // Generate embeddings
    if let Err(e) = generate_embeddings_batch(app_handle, &mut chunks).await {
        error!("Failed to generate embeddings for {}: {}. Continuing without embeddings.", document_id, e);
        // We continue, but chunks won't have embeddings
    }

    let _ = app_handle.emit("document:processing_progress", serde_json::json!({
        "document_id": document_id,
        "progress": 85,
        "stage": "saving"
    }));

    // Update document with extracted text
    // Note: page_count should be actual page count, not chunk count. For now, set to null.
    let db = state.db.lock().await;
    let now = chrono::Utc::now().to_rfc3339();

    sqlx::query(
        "UPDATE documents SET status = 'completed', extracted_text = ?, page_count = NULL, updated_at = ? WHERE id = ?"
    )
    .bind(&extracted_text)
    .bind(&now)
    .bind(document_id)
    .execute(db.pool())
    .await
    .map_err(|e| format!("Failed to update document: {}", e))?;

    // Persist chunks to database
    if !chunks.is_empty() {
        for chunk in chunks {
            let chunk_id = format!("{}-{}", document_id, chunk.id);
            let embedding_json = chunk.embedding.as_ref().map(|v| serde_json::to_string(v).unwrap_or_default());
            
            sqlx::query(
                "INSERT INTO document_chunks (id, document_id, chunk_index, content, embedding, page_number, metadata, created_at)
                 VALUES (?, ?, ?, ?, ?, NULL, '{}', ?)"
            )
            .bind(&chunk_id)
            .bind(document_id)
            .bind(chunk.id as i64)
            .bind(&chunk.text)
            .bind(embedding_json)
            .bind(&now)
            .execute(db.pool())
            .await
            .map_err(|e| format!("Failed to save chunk {}: {}", chunk.id, e))?;
        }

        info!("Saved {} chunks for document {}", chunk_count, document_id);
    }
    
    // Fetch updated document
    let updated_doc = sqlx::query_as::<_, Document>("SELECT * FROM documents WHERE id = ?")
        .bind(document_id)
        .fetch_one(db.pool())
        .await
        .map_err(|e| format!("Failed to fetch updated document: {}", e))?;
    
    let _ = app_handle.emit("document:processing_complete", serde_json::json!({
        "document_id": document_id,
        "text_length": extracted_text.len(),
        "chunk_count": chunk_count
    }));
    
    info!("Document {} processed: {} chars, {} chunks", document_id, extracted_text.len(), chunk_count);
    
    Ok(updated_doc)
}

/// Helper to update document status
async fn update_status(
    state: &AppState,
    document_id: &str,
    status: &str,
    error_msg: Option<&str>,
) -> Result<(), String> {
    let db = state.db.lock().await;
    let now = chrono::Utc::now().to_rfc3339();
    
    if let Some(err) = error_msg {
        sqlx::query(
            "UPDATE documents SET status = ?, metadata = json_set(metadata, '$.error', ?), updated_at = ? WHERE id = ?"
        )
        .bind(status)
        .bind(err)
        .bind(&now)
        .bind(document_id)
        .execute(db.pool())
        .await
        .map_err(|e| e.to_string())?;
    } else {
        sqlx::query("UPDATE documents SET status = ?, updated_at = ? WHERE id = ?")
            .bind(status)
            .bind(&now)
            .bind(document_id)
            .execute(db.pool())
            .await
            .map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

