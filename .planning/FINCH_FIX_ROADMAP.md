# Finch — Bug Fix & Audit Roadmap
> Source: Backend audit conducted April 2026 via Antigravity.
> Branch: linux (authoritative). Verify on linux branch before every fix.
> Agent rule: read STATE.md before starting any session. This file is a fix queue, not a phase plan.

---

## 🚨 MANDATORY DUAL-REPO SAFETY PROTOCOL
This project exists in two states: **Public** (Frontend only) and **Private** (Full code).
**BEFORE STARTING ANY FIX:**
1. Read the **🚨 DUAL-REPOSITORY SAFETY PROTOCOL** in `AIreadme.md`.
2. Determine if the fix involves the backend (`src-tauri/`).
3. If it involves the backend: You **MUST** push to `full-repo` (Private) only.
4. If it is frontend-only: You **MAY** push to both `origin` (Public) and `full-repo` (Private).
5. **NEVER** push to `origin` while `.gitignore` is in the "Private" state or if `src-tauri/` is tracked.

---

## How to Use This File

- Issues are grouped into **fix waves** by risk category.
- Each wave should be planned and executed as a unit before moving to the next.
- Waves 1–3 are blockers. Do not start Wave 4+ until Waves 1–3 are clean.
- Each issue includes: severity, file path, repo target, problem, and fix direction.
- **Repo Target**: `Public` (Both repos), `Private` (Private repo only).
- When an issue is resolved: mark it `[x]` and add the commit hash next to it.
- Agent tool: Gemini CLI for multi-file fixes, Antigravity for single-file surgical edits.

---

## Wave 1 — Data Integrity (Fix First, No Exceptions)

These three issues can silently destroy user data or cause entire feature categories to fail without any visible error. Nothing else matters until these are clean.

---

### W1-1 — Capability manifest gaps
- **Severity**: Critical
- **Files**: `src-tauri/capabilities/default.json`, `finch.toml`
- **Repo Target**: `Private`
- **Problem**: Every `#[tauri::command]` in Rust must have a corresponding `allow-[command-name]` entry in both files. Missing entries fail silently at runtime — no console error, no thrown exception, the invoke just returns nothing. The build passes without them. The following commands were found in frontend invoke calls and must be verified in the manifest:
  - `stream_message`, `abort_generation`
  - `get_provider_config`, `save_provider_config`, `update_search_config`
  - `list_chats`, `save_chat`, `delete_chat`
  - `get_profiles`, `save_profile`, `delete_profile`
  - `get_context_intelligence`
  - `get_model_loaded_status`
  - `list_local_models`, `list_audio_devices`, `set_audio_device`
  - `start_recording`, `stop_recording`, `get_transcription_status`
  - `download_voice_model`, `list_downloaded_voice_models`
  - `eject_model`
  - `set_background_image`
- **Fix direction**: Cross-reference every invoke call in `src/hooks/` and `src/components/` against both manifest files. Pattern is `allow-stream-message`, `allow-abort-generation` etc. (kebab-case of the snake_case command name). Add any missing entries. Test each command manually after.
- **Agent**: Gemini CLI (multi-file read + edit)
- [ ] Resolved — commit: ___

---

### W1-2 — isLoaded set on failed chat load
- **Severity**: High
- **File**: `src/hooks/useChatPersistence.ts` — lines 44–108
- **Repo Target**: `Public`
- **Problem**: `isLoaded.current = true` is set in the `finally` block (line 107), which runs whether or not `invoke('list_chats')` succeeded. If the load throws, `isLoaded` is still true and the reactive save effect immediately fires with default/empty state — overwriting persisted settings with blank defaults. This is a silent data loss path.
- **Fix direction**: Move `isLoaded.current = true` inside the `try` block, after all data has been loaded successfully. In the `catch` block, log the error and leave `isLoaded.current = false` so the save effect never fires after a failed load.
- **Agent**: Antigravity (single-file surgical edit)
- [ ] Resolved — commit: ___

---

### W1-3 — Web search flag silently dropped
- **Severity**: High
- **File**: `src/hooks/useAIStreaming.ts` — lines 160–168
- **Repo Target**: `Public`
- **Problem**: `enable_web_search` is added manually as snake_case on line 166, then `...params` is spread on line 167 which also contains `enableWebSearch`. In a JS object literal, the last key wins — the spread overrides the explicit line 166 key. Web search may silently never activate because Tauri receives a duplicate key and the camelCase version (which Tauri correctly converts) is dropped.
- **Fix direction**: Delete line 166 entirely. `enableWebSearch` in the `params` spread will be sent as camelCase and Tauri will convert it to `enable_web_search` automatically. Never manually snake_case keys in the JS invoke payload — this is an architecture rule.
- **Agent**: Antigravity (single-file, one-line deletion)
- [ ] Resolved — commit: ___

