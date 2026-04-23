# Performance Batch 1 — Quick Wins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate three high-frequency performance problems that are cheap to fix: memoize the artifact parser call, fix auto-scroll to fire at token rate instead of rAF rate, and block preview compilation during streaming.

**Architecture:** All three changes are pure frontend. No new libraries. Each change is isolated to a single file/component and can be reverted independently. No behavior changes — only render work is reduced.

**Tech Stack:** React 19, TypeScript, Tauri v2. Run `npm run lint` (tsc --noEmit) to type-check after each task.

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/chat/MessageBubble.tsx` | Memoize `parseContentSegments` call (issue #1) |
| `src/components/chat/ChatArea.tsx` | Smarter `useEffect` deps + rAF scroll + user-pinned guard (issue #4) |
| `src/components/chat/ArtifactPanel.tsx` | Add `isStreaming` prop; block `PreviewPane` mount while streaming (issue #7) |
| `src/components/dashboard/DashboardMain.tsx` | Pass `isStreaming` prop to `<ArtifactPanel>` |

---

## Task 1: Memoize `parseContentSegments` in MessageBubble (Issue #1)

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx`

`parseContentSegments` is called inline at line 202 inside JSX, running a full regex scan + attribute parse + segment array allocation on every render — roughly 60× per second at peak streaming. Wrapping it in `useMemo` collapses this to once per token (when `msg.content` actually changes).

`useMemo` is already imported at line 1 — no import change needed.

- [ ] **Step 1: Add the memoized segments variable before the return statement**

In `MessageBubble.tsx`, after line 78 (`const isUserMsg = msg.role === 'user';`) and before the `const markdownComponents = useMemo(...)` block (line 80), add:

```tsx
  const contentSegments = useMemo(
    () => parseContentSegments(msg.content, isStreaming),
    [msg.content, isStreaming],
  );
```

- [ ] **Step 2: Replace the inline call in JSX with the memoized value**

Find at line 202:
```tsx
                    {parseContentSegments(msg.content, isStreaming).map((seg, i) =>
```

Replace with:
```tsx
                    {contentSegments.map((seg, i) =>
```

- [ ] **Step 3: Type-check**

```bash
npm run lint
```
Expected: zero errors.

- [ ] **Step 4: Manual verification**

Start `npm run dev`. Open the app, send a message, watch the AI response stream in. Open DevTools → Performance → record while the response streams. Confirm `parseContentSegments` no longer appears in every rAF frame — it should appear only when content changes.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/MessageBubble.tsx
git commit -m "perf: memoize parseContentSegments in MessageBubble (#1)"
```

---

## Task 2: Smarter auto-scroll in ChatArea (Issue #4)

**Files:**
- Modify: `src/components/chat/ChatArea.tsx`

The current `useEffect(() => scrollToBottom(), [messages, isThinking])` fires on every render because `messages` is a new array reference every token — roughly 60 scrolls/sec, each forcing a layout reflow. The fix changes deps to compare by length and last-message content length (stable numbers), wraps the scroll in `requestAnimationFrame` (one scroll per paint), and skips scrolling when the user has manually scrolled up.

- [ ] **Step 1: Add `useCallback` to the React import**

Find at line 1:
```tsx
import { useRef, useEffect, useState, memo } from 'react';
```
Replace with:
```tsx
import { useRef, useEffect, useState, memo, useCallback } from 'react';
```

- [ ] **Step 2: Add the user-pinned ref and the scroll container ref**

After line 47 (`const messagesEndRef = useRef<HTMLDivElement>(null);`), add:

```tsx
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
```

- [ ] **Step 3: Replace the existing `scrollToBottom` function and its `useEffect`**

Find the existing block (lines 50–56):
```tsx
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);
```

Replace with:
```tsx
  // Detect when the user manually scrolls away from the bottom.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      userScrolledUpRef.current = el.scrollTop + el.clientHeight < el.scrollHeight - 50;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (userScrolledUpRef.current) return;
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    });
  }, []);

  // Reset scroll-lock when a new message is added (user sent something or AI reply arrived),
  // then scroll. Also fires when the last message's content grows (streaming tokens).
  const lastContentLen = messages.at(-1)?.content?.length ?? 0;
  const prevMessageCountRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length !== prevMessageCountRef.current) {
      userScrolledUpRef.current = false;
      prevMessageCountRef.current = messages.length;
    }
    scrollToBottom();
  }, [messages.length, lastContentLen, isThinking, scrollToBottom]);
