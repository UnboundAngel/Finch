# Project Research Summary

**Project:** Finch
**Domain:** Desktop AI Chat Interface
**Researched:** 2025-04-24
**Confidence:** HIGH

## Executive Summary

Finch is a standalone desktop AI chat interface designed for high performance, security, and a native user experience. Built using the **Tauri v2** framework, it leverages a **Rust-based backend** to handle sensitive LLM API calls and session management, while a **React 19 frontend** provides a snappy, modern UI. Experts build this type of application by strictly separating the UI renderer from the secure backend logic to prevent API key exposure and ensure low memory usage compared to Electron-based alternatives.

The recommended approach involves utilizing **Tauri v2's new Channel API** for real-time token streaming to avoid IPC bottlenecks, and maintaining conversation history within the Rust backend to minimize data transfer overhead. By using **React 19's `useOptimistic`** and **Tailwind CSS 4**, the frontend achieves instant feedback and superior styling performance.

Key risks include potential **security leaks** if API keys are handled in the JavaScript renderer and **performance degradation** if tokens are streamed via standard event emitters. These are mitigated by routing all LLM traffic through Rust IPC and employing high-efficiency streaming channels.

## Key Findings

### Recommended Stack

The stack focuses on the latest stable versions of high-performance tools to ensure a long-term maintainable codebase, prioritizing security and responsiveness.

**Core technologies:**
- **Tauri v2:** Desktop Shell — Industry standard for secure, small-binary apps with a high-performance `Channel` API for AI streaming.
- **React 19:** Frontend Library — Leverages `useOptimistic` for instant feedback and improved form/input handling.
- **Tailwind CSS 4:** Styling — Significant performance boost with the Oxide engine and CSS-first configuration.
- **Shiki:** Syntax Highlighting — Provides VS Code-grade code block rendering for AI-generated snippets.

### Expected Features

**Must have (table stakes):**
- **Real-time Streaming** — Users expect instant token-by-token feedback using Tauri Channels.
- **Markdown Rendering** — Structured responses including code blocks and lists.
- **Session History** — Persistent storage for returning to previous conversations.

**Should have (competitive):**
- **Local-First Security** — API keys and sensitive logic remain in the Rust backend/System Keychain.
- **Keyboard-First Navigation** — Fast switching and command patterns (e.g., `cmd+k`).

**Defer (v2+):**
- **Local Model Support** — Integration with Ollama or local GGUF models is not essential for launch.

### Architecture Approach

Finch follows a **Shared State Backend** pattern where the Rust side maintains the "source of truth" for chat sessions and API interactions, while the React frontend remains an isolated UI layer.

**Major components:**
1. **Tauri (Rust) Backend** — Manages API keys, streams LLM responses, and persists chat history.
2. **React Renderer** — Handles user interactions, optimistic UI updates, and rich content rendering.
3. **IPC Bridge** — A type-safe layer mapping Rust commands to React hooks for seamless communication.

### Critical Pitfalls

1. **Renderer Context Leak** — Storing API keys in JS exposes them to devtools. **Avoid by:** Keeping keys in the System Keychain via Rust.
2. **IPC Bottleneck** — Using `emit` for high-frequency streaming causes UI lag. **Avoid by:** Using the Tauri v2 `Channel` API.
3. **Blocking the Main Thread** — Sync LLM calls freeze the UI. **Avoid by:** Handling LLM calls asynchronously in the Rust backend.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Core Shell & Secure IPC
**Rationale:** Establishing the secure communication layer and latest framework setup is the highest priority dependency for a secure desktop app.
**Delivers:** A functional Tauri v2 shell with a secure Rust-to-React bridge.
**Addresses:** Local-First Security.
**Avoids:** Renderer Context Leak.

### Phase 2: Refactoring & Rich Rendering
**Rationale:** The current monolith prototype must be split into modular components to support future features and ensure maintainability.
**Delivers:** A clean component architecture and high-quality Markdown/Code rendering.
**Uses:** React 19, Tailwind CSS 4, and Shiki.
**Implements:** Markdown Rendering.

### Phase 3: Streaming AI Integration
**Rationale:** Moving from mocked responses to real AI streaming using the recommended high-performance channels.
**Delivers:** Real-time AI chat capability with cloud-based LLMs.
**Addresses:** Real-time Streaming.
**Avoids:** IPC Bottleneck.

### Phase 4: Session Persistence & UX Refinement
**Rationale:** Transitioning from volatile state to persistent storage makes the app usable as a daily tool.
**Delivers:** Chat history management and polished keyboard navigation.
**Uses:** `tauri-plugin-store` and Zustand for state management.
**Implements:** Session History.

### Phase Ordering Rationale

- **Security First:** The foundation is secured (Phase 1) before handling any actual API data.
- **Clean Foundation:** Technical debt from the prototype is addressed (Phase 2) before adding the complexity of streaming.
- **MVP to Daily Driver:** Core utility (Streaming) is established (Phase 3) before adding persistence and polish (Phase 4).

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Streaming):** Standard patterns exist, but specific Rust async implementations for token handling need verification.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Shell):** Well-documented Tauri v2 setup.
- **Phase 4 (Persistence):** Standard `tauri-plugin-store` usage.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Based on latest official documentation for Tauri v2 and React 19. |
| Features | HIGH | Standard AI chat patterns well-established in the industry. |
| Architecture | HIGH | Clear separation of concerns is a core Tauri design principle. |
| Pitfalls | HIGH | Known security and performance issues are well-documented for this stack. |

**Overall confidence:** HIGH

### Gaps to Address

- **Local Model Integration:** Not researched in depth; would require a new research phase if prioritized.
- **Large Context Management:** Long-term scaling of history (potential SQLite requirement) is identified but not mapped for MVP.

## Sources

### Primary (HIGH confidence)
- [Tauri v2 Documentation (2025)](https://tauri.app) — Core shell and IPC architecture.
- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19) — `useOptimistic` and Action patterns.
- [Tailwind CSS v4.0 Announcement](https://tailwindcss.com/blog/tailwindcss-v4-is-here) — Oxide engine and performance gains.

### Secondary (MEDIUM confidence)
- [Vercel AI SDK UX Patterns](https://sdk.vercel.ai/docs) — Best practices for streaming UI.
- [Common AI Chat UX Pitfalls](https://medium.com) — User experience standards for chat interfaces.

---
*Research completed: 2025-04-24*
*Ready for roadmap: yes*
