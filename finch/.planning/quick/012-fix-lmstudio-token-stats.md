---
task: "Fix token stats regression in stream_message for local_lmstudio"
date: 2026-04-12
status: completed
---

# Quick Task: Fix token stats regression in stream_message for local_lmstudio

## Problem
Token stats for `local_lmstudio` in `stream_message` regressed. It's using wall-clock time and generation-only token count instead of the `usage` and `stats` fields provided in the final SSE chunk by LM Studio.

## Plan
1. Locate the `stream_message` handler for `local_lmstudio` in `src-tauri/src/lib.rs`. (Done)
2. Inspect the SSE chunk parsing logic (`data: [DONE]` or JSON parsing). (Done)
3. Restore logic to extract:
   - `total_tokens` = `prompt_tokens` + `completion_tokens` (from `usage`). (Done)
   - `tokens_per_second` = `completion_tokens` / (duration in seconds) or from native LM Studio `stats` if available. (Done)
   - `total_duration` from native `stats` if available. (Done)
4. Fall back to manual count and wall-clock only if these fields are missing. (Done)
5. Commit and push. (Done)
