use tauri::{AppHandle, command, State, Manager};
use crate::types::AppState;
use crate::voice::VoiceStatus;
use crate::download::{ModelManifest, download_model};
use std::fs;

#[command]
pub async fn start_recording(handle: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    state.voice_manager.start_recording(handle)
}

#[command]
pub async fn stop_recording(handle: AppHandle, state: State<'_, AppState>, model_id: Option<String>) -> Result<(), String> {
    state.voice_manager.stop_recording(handle, model_id)
}

#[command]
pub async fn get_transcription_status(state: State<'_, AppState>) -> Result<VoiceStatus, String> {
    Ok(state.voice_manager.get_status())
}

#[command]
pub async fn list_audio_devices(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    Ok(state.voice_manager.list_devices())
}

#[command]
pub async fn set_audio_device(state: State<'_, AppState>, name: String) -> Result<(), String> {
    state.voice_manager.set_device(name);
    Ok(())
}

#[command]
pub async fn download_voice_model(handle: AppHandle, manifest: ModelManifest) -> Result<(), String> {
    download_model(handle, manifest).await
}

#[command]
pub async fn list_downloaded_voice_models(handle: AppHandle) -> Result<Vec<String>, String> {
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
