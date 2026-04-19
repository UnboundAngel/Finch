use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use std::fs;
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatSession {
    pub id: String,
    pub title: String,
    pub messages: Vec<serde_json::Value>,
    pub model: Option<String>,
    pub provider: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub timestamp: Option<i64>, // Added to match Dashboard.tsx usage
    pub pinned: Option<bool>,
    pub incognito: Option<bool>,
    #[serde(rename = "systemPrompt")]
    pub system_prompt: Option<String>,
    #[serde(rename = "generationParams")]
    pub generation_params: Option<serde_json::Value>,
    pub stats: Option<serde_json::Value>,
    /// Finch profile that owns this chat. Missing on older files — listed only for `legacy_inbox_owner_profile_id`.
    #[serde(rename = "profileId", default)]
    pub profile_id: Option<String>,
}

pub async fn list_chats(
    handle: AppHandle,
    profile_id: String,
    legacy_inbox_owner_profile_id: Option<String>,
) -> Result<Vec<ChatSession>, String> {
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

    chats.retain(|chat| match &chat.profile_id {
        Some(pid) => pid == &profile_id,
        None => legacy_inbox_owner_profile_id.as_deref() == Some(profile_id.as_str()),
    });

    chats.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(chats)
}

pub async fn load_chat(handle: AppHandle, id: String) -> Result<ChatSession, String> {
    let app_dir = handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let chat_path = app_dir.join("chats").join(format!("{}.json", id));
    
    if !chat_path.exists() {
        return Err("Chat not found".to_string());
    }

    let content = fs::read_to_string(chat_path).map_err(|e| e.to_string())?;
    let chat = serde_json::from_str::<ChatSession>(&content).map_err(|e| e.to_string())?;
    Ok(chat)
}

pub async fn save_chat(handle: AppHandle, mut chat: ChatSession) -> Result<String, String> {
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
    
    let json = serde_json::to_string_pretty(&chat).map_err(|e| e.to_string())?;
    fs::write(&chat_path, json).map_err(|e| format!("Failed to write chat file to {:?}: {}", chat_path, e))?;

    Ok(id)
}

pub async fn delete_chat(handle: AppHandle, id: String) -> Result<(), String> {
    let app_dir = handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let chat_path = app_dir.join("chats").join(format!("{}.json", id));
    
    if chat_path.exists() {
        fs::remove_file(chat_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
