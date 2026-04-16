use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, Runtime};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use whisper_rs::{WhisperContext, WhisperContextParameters, FullParams, SamplingStrategy};

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
    stream: Arc<Mutex<Option<cpal::Stream>>>,
}

impl VoiceManager {
    pub fn new() -> Self {
        Self {
            status: Arc::new(Mutex::new(VoiceStatus::Idle)),
            buffer: Arc::new(Mutex::new(Vec::new())),
            context: Arc::new(Mutex::new(None)),
            selected_device: Arc::new(Mutex::new(None)),
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
                    windows::Win32::System::Com::COINIT_APARTMENTTHREADED
                );
            }
        }

        let host = cpal::default_host();
        match host.input_devices() {
            Ok(devices) => {
                let device_names: Vec<String> = devices
                    .map(|d| d.name().unwrap_or_else(|_| "Unknown Device".to_string()))
                    .collect();
                println!("Detected audio devices: {:?}", device_names);
                device_names
            },
            Err(e) => {
                eprintln!("Failed to list input devices: {}", e);
                Vec::new()
            }
        }
    }

    pub fn set_device(&self, name: String) {
        let mut dev = self.selected_device.lock().unwrap();
        *dev = Some(name);
    }

    pub fn start_recording(&self) -> Result<(), String> {
        let host = cpal::default_host();
        
        // Select device
        let device = {
            let selected = self.selected_device.lock().unwrap();
            if let Some(name) = &*selected {
                host.input_devices()
                    .map_err(|e| e.to_string())?
                    .find(|d| d.name().ok().as_ref() == Some(name))
                    .ok_or_else(|| format!("Device '{}' not found", name))?
            } else {
                host.default_input_device()
                    .ok_or_else(|| "No default input device found".to_string())?
            }
        };

        let config = device.default_input_config()
            .map_err(|e| e.to_string())?;

        let status = self.status.clone();
        let buffer = self.buffer.clone();
        let sample_rate = config.sample_rate().0 as f32;
        let channels = config.channels() as usize;

        // Clear buffer
        {
            let mut b = buffer.lock().unwrap();
            b.clear();
        }

        let err_cb = move |err| eprintln!("an error occurred on stream: {}", err);
        
        let stream = match config.sample_format() {
            cpal::SampleFormat::F32 => {
                device.build_input_stream(
                    &config.into(),
                    move |data: &[f32], _: &_| {
                        let mut b = buffer.lock().unwrap();
                        
                        // Simple Resampling & Mono conversion
                        // Whisper wants 16000Hz Mono
                        if sample_rate == 16000.0 && channels == 1 {
                            b.extend_from_slice(data);
                        } else {
                            // Downsample / Mono logic
                            let step = sample_rate / 16000.0;
                            let mut i = 0.0;
                            while (i as usize) < data.len() {
                                let idx = (i as usize) - ((i as usize) % channels);
                                b.push(data[idx]);
                                i += step * (channels as f32);
                            }
                        }
                    },
                    err_cb,
                    None
                )
            },
            _ => return Err("Unsupported sample format. Only F32 is supported for now.".into()),
        }.map_err(|e| e.to_string())?;

        stream.play().map_err(|e| e.to_string())?;
        
        let mut s_lock = self.stream.lock().unwrap();
        *s_lock = Some(stream);
        
        let mut s = status.lock().unwrap();
        *s = VoiceStatus::Recording;

        Ok(())
    }

    pub fn stop_recording<R: Runtime>(&self, app_handle: AppHandle<R>, model_id: Option<String>) -> Result<(), String> {
        // Stop and drop the stream
        {
            let mut s_lock = self.stream.lock().unwrap();
            *s_lock = None;
        }

        let status = self.status.clone();
        let buffer = self.buffer.clone();
        let context_lock = self.context.clone();

        {
            let mut s = status.lock().unwrap();
            *s = VoiceStatus::Transcribing;
        }

        // Spawn inference task
        tokio::task::spawn_blocking(move || {
            let model_path = if let Some(id) = model_id {
                let app_dir = app_handle.path().app_data_dir().unwrap();
                let path = app_dir.join("models").join("whisper").join(format!("{}.bin", id));
                if path.exists() {
                    path
                } else {
                    let mut s = status.lock().unwrap();
                    *s = VoiceStatus::Error(format!("Model '{}' not found. Please download it from the marketplace.", id));
                    return;
                }
            } else {
                let mut s = status.lock().unwrap();
                *s = VoiceStatus::Error("No voice model selected. Please download one from the marketplace.".to_string());
                return;
            };

            // Lazy load context
            let mut ctx_guard = context_lock.lock().unwrap();
            if ctx_guard.is_none() {
                match WhisperContext::new_with_params(
                    model_path.to_str().unwrap(),
                    WhisperContextParameters::default()
                ) {
                    Ok(ctx) => *ctx_guard = Some(ctx),
                    Err(e) => {
                        let mut s = status.lock().unwrap();
                        *s = VoiceStatus::Error(format!("Failed to load model: {}", e));
                        return;
                    }
                }
            }

            let ctx = ctx_guard.as_mut().unwrap();
            let mut state = ctx.create_state().expect("failed to create state");
            
            let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 0 });
            params.set_n_threads(4);
            params.set_language(Some("en"));
            params.set_print_special(false);
            params.set_print_progress(false);
            params.set_print_realtime(false);
            params.set_print_timestamps(false);

            let audio_data = buffer.lock().unwrap();
            
            match state.full(params, &audio_data) {
                Ok(_) => {
                    let num_segments = state.full_n_segments().expect("failed to get segments");
                    let mut result = String::new();
                    for i in 0..num_segments {
                        if let Ok(segment) = state.full_get_segment_text(i) {
                            result.push_str(&segment);
                        }
                    }
                    let mut s = status.lock().unwrap();
                    *s = VoiceStatus::Completed(result.trim().to_string());
                },
                Err(e) => {
                    let mut s = status.lock().unwrap();
                    *s = VoiceStatus::Error(format!("Inference failed: {}", e));
                }
            }
        });

        Ok(())
    }

    pub fn get_status(&self) -> VoiceStatus {
        self.status.lock().unwrap().clone()
    }
}

unsafe impl Send for VoiceManager {}
unsafe impl Sync for VoiceManager {}
