# Finch AI Instructions

## 🚨 DUAL-REPOSITORY SAFETY PROTOCOL (CRITICAL)
This project exists in two states: **Public** (Frontend only) and **Private** (Full code). To prevent accidental leaking of the backend source code, follow these steps BEFORE any git operation:

> **⛔ PUBLIC REPO PUSHES SUSPENDED**
> Pushing to `origin` (public) is **disabled for the current development cycle**.
> All commits go to `full-repo` (private) only: `git push full-repo linux:main`.
> Do not push to `origin` under any circumstances until this notice is removed.

1. **Verify Remote**: Check `git remote -v` to see where you are pushing.
   - `origin`: Public (`Finch`) → **SUSPENDED. DO NOT PUSH.**
   - `full-repo`: Private (`Finch_full`) → **ALL pushes go here.**

2. **Sync .gitignore** (for private pushes only):
   - `cp .gitignore.private .gitignore` before staging.
   - Restore with `cp .gitignore.public .gitignore` after pushing (default safe state).

3. **Validation**: Always run `git status` before staging. Confirm `src-tauri/` is visible (private) or hidden (public). Currently always expect private.

**NEVER push to `origin` while this notice is present.**

---

## 1. What This Project Is
Finch is a high-performance desktop AI chat application built with Tauri v2 and React 19. It provides a local-first, extensible interface for interacting with various LLM providers (Anthropic, OpenAI, Gemini, LM Studio, Ollama) and real-time Web Search (Tavily, Brave, SearXNG), while maintaining strict security by routing all model communication through a secure Rust IPC bridge.

