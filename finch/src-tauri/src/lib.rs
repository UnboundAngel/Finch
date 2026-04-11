mod anthropic;
use anthropic::{AnthropicClient, AnthropicRequest, Message};
use std::env;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::State;

pub struct AppState {
    pub abort_flag: Arc<AtomicBool>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            abort_flag: Arc::new(AtomicBool::new(false)),
        }
    }
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn map_model(model_name: &str) -> String {
    match model_name {
        "Finch 3.5 Sonnet" => "claude-3-5-sonnet-20240620".to_string(),
        "Finch 3 Haiku" => "claude-3-haiku-20240307".to_string(),
        _ => "claude-3-5-sonnet-20240620".to_string(), // Default
    }
}

#[tauri::command]
async fn send_message(prompt: String, model: String) -> Result<String, String> {
    println!("Rust received (model: {}): {}", model, prompt);

    let api_key = env::var("ANTHROPIC_API_KEY").map_err(|_| "ANTHROPIC_API_KEY not set".to_string())?;
    let client = AnthropicClient::new(api_key);

    let request = AnthropicRequest {
        model: map_model(&model),
        messages: vec![Message {
            role: "user".to_string(),
            content: prompt,
        }],
        max_tokens: 1024,
        stream: false,
    };

    let response = client.call_anthropic(request).await?;

    // For now, just return the first content block's text
    if let Some(content) = response.content.first() {
        Ok(content.text.clone())
    } else {
        Err("No content returned from Anthropic".to_string())
    }
}

#[tauri::command]
async fn stream_message(
    prompt: String, 
    model: String, 
    channel: tauri::ipc::Channel<String>,
    state: State<'_, AppState>
) -> Result<(), String> {
    println!("Rust received stream request (model: {}): {}", model, prompt);

    // Reset abort flag for new stream
    state.abort_flag.store(false, Ordering::SeqCst);

    let api_key = env::var("ANTHROPIC_API_KEY").map_err(|_| "ANTHROPIC_API_KEY not set".to_string())?;
    let client = AnthropicClient::new(api_key);

    let request = AnthropicRequest {
        model: map_model(&model),
        messages: vec![Message {
            role: "user".to_string(),
            content: prompt,
        }],
        max_tokens: 1024,
        stream: true,
    };

    client.stream_anthropic(request, channel, state.abort_flag.clone()).await?;

    Ok(())
}

#[tauri::command]
async fn abort_generation(state: State<'_, AppState>) -> Result<(), String> {
    println!("Aborting generation...");
    state.abort_flag.store(true, Ordering::SeqCst);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            send_message, 
            stream_message,
            abort_generation
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
