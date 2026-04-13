---
task: "Find actual source of red border in ChatInput"
date: 2026-04-12
status: completed
---

# Quick Task: Find actual source of red border in ChatInput

## Problem
Determine exactly which logic in `ChatInput.tsx` is responsible for applying the red border (destructive style) and whether it depends solely on `isModelLoaded` or other internal factors.

## Research & Diagnosis
- [x] Read `src/components/chat/ChatInput.tsx` in full.
- [x] Extract root container `className`/`cn()` blocks.
- [x] List props and their types.
- [x] Search for "destructive", "red", "border-red", "ring-red".
- [x] Check for local state or `useEffect` affecting the border.

## Findings

### 1. Root Container Class Logic
The red border is applied via the following block:
```javascript
L73: <div className={`relative flex items-end w-full rounded-2xl transition-all duration-300 overflow-hidden border-[1.5px] ${!isModelLoaded
L74:     ? 'border-destructive/50 bg-background shadow-[0_0_15px_-3px_rgba(239,68,68,0.15)] ring-1 ring-destructive/20'
```
It is strictly controlled by the `isModelLoaded` prop.

### 2. Props
- `isModelLoaded` is an optional boolean, defaulting to `true`.
- Other props like `isWebSearchActive`, `isIncognito`, `isPinkMode`, and `hasCustomBg` also affect the border/background, but none use the `destructive` (red) classes.

### 3. Term Search
- `destructive` is used for the container border (Line 74) and the Send/Stop button (Line 143).
- No uses of `border-red` or `ring-red` were found.

### 4. Independence
- There is **no internal logic** in `ChatInput.tsx` that overrides the `isModelLoaded` prop for the purpose of showing an error border.
