# Finch Baseline Gaps — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all 7 baseline gaps required before public launch of Finch.

**Architecture:** Items 1–6 are pure frontend (TypeScript/React). Item 7 adds Rust backend support for multi-part message content, enabling file/image uploads to reach the AI. Each task is independently committable. Items 4 and 5 share a refactored `invokeStream` helper extracted from `handleSend` — implement Task 4's refactor first, then Task 5 reuses it.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Zustand, Tauri v2 (Rust), lucide-react, framer-motion, `@tauri-apps/plugin-dialog`.

---

## File Map

| File | Tasks |
|---|---|
| `src/index.css` | 1 |
| `src/components/chat/MessageBubble.tsx` | 2, 3, 4, 5 |
| `src/components/chat/MetadataRow.tsx` | 3 |
| `src/components/chat/ChatArea.tsx` | 4, 5 |
| `src/components/dashboard/Dashboard.tsx` | 3, 4, 5, 6 |
| `src/components/dashboard/DashboardMain.tsx` | 4, 5 |
| `src/components/chat/ChatInput.tsx` | 7b |
| `src/hooks/useAIStreaming.ts` | 7b |
| `package.json` | 7b |
| `src-tauri/Cargo.toml` | 7a |
| `src-tauri/src/types.rs` | 7a |
| `src-tauri/src/providers/mod.rs` | 7a |
| `src-tauri/src/providers/anthropic.rs` | 7a |
| `src-tauri/src/ipc/chat.rs` | 7a |

---

## Task 1: Dark Mode Text Selection Contrast

**The bug:** In dark mode, `--selection-text` is `oklch(0.9 0.1 300)` (near-white). User message bubbles use `bg-primary` which is `oklch(0.922 0 0)` (near-white) in dark mode. Selecting text inside a user bubble makes it invisible — light text on a light background.

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Reproduce the bug**

Run `npm run dev`, switch to dark mode, send any message, select text inside the user message bubble. Text should be invisible (white on white).

- [ ] **Step 2: Add a targeted `::selection` override for user message bubbles**

In `src/index.css`, after the `.is-pink-mode *::selection` block (around line 136), add:

```css
.dark .bg-primary *::selection {
  background-color: oklch(0.4 0.15 300 / 35%);
  color: oklch(0.15 0 0);
}
```

- [ ] **Step 3: Verify the fix**

Run `npm run dev`, switch to dark mode, send a message, select text in the user bubble. Text should be readable (dark text on a purple-tinted selection background).

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "fix: dark mode text selection contrast in user message bubbles"
```

---

## Task 2: Copy Button on AI Messages

**The gap:** Copy exists on user messages (`MessageBubble.tsx:122–165`) but not on AI messages.

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx`

- [ ] **Step 1: Verify the gap**

Run `npm run dev`, send a message, hover over the AI response — no copy button appears. Hover over the user message — copy button appears.

- [ ] **Step 2: Add copy button to the AI message action row**

In `src/components/chat/MessageBubble.tsx`, after line 168 (the MetadataRow line), replace:

```tsx
        {msg.role === 'ai' && msg.metadata && <MetadataRow metadata={msg.metadata} isLatest={isLatest || !!msg.streaming} hasCustomBg={hasCustomBg} />}
```

with:

```tsx
        {msg.role === 'ai' && (
          <div className="flex items-center gap-1">
            <div className={cn(
              "flex items-center gap-1 px-1 transition-opacity duration-200",
              copied ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
              <TooltipProvider delay={400}>
                <Tooltip>
                  <TooltipTrigger
                    onClick={handleCopy}
                    className={cn(
                      "p-1.5 rounded-md transition-all active:scale-90",
                      "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.div key="check" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }}>
                          <Check className="h-3.5 w-3.5" />
                        </motion.div>
                      ) : (
                        <motion.div key="copy" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }}>
                          <Files className="h-3.5 w-3.5" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px] py-1 px-2">
                    {copied ? "Copied!" : "Copy"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {msg.metadata && <MetadataRow metadata={msg.metadata} isLatest={isLatest || !!msg.streaming} hasCustomBg={hasCustomBg} />}
          </div>
        )}
```

- [ ] **Step 3: Run type check**

```bash
npm run lint
```
Expected: No errors.

- [ ] **Step 4: Verify visually**

