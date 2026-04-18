# Finch AI Instructions

## 🚨 DUAL-REPOSITORY SAFETY PROTOCOL (CRITICAL)
This project exists in two states: **Public** (Frontend only) and **Private** (Full code). To prevent accidental leaking of the backend source code, follow these steps BEFORE any git operation:

1. **Verify Remote**: Check `git remote -v` to see where you are pushing.
   - `origin`: Public (`Finch`) -> **MUST** use `.gitignore.public`.
   - `full-repo`: Private (`Finch_full`) -> **MAY** use `.gitignore.private`.

2. **Sync .gitignore**:
   - For Public pushes: `cp .gitignore.public .gitignore`
   - For Private pushes: `cp .gitignore.private .gitignore`

3. **Validation**: Always run `git status` after switching the ignore file to ensure `src-tauri/` is correctly ignored (public) or tracked (private).

**NEVER push to `origin` if `src-tauri/` appears in `git status` or `git add .`.**

---

## 1. What This Project Is
Finch is a high-performance desktop AI chat application built with Tauri v2 and React 19. It provides a local-first, extensible interface for interacting with various LLM providers (Anthropic, OpenAI, Gemini, LM Studio, Ollama) and real-time Web Search (Tavily, Brave, SearXNG), while maintaining strict security by routing all model communication through a secure Rust IPC bridge.

## 2. Branch / OS Setup
- **main branch** → Windows (primary dev machine). Path: `C:\Random things i dont want deleted\MyPrograms\Neoscript\sandboxed_assets\finch\`
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

## 9. Current Phase
Current Focus: **Phase 13: Voice Transcription (Local-First)**. Implementation of local-first whisper transcription, audio device management, and model marketplace for voice models. Note: Phases 14-15 (Token Enrichment & Context Intelligence) are already partially implemented or completed.

## 10. Agent Conventions
- Read STATE.md before starting any task.
- Surgical edits only. Never output full file contents. Use str_replace or equivalent targeted edits.
- Never rewrite a file that wasn't explicitly scoped.
- Push to GitHub after every completed task.
- The GSD planning system (get-shit-done-cc) is installed globally. STATE.md is the source of truth.
- When uncertain about a file's role, read it — do not assume.
