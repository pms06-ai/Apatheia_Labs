//! AI Client - Unified interface for AI providers
//!
//! Provides a consistent API for interacting with different AI providers
//! (Claude, Gemini, Groq) with automatic JSON parsing and error handling.

use serde::{Deserialize, Serialize};
use std::sync::Arc;

use super::providers::{AnthropicProvider, Provider, ProviderConfig};

/// Message role in a conversation
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    User,
    Assistant,
    System,
}

/// A message in a conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: Role,
    pub content: String,
}

impl Message {
    pub fn user(content: impl Into<String>) -> Self {
        Self {
            role: Role::User,
            content: content.into(),
        }
    }

    pub fn assistant(content: impl Into<String>) -> Self {
        Self {
            role: Role::Assistant,
            content: content.into(),
        }
    }

    pub fn system(content: impl Into<String>) -> Self {
        Self {
            role: Role::System,
            content: content.into(),
        }
    }
}

/// Response from an AI provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIResponse {
    pub content: String,
    pub model: String,
    pub usage: Option<Usage>,
    pub stop_reason: Option<String>,
}

/// Token usage information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usage {
    pub input_tokens: u32,
    pub output_tokens: u32,
}

/// Configuration for the AI client
#[derive(Debug, Clone)]
pub struct AIConfig {
    pub provider: ProviderType,
    pub anthropic_key: Option<String>,
    pub gemini_key: Option<String>,
    pub groq_key: Option<String>,
    pub model: Option<String>,
    pub max_tokens: u32,
    pub temperature: f32,
}

impl Default for AIConfig {
    fn default() -> Self {
        Self {
            provider: ProviderType::Anthropic,
            anthropic_key: None,
            gemini_key: None,
            groq_key: None,
            model: None,
            max_tokens: 4096,
            temperature: 0.0,
        }
    }
}

/// Supported AI providers
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProviderType {
    Anthropic,
    Gemini,
    Groq,
}

/// The main AI client
pub struct AIClient {
    provider: Arc<dyn Provider>,
    config: AIConfig,
}

impl AIClient {
    /// Create a new AI client with the given configuration
    pub fn new(config: AIConfig) -> Result<Self, String> {
        let provider: Arc<dyn Provider> = match config.provider {
            ProviderType::Anthropic => {
                let api_key = config.anthropic_key.clone()
                    .ok_or_else(|| "Anthropic API key not configured".to_string())?;

                let provider_config = ProviderConfig {
                    api_key: Some(api_key),
                    model: config.model.clone()
                        .unwrap_or_else(|| "claude-sonnet-4-20250514".to_string()),
                    max_tokens: config.max_tokens,
                    temperature: config.temperature,
                };

                Arc::new(AnthropicProvider::new(provider_config))
            }
            ProviderType::Gemini => {
                return Err("Gemini provider not yet implemented".to_string());
            }
            ProviderType::Groq => {
                return Err("Groq provider not yet implemented".to_string());
            }
        };

        Ok(Self { provider, config })
    }

    /// Create a client from environment variables
    pub fn from_env() -> Result<Self, String> {
        let anthropic_key = std::env::var("ANTHROPIC_API_KEY").ok();
        let gemini_key = std::env::var("GEMINI_API_KEY").ok();
        let groq_key = std::env::var("GROQ_API_KEY").ok();

        // Prefer Anthropic, then Gemini, then Groq
        let provider = if anthropic_key.is_some() {
            ProviderType::Anthropic
        } else if gemini_key.is_some() {
            ProviderType::Gemini
        } else if groq_key.is_some() {
            ProviderType::Groq
        } else {
            return Err("No AI API key found in environment".to_string());
        };

        let config = AIConfig {
            provider,
            anthropic_key,
            gemini_key,
            groq_key,
            ..Default::default()
        };

        Self::new(config)
    }

