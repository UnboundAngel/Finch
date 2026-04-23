# Performance Batch 4 — Backend Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 500ms voice-transcription poll with a one-shot Tauri event, remove leftover debug fetch calls, and eliminate the redundant serde round-trip on the Anthropic path.

**Architecture:** Two cross-stack changes. Issue #9 (voice) touches `src-tauri/src/voice.rs` (emit event on completion) and `src/hooks/useVoiceTranscription.ts` (swap polling interval for a `listen()` call). Issue #10 (serde) is Rust-only: add `prepare_anthropic_messages()` in `providers/mod.rs` that returns a typed `Vec<Message>` directly, and use it in both Anthropic branches of `ipc/chat.rs`. No new dependencies required.

**Tech Stack:** Rust (Tauri v2, tokio), TypeScript. After Rust changes, run `npm run tauri dev` to verify the app builds. After TypeScript changes, run `npm run lint`.

---

## Files Modified

| File | Change |
|------|--------|
| `src-tauri/src/voice.rs` | Emit `"transcription-complete"` Tauri event on `Completed` and `Error` terminal states (issue #9) |
| `src/hooks/useVoiceTranscription.ts` | Replace 500ms polling interval with `listen("transcription-complete", ...)`, remove debug fetch calls (issue #9) |
| `src-tauri/src/providers/mod.rs` | Add `prepare_anthropic_messages()` returning `Vec<Message>` directly (issue #10) |
| `src-tauri/src/ipc/chat.rs` | Use `prepare_anthropic_messages()` in both `send_message` and `stream_message` Anthropic branches (issue #10) |

---

## Task 1: Emit Tauri event from `voice.rs` on transcription completion (Issue #9 — Part A)

**Files:**
- Modify: `src-tauri/src/voice.rs`

**Problem:** Transcription result is currently polled every 500ms by the frontend. The Rust side sets `VoiceStatus::Completed(text)` or `VoiceStatus::Error(msg)` in a `spawn_blocking` closure but never notifies the frontend — it relies on the frontend to poll `get_transcription_status` to discover the result.

**Fix:** After setting the terminal `VoiceStatus`, emit a `"transcription-complete"` Tauri event with a JSON payload. The frontend can then `listen()` once and cancel the listener on unmount.

The event payload type to add to `voice.rs`:

```rust
#[derive(Debug, serde::Serialize, Clone)]
pub struct TranscriptionCompleteEvent {
    pub status: String,  // "completed" or "error"
    pub data: String,    // transcribed text or error message
}
```

- [ ] **Step 1: Add `TranscriptionCompleteEvent` struct after the `VoiceStatus` enum**

In `voice.rs`, after the `VoiceStatus` enum definition (after line 15), add:

```rust
#[derive(Debug, serde::Serialize, Clone)]
pub struct TranscriptionCompleteEvent {
    pub status: String,
    pub data: String,
}
```

- [ ] **Step 2: Emit the event after `VoiceStatus::Completed` is set**

In `voice.rs`, the `Completed` state is set at line 290:
```rust
                    *s = VoiceStatus::Completed(result.trim().to_string());
```

After that line (still inside the `Ok(_)` arm, before the closing `}`), add:
```rust
                    drop(s);
                    let _ = app_handle.emit("transcription-complete", TranscriptionCompleteEvent {
                        status: "completed".to_string(),
                        data: result.trim().to_string(),
                    });
```

Note: `drop(s)` releases the mutex guard before calling `emit` to avoid holding the lock during the emit.

- [ ] **Step 3: Emit the event after `VoiceStatus::Error` is set in the inference path**

At line 294:
```rust
                    *s = VoiceStatus::Error(format!("Inference failed: {}", e));
```

After that line, inside the `Err(e)` arm, add:
```rust
                    drop(s);
                    let _ = app_handle.emit("transcription-complete", TranscriptionCompleteEvent {
                        status: "error".to_string(),
                        data: format!("Inference failed: {}", e),
                    });
```

- [ ] **Step 4: Emit the event for the other error paths**

There are two earlier `VoiceStatus::Error` paths in `stop_recording` — model not found (line 242) and no model selected (line 247). Add the same emit after each:

After line 242:
```rust
                    *s = VoiceStatus::Error(format!("Model '{}' not found. Please download it from the marketplace.", id));
```
Add:
```rust
                    drop(s);
                    let _ = app_handle.emit("transcription-complete", TranscriptionCompleteEvent {
                        status: "error".to_string(),
                        data: format!("Model '{}' not found. Please download it from the marketplace.", id),
                    });
                    return;
```
(Replace the bare `return;` that was already there with this block — it already returns after setting the error.)

After line 247:
```rust
                    *s = VoiceStatus::Error("No voice model selected. Please download one from the marketplace.".to_string());
```
Add:
```rust
                    drop(s);
                    let _ = app_handle.emit("transcription-complete", TranscriptionCompleteEvent {
                        status: "error".to_string(),
                        data: "No voice model selected. Please download one from the marketplace.".to_string(),
                    });
                    return;
```

Also do the same for the model-load failure at line 261:
```rust
                        *s = VoiceStatus::Error(format!("Failed to load model: {}", e));
```
Add:
```rust
                        drop(s);
                        let _ = app_handle.emit("transcription-complete", TranscriptionCompleteEvent {
                            status: "error".to_string(),
                            data: format!("Failed to load model: {}", e),
                        });
                        return;
```

- [ ] **Step 5: Verify the Rust build**

```bash
npm run tauri dev
```
Expected: compiles cleanly. The app starts. No `cargo` errors.

- [ ] **Step 6: Commit (Rust side only)**

```bash
git add src-tauri/src/voice.rs
git commit -m "perf(rust): emit transcription-complete Tauri event instead of relying on polling (#9 part A)"
```

---

## Task 2: Replace polling with event listener in `useVoiceTranscription.ts` (Issue #9 — Part B)

**Files:**
- Modify: `src/hooks/useVoiceTranscription.ts`

**Problem:** The hook polls `get_transcription_status` every 500ms while `status === 'transcribing'`. It also contains leftover debug `fetch` calls to `http://127.0.0.1:7723` (lines 47 and 66, inside `#region agent log` comments) that fire on every poll cycle.

**Fix:** Remove the polling `useEffect` entirely. Add a `useEffect` that, when status transitions to `'transcribing'`, registers a one-shot `listen("transcription-complete", ...)` listener. The listener calls `onTranscriptionComplete`, sets status to idle, and cleans itself up. Remove the debug fetch calls.

- [ ] **Step 1: Remove the entire polling `useEffect` (lines 42–73)**

Delete the block:
```ts
  // Polling for transcription result
  useEffect(() => {
    if (status === 'transcribing') {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const invoke = await getTauriInvoke();
          if (!invoke) return;
          const currentStatus = await invoke<any>('get_transcription_status');
          if (currentStatus.status === 'Completed') {
            const text = currentStatus.data;
            if (onTranscriptionComplete) {
              onTranscriptionComplete(text);
            }
            setStatus('idle');
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          } else if (currentStatus.status === 'Error') {
            toast.error(`Bro, transcription went rogue for a sec: ${currentStatus.data}`);
            setStatus('idle');
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        } catch (err) {
          console.error("Failed to poll transcription status:", err);
        }
      }, 500);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    };
  }, [status, onTranscriptionComplete]);
```

- [ ] **Step 2: Add the event-listener `useEffect` in its place**

Replace the deleted block with:

```ts
  // Subscribe to the transcription-complete event emitted by Rust.
  // Registers when status enters 'transcribing'; cleans up on unmount or status change.
  useEffect(() => {
    if (status !== 'transcribing') return;
    if (!isTauri()) return;

    let unlisten: (() => void) | undefined;

    const setup = async () => {
      const { listen } = await import('@tauri-apps/api/event');
      unlisten = await listen<{ status: string; data: string }>('transcription-complete', (event) => {
        const { status: resultStatus, data } = event.payload;
        if (resultStatus === 'completed') {
          onTranscriptionComplete?.(data);
        } else {
          toast.error(`Transcription failed: ${data}`);
        }
        setStatus('idle');
        unlisten?.();
      });
    };

    setup().catch((err) => {
      console.error('Failed to set up transcription listener:', err);
      setStatus('idle');
    });

    return () => { unlisten?.(); };
  }, [status, onTranscriptionComplete]);
```

- [ ] **Step 3: Remove the now-unused `pollIntervalRef`**

Delete line 15:
```ts
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
```

- [ ] **Step 4: Type-check**

```bash
npm run lint
```
Expected: zero errors.

- [ ] **Step 5: Manual verification**

Start `npm run tauri dev`. Open the app. Record a voice clip and stop recording. Confirm transcription still completes and the text appears in the input field. Open DevTools → Network tab — confirm no requests to `http://127.0.0.1:7723` and no repeated `get_transcription_status` IPC calls appear while transcribing.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useVoiceTranscription.ts
git commit -m "perf: replace voice transcription polling with Tauri event listener, remove debug fetches (#9 part B)"
```

---

## Task 3: Eliminate serde round-trip in `stream_message` Anthropic path (Issue #10)

**Files:**
- Modify: `src-tauri/src/providers/mod.rs`
- Modify: `src-tauri/src/ipc/chat.rs`

**Problem:** `prepare_messages` builds a `Vec<AnthropicMessage>` for the Anthropic branch, serializes it to `serde_json::Value` via `to_value()`, then in `chat.rs` the Anthropic branch immediately re-parses it with `serde_json::from_value(messages)` back to `Vec<Message>`. For large base64-encoded image attachments this serialize→deserialize cycle is a non-trivial allocation on the hot path before the HTTP request.

The round-trip affects both `send_message` (line 44) and `stream_message` (line 157) in `chat.rs`.

**Fix:** Add a `prepare_anthropic_messages()` function in `providers/mod.rs` that returns `Vec<anthropic::Message>` directly, bypassing `serde_json`. Use it in both Anthropic branches of `chat.rs`.

- [ ] **Step 1: Add `prepare_anthropic_messages` to `providers/mod.rs`**

In `providers/mod.rs`, after the closing brace of `prepare_messages` (after line 122), add:

```rust
/// Returns prepared messages for the Anthropic provider as a typed Vec,
/// avoiding the serde_json::Value round-trip that prepare_messages performs.
pub fn prepare_anthropic_messages(
    history: Vec<ChatMessage>,
    current_prompt: String,
    model: &str,
    system_prompt: Option<String>,
    max_tokens: Option<u32>,
) -> Vec<AnthropicMessage> {
    let output_reserve = max_tokens.unwrap_or(4096) as usize;
    let context_window = get_context_window("anthropic", model) as usize;
    let budget = context_window.saturating_sub(output_reserve);
    let trimmed_history = trim_history(history, budget, &current_prompt, &system_prompt);

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
    messages
}
```

Also add `pub use` of `prepare_anthropic_messages` in the module so `ipc/chat.rs` can import it. At the top of `mod.rs`, the function is already in the public scope since it's defined with `pub fn` — just add it to the import in `chat.rs`.

- [ ] **Step 2: Update the `send_message` Anthropic branch in `chat.rs`**

In `ipc/chat.rs`, update the import at line 3:
```rust
use crate::providers::{prepare_messages, map_model, inject_attachments_into_messages};
```
Replace with:
```rust
use crate::providers::{prepare_messages, prepare_anthropic_messages, map_model, inject_attachments_into_messages};
```

In `send_message`, find the Anthropic branch (around lines 35–58). Currently it uses:
```rust
    let messages = prepare_messages(conversation_history, prompt.clone(), &provider, &model, system_prompt.clone(), max_tokens);

    match provider.as_str() {
        "anthropic" => {
            ...
            let request = AnthropicRequest {
                model: map_model(&model),
                messages: serde_json::from_value(messages).map_err(|e| e.to_string())?,
```

Replace the entire `send_message` setup so the Anthropic branch gets its messages from `prepare_anthropic_messages` and the non-Anthropic branches still use `prepare_messages`. The cleanest approach: move `prepare_messages` into the non-Anthropic match arms, and call `prepare_anthropic_messages` only in the Anthropic arm.

Change `send_message` to:
```rust
    match provider.as_str() {
        "anthropic" => {
            let api_key = config.anthropic_api_key.clone()
                .or_else(|| env::var("ANTHROPIC_API_KEY").ok())
                .ok_or("Anthropic API key not set")?;
            let typed_messages = prepare_anthropic_messages(
                conversation_history, prompt.clone(), &model, system_prompt.clone(), max_tokens,
            );
            let client = AnthropicClient::new(api_key);
            let request = AnthropicRequest {
                model: map_model(&model),
                messages: typed_messages,
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
        },
        _ => {
            let messages = prepare_messages(conversation_history, prompt.clone(), &provider, &model, system_prompt.clone(), max_tokens);
            match provider.as_str() {
                "openai" => send_message_openai(&config, model, messages, temperature, top_p, max_tokens, stop_strings).await,
                "gemini" => send_message_gemini(&config, model, messages, system_prompt, temperature, top_p, max_tokens, stop_strings).await,
                "local_ollama" | "local_lmstudio" => send_message_local(&config, &provider, model, messages, temperature, top_p, max_tokens, stop_strings).await,
                _ => Err(format!("Unsupported provider: {}", provider)),
            }
        }
    }
```

> **Note:** Remove the now-redundant `let messages = prepare_messages(...)` line that was at the top of `send_message` before the original match block.

- [ ] **Step 3: Restructure `stream_message` to dispatch before `prepare_messages`**

`stream_message` currently calls `prepare_messages(conversation_history, final_prompt, ...)` at line 139, moving `conversation_history`. To use `prepare_anthropic_messages` we need `conversation_history` before it's consumed. Replace lines 139–179 (from `let mut messages = prepare_messages(...)` through the end of the match) with a single match that dispatches per provider:

```rust
    let provider_str = provider.as_str();
    match provider_str {
        "anthropic" => {
            let api_key = config.anthropic_api_key.clone()
                .or_else(|| env::var("ANTHROPIC_API_KEY").ok())
                .ok_or("Anthropic API key not set")?;

            // Avoid serde round-trip when there are no attachments (the common case).
            // With attachments we still need the Value path for inject_attachments_into_messages.
            let typed_messages = if attachments.as_ref().map_or(true, |a| a.is_empty()) {
                prepare_anthropic_messages(conversation_history, final_prompt, &model, system_prompt.clone(), max_tokens)
            } else {
                let mut msgs = prepare_messages(conversation_history, final_prompt, &provider, &model, system_prompt.clone(), max_tokens);
                inject_attachments_into_messages(&mut msgs, &provider, attachments.as_ref().unwrap())
                    .map_err(|e| format!("Attachment error: {}", e))?;
                serde_json::from_value(msgs).map_err(|e| e.to_string())?
            };

            let client = AnthropicClient::new(api_key);
            let request = AnthropicRequest {
                model: map_model(&model),
                messages: typed_messages,
                max_tokens: max_tokens.unwrap_or(2048),
                stream: true,
                system: system_prompt,
                temperature,
                top_p,
                stop_sequences: stop_strings,
            };
            client.stream_anthropic(request, channel, state.abort_flag.clone()).await?;
            Ok(())
        },
        _ => {
            let mut messages = prepare_messages(conversation_history, final_prompt, &provider, &model, system_prompt.clone(), max_tokens);
            if let Some(ref att) = attachments {
                if !att.is_empty() {
                    inject_attachments_into_messages(&mut messages, &provider, att)
                        .map_err(|e| format!("Attachment error: {}", e))?;
                }
            }
            match provider_str {
                "openai" => stream_message_openai(&config, model, messages, temperature, top_p, max_tokens, stop_strings, channel, state.abort_flag.clone()).await,
                "gemini" => stream_message_gemini(&config, model, messages, system_prompt, temperature, top_p, max_tokens, stop_strings, channel, state.abort_flag.clone()).await,
                "local_ollama" | "local_lmstudio" => stream_message_local(&config, &provider, model, messages, temperature, top_p, max_tokens, stop_strings, channel, state.abort_flag.clone()).await,
                _ => Err(format!("Unsupported provider: {}", provider)),
            }
        }
    }
```

- [ ] **Step 4: Verify the Rust build**

```bash
npm run tauri dev
```
Expected: clean compile, no cargo errors. Test by sending a message via each provider (Anthropic, OpenAI if configured) and confirming responses arrive correctly.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/providers/mod.rs src-tauri/src/ipc/chat.rs
git commit -m "perf(rust): eliminate serde round-trip on Anthropic path via prepare_anthropic_messages (#10)"
```
