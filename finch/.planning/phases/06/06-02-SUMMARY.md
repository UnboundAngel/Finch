---
phase: "06"
plan: "06-02"
subsystem: "Message Generation Stats"
tags: ["rust", "react", "motion", "streaming", "performance"]
dependency_graph:
  requires: ["06-01"]
  provides: ["Message-Level Performance Metrics"]
  affects: ["src/hooks/useAIStreaming.ts", "src/components/chat/MetadataRow.tsx"]
tech_stack:
  added: ["Framer Motion animations", "JSON Stats Sentinel"]
key_files:
  - "src-tauri/src/lib.rs"
  - "src-tauri/src/anthropic.rs"
  - "src/hooks/useAIStreaming.ts"
  - "src/components/chat/MetadataRow.tsx"
decisions:
  - "Sentinel Approach: Using `__STATS__:` prefix in standard channel strings to avoid complex IPC type changes while maintaining reliability."
  - "Token Counting: Fallback to manual chunk counting when provider APIs (like local Ollama/LMStudio) do not provide explicit `usage` fields in the stream."
metrics:
  duration: "45m"
  completed_date: "2024-03-22T00:00:00Z"
---

# Phase 06 Plan 02: Message Generation Stats Summary

Implementation of a structured metrics system that captures real-time performance data from Rust (token counts, stop reasons) and displays them in a polished, interactive UI.

## Key Changes

### Rust Backend (`lib.rs`, `anthropic.rs`)
- Implemented `token_count` tracking across all providers.
- Added `stop_reason` detection:
  - `abort` when user cancels.
  - `max_tokens` when output limit is hit.
  - `end_turn` for normal completion.
- Dispatched `__STATS__` JSON sentinel as the final item in the IPC channel.

### Frontend Hook (`useAIStreaming.ts`)
- Added `stats` state and `useRef` for high-frequency token accumulation.
- Implemented real-time throughput computation (tokens/s) using `performance.now()`.
- Added parsing logic to identify and extract metrics from the `__STATS__` sentinel.

### Persistent Storage (`Dashboard.tsx`)
- Updated `handleSend` to extract live stats from the hook.
- Implemented state freezing on completion, saving the final stats into the message's `metadata`.

### UI & Motion (`MessageBubble.tsx`, `MetadataRow.tsx`)
- **Metadata Row Reveal:** Implemented a slide-up animation (200ms ease-out) that shows the row on hover or during streaming.
- **Performance Metrics Display:** Added a pill-styled summary showing `X t/s`, `Y tokens`, and `stop_reason`.
- **Interactivity:**
  - Added a `HelpCircle` icon that opens a tooltip with the raw JSON stats.
  - Added a `Copy` button to quickly copy the JSON stats for debugging.
  - Applied `translateY: -2px` hover lift and `scale: 0.95` press effects to all tools.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. All statistics are real and computed from the generation stream.

## Threat Flags

None. Stats only contain non-sensitive performance data.

## Self-Check: PASSED
- [x] Rust sentinel dispatched at end of stream.
- [x] Token counts and stop reasons correctly identified.
- [x] Hook correctly parses sentinel and ignores it for text output.
- [x] Stats persisted in message metadata.
- [x] UI reveal and animations follow design system rules.
