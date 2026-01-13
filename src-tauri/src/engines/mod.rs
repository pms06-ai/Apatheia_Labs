//! Analysis Engines Module
//!
//! Native Rust implementations of the FCIP analysis engines.
//! These engines can run entirely within the Tauri backend, using the
//! native AI client for LLM calls.

pub mod contradiction;

pub use contradiction::{
    ContradictionEngine, ContradictionFinding, ContradictionType, Severity,
    ContradictionAnalysisResult, ClaimReference, ClaimComparisonResult, DocumentInfo,
};
