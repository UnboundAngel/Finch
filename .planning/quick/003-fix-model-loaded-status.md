---
task: "Fix model loaded status always showing red border"
date: 2026-04-12
status: completed
---

# Quick Task: Fix model loaded status always showing red border

## Problem
The chat input shows a red destructive border even when a local model is loaded. The `get_model_loaded_status` Tauri command was not being reached due to missing permissions.

## Research & Diagnosis
- [x] Check `setIsModelLoaded(false)` calls in `Dashboard.tsx` -> Identified catch block as the trigger.
- [x] Verify `selectedProvider` population in `Dashboard.tsx` effect -> Correct.
- [x] Check `isModelLoaded` prop passing to `ChatInput` -> Prop name matches.
- [x] Verify `ChatInput.tsx` border logic -> Logic is correct, dependent on state.
- [x] Confirm Rust command connectivity -> **Permission missing in finch.toml and default.json**. Parameter mismatch (`modelId` vs `model_id`) also noted.

## Plan
1. Add `allow-get-model-loaded-status` to `src-tauri/permissions/finch.toml`. (Done)
2. Add `allow-get-model-loaded-status` to `src-tauri/capabilities/default.json`. (Done)
3. Align parameter name in `Dashboard.tsx` (`modelId` -> `model_id`). (Done)
4. Add debug logging to `Dashboard.tsx` as requested. (Done)

## Verification
- [x] Permissions added.
- [x] Parameter aligned.
- [x] Log added.
