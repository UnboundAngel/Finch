# Performance Fixes Design
**Date:** 2026-04-23
**Source:** `docs/performance_audit.md`

---

## Overview

Ten performance issues identified in the audit are batched into five separate implementation chats, ordered from lowest to highest difficulty. Each batch is self-contained — a fresh chat can execute it without needing context from prior batches.

---

## Batch 1 — Quick Wins (Easy)
**Issues:** #1, #4, #7
**Estimated effort:** Small — all pure-frontend, low-risk changes under ~20 lines each.

### #1 · `parseContentSegments` memoization
- **File:** `src/components/chat/MessageBubble.tsx` (around line 202)
- **Problem:** `parseContentSegments(msg.content, isStreaming)` is called inline in JSX, re-running a full regex scan + attribute parse + segment array allocation on every render — ~60× per second during streaming.
- **Fix:** Wrap in `useMemo(() => parseContentSegments(msg.content, isStreaming), [msg.content, isStreaming])`. Because `msg.content` only changes when a new token arrives (not every rAF), this collapses parse work from every render down to once per token.

### #4 · Auto-scroll reflow throttle
- **File:** `src/components/chat/ChatArea.tsx` (around line 54)
- **Problem:** `useEffect(scrollToBottom, [messages, isThinking])` — `messages` identity changes every token, so `scrollIntoView` fires ~60× per second and forces layout reflow on the full chat tree.
- **Fix:** Replace the effect dependency with `[messages.length, messages.at(-1)?.content?.length ?? 0, isThinking]`. Wrap `scrollIntoView` in `requestAnimationFrame` so at most one scroll fires per paint. Add a `userHasScrolledUp` ref (set on `wheel`/`touchmove`); skip auto-scroll while the user is scrolled up.

