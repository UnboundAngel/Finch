use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::sync::atomic::AtomicBool;
use crate::voice::VoiceManager;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

pub struct AppState {
    pub abort_flag: Arc<AtomicBool>,
    pub voice_manager: Arc<VoiceManager>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            abort_flag: Arc::new(AtomicBool::new(false)),
            voice_manager: Arc::new(VoiceManager::new()),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(default)]
pub struct ProviderConfig {
    pub anthropic_api_key: Option<String>,
    pub openai_api_key: Option<String>,
    pub gemini_api_key: Option<String>,
    pub lmstudio_endpoint: Option<String>,
    pub ollama_endpoint: Option<String>,
    pub tavily_api_key: Option<String>,
    pub brave_api_key: Option<String>,
    pub searxng_url: Option<String>,
    pub profile_name: Option<String>,
    pub profile_email: Option<String>,
    pub enter_to_send: Option<bool>,
    pub selected_model: Option<String>,
    pub selected_provider: Option<String>,
    pub active_search_provider: Option<String>,
    pub bookmarked_models: Option<Vec<serde_json::Value>>,
    pub custom_bg_light: Option<String>,
    pub custom_bg_dark: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SourceEntry {
    pub title: String,
    pub url: String,
    pub duration_ms: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", content = "data")]
pub enum StreamingEvent {
    #[serde(rename = "text")]
    Text(String),
    #[serde(rename = "search_start")]
    SearchStart { query: String },
    #[serde(rename = "search_source")]
    SearchSource(SourceEntry),
    #[serde(rename = "search_done")]
    SearchDone,
    #[serde(rename = "stats")]
    Stats(serde_json::Value),
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HardwareInfo {
    pub total_memory_gb: f64,
    pub available_memory_gb: f64,
    pub cpu_count: usize,
    pub os_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ContextIntelligence {
    pub hardware_safe_limit: u32,
    pub model_max: u32,
    pub server_num_ctx: u32,
}
