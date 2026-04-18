---
project: Finch
branch: linux
date: 2026-04-18
active_phase: Phase 13 (Voice Transcription — Local-First) / Post-Phase Audit
overall_status: IN_PROGRESS
roadmap_version: 1.0
---

# AUDIT ROADMAP

## HOW TO USE

### For Agents
Read this file at the start of every session before touching any code. The fix waves are ordered by dependency; do not begin a wave until all findings in prior waves are marked `done`. For each finding, check the `status` field: only proceed if `status: open`. When you complete a finding, update its `status` field to `done` in this file and commit the change alongside your code edit. Do not begin a fix if `status` is anything other than `open`. After completing an entire wave, run `cp .gitignore.private .gitignore && git push full-repo linux:main` before starting the next wave — public repo pushes are suspended (see AIreadme.md Section 1). Scope each edit surgically to the exact file and line range listed — do not refactor surrounding code unless it is the explicit fix direction. If a finding's fix requires touching a file not listed under that finding, stop and flag it to the human before proceeding.

### For Humans
This document tracks 20 specific bugs and data-integrity issues found during a cross-layer audit of the Finch codebase (frontend hooks, Zustand store, capability manifest, and component state). Findings are grouped into dependency-ordered waves so that lower-level bugs (capability gaps, IPC contract issues) are fixed before higher-level consumer bugs (token counting, stats display) that depend on them. Each entry includes the exact file and line so you can review changes in context. Deferred items and future phase flags are at the bottom.

---

## FIX WAVES

---

### WAVE 1 — IPC Foundation
**Rationale**: The capability manifest and IPC contract correctness gate every other fix. If commands are silently denied at runtime, no amount of frontend logic improvement matters. Fix these first so that subsequent waves can be verified against a trustworthy IPC layer.

---

#### Finding #10
- **Severity**: Critical
- **Problem**: The capability manifest has not been audited against the full set of `invoke()` calls in the frontend. Tauri v2 silently denies unlisted commands at runtime with no console error visible to the user — any command added after Phase 12 that is not in `default.json` AND `finch.toml` fails invisibly. The specific commands to check are every `invoke()` in `src/hooks/`, `src/components/`, and `src/store/` — cross-reference each one against the permissions list.
- **File**: `src-tauri/capabilities/default.json` (full file, lines 1–53) + `src-tauri/permissions/` directory
- **Fix Direction**: Run `grep -r 'invoke(' src/` and extract all command names; for each, verify a matching `allow-<command-name>` entry exists in `default.json` AND a corresponding `.toml` file exists in `src-tauri/permissions/`. Add any that are missing.
- **Agent**: Antigravity
- **Status**: done
- **Result**: Full cross-reference completed. All 26 `invoke()` call sites (hooks, components, store) are covered by matching `allow-<command>` entries in `default.json` and corresponding `.toml` files in `src-tauri/permissions/`. No gaps found; no changes to the manifest were required.

---

#### Finding #6
- **Severity**: High
- **Problem**: Web search flag is sent twice — once as `enable_web_search` (snake_case, manual) and once spread via `...params` which also contains `enableWebSearch` (camelCase); Tauri may receive a duplicate or conflicting key, silently dropping one.
- **File**: `src/hooks/useAIStreaming.ts:160-168`
- **Fix Direction**: Remove the explicit `enable_web_search: params?.enableWebSearch` key from the invoke payload; let Tauri's camelCase→snake_case auto-conversion handle `enableWebSearch` from `...params` alone.
- **Agent**: Antigravity
- **Status**: open

---

#### Finding #7
- **Severity**: Medium
- **Problem**: The non-JSON fallback in the `catch` block of `channel.onmessage` passes raw non-JSON strings directly to `onToken`, which would inject garbage (debug output, partial frames) into the chat stream if the backend ever emits non-JSON.
- **File**: `src/hooks/useAIStreaming.ts:150-157`
- **Fix Direction**: Remove the non-JSON fallback `onToken(eventJson)` call entirely; log the error and do nothing — the backend protocol is strictly JSON and the fallback is a legacy artifact.
- **Agent**: Antigravity
- **Status**: open

