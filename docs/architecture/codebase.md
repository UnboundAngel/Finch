# Finch Codebase Map

## Project Overview
Finch is a high-performance desktop AI chat client built with **Tauri v2**, **React 19**, and **Rust**. It supports local inference (Ollama, LM Studio) and frontier APIs (Anthropic, OpenAI, Google Gemini) with a focus on privacy, glassmorphic aesthetics, and low-latency voice interaction.

---

## Health Legend
- 🟢 **Healthy:** Modular, single responsibility, easy to maintain.
- 🟡 **Concerning:** Growing complexity, candidate for future refactoring.
- 🔴 **Needs Optimization:** Monolithic or high cognitive load, priority to split.

---

## Backend (`/src-tauri/src`)
The Rust backend handles IPC command dispatch, LLM provider orchestration, voice management, search, and local file I/O. The previously-monolithic `lib.rs` has been split into `ipc/` modules.

### Core Rust Files

| File | Lines (approx) | Health | Description |
| :--- | :--- | :--- | :--- |
| `lib.rs` | 84 | 🟢 | App setup only: plugin registration, `AppState` init, directory creation, `invoke_handler!` registration. |
| `main.rs` | 5 | 🟢 | Binary entry point — delegates to `lib.rs::run()`. |
| `types.rs` | 89 | 🟢 | Shared types: `AppState`, `ProviderConfig`, `ChatMessage`, `AttachmentInput`, `StreamingEvent`, `HardwareInfo`, `ContextIntelligence`. |
| `search.rs` | ~120 | 🟢 | Web search orchestration. `SearchProvider` enum (Tavily / Brave / SearXNG). `execute_search()` returns formatted context + fires per-result callbacks for streaming events. |
| `voice.rs` | ~300 | 🟡 | `VoiceManager`: audio capture (CPAL), resampling (Rubato), Whisper inference, voice preview playback. Growing complexity. |
| `download.rs` | ~80 | 🟢 | Voice model file downloader. Fires `download-progress` Tauri events. |
| `session.rs` | ~100 | 🟢 | Chat session file I/O helpers (read/write JSON files in `chats/` app-data dir). |

### IPC Modules (`/src-tauri/src/ipc/`)

| File | Commands Exported | Description |
| :--- | :--- | :--- |
| `mod.rs` | — | Re-exports all sub-modules. |
| `chat.rs` | `send_message`, `stream_message`, `abort_generation` | Core chat dispatch. `stream_message` runs web search pre-pass → injects attachments → routes to provider streaming function. Uses `abort_flag` from `AppState`. |
| `models.rs` | `list_local_models`, `list_anthropic_models`, `list_openai_models`, `list_gemini_models`, `eject_model`, `preload_model`, `get_model_loaded_status`, `get_context_intelligence` | Model lifecycle management for local providers. `get_context_intelligence` returns hardware-safe token limit. |
| `sessions.rs` | `list_chats`, `load_chat`, `save_chat`, `delete_chat` | CRUD for persisted chat JSON files. |
| `settings.rs` | `save_provider_config`, `get_provider_config`, `set_background_image`, `import_user_media`, `remove_imported_media`, `update_search_config`, `get_hardware_info` | Provider config (keys/endpoints), background/avatar media, search provider selection, hardware stats via `sysinfo`. `get_provider_config` masks API keys before returning to JS. |
| `voice.rs` | `start_recording`, `stop_recording`, `start_voice_preview`, `stop_voice_preview`, `get_transcription_status`, `get_voice_meter_level`, `list_audio_devices`, `set_audio_device`, `download_voice_model`, `list_downloaded_voice_models` | Full voice surface. Delegates to `VoiceManager` in `voice.rs`. |
| `profiles.rs` | `get_profiles`, `save_profile`, `delete_profile` | Profile CRUD via `tauri-plugin-store` (`finch_profiles.json`). |
| `media_import.rs` | [uncertain — no commands found in `invoke_handler!`] | Declared as module; media import commands are in `settings.rs`. May contain shared helpers. Verify before modifying. |

