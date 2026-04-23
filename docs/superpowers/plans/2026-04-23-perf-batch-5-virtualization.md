# Performance Batch 5 — List Virtualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat `messages.map()` render in `ChatArea` with a virtualized list so React only reconciles visible messages, keeping long chats fast regardless of history length.

**Architecture:** Use `react-virtuoso` — it ships built-in `followOutput` for streaming auto-scroll, handles variable-height items automatically (no manual height measurement), and exposes a simple `itemContent` render prop. The existing `MessageBubble` component is unchanged. The manual `scrollIntoView` auto-scroll from Batch 1 is superseded by `followOutput`. If Batch 1 has been applied, the Batch-1 auto-scroll code can be removed; if not, it is simply replaced by `followOutput`.

**Tech Stack:** React 19, TypeScript, `react-virtuoso`. Run `npm run lint` to type-check.

---

## Files Modified

| File | Change |
|------|--------|
| `package.json` | Add `react-virtuoso` dependency |
| `package-lock.json` | Updated by npm install |
| `src/components/chat/ChatArea.tsx` | Replace `messages.map(...)` with `<Virtuoso>`, remove manual scroll logic |

---

## Task 1: Install `react-virtuoso`

- [ ] **Step 1: Install the package**

```bash
npm install react-virtuoso
```
Expected output includes `added 1 package` or similar. No peer-dep warnings expected.

- [ ] **Step 2: Confirm the import resolves**

```bash
npm run lint
```
Expected: zero errors (the package ships its own types).

- [ ] **Step 3: Commit the dependency addition**

```bash
git add package.json package-lock.json
git commit -m "deps: add react-virtuoso for chat list virtualization"
```

---

## Task 2: Replace the message list with `<Virtuoso>` (Issue #5)

**Files:**
- Modify: `src/components/chat/ChatArea.tsx`

**Problem:** `messages.map(...)` renders every message in the history on every token. React still reconciles every element in the loop even with `MessageBubble` memoized. For chats with 100+ messages containing code blocks, this compounds per-token work visibly.

**Fix:** `<Virtuoso>` only mounts visible items. `followOutput="smooth"` replaces the manual `scrollIntoView` auto-scroll. Variable-height items are handled automatically.

- [ ] **Step 1: Add the `Virtuoso` import at the top of `ChatArea.tsx`**

After the existing imports (after line 10), add:
```tsx
import { Virtuoso } from 'react-virtuoso';
```

- [ ] **Step 2: Remove all manual scroll logic added in Batch 1 (or the original scroll effect)**

Remove the following from `ChatArea.tsx` (if Batch 1 was applied, remove all of it; if not, remove the original block):

- `scrollContainerRef` ref declaration
- `userScrolledUpRef` ref declaration
- `prevMessageCountRef` ref declaration
- The scroll-detection `useEffect` (the one that adds `'scroll'` event listener)
- The `scrollToBottom` `useCallback`
- The `lastContentLen` variable
- The `useEffect` that calls `scrollToBottom`
- `messagesEndRef` (the `<div ref={messagesEndRef} />` sentinel at line 191)
- `useCallback` from the React import (if it was added in Batch 1 and is no longer needed)

Also remove `messagesEndRef` from the JSX (the `<div ref={messagesEndRef} />` near the end of the content).

- [ ] **Step 3: Remove `scrollContainerRef` from the outer div (if Batch 1 was applied)**

If Batch 1 added `ref={scrollContainerRef}` to the outer scroll div, remove it. The outer div stays, but `Virtuoso` manages its own scroll container.

- [ ] **Step 4: Replace `messages.map(...)` with `<Virtuoso>`**

