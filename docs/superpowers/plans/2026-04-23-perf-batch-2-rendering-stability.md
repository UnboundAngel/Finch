# Performance Batch 2 — Rendering Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize two React dependency arrays so that `markdownComponents` and the `PanelCodeView` Shiki effect no longer rebuild or re-run on every streaming flip or token.

**Architecture:** Both fixes remove reactive values from `useMemo`/`useEffect` dependency arrays by replacing them with refs or streaming guards. No new libraries. No behavior changes for the user — the rendered output is identical.

**Tech Stack:** React 19, TypeScript. Run `npm run lint` to type-check after each task.

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/chat/MessageBubble.tsx` | Replace `isStreaming` dep in `markdownComponents` with a ref (issue #3) |
| `src/components/chat/ArtifactPanel.tsx` | Guard `PanelCodeView`'s Shiki effect with `isStreaming` (issue #6) |
| `src/components/dashboard/DashboardMain.tsx` | Pass `isStreaming` prop to `<ArtifactPanel>` (required for issue #6) |

> **Note:** If Batch 1 has already been applied, `ArtifactPanel` already has the `isStreaming` prop wired from `DashboardMain`. Skip steps marked "(skip if Batch 1 done)".

---

## Task 1: Stable `markdownComponents` across streaming flip (Issue #3)

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx`

**Problem:** `markdownComponents` (line 80) has `[isDark, isStreaming, isUserMsg]` as deps. When `isStreaming` flips `false` at stream end, the entire components map is a new object reference → `react-markdown` rebuilds its component tree → every `CodeBlock` unmounts and remounts, losing its Shiki cache. This causes a visible re-highlight stall at the exact moment the user expects the message to settle.

**Fix:** Move `isStreaming` out of the deps by reading it from a stable ref inside the memo. The ref is always updated on every render before the memo runs, so `streaming={isStreamingRef.current}` reflects the latest value at component call time.

- [ ] **Step 1: Add `isStreamingRef` after the `isUserMsg` declaration**

In `MessageBubble.tsx`, after `const isUserMsg = msg.role === 'user';` (line 78), add:

```tsx
  const isStreamingRef = useRef(isStreaming);
  isStreamingRef.current = isStreaming;
```

`useRef` is already imported at line 1 — no import change needed.

- [ ] **Step 2: Change `streaming={isStreaming}` to `streaming={isStreamingRef.current}` inside `markdownComponents`**

Inside the `code` function in `markdownComponents` (around line 113), find:
```
streaming={isStreaming}
```
Change it to:
```
streaming={isStreamingRef.current}
```

- [ ] **Step 3: Remove `isStreaming` from the `markdownComponents` deps array**

Find the closing of the `useMemo` (line 121):
```tsx
  }), [isDark, isStreaming, isUserMsg]);
```
Replace with:
```tsx
  }), [isDark, isUserMsg]);
```

- [ ] **Step 4: Type-check**

```bash
npm run lint
```
Expected: zero errors.

- [ ] **Step 5: Manual verification**

Start `npm run dev`. Send a message that produces a response with several code blocks. Confirm code blocks show plain text while streaming (expected — `streaming=true` via ref). When the stream ends, open DevTools → Components tab. Confirm `CodeBlock` nodes stay mounted (no unmount/remount). Confirm Shiki-highlighted output appears without a visible flash.

- [ ] **Step 6: Commit**

```bash
git add src/components/chat/MessageBubble.tsx
git commit -m "perf: stabilize markdownComponents to avoid CodeBlock remount on stream end (#3)"
```

---

## Task 2: Guard Shiki highlighting in `PanelCodeView` during streaming (Issue #6)

**Files:**
- Modify: `src/components/chat/ArtifactPanel.tsx`
- Modify: `src/components/dashboard/DashboardMain.tsx`

**Problem:** `PanelCodeView`'s `useEffect` (lines 52–72) runs `codeToHtml` — expensive, main-thread Shiki work — on every token flush when the panel is open on the Code tab during streaming. The existing guard in `CodeBlock.tsx:41` already does this correctly; `PanelCodeView` needs the same pattern.

**Fix:** Add an `isStreaming` prop to `PanelCodeView`. The effect bails out early when `isStreaming` is true, showing the raw pulsing text placeholder instead. Once streaming ends, the effect runs once and highlights the final content.

### Part A — Add `isStreaming` to `ArtifactPanelProps`

