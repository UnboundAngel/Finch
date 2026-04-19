# Finch AI Instructions

## 🚨 DUAL-REPOSITORY SAFETY PROTOCOL (CRITICAL)
This project exists in two states: **Public** (Frontend only) and **Private** (Full code). To prevent accidental leaking of the backend source code, follow these steps BEFORE any git operation:

> **⛔ PUBLIC REPO PUSHES SUSPENDED**
> Pushing to `origin` (public) is **disabled for the current development cycle**.
> All commits go to `full-repo` (private) only: `git push full-repo linux:main`.
> Do not push to `origin` under any circumstances until this notice is removed.

1. **Verify Remote**: Check `git remote -v` to see where you are pushing.
   - `origin`: Public (`Finch`) -> **SUSPENDED. DO NOT PUSH.**
   - `full-repo`: Private (`Finch_full`) -> **ALL pushes go here.**

2. **Sync .gitignore** (for private pushes only):
   - `cp .gitignore.private .gitignore` before staging.
   - Restore with `cp .gitignore.public .gitignore` after pushing (default safe state).

3. **Validation**: Always run `git status` before staging. Confirm `src-tauri/` is visible (private) or hidden (public). Currently always expect private.

**NEVER push to `origin` while this notice is present.**

---

## 1. What This Project Is
Finch is a high-performance desktop AI chat application built with Tauri v2 and React 19. It provides a local-first, extensible interface for interacting with various LLM providers (Anthropic, OpenAI, Gemini, LM Studio, Ollama) and real-time Web Search (Tavily, Brave, SearXNG), while maintaining strict security by routing all model communication through a secure Rust IPC bridge.