---

## Wave 2 — Security Hardening

Defense-in-depth fixes for API key handling. The Rust masking layer is correct, but the frontend has no second line of defense if masking ever regresses.

---

### W2-1 — API key written into React state (ProviderSection)
- **Severity**: High
- **File**: `src/components/dashboard/ProviderSection.tsx` — lines 34–37
- **Repo Target**: `Public`
- **Problem**: On mount, `get_provider_config` is called and the response is written directly into `value` state. Rust currently returns `"••••••••"` for keys, so no raw key lands in state. But this is entirely trust-based — if masking ever regresses (dev build, new provider, missing mask path), the raw key lands in React state and is accessible via `document.querySelector('input').value` from any renderer JS context.
- **Fix direction**: For inputs of `type === 'key'`, never store the returned value in state at all. Instead store only a boolean `keyIsSet: true/false`. The input field starts empty and only accepts new plaintext from the user. Remove the conditional mask-check workaround in `handleSave` — solve it here at the source.
- **Agent**: Antigravity (single-file)
- [ ] Resolved — commit: ___

---

### W2-2 — Search provider key string in component state (SearchOnboarding)
- **Severity**: Medium
- **File**: `src/components/chat/SearchOnboarding.tsx` — lines 31–32, 93
- **Repo Target**: `Public`
- **Problem**: Tavily and Brave API keys are written into `useState` fields after filtering the `"••••••••"` sentinel. The `onComplete` callback then passes the raw key string back to `WebSearchControl.tsx` line 186 where it lands in local config state. The actual key value lives in React state in two places simultaneously.
- **Fix direction**: Same pattern as W2-1. Never store the key string beyond the controlled `<input>` element the user typed it into. The `onComplete` callback should pass a boolean or provider name — not the key value. `WebSearchControl` should only care about which provider is active, not what the key is.
- **Agent**: Antigravity (single-file, touch SearchOnboarding only; leave WebSearchControl for a separate pass)
- [ ] Resolved — commit: ___

---

## Wave 3 — User-Visible Correctness

These are issues the user sees directly. Token counts are wrong, error messages are unreadable, and context limits block sends on valid models.

---

### W3-1 — Token counter counts stream chunks, not tokens
- **Severity**: High
- **File**: `src/hooks/useAIStreaming.ts` — lines 59, 77, 106, 121, 171–178
- **Repo Target**: `Public`
- **Problem**: `tokenCount.current` is incremented once per `"text"` stream event, which counts chunks — not tokens. LM Studio/Ollama send one chunk per word; Anthropic/OpenAI send multiple tokens per chunk. Both directions are wrong. The fallback stats block on lines 171–178 stores this chunk-count as `totalTokens` in message metadata, so the UI displays a meaningless number labeled "tokens."
- **Fix direction**: Remove `tokenCount.current` entirely as a token counter. Display `totalTokens` only when it arrives from the `__STATS__:` sentinel event. If no stats event arrives, set `totalTokens: undefined` — never fabricate a count. `incrementTokensUsed` should only fire when `inputTokens > 0 || outputTokens > 0`.
- **Agent**: Antigravity (single-file)
- [ ] Resolved — commit: ___

---

### W3-2 — Context window map contains fake model IDs
- **Severity**: Medium
- **File**: `src/lib/contextWindows.ts` — lines 8–31
- **Repo Target**: `Public`
- **Problem**: The static map contains model IDs that do not exist: `claude-4-7-opus`, `claude-4-6-sonnet`, `gpt-5.4-pro`, `gemini-3.1-pro`, `o3-preview` and others. When a user selects a real model (`claude-opus-4-5`, `gemini-2.0-flash`, etc.), `getContextWindowSize` returns `null`. This cascades into the `ci?.hardware_safe_limit || 8192` fallback in `Dashboard.tsx` line 131 — a hard 8k cap that blocks sends if `maxTokens > 8192`, even on 200k-context models.
- **Fix direction**: Replace all speculative IDs with real released IDs and confirmed context sizes. Verified IDs as of April 2026:
  - Claude: `claude-opus-4-5` (200k), `claude-sonnet-4-5` (200k), `claude-haiku-4-5` (200k)
  - OpenAI: `gpt-4o` (128k), `gpt-4o-mini` (128k), `o1` (200k), `o3` (200k)
  - Gemini: `gemini-2.0-flash` (1M), `gemini-2.5-pro` (1M)
  - Also update the 8192 fallback in `Dashboard.tsx` line 131 to `32768` minimum.