- [ ] **Step 1: Extend `ArtifactPanelProps` (skip if Batch 1 done)**

Find in `ArtifactPanel.tsx` (lines 31–37):
```tsx
interface ArtifactPanelProps {
  artifact: Artifact | null;
  allVersions?: Artifact[];
  isDark: boolean;
  onClose: () => void;
  onSelectVersion?: (artifact: Artifact) => void;
}
```
Replace with:
```tsx
interface ArtifactPanelProps {
  artifact: Artifact | null;
  allVersions?: Artifact[];
  isDark: boolean;
  isStreaming?: boolean;
  onClose: () => void;
  onSelectVersion?: (artifact: Artifact) => void;
}
```

- [ ] **Step 2: Destructure `isStreaming` in the component signature (skip if Batch 1 done)**

Find:
```tsx
export const ArtifactPanel = memo(function ArtifactPanel({
  artifact,
  allVersions = [],
  isDark,
  onClose,
  onSelectVersion,
}: ArtifactPanelProps) {
```
Replace with:
```tsx
export const ArtifactPanel = memo(function ArtifactPanel({
  artifact,
  allVersions = [],
  isDark,
  isStreaming = false,
  onClose,
  onSelectVersion,
}: ArtifactPanelProps) {
```

### Part B — Wire `isStreaming` into `PanelCodeView`

- [ ] **Step 3: Add `isStreaming` to `PanelCodeView`'s prop signature**

Find the `PanelCodeView` function declaration (around line 40):
```tsx
const PanelCodeView = ({
  content,
  language,
  isDark,
}: {
  content: string;
  language: string;
  isDark: boolean;
}) => {
```
Replace with:
```tsx
const PanelCodeView = ({
  content,
  language,
  isDark,
  isStreaming = false,
}: {
  content: string;
  language: string;
  isDark: boolean;
  isStreaming?: boolean;
}) => {
```

- [ ] **Step 4: Add the early-return guard at the start of `PanelCodeView`'s `useEffect`**

Find the `useEffect` inside `PanelCodeView` (line 52):
```tsx
  useEffect(() => {
    const id = ++renderId.current;
```
Replace the opening to add the guard:
```tsx
  useEffect(() => {
    if (isStreaming) {
      setHtml('');
      return;
    }
    const id = ++renderId.current;
```

- [ ] **Step 5: Pass `isStreaming` when `PanelCodeView` is rendered in the body**

Find in the `ArtifactPanel` body (around line 475):
```tsx
              ) : (
                <PanelCodeView
                  content={artifact.content}
                  language={artifact.language || artifact.kind}
                  isDark={isDark}
                />
              )}
```
Replace with:
```tsx
              ) : (
                <PanelCodeView
                  content={artifact.content}
                  language={artifact.language || artifact.kind}
                  isDark={isDark}
                  isStreaming={isStreaming}
                />
              )}
```

### Part C — Pass `isStreaming` from DashboardMain

- [ ] **Step 6: Add `isStreaming` to the `<ArtifactPanel>` call site (skip if Batch 1 done)**

In `DashboardMain.tsx`, find:
```tsx
          <ArtifactPanel
            artifact={activeArtifact}
            isDark={isDark}
            onClose={onArtifactClose}
            allVersions={allVersionsOfActive}
            onSelectVersion={onArtifactClick}
          />
```
Replace with:
```tsx
          <ArtifactPanel
            artifact={activeArtifact}
            isDark={isDark}
            isStreaming={isStreaming}
            onClose={onArtifactClose}
            allVersions={allVersionsOfActive}
            onSelectVersion={onArtifactClick}
          />
```

- [ ] **Step 7: Type-check**

```bash
npm run lint
```
Expected: zero errors.

- [ ] **Step 8: Manual verification**

Start `npm run dev`. Request an artifact with code content. While streaming, open the panel to the Code tab. Verify: raw text is shown with the `animate-pulse` style — no `codeToHtml` should appear in a DevTools Performance recording. When the stream ends, verify the fully-highlighted code appears. Confirm the highlight runs exactly once on completion, not once per token.

- [ ] **Step 9: Commit**

```bash
git add src/components/chat/ArtifactPanel.tsx src/components/dashboard/DashboardMain.tsx
git commit -m "perf: guard PanelCodeView Shiki effect during streaming to stop per-token highlights (#6)"
```
