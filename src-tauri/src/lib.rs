mod search;
mod voice;
mod download;
mod tavily;
mod types;
mod session;
mod providers;
mod config;
mod ipc;

use types::AppState;
use tauri::Manager;
use tauri_plugin_store::StoreExt;
use std::fs;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir()?;
            
            // Ensure required directories exist
            let dirs = [
                app_dir.join("chats"),
                app_dir.join("backgrounds"),
                app_dir.join("models").join("whisper"),
            ];

            for dir in dirs {
                if !dir.exists() {
                    fs::create_dir_all(&dir)?;
                }
            }

            // Initialize store
            let _ = app.get_store("finch_config.json");
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ipc::chat::send_message, 
            ipc::chat::stream_message,
            ipc::chat::abort_generation,
            ipc::settings::save_provider_config,
            ipc::settings::get_provider_config,
            ipc::settings::set_background_image,
            ipc::settings::update_search_config,
            ipc::settings::get_hardware_info,
            ipc::models::list_local_models,
            ipc::models::list_anthropic_models,
            ipc::models::list_openai_models,
            ipc::models::list_gemini_models,
            ipc::models::eject_model,
            ipc::models::get_model_loaded_status,
            ipc::models::get_context_intelligence,
            ipc::sessions::list_chats,
            ipc::sessions::load_chat,
            ipc::sessions::save_chat,
            ipc::sessions::delete_chat,
            ipc::voice::start_recording,
            ipc::voice::stop_recording,
            ipc::voice::get_transcription_status,
            ipc::voice::list_audio_devices,
            ipc::voice::set_audio_device,
            ipc::voice::download_voice_model,
            ipc::voice::list_downloaded_voice_models
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