- **Agent**: Gemini CLI (verify against provider docs before writing — do not guess IDs)
- [ ] Resolved — commit: ___

---

### W3-3 — contextIntelligence hardcoded to 8192 for all providers
- **Severity**: Medium
- **File**: `src/store/modelParamsSlice.ts` — lines 38–43
- **Repo Target**: `Public`
- **Problem**: `contextIntelligence` initializes to `{ hardware_safe_limit: 8192, model_max: 8192, server_num_ctx: 8192 }` and resets to the same values. Cloud providers (Anthropic, OpenAI, Gemini) have no hardware constraint — but the overflow modal in `Dashboard.tsx` line 131 fires against this 8192 limit for all of them.
- **Fix direction**: Initialize `contextIntelligence` to `null`. In `Dashboard.tsx` line 131, guard the overflow check with `ci !== null` — when null, skip the overflow modal entirely. The user is on a cloud provider with no hardware limit.
- **Agent**: Antigravity (two-file, small edit in each — run as one prompt)
- [ ] Resolved — commit: ___

---

### W3-4 — All provider errors display as "[object Object]"
- **Severity**: Medium
- **File**: `src/hooks/useAIStreaming.ts` — lines 183–188
- **Repo Target**: `Public`
- **Problem**: Tauri v2 IPC errors serialize from Rust as plain strings, `{ message: string }` objects, or error wrappers. `err.toString()` on a serialized object returns `"[object Object]"`. Rate limit errors, invalid API keys, quota exceeded — all show as `"Error: [object Object]"` in the error toast.
- **Fix direction**: Replace `err.toString()` with: `typeof err === 'string' ? err : (err?.message || err?.error || JSON.stringify(err))`. Test with a bad API key (401) and a rate limit (429) from Anthropic to confirm which shape Rust serializes these as.
- **Agent**: Antigravity (single-file, one-line change)
- [ ] Resolved — commit: ___

---

### W3-5 — Session token stats always zero
- **Severity**: Medium
- **File**: `src/components/dashboard/Dashboard.tsx` — line 114
- **Repo Target**: `Public`
- **Problem**: `updateActiveSessionInList` hardcodes `stats: { totalTokens: 0, totalMessages: ..., averageSpeed: 0 }` on every save. Token stats live in `message.metadata` on the last AI message but are never aggregated into `ChatSession.stats`. The sidebar chat list always shows 0 tokens for every session.
- **Fix direction**: In the `onComplete` callback (line 156), after updating the final message metadata, compute session-level stats: sum all `message.metadata?.totalTokens` values, count messages, compute average speed from metadata. Pass this aggregated object to `updateActiveSessionInList` instead of hardcoded zeros.
- **Agent**: Antigravity (single-file)
- [ ] Resolved — commit: ___

---

## Wave 4 — Streaming Integrity

These issues affect streaming reliability: garbage injected into responses, partial stats after abort, and voice poll instability.

---

### W4-1 — Legacy non-JSON fallback injects garbage into responses
- **Severity**: Medium
- **File**: `src/hooks/useAIStreaming.ts` — lines 150–157
- **Repo Target**: `Public`
- **Problem**: If `JSON.parse` fails on a stream event, the fallback calls `onToken(eventJson)` when the string doesn't start with `{`. Any malformed Rust output (partial flush, debug log, newline) that isn't JSON gets injected directly into the chat message as content. User sees garbage with no error indication.
- **Fix direction**: Remove the legacy fallback entirely. On `JSON.parse` failure: log the raw string and call `onError` or skip silently. Never inject unparseable data into the message stream.
- **Agent**: Antigravity (single-file)
- [ ] Resolved — commit: ___

---

### W4-2 — Abort doesn't cancel the channel handler
- **Severity**: Medium
- **File**: `src/hooks/useAIStreaming.ts` — lines 96–97, 181–188
- **Repo Target**: `Public`
- **Problem**: When `abort()` fires, `invoke("abort_generation")` is called but the channel's `onmessage` handler is still active. Stale events may still arrive and be processed. `setIsStreaming(false)` is called from the catch block, not from the abort itself — if `invoke` returns before the channel drains, `onComplete` fires with partial stats.
- **Fix direction**: Add `isCancelled` ref inside `streamMessage`. Set to `true` in the abort path. Add `if (isCancelled.current) return` at the top of `channel.onmessage`. Call `setIsStreaming(false)` directly from the abort callback, not just the catch handler.
- **Agent**: Antigravity (single-file)
- [ ] Resolved — commit: ___

