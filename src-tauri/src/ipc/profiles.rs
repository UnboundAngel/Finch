use tauri::{AppHandle, command};
use tauri_plugin_store::StoreExt;
use serde_json::{Value, json};

#[command]
pub async fn get_profiles(handle: AppHandle) -> Result<Vec<Value>, String> {
    let store = handle.store("finch_profiles.json").map_err(|e| e.to_string())?;
    let profiles = store.get("profiles").unwrap_or(json!([]));
    
    Ok(profiles.as_array().cloned().unwrap_or_default())
}

#[command]
pub async fn save_profile(handle: AppHandle, profile: Value) -> Result<(), String> {
    let store = handle.store("finch_profiles.json").map_err(|e| e.to_string())?;
    let profiles_val = store.get("profiles").unwrap_or(json!([]));
    let mut profiles = profiles_val.as_array().ok_or("Invalid profiles format")?.to_vec();

    let profile_id = profile["id"].as_str().ok_or("Profile missing id")?;
    
    // Check if profile exists and update, or push new
    if let Some(pos) = profiles.iter().position(|p| p["id"] == profile_id) {
        profiles[pos] = profile;
    } else {
        profiles.push(profile);
    }

    store.set("profiles", json!(profiles));
    store.save().map_err(|e| e.to_string())?;
    
    Ok(())
}

#[command]
pub async fn delete_profile(handle: AppHandle, profile_id: String) -> Result<(), String> {
    let store = handle.store("finch_profiles.json").map_err(|e| e.to_string())?;
    let profiles_val = store.get("profiles").unwrap_or(json!([]));
    let mut profiles = profiles_val.as_array().ok_or("Invalid profiles format")?.to_vec();

    profiles.retain(|p| p["id"] != profile_id);

    store.set("profiles", json!(profiles));
    store.save().map_err(|e| e.to_string())?;
    
    Ok(())
}
