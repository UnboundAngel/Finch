use crate::types::{ProviderConfig, StreamingEvent};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::ipc::Channel;
use futures_util::StreamExt;

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

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or("Failed to parse Gemini response".to_string())
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
                            if let Some(content) = candidates[0]["content"]["parts"][0]["text"].as_str() {
                                manual_token_count += 1;
                                let _ = channel.send(serde_json::to_string(&StreamingEvent::Text(content.to_string())).unwrap());
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
