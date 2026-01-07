//! Text chunking for semantic search
//!
//! Splits documents into overlapping chunks suitable for embedding
//! and retrieval-augmented generation (RAG).

use serde::{Deserialize, Serialize};

/// A chunk of text with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Chunk {
    /// Unique chunk identifier
    pub id: usize,
    
    /// The text content
    pub text: String,
    
    /// Start character offset in original document
    pub start_offset: usize,
    
    /// End character offset in original document
    pub end_offset: usize,
    
    /// Approximate token count (simple word split)
    pub token_count: usize,

    /// Embedding vector (optional, populated later)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub embedding: Option<Vec<f32>>,
}

/// Split text into overlapping chunks
///
/// # Arguments
/// * `text` - The text to chunk
/// * `chunk_size` - Target size in tokens (approximate)
/// * `overlap` - Number of tokens to overlap between chunks
///
/// # Returns
/// Vector of Chunk structs
pub fn chunk_text(text: &str, chunk_size: usize, overlap: usize) -> Vec<Chunk> {
    if text.is_empty() {
        return vec![];
    }
    
    let words: Vec<&str> = text.split_whitespace().collect();
    
    if words.is_empty() {
        return vec![];
    }
    
    if words.len() <= chunk_size {
        // Single chunk for short documents
        return vec![Chunk {
            id: 0,
            text: text.to_string(),
            start_offset: 0,
            end_offset: text.len(),
            token_count: words.len(),
            embedding: None,
        }];
    }
    
    let step = chunk_size.saturating_sub(overlap).max(1);
    let mut chunks = Vec::new();
    let mut chunk_id = 0;
    let mut word_idx = 0;
    
    while word_idx < words.len() {
        let end_idx = (word_idx + chunk_size).min(words.len());
        let chunk_words = &words[word_idx..end_idx];
        let chunk_text = chunk_words.join(" ");
        
        // Calculate character offsets
        let start_offset = if word_idx == 0 {
            0
        } else {
            // Find the position of the first word in this chunk
            text.find(chunk_words[0]).unwrap_or(0)
        };
        
        let end_offset = start_offset + chunk_text.len();
        
        chunks.push(Chunk {
            id: chunk_id,
            text: chunk_text,
            start_offset,
            end_offset,
            token_count: chunk_words.len(),
            embedding: None,
        });
        
        chunk_id += 1;
        word_idx += step;
        
        // Break if we've processed all words
        if end_idx >= words.len() {
            break;
        }
    }
    
    chunks
}

/// Split text by sentences first, then chunk
pub fn chunk_by_sentences(text: &str, max_chunk_size: usize) -> Vec<Chunk> {
    // Simple sentence boundary detection
    let sentence_endings = regex::Regex::new(r"[.!?]\s+").unwrap();
    let sentences: Vec<&str> = sentence_endings.split(text).collect();
    
    let mut chunks = Vec::new();
    let mut current_chunk = String::new();
    let mut current_tokens = 0;
    let mut chunk_id = 0;
    let mut start_offset = 0;
    
    for sentence in sentences {
        let sentence_tokens = sentence.split_whitespace().count();
        
        if current_tokens + sentence_tokens > max_chunk_size && !current_chunk.is_empty() {
            // Save current chunk
            chunks.push(Chunk {
                id: chunk_id,
                text: current_chunk.trim().to_string(),
                start_offset,
                end_offset: start_offset + current_chunk.len(),
                token_count: current_tokens,
                embedding: None,
            });
            
            chunk_id += 1;
            start_offset += current_chunk.len();
            current_chunk = String::new();
            current_tokens = 0;
        }
        
        if !current_chunk.is_empty() {
            current_chunk.push(' ');
        }
        current_chunk.push_str(sentence);
        current_tokens += sentence_tokens;
    }
    
    // Don't forget the last chunk
    if !current_chunk.is_empty() {
        chunks.push(Chunk {
            id: chunk_id,
            text: current_chunk.trim().to_string(),
            start_offset,
            end_offset: start_offset + current_chunk.len(),
            token_count: current_tokens,
            embedding: None,
        });
    }
    
    chunks
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_chunk_text() {
        let text = "one two three four five six seven eight nine ten";
        let chunks = chunk_text(text, 3, 1);
        
        assert!(!chunks.is_empty());
        assert!(chunks.len() >= 3);
        
        // First chunk should start with "one"
        assert!(chunks[0].text.starts_with("one"));
    }
    
    #[test]
    fn test_empty_text() {
        let chunks = chunk_text("", 10, 2);
        assert!(chunks.is_empty());
    }
    
    #[test]
    fn test_short_text() {
        let text = "short text";
        let chunks = chunk_text(text, 100, 10);
        
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0].text, "short text");
    }
}