---

#### Finding #8
- **Severity**: Medium
- **Problem**: `abort()` calls `invoke("abort_generation")` on the Rust side but does not set `channel.onmessage = null` or otherwise detach the channel handler; in-flight events continue to call `onToken`/`onResearch` after abort, causing ghost tokens in the UI.
- **File**: `src/hooks/useAIStreaming.ts:96-97` (channel declaration site) and `src/hooks/useAIStreaming.ts:33-43` (abort function)
- **Fix Direction**: Hold a ref to the channel object; on abort, null out `channel.onmessage` before invoking `abort_generation`, and set a local `aborted` flag checked in the handler.
- **Agent**: Antigravity
- **Status**: open

---

### WAVE 2 — Security & Key Handling
**Rationale**: API key leakage is a security concern that must be resolved before any persistence or state fixes, because the persistence fixes in Wave 3 interact with the same config objects. Resolving key handling first ensures the corrected persistence logic never sees or saves raw key values.

---

#### Finding #4
- **Severity**: High
- **Problem**: `ProviderSection` sets component state (`setValue`) with the raw value returned by `get_provider_config`; if the Rust masking logic fails or is bypassed, the raw API key lives in React state and is rendered into the DOM (as a password input, but still in memory and DevTools).
- **File**: `src/components/dashboard/ProviderSection.tsx:34-37`
- **Fix Direction**: After loading config, check if the returned value equals the mask sentinel `"••••••••"` and if so, set state to empty string `""` so the field shows placeholder text, not the mask — consistent with `SearchOnboarding`'s own handling.
- **Agent**: Antigravity
- **Status**: open

---

#### Finding #5
- **Severity**: Medium
- **Problem**: `SearchOnboarding` partially guards against the mask sentinel (lines 31–32) but the guard compares against `"••••••••"` and sets state to `""` only for Tavily and Brave — if a future provider is added, this guard must be replicated. Additionally, the raw key value is passed to `onComplete` as a string prop, making it available in the parent component's closure.
- **File**: `src/components/chat/SearchOnboarding.tsx:31-32`
- **Fix Direction**: Extract the mask-sentinel guard into a shared `unmaskKey(val: string): string` utility in `src/lib/tauri-utils.ts` and call it from both `ProviderSection` and `SearchOnboarding`; do not pass raw keys through `onComplete` — pass only a boolean or the active provider name.
- **Agent**: Antigravity
- **Status**: open

---

### WAVE 3 — Persistence Correctness
**Rationale**: Persistence bugs (stale deps, bad `finally` ordering, cross-session token leak) produce incorrect saved state that corrupts data across sessions. These must be fixed before token counting (Wave 4) so that saved stats are not polluted with stale values.

---

#### Finding #12
- **Severity**: High
- **Problem**: The reactive save effect in `useChatPersistence` has stale dependency array entries (`profileName`, `profileEmail`, `customBgLight`, `customBgDark`) that are not actually written to the `save_provider_config` payload, causing spurious saves whenever those values change.
- **File**: `src/hooks/useChatPersistence.ts:115-133`
- **Fix Direction**: Trim the effect's dependency array to exactly the values it actually persists: `[enterToSend, selectedModel, selectedProvider]`; move profile and background saves to their own dedicated effects with correct deps.
- **Agent**: Antigravity
- **Status**: open

---

#### Finding #13
- **Severity**: Medium
- **Problem**: `isLoaded.current = true` is set in the `finally` block of the load effect; this means the reactive save effect can fire after a failed load (because `isLoaded` is true), persisting default/empty values over whatever was previously saved.
- **File**: `src/hooks/useChatPersistence.ts:107`
- **Fix Direction**: Move `isLoaded.current = true` into the `try` block, after `setRecentChats(chats)` succeeds; keep it out of `finally` so a failed load leaves `isLoaded` false and blocks reactive saves.
- **Agent**: Antigravity
- **Status**: open

