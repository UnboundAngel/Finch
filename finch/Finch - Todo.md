---
title: Finch - Todo
date: 2026-04-10
tags:
  - finch
  - active
  - todo
status: in-progress
---

# Finch — dashboard.tsx Split Todo

> [!note] References
> ![[Finch - dashboard Extraction Inventory]]
> ![[Finch - dashboard Split Structure]]
> ![[Finch - dashboard MVP Scope]]

---

## Current Task

==Not started==

---

## Extraction Tasks

> [!warning] Rules
> - Extract one file at a time. Build must pass after each step.
> - Delete the original section from `dashboard.tsx` explicitly — do not leave dead code.
> - Run `npm run build` (or `vite build`) after every extraction before moving on.
> - API keys never touch the React renderer — all LLM calls go through Rust IPC.

### Phase 1 — Types & Shared Utilities (no dependencies, safest first)

- [ ] **Create `src/types/chat.ts`** — extract `Message`, `MessageMetadata`, `ChatSession` interfaces and any related enums from lines 79–117. Delete originals from `dashboard.tsx`. Verify build.
- [ ] **Create `src/lib/chatHelpers.ts`** — extract `getChatIcon` helper (lines 119–134). Update import in `dashboard.tsx`. Verify build.

### Phase 2 — Isolated UI Components (self-contained, no state)

- [ ] **Create `src/components/chat/CodeBlock.tsx`** — extract `CodeBlock` component (lines 175–209). Depends on `react-syntax-highlighter`, `Button`, `Copy`, `Check`. Verify build.
- [ ] **Create `src/components/chat/ThinkingBox.tsx`** — extract `ThinkingBox` component (lines 136–159). Depends on `lucide-react`, `ShiningText`. Verify build.
- [ ] **Create `src/components/chat/MetadataRow.tsx`** — extract `MetadataRow` component (lines 211–251). Depends on `lucide-react`, `MessageMetadata` from `types/chat.ts`. Verify build.

### Phase 3 — Hooks (side-effects out of the component)

- [ ] **Create `src/hooks/useChatPersistence.ts`** — extract all `localStorage` read/write effects (lines 282–317). Must handle chat history load, profile load, and session save. Import `ChatSession` from `types/chat.ts`. Verify build.

### Phase 4 — Composed UI Components (depend on types + hooks)

- [ ] **Create `src/components/chat/MessageBubble.tsx`** — extract individual message rendering from JSX: Chat Messages section (lines 709–808). Wraps `ReactMarkdown`, `CodeBlock`, `MetadataRow`, `ThinkingBox`. Verify build.
- [ ] **Create `src/components/chat/ChatInput.tsx`** — extract composer JSX (lines 810–863). Auto-resizing textarea, file attachment UI, web search toggle, send button. Verify build.
- [ ] **Create `src/components/chat/ChatArea.tsx`** — extract scrollable message list container. Consumes `MessageBubble`, manages scroll ref and `messagesEndRef` effect (lines 420–435). Verify build.
- [ ] **Create `src/components/sidebar/ChatSidebar.tsx`** — extract full sidebar JSX (lines 491–656). Search input, pinned/recent lists, profile footer. Verify build.

### Phase 5 — Dialogs

- [ ] **Create `src/components/dashboard/ProfileDialog.tsx`** — extract profile modal JSX (lines 868–927). Verify build.
- [ ] **Create `src/components/dashboard/SettingsDialog.tsx`** — extract settings modal JSX (lines 930–985). Verify build.

### Phase 6 — Final Orchestrator

- [ ] **Rename/refactor `dashboard.tsx` → `src/components/dashboard/Dashboard.tsx`** — what remains should only be: state initialization, `handleSend`, event handlers, layout root JSX, `SidebarProvider`. Wire all extracted components. Verify build.
- [ ] **Confirm `dashboard.tsx` original is deleted or fully replaced** — no dead code left behind.

---

## Post-Split (Tauri Migration Prep)

> [!info] These do not start until every extraction above is checked off.

- [ ] Define Finch v1 tool list — lock what ships before building anything
- [ ] Migrate `src-tauri/` from `finch-paper/` into `finch/` — update `tauri.conf.json` paths
- [ ] Build Rust LLM bridge — Anthropic streaming invoke command, IPC handler
- [ ] Wire real streaming + metadata off live response
- [ ] Wire file upload + web search once base call is stable

---

## Completed

_(nothing yet)_