## 2. Branch / OS Setup
- **main** → Windows (primary machine). Repo path: `C:\Random things i dont want deleted\Finch\finch-sandbox\`
- **linux** → Linux laptop (same repo, separate branch).
- Confirm branch and remotes before pushing (see Section 1).

## 3. Tech Stack

### Frontend
| Package | Version | Role |
|---|---|---|
| React | ^19.0.0 | UI framework |
| TypeScript | ~5.8.2 | Type safety |
| Vite | ^6.2.0 | Build tool / dev server (port 1420) |
| Tailwind CSS | ^4.1.14 | Utility-first styling (via `@tailwindcss/vite`) |
| motion | ^12.38.0 | Animations (Framer Motion successor API) |
| Zustand | ^5.0.12 | Global state management |
| Shiki | ^4.0.2 | Syntax highlighting (async singleton) |
| react-markdown | ^10.1.0 | Markdown rendering |
| remark-gfm | ^4.0.1 | GitHub Flavored Markdown |
| sonner | ^2.0.7 | Toast notifications |
| lucide-react | ^0.546.0 | Icons |
| @fontsource-variable/geist | ^5.2.8 | Typography |
| @base-ui/react | ^1.3.0 | Accessible UI primitives |
| @radix-ui/react-popover | ^1.1.15 | Popover primitive |
| styled-components | ^6.4.0 | [present in deps, limited use] |
| @tauri-apps/api | ^2.0.0 | Tauri JS bridge |
| @tauri-apps/plugin-dialog | ^2.7.0 | Native file dialogs |
| @tauri-apps/plugin-opener | ^2.5.3 | Open URLs / files in OS |

### Backend (Rust / Tauri)
| Crate | Role |
|---|---|
| tauri 2 | Desktop shell, IPC bridge |
| tauri-plugin-store 2.4.2 | Persistent JSON key/value store |
| tauri-plugin-dialog 2 | File/folder picker dialogs |
| tauri-plugin-opener 2 | OS-level open |
| reqwest 0.12 | Async HTTP for provider APIs |
| tokio 1 (full) | Async runtime |
| serde / serde_json | Serialization |
| whisper-rs 0.11 | Local Whisper inference |
| cpal 0.15 | Audio device I/O |
| rubato 0.15 | Audio resampling |
| sysinfo 0.33.1 | Hardware info (RAM, CPU count) |
| image 0.25 | Wallpaper/avatar image processing |
| base64 0.22 | Image encoding for multimodal payloads |
| sha2 / hex | Hashing |
| uuid 1.23 | Unique ID generation |
| chrono 0.4.44 | Timestamps |
| windows 0.58.0 | Win32 COM (Windows-specific) |
| futures-util 0.3 | Stream utilities |

## 4. Directory Structure
```text
/
├── .planning/          # GSD session state (STATE.md), phase plans, quick tasks, research
├── AGENTS.md           # This file — agent instructions
├── CLAUDE.md           # Claude-specific instructions (mirrors key rules)
├── components/ui/      # Shared Shadcn-style primitives (22 files) — import via @/components/ui/…
├── src/
│   ├── App.tsx         # Root: profile gate → StartupScreen | Dashboard + Toaster
│   ├── main.tsx        # React DOM entry point
│   ├── index.css       # Global styles, Tailwind directives, design tokens, glassmorphic utilities
│   ├── assets/         # Static assets (images, icons)
│   ├── components/
│   │   ├── chat/       # All chat-area UI (15 files)
│   │   ├── dashboard/  # Layout orchestrators, header, dialogs (8 files)
│   │   ├── modals/     # ContextOverflowModal
│   │   ├── studio/     # Studio node-based canvas (StudioWorkspace, StudioCanvas)
│   │   ├── profile/    # Avatar/wallpaper pickers, GIF warning (3 files)
│   │   ├── sidebar/    # Left + right sidebar, sub-components, hooks (3 top + 5 sub + 2 hooks)
│   │   ├── startup/    # Profile creation/editing/selection, startup screen (4 files)
│   │   └── ui/         # App-local UI atoms (ExternalLink, Icons)
│   ├── hooks/          # 11 hooks (streaming, voice, persistence, background, polling…)
│   ├── lib/            # 11 utility modules (artifact parser/prompt, models, context windows…)
│   ├── providers/      # React context providers (ModalProvider)
│   ├── store/          # Zustand slices (chat, modelParams, profile) + index
│   ├── styles/         # toasts.css
│   └── types/          # chat.ts (Message, Artifact, ChatSession, Profile, etc.)
├── src-tauri/
│   ├── Cargo.toml
│   ├── capabilities/default.json   # All allowed IPC commands (single file)
│   ├── permissions/                # [present, contents not audited]
│   └── src/
│       ├── lib.rs      # Tauri app setup, plugin registration, invoke_handler
│       ├── main.rs     # Binary entry point (delegates to lib.rs)
│       ├── types.rs    # Shared Rust types (AppState, ProviderConfig, StreamingEvent, …)
│       ├── search.rs   # Web search orchestration (Tavily, Brave, SearXNG)
│       ├── voice.rs    # VoiceManager: audio capture (CPAL), Whisper inference, preview
│       ├── download.rs # Voice model marketplace downloader (progress events)
│       ├── session.rs  # Chat session helpers (file I/O for chats/)
│       ├── ipc/        # IPC command modules (8 files)
│       │   ├── mod.rs
│       │   ├── chat.rs         # send_message, stream_message, abort_generation
│       │   ├── models.rs       # list_*_models, eject/preload/status, context_intelligence
│       │   ├── sessions.rs     # list/load/save/delete_chat
│       │   ├── settings.rs     # provider config, background/media import, hardware info, search config
│       │   ├── voice.rs        # recording, transcription, preview, device mgmt, model download
│       │   ├── profiles.rs     # get/save/delete_profile
│       │   └── media_import.rs # import_user_media, remove_imported_media
│       └── providers/  # LLM provider clients (5 files)
│           ├── mod.rs          # prepare_messages, map_model, inject_attachments_into_messages
│           ├── anthropic.rs    # AnthropicClient: send + streaming
│           ├── openai.rs       # send + stream_message_openai
│           ├── gemini.rs       # send + stream_message_gemini
│           └── local.rs        # send + stream_message_local (Ollama + LM Studio)
└── docs/
    ├── README.md           # Documentation index
    ├── architecture/       # codebase.md, Finch Codebase Map (post-split).md
    ├── product/            # BACKLOG, IDEAS, ROADMAP
    ├── planning/           # Startup / profile integration plans
    ├── qa/                 # UAT logs
    ├── archive/            # Retired plans (read-only)
    └── superpowers/        # Product strategy specs
