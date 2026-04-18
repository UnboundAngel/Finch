pub mod anthropic;
pub mod openai;
pub mod gemini;
pub mod local;

use crate::types::ChatMessage;
use crate::providers::anthropic::Message as AnthropicMessage;

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

pub fn prepare_messages(
    history: Vec<ChatMessage>,
    current_prompt: String,
    provider: &str,
    system_prompt: Option<String>,
    max_tokens: Option<u32>,
) -> serde_json::Value {
    let budget = (max_tokens.unwrap_or(4096) as f32 * 0.75) as usize;
    let trimmed_history = trim_history(history, budget, &current_prompt, &system_prompt);

    match provider {
        "anthropic" => {
            let mut messages: Vec<AnthropicMessage> = trimmed_history
                .into_iter()
                .map(|m| AnthropicMessage {
                    role: m.role,
                    content: m.content,
                })
                .collect();
            messages.push(AnthropicMessage {
                role: "user".to_string(),
                content: current_prompt,
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

pub fn map_model(model_name: &str) -> String {
    match model_name {
        "Finch 3.5 Sonnet" => "claude-3-5-sonnet-20240620".to_string(),
        "Finch 3 Haiku" => "claude-3-haiku-20240307".to_string(),
        _ => "claude-3-5-sonnet-20240620".to_string(), // Default
    }
}
