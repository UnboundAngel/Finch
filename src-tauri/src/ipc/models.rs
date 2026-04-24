use crate::types::{ContextIntelligence, ProviderConfig};
use serde_json::Value;
use std::env;
use sysinfo::System;
use tauri::{command, AppHandle};
use tauri_plugin_store::StoreExt;

fn normalize_model_base(model_id: &str) -> &str {
    model_id.split(':').next().unwrap_or(model_id)
}

fn lmstudio_loaded_instance_ids(models_json: &Value, model_id: &str) -> Vec<String> {
    let requested_base = normalize_model_base(model_id).to_lowercase();
    let requested_full = model_id.to_lowercase();
    let mut matches: Vec<String> = Vec::new();

    if let Some(models) = models_json.get("data").and_then(|m| m.as_array()) {
        for entry in models {
            let Some(state) = entry.get("state").and_then(|s| s.as_str()) else {
                continue;
            };
            if state != "loaded" {
                continue;
            }

            let Some(id) = entry.get("id").and_then(|i| i.as_str()) else {
                continue;
            };
            let id_lower = id.to_lowercase();
            let id_base = normalize_model_base(id).to_lowercase();
            if id_lower == requested_full || id_base == requested_base {
                matches.push(id.to_string());
            }
        }
    }

    matches
}

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
    let store = handle
        .store("finch_config.json")
        .map_err(|e| e.to_string())?;
    let config_val = store.get("provider_config");
    let config: Option<ProviderConfig> = config_val.and_then(|v| serde_json::from_value(v).ok());

    let api_key = match config.and_then(|c| c.anthropic_api_key) {
        Some(k) if k != "••••••••" => k,
        _ => match env::var("ANTHROPIC_API_KEY") {
            Ok(k) => k,
            Err(_) => return Ok(vec![]),
        },
    };

    let client = reqwest::Client::new();
    let resp = client
        .get("https://api.anthropic.com/v1/models")
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
    let store = handle
        .store("finch_config.json")
        .map_err(|e| e.to_string())?;
    let config_val = store.get("provider_config");
    let config: Option<ProviderConfig> = config_val.and_then(|v| serde_json::from_value(v).ok());

    let api_key = match config.and_then(|c| c.openai_api_key) {
        Some(k) if k != "••••••••" => Some(k),
        _ => None,
    }
    .or_else(|| env::var("OPENAI_API_KEY").ok());

    let Some(api_key) = api_key else {
        return Ok(vec![]);
    };

    let client = reqwest::Client::new();
    let resp = client
        .get("https://api.openai.com/v1/models")
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await;

    match resp {
        Ok(r) => {
            let json: serde_json::Value = r.json().await.unwrap_or_default();
            let mut models = Vec::new();
            if let Some(data) = json.get("data").and_then(|d| d.as_array()) {
                for item in data {
                    let owned_by = item
                        .get("owned_by")
                        .and_then(|o| o.as_str())
                        .unwrap_or_default();
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
    let store = handle
        .store("finch_config.json")
        .map_err(|e| e.to_string())?;
    let config_val = store.get("provider_config");
    let config: Option<ProviderConfig> = config_val.and_then(|v| serde_json::from_value(v).ok());

    let api_key = match config.and_then(|c| c.gemini_api_key) {
        Some(k) if k != "••••••••" => k,
        _ => return Ok(vec![]),
    };

    let client = reqwest::Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models?key={}",
        api_key
    );
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
pub async fn eject_model(
    handle: AppHandle,
    provider: String,
    model_id: String,
) -> Result<(), String> {
    let store = handle
        .store("finch_config.json")
        .map_err(|e| e.to_string())?;
    let config_val = store.get("provider_config");
    let config: Option<ProviderConfig> = config_val.and_then(|v| serde_json::from_value(v).ok());

    let client = reqwest::Client::new();

    match provider.as_str() {
        "local_lmstudio" => {
            let endpoint = config
                .and_then(|c| c.lmstudio_endpoint)
                .ok_or("LM Studio endpoint not configured")?;
            let base = endpoint.trim_end_matches('/');
            let list_url = format!("{}/api/v0/models", base);
            let unload_url = format!("{}/api/v1/models/unload", base);

            let list_resp = client
                .get(list_url)
                .send()
                .await
                .map_err(|e| e.to_string())?
                .error_for_status()
                .map_err(|e| e.to_string())?;
            let models_json: Value = list_resp.json().await.map_err(|e| e.to_string())?;
            let instance_ids = lmstudio_loaded_instance_ids(&models_json, &model_id);

            if instance_ids.is_empty() {
                // Fallback for older behavior where caller already passes a concrete instance ID.
                // We swallow errors here (like 404 if the model isn't loaded) to prevent auto-eject from logging failures.
                let _ = client
                    .post(unload_url)
                    .header("Content-Type", "application/json")
                    .json(&serde_json::json!({ "instance_id": model_id }))
                    .send()
                    .await;
                return Ok(());
            }

            for instance_id in instance_ids {
                client
                    .post(&unload_url)
                    .header("Content-Type", "application/json")
                    .json(&serde_json::json!({ "instance_id": instance_id }))
                    .send()
                    .await
                    .map_err(|e| e.to_string())?
                    .error_for_status()
                    .map_err(|e| e.to_string())?;
            }

            Ok(())
        }
        "local_ollama" => {
            let endpoint = config
                .and_then(|c| c.ollama_endpoint)
                .ok_or("Ollama endpoint not configured")?;
            let url = format!("{}/api/generate", endpoint.trim_end_matches('/'));
            let _resp = client
                .post(url)
                .header("Content-Type", "application/json")
                .json(&serde_json::json!({ "model": model_id, "keep_alive": 0 }))
                .send()
                .await
                .map_err(|e| e.to_string())?
                .error_for_status()
                .map_err(|e| e.to_string())?;

            Ok(())
        }
        _ => Err(format!("Eject not supported for provider: {}", provider)),
    }
}

/// Fire-and-forget preload: tells the local server to load the model into memory.
/// Returns Ok(()) regardless of outcome — callers should not block on this.
#[command]
pub async fn preload_model(
    handle: AppHandle,
    provider: String,
    model_id: String,
) -> Result<(), String> {
    // #region agent log
    {
        use std::io::Write;
        if let Ok(mut f) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open("debug-69f910.log")
        {
            let _ = writeln!(f, "{{\"sessionId\":\"69f910\",\"hypothesisId\":\"H3\",\"location\":\"models.rs:preload_model\",\"message\":\"preload_model entered\",\"data\":{{\"provider\":\"{}\",\"model_id\":\"{}\"}},\"timestamp\":0}}", provider, model_id);
        }
    }
    // #endregion

    let store = handle
        .store("finch_config.json")
        .map_err(|e| e.to_string())?;
    let config_val = store.get("provider_config");
    let config: Option<ProviderConfig> = config_val.and_then(|v| serde_json::from_value(v).ok());

    // #region agent log
    {
        use std::io::Write;
        let has_config = config.is_some();
        let endpoint_check = match provider.as_str() {
            "local_lmstudio" => config
                .as_ref()
                .and_then(|c| c.lmstudio_endpoint.as_deref().map(|s| s.to_string()))
                .unwrap_or_else(|| "MISSING".to_string()),
            "local_ollama" => config
                .as_ref()
                .and_then(|c| c.ollama_endpoint.as_deref().map(|s| s.to_string()))
                .unwrap_or_else(|| "MISSING".to_string()),
            _ => "n/a".to_string(),
        };
        if let Ok(mut f) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open("debug-69f910.log")
        {
            let _ = writeln!(f, "{{\"sessionId\":\"69f910\",\"hypothesisId\":\"H3\",\"location\":\"models.rs:preload_model\",\"message\":\"config read\",\"data\":{{\"has_config\":{},\"endpoint\":\"{}\"}},\"timestamp\":0}}", has_config, endpoint_check);
        }
    }
    // #endregion

    // Long timeout: large models can take several minutes to load.
    let client = reqwest::ClientBuilder::new()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .unwrap_or_default();

    match provider.as_str() {
        "local_ollama" => {
            let endpoint = config
                .and_then(|c| c.ollama_endpoint)
                .ok_or("Ollama endpoint not configured")?;
            let url = format!("{}/api/generate", endpoint.trim_end_matches('/'));
            // Include an empty prompt to satisfy Ollama's generate contract while still
            // warming the model in memory without producing user-visible output.
            client
                .post(url)
                .json(&serde_json::json!({
                    "model": model_id,
                    "prompt": "",
                    "stream": false,
                    "keep_alive": "5m"
                }))
                .send()
                .await
                .map_err(|e| e.to_string())?
                .error_for_status()
                .map_err(|e| e.to_string())?;
            Ok(())
        }
        "local_lmstudio" => {
            let endpoint = config
                .and_then(|c| c.lmstudio_endpoint)
                .ok_or("LM Studio endpoint not configured")?;
            // Use LM Studio's explicit model load endpoint so selecting a model
            // preloads it immediately (before the user sends a message).
            let url = format!("{}/api/v1/models/load", endpoint.trim_end_matches('/'));
            // #region agent log
            {
                use std::io::Write;
                if let Ok(mut f) = std::fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open("debug-69f910.log")
                {
                    let _ = writeln!(f, "{{\"sessionId\":\"69f910\",\"hypothesisId\":\"H4\",\"location\":\"models.rs:preload_model\",\"message\":\"about to POST load\",\"data\":{{\"url\":\"{}\",\"model_id\":\"{}\"}},\"timestamp\":0}}", url, model_id);
                }
            }
            // #endregion
            let resp = client
                .post(url)
                .json(&serde_json::json!({
                    "model": model_id
                }))
                .send()
                .await
                .map_err(|e| e.to_string())?;
            let status = resp.status();
            // #region agent log
            {
                use std::io::Write;
                if let Ok(mut f) = std::fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open("debug-69f910.log")
                {
                    let _ = writeln!(f, "{{\"sessionId\":\"69f910\",\"hypothesisId\":\"H4\",\"location\":\"models.rs:preload_model\",\"message\":\"POST load response\",\"data\":{{\"status\":{}}},\"timestamp\":0}}", status.as_u16());
                }
            }
            // #endregion
            resp.error_for_status().map_err(|e| e.to_string())?;
            Ok(())
        }
        _ => Ok(()),
    }
}

#[command]
pub async fn get_model_loaded_status(
    handle: AppHandle,
    provider: String,
    model_id: String,
) -> Result<bool, String> {
    let store = handle
        .store("finch_config.json")
        .map_err(|e| e.to_string())?;
    let config_val = store.get("provider_config");
    let config: Option<ProviderConfig> = config_val.and_then(|v| serde_json::from_value(v).ok());

    let client = reqwest::Client::new();

    match provider.as_str() {
        "local_ollama" => {
            let endpoint = config
                .and_then(|c| c.ollama_endpoint)
                .ok_or("Ollama endpoint not configured")?;
            let url = format!("{}/api/ps", endpoint.trim_end_matches('/'));
            let resp = client.get(url).send().await.map_err(|e| e.to_string())?;

            if resp.status() == reqwest::StatusCode::NOT_FOUND {
                return Ok(false);
            }

            if !resp.status().is_success() {
                return Err(format!("Ollama error: {}", resp.status()));
            }

            let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            let model_id_base = model_id
                .split(':')
                .next()
                .unwrap_or(&model_id)
                .to_lowercase();

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
        }
        "local_lmstudio" => {
            let endpoint = config
                .and_then(|c| c.lmstudio_endpoint)
                .ok_or("LM Studio endpoint not configured")?;
            let url = format!("{}/api/v0/models", endpoint.trim_end_matches('/'));
            let resp = client.get(url).send().await.map_err(|e| e.to_string())?;

            if resp.status() == reqwest::StatusCode::NOT_FOUND {
                return Ok(false);
            }

            if !resp.status().is_success() {
                return Err(format!("LM Studio error: {}", resp.status()));
            }

            let json: Value = resp.json().await.map_err(|e| e.to_string())?;
            Ok(!lmstudio_loaded_instance_ids(&json, &model_id).is_empty())
        }
        _ => Ok(true),
    }
}

#[cfg(test)]
mod tests {
    use super::lmstudio_loaded_instance_ids;
    use serde_json::json;

    #[test]
    fn matches_loaded_instances_by_base_model_id() {
        let payload = json!({
            "data": [
                { "id": "llama-3.2-3b-instruct:2", "state": "loaded" },
                { "id": "llama-3.2-3b-instruct:3", "state": "loaded" },
                { "id": "qwen/qwen3.5-9b", "state": "not-loaded" }
            ]
        });

        let result = lmstudio_loaded_instance_ids(&payload, "llama-3.2-3b-instruct");
        assert_eq!(
            result,
            vec![
                "llama-3.2-3b-instruct:2".to_string(),
                "llama-3.2-3b-instruct:3".to_string()
            ]
        );
    }

    #[test]
    fn ignores_not_loaded_instances() {
        let payload = json!({
            "data": [
                { "id": "llama-3.2-3b-instruct:2", "state": "not-loaded" },
                { "id": "llama-3.2-3b-instruct:3", "state": "loaded" }
            ]
        });

        let result = lmstudio_loaded_instance_ids(&payload, "llama-3.2-3b-instruct");
        assert_eq!(result, vec!["llama-3.2-3b-instruct:3".to_string()]);
    }
}

#[command]
pub async fn get_context_intelligence(
    handle: AppHandle,
    provider: String,
    model_id: String,
) -> Result<ContextIntelligence, String> {
    let store = handle
        .store("finch_config.json")
        .map_err(|e| e.to_string())?;
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
            let endpoint = config
                .and_then(|c| c.ollama_endpoint)
                .ok_or("Ollama endpoint not configured")?;
            let url = format!("{}/api/show", endpoint.trim_end_matches('/'));

            let resp = client
                .post(url)
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
                    if let Some(parameter_size) =
                        details.get("parameter_size").and_then(|p| p.as_str())
                    {
                        if let Some(p_val) =
                            parameter_size.trim_end_matches('B').parse::<f64>().ok()
                        {
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
        }
        "local_lmstudio" => {
            let endpoint = config
                .and_then(|c| c.lmstudio_endpoint)
                .ok_or("LM Studio endpoint not configured")?;
            let url = format!(
                "{}/api/v0/models/{}",
                endpoint.trim_end_matches('/'),
                model_id
            );

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
        }
        "anthropic" => {
            model_max = 200_000;
            hardware_safe_limit = 200_000;
            server_num_ctx = 200_000;
        }
        "gemini" => {
            let ctx = if model_id.contains("gemini-2.5") || model_id.contains("gemini-1.5") {
                1_000_000
            } else {
                32_768
            };
            model_max = ctx;
            hardware_safe_limit = ctx;
            server_num_ctx = ctx;
        }
        "openai" => {
            let ctx = if model_id.contains("gpt-4o")
                || model_id.starts_with("o1")
                || model_id.starts_with("o3")
                || model_id.starts_with("o4")
                || model_id.contains("gpt-4-turbo")
            {
                128_000
            } else if model_id.contains("gpt-4") {
                8_192
            } else if model_id.contains("gpt-3.5") {
                16_385
            } else {
                128_000
            };
            model_max = ctx;
            hardware_safe_limit = ctx;
            server_num_ctx = ctx;
        }
        _ => {
            model_max = 128_000;
            hardware_safe_limit = 128_000;
            server_num_ctx = 128_000;
        }
    }

    if hardware_safe_limit > model_max {
        hardware_safe_limit = model_max;
    }
    if hardware_safe_limit < 512 {
        hardware_safe_limit = 512;
    }

    Ok(ContextIntelligence {
        hardware_safe_limit,
        model_max,
        server_num_ctx,
    })
}
