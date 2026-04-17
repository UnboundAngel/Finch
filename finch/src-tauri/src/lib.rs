mod anthropic;
mod search;
mod voice;
mod download;
mod tavily;

use anthropic::{AnthropicClient, AnthropicRequest, Message};
use voice::{VoiceManager, VoiceStatus};
use download::{ModelManifest, download_model};
use serde::{Deserialize, Serialize};
use std::env;
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, State, Manager, Emitter};
use tauri_plugin_store::StoreExt;
use std::fs;
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

pub struct AppState {
    pub abort_flag: Arc<AtomicBool>,
    pub voice_manager: Arc<VoiceManager>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            abort_flag: Arc::new(AtomicBool::new(false)),
            voice_manager: Arc::new(VoiceManager::new()),
        }
    }
}

// ... existing structs ...

fn estimate_tokens(text: &str) -> usize {
    (text.chars().count() as f32 / 4.0).ceil() as usize
}

fn trim_history(
    mut history: Vec<ChatMessage>,
    budget: usize,
    current_prompt: &str,
    system_prompt: &Option<String>
) -> Vec<ChatMessage> {
    let mut current_total = estimate_tokens(current_prompt) + 
        estimate_tokens(system_prompt.as_deref().unwrap_or(""));
    
    // Calculate initial history tokens
    for m in &history {
        current_total += estimate_tokens(&m.content);
    }

    // Prune oldest first until under budget
    while current_total > budget && !history.is_empty() {
        let removed = history.remove(0);
        current_total -= estimate_tokens(&removed.content);
    }

    history
}

