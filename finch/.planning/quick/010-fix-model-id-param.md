---
task: "Fix model_id param formatting and log catch block in Dashboard.tsx"
date: 2026-04-12
status: completed
---

# Quick Task: Fix model_id param formatting and log catch block in Dashboard.tsx

## Problem
Tauri auto-converts `modelId` from JS to `model_id` in Rust. By explicitly sending `model_id` from JS, the invoke call is likely failing due to a missing argument error. We need to revert it to `modelId` and add a `console.error` to catch any other errors.

## Plan
1. Edit `Dashboard.tsx` to change `model_id` back to `modelId` in `get_model_loaded_status` invoke. (Done)
2. Add `console.error('[POLL ERROR]', e);` in the catch block. (Done)
3. Commit and push. (Done)

## Verification
- Reverted `model_id` -> `modelId` in the `invoke` call parameters.
- Added `console.error` to properly surface any future Tauri bridge errors during polling.