Run `npm run dev`, send a message, hover over the AI response. Copy button should appear at left of the metadata row. Click it — content should be copied and show a checkmark.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/MessageBubble.tsx
git commit -m "feat: add copy button to AI messages"
```

---

## Task 3: Stop Button Cancellation Visual State

**The gap:** When the user clicks Stop, generation halts silently with no visual feedback on the message.

**Files:**
- Modify: `src/components/dashboard/Dashboard.tsx`
- Modify: `src/components/chat/MessageBubble.tsx`
- Modify: `src/components/chat/MetadataRow.tsx`

- [ ] **Step 1: Verify the gap**

Run `npm run dev` (with a connected model), start a long generation, click Stop. The generation stops but the AI message shows no "stopped" indicator.

- [ ] **Step 2: Track abort state in Dashboard — add `wasAbortedRef` and `handleStop`**

In `src/components/dashboard/Dashboard.tsx`, in the `DashboardContent` component body, after the `const { streamMessage, abort, isStreaming } = useAIStreaming();` line (around line 57), add:

```typescript
  const wasAbortedRef = useRef(false);

  const handleStop = useCallback(() => {
    wasAbortedRef.current = true;
    abort();
  }, [abort]);
```

- [ ] **Step 3: Inject `stopReason: 'user_stopped'` in the onComplete callback**

In `Dashboard.tsx`, in the `streamMessage(...)` call inside `handleSend` (around line 220), find the `onComplete` callback:

```typescript
    }, (stats) => {
      session.setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'ai') {
          const final = [...prev.slice(0, -1), { ...last, streaming: false, metadata: { ...last.metadata, ...(stats || {}) } }];
          setTimeout(() => updateActiveSessionInList(final), 0);
          return final;
        }
        return prev;
      });
      setIsThinking(false);
    },
```

Replace with:

```typescript
    }, (stats) => {
      session.setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'ai') {
          const wasAborted = wasAbortedRef.current;
          wasAbortedRef.current = false;
          const mergedStats = { ...(stats || {}) };
          if (wasAborted) mergedStats.stopReason = 'user_stopped';
          const final = [...prev.slice(0, -1), { ...last, streaming: false, metadata: { ...last.metadata, ...mergedStats } }];
          setTimeout(() => updateActiveSessionInList(final), 0);
          return final;
        }
        return prev;
      });
      setIsThinking(false);
    },
```

- [ ] **Step 4: Pass `handleStop` instead of `abort` to DashboardMain**

In `Dashboard.tsx`, in the `<DashboardMain ...>` props block, change:

```typescript
        abort={abort}
```

to:

```typescript
        abort={handleStop}
