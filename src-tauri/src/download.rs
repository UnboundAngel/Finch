use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use tauri::{AppHandle, Emitter, Manager, Runtime};
use tokio::io::AsyncWriteExt;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelManifest {
    pub id: String,
    pub url: String,
    pub name: String,
    pub sha256: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct DownloadProgress {
    pub id: String,
    pub progress: f64,
    pub total_bytes: u64,
    pub current_bytes: u64,
}

pub async fn download_model<R: Runtime>(
    app_handle: AppHandle<R>,
    manifest: ModelManifest,
) -> Result<(), String> {
    // Resolve paths
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let whisper_dir = app_dir.join("models").join("whisper");

    if !whisper_dir.exists() {
        fs::create_dir_all(&whisper_dir).map_err(|e| e.to_string())?;
    }

    let final_path = whisper_dir.join(format!("{}.bin", manifest.id));
    let tmp_path = whisper_dir.join(format!("{}.bin.tmp", manifest.id));

    // Start download
    let client = reqwest::Client::new();
    let response = client
        .get(&manifest.url)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let total_size = response
        .content_length()
        .ok_or("Failed to get content length")?;

    let mut file = tokio::fs::File::create(&tmp_path)
        .await
        .map_err(|e| e.to_string())?;
    let mut stream = response.bytes_stream();

    let mut downloaded: u64 = 0;
    let mut last_emit = std::time::Instant::now();

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| e.to_string())?;
        file.write_all(&chunk).await.map_err(|e| e.to_string())?;

        downloaded += chunk.len() as u64;

        // Throttle progress events (approx 4 per second)
        if last_emit.elapsed().as_millis() > 250 || downloaded == total_size {
            let progress = (downloaded as f64 / total_size as f64) * 100.0;
            app_handle
                .emit(
                    "download-progress",
                    DownloadProgress {
                        id: manifest.id.clone(),
                        progress,
                        total_bytes: total_size,
                        current_bytes: downloaded,
                    },
                )
                .map_err(|e: tauri::Error| e.to_string())?;
            last_emit = std::time::Instant::now();
        }
    }

    file.flush().await.map_err(|e| e.to_string())?;
    drop(file);

    // Validate SHA256 before committing the file
    if !manifest.sha256.is_empty() {
        let tmp_bytes = tokio::fs::read(&tmp_path)
            .await
            .map_err(|e| e.to_string())?;
        let actual_hex = hex::encode(Sha256::digest(&tmp_bytes));
        if actual_hex != manifest.sha256.to_lowercase() {
            tokio::fs::remove_file(&tmp_path).await.ok();
            return Err(format!(
                "Checksum mismatch for {}: expected {}, got {}",
                manifest.id, manifest.sha256, actual_hex
            ));
        }
    }

    // Atomic rename
    tokio::fs::rename(tmp_path, final_path)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
