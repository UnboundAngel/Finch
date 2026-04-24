pub mod anthropic;
pub mod openai;
pub mod gemini;
pub mod local;

use crate::types::{ChatMessage, AttachmentInput};
use crate::providers::anthropic::Message as AnthropicMessage;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use std::path::Path;

pub fn estimate_tokens(text: &str) -> usize {
    (text.chars().count() as f32 / 4.0).ceil() as usize
}

pub fn trim_history(
    mut history: Vec<ChatMessage>,
    budget: usize,
    current_prompt: &str,
    system_prompt: &Option<String>
) -> Vec<ChatMessage> {
    let mut current_total = estimate_tokens(current_prompt) + 
        estimate_tokens(system_prompt.as_deref().unwrap_or(""));
    
    // Calculate initial history tokens
    for m in &history {
        current_total += estimate_tokens(&m.content);
    }

    // Prune oldest first until under budget
    while current_total > budget && !history.is_empty() {
        let removed = history.remove(0);
        current_total -= estimate_tokens(&removed.content);
    }

    history
}

pub fn get_context_window(provider: &str, model: &str) -> u32 {
    let m = model.to_lowercase();
    match provider {
        "anthropic" => 200_000,
        "gemini" => {
            if m.contains("gemini-2.5") || m.contains("gemini-1.5") {
                1_000_000
            } else {
                32_768
            }
        }
        "openai" => {
            if m.contains("gpt-4o") || m.starts_with("o1") || m.starts_with("o3") || m.starts_with("o4") || m.contains("gpt-4-turbo") {
                128_000
            } else if m.contains("gpt-4") {
                8_192
            } else if m.contains("gpt-3.5") {
                16_385
            } else {
                128_000
            }
        }
        _ => 32_768,
    }
}

pub fn prepare_messages(
    history: Vec<ChatMessage>,
    current_prompt: String,
    provider: &str,
    model: &str,
    system_prompt: Option<String>,
    max_tokens: Option<u32>,
) -> serde_json::Value {
    let output_reserve = max_tokens.unwrap_or(4096) as usize;
    let context_window = get_context_window(provider, model) as usize;
    let budget = context_window.saturating_sub(output_reserve);
    let trimmed_history = trim_history(history, budget, &current_prompt, &system_prompt);

    match provider {
        "anthropic" => {
            let mut messages: Vec<AnthropicMessage> = trimmed_history
                .into_iter()
                .map(|m| AnthropicMessage {
                    role: m.role,
                    content: serde_json::Value::String(m.content),
                })
                .collect();
            messages.push(AnthropicMessage {
                role: "user".to_string(),
                content: serde_json::Value::String(current_prompt),
            });
            serde_json::to_value(messages).unwrap_or(serde_json::json!([]))
        }
        "gemini" => {
            let mut contents = Vec::new();
            for m in trimmed_history {
                let role = if m.role == "assistant" { "model" } else { "user" };
                contents.push(serde_json::json!({
                    "role": role,
                    "parts": [{ "text": m.content }]
                }));
            }
            contents.push(serde_json::json!({
                "role": "user",
                "parts": [{ "text": current_prompt }]
            }));
            serde_json::to_value(contents).unwrap_or(serde_json::json!([]))
        }
        _ => {
            // OpenAI, Ollama, LM Studio
            let mut messages = Vec::new();
            if let Some(sys) = system_prompt {
                if !sys.is_empty() {
                    messages.push(serde_json::json!({ "role": "system", "content": sys }));
                }
            }
            for m in trimmed_history {
                messages.push(serde_json::json!({ "role": m.role, "content": m.content }));
            }
            messages.push(serde_json::json!({ "role": "user", "content": current_prompt }));
            serde_json::to_value(messages).unwrap_or(serde_json::json!([]))
        }
    }
}

fn detect_mime(path: &Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()) {
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("pdf") => "application/pdf",
        _ => "application/octet-stream",
    }
}

