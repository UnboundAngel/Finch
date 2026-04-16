# Architecture Patterns

**Domain:** Desktop AI Chat Interface
**Researched:** 2025-04-24

## Recommended Architecture

Finch uses a **Shared State Backend** pattern with **Isolated Renderer IPC**.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Tauri (Rust)** | API Management, LLM Streaming, Config storage. | Anthropic/OpenAI APIs, System Keychain. |
| **React Renderer** | UI rendering, user input, session state UI. | Tauri IPC commands. |
| **State Layer (Zustand)**| UI-level state (open sidebars, current chat ID).| React Components. |
| **IPC Bridge** | Type-safe mapping of Rust commands to JS. | Tauri API / React Hooks. |

### Data Flow

1. User sends a message via **React**.
2. React triggers an **IPC call** (`invoke("send_message")`) to **Rust**.
3. **Rust** validates the message, adds context from its local session manager, and calls the **LLM API**.
4. **Rust** initiates a **Tauri Channel** and streams tokens back to the **React Renderer**.
5. **React** receives tokens and updates a `useOptimistic` message list or a streaming state.
6. Once complete, **Rust** triggers a `save_session` event.

## Patterns to Follow

### Pattern 1: Streaming Channels (Tauri v2)
**What:** Use the new `Channel` API instead of repeated `emit` events.
**When:** For high-frequency data like LLM tokens.
**Example:**
```rust
#[tauri::command]
fn stream_tokens(channel: tauri::ipc::Channel<String>) {
  std::thread::spawn(move || {
    for token in tokens {
      channel.send(token).unwrap();
    }
  });
}
```

### Pattern 2: Server-Side Context (Rust)
**What:** Maintain chat history in the Rust backend rather than sending the full conversation with every IPC call.
**Why:** Reduces IPC overhead and improves security. The frontend only stores what it needs for display.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Large JSON IPC Payloads
**What:** Sending 10MB of history as a JSON string over IPC.
**Why bad:** High latency, blocks the main thread during serialization.
**Instead:** Use `tauri-plugin-store` for disk access and Rust-based context management.

### Anti-Pattern 2: Client-Side API Keys
**What:** Storing keys in `localStorage`.
**Why bad:** Visible to anyone with devtools; vulnerable to XSS.
**Instead:** Store keys in the OS Keychain and access only via Rust.

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| **Memory usage** | Low (<50MB) | Constant | Constant |
| **Binary Size** | Low (<10MB) | Constant | Constant |
| **Handoff latency** | Fast (IPC) | Local-only | Local-only |

## Sources

- [Tauri Architecture Overview](https://tauri.app/v2/concepts/architecture) - HIGH
- [Rust/React Performance Patterns](https://github.com/tauri-apps/tauri) - MEDIUM
