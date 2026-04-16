# Finch

## What This Is

Finch is a standalone Tauri v2 desktop AI chat interface designed to provide a fast, local, and extensible interaction layer for LLMs. It features a modern UI with session management, sidebar navigation, and theme support, separate from the main NeoScript application.

## Core Value

A fast, local, and extensible desktop AI chat interface that feels like a native application and maintains strict security by routing all LLM calls through Rust IPC.

## Requirements

### Validated

- âœ“ **Session Management**: Persistent chat history using `localStorage` â€” *existing*
- âœ“ **Sidebar Navigation**: Pinned/recent chats and search functionality â€” *existing*
- âœ“ **Theme Support**: Light/Dark mode switching â€” *existing*
- âœ“ **Rich Rendering**: Markdown support with syntax-highlighted code blocks â€” *existing*
- âœ“ **Model Selection**: UI for toggling between different AI models â€” *existing*

### Active

- [ ] **Codebase Refactoring**: Split the 1000-line `dashboard.tsx` into a modular component architecture.
- [ ] **Tauri Migration**: Migrate `src-tauri/` from the `finch-paper` prototype and update configuration for Tauri v2.
- [ ] **Rust LLM Bridge**: Implement an Anthropic streaming bridge in the Rust backend.
- [ ] **Real AI Integration**: Wire streaming AI responses and metadata to the React frontend.

### Out of Scope

- **Web Search Integration**: Deferred until the core chat loop is stable.
- **File Upload Processing**: UI exists but backend processing is deferred to post-MVP.
- **Hardcoded Avatars**: Replacing Unsplash placeholders is a low-priority polish item.

## Context

Finch currently exists as a functional UI prototype centered around a single "Mega-Component" (`dashboard.tsx`). While session management and UI interactions are working, AI responses are currently mocked with `setTimeout`. The immediate priority is technical debt reduction (the split) followed by backend enablement.

## Constraints

- **Tech Stack**: React 19, Vite 6, Tailwind CSS 4, Shadcn/UI, Lucide React, Framer Motion 12, React Markdown 10, TypeScript 5.8, Tauri v2.
- **Security**: AI keys and LLM calls must never touch the React renderer; all calls must go through Rust IPC handlers.
- **Performance**: Must maintain a "snappy" native feel on the desktop.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tauri v2 | Performance, security, and native OS integration | â€” Pending |
| React 19 / Vite 6 | Leveraging latest ecosystem features for speed and DX | â€” Pending |
| Component Split | Resolving the 1000-line file to improve maintainability | â€” Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? â†’ Move to Out of Scope with reason
2. Requirements validated? â†’ Move to Validated with phase reference
3. New requirements emerged? â†’ Add to Active
4. Decisions to log? â†’ Add to Key Decisions
5. "What This Is" still accurate? â†’ Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check â€” still the right priority?
3. Audit Out of Scope â€” reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-10 after initialization*