```

## 5. Architecture Rules — DO NOT VIOLATE
- **API keys never reach the React renderer.** All LLM calls go through Rust IPC only. `get_provider_config` masks keys before returning to JS.
- **Every new Tauri command requires `allow-[command-name]` in `src-tauri/capabilities/default.json`.** The build passes without it; runtime throws silently.
- **Tauri v2 Channel uses `.onmessage` assignment** — NOT `.onData()`.
- **Tauri auto-converts camelCase JS keys to snake_case Rust args.** Send `modelId` from JS; Rust receives `model_id`. Never manually snake_case the JS payload.
- **Use `handle.store()` via `StoreExt`** — NOT `handle.get_store()`. `get_store()` returns `None` if the JS side hasn't loaded the store yet.
- **Web Search events arrive before the LLM text.** They are emitted as `search_start`, `search_source`, `search_done` on the channel; `useAIStreaming.ts` flushes any pending text buffer before dispatching these to preserve ordering.
- **`@/` alias resolves to the project root** — NOT `src/`. Shared UI primitives are at `@/components/ui/…`; app components at `@/src/components/…`.
- **Shiki is an async singleton.** Initialize once in `CodeBlock.tsx`; do not reinitialize per render.
- **Motion `layout` + `height: auto` conflicts with Zustand render cycles during slider drag.** Use pure CSS `max-height` transitions for collapsible zones. Reserve Motion for discrete animations (chevron rotation, icon swap, etc.).
- **Local models use OpenAI-compatible `/v1/chat/completions` endpoints.** Both `local_ollama` and `local_lmstudio` route through `local.rs`.
- **Fallback context window for unknown local models: 32k** (always overestimate, not underestimate).
- **`ipc/media_import.rs` exists as a module** but is not directly registered in `lib.rs`'s invoke_handler (its commands are likely routed via `settings.rs`). Verify before adding new media commands.
- **Artifact parsing is client-side only.** `artifactParser.ts` uses a single-pass regex to extract `<artifact>` XML blocks from the raw stream. No Rust-side artifact events exist yet (Phase B design is documented in `artifactParser.ts` if needed).
- **`tokensUsed` and `voiceStatus` are excluded from Zustand persistence** (`chatSlice` partializer strips them on hydration).
- **"Remember me" profile is stored in `localStorage`** under key `finch_remembered_profile`, not in the Tauri store.
- **Studio Canvas Performance Mandates**: 
    - Use direct DOM mutation (`el.style.transform`) for dragging and resizing to bypass React render cycles.
    - Avoid `transition-all` on nodes; use specific transitions (e.g., `transition-[border-color,box-shadow]`) to prevent "lag" during manual DOM style updates.
    - Cache `getBoundingClientRect` results once at `pointerdown` for marquee selection to prevent layout thrashing during `pointermove`.

## 6. Planning System & Docs
The `.planning/` directory holds GSD-style state: **`STATE.md`** (milestone, phase history), **`phases/`** (execution plans), **`quick/`** (small tasks), **`research/`**. **Read `STATE.md` at session start.**

User-facing specs, roadmap, UAT, and architecture notes are under **`docs/`** — start from **`docs/README.md`** for the full map.

## 7. State Management
Three Zustand stores (all with `persist` middleware), in `src/store/`:

| Store | Export | Slice | Persisted Key | Purpose |
|---|---|---|---|---|
| `useModelParams` | `useModelParams` | `modelParamsSlice.ts` | `finch-model-params` | LLM params (temp, top_p, maxTokens, stopStrings, systemPrompt) |
| `useChatStore` | `useChatStore` | `chatSlice.ts` | `finch-chat-state` | Provider, model, incognito, sidebar state, dark mode, voice status, model loading progress. Excludes `tokensUsed` + `voiceStatus` from persistence. |
| `useProfileStore` | `useProfileStore` | `profileSlice.ts` | `finch-profile-state` | Profile list, active profile. Falls back to `localStorage` if not in Tauri. |
| `useStudioStore` | `useStudioStore` | `studioSlice.ts` | `finch-studio-state` | Studio Workspace state (nodes, canvas offset, selection). Excludes `studioStreamBuffer` from persistence. |

No Redux or React Context is used for global state (except `ModalProvider` for modal open/close).

## 8. IPC Flow & Key Providers

### Registered Tauri Commands (as of audit)
| Module | Commands |
|---|---|
| `ipc::chat` | `send_message`, `stream_message`, `abort_generation` |
| `ipc::settings` | `save_provider_config`, `get_provider_config`, `set_background_image`, `import_user_media`, `remove_imported_media`, `update_search_config`, `get_hardware_info` |
| `ipc::models` | `list_local_models`, `list_anthropic_models`, `list_openai_models`, `list_gemini_models`, `eject_model`, `preload_model`, `get_model_loaded_status`, `get_context_intelligence` |
| `ipc::sessions` | `list_chats`, `load_chat`, `save_chat`, `delete_chat` |
| `ipc::voice` | `start_recording`, `stop_recording`, `start_voice_preview`, `stop_voice_preview`, `get_transcription_status`, `get_voice_meter_level`, `list_audio_devices`, `set_audio_device`, `download_voice_model`, `list_downloaded_voice_models` |
| `ipc::profiles` | `get_profiles`, `save_profile`, `delete_profile` |

### Streaming Event Protocol
`StreamingEvent` enum (defined in `types.rs`) is serialized to JSON and sent on a Tauri Channel:
- `text` — streamed token chunk
- `search_start` — web search initiated (query string)
- `search_source` — one search result (title, url, duration_ms)
- `search_done` — search complete
- `stats` — final generation stats (tokens, tps, stop reason)

`useAIStreaming.ts` batches `text` events via `requestAnimationFrame` and flushes the buffer synchronously before processing `search_*` and `stats` events.

### Attachment Injection
`useAIStreaming.ts` passes `attachments: { path: string }[]` to `stream_message`. Rust's `inject_attachments_into_messages` in `providers/mod.rs` reads the file, encodes to base64 (images), and merges into the provider-specific payload format.

### App State
`AppState` (in `types.rs`) holds:
- `abort_flag: Arc<AtomicBool>` — shared across the `abort_generation` command and active stream
- `voice_manager: Arc<VoiceManager>` — shared across all voice IPC commands

## 9. Feature Audit (synced with codebase, 2026-04-22)

| Feature | Status | Notes |
|---|---|---|
| Multi-provider streaming (Anthropic, OpenAI, Gemini, Ollama, LM Studio) | ✅ Done | All in `ipc/chat.rs` + `providers/` |
| Markdown + Shiki syntax highlighting | ✅ Done | `MessageBubble.tsx` + `CodeBlock.tsx` |
| Chat persistence (save/load/delete) | ✅ Done | `ipc/sessions.rs` + `useChatPersistence.ts` |
| Web search (Tavily / Brave / SearXNG) | ✅ Done | `search.rs`, search events in stream |
| Sidebar search, incognito mode | ✅ Done | `ChatSidebar.tsx`, `chatSlice.ts` |
| Profile system (create/edit/delete/select/remember-me) | ✅ Done | `startup/`, `ipc/profiles.rs`, `profileSlice.ts` |
| Context overflow modal | ✅ Done | `ContextOverflowModal.tsx`, `ModalProvider.tsx` |
| Artifacts (XML parsing, panel viewer, version history) | ✅ Done | `artifactParser.ts`, `ArtifactPanel.tsx`, `ArtifactCard.tsx` |
| Attachments → Rust → model (multimodal) | ✅ Done | `inject_attachments_into_messages` in `providers/mod.rs` |
| AI message copy | ✅ Done | `MessageBubble.tsx` |
| Regenerate last message | ✅ Done | `ChatArea.tsx` |
| Edit user message + resend | ✅ Done | `onEditResend` in `ChatArea.tsx` |
| Auto-named chat titles | ✅ Done | `Dashboard.tsx` `autoNameChat` → `send_message` |
| Voice (Whisper, marketplace download, meter, preview) | ✅ Done | `voice.rs`, `ipc/voice.rs`, `useVoiceTranscription.ts` |
| Local model polling / load progress | ✅ Done | `useModelPolling.ts`, `get_model_loaded_status` |
| Dynamic background + luminance-aware contrast | ✅ Done | `useDynamicBackground.ts`, `luminance.ts` |
| Custom wallpaper / avatar picker | ✅ Done | `WallpaperPickerDialog.tsx`, `AvatarPickerDialog.tsx` |
| Thinking / reasoning display | ✅ Done | `ThinkingBox.tsx`, `reasoning` field on `Message` |
| File preview modal | ✅ Done | `FilePreviewModal.tsx` |
| Sidebar resize (drag) | ✅ Done | `ChatSidebar.tsx` |
| Right sidebar (AI params) split into sub-sections | ✅ Done | `sidebar/components/` (OutputSection, ParameterZone, SamplingSection, StopWordsSection, SystemPromptSection) |
| Model marketplace (voice model download) | ✅ Done | `ModelMarketplace.tsx` |
| Web search onboarding | ✅ Done | `SearchOnboarding.tsx` |
| Studio Workspace (Node-based canvas) | ✅ Done | `StudioWorkspace.tsx`, `StudioCanvas.tsx`, `studioSlice.ts` |

## 10. Known Gotchas
- `useVoiceTranscription.ts` contains **leftover debug `fetch` calls** to `http://127.0.0.1:7723` inside the polling loop (lines 47 and 66). These are wrapped in `#region agent log` comments and `catch(()=>{})` guards so they are non-fatal, but they should be cleaned up before production.
- `ProviderConfig` in `types.rs` uses `get_store` in `lib.rs` setup (line 39–40) — this is the initialization pattern for the Tauri store and intentionally distinct from runtime usage which always uses `handle.store()`.
- `ipc/media_import.rs` is declared as a `pub mod` in `ipc/mod.rs` but none of its commands appear in `lib.rs`'s `invoke_handler!`. The functions in `settings.rs` (`import_user_media`, `remove_imported_media`) handle that surface instead. The `media_import.rs` module may be vestigial or contain shared helpers — verify before modifying.

## 11. Agent Conventions
- **Read `STATE.md` before starting any task.**
- **Surgical edits only.** Never output full file contents unless explicitly asked. Use targeted replacements.
- **Never rewrite a file that wasn't explicitly scoped.**
- **Push to `full-repo` (private) only**: `git push full-repo linux:main`. Public repo pushes are suspended — see Section 1.
- **When uncertain about a file's role, read it** — do not assume.
- **Verify all Tauri capability entries** when adding a new `#[command]`. Missing entries fail silently at runtime.

---

## Last Updated
`2026-04-24T12:00:00-04:00` — Optimized Studio Workspace performance: fixed node dragging lag by disabling transition-all on active nodes and eliminated layout thrashing in marquee selection by caching bounding rects. Updated documentation with Studio-specific performance mandates.