### LLM Providers (`/src-tauri/src/providers/`)

| File | Description |
| :--- | :--- |
| `mod.rs` | `prepare_messages()` — builds provider-specific message arrays. `map_model()` — aliases. `inject_attachments_into_messages()` — reads files, base64-encodes images, merges into payload. |
| `anthropic.rs` | `AnthropicClient`: blocking `call_anthropic()` + streaming `stream_anthropic()`. Handles SSE parsing and abort-flag checking. |
| `openai.rs` | `send_message_openai()` + `stream_message_openai()`. |
| `gemini.rs` | `send_message_gemini()` + `stream_message_gemini()`. |
| `local.rs` | `send_message_local()` + `stream_message_local()`. Routes `local_ollama` and `local_lmstudio` through OpenAI-compatible `/v1/chat/completions`. |

---

## Frontend Core (`/src`)

| File | Lines (approx) | Health | Description |
| :--- | :--- | :--- | :--- |
| `main.tsx` | 10 | 🟢 | React DOM entry point. Renders `<App />`. |
| `App.tsx` | 69 | 🟢 | Profile gate: loads profiles on mount, restores "remember me" from `localStorage`, renders `<Dashboard>` or `<StartupScreen>`. Includes `<Toaster>`. |
| `index.css` | ~560 | 🟡 | Global styles: Tailwind directives, CSS custom properties (design tokens), glassmorphic utilities, scrollbar styles, selection color overrides. Large but stable. |

---

## Frontend Components (`/src/components`)

### Dashboard & Layout (`/dashboard`)

| File | Lines (approx) | Health | Description |
| :--- | :--- | :--- | :--- |
| `Dashboard.tsx` | ~800 | 🔴 | **Primary orchestrator.** Manages: model selection, session state, streaming, artifact version history, chat auto-naming, web search toggle, dark mode, profile, custom backgrounds, window layout. High cognitive load — candidate for split. |
| `DashboardMain.tsx` | ~500 | 🟡 | Central layout grid. Positions sidebar, chat area, right sidebar, and artifact panel. Handles resize drag logic. |
| `DashboardHeader.tsx` | ~140 | 🟢 | Top bar: model selector, incognito toggle, web search controls, right sidebar toggle. |
| `SettingsDialog.tsx` | ~310 | 🟡 | Application settings (providers, search, voice device). Single file for all settings tabs — candidate for splitting by tab. |
| `ProfileDialog.tsx` | ~170 | 🟢 | Per-session profile display and logout. |
| `ProviderSection.tsx` | ~150 | 🟢 | Provider API key input section within SettingsDialog. |
| `WindowControls.tsx` | ~300 | 🟡 | Custom native title bar (minimize/maximize/close + drag region). Theme toggle and dynamic contrast adaptation. |
| `RightSidebarToggle.tsx` | ~32 | 🟢 | Button to open/close the right parameter sidebar. |

### Chat Interface (`/chat`)