## 2. Branch / OS Setup
- **main branch** → Windows (primary dev machine). Path: `C:\Random things i dont want deleted\MyPrograms\SB_Projects\Finch_full\`
- **linux branch** → Linux laptop. Separate branch, same codebase.
- Always confirm which branch you're on before making changes.

## 3. Tech Stack
- **Tauri v2**: Native desktop shell and secure Rust-to-React bridge.
- **React 19**: Frontend UI framework using the latest concurrent features.
- **TypeScript**: Type safety across the entire frontend and IPC layer.
- **Vite**: Ultra-fast build tool and development server.
- **Tailwind CSS 4**: Utility-first styling with the latest engine optimizations.
- **Zustand**: Lightweight, hook-based global state management.
- **Framer Motion 12**: Fluid, declarative animations and micro-interactions.
- **Shadcn/UI**: High-quality, accessible UI components.
- **Shiki**: High-fidelity, theme-aware syntax highlighting for code blocks.
- **Rust**: High-performance backend logic, IPC handling, and hardware interaction.
- **whisper-rs & cpal**: Local-first voice transcription and audio device management.
- **tauri-plugin-store**: Persistent JSON storage for configuration and profiles.
- **LM Studio / Ollama**: Local LLM providers via OpenAI-compatible endpoints.
- **Web Search**: Integration with Tavily, Brave, and SearXNG for real-time data.
- **remark-gfm**: GitHub Flavored Markdown support for the chat parser.
- **React Markdown 10**: Robust Markdown rendering for AI responses.
- **Lucide React**: Consistent, lightweight iconography.

## 4. Directory Structure
```text
/
├── .planning/       # Authoritative GSD session state and phase plans
├── src/             # React frontend source
│   ├── components/  # Modular UI (chat, dashboard, sidebar, ui, search)
│   ├── hooks/       # Custom hooks (IPC, streaming, voice, persistence)
│   ├── lib/         # Shared frontend utilities and constants
│   ├── store/       # Zustand global state slices
│   ├── types/       # Global TypeScript definitions
│   └── styles/      # Global CSS and theme configurations
├── src-tauri/       # Rust backend source
│   ├── src/         # Rust modules (ipc, providers, search, voice, session)
│   ├── capabilities/ # Tauri v2 permission definitions
│   └── permissions/ # Granular command access control
├── public/          # Static assets (icons, grain textures, SVGs)
└── docs/            # Project documentation and UAT reports
```

## 5. Architecture Rules — DO NOT VIOLATE
- API keys never reach the React renderer. All LLM calls go through Rust IPC only. get_provider_config masks keys for Anthropic, OpenAI, Gemini, Tavily, and Brave.
- Every new Tauri command requires allow-[command-name] in BOTH src-tauri/capabilities/default.json AND finch.toml. The build passes without it. Runtime throws silently.
- Tauri v2 Channel uses .onmessage assignment — NOT .onData() method.
- Tauri automatically converts camelCase JS invoke keys to snake_case Rust args. Send camelCase from JS (e.g. modelId). Tauri maps to model_id in Rust. Never manually snake_case the JS payload.
- In Tauri v2, use handle.store() via StoreExt — NOT handle.get_store(). get_store() returns None if the JS side hasn't loaded the store yet.
- Web Search results are injected into the stream via `search_start`, `search_source`, and `search_done` events before the final LLM response.
- @/ alias resolves to the project root — NOT src/.
- Shiki is an async singleton. Do not reinitialize it per render.
- Framer Motion height: auto conflicts with Zustand render cycles during slider drag. Use pure CSS max-height transitions for collapsible zones. Keep Framer Motion for discrete animations only (e.g. chevron rotation).
- Local models use OpenAI-compatible /v1/chat/completions endpoints.
- Fallback context window for unknown local models: 32k (always overestimate fullness).

## 6. Planning System
The `.planning/` directory contains the authoritative state of the project. `STATE.md` tracks the current milestone, phase history, and session progress. Detailed execution plans live in `.planning/phases/`, while ad-hoc tasks are in `.planning/quick/`. Agents must read `STATE.md` at the start of every session to establish context.

## 7. State Management
Zustand is used for global state. Slices are located in `src/store/`:
- `modelParamsSlice.ts`: LLM parameters (temperature, top_p, etc.) and persistence.
- `chatSlice.ts`: Chat history, active session management, and streaming state.
- `profileSlice.ts`: User profiles, preferences, and theme configuration.
No Redux or Context is used for global state.

## 8. Key Providers & IPC Flow
LLM providers are abstracted in `src-tauri/src/providers/` (anthropic.rs, openai.rs, gemini.rs, local.rs). All chat interactions route through the `chat.rs` IPC command. Real-time streaming utilizes Tauri Channels with `.onmessage` handling. LLM performance metrics and token counts are emitted as a `__STATS__:` sentinel JSON payload (or `stats` event) at the end of the stream. Web search utilizes `search.rs` and `tavily.rs` to fetch and inject context.

## 9. Current State & Priority Work

All 15 planned phases are complete or effectively done. Voice transcription (Phase 13) is fully wired — `useVoiceTranscription` hook, `start_recording`/`stop_recording` commands, model marketplace, whisper-rs backend all implemented.

### Feature Audit (as of 2026-04-19)
What is actually wired end-to-end vs. missing:

| Feature | Status |
|---|---|
| Multi-provider (Anthropic, OpenAI, Gemini, Ollama, LM Studio) | ✅ Fully wired |
| Streaming via Tauri Channel | ✅ Fully wired |
| Markdown + code rendering (Shiki, remark-gfm, copy button) | ✅ Fully wired |
| Chat history persistence (Zustand + disk via `save_chat`) | ✅ Fully wired |
| Web search (Tavily/Brave/SearXNG, injected pre-response) | ✅ Fully wired |
| Chat sidebar search (title + message content) | ✅ Fully wired |
| Voice transcription (local whisper) | ✅ Fully wired |
| Incognito mode (no disk save, no profile switch) | ✅ Fully wired |
| Token stats + right sidebar | ✅ Fully wired |
| Profile system (system prompts, default models, avatars) | ✅ Fully wired |
| Context window tracking + overflow modal | ✅ Fully wired |
| Copy button on user messages | ✅ Present |
| **File/image upload → sent to AI** | ⚠️ UI only — never reaches Rust or AI |
| **Copy button on AI messages** | ❌ Missing |
| **Auto-naming chats** | ❌ Missing (uses first 40 chars of message) |
| **Regenerate response** | ❌ Missing |
| **Edit user message + resend** | ❌ Missing |

### Current Priority: Close Baseline Gaps
The app is feature-rich but missing 5 table-stakes items every competitor has. Close these before building any new features. See `docs/BACKLOG.md` for full specs and architecture.

**Ordered priority:**
1. **File/image → actually sent to AI** — architecture fully specced in `docs/BACKLOG.md`. Rust `ContentPart` enum, provider adapters for all 5 providers already designed. Also fix the "Analyze an image" empty-state suggestion card which currently breaks its own promise.
2. **Copy button on AI messages** — trivial. Mirror the existing user message copy button in `MessageBubble.tsx`.
3. **Auto-naming chats** — on first message, fire lightweight AI call for a 4-6 word title. Store in session metadata. Currently defaults to `messages[0].content.substring(0, 40)` in `Dashboard.tsx:177`.
4. **Regenerate response** — button on AI message actions, re-invoke `streamMessage` from last user message.
5. **Edit user message + resend** — truncate history to that point, replace message content, re-invoke stream.

### Above-Baseline (do not build until gaps above are closed)
OmniSearch, local ML/vector embeddings, Artifacts system, Finch Projects, Ghost Context, Semantic Vault. All specced in `docs/BACKLOG.md` and `docs/IDEAS.md`.

## 10. Agent Conventions
- Read STATE.md before starting any task.
- Surgical edits only. Never output full file contents. Use str_replace or equivalent targeted edits.
- Never rewrite a file that wasn't explicitly scoped.
- **Push to `full-repo` (private) only**: `git push full-repo linux:main`. Public repo pushes are suspended — see Section 1.
- The GSD planning system (get-shit-done-cc) is installed globally. STATE.md is the source of truth.
- When uncertain about a file's role, read it — do not assume.
