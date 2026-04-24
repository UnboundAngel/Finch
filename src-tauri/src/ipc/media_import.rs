//! Resize + re-encode imported cosmetic media (avatars, wallpapers) to keep app data small.
//!
//! Avatars and wallpapers use different [`CompressProfile`] values: wallpapers are full-bleed,
//! often sourced from huge photos, and animated GIFs are especially heavy — so they get their
//! own caps (dimensions, JPEG quality, GIF frame budget).

use std::fs::{self, File};
use std::io::{BufWriter, Cursor};
use std::path::{Path, PathBuf};

use image::codecs::gif::{GifDecoder, GifEncoder, Repeat};
use image::codecs::jpeg::JpegEncoder;
use image::codecs::webp::WebPEncoder;
use image::metadata::LoopCount;
use image::{AnimationDecoder, ExtendedColorType, ImageEncoder};
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;
use uuid::Uuid;

#[derive(Clone, Copy)]
pub struct CompressProfile {
    pub max_static_edge: u32,
    pub max_gif_edge: u32,
    pub jpeg_quality: u8,
    /// Animated GIFs above this fall back to a raw copy (wallpapers use a lower budget).
    pub max_gif_frames: usize,
}

impl CompressProfile {
    pub const fn avatar_static() -> Self {
        Self {
            max_static_edge: 384,
            max_gif_edge: 0,
            jpeg_quality: 78,
            max_gif_frames: 120,
        }
    }

    pub const fn avatar_gif() -> Self {
        Self {
            max_static_edge: 0,
            max_gif_edge: 360,
            jpeg_quality: 78,
            max_gif_frames: 120,
        }
    }

    /// Full-screen decorative: larger max dimension than avatars, but stronger JPEG and tighter
    /// GIF limits so app data does not balloon next to tiny avatar files.
    pub const fn background() -> Self {
        Self {
            max_static_edge: 1600,
            max_gif_edge: 640,
            jpeg_quality: 72,
            max_gif_frames: 64,
        }
    }
}

fn loop_count_to_repeat(lc: LoopCount) -> Repeat {
    match lc {
        LoopCount::Infinite => Repeat::Infinite,
        LoopCount::Finite(n) => Repeat::Finite(n.get().min(u16::MAX as u32) as u16),
    }
}

fn compress_gif(src: &Path, dest: &Path, max_edge: u32, max_frames: usize) -> Result<(), String> {
    let bytes = fs::read(src).map_err(|e| e.to_string())?;
    let cursor = Cursor::new(bytes);
    let decoder = GifDecoder::new(cursor).map_err(|e| e.to_string())?;
    let repeat = loop_count_to_repeat(decoder.loop_count());
    let frames = decoder
        .into_frames()
        .collect_frames()
        .map_err(|e| e.to_string())?;

    if frames.is_empty() {
        return Err("empty gif".into());
    }
    if frames.len() > max_frames {
        return Err("too many gif frames".into());
    }

    let resized: Vec<image::Frame> = frames
        .into_iter()
        .map(|f| {
            let delay = f.delay();
            let buf = f.into_buffer();
            let thumb = image::imageops::thumbnail(&buf, max_edge, max_edge);
            image::Frame::from_parts(thumb, 0, 0, delay)
        })
        .collect();

    let file = File::create(dest).map_err(|e| e.to_string())?;
    let mut enc = GifEncoder::new_with_speed(file, 20);
    enc.set_repeat(repeat).map_err(|e| e.to_string())?;
    enc.encode_frames(resized).map_err(|e| e.to_string())?;
    Ok(())
}

fn compress_static(
    src: &Path,
    dir: &Path,
    id: Uuid,
    profile: CompressProfile,
) -> Result<PathBuf, String> {
    let img = image::open(src).map_err(|e| e.to_string())?;
    let img = img.thumbnail(profile.max_static_edge, profile.max_static_edge);

    if img.color().has_alpha() {
        let path = dir.join(format!("{id}.webp"));
        let rgba = img.to_rgba8();
        let mut f = BufWriter::new(File::create(&path).map_err(|e| e.to_string())?);
        WebPEncoder::new_lossless(&mut f)
            .write_image(
                rgba.as_raw(),
                rgba.width(),
                rgba.height(),
                ExtendedColorType::Rgba8,
            )
            .map_err(|e| e.to_string())?;
        Ok(path)
    } else {
        let path = dir.join(format!("{id}.jpg"));
        let rgb = img.to_rgb8();
        let mut f = BufWriter::new(File::create(&path).map_err(|e| e.to_string())?);
        JpegEncoder::new_with_quality(&mut f, profile.jpeg_quality)
            .write_image(
                rgb.as_raw(),
                rgb.width(),
                rgb.height(),
                ExtendedColorType::Rgb8,
            )
            .map_err(|e| e.to_string())?;
        Ok(path)
    }
}

fn fallback_copy(src: &Path, dir: &Path, id: Uuid) -> Result<PathBuf, String> {
    let ext = src.extension().and_then(|s| s.to_str()).unwrap_or("bin");
    let dest = dir.join(format!("{id}.{ext}"));
    fs::copy(src, &dest).map_err(|e| e.to_string())?;
    Ok(dest)
}

/// Process a given file path and compress into `subdir` under app data (or copy on failure).
pub fn process_and_save_media(
    handle: &AppHandle,
    file_path: &Path,
    subdir: &str,
    profile: CompressProfile,
) -> Result<String, String> {
    // Pre-read metadata check to prevent memory exhaustion on massive files
    let meta =
        fs::metadata(file_path).map_err(|e| format!("Failed to read file metadata: {}", e))?;
    if meta.len() > 50 * 1024 * 1024 {
        return Err("File is too large. Maximum allowed size for media import is 50 MB.".into());
    }

    let app_dir = handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let dir = app_dir.join(subdir);
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }

    let id = Uuid::new_v4();
    let ext = file_path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    let is_gif = ext == "gif";

    let dest = if is_gif {
        let dest = dir.join(format!("{id}.gif"));
        match compress_gif(
            file_path,
            &dest,
            profile.max_gif_edge,
            profile.max_gif_frames,
        ) {
            Ok(()) => dest,
            Err(_) => fallback_copy(file_path, &dir, id)?,
        }
    } else {
        match compress_static(file_path, &dir, id, profile) {
            Ok(p) => p,
            Err(_) => fallback_copy(file_path, &dir, id)?,
        }
    };

    Ok(dest.to_string_lossy().into_owned())
}

/// Pick a file from the dialog, then compress into `subdir` under app data (or copy on failure).
pub fn pick_and_save_media(
    handle: &AppHandle,
    subdir: &str,
    filter_label: &str,
    extensions: &[&str],
    profile: CompressProfile,
) -> Result<String, String> {
    let file_path_enum = handle
        .dialog()
        .file()
        .add_filter(filter_label, extensions)
        .blocking_pick_file()
        .ok_or_else(|| "No file selected".to_string())?;

    let file_path = match file_path_enum {
        tauri_plugin_dialog::FilePath::Path(p) => p,
        _ => return Err("Selected item is not a local file".into()),
    };

    process_and_save_media(handle, &file_path, subdir, profile)
}