| File | Lines (approx) | Health | Description |
| :--- | :--- | :--- | :--- |
| `ChatArea.tsx` | ~260 | 🟢 | Message list with auto-scroll. Passes `onRegenerate` to the last AI message only. Renders `MessageBubble` per message + `SearchStatus`. |
| `MessageBubble.tsx` | ~420 | 🟡 | Renders user/AI bubbles. AI: parses content segments (text vs artifact), renders Markdown via `react-markdown` + `CodeBlock`, inline `ArtifactCard` for each artifact, `ThinkingBox` for reasoning, `MetadataRow` with copy/edit/regen actions. |
| `ChatInput.tsx` | ~860 | 🔴 | **High complexity.** Handles text input, file attachment picker (dialog + drag-drop), voice recording toggle, web search toggle, stop button, model loading indicator, skeleton loader during stream wait. Primary interaction surface — oversized, candidate for decomposition. |
| `ArtifactPanel.tsx` | ~390 | 🟡 | Full-width artifact workspace panel. Renders artifact content by kind (code, html, react, svg, markdown, text). Version navigation (prev/next). Copy and download controls. |
| `ArtifactCard.tsx` | ~80 | 🟢 | Inline collapsed artifact preview card within `MessageBubble`. Shows type badge + title + "Open" button. |
| `ModelSelector.tsx` | ~460 | 🟡 | Dropdown for provider + model selection. Fetches available models, groups by provider, supports bookmarking. |
| `ModelMarketplace.tsx` | ~160 | 🟢 | Voice model download UI (list available Whisper models, trigger download, show progress). |
| `CodeBlock.tsx` | ~130 | 🟢 | Shiki-powered syntax-highlighted code block. Singleton highlighter. Copy-to-clipboard. |
| `MetadataRow.tsx` | ~190 | 🟢 | Per-message stats row (tokens, speed, stop reason) + action buttons (copy, edit, regenerate). |
| `ThinkingBox.tsx` | ~37 | 🟢 | Collapsible "thinking" / reasoning display block for models that emit reasoning traces. |
| `VoiceIndicator.tsx` | ~55 | 🟢 | Animated visual feedback (waveform / spinner) for recording and transcription states. |
| `SearchStatus.tsx` | ~160 | 🟢 | Shows web search progress: query, per-source cards, done state. Injected above AI response. |
| `WebSearchControl.tsx` | ~220 | 🟢 | Globe-button + right-click context menu to switch search providers. |
| `SearchOnboarding.tsx` | ~240 | 🟢 | First-time setup wizard for web search API keys. |
| `FilePreviewModal.tsx` | ~580 | 🟡 | Full-screen file attachment preview (images, text files, PDFs). Large but self-contained. |

### Sidebar (`/sidebar`)

| File | Lines (approx) | Health | Description |
| :--- | :--- | :--- | :--- |
| `ChatSidebar.tsx` | ~430 | 🟡 | Left sidebar: chat history list, search, pin, incognito, new chat, drag-to-resize. |
| `RightSidebar.tsx` | ~88 | 🟢 | Right sidebar shell: composes sub-sections with collapsible zones. |
| `MaxTokensSlider.tsx` | ~200 | 🟢 | Precision slider for max token limit with hardware-safe ceiling. |
| `components/SamplingSection.tsx` | ~270 | 🟡 | Temperature, Top-P, frequency/presence penalty sliders with gradient visualization. |
| `components/OutputSection.tsx` | ~110 | 🟢 | Output format and response length controls. |
| `components/ParameterZone.tsx` | ~53 | 🟢 | Collapsible wrapper shell for right sidebar sections. |
| `components/StopWordsSection.tsx` | ~88 | 🟢 | Stop string input list. |
| `components/SystemPromptSection.tsx` | ~80 | 🟢 | System prompt textarea within the right sidebar. |
| `hooks/useParameterGradients.ts` | ~80 | 🟢 | Generates CSS gradient fills for parameter sliders based on value position. |
| `hooks/useSidebarTheme.ts` | ~40 | 🟢 | Derives sidebar surface styles from active contrast mode. |

### Startup Flow (`/startup`)

| File | Lines (approx) | Health | Description |
| :--- | :--- | :--- | :--- |
| `StartupScreen.tsx` | ~140 | 🟢 | Root startup shell: routes between ProfileSelection, ProfileCreation, ProfileEditing. |
| `ProfileSelection.tsx` | ~210 | 🟢 | Profile picker grid with "Remember Me" toggle. |
| `ProfileCreation.tsx` | ~530 | 🟡 | Multi-step profile creation (name, avatar, model, preferences). |
| `ProfileEditing.tsx` | ~450 | 🟡 | Edit existing profile — same fields as creation. |

### Profile Dialogs (`/profile`)

| File | Lines (approx) | Health | Description |
| :--- | :--- | :--- | :--- |
| `AvatarPickerDialog.tsx` | ~250 | 🟢 | DiceBear preset + custom file upload for profile avatars. |
| `WallpaperPickerDialog.tsx` | ~157 | 🟢 | Custom background picker (light/dark slots). Warns on GIF impact. |
| `GifImpactWarningDialog.tsx` | ~60 | 🟢 | Performance warning dialog before setting an animated GIF background. |

