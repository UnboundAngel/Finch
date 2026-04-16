use tauri::{AppHandle, command, State};
use crate::types::{ChatMessage, AppState, StreamingEvent, ProviderConfig};
use crate::providers::{prepare_messages, map_model};
use crate::providers::anthropic::{AnthropicClient, AnthropicRequest};
use crate::search;
use std::sync::atomic::Ordering;
use tauri_plugin_store::StoreExt;
use std::env;

#[command]
pub async fn send_message(
    handle: AppHandle,
    prompt: String, 
    model: String,
    provider: String,
    conversation_history: Vec<ChatMessage>,
    system_prompt: Option<String>,
    temperature: Option<f32>,
    top_p: Option<f32>,
    max_tokens: Option<u32>,
    stop_strings: Option<Vec<String>>
) -> Result<String, String> {
    let top_p = top_p.map(|p| if p <= 0.0 { 0.01 } else { p.min(1.0) });
    println!("Rust received (provider: {}, model: {}): {}", provider, model, prompt);

    let store = handle.get_store("finch_config.json").ok_or("Store not found")?;
    let config_val = store.get("provider_config");
    let config: Option<ProviderConfig> = config_val.and_then(|v| serde_json::from_value(v).ok());

    let messages = prepare_messages(conversation_history, prompt.clone(), &provider, system_prompt.clone(), max_tokens);

    match provider.as_str() {
        "anthropic" => {
            let api_key = config.and_then(|c| c.anthropic_api_key)
                .or_else(|| env::var("ANTHROPIC_API_KEY").ok())
                .ok_or("Anthropic API key not set")?;
            
            let client = AnthropicClient::new(api_key);
            let request = AnthropicRequest {
                model: map_model(&model),
                messages: serde_json::from_value(messages).map_err(|e| e.to_string())?,
                max_tokens: max_tokens.unwrap_or(2048),
                stream: false,
                system: system_prompt,
                temperature,
                top_p,
                stop_sequences: stop_strings,
            };

            let response = client.call_anthropic(request).await?;
            if let Some(content) = response.content.first() {
                Ok(content.text.clone())
            } else {
                Err("No content returned from Anthropic".to_string())
            }
        },
        "openai" | "local_ollama" | "local_lmstudio" => {
            let (url, api_key) = if provider == "openai" {
                let key = config.and_then(|c| c.openai_api_key).ok_or("OpenAI API key not set")?;
                ("https://api.openai.com/v1/chat/completions".to_string(), Some(key))
            } else {
                let endpoint = if provider == "local_ollama" {
                    config.and_then(|c| c.ollama_endpoint)
                } else {
                    config.and_then(|c| c.lmstudio_endpoint)
                }.ok_or("Local endpoint not configured")?;
                (format!("{}/v1/chat/completions", endpoint.trim_end_matches('/')), None)
            };

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
            let mut req = client.post(url).json(&body);
            if let Some(key) = api_key {
                req = req.header("Authorization", format!("Bearer {}", key));
            }

            let resp = req.send().await.map_err(|e| e.to_string())?;
            let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            json["choices"][0]["message"]["content"]
                .as_str()
                .map(|s| s.to_string())
                .ok_or("Failed to parse response".to_string())
        },
        "gemini" => {
            let api_key = config.and_then(|c| c.gemini_api_key).ok_or("Gemini API key not set")?;
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
        },
        _ => Err(format!("Unsupported provider: {}", provider))
    }
}

