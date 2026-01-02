//! File storage module for Phronesis FCIP
//! 
//! Handles local file storage for documents.

use sha2::{Sha256, Digest};
use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum StorageError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("File not found: {0}")]
    NotFound(String),
}

pub type StorageResult<T> = Result<T, StorageError>;

/// File storage manager
pub struct Storage {
    base_path: PathBuf,
}

impl Storage {
    /// Create a new storage manager
    pub fn new(base_path: PathBuf) -> Self {
        // Ensure base directory exists
        std::fs::create_dir_all(&base_path).ok();
        Self { base_path }
    }

    /// Get the documents directory path
    pub fn documents_dir(&self) -> PathBuf {
        let path = self.base_path.join("documents");
        std::fs::create_dir_all(&path).ok();
        path
    }

    /// Check if a file with the same hash already exists in the case
    pub fn find_existing_file(&self, case_id: &str, hash: &str) -> Option<PathBuf> {
        let case_dir = self.documents_dir().join(case_id);
        if !case_dir.exists() {
            return None;
        }

        // Look for files with hash in their name
        if let Ok(entries) = std::fs::read_dir(&case_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if let Some(filename) = path.file_name().and_then(|n| n.to_str()) {
                    if filename.contains(&hash[..8]) && filename.contains("-") {
                        return Some(path);
                    }
                }
            }
        }
        None
    }

    /// Store a file and return its hash and storage path
    /// Uses collision-proof paths based on hash and document ID
    /// Automatically deduplicates files with identical content
    pub fn store_file(&self, case_id: &str, filename: &str, data: &[u8]) -> StorageResult<(String, PathBuf)> {
        // Calculate SHA256 hash
        let hash = Self::calculate_hash(data);

        // Create case directory
        let case_dir = self.documents_dir().join(case_id);
        std::fs::create_dir_all(&case_dir)?;

        // Check if file with same hash already exists (deduplication)
        if let Some(existing_path) = self.find_existing_file(case_id, &hash) {
            log::info!("File already exists with same content, reusing: {} (original: {}, hash: {})",
                      existing_path.display(), filename, hash);
            return Ok((hash, existing_path));
        }

        // Create collision-proof filename: original_filename-hash.ext
        // Extract extension from filename
        let extension = std::path::Path::new(filename)
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("");

        let base_name = std::path::Path::new(filename)
            .file_stem()
            .and_then(|stem| stem.to_str())
            .unwrap_or("file");

        let collision_proof_filename = if extension.is_empty() {
            format!("{}-{}", base_name, &hash[..8]) // Use first 8 chars of hash
        } else {
            format!("{}-{}.{}", base_name, &hash[..8], extension)
        };

        // Store file with collision-proof name
        let file_path = case_dir.join(&collision_proof_filename);
        std::fs::write(&file_path, data)?;

        log::info!("Stored file: {} (original: {}, hash: {})", file_path.display(), filename, hash);

        Ok((hash, file_path))
    }

    /// Validate that a path is within the storage base directory (prevent path traversal)
    fn validate_path(&self, path: &std::path::Path) -> StorageResult<PathBuf> {
        let canonical = path.canonicalize()
            .map_err(|_| StorageError::NotFound(path.to_string_lossy().to_string()))?;
        let base = self.base_path.canonicalize()
            .map_err(|_| StorageError::NotFound("Base path invalid".into()))?;

        if !canonical.starts_with(&base) {
            log::warn!("Path traversal attempt blocked: {} is outside {}",
                      canonical.display(), base.display());
            return Err(StorageError::NotFound("Path outside storage".into()));
        }
        Ok(canonical)
    }

    /// Read a file from storage
    pub fn read_file(&self, storage_path: &std::path::Path) -> StorageResult<Vec<u8>> {
        let validated_path = self.validate_path(storage_path)?;
        Ok(std::fs::read(validated_path)?)
    }

    /// Delete a file from storage
    pub fn delete_file(&self, storage_path: &str) -> StorageResult<()> {
        let path = PathBuf::from(storage_path);
        let validated_path = self.validate_path(&path)?;
        std::fs::remove_file(validated_path)?;
        Ok(())
    }

    /// Calculate SHA256 hash of data
    pub fn calculate_hash(data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data);
        hex::encode(hasher.finalize())
    }
}