---

#### Finding #14
- **Severity**: Low
- **Problem**: `tokensUsed` in `chatSlice` is persisted via Zustand's `persist` middleware to `localStorage` under `finch-chat-state`, causing the cumulative token counter to survive page reloads and app restarts — it never resets between sessions, making the "session" stat meaningless.
- **File**: `src/store/index.ts` (persist config for `useChatStore`, line 18–27)
- **Fix Direction**: Add a `partialize` option to the `useChatStore` persist config that explicitly excludes `tokensUsed` (and `isStreaming`/`voiceStatus`) from the persisted snapshot.
- **Agent**: Antigravity
- **Status**: open

---

### WAVE 4 — Token & Context Accuracy
**Rationale**: Token counting and context window data feed the UI stats panel, the overflow modal, and the sliding window logic. Fixing the data sources before fixing the display layer (Wave 5) ensures that once the display is updated it shows correct values.

---

#### Finding #1
- **Severity**: High
- **Problem**: `tokenCount.current` is incremented once per `"text"` channel event (i.e., per chunk), not per token; for streaming providers that batch multiple tokens per chunk, this undercounts real token usage by an unknown multiplier.
- **File**: `src/hooks/useAIStreaming.ts:106`
- **Fix Direction**: Remove `tokenCount.current++` from the `"text"` case entirely; rely solely on the `stats` event's `total_tokens` field (already done at line 121) — the chunk counter is redundant and inaccurate.
- **Agent**: Antigravity
- **Status**: open

---

#### Finding #2
- **Severity**: Medium
- **Problem**: The context window map contains fabricated model IDs (`claude-4-7-opus`, `claude-4-6-sonnet`, `gpt-5.4-pro`, `gemini-3.1-pro`) that do not match any real API model identifiers as of April 2026, causing all exact-match lookups to miss and fall through to the fuzzy fallback.
- **File**: `src/lib/contextWindows.ts:8-31`
- **Fix Direction**: Replace fabricated IDs with the actual canonical model IDs used in API calls (verify against `src-tauri/src/providers/` source to see what model strings Rust sends); keep the fuzzy fallback for versioned aliases.
- **Agent**: Antigravity
- **Status**: open

---

#### Finding #3
- **Severity**: Medium
- **Problem**: `contextIntelligence` initial state and `resetContextIntelligence` both hardcode `8192` for all three fields (`hardware_safe_limit`, `model_max`, `server_num_ctx`); this default displays as "8k context" in the UI for all cloud models that never call `fetchContextIntelligence`.
- **File**: `src/store/modelParamsSlice.ts:38-43` and `src/store/modelParamsSlice.ts:76-83`
- **Fix Direction**: Set the initial state to `null` (matching the type annotation `ContextIntelligence | null`) and guard UI display with a null check; only populate values from `fetchContextIntelligence` or from `getContextWindowSize`.
- **Agent**: Antigravity
- **Status**: open

---

#### Finding #16
- **Severity**: Medium
- **Problem**: `getContextWindowSize` returns `null` for unknown local models instead of the documented 32k safety fallback; callers that don't guard for null will use `undefined` or `0` as the context limit.
- **File**: `src/lib/contextWindows.ts:56-57`
- **Fix Direction**: For local model IDs (detected by checking the provider context or a parameter), return `32768` instead of `null`; or add a separate exported `getLocalModelFallback(): number` that returns `32768` for callers to use explicitly.
- **Agent**: Antigravity
- **Status**: open

---

### WAVE 5 — Polling & Voice Stability
**Rationale**: These are runtime stability bugs in background intervals. Fixing them after data correctness ensures that once polling and transcription work correctly, they are reading accurate state.

