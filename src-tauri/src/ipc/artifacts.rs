use serde::{Deserialize, Serialize};
use std::fs;
use tauri::{command, AppHandle, Manager};

#[derive(Debug, Deserialize)]
pub struct SaveArtifactArgs {
    pub session_id: String,
    pub artifact_id: String,
    pub version: u32,
    pub kind: String,
    pub language: Option<String>,
    #[allow(dead_code)]
    pub title: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct SavedArtifactMeta {
    pub path: String,
    pub filename: String,
    pub size_bytes: u64,
    pub written_at: u64,
}

fn ext_for(kind: &str, language: Option<&str>) -> &'static str {
    match kind {
        "react" => "tsx",
        "html" => "html",
        "svg" => "svg",
        "markdown" => "md",
        "code" => match language {
            Some("typescript") | Some("tsx") => "tsx",
            Some("javascript") | Some("jsx") => "jsx",
            Some("python") => "py",
            Some("rust") => "rs",
            Some("go") => "go",
            Some("bash") | Some("sh") => "sh",
            Some("json") => "json",
            Some("yaml") | Some("yml") => "yaml",
            Some("html") => "html",
            Some("css") => "css",
            Some("sql") => "sql",
            Some("lua") => "lua",
            Some("ruby") => "rb",
            Some("java") => "java",
            Some("csharp") | Some("cs") => "cs",
            Some("cpp") | Some("c++") => "cpp",
            Some("c") => "c",
            Some("php") => "php",
            Some("swift") => "swift",
            Some("kotlin") => "kt",
            Some(other) => {
                // Leak the string so it lives long enough as &'static str is needed.
                // In practice language values are a tiny known set; this branch is a safety net.
                let _ = other; // suppress warning
                "txt"
            }
            None => "txt",
        },
        _ => "txt",
    }
}

/// Sanitize an artifact id or session id to a safe directory/file name component.
fn sanitize(s: &str) -> String {
    s.chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect()
}

#[command]
pub async fn save_artifact_version(
    handle: AppHandle,
    args: SaveArtifactArgs,
) -> Result<SavedArtifactMeta, String> {
    let local_data = handle
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Could not resolve app_local_data_dir: {e}"))?;

    let ext = ext_for(&args.kind, args.language.as_deref());
    let safe_session = sanitize(&args.session_id);
    let safe_artifact = sanitize(&args.artifact_id);
    let filename = format!("v{}.{}", args.version, ext);

    let dir = local_data
        .join("artifacts")
        .join(&safe_session)
        .join(&safe_artifact);

    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create artifact dir: {e}"))?;

    let dest = dir.join(&filename);

    // Never overwrite an existing version file.
    if dest.exists() {
        let meta = fs::metadata(&dest).map_err(|e| format!("Failed to stat existing file: {e}"))?;
        return Ok(SavedArtifactMeta {
            path: dest.to_string_lossy().into_owned(),
            filename,
            size_bytes: meta.len(),
            written_at: meta
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs())
                .unwrap_or(0),
        });
    }

    // Atomic write: tmp file then rename.
    let tmp = dir.join(format!(
        ".tmp_v{}_{}.{}",
        args.version,
        std::process::id(),
        ext
    ));
    fs::write(&tmp, &args.content).map_err(|e| format!("Failed to write tmp artifact: {e}"))?;
    fs::rename(&tmp, &dest).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        format!("Failed to rename artifact file: {e}")
    })?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let size = fs::metadata(&dest)
        .map(|m| m.len())
        .unwrap_or(args.content.len() as u64);

    Ok(SavedArtifactMeta {
        path: dest.to_string_lossy().into_owned(),
        filename,
        size_bytes: size,
        written_at: now,
    })
}
