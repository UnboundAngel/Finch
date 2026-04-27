use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, Runtime};
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

#[derive(Debug, serde::Serialize, Clone)]
#[serde(tag = "status", content = "data")]
pub enum VoiceStatus {
    Idle,
    Recording,
    Transcribing,
    Completed(String),
    Error(String),
}

pub struct VoiceManager {
    pub status: Arc<Mutex<VoiceStatus>>,
    pub buffer: Arc<Mutex<Vec<f32>>>,
    pub context: Arc<Mutex<Option<WhisperContext>>>,
    pub selected_device: Arc<Mutex<Option<String>>>,
    /// Latest normalized input level (0–1) for the UI, written from the audio callback.
    meter_level_bits: Arc<AtomicU32>,
    stream: Arc<Mutex<Option<cpal::Stream>>>,
}

impl VoiceManager {
    pub fn new() -> Self {
        Self {
            status: Arc::new(Mutex::new(VoiceStatus::Idle)),
            buffer: Arc::new(Mutex::new(Vec::new())),
            context: Arc::new(Mutex::new(None)),
            selected_device: Arc::new(Mutex::new(None)),
            meter_level_bits: Arc::new(AtomicU32::new(0)),
            stream: Arc::new(Mutex::new(None)),
        }
    }

    pub fn list_devices(&self) -> Vec<String> {
        #[cfg(target_os = "windows")]
        {
            // Some Windows environments require COM to be initialized
            // cpal usually handles this but sometimes it needs a nudge in certain thread contexts
            unsafe {
                let _ = windows::Win32::System::Com::CoInitializeEx(
                    None,
                    windows::Win32::System::Com::COINIT_APARTMENTTHREADED,
                );
            }
        }

        let host = cpal::default_host();
        let default_name = host.default_input_device().and_then(|d| d.name().ok());

        match host.input_devices() {
            Ok(devices) => {
                let mut device_names: Vec<String> = devices
                    .map(|d| d.name().unwrap_or_else(|_| "Unknown Device".to_string()))
                    .collect();
                if let Some(default) = default_name {
                    let clean_name = if default.starts_with("Default - ") {
                        default.replace("Default - ", "")
                    } else if default.starts_with("Communications - ") {
                        default.replace("Communications - ", "")
                    } else {
                        default
                    };
                    device_names.insert(0, format!("Default - {}", clean_name));
                }
                let mut deduped: Vec<String> = Vec::new();
                for name in device_names.into_iter() {
                    if !deduped.iter().any(|n| n == &name) {
                        deduped.push(name);
                    }
                }
                let device_names = deduped;
                println!("Detected audio devices: {:?}", device_names);
                device_names
            }
            Err(e) => {
                eprintln!("Failed to list input devices: {}", e);
                Vec::new()
            }
        }
    }

    pub fn set_device(&self, name: String) {
        let mut dev = self.selected_device.lock().unwrap_or_else(|e| e.into_inner());
        *dev = Some(name);
    }

    pub fn get_meter_level(&self) -> f32 {
        f32::from_bits(self.meter_level_bits.load(Ordering::Relaxed))
    }

    pub fn start_preview<R: Runtime>(&self, _app_handle: AppHandle<R>) -> Result<(), String> {
        if self.stream.lock().unwrap_or_else(|e| e.into_inner()).is_some() {
            return Ok(());
        }
        self.start_recording_internal(true)
    }

    pub fn stop_preview(&self) {
        let mut s_lock = self.stream.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(_) = &*s_lock {
            let status = self.status.lock().unwrap_or_else(|e| e.into_inner());
            if matches!(*status, VoiceStatus::Idle) {
                *s_lock = None;
                self.meter_level_bits.store(0, Ordering::Relaxed);
            }
        }
    }

