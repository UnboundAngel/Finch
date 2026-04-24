 Performance Audit — Top 10 Issues

  1. parseContentSegments runs on every streaming render

  - Location: MessageBubble.tsx:202 (calls parseContentSegments(msg.content, isStreaming) inline in JSX)
  - Root cause: Regex scan + attribute parsing + full segment array allocation happens on every render of the streaming
  AI bubble — i.e. every rAF flush (~60Hz) over the entire growing buffer.
  - Impact: High
  - Fix: Wrap in useMemo(() => parseContentSegments(msg.content, isStreaming), [msg.content, isStreaming]). Even better:
   skip parsing entirely while streaming and fall back to a cheap "last <artifact> stripper" until stream ends.

  2. ArtifactCard re-mounts every token while streaming

  - Location: artifactParser.ts:91 (Artifact id fallback) + MessageBubble.tsx:204
  - Root cause: parseContentSegments allocates a fresh Artifact object on every call with a new version: versionCounter
  and fallback id. Even with React.memo, the artifact prop reference changes every frame → ArtifactCard (including its
  ArtifactThumbnail with content.split('\n')) re-renders every token.
  - Impact: High
  - Fix: Stabilize artifact identity per-message (cache by id in a ref/map), or let ArtifactCard's memo comparator do a
  shallow field compare (prev.artifact.id === next.artifact.id && prev.artifact.version === next.artifact.version &&
  prev.artifact.content.length === next.artifact.content.length).

  3. markdownComponents rebuilt when isStreaming flips

  - Location: MessageBubble.tsx:80-121
  - Root cause: useMemo depends on isStreaming; when it flips false at stream end, the entire components map is a new
  reference, forcing react-markdown to rebuild its component tree and CodeBlock to re-mount (losing any Shiki cache).
  - Impact: Medium
  - Fix: Drop isStreaming from the deps and pass it via a ref or closure read inside CodeBlock. Or split into two stable
   component maps and pick one without memo invalidation.

  4. ChatArea auto-scroll fires on every token

  - Location: ChatArea.tsx:54 (useEffect(scrollToBottom, [messages, isThinking]))
  - Root cause: messages array identity changes every token (Dashboard updates the streaming msg), so scrollIntoView is
  called ~60× per second. Each call forces layout/reflow on the whole chat tree.
  - Impact: High
  - Fix: Depend on messages.length plus the last message's content length, and throttle via rAF; or only auto-scroll
  when user is already pinned at the bottom.

  5. No list virtualization in ChatArea

  - Location: ChatArea.tsx:161-179
  - Root cause: All messages in history render every time messages changes. Even with MessageBubble memoized, React
  still reconciles every element in the loop. Long chats (100+ messages with code blocks) compound per-token work.
  - Impact: Medium (High for long chats)
  - Fix: Add virtualization (react-virtuoso or @tanstack/react-virtual) with followOutput for streaming. Diagnosis only
  — no change here.

  6. PanelCodeView re-runs Shiki on every artifact-content change while streaming

  - Location: ArtifactPanel.tsx:52-72
  - Root cause: useEffect([content, language, isDark]) re-highlights the full artifact on every token flush if the panel
   is open on "Code" tab during streaming. Shiki codeToHtml is expensive and runs on the main thread.
  - Impact: High (when panel is open mid-stream)
  - Fix: Debounce highlighting by ~150ms and/or skip highlighting while the artifact's parent message is still streaming
   (mirror the streaming guard in CodeBlock.tsx:41).

  7. PreviewPane recompiles React artifact every content chunk

  - Location: ArtifactPanel.tsx:196-223 + artifactPreviewRuntime.ts:358
  - Root cause: A 120ms debounce exists but artifact.content updates continuously; each stable gap re-runs Babel/esbuild
   transform and rebuilds the srcDoc iframe (new frameKey → full reload). Cache helps for identical content but
  streaming content is always new.
  - Impact: High (if user opens preview during stream)
  - Fix: Gate preview compilation behind stream-complete (guard by !msg.streaming), and show a "Preview available after
  generation completes" placeholder.

  8. Shiki highlight storm on stream completion

  - Location: CodeBlock.tsx:38-74
  - Root cause: When streaming flips false, every CodeBlock in the finished message kicks off highlighting
  simultaneously on the main thread. For a long response with many code fences, this produces a visible frame stall
  right when the user expects the message to settle.
  - Impact: Medium
  - Fix: Queue highlights via requestIdleCallback/micro-batches, or highlight only the in-viewport blocks first
  (IntersectionObserver).

  9. Voice transcription polls over IPC at 500ms

  - Location: useVoiceTranscription.ts:42-67
  - Root cause: Hot IPC round-trip (invoke('get_transcription_status')) every 500ms while transcribing — plus the
  leftover fetch('http://127.0.0.1:7723') debug calls noted in AGENTS.md. Unnecessary bridge traffic.
  - Impact: Low (only during active transcription, not chat hot path)
  - Fix: Convert Rust side to emit a transcription-complete Tauri event; frontend subscribes once instead of polling.

  10. Rust: redundant serde_json::from_value round-trip in stream_message (Anthropic path)

  - Location: src-tauri/src/ipc/chat.rs:157 (messages: serde_json::from_value(messages))
  - Root cause: prepare_messages builds a serde_json::Value; Anthropic path re-parses it into typed Vec<Message>, which
  allocates/clones the entire payload. For large attachments (base64 images) this is a non-trivial copy on the async
  path before the HTTP request.
  - Impact: Low–Medium (scales with attachment size)
  - Fix: Have prepare_messages return a typed Vec<Message> directly for Anthropic, or use serde_json::from_value on
  borrowed slices where possible. Diagnosis only.

  ---
  Not counted but worth noting: MessageBubble wraps multiple buttons each in their own TooltipProvider — consider one
  provider at ChatArea level. ArtifactPanel's AnimatePresence + motion.div key={activeTab} causes full PanelCodeView
  remount (and Shiki re-run) on tab toggle.
