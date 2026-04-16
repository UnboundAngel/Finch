# Finch

**Modern desktop AI chat client for local and frontier models.**

![Tauri](https://img.shields.io/badge/Tauri-v2-FFC131?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-2024-000000?logo=rust&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D4?logo=windows&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

Finch is a high-performance, aesthetically refined desktop chat application designed for seamless interaction with local inference engines and frontier AI APIs. It features a "Local-First" architecture, ensuring your data and credentials stay secure on your device.

Built with security as a priority, Finch employs a strict architectural boundary: all LLM orchestration, API key storage, and network requests are handled exclusively within a hardened Rust IPC layer. The React-based renderer never touches sensitive credentials or raw external endpoints.

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
- **Write-Only Security**: API keys are saved directly to the Rust backend; the frontend can write them but never read them back, preventing XSS-based credential theft.

---

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, Vite 6, TypeScript 5.8 |
| **Styling** | Tailwind CSS 4, Glassmorphism, CSS Variables |
| **Animation** | Framer Motion 12 |
| **Icons** | Lucide React |
| **Markdown** | React Markdown 10, remark-gfm |
| **Code Highlighting** | Shiki |
| **Desktop Shell** | Tauri v2 |
| **Systems Layer** | Rust |
| **Audio** | CPAL (Capture), Whisper-RS (Inference) |
| **Storage** | `tauri-plugin-store` |

---

## Architecture

Finch operates on a "Zero-Trust Renderer" model. The React frontend is responsible only for state management and UI rendering. All side effects involving external services or sensitive system access are delegated to the Rust core.

- **Security**: When the frontend requests configuration, the `get_provider_config` command returns `None` for all key fields. Keys are injected into request headers only within the Rust execution environment.
- **Local Inference**: Native support for LM Studio and Ollama.
- **Voice Pipeline**: 16kHz mono audio capture streamed directly into local Whisper inference without disk-based intermediate files.
- **Streaming**: Implemented via the Tauri v2 `Channel` API. The backend pushes tokens to a designated channel, which the frontend consumes by assigning a listener to the `.onmessage` property.

<details>
<summary><b>Tauri Command Reference</b></summary>

- `get_provider_config` / `save_provider_config`: Manage provider settings and obscured API keys.
- `list_anthropic_models`: Fetches available Claude models from the Anthropic API.
- `list_openai_models`: Fetches GPT and o1 series models.
- `list_gemini_models`: Fetches Gemini 1.5 Pro/Flash models.
- `list_local_models`: Auto-discovers models running on local LM Studio or Ollama endpoints.
- `send_message`: Non-streaming request for simple completions.
- `stream_message`: High-performance streaming bridge using IPC Channels.
- `abort_generation`: Immediately signals Rust to drop the current network request and stop streaming.

</details>

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 20.x or higher
- **Rust**: Stable toolchain (Rust 2024 recommended)
- **Tauri CLI**: `npm install -g @tauri-apps/cli`

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/UnboundAngel/Finch.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run in development mode:
   ```bash
   npm run tauri dev
   ```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