---

### W4-3 — Voice transcription poll interval instability
- **Severity**: Low
- **File**: `src/hooks/useVoiceTranscription.ts` — lines 36–64
- **Repo Target**: `Public`
- **Problem**: Poll interval stored as a `let` local to the effect, not a `useRef`. Component re-renders during `status === 'transcribing'` cause the effect to clean up and restart, briefly running overlapping intervals. `onTranscriptionComplete` in the dependency array re-runs the effect whenever the parent passes an inline function.
- **Fix direction**: Move interval storage to `useRef`. Wrap `onTranscriptionComplete` in `useCallback` in the parent. Alternatively, replace polling entirely with a Tauri `listen` event for the transcription result.
- **Agent**: Antigravity (single-file)
- [ ] Resolved — commit: ___

---

## Wave 5 — Storage & Persistence Cleanup

---

### W5-1 — Stale dependency array in useChatPersistence
- **Severity**: Medium
- **File**: `src/hooks/useChatPersistence.ts` — lines 112, 133
- **Repo Target**: `Public`
- **Problem**: `profileName`, `profileEmail`, `customBgLight`, `customBgDark` are in the reactive save effect dependency array but are not included in the saved payload. The effect re-runs on every profile edit and fires unnecessary IPC calls that save nothing related to those values.
- **Fix direction**: Remove `profileName`, `profileEmail`, `customBgLight`, `customBgDark` from the dependency array. Profile saves are handled by `useProfileStore.saveProfile` in `Dashboard.tsx` — `useChatPersistence` should not pretend to handle them.
- **Agent**: Antigravity (single-file)
- [ ] Resolved — commit: ___

---

### W5-2 — tokensUsed persists across sessions (cumulative forever)
- **Severity**: Low
- **File**: `src/store/index.ts` — lines 7–38
- **Repo Target**: `Public`
- **Problem**: `finch-chat-state` uses Zustand `persist` middleware which rehydrates `tokensUsed` from localStorage on every app launch. The counter grows forever across all sessions. User sees 500k tokens "used" on first message of a new session.
- **Fix direction**: Add `partialize` to the `useChatStore` persist config to exclude `tokensUsed`: `partialize: (state) => { const { tokensUsed, ...rest } = state; return rest; }`. `tokensUsed` should reset to 0 on every app launch.
- **Agent**: Antigravity (single-file)
- [ ] Resolved — commit: ___

---

## Wave 6 — Local Model Handling

---

### W6-1 — 32k fallback not implemented for unknown local models
- **Severity**: Medium
- **File**: `src/lib/contextWindows.ts` — lines 56–57
- **Repo Target**: `Public`
- **Problem**: `getContextWindowSize` returns `null` for any model not in its static map. For local models (Ollama, LM Studio), this is the common case since model names are user-defined. The architecture rule states: "Fallback context window for unknown local models: 32k (always overestimate fullness)." This rule is not implemented — the function returns `null`, not `32768`.
- **Fix direction**: Accept an optional `provider` parameter in `getContextWindowSize`. If `provider` matches a local provider ID and the model is not in the map, return `32768`. This matches the documented architecture rule.
- **Agent**: Antigravity (single-file)
- [ ] Resolved — commit: ___

---

### W6-2 — Local model polling may never activate
- **Severity**: Medium
- **File**: `src/hooks/useModelPolling.ts` — lines 26–29, 54
- **Repo Target**: `Public`
- **Problem**: Polling only activates for providers whose name `startsWith('local_')`. If LM Studio uses `'lmstudio'` and Ollama uses `'ollama'` (without the prefix), `setIsModelLoaded(true)` is called unconditionally and polling never starts. 30-second poll interval means a model that becomes ready at second 5 shows as "not loaded" for another 25 seconds.
- **Fix direction**: Confirm exact provider ID strings from the Rust backend. Update the check to use an explicit allowlist: `['local_lmstudio', 'local_ollama', 'lmstudio', 'ollama'].includes(selectedProvider)`. Use a shared constant in `src/lib/` so this list is maintained in one place. Reduce initial re-poll cadence to 5 seconds for the first 60 seconds after a model switch.
- **Agent**: Gemini CLI (confirm provider IDs in Rust first, then edit)
- [ ] Resolved — commit: ___

---

## Wave 7 — Minor UX & Architecture Debt

Low severity, no blocking risk. Address after Waves 1–6 are complete.

---

