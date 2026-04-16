use tauri::{AppHandle, command, Manager};
use crate::types::{ProviderConfig, HardwareInfo};
use tauri_plugin_store::StoreExt;
use std::fs;
use sysinfo::System;

#[command]
pub async fn set_background_image(handle: AppHandle, mode: String) -> Result<String, String> {
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
    
    fs::copy(&file_path, &dest_path).map_err(|e| e.to_string())?;

    let dest_path_str = dest_path.to_string_lossy().to_string();

    Ok(dest_path_str)
}

#[command]
pub async fn get_provider_config(handle: AppHandle) -> Result<Option<ProviderConfig>, String> {
    let store = handle.store("finch_config.json").map_err(|e| e.to_string())?;
    let config = store.get("provider_config");
    
    if let Some(val) = config {
        let mut provider_config: ProviderConfig = serde_json::from_value(val).map_err(|e| e.to_string())?;
        
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

#[command]
pub async fn save_provider_config(handle: AppHandle, config: ProviderConfig) -> Result<(), String> {
    let store = handle.store("finch_config.json").map_err(|e| e.to_string())?;
    
    let mut current_config_val = store.get("provider_config").unwrap_or(serde_json::json!({}));
    let new_config_val = serde_json::to_value(config).map_err(|e| e.to_string())?;

    if let (Some(current_obj), Some(new_obj)) = (current_config_val.as_object_mut(), new_config_val.as_object()) {
        for (k, v) in new_obj {
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

#[command]
pub async fn update_search_config(handle: AppHandle, config: serde_json::Value) -> Result<(), String> {
    let store = handle.store("finch_config.json").map_err(|e| e.to_string())?;
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

#[command]
pub async fn get_hardware_info() -> Result<HardwareInfo, String> {
    let mut sys = System::new_all();
    sys.refresh_all();

    Ok(HardwareInfo {
        total_memory_gb: sys.total_memory() as f64 / 1024.0 / 1024.0 / 1024.0,
        available_memory_gb: sys.available_memory() as f64 / 1024.0 / 1024.0 / 1024.0,
        cpu_count: sys.cpus().len(),
        os_name: System::name().unwrap_or_else(|| "Unknown".to_string()),
    })
}
