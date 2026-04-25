# FINCH — Stability Fix Tracker
**Audit date:** 2026-04-25 | **Branch:** main | **Source:** Unified Flash + Pro triage
**Ground truth:** AGENTS.md (17 rules)

---

## Phase 1 — Quick Wins (< 30 min total, zero risk)

- [x] **Purge stale sessionId refs** — Ctrl+F `sessionId: "69f910"` and `#region agent log` across entire repo. Delete every hit. *(AGENTS.md Rule 17)*
- [x] **Toast streaming error in Dashboard.tsx** — Extract `error` from `useAIStreaming`, wire to `toast.error(error)` via `useEffect`. ~2 lines.
- [x] **401/403 parsing in providers** — Surface "Invalid API key" / "Rate limited" instead of generic stream failure. Start with `anthropic.rs`, then OpenAI, Gemini, local. 5 min per file.

---

## Phase 2 — Frontend Safety (1–2 hrs, medium complexity)

- [x] **Global React ErrorBoundary** *(DEFERRED to Phase 4)*
- [x] **Silent IPC catch blocks → sonner toasts**
  - Files: `src/hooks/useChatEngine.ts:206`, `useChatPersistence.ts`, `useModelPolling.ts`
  - Pattern: replaced bare `catch (e) { console.error(...) }` with `toast.error("...")` + `console.error(e)`
  - **Note**: `useModelPolling.ts` includes a guard to prevent toast spam.
- [x] **Corrupted store recovery**
  - Wrapped store load in `lib.rs` with error logging and frontend event emission.

---

## Phase 3 — Backend Hardening (2–3 hrs, highest complexity)

- [ ] **voice.rs — unwrap refactor** *(HIGH severity)*
  - Run: `grep -n "\.unwrap()\|\.expect(" src-tauri/src/voice.rs`
  - All `.lock().unwrap()` → `.lock().unwrap_or_else(|e| e.into_inner())`
  - All `.expect("failed to create state")` / `.expect("failed to get segments")` → `?` operator returning `Result<_, String>`
  - Bubble errors up to IPC layer, let frontend toast them
  - **Est:** 45 min

- [ ] **HTTP status check before stream processing**
  - Files: `openai.rs`, `local.rs`, `gemini.rs`, `anthropic.rs`, `ollama` (if separate)
  - Add before `bytes_stream()`:
    ```rust
    if !resp.status().is_success() {
        return Err(format!("Provider error: {}", resp.status()).into());
    }
    ```
  - **Est:** 30 min (6 min/file)

- [ ] **Serialization unwraps in streaming threads**
  - Files: `openai.rs:180`, `local.rs:250`, `gemini.rs:267`, `anthropic.rs:234`
  - Replace `serde_json::to_string(...).unwrap()` with graceful log + skip
  - **Est:** 20 min

- [ ] **`StreamingEvent::Error(String)` variant** *(MEDIUM — typed protocol)*
  - File: `src-tauri/src/types.rs`
  - Add `Error(String)` to the enum
  - Update match arms in all provider files
  - Handle in `useAIStreaming.ts` — map to `toast.error`
  - **Est:** 45 min

---

## Phase 4 — Telemetry (parallel agent — see prompt below)

- [ ] **Sentry install + Rust init** *(HIGH severity — flying blind without this)*
  - `Cargo.toml`: `tauri-plugin-sentry = "0.5"`, `sentry = "0.42"`
  - `lib.rs`: init with `auto_session_tracking: true`, `release: sentry::release_name!()`
  - DSN via env var `SENTRY_DSN` — never hardcoded
  - **Handled by parallel agent**

- [ ] **Sentry React SDK** *(frontend counterpart)*
  - `npm install @sentry/react`
  - Init in `main.tsx` BEFORE ErrorBoundary mounts
  - Wire `componentDidCatch` in ErrorBoundary to `Sentry.captureException`
  - **Handled by parallel agent**

---

## Recommended Attack Order

1. Phase 1 — Quick Wins (do now, zero risk, instant UX improvement)
2. Phase 2a — ErrorBoundary (15–45 min, prevents white screens)
3. Phase 4 — Telemetry (parallel agent running simultaneously)
4. Phase 2b — Silent IPC toasts (1 hr, plugs UX black holes)
5. Phase 3a — voice.rs unwrap refactor (highest panic density)
6. Phase 3b — HTTP status checks in providers (clean error messages)
7. Phase 3c — StreamingEvent::Error variant (typed protocol, last because it touches most files)

---

## Antigravity Prompt — Telemetry (paste to Gemini agent)

```
Task: Install and configure crash telemetry for the Finch desktop app (Tauri v2 + React 19).

Context:
- Tauri v2 project. Rust backend at src-tauri/. React frontend at src/.
- AGENTS.md hard constraints apply — do not violate them.
- Key constraint: all IPC via getTauriInvoke() from src/lib/tauri-utils.ts. Never window.__TAURI__.invoke directly.
- Key constraint: handle.store() via StoreExt only.

Step 1 — Rust (Cargo.toml + lib.rs):
- Add to Cargo.toml: tauri-plugin-sentry = "0.5" and sentry = "0.42"
- In lib.rs, initialize Sentry BEFORE the Tauri builder:
  let _guard = sentry::init(sentry::ClientOptions {
      dsn: option_env!("SENTRY_DSN").map(|d| d.parse().unwrap()),
      release: sentry::release_name!(),
      auto_session_tracking: true,
      ..Default::default()
  });
- DSN must come from SENTRY_DSN env var only. Never hardcode it.
- Register the plugin in the Tauri builder: .plugin(tauri_plugin_sentry::init())

Step 2 — React (main.tsx):
- npm install @sentry/react
- Initialize Sentry in main.tsx BEFORE ReactDOM.createRoot():
  Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 0.2,
  })
- VITE_SENTRY_DSN must come from .env.local only.

Step 3 — ErrorBoundary:
- Create src/components/ErrorBoundary.tsx as a class component.
- componentDidCatch should call Sentry.captureException(error).
- Render a fallback UI with two buttons: "Reload App" (window.location.reload()) 
  and "Clear State & Reload" (clears localStorage key finch_remembered_profile, 
  then reloads).
- Do NOT use Zustand inside the fallback — the store may be the crash source.
- Wrap <App /> in main.tsx with <GlobalErrorBoundary>.

Step 4 — Environment files:
- Add SENTRY_DSN to .env.example (blank value, with comment).
- Add VITE_SENTRY_DSN to .env.example (blank value, with comment).
- Confirm both are already in .gitignore or add them.

Do not touch any other files. Show me the diff for each file before applying.
```

---

## Verified Hallucination Status (post-verification)

| Claim | Source | Final Verdict |
|---|---|---|
| Dashboard.tsx:70 | Flash | ✅ Verified correct |
| types.rs:62 | Flash | ✅ Verified correct |
| voice.rs line numbers | Both | ✅ Both correct — file is riddled with .unwrap() |
| useAIStreaming hook name | Flash | ✅ Canonical name confirmed |

---

*Last updated: 2026-04-25 | Next review after Phase 3 complete*
