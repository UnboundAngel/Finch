# REQUIREMENTS.md

## v1 Requirements (MVP)

### Architecture & Foundation (ARCH)
- [x] **ARCH-01**: Modular Component Architecture. Split the 1000-line `dashboard.tsx` into a maintainable component structure (Hooks, Types, Chat Components, Sidebar, Dialogs).
- [x] **ARCH-02**: Tauri v2 Migration. Migrate the `src-tauri` prototype to Tauri v2 standards, updating configurations and capabilities.
- [x] **ARCH-03**: Backend/Renderer Isolation. Ensure all LLM API calls and sensitive data handling occur strictly in the Rust backend, never exposing keys to the React renderer.

### AI Integration (AI)
- [x] **AI-01**: Rust LLM Bridge. Implement a secure IPC bridge in Rust for communicating with the Anthropic API.
- [ ] **AI-02**: Real-time Streaming. Enable token-by-token streaming of AI responses from Rust to the React frontend using Tauri v2 Channels.
- [ ] **AI-03**: Stop Generation. Allow users to interrupt an ongoing AI response generation.
- [ ] **AI-04**: Model Selection. Provide a UI for users to switch between different supported AI models (Anthropic focus for v1).

### UI/UX (UI)
- [x] **UI-01**: Rich Markdown Rendering. Render AI responses with full Markdown support (lists, bold, etc.) using `react-markdown` v10.
- [x] **UI-02**: Syntax Highlighting. Implement theme-aware code syntax highlighting within Markdown blocks.
- [x] **UI-03**: Theme Support. Maintain and refine Light/Dark mode switching using Tailwind CSS 4.
- [ ] **UI-04**: Sidebar Navigation. Functional sidebar for managing pinned/recent chats and searching history.

### Session & Persistence (SESS)
- [ ] **SESS-01**: Persistent History. Save and load chat sessions using `localStorage` (v1 standard) to ensure history survives application restarts.
- [ ] **SESS-02**: Session Management. Users can create, pin, and delete chat sessions from the sidebar.

## v2 Requirements (Deferred)

- **SESS-03**: SQLite Persistence. Transition from `localStorage` to a more robust SQLite database for long-term scalability.
- **AI-05**: Local Model Support. Integration with local LLMs (e.g., Ollama) via the Rust backend.
- **UI-05**: Keyboard-First Navigation. Comprehensive `cmd+k` pattern for common actions and navigation.
- **AI-06**: Advanced Thinking States. Detailed visual indicators for AI "thinking" or "reasoning" steps (beyond simple loader).

## Out of Scope

- **Web Search Integration** — Deferred to maintain focus on core chat stability.
- **File Upload Processing** — Requires significant backend logic; deferred to post-MVP.
- **Social Integration** — Explicitly excluded to maintain "local/private" focus.
- **In-Renderer API Calls** — Strictly prohibited for security reasons; all calls must be mediated by Rust.

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| ARCH-01 | Phase 2 | Complete |
| ARCH-02 | Phase 1 | Complete |
| ARCH-03 | Phase 1 | Complete |
| AI-01 | Phase 3 | Complete |
| AI-02 | Phase 3 | Pending |
| AI-03 | Phase 3 | Pending |
| AI-04 | Phase 3 | Pending |
| UI-01 | Phase 2 | Complete |
| UI-02 | Phase 2 | Complete |
| UI-03 | Phase 2 | Complete |
| UI-04 | Phase 2 | Pending |
| SESS-01 | Phase 4 | Pending |
| SESS-02 | Phase 4 | Pending |

---
*Last updated: 2026-04-10 after initialization*
