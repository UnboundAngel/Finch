//! Anthropic REST / SSE JSON shapes — many fields exist only for `Deserialize` and are not read in-app.
#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use serde_json;
use reqwest::Client;
use futures_util::StreamExt;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub role: String,
    pub content: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct AnthropicRequest {
    pub model: String,
    pub messages: Vec<Message>,
    pub max_tokens: u32,
    pub stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stop_sequences: Option<Vec<String>>,
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

#[derive(Debug, Deserialize, Clone)]
pub struct Content {
    pub r#type: String,
    pub text: String,
}

#[derive(Debug, Deserialize)]
pub struct Usage {
    pub input_tokens: u32,
    pub output_tokens: u32,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum AnthropicEvent {
    #[serde(rename = "message_start")]
    MessageStart { message: AnthropicResponse },
    #[serde(rename = "content_block_start")]
    ContentBlockStart { index: u32, content_block: Content },
    #[serde(rename = "content_block_delta")]
    ContentBlockDelta { index: u32, delta: Delta },
    #[serde(rename = "content_block_stop")]
    ContentBlockStop { index: u32 },
    #[serde(rename = "message_delta")]
    MessageDelta { delta: DeltaMessage, usage: UsageMessageDelta },
    #[serde(rename = "message_stop")]
    MessageStop,
    #[serde(rename = "ping")]
    Ping,
    #[serde(rename = "error")]
    Error { error: AnthropicError },
}

#[derive(Debug, Deserialize)]
pub struct Delta {
    pub r#type: String,
    pub text: String,
}

#[derive(Debug, Deserialize)]
pub struct DeltaMessage {
    pub stop_reason: Option<String>,
    pub stop_sequence: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UsageMessageDelta {
    pub output_tokens: u32,
}

#[derive(Debug, Deserialize)]
pub struct AnthropicError {
    pub r#type: String,
    pub message: String,
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

    pub async fn stream_anthropic(
        &self, 
        request: AnthropicRequest, 
        channel: tauri::ipc::Channel<String>,
        abort_flag: Arc<AtomicBool>
    ) -> Result<(), String> {
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

        let mut stream = response.bytes_stream();
        let mut buffer = String::new();
        let mut total_tokens = 0;
        let mut input_tokens = 0;
        let mut output_tokens = 0;
        let mut stop_reason = "end_turn".to_string();

        while let Some(item) = stream.next().await {
            // Check for abort
            if abort_flag.load(Ordering::SeqCst) {
                stop_reason = "abort".to_string();
                break;
            }

            let chunk = item.map_err(|e| e.to_string())?;
            let text = String::from_utf8_lossy(&chunk);
            buffer.push_str(&text);

            while let Some(line_end) = buffer.find('\n') {
                let line = buffer[..line_end].trim().to_string();
                buffer.drain(..=line_end);

                if line.starts_with("data: ") {
                    let data = &line[6..];
                    if let Ok(event) = serde_json::from_str::<AnthropicEvent>(data) {
                        match event {
                            AnthropicEvent::MessageStart { message } => {
                                input_tokens = message.usage.input_tokens;
                            }
                            AnthropicEvent::ContentBlockDelta { delta, .. } => {
                                if delta.r#type == "text_delta" {
                                    let _ = channel.send(serde_json::to_string(&crate::types::StreamingEvent::Text(delta.text)).unwrap());
                                }
                            }
                            AnthropicEvent::MessageDelta { delta, usage } => {
                                if let Some(reason) = delta.stop_reason {
                                    stop_reason = match reason.as_str() {
                                        "end_turn" => "end_turn".to_string(),
                                        "max_tokens" => "max_tokens".to_string(),
                                        _ => reason,
                                    };
                                }
                                output_tokens = usage.output_tokens;
                                total_tokens = input_tokens + output_tokens;
                            }
                            AnthropicEvent::Error { error } => {
                                return Err(format!("Anthropic stream error: {}", error.message));
                            }
                            _ => {}
                        }
                    }
                }
            }
        }

        let stats_val = serde_json::json!({
            "stop_reason": stop_reason,
            "total_tokens": total_tokens,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens
        });
        let _ = channel.send(serde_json::to_string(&crate::types::StreamingEvent::Stats(stats_val)).unwrap());

        Ok(())
    }
}
