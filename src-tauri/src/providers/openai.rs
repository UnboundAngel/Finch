use crate::types::{ProviderConfig, StreamingEvent};
use futures_util::StreamExt;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::ipc::Channel;

pub async fn send_message_openai(
    config: &ProviderConfig,
    model: String,
    messages: serde_json::Value,
    temperature: Option<f32>,
    top_p: Option<f32>,
    max_tokens: Option<u32>,
    stop_strings: Option<Vec<String>>,
) -> Result<String, String> {
    let env_key = std::env::var("OPENAI_API_KEY").ok();
    let key = config
        .openai_api_key
        .as_ref()
        .or(env_key.as_ref())
        .ok_or("OpenAI API key not set")?;
    let url = "https://api.openai.com/v1/chat/completions";

    let mut body = serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": false
    });

    if let Some(obj) = body.as_object_mut() {
        if let Some(t) = temperature {
            obj.insert("temperature".to_string(), serde_json::json!(t));
        }
        if let Some(p) = top_p {
            obj.insert("top_p".to_string(), serde_json::json!(p));
        }
        if let Some(m) = max_tokens {
            obj.insert("max_tokens".to_string(), serde_json::json!(m));
        }
        if let Some(s) = stop_strings {
            obj.insert("stop".to_string(), serde_json::json!(s));
        }
    }

    let client = reqwest::Client::new();
    let resp = client
        .post(url)
        .header("Authorization", format!("Bearer {}", key))
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    json["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or("Failed to parse OpenAI response".to_string())
}

pub async fn stream_message_openai(
    config: &ProviderConfig,
    model: String,
    messages: serde_json::Value,
    temperature: Option<f32>,
    top_p: Option<f32>,
    max_tokens: Option<u32>,
    stop_strings: Option<Vec<String>>,
    channel: Channel<String>,
    abort_flag: Arc<AtomicBool>,
) -> Result<(), String> {
    let env_key = std::env::var("OPENAI_API_KEY").ok();
    let key = config
        .openai_api_key
        .as_ref()
        .or(env_key.as_ref())
        .ok_or("OpenAI API key not set")?;
    let url = "https://api.openai.com/v1/chat/completions";

    let mut req_body = serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": true,
        "stream_options": {"include_usage": true}
    });

    if let Some(obj) = req_body.as_object_mut() {
        if let Some(t) = temperature {
            obj.insert("temperature".to_string(), serde_json::json!(t));
        }
        if let Some(p) = top_p {
            obj.insert("top_p".to_string(), serde_json::json!(p));
        }
        if let Some(m) = max_tokens {
            obj.insert("max_tokens".to_string(), serde_json::json!(m));
        }
        if let Some(s) = stop_strings {
            obj.insert("stop".to_string(), serde_json::json!(s));
        }
    }

    let client = reqwest::Client::new();
    let resp = client
        .post(url)
        .header("Authorization", format!("Bearer {}", key))
        .json(&req_body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let error_text = resp.text().await.unwrap_or_else(|_| "Could not read error body".to_string());
        return Err(format!("OpenAI API error ({}): {}", resp.status(), error_text));
    }

    let mut stream = resp.bytes_stream();
    let mut buffer = String::new();
    let mut total_tokens = 0;
    let mut stop_reason = "end_turn".to_string();
    let mut manual_token_count = 0;

    while let Some(item) = stream.next().await {
        if abort_flag.load(Ordering::SeqCst) {
            stop_reason = "abort".to_string();
            break;
        }

        let chunk = item.map_err(|e| e.to_string())?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(line_end) = buffer.find('\n') {
            let line = buffer[..line_end].trim().to_string();
            buffer.drain(..=line_end);

            if line.starts_with("data: ") {
                let data = &line[6..];
                if data == "[DONE]" {
                    break;
                }
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(choices) = json.get("choices").and_then(|c| c.as_array()) {
                        if !choices.is_empty() {
                            if let Some(content) = choices[0]["delta"]["content"].as_str() {
                                manual_token_count += 1;
                                let event = StreamingEvent::Text(content.to_string());
                                match serde_json::to_string(&event) {
                                    Ok(json) => { let _ = channel.send(json); }
                                    Err(e) => {
                                        let _ = channel.send(serde_json::to_string(&StreamingEvent::Error(e.to_string())).unwrap_or_default());
                                        return Err(format!("Serialization error: {}", e));
                                    }
                                }
                            }
                            if let Some(reason) = choices[0]["finish_reason"].as_str() {
                                stop_reason = match reason {
                                    "stop" => "end_turn".to_string(),
                                    "length" => "max_tokens".to_string(),
                                    _ => reason.to_string(),
                                };
                            }
                        }
                    }

                    if let Some(usage) = json.get("usage") {
                        let prompt_tokens = usage
                            .get("prompt_tokens")
                            .and_then(|v| v.as_u64())
                            .unwrap_or(0);
                        let completion_tokens = usage
                            .get("completion_tokens")
                            .and_then(|v| v.as_u64())
                            .unwrap_or(0);
                        if prompt_tokens > 0 || completion_tokens > 0 {
                            total_tokens = prompt_tokens + completion_tokens;
                        }
                    }
                }
            }
        }
    }

    if total_tokens == 0 {
        total_tokens = manual_token_count;
    }
    let final_stats =
        serde_json::json!({ "stop_reason": stop_reason, "total_tokens": total_tokens });
    
    let stats_event = StreamingEvent::Stats(final_stats);
    match serde_json::to_string(&stats_event) {
        Ok(json) => { let _ = channel.send(json); }
        Err(e) => {
            let _ = channel.send(serde_json::to_string(&StreamingEvent::Error(e.to_string())).unwrap_or_default());
            return Err(format!("Stats serialization error: {}", e));
        }
    }

    Ok(())
}
