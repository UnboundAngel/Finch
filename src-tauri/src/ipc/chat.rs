use crate::providers::anthropic::{AnthropicClient, AnthropicRequest};
use crate::providers::gemini::{send_message_gemini, stream_message_gemini};
use crate::providers::local::{send_message_local, stream_message_local};
use crate::providers::openai::{send_message_openai, stream_message_openai};
use crate::providers::{inject_attachments_into_messages, map_model, prepare_messages};
use crate::search;
use crate::types::{
    AppState, AttachmentInput, ChatMessage, ProviderConfig, SourceEntry, StreamingEvent,
};
use std::env;
use std::sync::atomic::Ordering;
use tauri::{command, AppHandle, State};
use tauri_plugin_store::StoreExt;

#[command]
pub async fn send_message(
    handle: AppHandle,
    prompt: String,
    model: String,
    provider: String,
    conversation_history: Vec<ChatMessage>,
    system_prompt: Option<String>,
    temperature: Option<f32>,
    top_p: Option<f32>,
    max_tokens: Option<u32>,
    stop_strings: Option<Vec<String>>,
) -> Result<String, String> {
    let top_p = top_p.map(|p| if p <= 0.0 { 0.01 } else { p.min(1.0) });
    println!(
        "Rust received (provider: {}, model: {}): {}",
        provider, model, prompt
    );

    let store = handle
        .store("finch_config.json")
        .map_err(|e| e.to_string())?;
    let config_val = store.get("provider_config");
    let config: ProviderConfig = config_val
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    let messages = prepare_messages(
        conversation_history,
        prompt.clone(),
        &provider,
        &model,
        system_prompt.clone(),
        max_tokens,
    );

    match provider.as_str() {
        "anthropic" => {
            let api_key = config
                .anthropic_api_key
                .clone()
                .or_else(|| env::var("ANTHROPIC_API_KEY").ok())
                .ok_or("Anthropic API key not set")?;

            let client = AnthropicClient::new(api_key);
            let request = AnthropicRequest {
                model: map_model(&model),
                messages: serde_json::from_value(messages).map_err(|e| e.to_string())?,
                max_tokens: max_tokens.unwrap_or(2048),
                stream: false,
                system: system_prompt,
                temperature,
                top_p,
                stop_sequences: stop_strings,
            };

            let response = client.call_anthropic(request).await?;
            if let Some(content) = response.content.first() {
                Ok(content.text.clone())
            } else {
                Err("No content returned from Anthropic".to_string())
            }
        }
        "openai" => {
            send_message_openai(
                &config,
                model,
                messages,
                temperature,
                top_p,
                max_tokens,
                stop_strings,
            )
            .await
        }
        "gemini" => {
            send_message_gemini(
                &config,
                model,
                messages,
                system_prompt,
                temperature,
                top_p,
                max_tokens,
                stop_strings,
            )
            .await
        }
        "local_ollama" | "local_lmstudio" => {
            send_message_local(
                &config,
                &provider,
                model,
                messages,
                temperature,
                top_p,
                max_tokens,
                stop_strings,
            )
            .await
        }
        _ => Err(format!("Unsupported provider: {}", provider)),
    }
}

