use serde::{Deserialize, Serialize};
use reqwest::Client;

#[derive(Debug, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct AnthropicRequest {
    pub model: String,
    pub messages: Vec<Message>,
    pub max_tokens: u32,
    pub stream: bool,
}

#[derive(Debug, Deserialize)]
pub struct AnthropicResponse {
    pub id: String,
    pub r#type: String,
    pub role: String,
    pub content: Vec<Content>,
    pub model: String,
    pub stop_reason: Option<String>,
    pub stop_sequence: Option<String>,
    pub usage: Usage,
}

#[derive(Debug, Deserialize)]
pub struct Content {
    pub r#type: String,
    pub text: String,
}

#[derive(Debug, Deserialize)]
pub struct Usage {
    pub input_tokens: u32,
    pub output_tokens: u32,
}

pub struct AnthropicClient {
    pub api_key: String,
    pub client: Client,
}

impl AnthropicClient {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            client: Client::new(),
        }
    }

    pub async fn call_anthropic(&self, request: AnthropicRequest) -> Result<AnthropicResponse, String> {
        let response = self.client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !response.status().is_success() {
            let error_text = response.text().await.map_err(|e| e.to_string())?;
            return Err(format!("Anthropic API error: {}", error_text));
        }

        let anthropic_response = response
            .json::<AnthropicResponse>()
            .await
            .map_err(|e| e.to_string())?;

        Ok(anthropic_response)
    }
}
