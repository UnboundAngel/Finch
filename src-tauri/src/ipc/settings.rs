use tauri::{AppHandle, command, Manager};
use crate::types::{ProviderConfig, HardwareInfo};
use crate::ipc::media_import::{pick_and_save_media, CompressProfile};
use tauri_plugin_store::StoreExt;
use std::fs;
use std::path::{Component, PathBuf};
use sysinfo::System;

#[command]
pub async fn set_background_image(handle: AppHandle, _mode: String) -> Result<String, String> {
    pick_and_save_media(
        &handle,
        "backgrounds",
        "Images",
        &["png", "jpg", "jpeg", "gif", "webp"],
        CompressProfile::background(),
    )
}

/// kind: `avatar_static` | `avatar_gif` | `background`
#[command]
pub async fn import_user_media(handle: AppHandle, kind: String) -> Result<String, String> {
    match kind.as_str() {
        "avatar_static" => pick_and_save_media(
            &handle,
            "avatars",
            "Images",
            &["png", "jpg", "jpeg", "webp"],
            CompressProfile::avatar_static(),
        ),
        "avatar_gif" => pick_and_save_media(
            &handle,
            "avatars",
            "GIF",
            &["gif"],
            CompressProfile::avatar_gif(),
        ),
        "background" => pick_and_save_media(
            &handle,
            "backgrounds",
            "Images",
            &["png", "jpg", "jpeg", "gif", "webp"],
            CompressProfile::background(),
        ),
        _ => Err("Invalid import kind".into()),
    }
}

#[command]
pub async fn remove_imported_media(handle: AppHandle, path: String) -> Result<(), String> {
    let app_dir = handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let target = PathBuf::from(&path);
    let target_canon = target
        .canonicalize()
        .map_err(|_| "File not found or inaccessible".to_string())?;
    let app_canon = app_dir
        .canonicalize()
        .map_err(|e| e.to_string())?;
    if !target_canon.starts_with(&app_canon) {
        return Err("Path outside app data directory".into());
    }
    let rel = target_canon
        .strip_prefix(&app_canon)
        .map_err(|_| "Invalid path".to_string())?;
    let ok_dir = match rel.components().next() {
        Some(Component::Normal(s)) => s == "backgrounds" || s == "avatars",
        _ => false,
    };
    if !ok_dir {
        return Err("Only backgrounds and avatars can be removed".into());
    }
    let _ = fs::remove_file(&target_canon);
    Ok(())
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
        if provider_config.tavily_api_key.is_some() {
            provider_config.tavily_api_key = Some("••••••••".to_string());
        }
        if provider_config.brave_api_key.is_some() {
            provider_config.brave_api_key = Some("••••••••".to_string());
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
            if !v.is_null() && v.as_str() != Some("••••••••") {
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
        if let Some(k) = obj.get("tavily_api_key").and_then(|v| v.as_str()) {
            if k != "••••••••" {
                current_config.tavily_api_key = Some(k.to_string());
            }
        }
        if let Some(k) = obj.get("brave_api_key").and_then(|v| v.as_str()) {
            if k != "••••••••" {
                current_config.brave_api_key = Some(k.to_string());
            }
        }
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

#[command]
pub fn get_file_size(path: String) -> Result<u64, String> {
    std::fs::metadata(&path)
        .map(|m| m.len())
        .map_err(|e| e.to_string())
}
