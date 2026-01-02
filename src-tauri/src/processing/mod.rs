//! Document processing module
//!
//! Handles text extraction, chunking, and verification of documents.

pub mod extractor;
pub mod chunker;

pub use extractor::{extract_text, TextExtractorError};
pub use chunker::{chunk_text, Chunk};

use crate::db::schema::Document;
use crate::AppState;
use log::{info, error};
use std::path::Path;
use tauri::{AppHandle, Emitter};

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
    let extracted_text = match extract_text(&doc.file_type, &file_data) {
        Ok(text) => text,
        Err(e) => {
            error!("Text extraction failed for {}: {}", document_id, e);
            update_status(state, document_id, "failed", Some(&e.to_string())).await?;
            let _ = app_handle.emit("document:processing_error", serde_json::json!({
                "document_id": document_id,
                "error": e.to_string()
            }));
            return Err(format!("Text extraction failed: {}", e));
        }
    };
    
    let _ = app_handle.emit("document:processing_progress", serde_json::json!({
        "document_id": document_id,
        "progress": 60,
        "stage": "chunking"
    }));
    
    // Chunk text for semantic search
    let chunks = chunk_text(&extracted_text, 512, 50);
    let chunk_count = chunks.len();

    let _ = app_handle.emit("document:processing_progress", serde_json::json!({
        "document_id": document_id,
        "progress": 80,
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
            sqlx::query(
                "INSERT INTO document_chunks (id, document_id, chunk_index, content, page_number, metadata, created_at)
                 VALUES (?, ?, ?, ?, NULL, '{}', ?)"
            )
            .bind(&chunk_id)
            .bind(document_id)
            .bind(chunk.id as i64)
            .bind(&chunk.text)
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

