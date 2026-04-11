# Finch

**Standalone desktop AI chat client for local and frontier models.**

![Tauri](https://img.shields.io/badge/Tauri-v2-FFC131?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-Stable-000000?logo=rust&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D4?logo=windows&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

Finch is a high-performance desktop chat application designed for seamless interaction with both local inference engines and frontier AI APIs. It provides native support for **LM Studio** and **Ollama** local endpoints, alongside direct integration with **Anthropic**, **OpenAI**, and **Google Gemini**. 

Built with security as a priority, Finch employs a strict architectural boundary: all LLM orchestration, API key storage, and network requests are handled exclusively within a hardened Rust IPC layer. The React-based renderer never touches sensitive credentials or raw external endpoints.

---

## Features

- **Multi-provider Routing**: Toggle between Anthropic (Claude), OpenAI (GPT/o1), Google Gemini, and local models without changing context.
- **Native Streaming**: Real-time token delivery using Tauri v2 Channels for low-latency, "typewriter" style responses.
- **Session Persistence**: Automatic conversation saving and restoration via local encrypted storage.
- **Advanced Sidebar**: Organized management of chat history with pinned sessions and high-performance debounced search.
- **Power-User Shortcuts**: Fully keyboard-navigable interface for rapid workflow (Cmd/Ctrl+N, Cmd/Ctrl+K, etc.).
- **Grouped Model Selector**: Intelligently organized model lists categorized by provider and capability.
- **Danger Zone**: One-click history purging via shadcn/radix `AlertDialog` for secure data management.
- **Rich Rendering**: 
  - Full Markdown support via `react-markdown` and `remark-gfm`.
  - Syntax-highlighted code blocks powered by **Shiki** (async singleton implementation).
- **Write-Only Security**: API keys are saved directly to the Rust backend; the frontend can write them but never read them back, preventing XSS-based credential theft.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, Vite 6, TypeScript 5.8 |
| **Styling** | Tailwind CSS 4, Shadcn/UI |
| **Animation** | Framer Motion 12 |
| **Icons** | Lucide React |
| **Markdown** | React Markdown 10, remark-gfm |
| **Code Highlighting** | Shiki |
| **Desktop Shell** | Tauri v2 |
| **Systems Layer** | Rust |
| **Config Persistence** | `tauri-plugin-store` |

---

## Architecture

Finch operates on a "Zero-Trust Renderer" model. The React frontend is responsible only for state management and UI rendering. All side effects involving external services are delegated to the Rust core.

- **Security**: When the frontend requests configuration, the `get_provider_config` command returns `None` for all key fields. Keys are injected into request headers only within the Rust execution environment.
- **Local Inference**: Hits OpenAI-compatible `/v1/chat/completions` endpoints provided by LM Studio or Ollama.
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

## Getting Started

### Prerequisites

- **Node.js**: 20.x or higher
- **Rust**: Stable toolchain via `rustup`
- **Tauri CLI v2**: `cargo install tauri-cli --version "^2"`
- **Inference (Optional)**: LM Studio or Ollama running on default ports if using local models.

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
npm run tauri build
```

---

## Provider Setup

### Anthropic
Obtain an API key from [console.anthropic.com](https://console.anthropic.com/). Paste the key into **Settings → Models & Keys → Anthropic**.

### OpenAI
Obtain an API key from [platform.openai.com](https://platform.openai.com/). Paste the key into **Settings → Models & Keys → OpenAI**.

### Google Gemini
Obtain an API key from [aistudio.google.com](https://aistudio.google.com/). Paste the key into **Settings → Models & Keys → Google Gemini**.

### Local Models
Ensure **LM Studio** (OpenAI Server mode) or **Ollama** is running. No API keys are required. Finch will automatically discover active models from the local endpoint upon clicking "Detect Models" in settings.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl+N` / `Cmd+N` | Start a new chat session |
| `Ctrl+K` / `Cmd+K` | Focus the sidebar search input |
| `Ctrl+,` / `Cmd+,` | Open the Settings dialog |

---

## Project Structure

```text
finch/
├── src/                      # React Frontend
│   ├── components/           # UI Components
│   │   ├── chat/             # ChatArea, ChatInput, Bubbles
│   │   ├── dashboard/        # Main Layout, Dialogs
│   │   └── sidebar/          # Session History Management
│   ├── hooks/                # useAIStreaming, useDebounce, useKeyboardShortcuts
│   ├── lib/                  # Tauri IPC wrappers & helpers
│   └── types/                # Shared TypeScript interfaces
├── src-tauri/                # Rust Backend
│   ├── capabilities/         # Permission declarations (default.json)
│   ├── permissions/          # Custom command permission definitions
│   └── src/                  # Rust Source
│       ├── providers/        # Anthropic, OpenAI, etc. client implementations
│       ├── lib.rs            # Command handlers and setup
│       └── main.rs           # App entry point
└── package.json              # Frontend manifest & scripts
```

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

> [!IMPORTANT]
> Any new Tauri command must have a corresponding `allow-[command-name]` entry in `src-tauri/capabilities/default.json` or `src-tauri/permissions/`. Failure to do so will result in "Not Allowed" errors at runtime, even if the build succeeds.

---

## License

[MIT](LICENSE)
