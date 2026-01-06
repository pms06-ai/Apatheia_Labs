//! Export commands for saving generated documents to the filesystem
//!
//! This module provides native file save dialog functionality for exporting
//! evidence packages in PDF and Word formats.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

/// Maximum export file size: 50MB
const MAX_EXPORT_SIZE: usize = 50 * 1024 * 1024;

/// Result type for export operations
#[derive(Debug, Serialize, Deserialize)]
pub struct ExportResult {
    pub success: bool,
    pub path: Option<String>,
    pub error: Option<String>,
}

/// Supported export file types
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExportFileType {
    Pdf,
    Docx,
}

impl ExportFileType {
    /// Get the file extension for this type
    pub fn extension(&self) -> &'static str {
        match self {
            ExportFileType::Pdf => "pdf",
            ExportFileType::Docx => "docx",
        }
    }

    /// Get the MIME type for this type
    pub fn mime_type(&self) -> &'static str {
        match self {
            ExportFileType::Pdf => "application/pdf",
            ExportFileType::Docx => {
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            }
        }
    }

    /// Get the filter description for file dialogs
    pub fn filter_description(&self) -> &'static str {
        match self {
            ExportFileType::Pdf => "PDF Documents",
            ExportFileType::Docx => "Word Documents",
        }
    }

    /// Parse from file extension string
    pub fn from_extension(ext: &str) -> Option<Self> {
        match ext.to_lowercase().as_str() {
            "pdf" => Some(ExportFileType::Pdf),
            "docx" => Some(ExportFileType::Docx),
            _ => None,
        }
    }
}

/// Infer export file type from filename
fn infer_file_type(filename: &str) -> Option<ExportFileType> {
    let path = PathBuf::from(filename);
    path.extension()
        .and_then(|e| e.to_str())
        .and_then(ExportFileType::from_extension)
}

/// Save export file using native file dialog
///
/// # Arguments
/// * `app_handle` - Tauri app handle for dialog access
/// * `filename` - Suggested filename with extension (e.g., "evidence-export.pdf")
/// * `data` - File contents as bytes
///
/// # Returns
/// * `ExportResult` - Contains success status, saved path on success, or error message
///
/// # Example
/// ```ignore
/// let result = save_export_file(app_handle, "report.pdf", pdf_bytes).await?;
/// if result.success {
///     println!("Saved to: {}", result.path.unwrap());
/// }
/// ```
#[tauri::command]
pub async fn save_export_file(
    app_handle: AppHandle,
    filename: String,
    data: Vec<u8>,
) -> Result<ExportResult, String> {
    // Input validation
    if filename.is_empty() {
        return Ok(ExportResult {
            success: false,
            path: None,
            error: Some("Filename cannot be empty".to_string()),
        });
    }

    if filename.len() > 255 {
        return Ok(ExportResult {
            success: false,
            path: None,
            error: Some("Filename too long (max 255 characters)".to_string()),
        });
    }

    if data.is_empty() {
        return Ok(ExportResult {
            success: false,
            path: None,
            error: Some("Cannot save empty file".to_string()),
        });
    }

    if data.len() > MAX_EXPORT_SIZE {
        return Ok(ExportResult {
            success: false,
            path: None,
            error: Some(format!(
                "File too large: maximum size is {}MB",
                MAX_EXPORT_SIZE / 1024 / 1024
            )),
        });
    }

    // Determine file type from filename
    let file_type = infer_file_type(&filename);

    // Create channel for dialog result
    let (tx, rx) = std::sync::mpsc::channel();

    // Build and show save dialog
    let mut builder = tauri_plugin_dialog::FileDialogBuilder::new(app_handle.dialog().clone())
        .set_title("Save Export")
        .set_file_name(&filename);

    // Add appropriate file filter based on type
    builder = match file_type {
        Some(ExportFileType::Pdf) => builder.add_filter("PDF Documents", &["pdf"]),
        Some(ExportFileType::Docx) => builder.add_filter("Word Documents", &["docx"]),
        None => builder.add_filter("All Files", &["*"]),
    };

    builder.save_file(move |path| {
        tx.send(path).ok();
    });

    // Wait for dialog result
    match rx.recv() {
        Ok(Some(file_path)) => {
            // Get the path from FilePath
            let path = match file_path.as_path() {
                Some(p) => p.to_path_buf(),
                None => {
                    return Ok(ExportResult {
                        success: false,
                        path: None,
                        error: Some("Invalid file path returned from dialog".to_string()),
                    });
                }
            };

            // Write file to disk
            match std::fs::write(&path, &data) {
                Ok(_) => Ok(ExportResult {
                    success: true,
                    path: Some(path.to_string_lossy().to_string()),
                    error: None,
                }),
                Err(e) => Ok(ExportResult {
                    success: false,
                    path: None,
                    error: Some(format!("Failed to write file: {}", e)),
                }),
            }
        }
        Ok(None) => {
            // User cancelled the dialog
            Ok(ExportResult {
                success: false,
                path: None,
                error: Some("Save cancelled by user".to_string()),
            })
        }
        Err(e) => Ok(ExportResult {
            success: false,
            path: None,
            error: Some(format!("Dialog error: {}", e)),
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_export_file_type_extension() {
        assert_eq!(ExportFileType::Pdf.extension(), "pdf");
        assert_eq!(ExportFileType::Docx.extension(), "docx");
    }

    #[test]
    fn test_export_file_type_mime() {
        assert_eq!(ExportFileType::Pdf.mime_type(), "application/pdf");
        assert_eq!(
            ExportFileType::Docx.mime_type(),
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
    }

    #[test]
    fn test_export_file_type_from_extension() {
        assert_eq!(
            ExportFileType::from_extension("pdf"),
            Some(ExportFileType::Pdf)
        );
        assert_eq!(
            ExportFileType::from_extension("PDF"),
            Some(ExportFileType::Pdf)
        );
        assert_eq!(
            ExportFileType::from_extension("docx"),
            Some(ExportFileType::Docx)
        );
        assert_eq!(
            ExportFileType::from_extension("DOCX"),
            Some(ExportFileType::Docx)
        );
        assert_eq!(ExportFileType::from_extension("txt"), None);
        assert_eq!(ExportFileType::from_extension(""), None);
    }

    #[test]
    fn test_infer_file_type() {
        assert_eq!(
            infer_file_type("report.pdf"),
            Some(ExportFileType::Pdf)
        );
        assert_eq!(
            infer_file_type("evidence-export.docx"),
            Some(ExportFileType::Docx)
        );
        assert_eq!(
            infer_file_type("path/to/file.PDF"),
            Some(ExportFileType::Pdf)
        );
        assert_eq!(infer_file_type("no-extension"), None);
        assert_eq!(infer_file_type("file.txt"), None);
    }

    #[test]
    fn test_export_file_type_filter_description() {
        assert_eq!(ExportFileType::Pdf.filter_description(), "PDF Documents");
        assert_eq!(ExportFileType::Docx.filter_description(), "Word Documents");
    }

    #[test]
    fn test_max_export_size_constant() {
        // 50MB
        assert_eq!(MAX_EXPORT_SIZE, 50 * 1024 * 1024);
    }
}
