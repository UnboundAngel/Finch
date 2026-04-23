# Performance Batch 3 — Shiki Storm & ArtifactCard Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the frame stall caused by simultaneous Shiki highlights at stream end, and stop `ArtifactCard` from re-rendering every token by giving artifacts stable identities and a custom memo comparator.

**Architecture:** Two independent fixes. The Shiki queue is a module-level singleton in `CodeBlock.tsx` that serializes highlight work through `requestIdleCallback`. The ArtifactCard fix is two-part: stable IDs in `artifactParser.ts` (so the `key` prop and comparator can distinguish artifacts) and a custom `React.memo` comparator in `ArtifactCard.tsx` (so prop-reference churn from the parser doesn't cause re-renders).

**Tech Stack:** React 19, TypeScript. Run `npm run lint` to type-check after each task.

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/chat/CodeBlock.tsx` | Add module-level idle-queue; enqueue highlights instead of running immediately on stream end (issue #8) |
| `src/lib/artifactParser.ts` | Generate stable deterministic IDs using `title + kind` instead of an ephemeral counter (issue #2) |
| `src/components/chat/ArtifactCard.tsx` | Add custom `React.memo` comparator to skip re-renders when artifact identity is unchanged (issue #2) |

---

## Task 1: Idle-queued Shiki highlights on stream completion (Issue #8)

**Files:**
- Modify: `src/components/chat/CodeBlock.tsx`

**Problem:** When `streaming` flips `false`, every `CodeBlock` in the finished message fires `highlight()` simultaneously. Each call awaits `codeToHtml` on the main thread. For a long response with many code fences this produces a visible frame stall right when the user expects the message to settle.

**Fix:** Add a module-level FIFO queue. When streaming ends and highlighting is triggered, each `CodeBlock` pushes its highlight task onto the queue. The queue drains one task at a time using `requestIdleCallback` (falling back to `setTimeout(0)`), keeping the main thread free between tasks.

- [ ] **Step 1: Add the queue module at the top of `CodeBlock.tsx`**

After the imports (after line 6), and before the `interface CodeBlockProps` declaration, add:

```tsx
// Module-level singleton queue that serializes Shiki work through requestIdleCallback
// so all CodeBlocks in a finished message don't highlight simultaneously.
type HighlightJob = () => Promise<void>;
const _queue: HighlightJob[] = [];
let _queueRunning = false;

function _drainQueue(): void {
  if (_queueRunning || _queue.length === 0) return;
  _queueRunning = true;
  const job = _queue.shift()!;
  const runJob = () => {
    Promise.resolve(job()).finally(() => {
      _queueRunning = false;
      _drainQueue();
    });
  };
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(runJob);
  } else {
    setTimeout(runJob, 0);
  }
}

function enqueueHighlight(job: HighlightJob): void {
  _queue.push(job);
  _drainQueue();
}
```

- [ ] **Step 2: Change `CodeBlock`'s `useEffect` to enqueue instead of run immediately**

Find the `highlight()` call near the bottom of the `useEffect` (line 73):
```tsx
    highlight();
  }, [children, language, isDark, streaming]);
```

Replace with:
```tsx
    enqueueHighlight(highlight);
  }, [children, language, isDark, streaming]);
```

The `highlight` async function defined earlier in the same `useEffect` is passed to `enqueueHighlight`. No other changes needed — the existing `renderId` guard still prevents stale writes.

- [ ] **Step 3: Type-check**

```bash
npm run lint
```
Expected: zero errors.

- [ ] **Step 4: Manual verification**

Start `npm run dev`. Ask the AI to write a response with five or more distinct code blocks (e.g. "Show me 6 different sorting algorithms in Python"). Watch the message settle after streaming ends. Confirm the highlighted code blocks appear one after another rather than all at once causing a frame stall. Open DevTools → Performance → record the stream-end transition; verify no large blocking tasks appear on the main thread.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/CodeBlock.tsx
git commit -m "perf: queue Shiki highlights via requestIdleCallback to spread load on stream end (#8)"
```

---

## Task 2: Stable artifact IDs in `artifactParser.ts` (Issue #2 — Part A)

**Files:**
- Modify: `src/lib/artifactParser.ts`

**Problem:** `parseContentSegments` resets `versionCounter` to `0` on every call and falls back to `` `artifact-${versionCounter}` `` as the ID when the model doesn't provide one. This means every call produces new object references with new IDs, even for identical content. React cannot use the `key` prop for stable reconciliation, and `React.memo` bails immediately due to the changed reference.

