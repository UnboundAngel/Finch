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
- **main** → Windows (primary machine). Example path: `C:\Random things i dont want deleted\MyPrograms\SB_Projects\Finch_full\`
- **linux** → Linux laptop (same repo, separate branch). Example path: `~/Desktop/Projects/Finch_full`
- Confirm branch and remotes before pushing (see Section 1).

## 3. Tech Stack
- **Tauri v2**: Native desktop shell and secure Rust-to-React bridge.
- **React 19**: Frontend UI framework using the latest concurrent features.
- **TypeScript**: Type safety across the entire frontend and IPC layer.
- **Vite**: Ultra-fast build tool and development server.
- **Tailwind CSS 4**: Utility-first styling with the latest engine optimizations.
- **Zustand**: Lightweight, hook-based global state management.
- **Motion (`motion`, `motion/react`)**: Animations and micro-interactions (Framer Motion successor API).
- **Shadcn/UI + Radix + Base UI**: Component primitives (`components/ui/` at repo root, app shells under `src/components/`).
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
├── .planning/       # GSD session state (STATE.md), phase plans, quick tasks, research
├── components/ui/   # Shared Shadcn-style primitives (import via @/components/ui/…)
├── src/
│   ├── components/  # App UI: chat, dashboard, sidebar (split sections), startup, modals, profile
│   ├── hooks/       # IPC, streaming (useAIStreaming), voice, persistence, shortcuts
│   ├── lib/         # Utilities, theme, constants
│   ├── store/       # Zustand slices (chat, model params, profile, …)
│   ├── types/
│   └── styles/
├── src-tauri/src/   # Rust: ipc/, providers/, search, voice, session, media import, …
├── src-tauri/capabilities/
├── public/
└── docs/
    ├── README.md    # Index of all documentation
    ├── product/     # BACKLOG, IDEAS, ROADMAP, scratch todo
    ├── planning/    # Startup / profile integration plans
    ├── qa/          # UAT logs
    ├── architecture/# Active codebase maps only
    ├── archive/     # Retired plans, migration notes, duplicates (read-only)
    └── superpowers/ # Specs + execution plans (product strategy, baseline gaps)
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
- Motion layout/height: `auto` conflicts with Zustand render cycles during slider drag. Use pure CSS max-height transitions for collapsible zones. Reserve Motion for discrete animations (e.g. chevron rotation, icon swaps).
- Local models use OpenAI-compatible /v1/chat/completions endpoints.
- Fallback context window for unknown local models: 32k (always overestimate fullness).

## 6. Planning System & Docs
The `.planning/` directory holds GSD-style state: **`STATE.md`** (milestone, phase history), **`phases/`** (execution plans), **`quick/`** (small tasks), **`research/`**. Read **`STATE.md`** at session start.

User-facing specs, roadmap, UAT, and architecture notes are under **`docs/`** — start from **`docs/README.md`** for the full map (product, planning, qa, architecture, archive, superpowers).

## 7. State Management
Zustand is used for global state. Slices are located in `src/store/`:
- `modelParamsSlice.ts`: LLM parameters (temperature, top_p, etc.) and persistence.
- `chatSlice.ts`: Chat history, active session management, and streaming state.
- `profileSlice.ts`: User profiles, preferences, and theme configuration.
No Redux or Context is used for global state.

## 8. Key Providers & IPC Flow
LLM providers live in `src-tauri/src/providers/` (Anthropic, OpenAI, Gemini, local/Ollama-LMStudio). Chat streaming goes through IPC (e.g. `stream_message` / channel handlers in the chat path). `useAIStreaming` passes `attachments` when present; Rust merges them via `inject_attachments_into_messages` in `providers/mod.rs` into provider-specific payloads. Real-time streaming uses Tauri Channels with `.onmessage`. Stats/tokens surface as structured events at end of stream. Web search uses `search.rs` plus provider modules (Tavily, Brave, SearXNG) and injects `search_*` events before the model reply.

## 9. Current State & Priority Work

Core phases through sidebar refactor and context intelligence are done. Voice (local Whisper, marketplace download, `start_recording` / `stop_recording`) is implemented end-to-end; `STATE.md` may still list Phase 13 or LM Studio stats polish — treat **STATE.md** + **docs/product/BACKLOG.md** as the live gap list.

### Feature audit (synced with codebase, 2026-04-19)

| Feature | Status |
|---|---|
| Multi-provider, streaming, Markdown + Shiki, persistence (`save_chat`) | ✅ Wired |
| Web search (Tavily / Brave / SearXNG) | ✅ Wired |
| Sidebar search, incognito, profiles, context overflow modal | ✅ Wired |
| **Attachments → Rust → model** | ✅ Wired (`useAIStreaming` → `attachments`, Rust injection). BACKLOG still tracks **UX**: image thumbnail in input, broader file-picker extensions, multi-file. |
| **AI message copy** | ✅ Wired (`MessageBubble.tsx`). BACKLOG: layout vs `MetadataRow`, discoverability (often hover). |
| **Regenerate** | ✅ Wired for **last** assistant message (`ChatArea.tsx` passes `onRegenerate` only there). BACKLOG: extend to more messages, reduce hover-only discovery. |
| **Auto-named chat titles** | ✅ Wired (`Dashboard.tsx` `autoNameChat` → `send_message` title prompt on first user message). Substring title remains fallback until save/async rename. |
| **Edit user message + resend** | ✅ Wired (`onEditResend` → truncate → `invokeStream`). |

### Current priority
Baseline work is mostly **polish and parity**, not missing greenfield flows. Follow the ordered **Baseline** section in `docs/product/BACKLOG.md` (AI actions layout/visibility, attachment UX, Advanced settings tab, etc.). Longer-term differentiators stay in the same BACKLOG and in `docs/product/IDEAS.md`.

### Above-baseline (defer until BACKLOG baseline is closed)
OmniSearch, vector memory, Artifacts, Finch Projects, Ghost Context, Semantic Vault — see `docs/product/BACKLOG.md` and `docs/product/IDEAS.md`.

## 10. Agent Conventions
- Read STATE.md before starting any task.
- Surgical edits only. Never output full file contents. Use str_replace or equivalent targeted edits.
- Never rewrite a file that wasn't explicitly scoped.
- **Push to `full-repo` (private) only**: `git push full-repo linux:main`. Public repo pushes are suspended — see Section 1.
- The GSD planning system (get-shit-done-cc) is installed globally. STATE.md is the source of truth.
- When uncertain about a file's role, read it — do not assume.