```

- [ ] **Step 5: Add "Generation stopped" indicator to MessageBubble**

In `src/components/chat/MessageBubble.tsx`, add `Square` to the lucide-react import:

```typescript
import { MessageSquare, Files, Check, Square } from 'lucide-react';
```

Then inside the AI message section, after the closing `</div>` of the bubble content (just before the copy button / MetadataRow block), add this before `{msg.role === 'ai' && (`:

```tsx
        {msg.role === 'ai' && !msg.streaming && msg.metadata?.stopReason === 'user_stopped' && (
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground/50">
            <Square className="h-2.5 w-2.5 fill-current" />
            <span>Generation stopped</span>
          </div>
        )}
```

- [ ] **Step 6: Exclude `user_stopped` from error highlighting in MetadataRow**

In `src/components/chat/MetadataRow.tsx`, find the `isErrorStopReason` function:

```typescript
  const isErrorStopReason = (reason?: string) => {
    if (!reason || reason === 'stop' || reason === 'end_turn' || reason === 'complete') return false;
    return true;
  };
```

Replace with:

```typescript
  const isErrorStopReason = (reason?: string) => {
    if (!reason || reason === 'stop' || reason === 'end_turn' || reason === 'complete' || reason === 'user_stopped') return false;
    return true;
  };
```

- [ ] **Step 7: Run type check**

```bash
npm run lint
```
Expected: No errors.

- [ ] **Step 8: Verify visually**

Run `npm run dev`, send a message to a connected model, click Stop. The AI message should show a small "⬛ Generation stopped" indicator below the bubble.

- [ ] **Step 9: Commit**

```bash
git add src/components/dashboard/Dashboard.tsx src/components/chat/MessageBubble.tsx src/components/chat/MetadataRow.tsx
git commit -m "feat: show visual indicator when generation is stopped by user"
```

---

## Task 4: Regenerate Response

**The gap:** No way to retry an AI response. User must retype.

**Files:**
- Modify: `src/components/dashboard/Dashboard.tsx`
- Modify: `src/components/dashboard/DashboardMain.tsx`
- Modify: `src/components/chat/ChatArea.tsx`
- Modify: `src/components/chat/MessageBubble.tsx`

- [ ] **Step 1: Refactor `handleSend` in Dashboard.tsx to extract `invokeStream`**

This extracts the streaming invocation into a reusable function that `handleRegenerate` and (later) `handleEditResend` can share.

In `src/components/dashboard/Dashboard.tsx`, extract the streaming logic from `handleSend` into a new `invokeStream` callback. Add `invokeStream` as a `useCallback` in the `DashboardContent` body, replacing the inline `streamMessage(...)` call inside `handleSend`:

```typescript
  const invokeStream = useCallback((
    userMessage: string,
    historyWithUserMsg: Message[],
  ) => {
    const { systemPrompt, temperature, topP, maxTokens } = useModelParams.getState();
    setIsThinking(true);
    let isFirstToken = true;
    const aiMessageId = crypto.randomUUID();
    wasAbortedRef.current = false;

    streamMessage(
      userMessage, selectedModel, selectedProvider,
      (token) => {
        if (isFirstToken) {
          setIsThinking(false);
          isFirstToken = false;
          session.setMessages(prev => [...prev, {
            id: aiMessageId, role: 'ai', content: token, streaming: true,
            metadata: { timestamp: new Date(), model: selectedModel }
          }]);
        } else {
          session.setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'ai') return [...prev.slice(0, -1), { ...last, content: last.content + token }];
            return prev;
          });
        }
      },
      (ev) => setResearchEvents(prev => [...prev, ev]),
      (stats) => {
        session.setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'ai') {
            const wasAborted = wasAbortedRef.current;
            wasAbortedRef.current = false;
            const mergedStats = { ...(stats || {}) };
            if (wasAborted) mergedStats.stopReason = 'user_stopped';
            const final = [...prev.slice(0, -1), { ...last, streaming: false, metadata: { ...last.metadata, ...mergedStats } }];
            setTimeout(() => updateActiveSessionInList(final), 0);
            return final;
          }
          return prev;
        });
        setIsThinking(false);
      },
      (err) => { setIsThinking(false); toast.error(`Error: ${err}`); },
      { systemPrompt, temperature, topP, maxTokens, enableWebSearch: isWebSearchActive },
      historyWithUserMsg,
    );
  }, [selectedModel, selectedProvider, isWebSearchActive, streamMessage, session, wasAbortedRef]);
```

Then replace the entire `streamMessage(...)` call in `handleSend` (starting at `let isFirstToken = true;` and ending at `updatedMessages);`) with:

```typescript
    invokeStream(userMessage, updatedMessages);
```

The `handleSend` function after this refactor should look like:

```typescript
  const handleSend = async (bypassCheck = false) => {
    if (!input.trim() || isThinking || isStreaming) return;
    const { systemPrompt, temperature, topP, maxTokens, contextIntelligence: ci } = useModelParams.getState();
    if (!bypassCheck && maxTokens > (ci?.hardware_safe_limit || 8192)) {
      openOverflowModal(ci?.hardware_safe_limit || 8192, maxTokens, () => handleSend(true));
      return;
    }
    const userMessage = input.trim();
    setInput('');
    setResearchEvents([]);
    const updatedMessages: Message[] = [...session.messages, { id: crypto.randomUUID(), role: 'user', content: userMessage }];
    session.setMessages(updatedMessages);
    await updateActiveSessionInList(updatedMessages);
    invokeStream(userMessage, updatedMessages);
  };
```

- [ ] **Step 2: Run type check after refactor**

```bash
npm run lint
```
Expected: No errors. Verify behavior: send a message — it should still work exactly as before.

- [ ] **Step 3: Add `handleRegenerate` to Dashboard.tsx**

Add after `invokeStream`:

```typescript
  const handleRegenerate = useCallback(async () => {
    if (isThinking || isStreaming) return;
    const msgs = session.messages;
    const lastUserIdx = msgs.reduceRight(
      (found, m, i) => found !== -1 ? found : (m.role === 'user' ? i : -1), -1
    );
    if (lastUserIdx === -1) return;
    const userMsg = msgs[lastUserIdx];
    const truncated = msgs.slice(0, lastUserIdx + 1);
    session.setMessages(truncated);
    setResearchEvents([]);
    await updateActiveSessionInList(truncated);
    invokeStream(userMsg.content, truncated);
  }, [session.messages, isThinking, isStreaming, invokeStream, session, updateActiveSessionInList]);
