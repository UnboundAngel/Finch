# Domain Pitfalls

**Domain:** Desktop AI Chat Interface
**Researched:** 2025-04-24

## Critical Pitfalls

### Pitfall 1: Renderer Context Leak
**What goes wrong:** Sensitive LLM API keys are stored in React state or `localStorage`, exposing them to anyone with access to devtools.
**Why it happens:** Developers treat Tauri as a web browser rather than a secure desktop environment.
**Consequences:** Potential token theft and financial loss.
**Prevention:** Keys must stay in Rust's system keychain (using `keyring-rs` or similar).

### Pitfall 2: IPC Bottleneck
**What goes wrong:** Using `emit` for streaming tokens causes significant UI lag.
**Why it happens:** Each `emit` event must be serialized to JSON, passed through the OS bridge, and deserialized in JS.
**Consequences:** "Choppy" streaming experience and high CPU usage.
**Prevention:** Use the Tauri v2 `Channel` API for streaming.

## Moderate Pitfalls

### Pitfall 1: Large JSON Context Handoff
**What goes wrong:** Every prompt sends the entire chat history from JS to Rust over IPC.
**Prevention:** Maintain conversation history in a Rust `lazy_static` or `Mutex` context; the JS renderer only sends the newest message and a `session_id`.

### Pitfall 2: Blocking the Main Thread (Rust)
**What goes wrong:** Rust's LLM call is synchronous, causing the entire UI to freeze while waiting for the first token.
**Prevention:** Use `tokio` or `std::thread` to handle LLM calls asynchronously in the Rust backend.

## Minor Pitfalls

### Pitfall 1: Lucide Icon Bloat
**What goes wrong:** Importing `lucide-react` icons as default imports instead of tree-shaken named imports.
**Prevention:** Use `import { MessageSquare } from "lucide-react"` and ensure Vite is correctly configured for tree-shaking.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Streaming** | Choppy UI updates | Use `requestAnimationFrame` or `useOptimistic` for state updates. |
| **History** | `localStorage` limit | Use `tauri-plugin-store` for disk-based history storage once history size exceeds 5MB. |
| **Markdown** | Insecure rendering | Ensure `react-markdown` uses the latest versions to prevent XSS from AI-generated HTML tags. |

## Sources

- [Tauri Security Audit Reports](https://tauri.app) - HIGH
- [Vercel AI SDK Best Practices](https://sdk.vercel.ai/docs) - MEDIUM
- [Rust `lazy_static` Patterns](https://docs.rs) - HIGH