#[command]
pub async fn stream_message(
    handle: AppHandle,
    prompt: String, 
    model: String, 
    provider: String,
    conversation_history: Vec<ChatMessage>,
    system_prompt: Option<String>,
    temperature: Option<f32>,
    top_p: Option<f32>,
    max_tokens: Option<u32>,
    stop_strings: Option<Vec<String>>,
    enable_web_search: Option<bool>,
    channel: tauri::ipc::Channel<String>,
    state: State<'_, AppState>
) -> Result<(), String> {
    let top_p = top_p.map(|p| if p <= 0.0 { 0.01 } else { p.min(1.0) });
    println!("Rust received stream request (provider: {}, model: {}, search: {:?}): {}", provider, model, enable_web_search, prompt);

    state.abort_flag.store(false, Ordering::SeqCst);

    let store = handle.get_store("finch_config.json").ok_or("Store not found")?;
    let config_val = store.get("provider_config");
    let config: Option<ProviderConfig> = config_val.and_then(|v| serde_json::from_value(v).ok());

    let mut final_prompt = prompt.clone();

    // --- Web Search Pre-Pass ---
    if enable_web_search.unwrap_or(false) {
        let search_query = final_prompt.clone();

        // Lookup active provider from config, default to Tavily
        let active_search = config.as_ref().and_then(|c| c.active_search_provider.as_deref()).unwrap_or("tavily");

        let search_provider = match active_search {
            "brave" => {
                let brave_key = config.as_ref().and_then(|c| c.brave_api_key.clone()).ok_or("Brave API key not set. Right-click the globe to configure.")?;
                search::SearchProvider::Brave(brave_key)
            },
            "searxng" => {
                let searx_url = config.as_ref().and_then(|c| c.searxng_url.clone()).ok_or("SearXNG URL not set. Right-click the globe to configure.")?;
                search::SearchProvider::SearXNG(searx_url)
            },
            _ => {
                let tavily_key = config.as_ref().and_then(|c| c.tavily_api_key.clone()).ok_or("Tavily API key not set. Click the globe to configure.")?;
                search::SearchProvider::Tavily(tavily_key)
            }
        };

        let _ = channel.send(serde_json::to_string(&StreamingEvent::SearchStart { query: search_query.clone() }).unwrap());

        let search_handle = channel.clone();
        let search_context = search::execute_search(search_provider, &search_query, move |res| {
            let _ = search_handle.send(serde_json::to_string(&StreamingEvent::SearchSource(crate::types::SourceEntry {
                title: res.title,
                url: res.url,
                duration_ms: res.duration_ms,
            })).unwrap());
        }).await?;

        let _ = channel.send(serde_json::to_string(&StreamingEvent::SearchDone).unwrap());
        final_prompt = format!("{}\n\n{}", search_context, final_prompt);
    }
    // ----------------------------

    let messages = prepare_messages(conversation_history, final_prompt, &provider, system_prompt.clone(), max_tokens);

    match provider.as_str() {
        "anthropic" => {
            let api_key = config.and_then(|c| c.anthropic_api_key)
                .or_else(|| env::var("ANTHROPIC_API_KEY").ok())
                .ok_or("Anthropic API key not set")?;

            let client = AnthropicClient::new(api_key);
            let request = AnthropicRequest {
                model: map_model(&model),
                messages: serde_json::from_value(messages).map_err(|e| e.to_string())?,
                max_tokens: max_tokens.unwrap_or(2048),
                stream: true,
                system: system_prompt,
                temperature,
                top_p,
                stop_sequences: stop_strings,
            };

            client.stream_anthropic(request, channel, state.abort_flag.clone()).await?;
            Ok(())
        },
        "openai" | "local_ollama" | "local_lmstudio" => {
            let (url, api_key) = if provider == "openai" {
                let key = config.and_then(|c| c.openai_api_key).ok_or("OpenAI API key not set")?;
                ("https://api.openai.com/v1/chat/completions".to_string(), Some(key))
            } else {
                let endpoint = if provider == "local_ollama" {
                    config.and_then(|c| c.ollama_endpoint)
                } else {
                    config.and_then(|c| c.lmstudio_endpoint)
                }.ok_or("Local endpoint not configured")?;
                (format!("{}/v1/chat/completions", endpoint.trim_end_matches('/')), None)
            };

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

                // Add stream_options for OpenAI/LM Studio to get usage
                if provider == "openai" || provider == "local_lmstudio" {
                    obj.insert("stream_options".to_string(), serde_json::json!({"include_usage": true}));
                }
            }

            let client = reqwest::Client::new();
            let mut req = client.post(url).json(&req_body);

            if let Some(key) = api_key {
                req = req.header("Authorization", format!("Bearer {}", key));
            }

            let resp = req.send().await.map_err(|e| e.to_string())?;

            use futures_util::StreamExt;
            let mut stream = resp.bytes_stream();
            let mut buffer = String::new();
            let mut total_tokens = 0;
            let mut stop_reason = "end_turn".to_string();
            let mut manual_token_count = 0;
            let mut lm_stats = serde_json::json!({});

            let mut first_token_time: Option<std::time::Instant> = None;
            let mut last_token_time: Option<std::time::Instant> = None;

            while let Some(item) = stream.next().await {
                if state.abort_flag.load(Ordering::SeqCst) {
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
        },
        "gemini" => {
            let api_key = config.and_then(|c| c.gemini_api_key).ok_or("Gemini API key not set")?;
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

            use futures_util::StreamExt;
            let mut stream = resp.bytes_stream();
            let mut buffer = String::new();
            let mut total_tokens = 0;
            let mut input_tokens = 0;
            let mut output_tokens = 0;
            let mut stop_reason = "end_turn".to_string();
            let mut manual_token_count = 0;

            while let Some(item) = stream.next().await {
                if state.abort_flag.load(Ordering::SeqCst) {
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
        },
        _ => Err(format!("Unsupported provider: {}", provider))
    }
}

#[command]
pub async fn abort_generation(state: State<'_, AppState>) -> Result<(), String> {
    println!("Aborting generation...");
    state.abort_flag.store(true, Ordering::SeqCst);
    Ok(())
}
