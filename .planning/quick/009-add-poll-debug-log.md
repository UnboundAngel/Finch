---
task: "Add debug log to polling useEffect in Dashboard.tsx"
date: 2026-04-12
status: completed
---

# Quick Task: Add debug log to polling useEffect in Dashboard.tsx

## Problem
Need to debug why the red border persists by checking the `selectedModel` and `selectedProvider` values inside the polling `useEffect`.

## Plan
1. Read `src/components/dashboard/Dashboard.tsx` to find the polling `useEffect`. (Done)
2. Insert `console.log` at the beginning of the effect block. (Done)
3. Commit and push. (Done)

## Verification
- Added `console.log` at L124 of `Dashboard.tsx`.
