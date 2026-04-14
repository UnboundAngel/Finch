# Finch

**Modern desktop AI chat client for local and frontier models.**

![Tauri](https://img.shields.io/badge/Tauri-v2-FFC131?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-Stable-000000?logo=rust&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D4?logo=windows&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

Finch is a high-performance, aesthetically refined desktop chat application designed for seamless interaction with local inference engines and frontier AI APIs. It features a "Local-First" architecture, ensuring your data and credentials stay secure on your device.

---

## 💎 New in Recent Phases

- **Glassmorphism UI**: A completely redesigned interface featuring backdrop blurs, organic rounded corners (12px-20px), and fluid entry animations powered by Framer Motion.
- **Voice Model Marketplace**: On-demand downloading of Whisper GGML models (Tiny, Base, Small) directly within the app.
- **Local Speech Recognition**: High-performance, offline voice-to-text transcription using `whisper.cpp`.
- **Advanced Model Controls**: Real-time adjustment of Temperature, Max Tokens, and Top-P with dynamic hardware-aware safety limits.
- **Context Intelligence**: Precise tracking of token usage and model-specific context window sizes to prevent performance degradation.
- **Customizable Aesthetics**: Support for custom light/dark backgrounds with intelligent contrast management for the UI.
- **Smart Web Search**: Integrated web search capabilities with real-time status indicators.

---

## Core Features

- **Multi-provider Routing**: Toggle between Anthropic (Claude), OpenAI (GPT/o1), Google Gemini, and local models (Ollama/LM Studio).
- **Native Streaming**: Real-time token delivery using Tauri v2 Channels for ultra-low latency.
- **Inactivity Management**: Automatic local model ejection after 10 minutes of inactivity to reclaim system RAM/VRAM.
- **Session Persistence**: Automatic conversation saving and restoration via local encrypted storage.
- **Rich Rendering**: 
  - Full Markdown support via `react-markdown`.
  - Syntax-highlighted code blocks powered by **Shiki**.
- **Power-User Shortcuts**: Fully keyboard-navigable workflow (Ctrl+N, Ctrl+K, Ctrl+\, etc.).

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, Vite 6, TypeScript 5.8 |
| **Styling** | Tailwind CSS 4, Glassmorphism, CSS Variables |
| **Animation** | Framer Motion |
| **Icons** | Lucide React |
| **Backend** | Rust (Tauri v2) |
| **Audio** | CPAL (Capture), Whisper-RS (Inference) |
| **Storage** | `tauri-plugin-store` |

---

## Architecture

Finch operates on a "Zero-Trust Renderer" model. The React frontend is responsible only for state management and UI rendering. All side effects involving external services or sensitive system access are delegated to the Rust core.

- **Local Inference**: Native support for LM Studio and Ollama.
- **Voice Pipeline**: 16kHz mono audio capture streamed directly into local Whisper inference without disk-based intermediate files.
- **Security**: API keys are stored in the Rust backend and are never exposed back to the renderer.

---

## Getting Started

### Prerequisites

- **Node.js**: 20.x or higher
- **Rust**: Stable toolchain via `rustup`
- **LLVM**: Required for `whisper-rs` compilation (Developer mode only).
- **Inference**: LM Studio or Ollama (optional, for local models).

### Install and Run

```bash
# Clone the repository
git clone https://github.com/UnboundAngel/Finch
cd finch

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Build for Production

```bash
# This creates a self-contained .exe with everything bundled
npm run tauri build
```

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl+N` | Start a new chat session |
| `Ctrl+K` | Focus the sidebar search input |
| `Ctrl+\` | Toggle the Right Sidebar (Context Settings) |
| `Ctrl+,` | Open the Settings dialog |
| `Esc` | Close any open dialog or popover |

---

## Project Structure

```text
finch/
├── src/                      # React Frontend
│   ├── components/           # UI Components (chat, sidebar, dashboard)
│   ├── hooks/                # Voice, AI Streaming, Persistence, Shortcuts
│   ├── store/                # Zustand state management (Chat, Params)
│   └── lib/                  # Utilities, context window lookups
├── src-tauri/                # Rust Backend
│   ├── src/                  
│   │   ├── anthropic.rs      # Anthropic API implementation
│   │   ├── voice.rs          # Voice capture & Whisper management
│   │   ├── download.rs       # Model marketplace downloader
│   │   └── lib.rs            # IPC command handlers
│   └── resources/            # Pre-bundled models (ggml-base.bin)
└── ROADMAP.md                # Detailed phase-by-phase development history
```

---

## License

[MIT](LICENSE)
