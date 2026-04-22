use crate::types::{ProviderConfig, StreamingEvent};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::ipc::Channel;
use futures_util::StreamExt;
use serde_json::Value;

/// Non-stream `generateContent` responses can include multiple `parts` (e.g. reasoning vs text).
/// Scan for the first non-empty `text` field instead of assuming `parts[0]` is plain text.
fn extract_text_from_gemini_generate_response(json: &Value) -> Option<String> {
    let candidates = json.get("candidates")?.as_array()?;
    let first = candidates.first()?;
    let parts = first.get("content")?.get("parts")?.as_array()?;
    for part in parts {
        if let Some(s) = part.get("text").and_then(|v| v.as_str()) {
            let t = s.trim();
            if !t.is_empty() {
                return Some(t.to_string());
            }
        }
    }
    None
}

fn gemini_generate_error_hint(json: &Value) -> String {
    if let Some(r) = json
        .get("promptFeedback")
        .and_then(|p| p.get("blockReason"))
        .and_then(|b| b.as_str())
    {
        return format!("prompt blocked: {}", r);
    }
    if let Some(m) = json.get("error").and_then(|e| e.get("message")).and_then(|x| x.as_str()) {
        return format!("api error: {}", m);
    }
    if let Some(fr) = json.pointer("/candidates/0/finishReason").and_then(|v| v.as_str()) {
        return format!("finishReason={}", fr);
    }
    "no structured error in body".to_string()
}

pub async fn send_message_gemini(
    config: &ProviderConfig,
    model: String,
    messages: serde_json::Value,
    system_prompt: Option<String>,
    temperature: Option<f32>,
    top_p: Option<f32>,
    max_tokens: Option<u32>,
    stop_strings: Option<Vec<String>>,
) -> Result<String, String> {
    let api_key = config.gemini_api_key.as_ref().ok_or("Gemini API key not set")?;
    let client = reqwest::Client::new();
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}", model, api_key);
    
    let mut body = serde_json::json!({
        "contents": messages,
    });

    if let Some(sys) = system_prompt {
        if !sys.is_empty() {
            body["systemInstruction"] = serde_json::json!({ "parts": [{ "text": sys }] });
        }
    }

    let mut generation_config = serde_json::json!({});
    if let Some(obj) = generation_config.as_object_mut() {
        if let Some(t) = temperature { obj.insert("temperature".to_string(), serde_json::json!(t)); }
        if let Some(p) = top_p { obj.insert("topP".to_string(), serde_json::json!(p)); }
        if let Some(m) = max_tokens { obj.insert("maxOutputTokens".to_string(), serde_json::json!(m)); }
        if let Some(s) = stop_strings { 
            if !s.is_empty() {
                obj.insert("stopSequences".to_string(), serde_json::json!(s)); 
            }
        }
    }

    if let Some(obj) = generation_config.as_object() {
        if !obj.is_empty() {
            body["generationConfig"] = generation_config;
        }
    }

    let resp = client.post(url)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = resp.status();
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    extract_text_from_gemini_generate_response(&json).ok_or_else(|| {
        format!(
            "Gemini send_message: no text in candidates.parts (http {}, {})",
            status,
            gemini_generate_error_hint(&json)
        )
    })
}

pub async fn stream_message_gemini(
    config: &ProviderConfig,
    model: String,
    messages: serde_json::Value,
    system_prompt: Option<String>,
    temperature: Option<f32>,
    top_p: Option<f32>,
    max_tokens: Option<u32>,
    stop_strings: Option<Vec<String>>,
    channel: Channel<String>,
    abort_flag: Arc<AtomicBool>
) -> Result<(), String> {
    let api_key = config.gemini_api_key.as_ref().ok_or("Gemini API key not set")?;
    let client = reqwest::Client::new();
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?alt=sse&key={}", model, api_key);

    let mut body = serde_json::json!({
        "contents": messages,
    });

    if let Some(sys) = system_prompt {
        if !sys.is_empty() {
            body["systemInstruction"] = serde_json::json!({ "parts": [{ "text": sys }] });
        }
    }

    let mut generation_config = serde_json::json!({});
    if let Some(obj) = generation_config.as_object_mut() {
        if let Some(t) = temperature { obj.insert("temperature".to_string(), serde_json::json!(t)); }
        if let Some(p) = top_p { obj.insert("topP".to_string(), serde_json::json!(p)); }
        if let Some(m) = max_tokens { obj.insert("maxOutputTokens".to_string(), serde_json::json!(m)); }
        if let Some(s) = stop_strings { 
            if !s.is_empty() {
                obj.insert("stopSequences".to_string(), serde_json::json!(s)); 
            }
        }
    }

    if let Some(obj) = generation_config.as_object() {
        if !obj.is_empty() {
            body["generationConfig"] = generation_config;
        }
    }

    let resp = client.post(url)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = resp.status();
    if !status.is_success() {
        let body_text = resp.text().await.unwrap_or_default();
        let hint = serde_json::from_str::<serde_json::Value>(&body_text)
            .map(|j| gemini_generate_error_hint(&j))
            .unwrap_or_else(|_| body_text.chars().take(300).collect());
        return Err(format!("Gemini stream_message: http {}, {}", status, hint));
    }

    let mut stream = resp.bytes_stream();
    let mut buffer = String::new();
    let mut total_tokens = 0;
    let mut input_tokens = 0;
    let mut output_tokens = 0;
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
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(candidates) = json.get("candidates").and_then(|c| c.as_array()) {
                        if !candidates.is_empty() {
                            // Scan all parts for text (thinking models may have multiple parts)
                            if let Some(parts) = candidates[0]["content"]["parts"].as_array() {
                                for part in parts {
                                    if let Some(text) = part.get("text").and_then(|v| v.as_str()) {
                                        if !text.is_empty() {
                                            manual_token_count += 1;
                                            let _ = channel.send(serde_json::to_string(&StreamingEvent::Text(text.to_string())).unwrap());
                                        }
                                    }
                                }
                            }
                            if let Some(reason) = candidates[0]["finishReason"].as_str() {
                                stop_reason = match reason {
                                    "STOP" => "end_turn".to_string(),
                                    "MAX_TOKENS" => "max_tokens".to_string(),
                                    _ => reason.to_lowercase(),
                                };
                            }
                        }
                    }
                    if let Some(usage) = json.get("usageMetadata") {
                        let input = usage.get("promptTokenCount").and_then(|v| v.as_u64()).unwrap_or(0);
                        let output = usage.get("candidatesTokenCount").and_then(|v| v.as_u64()).unwrap_or(0);
                        if input > 0 || output > 0 {
                            total_tokens = input + output;
                        }
                        input_tokens = input;
                        output_tokens = output;
                    }
                }
            }
        }
    }
    if total_tokens == 0 { total_tokens = manual_token_count; }
    let stats_val = serde_json::json!({ 
        "stop_reason": stop_reason, 
        "total_tokens": total_tokens,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens
    });
    let _ = channel.send(serde_json::to_string(&StreamingEvent::Stats(stats_val)).unwrap());
    Ok(())
}
