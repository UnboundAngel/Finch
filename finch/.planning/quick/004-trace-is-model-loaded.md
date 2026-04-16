---
task: "Trace isModelLoaded false source"
date: 2026-04-12
status: completed
---

# Quick Task: Trace isModelLoaded false source

## Problem
Identify all sources and usages of the `isModelLoaded` state in `Dashboard.tsx` to understand why it might be becoming `false`.

## Research & Diagnosis
- [x] Read `src/components/dashboard/Dashboard.tsx` in full.
- [x] Extract `useState` initialization.
- [x] Extract all `setIsModelLoaded` calls with line numbers.
- [x] Extract `ChatInput` prop passing.

## Findings

### 1. useState Initialization
```javascript
L93:   const [isModelLoaded, setIsModelLoaded] = useState(true);
```

### 2. Every setIsModelLoaded Call
```javascript
L125:       setIsModelLoaded(true); // Early return in useEffect when not a local provider
L138:         setIsModelLoaded(prev => { // Success path in checkStatus polling
L143:         setIsModelLoaded(prev => { // Catch path in checkStatus polling
```

### 3. Prop passed to ChatInput
```javascript
L768:                             isModelLoaded={selectedModel ? isModelLoaded : true}
```