---

#### Finding #15
- **Severity**: Medium
- **Problem**: `useModelPolling` early-returns (sets `isModelLoaded = true` and exits) if `selectedProvider` does not start with `'local_'`; this means cloud providers never start polling, which is correct, but the provider prefix check `'local_'` may not match actual provider string values (e.g., `'lmstudio'`, `'ollama'`) — verify prefix.
- **File**: `src/hooks/useModelPolling.ts:26-29`
- **Fix Direction**: Check the actual provider string values emitted by the backend; replace the `startsWith('local_')` prefix check with an explicit set check: `['lmstudio', 'ollama'].includes(selectedProvider)`.
- **Agent**: Antigravity
- **Status**: open

---

#### Finding #9
- **Severity**: Low
- **Problem**: The poll interval in `useVoiceTranscription`'s transcription polling effect is a plain `let` variable, not a `useRef`; every re-render while `status === 'transcribing'` creates a new interval without clearing the old one, potentially stacking multiple 500ms polls.
- **File**: `src/hooks/useVoiceTranscription.ts:36-64`
- **Fix Direction**: Move `pollInterval` into a `useRef<NodeJS.Timeout | null>` so it persists across re-renders; clear the ref in the cleanup function.
- **Agent**: Antigravity
- **Status**: open

---

#### Finding #19
- **Severity**: Low
- **Problem**: The selected voice model used for transcription (`installedModels[0]` fallback in `stopRecording`) is not persisted to Zustand or localStorage; every session defaults to the first-alphabetically installed model.
- **File**: `src/hooks/useVoiceTranscription.ts:128`
- **Fix Direction**: Add a `selectedVoiceModel` field to `chatSlice` (or a dedicated voice slice); persist the user's model choice when `stopRecording` is called with an explicit `modelId`.
- **Agent**: Antigravity
- **Status**: open

---

### WAVE 6 — UI Correctness & React Hygiene
**Rationale**: These are display-layer bugs. Fix last because they depend on correct data from all prior waves.

---

#### Finding #11
- **Severity**: Medium
- **Problem**: IPC error objects caught in `useAIStreaming`'s catch block are coerced with `.toString()`, which for Tauri IPC errors returns `"[object Object]"`; users see a useless error message.
- **File**: `src/hooks/useAIStreaming.ts:183-188`
- **Fix Direction**: Replace `err.toString()` with `typeof err === 'string' ? err : (err?.message ?? JSON.stringify(err))` to extract a human-readable error string.
- **Agent**: Antigravity
- **Status**: open

---

#### Finding #17
- **Severity**: Medium
- **Problem**: `Dashboard.tsx` hardcodes `totalTokens: 0` in the `stats` field of every `sessionToSave` object, so the right sidebar's session stats panel always shows zero tokens regardless of actual usage.
- **File**: `src/components/dashboard/Dashboard.tsx:114`
- **Fix Direction**: Populate `stats.totalTokens` from the running token count accumulated via `useChatStore.getState().tokensUsed` at save time, or carry it forward from the last `AIStats` object received in `onComplete`.
- **Agent**: Antigravity
- **Status**: open

---

#### Finding #18
- **Severity**: Low
- **Problem**: `messages.map((msg, index) => <MessageBubble key={index} .../>)` uses array index as React key; when messages are prepended, deleted, or reordered, React will diff incorrectly, causing stale renders or animation glitches.
- **File**: `src/components/chat/ChatArea.tsx:129`
- **Fix Direction**: Use a stable unique ID as the key — add an `id` field (UUID or timestamp-based) to the `Message` type and generate it at message creation time in `handleSend`.
- **Agent**: Antigravity
- **Status**: open

---

