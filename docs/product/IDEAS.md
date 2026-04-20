# Finch Vision: The Industry Disruptor Roadmap

This document serves as the master blueprint for the Finch OmniSearch and Intelligence systems. The primary goal is to exceed the standards of platforms like OpenUI by prioritizing **Context, Privacy, and Speed.**

---

## 🚀 1. OmniSearch (The Command Center)
A global, high-speed retrieval system triggered via `Ctrl + F`.

- **Visuals**: Semi-transparent glassmorphic panel (24px blur) with a skeletal loading state.
- **Modes**: 
    - **Current Chat**: Instant filtering of the active session.
    - **Global Search**: Deep retrieval across all stored chat histories.
- **Discord-Style Filters**: Syntax-based filtering for power users.
    - `has:image` | `has:link` | `has:file`
    - `after:YYYY-MM-DD` | `before:YYYY-MM-DD`
    - `model:claude` | `is:bookmarked`
- **Mini-Dropdown Results**: Shows rich snippets with highlighted keywords and a "Jump to Context" button.

---

## 🧠 2. Intelligence & Local ML
Differentiating Finch through privacy-first, hardware-accelerated local intelligence.

- **Local-First Native OCR**: 
    - Use Rust-based OCR (via Tauri) to process image/screenshot text.
    - **Index-on-Ingest**: OCR runs once when a message is received, storing results in hidden metadata for instant search later.
- **Semantic Vector Memory**:
    - Use local vector embeddings (e.g., `all-MiniLM-L6-v2`) to understand the **meaning** of messages.
    - Allows conceptual searches (e.g., find "finances" when searching for "money").
- **The "Librarian" Orchestrator (RAG)**:
    - Instead of dumping raw history into the AI, Finch acts as a Librarian.
    - **Top-K Retrieval**: Only the 3–5 most relevant snippets are injected into the context window.
    - **Token Efficiency**: Reduces costs and increases AI accuracy by eliminating "lost in the middle" hallucinations.
- **Ghost Context (Discovery)**:
    - **Reactive, not Proactive**: Suggestions only appear if the "relevance score" is >90%.
    - **Wait & See Logic**: Background checks only fire after 500ms–1000ms of typing inactivity.
    - **Subtle Alert**: A faint neon glow in the input box if relevant context is found elsewhere.
- **Explicit Tethering**:
    - **Manual Bonding**: A "Link" icon on chats allows users to manually bond two threads.
    - **Context Isolation**: Tethered chats share context; unrelated projects remain strictly isolated.

---

## ⚡ 3. Performance & Stability
Ensuring high-end responsiveness even with massive datasets.

- **Multi-Threaded Shadow Search**: All vector and OCR processing offloaded to Rust background threads.
- **Quantized Vectors**: Compressed data representations for sub-2ms comparisons across 10,000+ entries.
- **Non-Blocking Logic**: The UI thread is shielded from search tasks, maintaining a constant 60FPS during active typing.
- **Pre-Indexing**: Background migration to process existing chats when the app is idle.

---

## 🎨 4. Design & Interaction (2026 Standards)
- **Glassmorphism**: 24px backdrop blur, 1px semi-transparent borders, and layered depth.
- **Dynamic Selection Aura**: Selection colors that adapt to center-screen luminance.
- **Contextual Selection Menu**: Right-click any text to "Add to Context." This stores snippets for current or future prompts.
- **Micro-Animations**: Shimmering skeletal loaders and horizontal "Film-Strip" navigation for search results.

---

## 📂 5. Workspace & Organization
- **Advanced Sidebar**: Folders, categories, and drag-and-drop organization.
- **Finch Projects**: 
    - **Universal System Prompts**: Project-wide personas for AI models.
    - **Persistent Assets**: Shared documentation and context snippets always available to the AI when working in a project.

---
*Last updated: April 13, 2026*
