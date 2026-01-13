//! Anthropic Claude API Provider
//!
//! Implements the Claude Messages API for direct integration.

use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};

use super::{Provider, ProviderConfig};
use crate::ai::{AIResponse, Message, Role, Usage};

const ANTHROPIC_API_URL: &str = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION: &str = "2023-06-01";

/// Anthropic Claude provider
pub struct AnthropicProvider {
    client: Client,
    config: ProviderConfig,
}

impl AnthropicProvider {
    pub fn new(config: ProviderConfig) -> Self {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(180)) // 3 minute timeout
            .build()
            .expect("Failed to create HTTP client");

        Self { client, config }
    }

    fn build_request(&self, messages: &[Message], system: Option<&str>) -> AnthropicRequest {
        let api_messages: Vec<ApiMessage> = messages
            .iter()
            .filter(|m| m.role != Role::System) // System messages handled separately
            .map(|m| ApiMessage {
                role: match m.role {
                    Role::User => "user".to_string(),
                    Role::Assistant => "assistant".to_string(),
                    Role::System => "user".to_string(), // Shouldn't happen due to filter
                },
                content: m.content.clone(),
            })
            .collect();

        AnthropicRequest {
            model: self.config.model.clone(),
            max_tokens: self.config.max_tokens,
            system: system.map(String::from),
            messages: api_messages,
            temperature: Some(self.config.temperature),
        }
    }
}

#[async_trait]
impl Provider for AnthropicProvider {
    async fn complete(&self, messages: Vec<Message>, system: Option<&str>) -> Result<AIResponse, String> {
        let api_key = self.config.api_key.as_ref()
            .ok_or_else(|| "Anthropic API key not configured".to_string())?;

        let request = self.build_request(&messages, system);

        let response = self.client
            .post(ANTHROPIC_API_URL)
            .header("x-api-key", api_key)
            .header("anthropic-version", ANTHROPIC_VERSION)
            .header("content-type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let status = response.status();
        let body = response.text().await
            .map_err(|e| format!("Failed to read response: {}", e))?;

        if !status.is_success() {
            // Try to parse error response
            if let Ok(error) = serde_json::from_str::<AnthropicError>(&body) {
                return Err(format!("Anthropic API error: {} - {}", error.error.error_type, error.error.message));
            }
            return Err(format!("Anthropic API error ({}): {}", status, body));
        }

        let api_response: AnthropicResponse = serde_json::from_str(&body)
            .map_err(|e| format!("Failed to parse response: {} - Body: {}", e, &body[..body.len().min(500)]))?;

        // Extract text content
        let content = api_response.content
            .iter()
            .filter_map(|c| {
                if c.content_type == "text" {
                    Some(c.text.clone())
                } else {
                    None
                }
            })
            .collect::<Vec<_>>()
            .join("\n");

        Ok(AIResponse {
            content,
            model: api_response.model,
            usage: Some(Usage {
                input_tokens: api_response.usage.input_tokens,
                output_tokens: api_response.usage.output_tokens,
            }),
            stop_reason: api_response.stop_reason,
        })
    }

    fn name(&self) -> &'static str {
        "anthropic"
    }

    fn is_configured(&self) -> bool {
        self.config.api_key.is_some()
    }
}

// ============================================================================
// API Request/Response Types
// ============================================================================

#[derive(Debug, Serialize)]
struct AnthropicRequest {
    model: String,
    max_tokens: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<String>,
    messages: Vec<ApiMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
}

#[derive(Debug, Serialize)]
struct ApiMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct AnthropicResponse {
    id: String,
    #[serde(rename = "type")]
    response_type: String,
    role: String,
    content: Vec<ContentBlock>,
    model: String,
    stop_reason: Option<String>,
    usage: ApiUsage,
}

#[derive(Debug, Deserialize)]
struct ContentBlock {
    #[serde(rename = "type")]
    content_type: String,
    #[serde(default)]
    text: String,
}

#[derive(Debug, Deserialize)]
struct ApiUsage {
    input_tokens: u32,
    output_tokens: u32,
}

#[derive(Debug, Deserialize)]
struct AnthropicError {
    error: ApiError,
}

#[derive(Debug, Deserialize)]
struct ApiError {
    #[serde(rename = "type")]
    error_type: String,
    message: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_provider_name() {
        let config = ProviderConfig {
            api_key: Some("test".to_string()),
            ..Default::default()
        };
        let provider = AnthropicProvider::new(config);
        assert_eq!(provider.name(), "anthropic");
    }

    #[test]
    fn test_is_configured() {
        let config_with_key = ProviderConfig {
            api_key: Some("test".to_string()),
            ..Default::default()
        };
        let provider_with = AnthropicProvider::new(config_with_key);
        assert!(provider_with.is_configured());

        let config_without_key = ProviderConfig::default();
        let provider_without = AnthropicProvider::new(config_without_key);
        assert!(!provider_without.is_configured());
    }

    #[test]
    fn test_build_request() {
        let config = ProviderConfig {
            api_key: Some("test".to_string()),
            model: "claude-sonnet-4-20250514".to_string(),
            max_tokens: 1024,
            temperature: 0.5,
        };
        let provider = AnthropicProvider::new(config);

        let messages = vec![
            Message::user("Hello"),
            Message::assistant("Hi there!"),
            Message::user("How are you?"),
        ];

        let request = provider.build_request(&messages, Some("You are helpful"));

        assert_eq!(request.model, "claude-sonnet-4-20250514");
        assert_eq!(request.max_tokens, 1024);
        assert_eq!(request.system, Some("You are helpful".to_string()));
        assert_eq!(request.messages.len(), 3);
        assert_eq!(request.messages[0].role, "user");
        assert_eq!(request.messages[0].content, "Hello");
    }
}