    /// Send a simple prompt and get a response
    pub async fn prompt(&self, prompt: &str) -> Result<AIResponse, String> {
        let messages = vec![Message::user(prompt)];
        self.provider.complete(messages, None).await
    }

    /// Send a prompt with a system message
    pub async fn prompt_with_system(&self, system: &str, prompt: &str) -> Result<AIResponse, String> {
        let messages = vec![Message::user(prompt)];
        self.provider.complete(messages, Some(system)).await
    }

    /// Send a multi-turn conversation
    pub async fn chat(&self, messages: Vec<Message>, system: Option<&str>) -> Result<AIResponse, String> {
        self.provider.complete(messages, system).await
    }

    /// Send a prompt and parse the response as JSON
    pub async fn prompt_json<T: for<'de> Deserialize<'de>>(&self, prompt: &str) -> Result<T, String> {
        let system = "You are a helpful assistant. Respond ONLY with valid JSON. Do not include any text before or after the JSON object. Do not use markdown code blocks.";
        let response = self.prompt_with_system(system, prompt).await?;
        self.parse_json(&response.content)
    }

    /// Send a prompt with system message and parse the response as JSON
    pub async fn prompt_json_with_system<T: for<'de> Deserialize<'de>>(
        &self,
        system: &str,
        prompt: &str,
    ) -> Result<T, String> {
        let full_system = format!(
            "{}\n\nIMPORTANT: Respond ONLY with valid JSON. Do not include any text before or after the JSON object. Do not use markdown code blocks.",
            system
        );
        let response = self.prompt_with_system(&full_system, prompt).await?;
        self.parse_json(&response.content)
    }

    /// Parse JSON from a potentially messy response
    fn parse_json<T: for<'de> Deserialize<'de>>(&self, content: &str) -> Result<T, String> {
        // Try direct parse first
        if let Ok(result) = serde_json::from_str(content) {
            return Ok(result);
        }

        // Try to extract from markdown code blocks
        let json_block_regex = regex::Regex::new(r"```(?:json)?\n?([\s\S]*?)\n?```")
            .map_err(|e| format!("Regex error: {}", e))?;

        if let Some(captures) = json_block_regex.captures(content) {
            if let Some(json_str) = captures.get(1) {
                if let Ok(result) = serde_json::from_str(json_str.as_str().trim()) {
                    return Ok(result);
                }
            }
        }

        // Try to find a raw JSON object or array
        let object_regex = regex::Regex::new(r"\{[\s\S]*\}")
            .map_err(|e| format!("Regex error: {}", e))?;
        let array_regex = regex::Regex::new(r"\[[\s\S]*\]")
            .map_err(|e| format!("Regex error: {}", e))?;

        if let Some(m) = object_regex.find(content) {
            if let Ok(result) = serde_json::from_str(m.as_str()) {
                return Ok(result);
            }
        }

        if let Some(m) = array_regex.find(content) {
            if let Ok(result) = serde_json::from_str(m.as_str()) {
                return Ok(result);
            }
        }

        Err(format!(
            "Failed to parse JSON from response. Content: {}",
            &content[..content.len().min(500)]
        ))
    }

    /// Get the provider name
    pub fn provider_name(&self) -> &'static str {
        self.provider.name()
    }

    /// Check if the client is properly configured
    pub fn is_configured(&self) -> bool {
        self.provider.is_configured()
    }

    /// Get the current configuration
    pub fn config(&self) -> &AIConfig {
        &self.config
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_message_creation() {
        let user_msg = Message::user("Hello");
        assert_eq!(user_msg.role, Role::User);
        assert_eq!(user_msg.content, "Hello");

        let assistant_msg = Message::assistant("Hi there");
        assert_eq!(assistant_msg.role, Role::Assistant);
    }

    #[test]
    fn test_default_config() {
        let config = AIConfig::default();
        assert_eq!(config.provider, ProviderType::Anthropic);
        assert_eq!(config.max_tokens, 4096);
        assert_eq!(config.temperature, 0.0);
    }
}
