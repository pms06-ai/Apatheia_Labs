//! AI Provider implementations

mod anthropic;

pub use anthropic::AnthropicProvider;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use super::{AIResponse, Message};

/// Common trait for all AI providers
#[async_trait]
pub trait Provider: Send + Sync {
    /// Send messages to the AI and get a response
    async fn complete(&self, messages: Vec<Message>, system: Option<&str>) -> Result<AIResponse, String>;

    /// Get the provider name
    fn name(&self) -> &'static str;

    /// Check if the provider is configured (has API key)
    fn is_configured(&self) -> bool;
}

/// Provider configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub api_key: Option<String>,
    pub model: String,
    pub max_tokens: u32,
    pub temperature: f32,
}

impl Default for ProviderConfig {
    fn default() -> Self {
        Self {
            api_key: None,
            model: "claude-sonnet-4-20250514".to_string(),
            max_tokens: 4096,
            temperature: 0.0,
        }
    }
}
