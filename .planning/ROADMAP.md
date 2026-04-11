# ROADMAP

## Phases

- [x] **Phase 1: Modular Architecture & Rich Rendering** - Refactor component monolith and implement high-quality Markdown rendering.
- [x] **Phase 2: Foundation & Shell** - Establish Tauri v2 shell and secure Rust-to-React bridge.
- [ ] **Phase 3: Secure AI Streaming** - Implement real-time Anthropic streaming via secure Rust IPC.
- [ ] **Phase 4: Session Persistence & Polish** - Enable persistent chat history and manage session lifecycle.

## Phase Details

### Phase 1: Modular Architecture & Rich Rendering
**Goal**: Technical debt reduction and high-fidelity output rendering.
**Depends on**: Nothing
**Requirements**: ARCH-01, UI-01, UI-02, UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. The 1000-line `dashboard.tsx` is decomposed into modular, maintainable React components.
  2. AI responses (currently mocked) render correctly with full Markdown support (lists, tables, formatting).
  3. Code blocks within chat messages display theme-aware syntax highlighting.
  4. The sidebar is fully functional for navigating between recent and pinned chat items.
**Plans**: 6 plans
**Status**: COMPLETED
**UI hint**: yes

Plans:
- [x] 01-01-PLAN.md — Foundation & Shared Utilities (Types, Helpers, small UI)
- [x] 01-02-PLAN.md — Persistence & Dialogs (Hooks, Profile/Settings modals)
- [x] 01-03-PLAN.md — Message Rendering Components (CodeBlock, MessageBubble, ChatArea)
- [x] 01-04-PLAN.md — Chat Input & Sidebar (Composer and Navigation)
- [x] 01-05-PLAN.md — Final Dashboard Orchestrator (Monolith replacement and wiring)
- [x] 01-06-PLAN.md — Rich Rendering Upgrade (Shiki and GFM)

### Phase 2: Foundation & Shell
**Goal**: Establish the secure desktop foundation and communication layer.
**Depends on**: Phase 1
**Requirements**: ARCH-02, ARCH-03
**Success Criteria** (what must be TRUE):
  1. The application launches as a native desktop window using Tauri v2.
  2. The React renderer is strictly isolated; all external LLM API calls are routed through Rust IPC commands.
**Plans**: 3 plans
**Status**: COMPLETED

Plans:
- [x] 02-01-PLAN.md — Tauri v2 Core Migration (Dependencies and scripts)
- [x] 02-02-PLAN.md — Capabilities & Secure Bridge (IPC and permissions)
- [x] 02-03-PLAN.md — Native Shell & Window UI (Controls and drag-regions)

### Phase 3: Secure AI Streaming
**Goal**: Real-time AI chat capability with secure backend mediation.
**Depends on**: Phase 2
**Requirements**: AI-01, AI-02, AI-03, AI-04
**Success Criteria** (what must be TRUE):
  1. Tokens appear in the UI one-by-one as they are received from the Anthropic API.
  2. User can switch between different AI models (e.g., Claude 3.5 Sonnet vs Haiku) via a UI selector.
  3. User can interrupt/stop an ongoing AI response generation at any time.
**Plans**: 3 plans
**Status**: IN PROGRESS
**UI hint**: yes

Plans:
- [x] 03-01-PLAN.md — Secure Rust AI Bridge & Types
- [ ] 03-02-PLAN.md — Real-time Token Streaming with Channels
- [ ] 03-03-PLAN.md — Controls & Interrupts (Abort & Model Selection)

### Phase 4: Session Persistence & Polish
**Goal**: Making the application a reliable daily tool with history.
**Depends on**: Phase 3
**Requirements**: SESS-01, SESS-02
**Success Criteria** (what must be TRUE):
  1. Chat sessions and their histories are saved and successfully reloaded after the application is closed and reopened.
  2. User can pin important sessions to the top of the sidebar or delete unwanted sessions.
**Plans**: TBD
**UI hint**: yes

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Modular Architecture | 6/6 | Completed | 2026-04-10 |
| 2. Foundation & Shell | 3/3 | Completed | 2026-04-10 |
| 3. Secure AI Streaming | 1/3 | In Progress|  |
| 4. Session Persistence | 0/1 | Not started | - |
