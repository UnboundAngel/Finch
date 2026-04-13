---
task: "Optimize model status polling — focus-aware with slow interval"
date: 2026-04-12
status: completed
---

# Quick Task: Optimize model status polling — focus-aware with slow interval

## Problem
The current status polling logic is inefficient, polling every 5 seconds regardless of window focus. We need a focus-aware polling strategy that checks on load, on focus, and then every 30 seconds while focused. Debug logs also need to be removed.

## Plan
1. Read `Dashboard.tsx` to find the polling `useEffect`. (Done)
2. Replace the `useEffect` with the new focus-aware strategy (30s interval, pause on blur, check on focus/mount). (Done)
3. Ensure `isTyping` guard, `console.error`, and `setIsModelLoaded` logic are retained. (Done)
4. Remove previous debug `console.log` lines. (Done)
5. Commit and push. (Done)

## Verification
- Replaced interval with focus/blur event listeners for efficient 30s background polling.
- All requested logs removed.