### W7-1 — Array index used as React key in ChatArea
- **Severity**: Low
- **File**: `src/components/chat/ChatArea.tsx` — line 129
- **Repo Target**: `Public`
- **Problem**: `MessageBubble` uses array index as the React key. If a message above the streaming bubble is deleted, React destroys and recreates the streaming bubble, losing accumulated content.
- **Fix direction**: Add a stable `id: string` field to the `Message` type in `src/types/chat.ts` (assign `crypto.randomUUID()` at creation in `handleSend`). Use `message.id` as the key.
- **Agent**: Antigravity (two-file: types + ChatArea)
- [ ] Resolved — commit: ___

---

### W7-2 — Voice model selection not persisted
- **Severity**: Low
- **File**: `src/hooks/useVoiceTranscription.ts` — line 128
- **Repo Target**: `Public`
- **Problem**: `stopRecording` falls back to `installedModels[0]` when no model is specified. If the user has multiple models installed, the first one alphabetically is always used regardless of any UI selection.
- **Fix direction**: Add `selectedVoiceModel` state (default to `installedModels[0]` on load). Expose a setter for UI. Pass it explicitly to `stopRecording`.
- **Agent**: Antigravity (single-file)
- [ ] Resolved — commit: ___

---

### W7-3 — AIreadme phase status inaccurate
- **Severity**: Low
- **File**: `AIreadme.md`
- **Repo Target**: `Public`
- **Problem**: README states Phases 14–15 (Token Enrichment & Context Intelligence) are partially implemented or complete. Per audit: token display is chunk-counts (not provider-reported), session-level token aggregation is unimplemented, and the context window map contains non-existent model IDs. Future agents will skip these areas assuming they are done.
- **Fix direction**: Update phase status in AIreadme.md and STATE.md to accurately reflect what is and is not complete. Mark token enrichment as incomplete pending W3-1, W3-2, W3-5 resolution.
- **Agent**: Gemini CLI (after Waves 1–3 complete)
- [ ] Resolved — commit: ___

---

## Future Planning (Not Yet Scoped)

These are architectural improvements that came out of the audit but are not bugs — they are design upgrades that need full phase planning before execution.

---

### FP-1 — Context Health System (Phase 14 full implementation)
- Token counting fixes (W3-1, W3-2, W3-3) must be complete first.
- Design already exists: thin pill between chat input and disclaimer, green/yellow/red status, live token count.
- Needs: real token data flowing from provider → Rust stats → JS `onComplete` → context bar.
- Blocked by: W3-1, W3-2, W3-3.

---

### FP-2 — Smart Context Reset (Phase 14 extension)
- One-click compress: call current model, summarize conversation, start fresh chat with summary pre-loaded.
- Blocked by: FP-1 (needs working context health signal first).

---

### FP-3 — Unified Command Palette (Phase 16 or later)
- Cmd+K palette: tab switching, search, agent dispatch.
- Replaces sidebar search entirely.
- No dependency on audit fixes — can be scoped independently.
- Design reference: Zen Browser tab switcher, Raycast, Linear.

---

### FP-4 — SandboxedBrowser Phase 15 (Current Active Phase)
- Embedded mini-browser using `WebviewBuilder::new` + `window.add_child()` with `unstable` Cargo feature.
- 4 subphases: Rust foundation → multi-tab state → command palette → polish.
- Phase 15-01 plan already written — single embedded tab proof of concept.
- Not blocked by any audit findings.

---

## Quick Reference: Severity Map

| Wave | Issues | Risk |
|------|--------|------|
| Wave 1 | W1-1, W1-2, W1-3 | Silent data loss / features broken with no error |
| Wave 2 | W2-1, W2-2 | API key in renderer state if Rust masking regresses |
| Wave 3 | W3-1 through W3-5 | User-visible: wrong token counts, blocked sends, unreadable errors |
| Wave 4 | W4-1, W4-2, W4-3 | Streaming garbage injection, abort race condition |
| Wave 5 | W5-1, W5-2 | Unnecessary IPC calls, misleading lifetime token counter |
| Wave 6 | W6-1, W6-2 | Local model context fallback missing, polling may never start |
| Wave 7 | W7-1, W7-2, W7-3 | Minor UX + documentation debt |

---

## Agent Quick-Start

When starting a new session to fix items from this file:

1. Run `/gsd:resume-work` in Gemini CLI
2. Read `.planning/STATE.md`
3. Read this file — find the first unchecked `[ ]` item in the lowest wave number
4. If the fix is single-file: use Antigravity
5. If the fix is multi-file or requires Rust reads: use Gemini CLI with `/gsd:plan-phase`
6. After each fix: mark `[x]`, add commit hash, push to GitHub
7. Do not skip ahead to a higher wave until the current wave is fully checked off
