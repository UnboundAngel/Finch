# Finch — Backend Rust Audit Roadmap
> Source: Comprehensive backend audit conducted April 2026.
> Branch: linux (authoritative).
> Note: This roadmap focuses exclusively on `src-tauri/src/` architecture and logic flaws. Execute this *after* the W1–W6 frontend/IPC roadmap (`AUDIT_ROADMAP.md`) is complete.

---

## 🚨 MANDATORY DUAL-REPO SAFETY PROTOCOL
This work is entirely backend-focused.
**BEFORE STARTING ANY FIX:**
1. You **MUST** run `cp .gitignore.private .gitignore`
2. You **MUST** push to `full-repo` only (`git push full-repo linux:main`).
3. **NEVER** push to `origin` when modifying `src-tauri/`.

---

## Wave 8 — Core Logic & Context Integrity
These issues break the core value proposition of large context models and cause silent logic failures.

### W8-1 — Context Window Aggressive Truncation
- **Severity**: Critical
- **File**: `src-tauri/src/providers/mod.rs` (lines 43-44)
- **Problem**: `prepare_messages` calculates the history retention budget using `max_tokens` (which defines the *output* limit, defaulting to 4096). It sets `budget = max_tokens * 0.75` (3072 tokens). This means regardless of whether the user selects a 200k or 1M context model, their conversation history is aggressively truncated to 3072 tokens.
- **Fix Direction**: Update `prepare_messages` to derive the context window entirely in Rust — do NOT accept a context window value from the frontend. The Rust backend already receives `provider` and `model` on every chat command; add a `get_context_window(provider, model) -> u32` lookup table in `mod.rs` (or a new `context_windows.rs` module) covering all known models, with a 32768 fallback for unknowns. Compute the history budget as `context_window - max_tokens.unwrap_or(4096)` inside `prepare_messages`. Never accept `context_window` as a parameter from the IPC layer.
- **Status**: done

### W8-2 — Unsafe URL Construction in SearXNG
- **Severity**: High
- **File**: `src-tauri/src/search.rs` (lines 85-89)
- **Problem**: The SearXNG provider injects the user's raw `query` directly into the GET URL: `format!("{}/search?format=json&q={}", base_url, query)`. If the query contains spaces, ampersands (`&`), or hashes (`#`), the HTTP request becomes malformed or query parameters get hijacked, breaking web search silently.
- **Fix Direction**: Use `urlencoding::encode(query)` or `reqwest::Url::parse` to properly encode the query string before appending it to the base URL.
- **Status**: done

### W8-3 — Hardcoded Cloud Context Limits
- **Severity**: Medium
- **File**: `src-tauri/src/ipc/models.rs` (lines 381-385)
- **Problem**: In `get_context_intelligence`, the fallback for cloud providers (Anthropic, Gemini, OpenAI) hardcodes `model_max = 128000; hardware_safe_limit = 128000;`. This caps models like `gemini-2.5-pro` (1M tokens) and `claude-opus-4-5` (200k tokens) at 128k, artificially limiting the user.
- **Fix Direction**: Expand the `match provider.as_str()` logic to return accurate static limits for known cloud providers. (e.g., Gemini = 1M/2M, Anthropic = 200k, OpenAI = 128k/200k).
- **Status**: done

---

## Wave 9 — Stability & Safety

### W9-1 — Local Model Status False Positives
- **Severity**: Medium
- **File**: `src-tauri/src/ipc/models.rs` (lines 259-260)
- **Problem**: When checking if an LM Studio model is loaded, the code uses a loose `.contains()` check (`id_lower.contains(&model_id_lower)`). This means asking if `llama-3` is loaded will return true if `llama-3-70b-instruct` happens to be loaded, leading the frontend to skip loading the actual requested model.
- **Fix Direction**: Replace `.contains()` with exact string equality (`==`) after splitting off any quantizer or instruct tags, or strictly enforce exact ID matching for LM Studio.
- **Status**: done

### W9-2 — Blocking I/O on Async Thread (Chat Saving)
- **Severity**: Low
- **File**: `src-tauri/src/session.rs` (lines 79-82)
- **Problem**: `save_chat` uses `std::fs::write` to save the chat JSON payload. For massive 100k+ token conversations, `serde_json::to_string_pretty` and synchronous disk I/O will block the Tokio worker thread, causing the Tauri backend to freeze during saves.
- **Fix Direction**: Switch to `tokio::fs::write` and wrap the serialization in `tokio::task::spawn_blocking` to keep the async executor responsive.
- **Status**: open

### W9-3 — Missing Checksum Validation for Models
- **Severity**: Low
- **File**: `src-tauri/src/download.rs` (lines 38-40)
- **Problem**: Voice model downloading prints `checksum validation not yet implemented` and skips SHA256 validation. Downloaded binaries could be corrupted or compromised.
- **Fix Direction**: Implement `sha2::Sha256` hashing on the downloaded temporary file (`tmp_path`). Compare the hash against `manifest.sha256` before performing the atomic rename to `final_path`.
- **Status**: open