Find the Messages section in `ChatArea.tsx` (around lines 161–191):
```tsx
          {/* Messages */}
          {messages.map((msg, index) => (
            <MessageBubble
              key={msg.id ?? index}
              msg={msg}
              selectedModel={selectedModel}
              isDark={isDark}
              isLatest={index === messages.length - 1 && !isThinking}
              isIncognito={isIncognito}
              hasCustomBg={hasCustomBg}
              isPinkMode={isPinkMode}
              userAvatarSrc={userAvatarSrc}
              userAvatarLetter={userAvatarLetter}
              onRegenerate={
                msg.role === 'ai' && !msg.streaming && !isThinking ? onRegenerate : undefined
              }
              onEditResend={msg.role === 'user' && !isThinking ? onEditResend : undefined}
              onArtifactClick={onArtifactClick}
            />
          ))}

          {/* Thinking State */}
          {isThinking && (
            <div className="flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-4">
                <SearchStatus events={researchEvents} isThinking={isThinking} />
                <ThinkingBox isActivelyThinking={true} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
```

Replace the entire block (from `{/* Messages */}` through the closing `<div ref={messagesEndRef} />`) with:

```tsx
          {/* Messages — virtualized */}
          {messages.length > 0 && (
            <Virtuoso
              style={{ flex: 1 }}
              data={messages}
              followOutput="smooth"
              increaseViewportBy={{ top: 600, bottom: 600 }}
              itemContent={(index, msg) => (
                <div className="px-0 pb-6">
                  <MessageBubble
                    msg={msg}
                    selectedModel={selectedModel}
                    isDark={isDark}
                    isLatest={index === messages.length - 1 && !isThinking}
                    isIncognito={isIncognito}
                    hasCustomBg={hasCustomBg}
                    isPinkMode={isPinkMode}
                    userAvatarSrc={userAvatarSrc}
                    userAvatarLetter={userAvatarLetter}
                    onRegenerate={
                      msg.role === 'ai' && !msg.streaming && !isThinking ? onRegenerate : undefined
                    }
                    onEditResend={msg.role === 'user' && !isThinking ? onEditResend : undefined}
                    onArtifactClick={onArtifactClick}
                  />
                </div>
              )}
              components={{
                Footer: () =>
                  isThinking ? (
                    <div className="px-0 pb-6 flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="space-y-4">
                        <SearchStatus events={researchEvents} isThinking={isThinking} />
                        <ThinkingBox isActivelyThinking={true} />
                      </div>
                    </div>
                  ) : null,
              }}
            />
          )}
```

- [ ] **Step 5: Adjust the outer container**

`Virtuoso` manages its own scroll container, so the outer div no longer needs `overflow-y-auto`. Update the outer div's className:

Find:
```tsx
      className={`flex-1 pt-20 pb-8 scrollbar-hide min-w-0 ${messages.length === 0 && !isThinking ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}
```

Replace with:
```tsx
      className={`flex-1 pt-20 pb-8 scrollbar-hide min-w-0 ${messages.length === 0 && !isThinking ? 'overflow-hidden' : 'flex flex-col overflow-hidden'}`}
```

- [ ] **Step 6: Type-check**

```bash
npm run lint
```
Expected: zero errors.

- [ ] **Step 7: Manual verification — core paths**

Start `npm run dev`. Test the following:

1. **Empty chat**: Verify the welcome screen / quick prompts still render (they are outside `Virtuoso` since `messages.length === 0` guards it).
2. **Short conversation** (5–10 messages): Confirm all messages render, scroll works, auto-scroll fires when the AI responds.
3. **Streaming response**: Confirm the view follows the bottom of the response as tokens arrive (`followOutput="smooth"`).
4. **Long conversation** (scroll up to old messages): Confirm old messages render correctly as they scroll into view (no blank rows).
5. **Thinking state**: Confirm the `ThinkingBox` footer appears at the bottom when `isThinking` is true.
6. **Regenerate / edit buttons**: Confirm they still appear on the correct messages.

- [ ] **Step 8: Manual verification — performance**

Open DevTools → Performance. Start recording. Send a message in a chat with 50+ messages. Confirm the rAF frames stay green (under 16ms) throughout the streaming response. The scripting time per frame should be significantly lower than without virtualization.

- [ ] **Step 9: Commit**

```bash
git add src/components/chat/ChatArea.tsx
git commit -m "perf: virtualize chat message list with react-virtuoso and followOutput auto-scroll (#5)"
```
