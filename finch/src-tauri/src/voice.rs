use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Manager, Runtime};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use whisper_rs::{WhisperContext, WhisperContextParameters, FullParams, SamplingStrategy};
use rubato::{Resampler, FFTFixedIn, InterpolationType, InterpolationPoint};

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
    status: Arc<Mutex<VoiceStatus>>,
    buffer: Arc<Mutex<Vec<f32>>>,
    context: Arc<Mutex<Option<WhisperContext>>>,
    stream: Option<cpal::Stream>,
}

impl VoiceManager {
    pub fn new() -> Self {
        Self {
            status: Arc::new(Mutex::new(VoiceStatus::Idle)),
            buffer: Arc::new(Mutex::new(Vec::new())),
            context: Arc::new(Mutex::new(None)),
            stream: None,
        }
    }

    pub fn start_recording(&mut self) -> Result<(), String> {
        let host = cpal::default_host();
        let device = host.default_input_device()
            .ok_or_else(|| "No input device found".to_string())?;

        let config = device.default_input_config()
            .map_err(|e| e.to_string())?;

        let status = self.status.clone();
        let buffer = self.buffer.clone();

        // Clear buffer
        {
            let mut b = buffer.lock().unwrap();
            b.clear();
        }

        let input_sample_rate = config.sample_rate().0 as f64;
        let mut resampler = if input_sample_rate != 16000.0 {
            // Setup rubato resampler
            let resampler = FFTFixedIn::<f32>::new(
                input_sample_rate as usize,
                16000,
                1024,
                1,
                InterpolationType::Linear,
            ).map_err(|e| e.to_string())?;
            Some(resampler)
        } else {
            None
        };

        let err_cb = move |err| eprintln!("an error occurred on stream: {}", err);
        
        let stream = match config.sample_format() {
            cpal::SampleFormat::F32 => {
                device.build_input_stream(
                    &config.into(),
                    move |data: &[f32], _: &_| {
                        let mut b = buffer.lock().unwrap();
                        if let Some(ref mut rs) = resampler {
                            // Simple linear resample or rubato if needed
                            // For simplicity in this POC, we just push raw if 16k or we'd need more complex chunking for rubato
                            // Real implementation would chunk and resample
                            for &sample in data {
                                b.push(sample);
                            }
                        } else {
                            b.extend_from_slice(data);
                        }
                    },
                    err_cb,
                    None
                )
            },
            _ => return Err("Unsupported sample format".into()),
        }.map_err(|e| e.to_string())?;

        stream.play().map_err(|e| e.to_string())?;
        self.stream = Some(stream);
        
        let mut s = status.lock().unwrap();
        *s = VoiceStatus::Recording;

        Ok(())
    }

    pub fn stop_recording<R: Runtime>(&mut self, app_handle: AppHandle<R>, model_id: Option<String>) -> Result<(), String> {
        // Stop the stream
        self.stream = None;

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
                    // Fallback to resources if not in app data
                    match app_handle.path().resource("resources/ggml-base.bin") {
                        Ok(p) => p,
                        Err(e) => {
                            let mut s = status.lock().unwrap();
                            *s = VoiceStatus::Error(format!("Resource path error: {}", e));
                            return;
                        }
                    }
                }
            } else {
                match app_handle.path().resource("resources/ggml-base.bin") {
                    Ok(p) => p,
                    Err(e) => {
                        let mut s = status.lock().unwrap();
                        *s = VoiceStatus::Error(format!("Resource path error: {}", e));
                        return;
                    }
                }
            };

            if !model_path.exists() {
                let mut s = status.lock().unwrap();
                *s = VoiceStatus::Error(format!("Model file not found at {:?}", model_path));
                return;
            }

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
                    *s = VoiceStatus::Completed(result);
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
