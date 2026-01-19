//! Document management commands
//!
//! Provides Tauri commands for document upload, retrieval, and management.
//! All file operations use async channels to avoid blocking the Tokio runtime.

use crate::db::schema::Document;
use crate::processing;
use crate::AppState;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct UploadDocumentInput {
    pub case_id: String,
    pub filename: String,
    pub file_type: String,
    pub doc_type: Option<String>,
    pub data: Vec<u8>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DocumentResult {
    pub success: bool,
    pub data: Option<Document>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DocumentsListResult {
    pub success: bool,
    pub data: Vec<Document>,
    pub error: Option<String>,
}

/// Get all documents for a case
#[tauri::command]
pub async fn get_documents(
    state: State<'_, AppState>,
    case_id: String,
) -> Result<DocumentsListResult, String> {
    let db = state.db.read().await;
    
    match sqlx::query_as::<_, Document>(
        "SELECT * FROM documents WHERE case_id = ? ORDER BY created_at DESC"
    )
    .bind(&case_id)
    .fetch_all(db.pool())
    .await
    {
        Ok(docs) => Ok(DocumentsListResult {
            success: true,
            data: docs,
            error: None,
        }),
        Err(e) => Ok(DocumentsListResult {
            success: false,
            data: vec![],
            error: Some(e.to_string()),
        }),
    }
}

/// Get a single document by ID
#[tauri::command]
pub async fn get_document(
    state: State<'_, AppState>,
    document_id: String,
) -> Result<DocumentResult, String> {
    let db = state.db.read().await;
    
    match sqlx::query_as::<_, Document>("SELECT * FROM documents WHERE id = ?")
        .bind(&document_id)
        .fetch_optional(db.pool())
        .await
    {
        Ok(Some(doc)) => Ok(DocumentResult {
            success: true,
            data: Some(doc),
            error: None,
        }),
        Ok(None) => Ok(DocumentResult {
            success: false,
            data: None,
            error: Some("Document not found".to_string()),
        }),
        Err(e) => Ok(DocumentResult {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

/// Maximum upload size: 300MB
const MAX_UPLOAD_SIZE_BYTES: usize = 300 * 1024 * 1024;

/// Internal helper to store file and insert document record
/// Reduces code duplication between upload_document and upload_from_path
async fn store_and_insert_document(
    app_handle: &AppHandle,
    state: &AppState,
    input: &UploadDocumentInput,
) -> Result<Document, String> {
    let db = state.db.write().await;
    let storage = state.storage.write().await;

    // Store the file
    let (hash, storage_path) = storage
        .store_file(&input.case_id, &input.filename, &input.data)
        .map_err(|e| format!("Failed to store file: {}", e))?;

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let file_size = input.data.len() as i64;

    sqlx::query(
        "INSERT INTO documents (id, case_id, filename, file_type, file_size, storage_path, hash_sha256, acquisition_date, doc_type, status, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', '{}', ?, ?)"
    )
    .bind(&id)
    .bind(&input.case_id)
    .bind(&input.filename)
    .bind(&input.file_type)
    .bind(file_size)
    .bind(storage_path.to_string_lossy().to_string())
    .bind(&hash)
    .bind(&now)
    .bind(&input.doc_type)
    .bind(&now)
    .bind(&now)
    .execute(db.pool())
    .await
    .map_err(|e| format_db_error(&e, &input.case_id))?;

    // Spawn processing in background to avoid blocking IPC
    let app_handle_clone = app_handle.clone();
    let state_clone = state.clone();
    let id_clone = id.clone();

    tauri::async_runtime::spawn(async move {
        if let Err(e) = processing::process_document(&app_handle_clone, &state_clone, &id_clone).await {
            log::error!("Background processing failed for document {}: {}", id_clone, e);
        }
    });

    // Retrieve and return the document
    sqlx::query_as::<_, Document>("SELECT * FROM documents WHERE id = ?")
        .bind(&id)
        .fetch_one(db.pool())
        .await
        .map_err(|e| format!("Document saved but failed to retrieve: {}", e))
}

/// Format database errors into user-friendly messages
fn format_db_error(e: &sqlx::Error, case_id: &str) -> String {
    let error_msg = e.to_string();
    if error_msg.contains("FOREIGN KEY constraint failed") {
        format!("Case '{}' does not exist. Please create the case first.", case_id)
    } else if error_msg.contains("UNIQUE constraint") {
        "A document with this content already exists in the case.".to_string()
    } else {
        format!("Database error: {}", error_msg)
    }
}

/// Validate upload input and return error message if invalid
fn validate_upload_input(input: &UploadDocumentInput) -> Option<String> {
    if input.case_id.is_empty() {
        return Some("Invalid case_id".into());
    }
    if input.data.is_empty() {
        return Some("Empty file".into());
    }
    if input.data.len() > MAX_UPLOAD_SIZE_BYTES {
        return Some(format!(
            "File exceeds maximum upload size of {}MB",
            MAX_UPLOAD_SIZE_BYTES / 1024 / 1024
        ));
    }
    if input.filename.is_empty() || input.filename.len() > 255 {
        return Some("Invalid filename".into());
    }
    None
}

/// Upload and store a new document
#[tauri::command]
pub async fn upload_document(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    input: UploadDocumentInput,
) -> Result<DocumentResult, String> {
    // Input validation using helper function
    if let Some(error) = validate_upload_input(&input) {
        return Ok(DocumentResult {
            success: false,
            data: None,
            error: Some(error),
        });
    }

    // Use shared helper for storage and insertion
    match store_and_insert_document(&app_handle, state.inner(), &input).await {
        Ok(doc) => Ok(DocumentResult {
            success: true,
            data: Some(doc),
            error: None,
        }),
        Err(e) => Ok(DocumentResult {
            success: false,
            data: None,
            error: Some(e),
        }),
    }
}

/// Update document status
#[tauri::command]
pub async fn update_document_status(
    state: State<'_, AppState>,
    document_id: String,
    status: String,
    extracted_text: Option<String>,
) -> Result<DocumentResult, String> {
    let db = state.db.write().await;
    let now = chrono::Utc::now().to_rfc3339();
    
    match sqlx::query(
        "UPDATE documents SET status = ?, extracted_text = ?, updated_at = ? WHERE id = ?"
    )
    .bind(&status)
    .bind(&extracted_text)
    .bind(&now)
    .bind(&document_id)
    .execute(db.pool())
    .await
    {
        Ok(_) => {
            match sqlx::query_as::<_, Document>("SELECT * FROM documents WHERE id = ?")
                .bind(&document_id)
                .fetch_one(db.pool())
                .await
            {
                Ok(doc) => Ok(DocumentResult {
                    success: true,
                    data: Some(doc),
                    error: None,
                }),
                Err(e) => Ok(DocumentResult {
                    success: false,
                    data: None,
                    error: Some(e.to_string()),
                }),
            }
        }
        Err(e) => Ok(DocumentResult {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

/// Delete a document
#[tauri::command]
pub async fn delete_document(
    state: State<'_, AppState>,
    document_id: String,
) -> Result<DocumentResult, String> {
    let db = state.db.write().await;
    let storage = state.storage.write().await;
    
    // First get the document to find storage path
    if let Ok(Some(doc)) = sqlx::query_as::<_, Document>("SELECT * FROM documents WHERE id = ?")
        .bind(&document_id)
        .fetch_optional(db.pool())
        .await
    {
        // Delete from storage
        let _ = storage.delete_file(&doc.storage_path);
    }
    
    // Delete from database
    match sqlx::query("DELETE FROM documents WHERE id = ?")
        .bind(&document_id)
        .execute(db.pool())
        .await
    {
        Ok(_) => Ok(DocumentResult {
            success: true,
            data: None,
            error: None,
        }),
        Err(e) => Ok(DocumentResult {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

/// Process a document (extract text, chunk, etc.)
#[tauri::command]
pub async fn process_document(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    document_id: String,
) -> Result<DocumentResult, String> {
    match processing::process_document(&app_handle, &state, &document_id).await {
        Ok(doc) => Ok(DocumentResult {
            success: true,
            data: Some(doc),
            error: None,
        }),
        Err(e) => Ok(DocumentResult {
            success: false,
            data: None,
            error: Some(e),
        }),
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PickedFile {
    pub path: String,
    pub filename: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PickFilesResult {
    pub success: bool,
    pub files: Vec<PickedFile>,
    pub error: Option<String>,
}

/// Open file picker dialog for document selection
/// Uses tokio::sync::oneshot to avoid blocking the async runtime
#[tauri::command]
pub async fn pick_documents(app_handle: AppHandle) -> Result<PickFilesResult, String> {
    use tauri_plugin_dialog::FileDialogBuilder;

    // Use tokio oneshot channel instead of std::sync::mpsc to avoid blocking
    let (tx, rx) = tokio::sync::oneshot::channel();

    FileDialogBuilder::new(app_handle.dialog().clone())
        .set_title("Select Documents")
        .add_filter("Documents", &["pdf", "txt", "md", "json", "csv", "html", "docx"])
        .add_filter("All Files", &["*"])
        .pick_files(move |files| {
            // Ignore send error if receiver dropped (dialog cancelled)
            let _ = tx.send(files);
        });

    match rx.await {
        Ok(Some(files)) => {
            let picked: Vec<PickedFile> = files
                .iter()
                .map(|f| {
                    let path = f.as_path().map(|p| p.to_path_buf()).unwrap_or_default();
                    PickedFile {
                        path: path.to_string_lossy().to_string(),
                        filename: path
                            .file_name()
                            .map(|n| n.to_string_lossy().to_string())
                            .unwrap_or_else(|| "unknown".to_string()),
                    }
                })
                .collect();

            // Add picked files to allowlist
            let app_state: State<AppState> = app_handle.state();
            let mut allowed = app_state.allowed_uploads.lock().await;
            for file in &picked {
                allowed.insert(file.path.clone());
            }

            Ok(PickFilesResult {
                success: true,
                files: picked,
                error: None,
            })
        }
        Ok(None) => Ok(PickFilesResult {
            success: true,
            files: vec![],
            error: None,
        }),
        Err(_) => Ok(PickFilesResult {
            success: false,
            files: vec![],
            error: Some("Dialog was closed unexpectedly".to_string()),
        }),
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadDocumentResult {
    pub success: bool,
    pub filename: Option<String>,
    pub error: Option<String>,
}

/// Download a document - opens save dialog and writes file to chosen location
/// Uses tokio::sync::oneshot to avoid blocking the async runtime
#[tauri::command]
pub async fn download_document(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    document_id: String,
) -> Result<DownloadDocumentResult, String> {
    use tauri_plugin_dialog::FileDialogBuilder;

    // Get document from database
    let db = state.db.read().await;
    let doc = match sqlx::query_as::<_, Document>("SELECT * FROM documents WHERE id = ?")
        .bind(&document_id)
        .fetch_optional(db.pool())
        .await
    {
        Ok(Some(d)) => d,
        Ok(None) => {
            return Ok(DownloadDocumentResult {
                success: false,
                filename: None,
                error: Some("Document not found".to_string()),
            });
        }
        Err(e) => {
            return Ok(DownloadDocumentResult {
                success: false,
                filename: None,
                error: Some(format!("Database error: {}", e)),
            });
        }
    };
    drop(db);

    // Read file from storage
    let storage = state.storage.read().await;
    let storage_path = PathBuf::from(&doc.storage_path);
    let data = match storage.read_file(&storage_path) {
        Ok(d) => d,
        Err(e) => {
            return Ok(DownloadDocumentResult {
                success: false,
                filename: None,
                error: Some(format!("Failed to read file: {}", e)),
            });
        }
    };
    drop(storage);

    // Use tokio oneshot channel instead of std::sync::mpsc to avoid blocking
    let (tx, rx) = tokio::sync::oneshot::channel();
    let filename = doc.filename.clone();

    FileDialogBuilder::new(app_handle.dialog().clone())
        .set_title("Save Document")
        .set_file_name(&filename)
        .save_file(move |path| {
            let _ = tx.send(path);
        });

    match rx.await {
        Ok(Some(path)) => {
            // Write file to chosen location using async file I/O
            let dest_path = path.as_path().map(|p| p.to_path_buf()).unwrap_or_default();
            if let Err(e) = tokio::fs::write(&dest_path, &data).await {
                return Ok(DownloadDocumentResult {
                    success: false,
                    filename: None,
                    error: Some(format!("Failed to save file: {}", e)),
                });
            }
            Ok(DownloadDocumentResult {
                success: true,
                filename: Some(doc.filename),
                error: None,
            })
        }
        Ok(None) => {
            // User cancelled
            Ok(DownloadDocumentResult {
                success: false,
                filename: None,
                error: Some("Save cancelled".to_string()),
            })
        }
        Err(_) => Ok(DownloadDocumentResult {
            success: false,
            filename: None,
            error: Some("Dialog was closed unexpectedly".to_string()),
        }),
    }
}

/// Guess MIME type from file extension
fn guess_mime_type(path: &PathBuf) -> &'static str {
    match path.extension().and_then(|e| e.to_str()) {
        Some("pdf") => "application/pdf",
        Some("txt") => "text/plain",
        Some("md") => "text/markdown",
        Some("json") => "application/json",
        Some("csv") => "text/csv",
        Some("html") | Some("htm") => "text/html",
        Some("docx") => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        _ => "application/octet-stream",
    }
}

/// Upload a document from a file path (used after pick_documents)
#[tauri::command]
pub async fn upload_from_path(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    case_id: String,
    file_path: String,
    doc_type: Option<String>,
) -> Result<DocumentResult, String> {
    log::info!("upload_from_path called for case_id: {}, file_path: {}", case_id, file_path);

    // Security check: Verify file is in allowlist
    {
        let mut allowed = state.allowed_uploads.lock().await;
        if !allowed.contains(&file_path) {
            log::warn!("Security violation: Attempted to upload file not in allowlist: {}", file_path);
            return Ok(DocumentResult {
                success: false,
                data: None,
                error: Some("Security violation: File access denied".into()),
            });
        }
        // Remove from allowlist (one-time use)
        allowed.remove(&file_path);
    }

    let path = PathBuf::from(&file_path);

    // Read file using async I/O
    let data = match tokio::fs::read(&path).await {
        Ok(d) => d,
        Err(e) => {
            return Ok(DocumentResult {
                success: false,
                data: None,
                error: Some(format!("Failed to read file: {}", e)),
            });
        }
    };

    let filename = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    let file_type = guess_mime_type(&path);

    // Build input and validate using shared helper
    let input = UploadDocumentInput {
        case_id: case_id.clone(),
        filename,
        file_type: file_type.to_string(),
        doc_type,
        data,
    };

    if let Some(error) = validate_upload_input(&input) {
        return Ok(DocumentResult {
            success: false,
            data: None,
            error: Some(error),
        });
    }

    // Use shared helper for storage and insertion
    match store_and_insert_document(&app_handle, state.inner(), &input).await {
        Ok(doc) => {
            log::info!("Document uploaded successfully: {} ({})", doc.filename, doc.id);
            Ok(DocumentResult {
                success: true,
                data: Some(doc),
                error: None,
            })
        }
        Err(e) => {
            log::error!("Failed to insert document: {} (case_id: {}, file_path: {})", e, case_id, file_path);
            Ok(DocumentResult {
                success: false,
                data: None,
                error: Some(e),
            })
        }
    }
}