    fn start_recording_internal(&self, is_preview: bool) -> Result<(), String> {
        // On Windows, COM must be initialized on whichever thread calls into WASAPI.
        // Tauri async commands run on a threadpool — each thread needs its own init.
        #[cfg(target_os = "windows")]
        unsafe {
            let _ = windows::Win32::System::Com::CoInitializeEx(
                None,
                windows::Win32::System::Com::COINIT_APARTMENTTHREADED,
            );
        }

        let host = cpal::default_host();

        let device = {
            let selected = self.selected_device.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(name) = &*selected {
                let alias_selected =
                    name.starts_with("Default - ") || name.starts_with("Communications - ");
                if alias_selected {
                    host.default_input_device()
                        .ok_or_else(|| "No default input device found".to_string())?
                } else {
                    host.input_devices()
                        .map_err(|e| e.to_string())?
                        .find(|d| d.name().ok().as_ref() == Some(name))
                        .ok_or_else(|| format!("Device '{}' not found", name))?
                }
            } else {
                host.default_input_device()
                    .ok_or_else(|| "No default input device found".to_string())?
            }
        };

        let config = device.default_input_config().map_err(|e| e.to_string())?;

        let buffer = self.buffer.clone();
        let meter_level_bits = self.meter_level_bits.clone();
        let sample_rate = config.sample_rate().0 as f32;
        let channels = config.channels() as usize;

        if !is_preview {
            let mut b = buffer.lock().unwrap_or_else(|e| e.into_inner());
            b.clear();
        }
        self.meter_level_bits.store(0, Ordering::Relaxed);

        let err_cb = move |err| eprintln!("an error occurred on stream: {}", err);

        let stream = match config.sample_format() {
            cpal::SampleFormat::F32 => device.build_input_stream(
                &config.into(),
                move |data: &[f32], _: &_| {
                    if !data.is_empty() {
                        let sum_sq: f32 = data.iter().map(|&x| x * x).sum();
                        let rms = (sum_sq / data.len() as f32).sqrt();
                        let boosted = rms * 14.0;
                        let normalized_volume = (1.0 - (-boosted).exp()).clamp(0.0, 1.0);
                        meter_level_bits.store(normalized_volume.to_bits(), Ordering::Relaxed);
                    }

                    if !is_preview {
                        let mut b = buffer.lock().unwrap_or_else(|e| e.into_inner());
                        if sample_rate == 16000.0 && channels == 1 {
                            b.extend_from_slice(data);
                        } else {
                            let step = sample_rate / 16000.0;
                            let mut i = 0.0;
                            while (i as usize) < data.len() {
                                let idx = (i as usize) - ((i as usize) % channels);
                                b.push(data[idx]);
                                i += step * (channels as f32);
                            }
                        }
                    }
                },
                err_cb,
                None,
            ),
            _ => return Err("Unsupported sample format. Only F32 is supported for now.".into()),
        }
        .map_err(|e| e.to_string())?;

        stream.play().map_err(|e| e.to_string())?;

        let mut s_lock = self.stream.lock().unwrap_or_else(|e| e.into_inner());
        *s_lock = Some(stream);

        if !is_preview {
            let mut s = self.status.lock().unwrap_or_else(|e| e.into_inner());
            *s = VoiceStatus::Recording;
        }

        Ok(())
    }

    pub fn start_recording<R: Runtime>(&self, _app_handle: AppHandle<R>) -> Result<(), String> {
        self.start_recording_internal(false)
    }

