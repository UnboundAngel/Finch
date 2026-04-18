use crate::types::{ProviderConfig, StreamingEvent};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::ipc::Channel;
use futures_util::StreamExt;

pub async fn send_message_local(
    config: &ProviderConfig,
    provider: &str,
    model: String,
    messages: serde_json::Value,
    temperature: Option<f32>,
    top_p: Option<f32>,
    max_tokens: Option<u32>,
    stop_strings: Option<Vec<String>>,
) -> Result<String, String> {
    let endpoint = if provider == "local_ollama" {
        config.ollama_endpoint.as_ref()
    } else {
        config.lmstudio_endpoint.as_ref()
    }.ok_or("Local endpoint not configured")?;
    
    let url = format!("{}/v1/chat/completions", endpoint.trim_end_matches('/'));

    let mut body = serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": false
    });

    if let Some(obj) = body.as_object_mut() {
        if let Some(t) = temperature { obj.insert("temperature".to_string(), serde_json::json!(t)); }
        if let Some(p) = top_p { obj.insert("top_p".to_string(), serde_json::json!(p)); }
        if let Some(m) = max_tokens { obj.insert("max_tokens".to_string(), serde_json::json!(m)); }
        if let Some(s) = stop_strings { obj.insert("stop".to_string(), serde_json::json!(s)); }
    }

    let client = reqwest::Client::new();
    let resp = client.post(url)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    json["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or("Failed to parse response".to_string())
}

pub async fn stream_message_local(
    config: &ProviderConfig,
    provider: &str,
    model: String,
    messages: serde_json::Value,
    temperature: Option<f32>,
    top_p: Option<f32>,
    max_tokens: Option<u32>,
    stop_strings: Option<Vec<String>>,
    channel: Channel<String>,
    abort_flag: Arc<AtomicBool>
) -> Result<(), String> {
    let endpoint = if provider == "local_ollama" {
        config.ollama_endpoint.as_ref()
    } else {
        config.lmstudio_endpoint.as_ref()
    }.ok_or("Local endpoint not configured")?;
    
    let url = format!("{}/v1/chat/completions", endpoint.trim_end_matches('/'));

    let mut req_body = serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": true
    });

    if let Some(obj) = req_body.as_object_mut() {
        if let Some(t) = temperature { obj.insert("temperature".to_string(), serde_json::json!(t)); }
        if let Some(p) = top_p { obj.insert("top_p".to_string(), serde_json::json!(p)); }
        if let Some(m) = max_tokens { obj.insert("max_tokens".to_string(), serde_json::json!(m)); }
        if let Some(s) = stop_strings { obj.insert("stop".to_string(), serde_json::json!(s)); }

        if provider == "local_lmstudio" {
            obj.insert("stream_options".to_string(), serde_json::json!({"include_usage": true}));
        }
    }

    let client = reqwest::Client::new();
    let resp = client.post(url).json(&req_body).send().await.map_err(|e| e.to_string())?;

    let mut stream = resp.bytes_stream();
    let mut buffer = String::new();
    let mut total_tokens = 0;
    let mut stop_reason = "end_turn".to_string();
    let mut manual_token_count = 0;
    let mut lm_stats = serde_json::json!({});

    let mut first_token_time: Option<std::time::Instant> = None;
    let mut last_token_time: Option<std::time::Instant> = None;

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
                if data == "[DONE]" { break; }
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(choices) = json.get("choices").and_then(|c| c.as_array()) {
                        if !choices.is_empty() {
                            if let Some(content) = choices[0]["delta"]["content"].as_str() {
                                if first_token_time.is_none() {
                                    first_token_time = Some(std::time::Instant::now());
                                }
                                last_token_time = Some(std::time::Instant::now());
                                manual_token_count += 1;
                                let _ = channel.send(serde_json::to_string(&StreamingEvent::Text(content.to_string())).unwrap());

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

                    // Extract stats/usage
                    if let Some(usage) = json.get("usage") {
                        let prompt_tokens = usage.get("prompt_tokens").and_then(|v| v.as_u64()).unwrap_or(0);
                        let completion_tokens = usage.get("completion_tokens").and_then(|v| v.as_u64()).unwrap_or(0);

                        if prompt_tokens > 0 || completion_tokens > 0 {
                            total_tokens = prompt_tokens + completion_tokens;
                            lm_stats["input_tokens"] = serde_json::json!(prompt_tokens);
                            lm_stats["output_tokens"] = serde_json::json!(completion_tokens);

                            if let Some(eval_ms) = usage.get("eval_duration").and_then(|v| v.as_f64()) {
                                let duration_sec = eval_ms / 1000.0;
                                if duration_sec > 0.0 {
                                    lm_stats["total_duration"] = serde_json::json!(eval_ms);
                                    lm_stats["tokens_per_second"] = serde_json::json!(completion_tokens as f64 / duration_sec);
                                }
                            } else if let (Some(first), Some(last)) = (first_token_time, last_token_time) {
                                let duration_ms = last.duration_since(first).as_millis() as f64;
                                if duration_ms > 0.0 {
                                    lm_stats["total_duration"] = serde_json::json!(duration_ms);
                                    lm_stats["tokens_per_second"] = serde_json::json!(completion_tokens as f64 / (duration_ms / 1000.0));
                                }
                            }
                        }
                    }
                    if let Some(stats) = json.get("stats") {
                        if let Some(tps) = stats["tokens_per_second"].as_f64() {
                            if lm_stats.get("tokens_per_second").is_none() {
                                lm_stats["tokens_per_second"] = serde_json::json!(tps);
                            }
                        }
                        if let Some(ttft) = stats["time_to_first_token"].as_f64() {
                            lm_stats["time_to_first_token"] = serde_json::json!(ttft);
                        }
                        if total_tokens == 0 {
                            if let Some(np) = stats["num_predicted"].as_u64() {
                                total_tokens = np;
                            } else if let Some(ptc) = stats["predicted_tokens_count"].as_u64() {
                                total_tokens = ptc;
                            }
                        }
                        if let Some(total_duration) = stats["total_duration"].as_f64() {
                            if lm_stats.get("total_duration").is_none() {
                                lm_stats["total_duration"] = serde_json::json!(total_duration);
                            }
                        }
                    }
                }
            }
        }
    }

    if total_tokens == 0 { total_tokens = manual_token_count; }
    let mut final_stats = serde_json::json!({ "stop_reason": stop_reason, "total_tokens": total_tokens });
    if let Some(obj) = final_stats.as_object_mut() {
        if let Some(lm_obj) = lm_stats.as_object() {
            for (k, v) in lm_obj { obj.insert(k.clone(), v.clone()); }
        }
    }
    let _ = channel.send(serde_json::to_string(&StreamingEvent::Stats(final_stats)).unwrap());
    Ok(())
}
