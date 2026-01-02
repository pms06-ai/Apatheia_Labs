//! Document management commands

use crate::db::schema::Document;
use crate::processing;
use crate::AppState;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, State};
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
    let db = state.db.lock().await;
    
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
    let db = state.db.lock().await;
    
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

/// Maximum file size: 100MB
const MAX_FILE_SIZE: usize = 100 * 1024 * 1024;

/// Upload and store a new document
#[tauri::command]
pub async fn upload_document(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    input: UploadDocumentInput,
) -> Result<DocumentResult, String> {
    // Input validation
    if input.case_id.is_empty() {
        return Ok(DocumentResult {
            success: false,
            data: None,
            error: Some("Invalid case_id".into()),
        });
    }

    if input.data.is_empty() {
        return Ok(DocumentResult {
            success: false,
            data: None,
            error: Some("Empty file".into()),
        });
    }

    if input.data.len() > MAX_FILE_SIZE {
        return Ok(DocumentResult {
            success: false,
            data: None,
            error: Some(format!("File too large: maximum size is {}MB", MAX_FILE_SIZE / 1024 / 1024)),
        });
    }

    if input.filename.is_empty() || input.filename.len() > 255 {
        return Ok(DocumentResult {
            success: false,
            data: None,
            error: Some("Invalid filename".into()),
        });
    }

    let db = state.db.lock().await;
    let storage = state.storage.lock().await;

    // Store the file
    let (hash, storage_path) = match storage.store_file(&input.case_id, &input.filename, &input.data) {
        Ok(result) => result,
        Err(e) => {
            return Ok(DocumentResult {
                success: false,
                data: None,
                error: Some(format!("Failed to store file: {}", e)),
            });
        }
    };
    
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let file_size = input.data.len() as i64;
    
    match sqlx::query(
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
    {
        Ok(_) => {
            // Auto-process the document (matches upload_from_path behavior)
            let _ = processing::process_document(&app_handle, &state, &id).await;

            match sqlx::query_as::<_, Document>("SELECT * FROM documents WHERE id = ?")
                .bind(&id)
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

/// Update document status
#[tauri::command]
pub async fn update_document_status(
    state: State<'_, AppState>,
    document_id: String,
    status: String,
    extracted_text: Option<String>,
) -> Result<DocumentResult, String> {
    let db = state.db.lock().await;
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
    let db = state.db.lock().await;
    let storage = state.storage.lock().await;
    
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
#[tauri::command]
pub async fn pick_documents(app_handle: AppHandle) -> Result<PickFilesResult, String> {
    use tauri_plugin_dialog::FileDialogBuilder;
    
    let (tx, rx) = std::sync::mpsc::channel();
    
    FileDialogBuilder::new(app_handle.dialog().clone())
        .set_title("Select Documents")
        .add_filter("Documents", &["pdf", "txt", "md", "json", "csv", "html", "docx"])
        .add_filter("All Files", &["*"])
        .pick_files(move |files| {
            tx.send(files).ok();
        });
    
    match rx.recv() {
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
        Err(e) => Ok(PickFilesResult {
            success: false,
            files: vec![],
            error: Some(format!("Dialog error: {}", e)),
        }),
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
    println!("DEBUG: upload_from_path called for case_id: {}, file_path: {}", case_id, file_path);
    let path = PathBuf::from(&file_path);
    
    // Read file
    let data = match std::fs::read(&path) {
        Ok(d) => d,
        Err(e) => {
            return Ok(DocumentResult {
                success: false,
                data: None,
                error: Some(format!("Failed to read file: {}", e)),
            });
        }
    };

    // Basic validation to mirror upload_document
    if case_id.is_empty() || case_id.len() > 36 {
        return Ok(DocumentResult {
            success: false,
            data: None,
            error: Some("Invalid case_id: must be non-empty and max 36 characters".into()),
        });
    }

    if data.is_empty() {
        return Ok(DocumentResult {
            success: false,
            data: None,
            error: Some("Empty file: file must contain data".into()),
        });
    }

    if data.len() > MAX_FILE_SIZE {
        return Ok(DocumentResult {
            success: false,
            data: None,
            error: Some(format!("File too large: maximum size is {}MB", MAX_FILE_SIZE / 1024 / 1024)),
        });
    }

    let filename = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string());
    
    // Guess file type from extension
    let file_type = match path.extension().and_then(|e| e.to_str()) {
        Some("pdf") => "application/pdf",
        Some("txt") => "text/plain",
        Some("md") => "text/markdown",
        Some("json") => "application/json",
        Some("csv") => "text/csv",
        Some("html") | Some("htm") => "text/html",
        Some("docx") => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        _ => "application/octet-stream",
    };
    
    // Use the existing upload logic
    let input = UploadDocumentInput {
        case_id: case_id.clone(),
        filename,
        file_type: file_type.to_string(),
        doc_type,
        data,
    };
    
    let db = state.db.lock().await;
    let storage = state.storage.lock().await;
    
    // Store the file
    let (hash, storage_path) = match storage.store_file(&input.case_id, &input.filename, &input.data) {
        Ok(result) => result,
        Err(e) => {
            return Ok(DocumentResult {
                success: false,
                data: None,
                error: Some(format!("Failed to store file: {}", e)),
            });
        }
    };
    
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let file_size = input.data.len() as i64;
    
    match sqlx::query(
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
    {
        Ok(_) => {
            drop(db);
            drop(storage);
            
            // Auto-process the document
            match processing::process_document(&app_handle, &state, &id).await {
                Ok(doc) => Ok(DocumentResult {
                    success: true,
                    data: Some(doc),
                    error: None,
                }),
                Err(e) => {
                    // Document uploaded but processing failed
                    log::warn!("Document {} uploaded but processing failed: {}", id, e);
                    let db = state.db.lock().await;
                    let doc = sqlx::query_as::<_, Document>("SELECT * FROM documents WHERE id = ?")
                        .bind(&id)
                        .fetch_one(db.pool())
                        .await
                        .ok();
                    Ok(DocumentResult {
                        success: true,
                        data: doc,
                        error: Some(format!("Uploaded but processing failed: {}", e)),
                    })
                }
            }
        }
        Err(e) => Ok(DocumentResult {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