```

- [ ] **Step 4: Attach `scrollContainerRef` to the outer scroll div**

Find the outer div around line 76:
```tsx
      className={`flex-1 pt-20 pb-8 scrollbar-hide min-w-0 ${messages.length === 0 && !isThinking ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}
```

Add `ref={scrollContainerRef}` to this div:
```tsx
      ref={scrollContainerRef}
      className={`flex-1 pt-20 pb-8 scrollbar-hide min-w-0 ${messages.length === 0 && !isThinking ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}
```

- [ ] **Step 5: Type-check**

```bash
npm run lint
```
Expected: zero errors.

- [ ] **Step 6: Manual verification**

Start `npm run dev`. Stream a long AI response. Open DevTools → Performance → record. Verify `scrollIntoView` appears at token rate (≤ once per token), not 60× per second. Scroll up mid-stream; confirm auto-scroll stops. Send a new message; confirm scroll-lock resets and the view jumps to the bottom.

- [ ] **Step 7: Commit**

```bash
git add src/components/chat/ChatArea.tsx
git commit -m "perf: throttle auto-scroll to token rate with user-pinned guard (#4)"
```

---

## Task 3: Gate artifact preview behind stream completion (Issue #7)

**Files:**
- Modify: `src/components/chat/ArtifactPanel.tsx`
- Modify: `src/components/dashboard/DashboardMain.tsx`

`PreviewPane` currently debounces 120ms then runs Babel/esbuild and rebuilds the iframe on every stable gap during streaming. Gating the mount behind `!isStreaming` eliminates all compilation work during streaming, showing a static placeholder instead.

### Part A — Add `isStreaming` prop to ArtifactPanel

- [ ] **Step 1: Extend `ArtifactPanelProps`**

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

- [ ] **Step 2: Destructure `isStreaming` in the component**

Find the destructured props in `ArtifactPanel` (line 257–263):
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

- [ ] **Step 3: Replace `PreviewPane` render in the body with a streaming-guarded version**

Find in the Body section (around line 472):
```tsx
              {activeTab === 'preview' && canPreview ? (
                <PreviewPane artifact={artifact} isDark={isDark} />
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
              {activeTab === 'preview' && canPreview ? (
                isStreaming ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground/60 select-none">
                    Preview available after generation completes
                  </div>
                ) : (
                  <PreviewPane artifact={artifact} isDark={isDark} />
                )
              ) : (
                <PanelCodeView
                  content={artifact.content}
                  language={artifact.language || artifact.kind}
                  isDark={isDark}
                />
              )}
```

### Part B — Pass `isStreaming` from DashboardMain

- [ ] **Step 4: Pass the prop at the call site in `DashboardMain.tsx`**

Find in `DashboardMain.tsx` (around line 442):
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

- [ ] **Step 5: Type-check**

```bash
npm run lint
```
Expected: zero errors.

- [ ] **Step 6: Manual verification**

Start `npm run dev`. Trigger an artifact response (ask the AI for a React component). While it is streaming, open the panel and click the Preview tab. Confirm the placeholder "Preview available after generation completes" is displayed. After the stream ends, confirm Preview renders the compiled result correctly.

- [ ] **Step 7: Commit**

```bash
git add src/components/chat/ArtifactPanel.tsx src/components/dashboard/DashboardMain.tsx
git commit -m "perf: block PreviewPane compilation during streaming (#7)"
```
