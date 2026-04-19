# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server on port 1420 (strictPort)
npm run build      # Production build
npm run lint       # TypeScript type-check (tsc --noEmit)
npm run clean      # Remove dist/
npm run tauri      # Tauri CLI (requires src-tauri/ on this branch)
```

To run the full desktop app (requires Rust toolchain + src-tauri/):
```bash
npm run tauri dev
npm run tauri build
```

The frontend runs standalone in a browser via `npm run dev` — Tauri IPC calls are mocked when `window.__TAURI_INTERNALS__` is absent (see `isTauri()` in `src/lib/tauri-utils.ts`).

Set `DISABLE_HMR=true` to disable hot-module replacement (used during agent edits to prevent flickering).

## Architecture

### Dual-repo setup
This is the **private** (`Finch_full`) repo containing `src-tauri/`. The public repo (`Finch`) excludes it. **Never push to `origin`** — all pushes go to `full-repo` (private) only: `git push full-repo linux:main`. Before any private push, swap `.gitignore`: `cp .gitignore.private .gitignore`, then restore with `cp .gitignore.public .gitignore` after.

### Path alias
`@/` resolves to the **project root** (not `src/`). Imports look like `@/src/components/...`.

### IPC Security Model
All LLM API calls route through Rust IPC — **never from the renderer directly**. The Rust backend (`src-tauri/src/`) handles all provider communication and masks API keys before returning config to the frontend (`get_provider_config` returns `••••••••` for keys). Use `unmaskKey()` from `src/lib/tauri-utils.ts` at every call site that reads provider config.

Every new Tauri command must be registered in **both** `src-tauri/capabilities/default.json` and `finch.toml`. The build succeeds without this; only runtime silently fails.

Tauri v2 specifics:
- Channel uses `.onmessage` assignment — not `.onData()`
- JS invokes use camelCase keys (e.g. `modelId`) — Tauri auto-converts to `snake_case` in Rust
- Use `handle.store()` via `StoreExt` — not `handle.get_store()` (returns `None` if JS side hasn't loaded yet)

### Streaming Flow
`useAIStreaming` (`src/hooks/useAIStreaming.ts`) opens a `Channel<string>` and calls `invoke("stream_message", ...)`. The channel receives JSON events:
- `text` → token chunk
- `search_start` / `search_source` / `search_done` → web search progress (injected before LLM response)
- `stats` → final metrics (`total_tokens`, `total_duration`, `tokens_per_second`, `input_tokens`, `output_tokens`, `stop_reason`)

History passed to `stream_message` maps `role: 'ai'` → `'assistant'` and excludes the last message (the in-flight prompt).

### State Management
Three Zustand stores with `persist` middleware (localStorage):

| Store | Key | Contents |
|---|---|---|
| `useModelParams` | `finch-model-params` | temperature, top_p, maxTokens, etc. |
| `useChatStore` | `finch-chat-state` | sessions, messages, streaming state (`tokensUsed` and `voiceStatus` excluded from snapshot) |
| `useProfileStore` | `finch-profile-state` | profiles, active profile, themes |

All exported from `src/store/index.ts`.

### App Boot
`App.tsx` loads profiles via `useProfileStore`, checks `localStorage` for `finch_remembered_profile`, then renders either `<Dashboard />` (active profile exists) or `<StartupScreen />` (profile selection).

### Context Windows
`src/lib/contextWindows.ts` provides `getContextWindowSize(modelId)` for cloud models and `getLocalModelFallback()` which returns `32768` for unknown local models (intentionally conservative — always overestimate fullness).

### Animation Rule
Framer Motion `height: auto` conflicts with Zustand render cycles during slider drag. Use pure CSS `max-height` transitions for collapsible zones. Reserve Framer Motion for discrete animations (e.g. chevron rotation).

### Planning System
`.planning/STATE.md` is the source of truth for current phase and task state. Read it at the start of any session. Detailed plans live in `.planning/phases/`, ad-hoc tasks in `.planning/quick/`.

Current status: **Phase 13 (Voice Transcription) in progress**, Phases 14–15 already completed. Two incomplete backend plans: D-12-01 (total_duration from LM Studio) and D-12-02 (frontend stats parser priority).