### #7 · Gate artifact preview behind stream completion
- **File:** `src/components/chat/ArtifactPanel.tsx` (around lines 196–223)
- **Problem:** A 120ms debounce exists but artifact content updates continuously during streaming; each stable gap re-runs Babel/esbuild and rebuilds the iframe (`new frameKey` → full reload).
- **Fix:** Add a `isStreaming` prop (or derive it from the parent message's `streaming` field). In `PreviewPane`, replace the current debounce with a guard: only start compilation when `!isStreaming`. Show a static placeholder ("Preview available after generation completes") while streaming.

---

## Batch 2 — Rendering Stability (Moderate)
**Issues:** #3, #6
**Estimated effort:** Medium — requires understanding render dependency graphs; no new libraries.

### #3 · Stable `markdownComponents` across streaming flip
- **File:** `src/components/chat/MessageBubble.tsx` (around lines 80–121)
- **Problem:** `useMemo` depends on `isStreaming`; when streaming ends the entire `components` map is a new reference, forcing `react-markdown` to rebuild its component tree and every `CodeBlock` to re-mount (losing Shiki cache).
- **Fix:** Remove `isStreaming` from the `useMemo` deps array. Pass `isStreaming` to `CodeBlock` via a `ref` (`isStreamingRef.current = isStreaming`) so `CodeBlock` can read the current value without the component map reference changing. The `useMemo` now has stable deps and the components map is only rebuilt when truly necessary.

### #6 · Debounce Shiki highlighting in ArtifactPanel
- **File:** `src/components/chat/ArtifactPanel.tsx` (around lines 52–72)
- **Problem:** `useEffect([content, language, isDark])` re-runs `codeToHtml` on every token flush when the panel is open on the Code tab during streaming — Shiki is expensive and runs on the main thread.
- **Fix:** Gate the effect with `if (isStreaming) return;` (mirror the guard already in `CodeBlock.tsx:41`). When `isStreaming` is `false`, run highlighting immediately. This means the code view shows raw text during streaming and switches to highlighted output when the stream completes — acceptable UX given the panel is secondary.

---

## Batch 3 — Shiki Storm & ArtifactCard Identity (Moderate-Hard)
**Issues:** #8, #2
**Estimated effort:** Medium-large — requires careful state design and memo comparator work.

### #8 · Shiki highlight storm on stream completion
- **File:** `src/components/chat/CodeBlock.tsx` (around lines 38–74)
- **Problem:** When `isStreaming` flips to `false`, every `CodeBlock` in the finished message simultaneously kicks off Shiki highlighting on the main thread. Long responses with many code fences produce a visible frame stall right when the user expects the message to settle.
- **Fix:** Create a module-level highlight queue (a simple array + `isProcessing` flag). When `isStreaming` flips `false`, each `CodeBlock` pushes itself onto the queue rather than highlighting immediately. A `processQueue` loop drains it one block at a time using `requestIdleCallback` (falling back to `setTimeout(fn, 0)`). Blocks outside the viewport (via `IntersectionObserver`) are deprioritized to the back of the queue.

### #2 · ArtifactCard stable identity during streaming
- **Files:** `src/lib/artifactParser.ts` (around line 91), `src/components/chat/MessageBubble.tsx` (around line 204)
- **Problem:** `parseContentSegments` allocates a fresh `Artifact` object on every call with a new `version: versionCounter` and fallback `id`. Even with `React.memo`, the prop reference changes every frame, so `ArtifactCard` (including its `ArtifactThumbnail` with `content.split('\n')`) re-renders every token.
- **Fix (two-part):**
  1. **Parser:** Assign stable artifact IDs deterministically (e.g., hash of `title + kind`, or an incrementing per-message counter that doesn't reset between calls). Only increment `version` when `content` actually changes length, not on every parse call.
  2. **ArtifactCard memo comparator:** Add a custom comparator: `prev.artifact.id === next.artifact.id && prev.artifact.version === next.artifact.version && prev.artifact.content.length === next.artifact.content.length`. This prevents re-render unless the artifact content genuinely grew or a new version was committed.

---

## Batch 4 — Backend Fixes (Moderate-Hard, Cross-Stack)
**Issues:** #9, #10
**Estimated effort:** Medium — isolated from UI, Rust + TypeScript changes but self-contained.

### #9 · Voice transcription: polling → Tauri event
- **Files:** `src/hooks/useVoiceTranscription.ts` (lines 42–67), `src-tauri/src/ipc/voice.rs`, `src-tauri/src/voice.rs`
- **Problem:** `invoke('get_transcription_status')` is called every 500ms while transcribing — a hot IPC round-trip producing unnecessary bridge traffic. Also includes leftover debug `fetch` calls to `http://127.0.0.1:7723` that must be removed.
- **Fix:**
  - **Rust:** When transcription completes (or fails), emit a named Tauri event: `app_handle.emit("transcription_complete", TranscriptionResult { text, error })`.
  - **TypeScript:** Replace the polling interval with a one-time `listen("transcription_complete", handler)` subscription. Clean up the listener on unmount. Remove the debug `fetch` calls in the `#region agent log` block entirely.
  - Register the new event in capabilities if required by Tauri v2's CSP rules.

### #10 · Rust: eliminate serde round-trip in `stream_message`
- **File:** `src-tauri/src/ipc/chat.rs` (around line 157)
- **Problem:** `prepare_messages` builds a `serde_json::Value`; the Anthropic path then re-parses it with `serde_json::from_value(messages)` into `Vec<Message>`, allocating and cloning the entire payload. For large base64-encoded image attachments this is a non-trivial copy on the async path before the HTTP request.
- **Fix:** Add an overload or refactor `prepare_messages` to return `Vec<Message>` (typed) directly for the Anthropic path. The Gemini/OpenAI/local paths can continue using `serde_json::Value` if they need that flexibility. The goal is to eliminate the serialize→deserialize→serialize chain for Anthropic specifically. If a full refactor is too invasive, use `serde_json::from_value` on borrowed slices (`&Value`) where the API allows it.

---

## Batch 5 — Virtualization (Hard, Most Invasive)
**Issue:** #5
**Estimated effort:** Large — requires integrating a virtualization library and reworking the message list render architecture.

### #5 · List virtualization for ChatArea
- **File:** `src/components/chat/ChatArea.tsx` (around lines 161–179)
- **Problem:** All messages render every time `messages` changes. Even with `MessageBubble` memoized, React still reconciles every element in the list on every token. For long chats (100+ messages with code blocks) this compounds per-token work significantly.
- **Library choice:** `react-virtuoso` — preferred over `@tanstack/react-virtual` because it ships built-in `followOutput` (auto-scroll pinning), handles variable-height items out of the box, and requires less manual height measurement code.
- **Fix:**
  - Replace the `messages.map(...)` render with a `<Virtuoso>` component.
  - Use `followOutput="smooth"` to replace the current manual `scrollIntoView` auto-scroll (this also resolves the auto-scroll reflow from #4 if Batch 1 hasn't shipped yet — but Batch 1 should ship first regardless).
  - Set `increaseViewportBy` to pre-render a buffer of messages above/below the viewport so fast scrolling doesn't flash blank rows.
  - Keep `MessageBubble` wrapped in `React.memo` — Virtuoso only mounts visible items but re-renders them when data changes, so memo still matters.
  - Test: long chats with 200+ messages, mid-stream scrolling, load-and-scroll from sidebar.

---

## Execution Order

| Chat | Batch | Issues | Risk |
|------|-------|--------|------|
| 1 | Quick Wins | #1, #4, #7 | Low |
| 2 | Rendering Stability | #3, #6 | Low-Medium |
| 3 | Shiki Storm + Artifact Identity | #8, #2 | Medium |
| 4 | Backend Fixes | #9, #10 | Medium |
| 5 | Virtualization | #5 | High |

Each chat should be run independently and tested before proceeding to the next. Batch 1 is safe to ship immediately. Batch 5 should not be started until Batches 1–3 are stable, as virtualization interacts with scroll behavior and message rendering.