#### Finding #20
- **Severity**: Low
- **Problem**: `AIreadme.md` section 9 states "Phases 14-15 (Token Enrichment & Context Intelligence) are already partially implemented or completed" — but the audit found hardcoded token fallbacks, stale context defaults, and inaccurate model IDs, indicating the token work is not complete.
- **File**: `AIreadme.md:93`
- **Fix Direction**: After Waves 4–6 are complete, update the Phase 9 section of `AIreadme.md` to accurately reflect which token/context findings were open at audit time and what was actually fixed.
- **Agent**: Antigravity
- **Status**: open

---

## DEFERRED

These findings are documented but should NOT be acted on during the current audit cycle.

| Finding | Reason Deferred |
|---------|----------------|
| #2 (fake model IDs) — partial | The fuzzy fallback functions correctly for now; full ID map correction requires cross-referencing the live Rust provider code to get exact strings — do this when Phase 14 token enrichment is formally revisited. |
| #19 (voice model not persisted) | Requires a new Zustand slice field; defer to a dedicated Phase 13 completion sprint where voice state is comprehensively reviewed. |
| #20 (AIreadme inaccuracy) | Documentation only; fix after all code fixes in Waves 1–5 are merged so the doc reflects final state. |

---

## FUTURE PHASES FLAGGED

The following issues surfaced during this audit that point to necessary future work beyond the current 20 findings:

1. **Model ID Canonicalization System** — The frontend has no authoritative source for which model string the backend uses. A shared model registry (Rust → JSON → frontend) is needed to keep `contextWindows.ts`, `modelParamsSlice.ts`, and the model selector in sync without manual maintenance.

2. **Voice Model Selection UI** — `useVoiceTranscription` has no mechanism for the user to choose which installed whisper model to use at recording time (it always defaults to `installedModels[0]`). A model picker in the voice UI and a persisted preference are required before Phase 13 can be called complete.

3. **Live Context Intelligence for Cloud Models** — `fetchContextIntelligence` is only called for local models. Cloud model context windows are inferred from the static `contextWindows.ts` map, which is already stale. A future phase should call the provider's model info endpoint at model-selection time and update the store dynamically.

4. **Token Sliding Window Implementation** — STATE.md marks Phase 15 (Token-Aware Sliding Window) as completed, but no frontend code trims conversation history to fit within `hardware_safe_limit`. This must be verified against the Rust backend to determine whether sliding window logic lives there or is missing entirely.

5. **Search Config IPC Split** — `update_search_config` is a separate IPC command from `save_provider_config`, but the frontend sometimes passes search keys through `save_provider_config` (via `ProviderSection`). These should be strictly separated: search keys must only ever go through `update_search_config`.

6. **Error Boundary for IPC Failures** — No React error boundary exists around the streaming/IPC layer. An IPC panic or malformed JSON in the channel can crash the chat view silently. Add a boundary and a user-visible recovery UI.

---

## RULES FOR AGENTS

- **Surgical edits only.** Do not rewrite a file. Do not touch lines outside the finding's listed range unless the fix explicitly requires it.
- **One finding per commit.** Each commit message must reference the finding number: `fix: #N — <one-line description>`.
- **Push to private repo after each complete wave**: `cp .gitignore.private .gitignore && git push full-repo linux:main`. Do NOT push to `origin`. Exception: if a finding in a wave is marked `blocked`, push completed findings and note the block in this file before stopping.
- **Update this file's status field** (`status: open` → `status: done`) in the same commit as the code fix.
- **Do not start a fix if `status` is not `open`.** If it is `done`, skip. If it is `blocked`, read the block note and assess before proceeding.
- **Do not touch files outside the listed location.** If a fix requires changes to a second file, add a note to the finding and stop for human review.
- **Verify the capability manifest** (Finding #10) is correct before testing any other fix. Without the right permissions, all IPC-based fixes will appear broken even when correct.
- **Do not fix deferred items** during a wave sprint unless explicitly instructed by the human.
- **Re-read this file at the start of every session** to check for status updates from previous agents.