### Modals (`/modals`)

| File | Lines (approx) | Health | Description |
| :--- | :--- | :--- | :--- |
| `ContextOverflowModal.tsx` | ~60 | 🟢 | Warning dialog when requested tokens exceed hardware-safe limit. |

### App-Local UI Atoms (`/src/components/ui`)

| File | Description |
| :--- | :--- |
| `ExternalLink.tsx` | Anchor that opens in OS browser via `tauri-plugin-opener`. |
| `Icons.tsx` | Custom SVG icon components not covered by Lucide. |

---

## Shared UI Primitives (`/components/ui` — repo root)
22 Shadcn-style primitive components imported via `@/components/ui/…`:

`alert-dialog`, `avatar`, `background-plus`, `bookmark-icon-button`, `button`, `context-menu`, `dialog`, `dropdown-menu`, `input`, `label`, `pin-icon-button`, `popover`, `scroll-area`, `separator`, `sheet`, `shining-text`, `sidebar`, `skeleton`, `sky-toggle`, `switch`, `tabs`, `tooltip`

---

## Hooks (`/src/hooks`)

| File | Lines (approx) | Health | Description |
| :--- | :--- | :--- | :--- |
| `useAIStreaming.ts` | 248 | 🟢 | Tauri Channel consumer. Batches `text` events via `requestAnimationFrame`. Flushes buffer before `search_*` / `stats` events. Exposes `streamMessage`, `abort`, `isStreaming`, `stats`. |
| `useChatPersistence.ts` | ~150 | 🟢 | Auto-saves the active chat session to Rust backend on message append. |
| `useChatSession.ts` | ~140 | 🟢 | Manages active session state: new chat, load, delete, title updates. |
| `useVoiceTranscription.ts` | 179 | 🟢 | Whisper voice hook: recording lifecycle, transcription polling, model download with progress, marketplace open state. ⚠️ Contains debug `fetch` calls to localhost:7723 — should be removed. |
| `useAudioVisualization.ts` | ~100 | 🟢 | Canvas-based waveform animation driven by `get_voice_meter_level` polling. |
| `useModelPolling.ts` | 191 | 🟢 | Polls `get_model_loaded_status` for local models. Adaptive intervals (fast=2s during loading, slow=30-60s idle). Tracks load history in `localStorage` for progress estimation. |
| `useDynamicBackground.ts` | 82 | 🟢 | Samples background image luminance at 4 zones (header, left sidebar, center, right sidebar). Sets contrast tokens (`header-contrast`, `sidebar-contrast`, etc.) and CSS `--selection-*` variables. |
| `useInactivityEject.ts` | ~80 | 🟢 | Auto-ejects local model after configurable inactivity period. |
| `useKeyboardShortcuts.ts` | ~27 | 🟢 | Global keyboard shortcut handler (new chat, toggle sidebar, etc.). |
| `useTauri.ts` | ~31 | 🟢 | Simple hook wrapper around `isTauri()` / `invoke` for components that need conditional Tauri access. |
| `useDebounce.ts` | ~10 | 🟢 | Generic debounce hook. |

---

## State & Utilities (`/src/store`, `/src/lib`)

### Store Slices (`/src/store`)

| File | Export | Description |
| :--- | :--- | :--- |
| `index.ts` | `useModelParams`, `useChatStore`, `useProfileStore` | Creates all three Zustand stores with `persist` middleware. |
| `modelParamsSlice.ts` | `createModelParamsSlice` | Temperature, top_p, maxTokens, stopStrings, systemPrompt. Persisted to `finch-model-params`. |
| `chatSlice.ts` | `createChatSlice` | Provider, model, incognito, sidebar states, dark mode, voice status, model load state/progress. `tokensUsed` + `voiceStatus` excluded from persistence. |
| `profileSlice.ts` | `createProfileSlice` | Active profile, profile list. Falls back to `localStorage` (`finch_web_profiles`) outside Tauri. |

### Lib Utilities (`/src/lib`)

