use tauri::{AppHandle, command};
use crate::session::{ChatSession, list_chats as list_chats_fn, load_chat as load_chat_fn, save_chat as save_chat_fn, delete_chat as delete_chat_fn};

#[command]
pub async fn list_chats(
    handle: AppHandle,
    profile_id: String,
    legacy_inbox_owner_profile_id: Option<String>,
) -> Result<Vec<ChatSession>, String> {
    list_chats_fn(handle, profile_id, legacy_inbox_owner_profile_id).await
}

#[command]
pub async fn load_chat(handle: AppHandle, id: String) -> Result<ChatSession, String> {
    load_chat_fn(handle, id).await
}

#[command]
pub async fn save_chat(handle: AppHandle, chat: ChatSession) -> Result<String, String> {
    save_chat_fn(handle, chat).await
}

#[command]
pub async fn delete_chat(handle: AppHandle, id: String) -> Result<(), String> {
    delete_chat_fn(handle, id).await
}
