//! Text extraction from various document formats

use log::{info, warn};
use once_cell::sync::Lazy;
use regex::Regex;
use thiserror::Error;

// Pre-compiled regexes to avoid runtime panics
static RE_HTML_TAGS: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"<[^>]+>").expect("Invalid HTML tag regex")
});
static RE_WHITESPACE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\s+").expect("Invalid whitespace regex")
});
static RE_NEWLINES: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\n{3,}").expect("Invalid newlines regex")
});

#[derive(Error, Debug)]
pub enum TextExtractorError {
    #[error("Unsupported file type: {0}")]
    UnsupportedType(String),
    
    #[error("PDF extraction failed: {0}")]
    PdfError(String),
    
    #[error("Text decoding failed: {0}")]
    DecodingError(String),
    
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

/// Extract text from document based on MIME type
pub fn extract_text(mime_type: &str, data: &[u8]) -> Result<String, TextExtractorError> {
    let mime = mime_type.to_lowercase();
    
    info!("Extracting text from document with MIME type: {}", mime);
    
    match mime.as_str() {
        // PDF
        "application/pdf" => extract_pdf(data),
        
        // Plain text
        "text/plain" | "text/markdown" | "text/csv" => extract_plain_text(data),
        
        // HTML (strip tags)
        "text/html" => extract_html(data),
        
        // JSON (pretty print)
        "application/json" => extract_json(data),
        
        // Office documents (basic support)
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" => {
            // DOCX - for now, return placeholder
            warn!("DOCX extraction not fully implemented");
            Ok("[DOCX document - text extraction pending]".to_string())
        }
        
        // Unknown - try as text
        _ => {
            warn!("Unknown MIME type: {}, attempting text extraction", mime);
            extract_plain_text(data).or_else(|_| {
                Err(TextExtractorError::UnsupportedType(mime.to_string()))
            })
        }
    }
}

/// Extract text from PDF documents
fn extract_pdf(data: &[u8]) -> Result<String, TextExtractorError> {
    use pdf_extract::extract_text_from_mem;
    
    match extract_text_from_mem(data) {
        Ok(text) => {
            // Clean up extracted text
            let cleaned = clean_text(&text);
            info!("Extracted {} characters from PDF", cleaned.len());
            Ok(cleaned)
        }
        Err(e) => {
            Err(TextExtractorError::PdfError(e.to_string()))
        }
    }
}

/// Extract plain text with encoding detection
fn extract_plain_text(data: &[u8]) -> Result<String, TextExtractorError> {
    // Try UTF-8 first
    if let Ok(text) = std::str::from_utf8(data) {
        return Ok(clean_text(text));
    }
    
    // Try UTF-16 LE (Windows)
    if data.len() >= 2 && data[0] == 0xFF && data[1] == 0xFE {
        let chars: Vec<u16> = data[2..]
            .chunks_exact(2)
            .map(|chunk| u16::from_le_bytes([chunk[0], chunk[1]]))
            .collect();
        if let Ok(text) = String::from_utf16(&chars) {
            return Ok(clean_text(&text));
        }
    }
    
    // Try Latin-1 as fallback
    let text: String = data.iter().map(|&b| b as char).collect();
    Ok(clean_text(&text))
}

/// Extract text from HTML by stripping tags
fn extract_html(data: &[u8]) -> Result<String, TextExtractorError> {
    let html = std::str::from_utf8(data)
        .map_err(|e| TextExtractorError::DecodingError(e.to_string()))?;

    // Use pre-compiled regex for tag stripping
    let text = RE_HTML_TAGS.replace_all(html, " ");
    
    // Decode HTML entities
    let text = text
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'");
    
    Ok(clean_text(&text))
}

/// Extract and format JSON
fn extract_json(data: &[u8]) -> Result<String, TextExtractorError> {
    let text = std::str::from_utf8(data)
        .map_err(|e| TextExtractorError::DecodingError(e.to_string()))?;
    
    // Try to parse and pretty-print
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(text) {
        if let Ok(pretty) = serde_json::to_string_pretty(&value) {
            return Ok(pretty);
        }
    }
    
    // Return as-is if parsing fails
    Ok(text.to_string())
}

/// Clean and normalize extracted text
fn clean_text(text: &str) -> String {
    // Replace multiple whitespace with single space (using pre-compiled regex)
    let cleaned = RE_WHITESPACE.replace_all(text, " ");

    // Remove control characters except newlines and tabs
    let cleaned: String = cleaned
        .chars()
        .filter(|c| !c.is_control() || *c == '\n' || *c == '\t')
        .collect();

    // Normalize line endings
    let cleaned = cleaned.replace("\r\n", "\n").replace('\r', "\n");

    // Remove excessive newlines (using pre-compiled regex)
    let cleaned = RE_NEWLINES.replace_all(&cleaned, "\n\n");

    cleaned.trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_extract_plain_text() {
        let data = b"Hello, world!";
        let result = extract_text("text/plain", data).unwrap();
        assert_eq!(result, "Hello, world!");
    }
    
    #[test]
    fn test_clean_text() {
        let input = "  Hello   World  \n\n\n\n  Test  ";
        let result = clean_text(input);
        assert_eq!(result, "Hello World\n\nTest");
    }
}

