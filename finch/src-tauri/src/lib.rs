mod anthropic;
use anthropic::{AnthropicClient, AnthropicRequest, Message};
use serde::{Deserialize, Serialize};
use std::env;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, State, Wry};
use tauri_plugin_store::StoreExt;

pub struct AppState {
    pub abort_flag: Arc<AtomicBool>,
}

impl Default for AppState {
    fn default() -> Self {
        #[allow(clippy::redundant_closure)]
        Self {
            abort_flag: Arc::new(AtomicBool::new(false)),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProviderConfig {
    pub anthropic_api_key: Option<String>,
    pub openai_api_key: Option<String>,
    pub gemini_api_key: Option<String>,
    pub lmstudio_endpoint: Option<String>,
    pub ollama_endpoint: Option<String>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn get_provider_config(handle: AppHandle) -> Result<Option<ProviderConfig>, String> {
    let store = handle.get_store("settings.json").ok_or("Store not found")?;
    let config = store.get("provider_config");
    
    if let Some(val) = config {
        let mut provider_config: ProviderConfig = serde_json::from_value(val).map_err(|e| e.to_string())?;
        // Remove API keys from response to prevent any leakage to frontend
        provider_config.anthropic_api_key = None;
        provider_config.openai_api_key = None;
        provider_config.gemini_api_key = None;
        Ok(Some(provider_config))
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn save_provider_config(handle: AppHandle, config: ProviderConfig) -> Result<(), String> {
    let store = handle.get_store("settings.json").ok_or("Store not found")?;
    store.set("provider_config", serde_json::to_value(config).map_err(|e| e.to_string())?);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn list_local_models(endpoint: String, provider: String) -> Result<Vec<String>, String> {
    let client = reqwest::Client::new();
    
    if provider == "local_ollama" {
        let url = format!("{}/api/tags", endpoint.trim_end_matches('/'));
        let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
        let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        
        let mut models = Vec::new();
        if let Some(models_arr) = json.get("models").and_then(|m| m.as_array()) {
            for m in models_arr {
                if let Some(name) = m.get("name").and_then(|n| n.as_str()) {
                    models.push(name.to_string());
                }
            }
        }
        Ok(models)
    } else if provider == "local_lmstudio" {
        let url = format!("{}/v1/models", endpoint.trim_end_matches('/'));
        let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
        let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        
        let mut models = Vec::new();
        if let Some(data_arr) = json.get("data").and_then(|d| d.as_array()) {
            for m in data_arr {
                if let Some(id) = m.get("id").and_then(|i| i.as_str()) {
                    models.push(id.to_string());
                }
            }
        }
        Ok(models)
    } else {
        Err("Unsupported local provider".to_string())
    }
}

#[tauri::command]
async fn list_anthropic_models(handle: AppHandle) -> Result<Vec<String>, String> {
    let store = handle.get_store("settings.json").ok_or("Store not found")?;
    let config_val = store.get("provider_config");
    let config: Option<ProviderConfig> = config_val.and_then(|v| serde_json::from_value(v).ok());
    
    let api_key = match config.and_then(|c| c.anthropic_api_key) {
        Some(k) if k != "••••••••" => k,
        _ => match env::var("ANTHROPIC_API_KEY") {
            Ok(k) => k,
            Err(_) => return Ok(vec![]),
        }
    };

    let client = reqwest::Client::new();
    let resp = client.get("https://api.anthropic.com/v1/models")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .send()
        .await;

    match resp {
        Ok(r) => {
            let json: serde_json::Value = r.json().await.unwrap_or_default();
            let mut models = Vec::new();
            if let Some(data) = json.get("data").and_then(|d| d.as_array()) {
                for item in data {
                    if let Some(id) = item.get("id").and_then(|i| i.as_str()) {
                        models.push(id.to_string());
                    }
                }
            }
            Ok(models)
        }
        Err(_) => Ok(vec![]),
    }
}

#[tauri::command]
async fn list_openai_models(handle: AppHandle) -> Result<Vec<String>, String> {
    let store = handle.get_store("settings.json").ok_or("Store not found")?;
    let config_val = store.get("provider_config");
    let config: Option<ProviderConfig> = config_val.and_then(|v| serde_json::from_value(v).ok());
    
    let api_key = match config.and_then(|c| c.openai_api_key) {
        Some(k) if k != "••••••••" => k,
        _ => return Ok(vec![]),
    };

    let client = reqwest::Client::new();
    let resp = client.get("https://api.openai.com/v1/models")
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await;

    match resp {
        Ok(r) => {
            let json: serde_json::Value = r.json().await.unwrap_or_default();
            let mut models = Vec::new();
            if let Some(data) = json.get("data").and_then(|d| d.as_array()) {
                for item in data {
                    let owned_by = item.get("owned_by").and_then(|o| o.as_str()).unwrap_or_default();
                    let id = item.get("id").and_then(|i| i.as_str()).unwrap_or_default();
                    if owned_by == "openai" && (id.starts_with("gpt-") || id.starts_with("o")) {
                        models.push(id.to_string());
                    }
                }
            }
            models.sort();
            Ok(models)
        }
        Err(_) => Ok(vec![]),
    }
}

#[tauri::command]
async fn list_gemini_models(handle: AppHandle) -> Result<Vec<String>, String> {
    let store = handle.get_store("settings.json").ok_or("Store not found")?;
    let config_val = store.get("provider_config");
    let config: Option<ProviderConfig> = config_val.and_then(|v| serde_json::from_value(v).ok());
    
    let api_key = match config.and_then(|c| c.gemini_api_key) {
        Some(k) if k != "••••••••" => k,
        _ => return Ok(vec![]),
    };

    let client = reqwest::Client::new();
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models?key={}", api_key);
    let resp = client.get(url).send().await;

    match resp {
        Ok(r) => {
            let json: serde_json::Value = r.json().await.unwrap_or_default();
            let mut models = Vec::new();
            if let Some(models_arr) = json.get("models").and_then(|m| m.as_array()) {
                for item in models_arr {
                    if let Some(name) = item.get("name").and_then(|n| n.as_str()) {
                        if name.starts_with("models/") {
                            let striped = &name[7..];
                            if striped.starts_with("gemini-") {
                                models.push(striped.to_string());
                            }
                        }
                    }
                }
            }
            Ok(models)
        }
        Err(_) => Ok(vec![]),
    }
}

fn map_model(model_name: &str) -> String {
    match model_name {
        "Finch 3.5 Sonnet" => "claude-3-5-sonnet-20240620".to_string(),
        "Finch 3 Haiku" => "claude-3-haiku-20240307".to_string(),
        _ => "claude-3-5-sonnet-20240620".to_string(), // Default
    }
}

#[tauri::command]
async fn send_message(
    handle: AppHandle,
    prompt: String, 
    model: String,
    provider: String
) -> Result<String, String> {
    println!("Rust received (provider: {}, model: {}): {}", provider, model, prompt);

    let store = handle.get_store("settings.json").ok_or("Store not found")?;
    let config_val = store.get("provider_config");
    let config: Option<ProviderConfig> = config_val.and_then(|v| serde_json::from_value(v).ok());

    match provider.as_str() {
        "anthropic" => {
            let api_key = config.and_then(|c| c.anthropic_api_key)
                .or_else(|| env::var("ANTHROPIC_API_KEY").ok())
                .ok_or("Anthropic API key not set")?;
            
            let client = AnthropicClient::new(api_key);
            let request = AnthropicRequest {
                model: map_model(&model),
                messages: vec![Message {
                    role: "user".to_string(),
                    content: prompt,
                }],
                max_tokens: 1024,
                stream: false,
            };

            let response = client.call_anthropic(request).await?;
            if let Some(content) = response.content.first() {
                Ok(content.text.clone())
            } else {
                Err("No content returned from Anthropic".to_string())
            }
        },
        "openai" => {
            let api_key = config.and_then(|c| c.openai_api_key).ok_or("OpenAI API key not set")?;
            let client = reqwest::Client::new();
            let resp = client.post("https://api.openai.com/v1/chat/completions")
                .header("Authorization", format!("Bearer {}", api_key))
                .json(&serde_json::json!({
                    "model": model,
                    "messages": [{ "role": "user", "content": prompt }],
                    "stream": false
                }))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            json["choices"][0]["message"]["content"]
                .as_str()
                .map(|s| s.to_string())
                .ok_or("Failed to parse OpenAI response".to_string())
        },
        "gemini" => {
            let api_key = config.and_then(|c| c.gemini_api_key).ok_or("Gemini API key not set")?;
            let client = reqwest::Client::new();
            let url = format!("https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}", model, api_key);
            let resp = client.post(url)
                .json(&serde_json::json!({
                    "contents": [{ "parts": [{ "text": prompt }] }]
                }))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            json["candidates"][0]["content"]["parts"][0]["text"]
                .as_str()
                .map(|s| s.to_string())
                .ok_or("Failed to parse Gemini response".to_string())
        },
        _ if provider.starts_with("local_") => {
            let endpoint = if provider == "local_ollama" {
                config.and_then(|c| c.ollama_endpoint)
            } else {
                config.and_then(|c| c.lmstudio_endpoint)
            }.ok_or("Local endpoint not configured")?;
            
            let client = reqwest::Client::new();
            let url = format!("{}/v1/chat/completions", endpoint.trim_end_matches('/'));
            
            let resp = client.post(url)
                .json(&serde_json::json!({
                    "model": model,
                    "messages": [{ "role": "user", "content": prompt }],
                    "stream": false
                }))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            json["choices"][0]["message"]["content"]
                .as_str()
                .map(|s| s.to_string())
                .ok_or("Failed to parse local response".to_string())
        },
        _ => Err(format!("Unsupported provider: {}", provider))
    }
}

#[tauri::command]
async fn stream_message(
    handle: AppHandle,
    prompt: String, 
    model: String, 
    provider: String,
    channel: tauri::ipc::Channel<String>,
    state: State<'_, AppState>
) -> Result<(), String> {
    println!("Rust received stream request (provider: {}, model: {}): {}", provider, model, prompt);

    state.abort_flag.store(false, Ordering::SeqCst);

    let store = handle.get_store("settings.json").ok_or("Store not found")?;
    let config_val = store.get("provider_config");
    let config: Option<ProviderConfig> = config_val.and_then(|v| serde_json::from_value(v).ok());

    match provider.as_str() {
        "anthropic" => {
            let api_key = config.and_then(|c| c.anthropic_api_key)
                .or_else(|| env::var("ANTHROPIC_API_KEY").ok())
                .ok_or("Anthropic API key not set")?;
            
            let client = AnthropicClient::new(api_key);
            let request = AnthropicRequest {
                model: map_model(&model),
                messages: vec![Message { role: "user".to_string(), content: prompt }],
                max_tokens: 1024,
                stream: true,
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

            let client = reqwest::Client::new();
            let mut req_body = serde_json::json!({
                "model": model,
                "messages": [{ "role": "user", "content": prompt }],
                "stream": true
            });

            // Add stream_options for OpenAI to get usage
            if provider == "openai" {
                if let Some(obj) = req_body.as_object_mut() {
                    obj.insert("stream_options".to_string(), serde_json::json!({"include_usage": true}));
                }
            }

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
                                        manual_token_count += 1;
                                        channel.send(content.to_string()).map_err(|e| e.to_string())?;
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
                                if let Some(completion_tokens) = usage["completion_tokens"].as_u64() {
                                    total_tokens = completion_tokens;
                                }
                            }
                        }
                    }
                }
            }

            // Fallback to manual count if usage wasn't provided
            if total_tokens == 0 {
                total_tokens = manual_token_count;
            }

            let stats = serde_json::json!({
                "stop_reason": stop_reason,
                "total_tokens": total_tokens
            });
            channel.send(format!("__STATS__:{}", stats)).map_err(|e| e.to_string())?;

            Ok(())
        },
        "gemini" => {
            let api_key = config.and_then(|c| c.gemini_api_key).ok_or("Gemini API key not set")?;
            let client = reqwest::Client::new();
            let url = format!("https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?alt=sse&key={}", model, api_key);
            
            let resp = client.post(url)
                .json(&serde_json::json!({
                    "contents": [{ "parts": [{ "text": prompt }] }]
                }))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            use futures_util::StreamExt;
            let mut stream = resp.bytes_stream();
            let mut buffer = String::new();
            let mut total_tokens = 0;
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
                                        channel.send(content.to_string()).map_err(|e| e.to_string())?;
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
                                if let Some(count) = usage["candidatesTokenCount"].as_u64() {
                                    total_tokens = count;
                                }
                            }
                        }
                    }
                }
            }

            if total_tokens == 0 {
                total_tokens = manual_token_count;
            }

            let stats = serde_json::json!({
                "stop_reason": stop_reason,
                "total_tokens": total_tokens
            });
            channel.send(format!("__STATS__:{}", stats)).map_err(|e| e.to_string())?;

            Ok(())
        },
        _ => Err(format!("Unsupported provider: {}", provider))
    }
}

#[tauri::command]
async fn abort_generation(state: State<'_, AppState>) -> Result<(), String> {
    println!("Aborting generation...");
    state.abort_flag.store(true, Ordering::SeqCst);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize and load the store to ensure it's available for commands
            let store = app.store("settings.json")?;
            let _ = store.reload();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet, 
            send_message, 
            stream_message,
            abort_generation,
            save_provider_config,
            get_provider_config,
            list_local_models,
            list_anthropic_models,
            list_openai_models,
            list_gemini_models
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
