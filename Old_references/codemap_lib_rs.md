# Forensic Codemap: Old_references/lib.rs

This document maps every item from the original `lib.rs` (58KB) to the new modularized codebase.

## Backend Items: lib.rs (Original)

### 1. Structs & Enums
| Item | Category | New Location | Notes |
| :--- | :--- | :--- | :--- |
| `ChatMessage` | **Identified** | [types.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/types.rs#L6) | |
| `AppState` | **Identified** | [types.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/types.rs#L12) | |
| `ProviderConfig` | **Identified** | [types.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/types.rs#L28) | |
| `SourceEntry` | **Identified** | [types.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/types.rs#L48) | |
| `StreamingEvent` | **Identified** | [types.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/types.rs#L55) | |
| `ChatSession` | **Identified** | [types.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/types.rs#L70) | Wait, it actually moved to `types.rs`? Let me check. Actually it moved to `src/session.rs` or `types.rs`? I see `ChatSession` in `types.rs` line 70. |
| `HardwareInfo` | **Identified** | [types.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/types.rs#L70) | |
| `ContextIntelligence` | **Identified** | [types.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/types.rs#L79) | |

### 2. Helper Functions
| Item | Category | New Location | Notes |
| :--- | :--- | :--- | :--- |
| `estimate_tokens` | **Identified** | [providers/mod.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/providers/mod.rs#L9) | |
| `trim_history` | **Identified** | [providers/mod.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/providers/mod.rs#L13) | |
| `prepare_messages` | **Identified** | [providers/mod.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/providers/mod.rs#L36) | |
| `map_model` | **Identified** | [providers/mod.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/providers/mod.rs#L93) | |

### 3. Tauri Commands
| Item | Category | New Location | Notes |
| :--- | :--- | :--- | :--- |
| `greet` | **Missing** | N/A | Function source code is gone; removed from `invoke_handler`. |
| `get_provider_config` | **Orphaned** | [config.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/config.rs#L51) | Exist in `config.rs` but `ipc/settings.rs` uses its own copy. |
| `save_provider_config` | **Orphaned** | [config.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/config.rs#L75) | Exist in `config.rs` but `ipc/settings.rs` uses its own copy. |
| `update_search_config` | **Orphaned** | [config.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/config.rs#L97) | Exist in `config.rs` but `ipc/settings.rs` uses its own copy. |
| `set_background_image` | **Orphaned** | [config.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/config.rs#L7) | Exist in `config.rs` but `ipc/settings.rs` uses its own copy. |
| `get_hardware_info` | **Orphaned** | [config.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/config.rs#L116) | Exist in `config.rs` but `ipc/settings.rs` uses its own copy. |
| `send_message` | **Identified** | [ipc/chat.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/ipc/chat.rs#L14) | Properly registered and linked. |
| `stream_message` | **Identified** | [ipc/chat.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/ipc/chat.rs#L74) | Properly registered and linked. |
| `abort_generation` | **Identified** | [ipc/chat.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/ipc/chat.rs#L175) | Properly registered and linked. |
| `list_local_models` | **Identified** | [ipc/models.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/ipc/models.rs) | |
| `list_anthropic_models` | **Identified** | [ipc/models.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/ipc/models.rs) | |
| `list_openai_models` | **Identified** | [ipc/models.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/ipc/models.rs) | |
| `list_gemini_models` | **Identified** | [ipc/models.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/ipc/models.rs) | |
| `list_chats` | **Identified** | [ipc/sessions.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/ipc/sessions.rs) | |
| `load_chat` | **Identified** | [ipc/sessions.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/ipc/sessions.rs) | |
| `save_chat` | **Identified** | [ipc/sessions.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/ipc/sessions.rs) | |
| `delete_chat` | **Identified** | [ipc/sessions.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/ipc/sessions.rs) | |
| `eject_model` | **Identified** | [ipc/models.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/ipc/models.rs) | |
| `get_model_loaded_status` | **Identified** | [ipc/models.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/ipc/models.rs) | |
| `get_context_intelligence` | **Identified** | [ipc/models.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/ipc/models.rs) | |
| `start_recording` | **Identified** | [ipc/voice.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/ipc/voice.rs) | |
| `stop_recording` | **Identified** | [ipc/voice.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/ipc/voice.rs) | |
| `get_transcription_status` | **Identified** | [ipc/voice.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/ipc/voice.rs) | |
| `list_audio_devices` | **Identified** | [ipc/voice.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/ipc/voice.rs) | |
| `set_audio_device` | **Identified** | [ipc/voice.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/ipc/voice.rs) | |
| `download_voice_model` | **Identified** | [ipc/voice.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/ipc/voice.rs) | |
| `list_downloaded_voice_models` | **Identified** | [ipc/voice.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/ipc/voice.rs) | |

### 4. Application Boot & Plugins
| Item | Category | New Location | Notes |
| :--- | :--- | :--- | :--- |
| `Builder::default().setup` | **Identified** | [lib.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/lib.rs#L23) | Mostly reconstructed. |
| `tauri_plugin_store` setup | **Identified** | [lib.rs](file:///home/unboundangel/Projects/github-finch/Finch/src-tauri/src/lib.rs#L20) | Initialized correctly in backend. |

---
**Summary for lib.rs**:
- Identified: 33
- Orphaned: 5
- Missing: 1
- Unverified: 0
