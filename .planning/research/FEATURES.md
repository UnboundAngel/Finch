# Feature Landscape

**Domain:** Desktop AI Chat Interface
**Researched:** 2025-04-24

## Table Stakes

Features users expect in any modern AI chat interface. Missing these makes the product feel like a prototype.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Real-time Streaming** | Instant feedback reduces perceived latency. | Med | Requires Tauri v2 `Channel` API for smooth Rust-to-JS data flow. |
| **Markdown Rendering** | AI responses are structured (code, bold, lists). | Low | Use `react-markdown` v10 + `shiki` for highlighting. |
| **Session History** | Users need to return to previous conversations. | Med | Persistent storage in `localStorage` or `tauri-plugin-store`. |
| **Stop Generation** | Interrupting long or irrelevant responses. | Low | Must be able to drop the Rust streaming handle. |
| **Dark/Light Mode** | Standard for developer-centric desktop apps. | Low | Tailwind v4 and Shadcn make this trivial. |

## Differentiators

Features that set Finch apart from basic web-based wrappers.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Local-First Security**| API keys and logic stay in Rust/System Keychain. | High | IPC-only model; renderer never sees sensitive keys. |
| **Native Feel (Tauri)** | Low memory footprint, fast startup, OS-level integration. | Med | Smaller binary and faster load times than Electron. |
| **Keyboard-First Navigation** | Fast switching between chats and model selection. | Med | Use `cmd+k` pattern for common actions. |
| **Local Model Support** | Integration with Ollama or local GGUF models via Rust. | High | Backend capability that doesn't bloat the frontend. |

## Anti-Features

Features to explicitly NOT build to maintain focus and performance.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Heavy Social Integration** | Distracts from "local/private" focus. | Keep it a standalone tool. |
| **In-Renderer API Calls** | Security risk; exposes keys to devtools. | All LLM calls must go through Rust IPC. |
| **Complex File Storage** | Overcomplicates MVP. | Use simple local file or `tauri-plugin-store` for history. |

## Feature Dependencies

```
Rust LLM Bridge → Real-time Streaming (Streaming needs backend support)
Tauri v2 Core → Local-First Security (IPC/ACL relies on Tauri v2)
Markdown Rendering → Code Syntax Highlighting (Markdown content often contains code)
```

## MVP Recommendation

Prioritize:
1. **Streaming AI Responses**: Core utility.
2. **Session Persistence**: Makes the app a daily driver.
3. **Rust IPC Security**: Hardened architecture from day one.

Defer: **Local Model Support**: Start with Anthropic/OpenAI bridge first, then expand to local models.

## Sources

- [Vercel AI SDK UX Patterns](https://sdk.vercel.ai/docs) - MEDIUM
- [Tauri v2 Feature List](https://tauri.app) - HIGH
- [Common AI Chat UX Pitfalls](https://medium.com) - MEDIUM
