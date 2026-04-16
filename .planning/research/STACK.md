# Technology Stack

**Project:** Finch
**Researched:** 2025-04-24
**Confidence:** HIGH

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

```bash
# Core Dependencies
npm install react@19 react-dom@19 react-markdown@10 motion lucide-react zustand @tanstack/react-query shiki clsx tailwind-merge

# Tauri Plugins (Frontend side)
npm install @tauri-apps/api @tauri-apps/plugin-shell @tauri-apps/plugin-dialog @tauri-apps/plugin-store

# Dev Dependencies
npm install -D typescript@5.8 vite@6 tailwindcss@4 @types/react@19 @types/react-dom@19
```

## Sources

- [Tauri v2 Documentation (2025)](https://tauri.app) - HIGH
- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19) - HIGH
- [Tailwind CSS v4.0 Announcement](https://tailwindcss.com/blog/tailwindcss-v4-is-here) - HIGH
- [Motion (Framer Motion) v12 Changelog](https://motion.dev/docs/react-quick-start) - HIGH
- [TypeScript 5.8 Release Blog](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8/) - HIGH
- [React Markdown v10 GitHub](https://github.com/remarkjs/react-markdown) - HIGH
