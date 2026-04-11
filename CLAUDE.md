<!-- GSD:project-start source:PROJECT.md -->
## Project

**Finch**

Finch is a standalone Tauri v2 desktop AI chat interface designed to provide a fast, local, and extensible interaction layer for LLMs. It features a modern UI with session management, sidebar navigation, and theme support, separate from the main NeoScript application.

**Core Value:** A fast, local, and extensible desktop AI chat interface that feels like a native application and maintains strict security by routing all LLM calls through Rust IPC.

### Constraints

- **Tech Stack**: React 19, Vite 6, Tailwind CSS 4, Shadcn/UI, Lucide React, Framer Motion 12, React Markdown 10, TypeScript 5.8, Tauri v2.
- **Security**: AI keys and LLM calls must never touch the React renderer; all calls must go through Rust IPC handlers.
- **Performance**: Must maintain a "snappy" native feel on the desktop.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Tauri** | v2.x | Desktop Shell | Industry standard for secure, small-binary desktop apps. v2 provides the critical `Channel` API for high-performance AI token streaming. |
| **React** | 19.x | Frontend Library | Leveraging `useOptimistic` for instant chat feedback and improved Actions for form/input handling. |
| **Vite** | 6.x | Build Tool | Latest HMR engine with improved Environment API for cleaner separation of frontend and Tauri-specific builds. |
| **TypeScript** | 5.8.x | Language | Essential for large-scale component refactoring. Includes `--erasableSyntaxOnly` for faster transpilation. |
### Styling & UI
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Tailwind CSS**| 4.x | Styling | Significant performance boost with the Oxide engine. CSS-first configuration removes the need for `tailwind.config.js`. |
| **Shadcn/UI** | Latest | Component Library | Fully compatible with Tailwind v4. Moving toward OKLCH color space for superior dark mode rendering. |
| **Lucide React** | Latest | Icons | Standard icon set for Shadcn; lightweight and tree-shakeable. |
| **Motion** | 12.x | Animations | (Formerly Framer Motion) Optimized for React 19 and GPU-accelerated via native WAAPI where possible. |
### AI & Content Rendering
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **React Markdown**| 10.1.x | Response Rendering | Full CommonMark compliance. Essential for rendering complex AI responses accurately. |
| **Shiki** | Latest | Syntax Highlighting | Provides VS Code-grade highlighting. Much more accurate than Prism for AI-generated snippets. |
| **Tauri Channels**| v2 Core | Token Streaming | Prevents IPC bottlenecks by allowing continuous data flow from Rust to React without re-serialization. |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Zustand** | 5.x | State Management | For UI state (sidebar toggle, session active state) that doesn't belong in a URL or React state. |
| **TanStack Query**| 5.x | Data Fetching | Managing asynchronous IPC calls to Rust and caching chat history. |
| **clsx / tailwind-merge** | Latest | Style Utilities | Standard for dynamic class manipulation in Shadcn components. |
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| **Shell** | Tauri v2 | Electron | Electron binaries are ~100MB+ vs Tauri's <10MB. Electron is also more vulnerable to XSS-based local file access. |
| **Styling** | Tailwind 4 | CSS Modules | Tailwind provides a much faster development loop and more consistent design system via Shadcn. |
| **Icons** | Lucide | FontAwesome | Lucide is designed for React components and has better tree-shaking support than traditional font-based icons. |
| **Syntax** | Shiki | Prism.js | Prism is faster but often fails on edge-case AI-generated code. Shiki uses actual VS Code grammars. |
## Installation
# Core Dependencies
# Tauri Plugins (Frontend side)
# Dev Dependencies
## Sources
- [Tauri v2 Documentation (2025)](https://tauri.app) - HIGH
- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19) - HIGH
- [Tailwind CSS v4.0 Announcement](https://tailwindcss.com/blog/tailwindcss-v4-is-here) - HIGH
- [Motion (Framer Motion) v12 Changelog](https://motion.dev/docs/react-quick-start) - HIGH
- [TypeScript 5.8 Release Blog](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8/) - HIGH
- [React Markdown v10 GitHub](https://github.com/remarkjs/react-markdown) - HIGH
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