#[command]
pub async fn stream_message(
    handle: AppHandle,
    prompt: String,
    model: String,
    provider: String,
    conversation_history: Vec<ChatMessage>,
    system_prompt: Option<String>,
    temperature: Option<f32>,
    top_p: Option<f32>,
    max_tokens: Option<u32>,
    stop_strings: Option<Vec<String>>,
    enable_web_search: Option<bool>,
    attachments: Option<Vec<AttachmentInput>>,
    channel: tauri::ipc::Channel<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let top_p = top_p.map(|p| if p <= 0.0 { 0.01 } else { p.min(1.0) });
    println!(
        "Rust received stream request (provider: {}, model: {}, search: {:?}): {}",
        provider, model, enable_web_search, prompt
    );

    state.abort_flag.store(false, Ordering::SeqCst);

    let store = handle
        .store("finch_config.json")
        .map_err(|e| e.to_string())?;
    let config_val = store.get("provider_config");
    let config: ProviderConfig = config_val
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    let mut final_prompt = prompt.clone();

    // --- Web Search Pre-Pass ---
    if enable_web_search.unwrap_or(false) {
        let search_query = final_prompt.clone();

        // Lookup active provider from config, default to Tavily
        let active_search = config.active_search_provider.as_deref().unwrap_or("tavily");

        let search_provider = match active_search {
            "brave" => {
                let brave_key = config
                    .brave_api_key
                    .clone()
                    .ok_or("Brave API key not set. Right-click the globe to configure.")?;
                search::SearchProvider::Brave(brave_key)
            }
            "searxng" => {
                let searx_url = config
                    .searxng_url
                    .clone()
                    .ok_or("SearXNG URL not set. Right-click the globe to configure.")?;
                search::SearchProvider::SearXNG(searx_url)
            }
            _ => {
                let tavily_key = config
                    .tavily_api_key
                    .clone()
                    .ok_or("Tavily API key not set. Click the globe to configure.")?;
                search::SearchProvider::Tavily(tavily_key)
            }
        };

        let _ = channel.send(
            serde_json::to_string(&StreamingEvent::SearchStart {
                query: search_query.clone(),
            })
            .unwrap(),
        );

        let search_handle = channel.clone();
        let search_context = search::execute_search(search_provider, &search_query, move |res| {
            let _ = search_handle.send(
                serde_json::to_string(&StreamingEvent::SearchSource(SourceEntry {
                    title: res.title,
                    url: res.url,
                    duration_ms: res.duration_ms,
                }))
                .unwrap(),
            );
        })
        .await?;

        let _ = channel.send(serde_json::to_string(&StreamingEvent::SearchDone).unwrap());
        final_prompt = format!("{}\n\n{}", search_context, final_prompt);
    }
    // ----------------------------

    let mut messages = prepare_messages(
        conversation_history,
        final_prompt,
        &provider,
        &model,
        system_prompt.clone(),
        max_tokens,
    );

    if let Some(ref att) = attachments {
        if !att.is_empty() {
            inject_attachments_into_messages(&mut messages, &provider, att)
                .map_err(|e| format!("Attachment error: {}", e))?;
        }
    }

    match provider.as_str() {
        "anthropic" => {
            let api_key = config
                .anthropic_api_key
                .clone()
                .or_else(|| env::var("ANTHROPIC_API_KEY").ok())
                .ok_or("Anthropic API key not set")?;

            let client = AnthropicClient::new(api_key);
            let request = AnthropicRequest {
                model: map_model(&model),
                messages: serde_json::from_value(messages).map_err(|e| e.to_string())?,
                max_tokens: max_tokens.unwrap_or(2048),
                stream: true,
                system: system_prompt,
                temperature,
                top_p,
                stop_sequences: stop_strings,
            };

            client
                .stream_anthropic(request, channel, state.abort_flag.clone())
                .await?;
            Ok(())
        }
        "openai" => {
            stream_message_openai(
                &config,
                model,
                messages,
                temperature,
                top_p,
                max_tokens,
                stop_strings,
                channel,
                state.abort_flag.clone(),
            )
            .await
        }
        "gemini" => {
            stream_message_gemini(
                &config,
                model,
                messages,
                system_prompt,
                temperature,
                top_p,
                max_tokens,
                stop_strings,
                channel,
                state.abort_flag.clone(),
            )
            .await
        }
        "local_ollama" | "local_lmstudio" => {
            stream_message_local(
                &config,
                &provider,
                model,
                messages,
                temperature,
                top_p,
                max_tokens,
                stop_strings,
                channel,
                state.abort_flag.clone(),
            )
            .await
        }
        _ => Err(format!("Unsupported provider: {}", provider)),
    }
}

#[command]
pub async fn abort_generation(state: State<'_, AppState>) -> Result<(), String> {
    println!("Aborting generation...");
    state.abort_flag.store(true, Ordering::SeqCst);
    Ok(())
}