| File | Exports | Description |
| :--- | :--- | :--- |
| `artifactParser.ts` | `parseContentSegments`, `extractArtifacts`, `stripArtifacts` | Client-side XML parser for `<artifact>` blocks. Single-pass regex. Suppresses incomplete tags during streaming. Contains Phase B upgrade design notes. |
| `artifactSystemPrompt.ts` | `ARTIFACT_SYSTEM_INSTRUCTIONS` | Provider-agnostic system prompt suffix that instructs the model to emit `<artifact>` XML for substantial content. |
| `availableModels.ts` | `fetchModelsMap`, `firstUsableModel`, `inferProviderForModel`, `PROVIDER_LABELS`, `ProviderId` | Fetches model lists from all providers via IPC. Defines canonical provider ID types. |
| `contextWindows.ts` | `getContextWindowSize` | Static lookup table for known model context sizes (Anthropic, OpenAI, Gemini). Returns `null` for unknown models. |
| `luminance.ts` | `getImageLuminance` | Samples image pixels at named zones or custom coordinates via canvas. Returns average luminance (0–1). |
| `mediaPaths.ts` | `resolveMediaSrc`, `isGifPath` | Converts local file paths to `convertFileSrc()` URLs for Tauri asset protocol. Passes through HTTP URLs unchanged. |
| `mediaRecents.ts` | [uncertain] | Likely manages recently used media files list. |
| `dicebearAvatar.ts` | [uncertain] | DiceBear avatar URL generation helpers. |
| `chatHelpers.tsx` | [uncertain] | Small chat utility functions. |
| `providers.ts` | `isLocalInferenceProvider` | Returns `true` for `local_ollama` / `local_lmstudio`. Used to gate model polling. |
| `tauri-utils.ts` | `isTauri`, `getTauriInvoke` | Guards for Tauri environment. `getTauriInvoke` returns `null` outside Tauri instead of throwing. |

### React Context (`/src/providers`)

| File | Exports | Description |
| :--- | :--- | :--- |
| `ModalProvider.tsx` | `ModalProvider`, `useModals` | Context provider that owns `ProfileDialog`, `SettingsDialog`, and `ContextOverflowModal` open states. Exposes `openOverflowModal(limit, requested, onConfirm)`. |

### Types (`/src/types`)

| File | Types |
| :--- | :--- |
| `chat.ts` | `WebSearchResearchEvent`, `ArtifactKind`, `Artifact`, `MessageMetadata`, `Message`, `ChatSession`, `Profile` |

### Styles (`/src/styles`)

| File | Description |
| :--- | :--- |
| `toasts.css` | Sonner toast overrides (glassmorphic surface, custom positioning). |

---

## Configuration

| File | Description |
| :--- | :--- |
| `package.json` | Node dependencies and scripts (`dev`, `build`, `tauri`, `lint`). Dev server runs on port 1420 with `--strictPort`. |
| `vite.config.ts` | Vite config with `@vitejs/plugin-react`, `@tailwindcss/vite`, and `@/` alias pointing to repo root. |
| `tsconfig.json` | TypeScript config. `@/` alias resolves to repo root. |
| `components.json` | Shadcn CLI config. |
| `src-tauri/Cargo.toml` | Rust dependencies. |
| `src-tauri/tauri.conf.json` | Tauri app config (identifier, window settings, bundle). |
| `src-tauri/capabilities/default.json` | Single capabilities file listing all allowed IPC command identifiers for the `main` window. |
| `.gitignore` / `.gitignore.private` / `.gitignore.public` | Three gitignore states for dual-repo workflow. Active `.gitignore` should be the private variant during development. |
| `.env.example` | Example environment variables (API keys for providers). |

---

## Last Updated
`2026-04-22T19:25:00-04:00` — Full audit rewrite: replaced stale monolith descriptions, added all new files (IPC split, ArtifactCard, ThinkingBox, FilePreviewModal, sidebar sub-components, useDynamicBackground, useModelPolling, ModalProvider, lib modules), corrected line counts, updated health ratings, added configuration table.