    pub fn stop_recording<R: Runtime>(
        &self,
        app_handle: AppHandle<R>,
        model_id: Option<String>,
    ) -> Result<(), String> {
        // Stop and drop the stream
        {
            let mut s_lock = self.stream.lock().unwrap_or_else(|e| e.into_inner());
            *s_lock = None;
        }
        self.meter_level_bits.store(0, Ordering::Relaxed);

        let status = self.status.clone();
        let buffer = self.buffer.clone();
        let context_lock = self.context.clone();

        {
            let mut s = status.lock().unwrap_or_else(|e| e.into_inner());
            *s = VoiceStatus::Transcribing;
        }

        // Spawn inference task
        tokio::task::spawn_blocking(move || {
            let model_path = if let Some(id) = model_id {
                let app_dir = match app_handle.path().app_data_dir() {
                    Ok(path) => path,
                    Err(e) => {
                        let mut s = status.lock().unwrap_or_else(|e| e.into_inner());
                        *s = VoiceStatus::Error(format!("Failed to get app data directory: {}", e));
                        return;
                    }
                };
                let path = app_dir
                    .join("models")
                    .join("whisper")
                    .join(format!("{}.bin", id));
                if path.exists() {
                    path
                } else {
                    let mut s = status.lock().unwrap_or_else(|e| e.into_inner());
                    *s = VoiceStatus::Error(format!(
                        "Model '{}' not found. Please download it from the marketplace.",
                        id
                    ));
                    return;
                }
            } else {
                let mut s = status.lock().unwrap_or_else(|e| e.into_inner());
                *s = VoiceStatus::Error(
                    "No voice model selected. Please download one from the marketplace."
                        .to_string(),
                );
                return;
            };

            // Lazy load context
            let mut ctx_guard = context_lock.lock().unwrap_or_else(|e| e.into_inner());
            if ctx_guard.is_none() {
                let path_str = match model_path.to_str() {
                    Some(s) => s,
                    None => {
                        let mut s = status.lock().unwrap_or_else(|e| e.into_inner());
                        *s = VoiceStatus::Error("Invalid model path (not UTF-8)".to_string());
                        return;
                    }
                };
                match WhisperContext::new_with_params(
                    path_str,
                    WhisperContextParameters::default(),
                ) {
                    Ok(ctx) => *ctx_guard = Some(ctx),
                    Err(e) => {
                        let mut s = status.lock().unwrap_or_else(|e| e.into_inner());
                        *s = VoiceStatus::Error(format!("Failed to load model: {}", e));
                        return;
                    }
                }
            }

            let ctx = match ctx_guard.as_mut() {
                Some(c) => c,
                None => {
                    let mut s = status.lock().unwrap_or_else(|e| e.into_inner());
                    *s = VoiceStatus::Error("Whisper context was unexpectedly empty".to_string());
                    return;
                }
            };
            let mut state = match ctx.create_state() {
                Ok(s) => s,
                Err(e) => {
                    let mut s = status.lock().unwrap_or_else(|e| e.into_inner());
                    *s = VoiceStatus::Error(format!("Failed to create state: {}", e));
                    return;
                }
            };

            let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 0 });
            params.set_n_threads(4);
            params.set_language(Some("en"));
            params.set_print_special(false);
            params.set_print_progress(false);
            params.set_print_realtime(false);
            params.set_print_timestamps(false);

            let audio_data = buffer.lock().unwrap_or_else(|e| e.into_inner());

            match state.full(params, &audio_data) {
                Ok(_) => {
                    let num_segments = match state.full_n_segments() {
                        Ok(n) if n >= 0 => n,
                        Ok(_) | Err(_) => {
                            let mut s = status.lock().unwrap_or_else(|e| e.into_inner());
                            *s = VoiceStatus::Error("Failed to get segments".to_string());
                            return;
                        }
                    };
                    let mut result = String::new();
                    for i in 0..num_segments {
                        if let Ok(segment) = state.full_get_segment_text(i) {
                            result.push_str(&segment);
                        }
                    }
                    let mut s = status.lock().unwrap_or_else(|e| e.into_inner());
                    *s = VoiceStatus::Completed(result.trim().to_string());
                }
                Err(e) => {
                    let mut s = status.lock().unwrap_or_else(|e| e.into_inner());
                    *s = VoiceStatus::Error(format!("Inference failed: {}", e));
                }
            }
        });

        Ok(())
    }

    pub fn get_status(&self) -> VoiceStatus {
        self.status.lock().unwrap_or_else(|e| e.into_inner()).clone()
    }
}

unsafe impl Send for VoiceManager {}
unsafe impl Sync for VoiceManager {}
