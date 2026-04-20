# 🦀 Migration Map: Rust Backend Refactor

> [!info] Objective
> Refactor `src-tauri/src/lib.rs` (1427 lines) into a modular structure to improve maintainability and separate IPC handling from business logic.

## 1. Directory Structure
```text
src-tauri/src/
├── lib.rs (Entry & Registry)
├── types.rs (Shared structs/enums)
├── session.rs (FS CRUD)
├── config.rs (App configuration & Hardware)
├── ipc/
│   ├── mod.rs
│   ├── chat.rs
│   ├── models.rs
│   ├── sessions.rs
│   └── settings.rs
└── providers/
    ├── mod.rs (Token/Msg Utils)
    ├── openai.rs
    ├── gemini.rs
    ├── local.rs
    └── anthropic.rs (Existing)
```

## 2. Extraction Plan

### A. Core Types (`types.rs`)
- **Move:** `AppState`, `ChatMessage`, `ProviderConfig`, `SourceEntry`, `StreamingEvent`, `HardwareInfo`, `ContextIntelligence`.
- **Note:** Ensure all are `pub` and derive `Serialize, Deserialize`.

### B. Session Logic (`session.rs`)
- **Move:** `ChatSession` struct.
- **Move Logic:** `list_chats`, `load_chat`, `save_chat`, `delete_chat`.
- **Signature Example:** `pub async fn save_session(handle: AppHandle, chat: ChatSession) -> Result<String, String>`.

### C. Provider Logic (`providers/`)
- **`mod.rs`:** Move `estimate_tokens`, `trim_history`, `prepare_messages`, `map_model`.
- **`openai.rs` / `gemini.rs` / `local.rs`:** Move the specific branching logic from `send_message` and `stream_message`.
- **Reference Passing:** The `stream_*` functions must accept `Arc<AtomicBool>` for the abort flag.

### D. IPC Layer (`ipc/`)
- **Responsibility:** Thin wrappers using `#[tauri::command]`.
- **Example (`ipc/chat.rs`):**
  ```rust
  #[tauri::command]
  pub async fn stream_message(state: State<'_, AppState>, ...) -> Result<(), String> {
      // Call providers::stream(...)
  }
  ```

### E. Entry Point (`lib.rs`)
- Strip all command implementations.
- Retain `run()` and `.setup()`.
- Register commands using `mod ipc;` and `tauri::generate_handler![...]`.