pub fn inject_attachments_into_messages(
    messages: &mut serde_json::Value,
    provider: &str,
    attachments: &[AttachmentInput],
) -> Result<(), String> {
    if attachments.is_empty() {
        return Ok(());
    }
    let msgs = messages.as_array_mut().ok_or("messages is not an array")?;
    // Find the last user/user-role message
    let last_user_idx = msgs.iter().rposition(|m| {
        m.get("role").and_then(|r| r.as_str()) == Some("user")
    }).ok_or("no user message found")?;

    const MAX_ATTACHMENT_BYTES: u64 = 15 * 1024 * 1024; // 15 MB

    for attachment in attachments {
        let path = Path::new(&attachment.path);
        let meta = std::fs::metadata(path)
            .map_err(|e| format!("Cannot stat attachment {}: {}", attachment.path, e))?;
        if meta.len() > MAX_ATTACHMENT_BYTES {
            return Err(format!("Attachment {} exceeds 15 MB limit", attachment.path));
        }
        let bytes = std::fs::read(path)
            .map_err(|e| format!("Failed to read attachment {}: {}", attachment.path, e))?;
        
        let mut mime = detect_mime(path);
        let mut final_bytes = bytes;

        // Auto-downscale large images to save tokens and avoid context rot
        if mime.starts_with("image/") && mime != "image/gif" {
            let max_edge = if provider.starts_with("local_") { 1024 } else { 2048 };
            if let Ok(img) = image::load_from_memory(&final_bytes) {
                if img.width() > max_edge || img.height() > max_edge {
                    let resized = img.resize(max_edge, max_edge, image::imageops::FilterType::Triangle);
                    let mut cursor = std::io::Cursor::new(Vec::new());
                    
                    let encode_success = if img.color().has_alpha() {
                        resized.write_to(&mut cursor, image::ImageFormat::Png).is_ok()
                    } else {
                        resized.write_to(&mut cursor, image::ImageFormat::Jpeg).is_ok()
                    };

                    if encode_success {
                        final_bytes = cursor.into_inner();
                        mime = if img.color().has_alpha() { "image/png" } else { "image/jpeg" };
                    }
                }
            }
        }

        let b64 = BASE64.encode(&final_bytes);

        match provider {
            "anthropic" => {
                let msg = &mut msgs[last_user_idx];
                let image_entry = serde_json::json!({
                    "type": "image",
                    "source": { "type": "base64", "media_type": mime, "data": b64 }
                });
                if msg["content"].is_array() {
                    if let Some(arr) = msg["content"].as_array_mut() {
                        arr.push(image_entry);
                    }
                } else {
                    let original_text = msg["content"].as_str().unwrap_or("").to_string();
                    msg["content"] = serde_json::json!([
                        { "type": "text", "text": original_text },
                        image_entry
                    ]);
                }
            }
            "gemini" => {
                let msg = &mut msgs[last_user_idx];
                if !msg["parts"].is_array() {
                    msg["parts"] = serde_json::json!([]);
                }
                if let Some(parts) = msg["parts"].as_array_mut() {
                    parts.push(serde_json::json!({ "inlineData": { "mimeType": mime, "data": b64 } }));
                }
            }
            "local_ollama" => {
                let msg = &mut msgs[last_user_idx];
                if msg["images"].is_array() {
                    if let Some(arr) = msg["images"].as_array_mut() {
                        arr.push(serde_json::json!(b64));
                    }
                } else {
                    msg["images"] = serde_json::json!([b64]);
                }
            }
            _ => {
                // OpenAI and LM Studio: replace content string with array, append on subsequent attachments
                let msg = &mut msgs[last_user_idx];
                let image_entry = serde_json::json!({
                    "type": "image_url",
                    "image_url": { "url": format!("data:{};base64,{}", mime, b64) }
                });
                if msg["content"].is_array() {
                    if let Some(arr) = msg["content"].as_array_mut() {
                        arr.push(image_entry);
                    }
                } else {
                    let original_text = msg["content"].as_str().unwrap_or("").to_string();
                    msg["content"] = serde_json::json!([
                        { "type": "text", "text": original_text },
                        image_entry
                    ]);
                }
            }
        }
    }
    Ok(())
}

pub fn map_model(model_name: &str) -> String {
    match model_name {
        "Finch 3.5 Sonnet" => "claude-3-5-sonnet-20240620".to_string(),
        "Finch 3 Haiku" => "claude-3-haiku-20240307".to_string(),
        _ => "claude-3-5-sonnet-20240620".to_string(), // Default
    }
}