fn prepare_messages(
    history: Vec<ChatMessage>,
    current_prompt: String,
    provider: &str,
    system_prompt: Option<String>,
    max_tokens: Option<u32>,
) -> serde_json::Value {
    let budget = (max_tokens.unwrap_or(4096) as f32 * 0.75) as usize;
    let trimmed_history = trim_history(history, budget, &current_prompt, &system_prompt);

    match provider {
        "anthropic" => {
            let mut messages: Vec<Message> = trimmed_history
                .into_iter()
                .map(|m| Message {
                    role: m.role,
                    content: m.content,
                })
                .collect();
            messages.push(Message {
                role: "user".to_string(),
                content: current_prompt,
            });
            serde_json::to_value(messages).unwrap_or(serde_json::json!([]))
        }
        "gemini" => {
            let mut contents = Vec::new();
            for m in trimmed_history {
                let role = if m.role == "assistant" { "model" } else { "user" };
                contents.push(serde_json::json!({
                    "role": role,
                    "parts": [{ "text": m.content }]
                }));
            }
            contents.push(serde_json::json!({
                "role": "user",
                "parts": [{ "text": current_prompt }]
            }));
            serde_json::to_value(contents).unwrap_or(serde_json::json!([]))
        }
        _ => {
            // OpenAI, Ollama, LM Studio
            let mut messages = Vec::new();
            if let Some(sys) = system_prompt {
                if !sys.is_empty() {
                    messages.push(serde_json::json!({ "role": "system", "content": sys }));
                }
            }
            for m in trimmed_history {
                messages.push(serde_json::json!({ "role": m.role, "content": m.content }));
            }
            messages.push(serde_json::json!({ "role": "user", "content": current_prompt }));
            serde_json::to_value(messages).unwrap_or(serde_json::json!([]))
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(default)]
pub struct ProviderConfig {
    pub anthropic_api_key: Option<String>,
    pub openai_api_key: Option<String>,
    pub gemini_api_key: Option<String>,
    pub lmstudio_endpoint: Option<String>,
    pub ollama_endpoint: Option<String>,
    pub tavily_api_key: Option<String>,
    pub brave_api_key: Option<String>,
    pub searxng_url: Option<String>,
    pub profile_name: Option<String>,
    pub profile_email: Option<String>,
    pub enter_to_send: Option<bool>,
    pub selected_model: Option<String>,
    pub selected_provider: Option<String>,
    pub active_search_provider: Option<String>,
    pub bookmarked_models: Option<Vec<serde_json::Value>>,
    pub custom_bg_light: Option<String>,
    pub custom_bg_dark: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SourceEntry {
    pub title: String,
    pub url: String,
    pub duration_ms: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", content = "data")]
pub enum StreamingEvent {
    #[serde(rename = "text")]
    Text(String),
    #[serde(rename = "search_start")]
    SearchStart { query: String },
    #[serde(rename = "search_source")]
    SearchSource(SourceEntry),
    #[serde(rename = "search_done")]
    SearchDone,
    #[serde(rename = "stats")]
    Stats(serde_json::Value),
}

// ... existing structs ...

#[tauri::command]
async fn set_background_image(handle: AppHandle, mode: String) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    
    let file_path_enum = handle.dialog()
        .file()
        .add_filter("Images", &["png", "jpg", "jpeg", "gif", "webp"])
        .blocking_pick_file()
        .ok_or("No file selected")?;

    let file_path = match file_path_enum {
        tauri_plugin_dialog::FilePath::Path(p) => p,
        _ => return Err("Selected item is not a local file".into()),
    };

    let app_dir = handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let bg_dir = app_dir.join("backgrounds");
    if !bg_dir.exists() {
        fs::create_dir_all(&bg_dir).map_err(|e| e.to_string())?;
    }

    let file_name = file_path.file_name().ok_or("Invalid file name")?;
    let dest_path = bg_dir.join(file_name);
    
    // Copy file to app data
    fs::copy(&file_path, &dest_path).map_err(|e| e.to_string())?;

    let dest_path_str = dest_path.to_string_lossy().to_string();

    // Update config
    let store = handle.get_store("finch_config.json").ok_or("Store not found")?;
    let mut config_val = store.get("provider_config").unwrap_or(serde_json::json!({}));
    
    if mode == "light" {
        config_val["custom_bg_light"] = serde_json::json!(dest_path_str);
    } else {
        config_val["custom_bg_dark"] = serde_json::json!(dest_path_str);
    }

    store.set("provider_config", config_val);
    store.save().map_err(|e| e.to_string())?;

    Ok(dest_path_str)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatSession {
    pub id: String,
    pub title: String,
    pub messages: Vec<serde_json::Value>,
    pub model: Option<String>,
    pub provider: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn get_provider_config(handle: AppHandle) -> Result<Option<ProviderConfig>, String> {
    let store = handle.get_store("finch_config.json").ok_or("Store not found")?;
    let config = store.get("provider_config");
    
    if let Some(val) = config {
        let mut provider_config: ProviderConfig = serde_json::from_value(val).map_err(|e| e.to_string())?;
        
        // Mask API keys to indicate presence without leaking value
        if provider_config.anthropic_api_key.is_some() {
            provider_config.anthropic_api_key = Some("••••••••".to_string());
        }
        if provider_config.openai_api_key.is_some() {
            provider_config.openai_api_key = Some("••••••••".to_string());
        }
        if provider_config.gemini_api_key.is_some() {
            provider_config.gemini_api_key = Some("••••••••".to_string());
        }
        
        Ok(Some(provider_config))
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn save_provider_config(handle: AppHandle, config: ProviderConfig) -> Result<(), String> {
    let store = handle.get_store("finch_config.json").ok_or("Store not found")?;
    
    let mut current_config_val = store.get("provider_config").unwrap_or(serde_json::json!({}));
    let new_config_val = serde_json::to_value(config).map_err(|e| e.to_string())?;

    if let (Some(current_obj), Some(new_obj)) = (current_config_val.as_object_mut(), new_config_val.as_object()) {
        for (k, v) in new_obj {
            // Only update if the new value is not null
            if !v.is_null() {
                current_obj.insert(k.clone(), v.clone());
            }
        }
    } else {
        current_config_val = new_config_val;
    }

    store.set("provider_config", current_config_val);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn update_search_config(handle: AppHandle, config: serde_json::Value) -> Result<(), String> {
    let store = handle.get_store("finch_config.json").ok_or("Store not found")?;
    let config_val = store.get("provider_config");
    let mut current_config: ProviderConfig = config_val
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    if let Some(obj) = config.as_object() {
        if let Some(k) = obj.get("tavily_api_key").and_then(|v| v.as_str()) { current_config.tavily_api_key = Some(k.to_string()); }
        if let Some(k) = obj.get("brave_api_key").and_then(|v| v.as_str()) { current_config.brave_api_key = Some(k.to_string()); }
        if let Some(u) = obj.get("searxng_url").and_then(|v| v.as_str()) { current_config.searxng_url = Some(u.to_string()); }
        if let Some(p) = obj.get("active_search_provider").and_then(|v| v.as_str()) { current_config.active_search_provider = Some(p.to_string()); }
    }

    store.set("provider_config", serde_json::to_value(current_config).unwrap());
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
    let store = handle.get_store("finch_config.json").ok_or("Store not found")?;
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
    let store = handle.get_store("finch_config.json").ok_or("Store not found")?;
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
    let store = handle.get_store("finch_config.json").ok_or("Store not found")?;
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

use sysinfo::{System, Disks, Networks, Components};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HardwareInfo {
    pub total_memory_gb: f64,
    pub available_memory_gb: f64,
    pub cpu_count: usize,
    pub os_name: String,
}

#[tauri::command]
async fn get_hardware_info() -> Result<HardwareInfo, String> {
    let mut sys = System::new_all();
    sys.refresh_all();

    Ok(HardwareInfo {
        total_memory_gb: sys.total_memory() as f64 / 1024.0 / 1024.0 / 1024.0,
        available_memory_gb: sys.available_memory() as f64 / 1024.0 / 1024.0 / 1024.0,
        cpu_count: sys.cpus().len(),
        os_name: System::name().unwrap_or_else(|| "Unknown".to_string()),
    })
}

#[tauri::command]
async fn send_message(
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

#[tauri::command]
async fn stream_message(
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
            let _ = search_handle.send(serde_json::to_string(&StreamingEvent::SearchSource(SourceEntry {
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
                                        let _ = channel.send(serde_json::to_string(&crate::StreamingEvent::Text(content.to_string())).unwrap());
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

                                    // Use native timing if available (eval_duration is in ms or nanoseconds depending on version)
                                    // LM Studio SSE final usage chunk usually has eval_duration
                                    if let Some(eval_ms) = usage.get("eval_duration").and_then(|v| v.as_f64()) {
                                        let duration_sec = eval_ms / 1000.0;
                                        if duration_sec > 0.0 {
                                            lm_stats["total_duration"] = serde_json::json!(eval_ms);
                                            // FINCH INVARIANT — DO NOT CHANGE
                                            // tokens/sec uses eval_duration from LM Studio's final SSE usage chunk.
                                            // Wall-clock elapsed time inflates this ~3x (network + prompt eval overhead).
                                            // Do not revert to wall-clock. Regression history: reintroduced multiple times.
                                            lm_stats["tokens_per_second"] = serde_json::json!(completion_tokens as f64 / duration_sec);
                                        }
                                    } else if let (Some(first), Some(last)) = (first_token_time, last_token_time) {
                                        // Fallback to wall-clock if eval_duration is missing
                                        let duration_ms = last.duration_since(first).as_millis() as f64;
                                        if duration_ms > 0.0 {
                                            lm_stats["total_duration"] = serde_json::json!(duration_ms);
                                            lm_stats["tokens_per_second"] = serde_json::json!(completion_tokens as f64 / (duration_ms / 1000.0));
                                        }
                                    }
                                }
                            }
                            // Extract LM Studio specific stats if present (fallback)
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
            let _ = channel.send(serde_json::to_string(&crate::StreamingEvent::Stats(final_stats)).unwrap());
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
                                        let _ = channel.send(serde_json::to_string(&crate::StreamingEvent::Text(content.to_string())).unwrap());
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
#[tauri::command]
async fn abort_generation(state: State<'_, AppState>) -> Result<(), String> {
    println!("Aborting generation...");
    state.abort_flag.store(true, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
async fn list_chats(handle: AppHandle) -> Result<Vec<ChatSession>, String> {
    let app_dir = handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let chats_dir = app_dir.join("chats");
    
    if !chats_dir.exists() {
        return Ok(vec![]);
    }

    let mut chats = Vec::new();
    for entry in fs::read_dir(chats_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            if let Ok(chat) = serde_json::from_str::<ChatSession>(&content) {
                chats.push(chat);
            }
        }
    }

    chats.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(chats)
}

#[tauri::command]
async fn load_chat(handle: AppHandle, id: String) -> Result<ChatSession, String> {
    let app_dir = handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let chat_path = app_dir.join("chats").join(format!("{}.json", id));
    
    if !chat_path.exists() {
        return Err("Chat not found".to_string());
    }

    let content = fs::read_to_string(chat_path).map_err(|e| e.to_string())?;
    let chat = serde_json::from_str::<ChatSession>(&content).map_err(|e| e.to_string())?;
    Ok(chat)
}

#[tauri::command]
async fn save_chat(handle: AppHandle, mut chat: ChatSession) -> Result<String, String> {
    let app_dir = handle.path().app_data_dir().map_err(|e| format!("Could not resolve app data dir: {}", e))?;
    let chats_dir = app_dir.join("chats");
    
    // Ensure the entire path exists
    if !chats_dir.exists() {
        fs::create_dir_all(&chats_dir).map_err(|e| format!("Failed to create chats directory at {:?}: {}", chats_dir, e))?;
    }

    if chat.id.is_empty() {
        chat.id = Uuid::new_v4().to_string();
        chat.created_at = Utc::now().timestamp_millis();
    }
    chat.updated_at = Utc::now().timestamp_millis();

    let id = chat.id.clone();
    let chat_path = chats_dir.join(format!("{}.json", id));
    
    // Use a simpler approach for now to avoid rename issues on some systems
    let json = serde_json::to_string_pretty(&chat).map_err(|e| e.to_string())?;
    fs::write(&chat_path, json).map_err(|e| format!("Failed to write chat file to {:?}: {}", chat_path, e))?;

    Ok(id)
}

#[tauri::command]
async fn delete_chat(handle: AppHandle, id: String) -> Result<(), String> {
    let app_dir = handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let chat_path = app_dir.join("chats").join(format!("{}.json", id));
    
    if chat_path.exists() {
        fs::remove_file(chat_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// eject_model v2
#[tauri::command]
async fn eject_model(handle: AppHandle, provider: String, model_id: String) -> Result<(), String> {
    let store = handle.get_store("finch_config.json").ok_or("Store not found")?;
    let config_val = store.get("provider_config");
    let config: Option<ProviderConfig> = config_val.and_then(|v| serde_json::from_value(v).ok());

    let client = reqwest::Client::new();

    match provider.as_str() {
        "local_lmstudio" => {
            let endpoint = config.and_then(|c| c.lmstudio_endpoint).ok_or("LM Studio endpoint not configured")?;
            let url = format!("{}/api/v1/models/unload", endpoint.trim_end_matches('/'));
            let resp = client.post(url)
                .header("Content-Type", "application/json")
                .json(&serde_json::json!({ "instance_id": model_id }))
                .send()
                .await
                .map_err(|e| e.to_string())?
                .error_for_status()
                .map_err(|e| e.to_string())?;
            
            Ok(())
        },
        "local_ollama" => {
            let endpoint = config.and_then(|c| c.ollama_endpoint).ok_or("Ollama endpoint not configured")?;
            let url = format!("{}/api/generate", endpoint.trim_end_matches('/'));
            let resp = client.post(url)
                .header("Content-Type", "application/json")
                .json(&serde_json::json!({ "model": model_id, "keep_alive": 0 }))
                .send()
                .await
                .map_err(|e| e.to_string())?
                .error_for_status()
                .map_err(|e| e.to_string())?;

            Ok(())
        },
        _ => Err(format!("Eject not supported for provider: {}", provider))
    }
}

#[tauri::command]
async fn get_model_loaded_status(
    handle: AppHandle,
    provider: String,
    model_id: String
) -> Result<bool, String> {
    println!("[DEBUG] Rust: get_model_loaded_status called for {} / {}", provider, model_id);
    let store = handle.store("finch_config.json").map_err(|e| e.to_string())?;
    let config_val = store.get("provider_config");
    let config: Option<ProviderConfig> = config_val.and_then(|v| serde_json::from_value(v).ok());

    let client = reqwest::Client::new();

    match provider.as_str() {
        "local_ollama" => {
            let endpoint = config.and_then(|c| c.ollama_endpoint).ok_or("Ollama endpoint not configured")?;
            let url = format!("{}/api/ps", endpoint.trim_end_matches('/'));
            let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
            
            // If the endpoint doesn't exist (old Ollama), assume true to avoid breaking UI
            if resp.status() == reqwest::StatusCode::NOT_FOUND {
                return Ok(false);
            }
            
            // For other errors (like 500 or connection issues), follow status
            if !resp.status().is_success() {
                return Err(format!("Ollama error: {}", resp.status()));
            }

            let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            let model_id_base = model_id.split(':').next().unwrap_or(&model_id).to_lowercase();
            
            if let Some(models) = json.get("models").and_then(|m| m.as_array()) {
                for m in models {
                    if let Some(name) = m.get("name").and_then(|n| n.as_str()) {
                        let name_base = name.split(':').next().unwrap_or(name).to_lowercase();
                        if name_base == model_id_base {
                            return Ok(true);
                        }
                    }
                }
            }
            Ok(false)
        },
        "local_lmstudio" => {
            let endpoint = config.and_then(|c| c.lmstudio_endpoint).ok_or("LM Studio endpoint not configured")?;
            let url = format!("{}/api/v0/models", endpoint.trim_end_matches('/'));
            let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
            
            if resp.status() == reqwest::StatusCode::NOT_FOUND {
                return Ok(false);
            }

            if !resp.status().is_success() {
                return Err(format!("LM Studio error: {}", resp.status()));
            }

            let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            let model_id_lower = model_id.to_lowercase();
            
            if let Some(models) = json.get("data").and_then(|m| m.as_array()) {
                for m in models {
                    if let Some(id) = m.get("id").and_then(|i| i.as_str()) {
                        let id_lower = id.to_lowercase();
                        let is_match = id_lower == model_id_lower || id_lower.contains(&model_id_lower) || model_id_lower.contains(&id_lower);
                        
                        if is_match {
                            // Only return true if the model is explicitly LOADED
                            if let Some(state) = m.get("state").and_then(|s| s.as_str()) {
                                if state == "loaded" {
                                    return Ok(true);
                                }
                            }
                        }
                    }
                }
            }
            Ok(false)
        },
        _ => Ok(true)
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ContextIntelligence {
    pub hardware_safe_limit: u32,
    pub model_max: u32,
    pub server_num_ctx: u32,
}

#[tauri::command]
async fn get_context_intelligence(
    handle: AppHandle,
    provider: String,
    model_id: String,
) -> Result<ContextIntelligence, String> {
    let store = handle.store("finch_config.json").map_err(|e| e.to_string())?;
    let config_val = store.get("provider_config");
    let config: Option<ProviderConfig> = config_val.and_then(|v| serde_json::from_value(v).ok());

    let client = reqwest::Client::new();
    let mut sys = System::new_all();
    sys.refresh_all();
    
    let total_memory_gb = sys.total_memory() as f64 / 1024.0 / 1024.0 / 1024.0;

    // Defaults (Optimistic)
    let mut hardware_safe_limit = 8192;
    let mut model_max = 8192;
    let mut server_num_ctx = 8192;

    match provider.as_str() {
        "local_ollama" => {
            let endpoint = config.and_then(|c| c.ollama_endpoint).ok_or("Ollama endpoint not configured")?;
            let url = format!("{}/api/show", endpoint.trim_end_matches('/'));
            
            let resp = client.post(url)
                .json(&serde_json::json!({ "name": model_id }))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if resp.status().is_success() {
                let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
                
                // Parse Architecture Max
                if let Some(model_info) = json.get("model_info").and_then(|m| m.as_object()) {
                    for (key, value) in model_info {
                        if key.ends_with(".context_length") {
                            if let Some(val) = value.as_u64() {
                                model_max = val as u32;
                            }
                        }
                    }
                }

                // Parse Server num_ctx
                if let Some(parameters) = json.get("parameters").and_then(|p| p.as_str()) {
                    for line in parameters.lines() {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if parts.len() >= 2 && parts[0] == "num_ctx" {
                            if let Ok(val) = parts[1].parse::<u32>() {
                                server_num_ctx = val;
                            }
                        }
                    }
                } else {
                    server_num_ctx = 2048; // Ollama default
                }
                
                // Hardware Safe Limit Heuristic
                let mut params_billions = 7.0; // Default
                if let Some(details) = json.get("details").and_then(|d| d.as_object()) {
                    if let Some(parameter_size) = details.get("parameter_size").and_then(|p| p.as_str()) {
                        if let Some(p_val) = parameter_size.trim_end_matches('B').parse::<f64>().ok() {
                            params_billions = p_val;
                        }
                    }
                }

                let quant_factor = 0.7; // Q4_K_M
                let weight_size_gb = (params_billions * 2.0) * quant_factor;
                let remaining_ram = total_memory_gb - weight_size_gb - 2.0;
                
                if remaining_ram > 0.0 {
                    let table_rate = 4096.0;
                    hardware_safe_limit = (remaining_ram * table_rate).floor() as u32;
                } else {
                    hardware_safe_limit = 2048;
                }
            }
        },
        "local_lmstudio" => {
             let endpoint = config.and_then(|c| c.lmstudio_endpoint).ok_or("LM Studio endpoint not configured")?;
             let url = format!("{}/api/v0/models/{}", endpoint.trim_end_matches('/'), model_id);
             
             let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
             
             if resp.status().is_success() {
                 let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
                 if let Some(max_ctx) = json.get("max_context_length").and_then(|m| m.as_u64()) {
                     model_max = max_ctx as u32;
                 }
                 server_num_ctx = model_max;
                 
                 let params_billions = 7.0;
                 let quant_factor = 0.7;
                 let weight_size_gb = (params_billions * 2.0) * quant_factor;
                 let remaining_ram = total_memory_gb - weight_size_gb - 2.0;
                 
                 if remaining_ram > 0.0 {
                     let table_rate = 4096.0;
                     hardware_safe_limit = (remaining_ram * table_rate).floor() as u32;
                 } else {
                     hardware_safe_limit = 2048;
                 }
             }
        },
        _ => {
            model_max = 128000;
            hardware_safe_limit = 128000;
            server_num_ctx = 128000;
        }
    }

    if hardware_safe_limit > model_max {
        hardware_safe_limit = model_max;
    }
    if hardware_safe_limit < 512 { hardware_safe_limit = 512; }
    
    Ok(ContextIntelligence {
        hardware_safe_limit,
        model_max,
        server_num_ctx,
    })
}

#[tauri::command]
async fn start_recording(state: State<'_, AppState>) -> Result<(), String> {
    state.voice_manager.start_recording()
}

#[tauri::command]
async fn stop_recording(handle: AppHandle, state: State<'_, AppState>, model_id: Option<String>) -> Result<(), String> {
    state.voice_manager.stop_recording(handle, model_id)
}

#[tauri::command]
async fn get_transcription_status(state: State<'_, AppState>) -> Result<VoiceStatus, String> {
    Ok(state.voice_manager.get_status())
}

#[tauri::command]
async fn list_audio_devices(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    Ok(state.voice_manager.list_devices())
}

#[tauri::command]
async fn set_audio_device(state: State<'_, AppState>, name: String) -> Result<(), String> {
    state.voice_manager.set_device(name);
    Ok(())
}

#[tauri::command]
async fn download_voice_model(handle: AppHandle, manifest: ModelManifest) -> Result<(), String> {
    download_model(handle, manifest).await
}

#[tauri::command]
async fn list_downloaded_voice_models(handle: AppHandle) -> Result<Vec<String>, String> {
    let app_dir = handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let whisper_dir = app_dir.join("models").join("whisper");
    
    if !whisper_dir.exists() {
        return Ok(vec![]);
    }

    let mut models = Vec::new();
    if let Ok(entries) = fs::read_dir(whisper_dir) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("bin") {
                    if let Some(file_name) = path.file_stem().and_then(|s| s.to_str()) {
                        models.push(file_name.to_string());
                    }
                }
            }
        }
    }

    Ok(models)
}


#[tauri::command]
async fn eval_browser_js(handle: AppHandle, label: String, script: String) -> Result<(), String> {
    if let Some(window) = handle.get_webview_window(&label) {
        window.eval(&script).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err(format!("Window with label '{}' not found", label))
    }
}

#[tauri::command]
async fn reload_browser(handle: AppHandle, label: String) -> Result<(), String> {
    println!("[RUST] [IPC] reload_browser called for label: {}", label);
    if let Some(window) = handle.get_webview_window(&label) {
        window.reload().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err(format!("Window with label '{}' not found", label))
    }
}

#[tauri::command]
async fn debug_get_webview_url(handle: AppHandle, label: String) -> Result<String, String> {
    if let Some(window) = handle.get_webview_window(&label) {
        Ok(window.url().map_err(|e| e.to_string())?.to_string())
    } else {
        Err(format!("Window '{}' not found", label))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]

pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Ensure chats directory exists
            let app_dir = app.path().app_data_dir()?;
            let chats_dir = app_dir.join("chats");
            if !chats_dir.exists() {
                fs::create_dir_all(&chats_dir)?;
            }

            // Ensure backgrounds directory exists
            let bg_dir = app_dir.join("backgrounds");
            if !bg_dir.exists() {
                fs::create_dir_all(&bg_dir)?;
            }

            // Ensure voice models directory exists
            let whisper_dir = app_dir.join("models").join("whisper");
            if !whisper_dir.exists() {
                fs::create_dir_all(&whisper_dir)?;
            }

            // Initialize and load the store
            let store = app.store("finch_config.json")?;
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
            list_gemini_models,
            list_chats,
            load_chat,
            save_chat,
            delete_chat,
            eject_model,
            set_background_image,
            get_model_loaded_status,
            get_hardware_info,
            get_context_intelligence,
            update_search_config,
            start_recording,
            stop_recording,
            get_transcription_status,
            list_audio_devices,
            set_audio_device,
            download_voice_model,
            list_downloaded_voice_models,
            eval_browser_js,
            reload_browser,
            debug_get_webview_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
