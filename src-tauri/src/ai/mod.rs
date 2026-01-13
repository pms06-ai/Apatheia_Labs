//! AI Client Module
//!
//! Provides native Rust integration with AI providers (Claude, Gemini, Groq).
//! This replaces the TypeScript sidecar approach with direct API calls.

mod client;
mod providers;

pub use client::{AIClient, AIConfig, AIResponse, Message, Role, Usage};
pub use providers::{AnthropicProvider, Provider};