**Fix:** When `attrs.id` is absent, generate a deterministic fallback ID from `kind + title`. These are static attributes that don't change between parse calls for the same artifact, so the ID stays stable across every call during streaming.

- [ ] **Step 1: Replace the fallback ID generation in `parseContentSegments`**

Find in `artifactParser.ts` (around lines 88–99):
```tsx
    segments.push({
      type: 'artifact',
      artifact: {
        id: attrs.id || `artifact-${versionCounter}`,
        kind: (attrs.type || 'text') as ArtifactKind,
        title: attrs.title || 'Untitled',
        language: attrs.language,
        content: match[2],
        version: versionCounter,
      },
    });
```

Replace with:
```tsx
    const kind = (attrs.type || 'text') as ArtifactKind;
    const title = attrs.title || 'Untitled';
    const stableId = attrs.id || `artifact-${kind}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    segments.push({
      type: 'artifact',
      artifact: {
        id: stableId,
        kind,
        title,
        language: attrs.language,
        content: match[2],
        version: versionCounter,
      },
    });
```

- [ ] **Step 2: Type-check**

```bash
npm run lint
```
Expected: zero errors.

- [ ] **Step 3: Verify stable IDs in the test file**

Open `src/lib/artifactParser.test.ts`. Add a test that calls `parseContentSegments` twice on the same content and asserts the artifact `id` is identical on both calls:

```ts
it('returns stable artifact IDs across repeated parses of the same content', () => {
  const content = '<artifact type="code" title="Hello World" language="python">print("hi")</artifact>';
  const first = parseContentSegments(content);
  const second = parseContentSegments(content);
  expect(first[0].type).toBe('artifact');
  expect(second[0].type).toBe('artifact');
  if (first[0].type === 'artifact' && second[0].type === 'artifact') {
    expect(first[0].artifact.id).toBe(second[0].artifact.id);
    expect(first[0].artifact.id).toBe('artifact-code-hello-world');
  }
});
```

Run the tests:
```bash
npx vitest run src/lib/artifactParser.test.ts
```
Expected: all tests pass including the new one.

- [ ] **Step 4: Commit**

```bash
git add src/lib/artifactParser.ts src/lib/artifactParser.test.ts
git commit -m "perf: generate stable deterministic artifact IDs in parser to enable memo short-circuit (#2 part A)"
```

---

## Task 3: Custom memo comparator on `ArtifactCard` (Issue #2 — Part B)

**Files:**
- Modify: `src/components/chat/ArtifactCard.tsx`

**Problem:** `parseContentSegments` allocates a new `Artifact` object on every call. Even with stable IDs (Task 2), the prop reference is still new each call, so `React.memo`'s default shallow equality re-renders `ArtifactCard` every token. `ArtifactThumbnail` then runs `content.split('\n')` on each re-render.

**Fix:** Add a custom comparator to `React.memo` that compares the fields that actually matter for rendering: `id`, `version`, `content.length`, and `isDark`. If all four are unchanged, the card is skipped entirely.

- [ ] **Step 1: Replace the `memo` call at the bottom of `ArtifactCard.tsx`**

Find the current export (line 58):
```tsx
export const ArtifactCard = memo(function ArtifactCard({
  artifact,
  isDark,
  onClick,
}: ArtifactCardProps) {
```

And the closing of the component (line 104):
```tsx
});
```

The `memo` call wraps the function — add the comparator as the second argument. Change the closing from:
```tsx
});
```
to:
```tsx
}, (prev, next) =>
  prev.artifact.id === next.artifact.id &&
  prev.artifact.version === next.artifact.version &&
  prev.artifact.content.length === next.artifact.content.length &&
  prev.isDark === next.isDark,
);
```

The full closing of `ArtifactCard` should now look like:
```tsx
    </button>
  );
}, (prev, next) =>
  prev.artifact.id === next.artifact.id &&
  prev.artifact.version === next.artifact.version &&
  prev.artifact.content.length === next.artifact.content.length &&
  prev.isDark === next.isDark,
);
```

- [ ] **Step 2: Type-check**

```bash
npm run lint
```
Expected: zero errors.

- [ ] **Step 3: Manual verification**

Start `npm run dev`. Ask the AI for a response that includes an artifact (e.g. "Write me a React component"). While the artifact streams, open DevTools → Components tab and find `ArtifactCard`. Confirm it does **not** re-render on every token — it should only re-render when `content.length` changes (i.e., when a new chunk arrives that extends the artifact body). You should see far fewer re-renders than tokens received.

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/ArtifactCard.tsx
git commit -m "perf: add custom memo comparator to ArtifactCard to skip re-renders during streaming (#2 part B)"
```