```

- [ ] **Step 4: Add `onRegenerate` prop to DashboardMain interface and pass-through**

In `src/components/dashboard/DashboardMain.tsx`, add to the `DashboardMainProps` interface (after `handleSend: () => void;`):

```typescript
  onRegenerate: () => void;
```

In the destructuring block at the top of `DashboardMain` function body, add `onRegenerate` to the destructured props.

In the `<ChatArea ...>` props block, add:

```tsx
                      onRegenerate={onRegenerate}
```

In the `<DashboardMain ...>` call in `Dashboard.tsx`, add:

```tsx
        onRegenerate={handleRegenerate}
```

- [ ] **Step 5: Add `onRegenerate` prop to ChatArea and thread to MessageBubble**

In `src/components/chat/ChatArea.tsx`, add to `ChatAreaProps`:

```typescript
  onRegenerate?: () => void;
```

Add `onRegenerate` to the destructured props in `ChatArea`.

In the `messages.map(...)` block, pass `onRegenerate` to each `<MessageBubble>`, only wiring it on the last AI message:

```tsx
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
                msg.role === 'ai' && index === messages.length - 1 && !isThinking
                  ? onRegenerate
                  : undefined
              }
            />
```

- [ ] **Step 6: Add regenerate button to MessageBubble**

In `src/components/chat/MessageBubble.tsx`, add `RefreshCw` to the lucide-react import:

```typescript
import { MessageSquare, Files, Check, Square, RefreshCw } from 'lucide-react';
```

Add `onRegenerate?: () => void` to the `MessageBubbleProps` interface.

Add `onRegenerate` to the destructured props.

In the AI message action row (the block that now starts with `{msg.role === 'ai' && (`), add the regenerate button before the copy button:

```tsx
        {msg.role === 'ai' && (
          <div className="flex items-center gap-1">
            <div className={cn(
              "flex items-center gap-1 px-1 transition-opacity duration-200",
              copied ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
              {onRegenerate && (
                <TooltipProvider delay={400}>
                  <Tooltip>
                    <TooltipTrigger
                      onClick={onRegenerate}
                      className={cn(
                        "p-1.5 rounded-md transition-all active:scale-90",
                        "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[10px] py-1 px-2">
                      Regenerate
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <TooltipProvider delay={400}>
                {/* ... existing copy button code ... */}
              </TooltipProvider>
            </div>
            {msg.metadata && <MetadataRow ... />}
          </div>
        )}
```

- [ ] **Step 7: Run type check**

```bash
npm run lint
```
Expected: No errors.

- [ ] **Step 8: Verify visually**

Run `npm run dev`, send a message with a connected model. Hover over the AI response — a regenerate icon should appear. Click it — the AI response should be replaced with a fresh one.

- [ ] **Step 9: Commit**

```bash
git add src/components/dashboard/Dashboard.tsx src/components/dashboard/DashboardMain.tsx src/components/chat/ChatArea.tsx src/components/chat/MessageBubble.tsx
git commit -m "feat: add regenerate response button to AI messages"
```

---

## Task 5: Edit User Message + Resend

**The gap:** Messages are immutable after sending. No way to fix a typo or rephrase without starting over.

**Files:**
- Modify: `src/components/dashboard/Dashboard.tsx`
- Modify: `src/components/dashboard/DashboardMain.tsx`
- Modify: `src/components/chat/ChatArea.tsx`
- Modify: `src/components/chat/MessageBubble.tsx`

- [ ] **Step 1: Add `handleEditResend` to Dashboard.tsx**

In `src/components/dashboard/Dashboard.tsx`, after `handleRegenerate`, add:

```typescript
  const handleEditResend = useCallback(async (messageId: string, newContent: string) => {
    if (isThinking || isStreaming) return;
    const msgs = session.messages;
    const idx = msgs.findIndex(m => m.id === messageId);
    if (idx === -1) return;
    const editedMessage: Message = { ...msgs[idx], content: newContent };
    const truncated = [...msgs.slice(0, idx), editedMessage];
    session.setMessages(truncated);
    setResearchEvents([]);
    await updateActiveSessionInList(truncated);
    invokeStream(newContent, truncated);
  }, [session.messages, isThinking, isStreaming, invokeStream, session, updateActiveSessionInList]);
```

- [ ] **Step 2: Thread `onEditResend` through DashboardMain and ChatArea**

In `DashboardMainProps` (in `DashboardMain.tsx`), add:

```typescript
  onEditResend: (messageId: string, newContent: string) => void;
```

Destructure `onEditResend` in the `DashboardMain` body and add it to the `<ChatArea>` props:

```tsx
                      onEditResend={onEditResend}
```

In `Dashboard.tsx`, add to `<DashboardMain>`:

```tsx
        onEditResend={handleEditResend}
```

In `ChatAreaProps` (in `ChatArea.tsx`), add:

```typescript
  onEditResend?: (messageId: string, newContent: string) => void;
```

Destructure it and pass to `<MessageBubble>` for user messages:

```tsx
              onEditResend={msg.role === 'user' && !isThinking ? onEditResend : undefined}
```

- [ ] **Step 3: Add edit functionality to MessageBubble**

In `src/components/chat/MessageBubble.tsx`, add `Pencil, X` to the lucide-react import:

```typescript
import { MessageSquare, Files, Check, Square, RefreshCw, Pencil, X } from 'lucide-react';
```

Add to `MessageBubbleProps`:

```typescript
  onEditResend?: (messageId: string, newContent: string) => void;
```

Destructure `onEditResend` in the component.

Add edit state at the top of the component (after `const [copied, setCopied] = React.useState(false);`):

```typescript
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState('');
```

Add edit submit handler:

```typescript
  const handleEditSubmit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== msg.content && msg.id) {
      onEditResend?.(msg.id, trimmed);
    }
    setIsEditing(false);
  };
```

In the user message bubble content block, replace the `ReactMarkdown` render with a conditional:

```tsx
            <div className="min-h-[1.5rem]">
              {isEditing ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSubmit(); }
                      if (e.key === 'Escape') setIsEditing(false);
                    }}
                    className="w-full bg-white/20 text-primary-foreground rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-white/40 min-h-[60px]"
                    rows={3}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="text-xs px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-primary-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEditSubmit}
                      className="text-xs px-3 py-1 rounded-md bg-white/30 hover:bg-white/40 text-primary-foreground font-medium transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              ) : (
                /* ... existing ReactMarkdown render unchanged ... */
              )}
            </div>
```

In the user message action row (the existing `{msg.role === 'user' && (` block), add an edit button before the copy button:

```tsx
            {onEditResend && !isEditing && (
              <TooltipProvider delay={400}>
                <Tooltip>
                  <TooltipTrigger
                    onClick={() => { setEditValue(msg.content); setIsEditing(true); }}
                    className={cn(
                      "p-1.5 rounded-md transition-all active:scale-90",
                      "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px] py-1 px-2">Edit</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
```

- [ ] **Step 4: Run type check**

```bash
npm run lint
```
Expected: No errors.

- [ ] **Step 5: Verify visually**

Run `npm run dev`, send two messages, hover over the first user message — a pencil icon should appear. Click it — an inline textarea appears pre-filled with the message. Edit the text and press Enter or click Send. The conversation should truncate to that point and re-invoke the stream with the edited message.

Test the Cancel button — editing should cancel without change. Test Escape key — same as Cancel.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/Dashboard.tsx src/components/dashboard/DashboardMain.tsx src/components/chat/ChatArea.tsx src/components/chat/MessageBubble.tsx
git commit -m "feat: edit user messages and resend"
```

---

## Task 6: Auto-Naming Chats

**The gap:** Chat titles default to `messages[0].content.substring(0, 40)` — raw truncated text. No AI-generated naming.

**Files:**
- Modify: `src/components/dashboard/Dashboard.tsx`

- [ ] **Step 1: Verify the gap**

Run `npm run dev`, send a message. Check the sidebar — the chat title is the first 40 characters of the message verbatim.

- [ ] **Step 2: Add `autoNameChat` to Dashboard.tsx**

In `src/components/dashboard/Dashboard.tsx`, in `DashboardContent`, add after `handleEditResend`:

```typescript
  const autoNameChat = useCallback(async (userMessage: string) => {
    const sessionId = session.activeSessionIdRef.current;
    if (!sessionId || !selectedModel || !selectedProvider) return;
    try {
      const title = await invoke<string>('send_message', {
        prompt: `Give this chat a 4-6 word title based on the opening message. Reply with ONLY the title — no quotes, no punctuation, no explanation.\n\nMessage: "${userMessage.substring(0, 300)}"`,
        model: selectedModel,
        provider: selectedProvider,
        conversationHistory: [],
        systemPrompt: 'You are a chat title generator. Reply with only a concise title.',
        maxTokens: 20,
      });
      const cleanTitle = title.trim().replace(/^["'\s]+|["'\s]+$/g, '').replace(/[.,!?]$/, '');
      if (!cleanTitle || cleanTitle.length > 80) return;
      setRecentChats(prev => {
        const chat = prev.find(c => c.id === sessionId);
        if (!chat) return prev;
        const updated = { ...chat, title: cleanTitle };
        void invoke('save_chat', { chat: updated });
        return prev.map(c => c.id === sessionId ? updated : c);
      });
    } catch {
      // Silent fail — fallback title already set
    }
  }, [selectedModel, selectedProvider, session.activeSessionIdRef]);
```

- [ ] **Step 3: Fire `autoNameChat` on the first message**

In `handleSend`, after `await updateActiveSessionInList(updatedMessages);` and before `invokeStream(...)`, add:

```typescript
    if (session.messages.length === 0) {
      void autoNameChat(userMessage);
    }
```

Note: `session.messages.length === 0` is checked before adding the new message — this fires only on the very first message of a new chat.

- [ ] **Step 4: Run type check**

```bash
npm run lint
```
Expected: No errors.

- [ ] **Step 5: Verify**

Run `npm run dev` with a connected model, start a new chat, send a first message. The sidebar title should initially show the truncated text, then update to a short AI-generated title within a few seconds.

Test in incognito mode — `autoNameChat` will silently skip (session isn't saved so `sessionId` check fails).

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/Dashboard.tsx
git commit -m "feat: auto-name chats using AI on first message"
```

---

## Task 7a: File Upload — Rust Backend

**The work:** Add `AttachmentInput` type, a `inject_attachments_into_messages` helper, and wire it into `stream_message`. Change Anthropic's `Message.content` from `String` to `Value` to support multi-part content.

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/types.rs`
- Modify: `src-tauri/src/providers/mod.rs`
- Modify: `src-tauri/src/providers/anthropic.rs`
- Modify: `src-tauri/src/ipc/chat.rs`

- [ ] **Step 1: Add `base64` crate to Cargo.toml**

In `src-tauri/Cargo.toml`, in the `[dependencies]` section, add after `image = ...`:

```toml
base64 = "0.22"
```

- [ ] **Step 2: Add `AttachmentInput` type to types.rs**

In `src-tauri/src/types.rs`, after the `ChatMessage` struct, add:

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AttachmentInput {
    pub path: String,
}
```

- [ ] **Step 3: Change Anthropic `Message.content` from `String` to `serde_json::Value`**

In `src-tauri/src/providers/anthropic.rs`, find:

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub role: String,
    pub content: String,
}
```

Replace with:

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub role: String,
    pub content: serde_json::Value,
}
```

- [ ] **Step 4: Add `inject_attachments_into_messages` to providers/mod.rs**

In `src-tauri/src/providers/mod.rs`, add at the top:

```rust
use crate::types::AttachmentInput;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use std::path::Path;
```

Then add this function after `prepare_messages`:

```rust
fn detect_mime(path: &Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()) {
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("pdf") => "application/pdf",
        _ => "application/octet-stream",
    }
}

pub fn inject_attachments_into_messages(
    messages: &mut serde_json::Value,
    provider: &str,
    attachments: &[AttachmentInput],
) -> Result<(), String> {
    if attachments.is_empty() {
        return Ok(());
    }
    let msgs = messages.as_array_mut().ok_or("messages is not an array")?;
    // Find the last user/user-role message
    let last_user_idx = msgs.iter().rposition(|m| {
        m.get("role").and_then(|r| r.as_str()) == Some("user")
    }).ok_or("no user message found")?;

    for attachment in attachments {
        let path = Path::new(&attachment.path);
        let bytes = std::fs::read(path)
            .map_err(|e| format!("Failed to read attachment {}: {}", attachment.path, e))?;
        let b64 = BASE64.encode(&bytes);
        let mime = detect_mime(path);

        match provider {
            "anthropic" => {
                let msg = &mut msgs[last_user_idx];
                let original_text = msg["content"].as_str().unwrap_or("").to_string();
                msg["content"] = serde_json::json!([
                    { "type": "text", "text": original_text },
                    { "type": "image", "source": { "type": "base64", "media_type": mime, "data": b64 } }
                ]);
            }
            "gemini" => {
                let msg = &mut msgs[last_user_idx];
                if let Some(parts) = msg["parts"].as_array_mut() {
                    parts.push(serde_json::json!({ "inlineData": { "mimeType": mime, "data": b64 } }));
                }
            }
            "local_ollama" => {
                let msg = &mut msgs[last_user_idx];
                let images = msg["images"].as_array_mut();
                if let Some(arr) = images {
                    arr.push(serde_json::json!(b64));
                } else {
                    msg["images"] = serde_json::json!([b64]);
                }
            }
            _ => {
                // OpenAI and LM Studio: replace content string with array
                let msg = &mut msgs[last_user_idx];
                let original_text = msg["content"].as_str().unwrap_or("").to_string();
                msg["content"] = serde_json::json!([
                    { "type": "text", "text": original_text },
                    { "type": "image_url", "image_url": { "url": format!("data:{};base64,{}", mime, b64) } }
                ]);
            }
        }
    }
    Ok(())
}
```

- [ ] **Step 5: Update `stream_message` in ipc/chat.rs to accept attachments**

In `src-tauri/src/ipc/chat.rs`, add to the imports at the top:

```rust
use crate::types::{ChatMessage, AppState, StreamingEvent, ProviderConfig, SourceEntry, AttachmentInput};
use crate::providers::{prepare_messages, map_model, inject_attachments_into_messages};
```

In the `stream_message` function signature, add the parameter after `enable_web_search`:

```rust
    attachments: Option<Vec<AttachmentInput>>,
```

After the `let messages = prepare_messages(...)` line in `stream_message`, add:

```rust
    let mut messages = prepare_messages(conversation_history, final_prompt, &provider, &model, system_prompt.clone(), max_tokens);
    if let Some(ref att) = attachments {
        if !att.is_empty() {
            inject_attachments_into_messages(&mut messages, &provider, att)
                .map_err(|e| format!("Attachment error: {}", e))?;
        }
    }
```

Note: change the existing `let messages = ...` to `let mut messages = ...`.

For the Anthropic branch in `stream_message`, the deserialization `serde_json::from_value(messages)` now deserializes into `Vec<anthropic::Message>` where `content: serde_json::Value`. This will correctly handle both string and array content values.

- [ ] **Step 6: Compile check**

```bash
cd src-tauri && cargo check 2>&1 | head -40
```
Expected: No errors. If there are errors about `use` statements not found, add missing `use` declarations.

- [ ] **Step 7: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/src/types.rs src-tauri/src/providers/mod.rs src-tauri/src/providers/anthropic.rs src-tauri/src/ipc/chat.rs
git commit -m "feat(rust): add attachment injection for file/image uploads to all providers"
```

---

## Task 7b: File Upload — Frontend

**The work:** Replace the browser File API with the Tauri dialog plugin to get absolute file paths; thread attachment paths to `stream_message` IPC.

**Files:**
- Modify: `package.json`
- Modify: `src/components/chat/ChatInput.tsx`
- Modify: `src/hooks/useAIStreaming.ts`
- Modify: `src/components/dashboard/Dashboard.tsx`
- Modify: `src/components/dashboard/DashboardMain.tsx`

- [ ] **Step 1: Install `@tauri-apps/plugin-dialog`**

```bash
npm install @tauri-apps/plugin-dialog@^2.0.0
```

Expected: Package added to `package.json` dependencies.

- [ ] **Step 2: Change `attachedFile` type in DashboardMain**

In `src/components/dashboard/DashboardMain.tsx`, change the interface:

```typescript
  attachedFile: File | null;
  setAttachedFile: (val: File | null) => void;
```

to:

```typescript
  attachedFile: { name: string; path: string } | null;
  setAttachedFile: (val: { name: string; path: string } | null) => void;
```

- [ ] **Step 3: Update ChatInput to use Tauri dialog for file picking**

In `src/components/chat/ChatInput.tsx`, add the new import at the top:

```typescript
import { open as openFilePicker } from '@tauri-apps/plugin-dialog';
import { isTauri } from '@/src/lib/tauri-utils';
```

Change the `ChatInputProps` interface:

```typescript
  attachedFile: { name: string; path: string } | null;
  setAttachedFile: (file: { name: string; path: string } | null) => void;
```

Replace the `handleFileChange` handler and file input element. Remove `const fileInputRef = useRef<HTMLInputElement>(null);` and `handleFileChange`. Add:

```typescript
  const handleAttachClick = async () => {
    if (isTauri()) {
      const result = await openFilePicker({
        multiple: false,
        filters: [{ name: 'Images & Documents', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'] }],
      });
      if (result && typeof result === 'string') {
        const parts = result.replace(/\\/g, '/').split('/');
        setAttachedFile({ name: parts[parts.length - 1], path: result });
      }
    }
  };
```

Remove the hidden `<input type="file" ...>` element from the JSX.

Change the Paperclip Button `onClick`:

```typescript
onClick={handleAttachClick}
```

- [ ] **Step 4: Add `attachments` parameter to `useAIStreaming.streamMessage`**

In `src/hooks/useAIStreaming.ts`, add to the `streamMessage` parameters (after `history: Message[] = []`):

```typescript
    attachments?: { path: string }[]
```

In the Tauri branch, update the `await invoke("stream_message", ...)` call. Add to the invoke args object:

```typescript
      ...(attachments && attachments.length > 0 ? { attachments } : {}),
```

This adds `attachments` only when present, so the Rust `Option<Vec<AttachmentInput>>` stays `None` for normal text-only messages.

- [ ] **Step 5: Thread attachment through `invokeStream` in Dashboard.tsx**

In `src/components/dashboard/Dashboard.tsx`, change `attachedFile` state type:

```typescript
  const [attachedFile, setAttachedFile] = useState<{ name: string; path: string } | null>(null);
```

Update `invokeStream` signature to accept an optional attachment path:

```typescript
  const invokeStream = useCallback((
    userMessage: string,
    historyWithUserMsg: Message[],
    attachmentPath?: string,
  ) => {
```

In the `streamMessage(...)` call inside `invokeStream`, after the `history` param, add:

```typescript
      attachmentPath ? [{ path: attachmentPath }] : undefined,
```

In `handleSend`, capture and clear the attached file before calling `invokeStream`:

```typescript
    const attachmentPath = attachedFile?.path;
    setAttachedFile(null);
    invokeStream(userMessage, updatedMessages, attachmentPath);
```

- [ ] **Step 6: Run type check**

```bash
npm run lint
```
Expected: No errors.

- [ ] **Step 7: Verify visually (requires Tauri desktop build)**

Run `npm run tauri dev`. Click the Paperclip button — the Tauri native file dialog should open. Select a PNG image. The attachment pill should show the filename. Send a message with a vision-capable model (e.g., Claude claude-3-5-sonnet or GPT-4o). The model should respond about the image content.

For non-Tauri browser dev (`npm run dev`): the Paperclip button does nothing (Tauri dialog unavailable) — this is expected behavior for a desktop app.

- [ ] **Step 8: Update the "Analyze an image" empty-state card**

In `src/components/chat/ChatArea.tsx`, the "Analyze an image" card at line 104 currently only sets the input text. It's now useful since file upload works. No code change needed — the card already sets `setInput('Analyze this image: ')` which prompts the user to also attach a file.

- [ ] **Step 9: Commit**

```bash
git add package.json src/components/chat/ChatInput.tsx src/hooks/useAIStreaming.ts src/components/dashboard/Dashboard.tsx src/components/dashboard/DashboardMain.tsx
git commit -m "feat: wire file/image attachments through to AI providers"
```

---

## Verification Checklist (Full Phase)

After all tasks are committed, do a single pass with `npm run tauri dev`:

- [ ] Dark mode: select text in a user message bubble — text is readable
- [ ] Send a message — hover over AI response — copy button appears and works
- [ ] Start a generation, click Stop — "Generation stopped" badge appears on the AI message
- [ ] Hover over an AI message — regenerate icon appears; click it — response is replaced
- [ ] Hover over a user message — pencil icon appears; click it — inline edit opens; submit — history truncates and re-generates
- [ ] Start a new chat, send first message — sidebar title updates from truncated text to an AI-generated title within seconds
- [ ] Attach an image, send to a vision model (Claude, GPT-4o) — model responds about image content
- [ ] Verify all 5 providers work with text-only messages after the Rust changes (no regressions)

---

## Post-Phase: Update BACKLOG.md

Mark all 7 Baseline items as `[x]` in `docs/product/BACKLOG.md` and commit:

```bash
git add docs/product/BACKLOG.md
git commit -m "docs: mark all 7 baseline gaps as complete"
```
