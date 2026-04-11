mod anthropic;
use anthropic::{AnthropicClient, AnthropicRequest, Message};
use std::env;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn send_message(prompt: String) -> Result<String, String> {
    println!("Rust received: {}", prompt);

    let api_key = env::var("ANTHROPIC_API_KEY").map_err(|_| "ANTHROPIC_API_KEY not set".to_string())?;
    let client = AnthropicClient::new(api_key);

    let request = AnthropicRequest {
        model: "claude-3-5-sonnet-20240620".to_string(),
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
async fn stream_message(prompt: String, channel: tauri::ipc::Channel<String>) -> Result<(), String> {
    println!("Rust received stream request: {}", prompt);

    let api_key = env::var("ANTHROPIC_API_KEY").map_err(|_| "ANTHROPIC_API_KEY not set".to_string())?;
    let client = AnthropicClient::new(api_key);

    let request = AnthropicRequest {
        model: "claude-3-5-sonnet-20240620".to_string(),
        messages: vec![Message {
            role: "user".to_string(),
            content: prompt,
        }],
        max_tokens: 1024,
        stream: true,
    };

    client.stream_anthropic(request, channel).await?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, send_message, stream_message])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
