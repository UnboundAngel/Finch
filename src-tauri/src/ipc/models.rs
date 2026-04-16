use tauri::{AppHandle, command};
use crate::types::{ProviderConfig, ContextIntelligence};
use std::env;
use tauri_plugin_store::StoreExt;
use sysinfo::System;

#[command]
pub async fn list_local_models(endpoint: String, provider: String) -> Result<Vec<String>, String> {
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

#[command]
pub async fn list_anthropic_models(handle: AppHandle) -> Result<Vec<String>, String> {
    let store = handle.store("finch_config.json").map_err(|e| e.to_string())?;
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

#[command]
pub async fn list_openai_models(handle: AppHandle) -> Result<Vec<String>, String> {
    let store = handle.store("finch_config.json").map_err(|e| e.to_string())?;
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

#[command]
pub async fn list_gemini_models(handle: AppHandle) -> Result<Vec<String>, String> {
    let store = handle.store("finch_config.json").map_err(|e| e.to_string())?;
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

#[command]
pub async fn eject_model(handle: AppHandle, provider: String, model_id: String) -> Result<(), String> {
    let store = handle.store("finch_config.json").map_err(|e| e.to_string())?;
    let config_val = store.get("provider_config");
    let config: Option<ProviderConfig> = config_val.and_then(|v| serde_json::from_value(v).ok());

    let client = reqwest::Client::new();

    match provider.as_str() {
        "local_lmstudio" => {
            let endpoint = config.and_then(|c| c.lmstudio_endpoint).ok_or("LM Studio endpoint not configured")?;
            let url = format!("{}/api/v1/models/unload", endpoint.trim_end_matches('/'));
            let _resp = client.post(url)
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
            let _resp = client.post(url)
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

#[command]
pub async fn get_model_loaded_status(
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
            
            if resp.status() == reqwest::StatusCode::NOT_FOUND {
                return Ok(false);
            }
            
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

#[command]
pub async fn get_context_intelligence(
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
                
                if let Some(model_info) = json.get("model_info").and_then(|m| m.as_object()) {
                    for (key, value) in model_info {
                        if key.ends_with(".context_length") {
                            if let Some(val) = value.as_u64() {
                                model_max = val as u32;
                            }
                        }
                    }
                }

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
                    server_num_ctx = 2048; 
                }
                
                let mut params_billions = 7.0; 
                if let Some(details) = json.get("details").and_then(|d| d.as_object()) {
                    if let Some(parameter_size) = details.get("parameter_size").and_then(|p| p.as_str()) {
                        if let Some(p_val) = parameter_size.trim_end_matches('B').parse::<f64>().ok() {
                            params_billions = p_val;
                        }
                    }
                }

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
