# Finch AI Instructions

## 🚨 REPO SAFETY (CRITICAL)
- Remote `origin` = private **Finch_full** repo. All commits push there.
- **`main`** → Windows (`C:\Random things i dont want deleted\Finch\finch-sandbox\`)
- **`linux`** → Lenovo Linux laptop (same repo, separate branch)
- Confirm branch before every git operation.

---

## 1. What This Is
Tauri v2 + React 19 + TypeScript desktop AI chat app. Multiple LLM providers (Anthropic, OpenAI, Gemini, Ollama, LM Studio) + real-time web search (Tavily, Brave, SearXNG). All LLM calls route through Rust IPC — API keys never reach the React renderer.

## 2. Tech Stack
**Frontend:** React 19, TypeScript, Vite (port 1420), Tailwind CSS v4, Zustand v5, Shiki v4 (async singleton), motion (Framer successor), react-markdown + remark-gfm, @base-ui/react, sonner, lucide-react, @tauri-apps/api v2.

**Backend:** Tauri 2, tauri-plugin-store, reqwest 0.12, tokio (full), serde/serde_json, whisper-rs, cpal, sysinfo, image, base64, sha2, uuid, chrono, futures-util, windows 0.58 (Win32, Windows-only).

> Canonical versions: `package.json` and `src-tauri/Cargo.toml`. Do not hardcode versions in this file.

## 3. Directory Structure
```
/
├── .cursor/rules/          # 10 project rules — read before touching architecture
├── .planning/              # STATE.md (read first), phases/, quick/, research/
├── AGENTS.md               # This file
├── CLAUDE.md               # Claude-specific mirrors of key rules
├── components/ui/          # Shared shadcn-style primitives — import via @/components/ui/…
├── src/
│   ├── components/         # chat/, dashboard/, sidebar/, startup/, studio/, profile/, modals/, artifacts/, ui/
│   ├── hooks/              # 14 hooks (streaming, voice, persistence, background, polling…)
│   ├── lib/                # Utilities: artifact parser/prompt, models, context windows, tauri-utils.ts
│   ├── store/              # 4 Zustand slices: chat, modelParams, profile, studio
│   └── types/              # chat.ts — Message, Artifact, ChatSession, Profile
├── src-tauri/src/
│   ├── lib.rs              # App setup, plugin registration, invoke_handler
│   ├── types.rs            # AppState, ProviderConfig, StreamingEvent
│   ├── ipc/                # 9 command modules (chat, models, sessions, settings, voice, profiles, artifacts, media_import, mod)
│   └── providers/          # 5 LLM clients (anthropic, openai, gemini, local, mod)
└── docs/                   # Specs, roadmap, UAT, architecture maps — start at docs/README.md
```

## 4. Architecture Rules — DO NOT VIOLATE
- **API keys never reach the React renderer.** All LLM calls through Rust IPC only. `get_provider_config` masks keys before returning to JS.
- **Every new `#[command]` needs `allow-[command-name]` in `capabilities/default.json`.** Build passes without it; runtime fails silently.
- **Tauri v2 Channel: `.onmessage` assignment only** — NOT `.onData()`.
- **Tauri auto-converts camelCase JS → snake_case Rust.** Send `modelId` from JS; Rust receives `model_id`. Never manually snake_case the JS payload.
- **`handle.store()` via `StoreExt` only** — NOT `handle.get_store()`. Returns `None` if JS side hasn't loaded the store yet. Exception: `lib.rs` init (lines 39–40) uses `get_store` intentionally.
- **`@/` alias resolves to project root** — NOT `src/`. Shared primitives: `@/components/ui/…`; app components: `@/src/components/…`.
- **Shiki is an async singleton.** Init once in `CodeBlock.tsx`. Never reinitialize per render.
- **4 Zustand stores max.** Never add a 5th. Stores: `useModelParams`, `useChatStore`, `useProfileStore`, `useStudioStore`.
- **Motion `layout` + `height: auto` conflicts with Zustand during slider drag.** Use pure CSS `max-height` for collapsible zones. Reserve Motion for discrete animations only.
- **Local models (Ollama + LM Studio) both route through `local.rs`** via OpenAI-compatible `/v1/chat/completions`. Fallback context window for unknown models: 32k.
- **Artifact parsing is client-side only.** `artifactParser.ts` single-pass regex. No Rust-side artifact events.
- **`tokensUsed`, `voiceStatus`, and `activeWorkspace` are excluded from Zustand persistence** (stripped in `chatSlice` partializer).
- **"Remember me" profile stored in `localStorage`** under key `finch_remembered_profile`, not the Tauri store.
- **Studio Canvas:** Use direct DOM mutation (`el.style.transform`) for drag/resize. Avoid `transition-all` on nodes. Cache `getBoundingClientRect` once at `pointerdown`. Zoom via `scale()` on world container; world coords = `delta / zoom`. Snap-to-grid: 32px constant.
- **Atomic artifact writes:** `.tmp` → rename pattern in `ipc/artifacts.rs`. Never write directly to final path.
- **All IPC calls use `getTauriInvoke()`** from `src/lib/tauri-utils.ts`. Never call `window.__TAURI__.invoke` directly.

## 5. State Management
| Store | Export | Persisted Key | Purpose |
|---|---|---|---|
| `useModelParams` | `useModelParams` | `finch-model-params` | LLM params, contextIntelligence |
| `useChatStore` | `useChatStore` | `finch-chat-state` | Provider, model, incognito, sidebar, dark mode, voice, activeWorkspace. Excludes `tokensUsed`, `voiceStatus`, `activeWorkspace` from persistence. |
| `useProfileStore` | `useProfileStore` | `finch-profile-state` | Profile list + active profile. Falls back to `localStorage` if not in Tauri |
| `useStudioStore` | `useStudioStore` | `finch-studio-state` | Studio nodes, panOffset, zoom. Excludes `studioStreamBuffer` |

## 6. IPC & Streaming
**Registered commands:** See `src-tauri/capabilities/default.json` for the authoritative list.

**Key modules:** `ipc/chat.rs` (send/stream/abort), `ipc/models.rs` (list, eject, preload, context intelligence), `ipc/sessions.rs` (CRUD), `ipc/settings.rs` (provider config, media, hardware, search), `ipc/voice.rs` (recording, transcription, devices, model download), `ipc/profiles.rs`, `ipc/artifacts.rs`.

**Streaming protocol** (`StreamingEvent` in `types.rs`): `text` → `search_start` → `search_source` → `search_done` → `stats`. Web search events always arrive before LLM text. `useAIStreaming.ts` batches `text` via `requestAnimationFrame`, flushes buffer before dispatching search/stats events.

**Attachments:** `useAIStreaming.ts` passes `attachments: { path: string }[]` to `stream_message`. `inject_attachments_into_messages` in `providers/mod.rs` reads, base64-encodes, and merges into provider payload.

## 7. Planning & Docs
- **Read `.planning/STATE.md` before every task.**
- `.planning/` → GSD state: `STATE.md`, `phases/`, `quick/`, `research/`
- `docs/` → user-facing specs, roadmap, UAT, architecture. Start at `docs/README.md`.
- Feature status / roadmap lives in `docs/product/` — not this file.

## 8. Known Gotchas
- **`ipc/settings.rs` — `remove_imported_media` whitelist:** Hardcoded dirs (`backgrounds`, `avatars`). New media types must be added here or deletion silently fails.
- **`ipc/media_import.rs` — Mod isolation:** Declared in `ipc/mod.rs` but not in `lib.rs` invoke_handler. Commands are routed via `settings.rs` instead. Verify before adding new media commands.
- **`studioSlice.ts` — `crypto.randomUUID()`:** Safe in Tauri (always secure context). Mock it in web-fallback / test environments.
- **`ipc/models.rs` - Debug Telemetry:** Do not add `#region agent log` blocks or hardcoded session IDs to IPC commands.

## 9. Agent Conventions
- **Read `STATE.md` before starting any task.**
- **Surgical edits only.** Never output full file contents unless explicitly asked.
- **Never rewrite a file that wasn't explicitly scoped.**
- **When uncertain about a file's role, read it** — do not assume.
- **Verify `capabilities/default.json`** when adding any new `#[command]`. Missing entries fail silently.
- **After every architectural task:** update `STATE.md` and `AGENTS.md` per `03-session-close.mdc`.

---

`Last updated: 2026-04-25` — Trim pass: removed version tables, feature audit (moved to docs/), redundant IPC registry, duplicate convention bullets. Cursor-optimized for signal density. Audit fixes: added `artifacts/` to component directory, corrected `useChatStore` partializer exclusions (`activeWorkspace` was missing).

## gstack Skills
Available skills via gstack — invoke by name:
- /review — Staff Engineer code review: finds bugs that pass CI but blow up in production
- /qa-only — QA Reporter: find bugs, report only, no code changes
- /investigate — Root-cause debugger: no fixes without investigation
- /cso — Chief Security Officer: OWASP Top 10 + STRIDE threat model
- /plan-eng-review — Eng Manager review: lock architecture, data flow, edge cases, tests

## FENCH QA Skill
A custom FENCH-specific audit skill lives at:
  .agent/skills/finch-qa-auditor/SKILL.md

Trigger with: "audit Finch", "QA audit", "production readiness check", "find performance issues", "cold-start UX review"

Modes: full | architecture | performance | ux | security | stability | gap-analysis