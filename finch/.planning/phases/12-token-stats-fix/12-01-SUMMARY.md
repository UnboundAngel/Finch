---
phase: 12-token-stats-fix
plan: 01
subsystem: AI Performance Tracking
tags: [rust, typescript, lm-studio, token-stats]
dependency_graph:
  requires: []
  provides: [native-lm-studio-stats]
  affects: [src-tauri/src/lib.rs, src/hooks/useAIStreaming.ts]
tech_stack: [Rust, Tauri, React, TypeScript]
key_files: [src-tauri/src/lib.rs, src/hooks/useAIStreaming.ts]
decisions:
  - D-12-01: Extract native total_duration (ms) from LM Studio final chunk in backend.
  - D-12-02: Prioritize native total_duration and tokens_per_second in frontend stats parser.
metrics:
  duration: 15m
  completed_date: "2025-02-12T16:20:00Z"
---

# Phase 12 Plan 01: Token Stats Fix Summary

Update the token statistics pipeline to prioritize native values reported by LM Studio over less accurate frontend wall-clock calculations.

## Accomplishments

- **Updated `lib.rs`**: Added extraction of `total_duration` from the `stats` field in LM Studio's final response chunk.
- **Updated `useAIStreaming.ts`**: Modified the `onmessage` handler to prioritize `rawStats.total_duration` and `rawStats.tokens_per_second` if they exist.
- **Fallback logic**: Maintained wall-clock calculations as a robust fallback for other providers (Anthropic, OpenAI, Gemini) that may not provide the same level of native stats.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- [x] Files created/modified exist
- [x] Commits made and pushed
- [x] Compilation checks passed

## Commits

- bb03ba9: feat(12-01): extract native LM Studio total_duration in lib.rs
- 638d67e: feat(12-01): prioritize native stats in useAIStreaming.ts
