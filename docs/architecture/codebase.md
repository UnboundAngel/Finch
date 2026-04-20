# Finch Codebase Mapping

## Project Overview
Finch is a high-performance desktop AI chat client built with **Tauri v2**, **React 19**, and **Rust**. It supports local inference (Ollama, LM Studio) and frontier APIs (Anthropic, OpenAI, Google Gemini) with a focus on privacy, aesthetics (Glassmorphism), and low-latency voice interaction.

---

## Health Legend
- 🟢 **Healthy:** Modular, single responsibility, easy to maintain.
- 🟡 **Concerning:** Growing complexity, potential for refactoring soon.
- 🔴 **Needs Optimization:** Monolithic, high cognitive load, priority for shrinking/splitting.

---

## Backend (`/src-tauri/src`)
The Rust backend handles IPC, AI provider orchestration, and local inference.

| File | Lines | Health | Description |
| :--- | :--- | :--- | :--- |
| `lib.rs` | 1427 | 🔴 | **Main Monolith.** Contains all IPC handlers, session management, and provider logic. |
| `voice.rs` | 243 | 🟢 | Audio capture (CPAL) and Whisper inference management. |
| `anthropic.rs` | 221 | 🟢 | Native Anthropic API implementation. |
| `search.rs` | 121 | 🟢 | Web search orchestration logic. |
| `download.rs` | 80 | 🟢 | Model marketplace file downloader. |
| `tavily.rs` | 71 | 🟢 | Tavily Search API client. |
| `main.rs` | 6 | 🟢 | Entry point for the Tauri binary. |

---

## Frontend Core (`/src`)
| File | Lines | Health | Description |
| :--- | :--- | :--- | :--- |
| `main.tsx` | 10 | 🟢 | React application entry point. |
| `App.tsx` | 33 | 🟢 | Main layout component and routing. |
| `index.css` | ~250 | 🟢 | Global styles and Tailwind directives. |

---

## Frontend Components (`/src/components`)

### Dashboard & Layout
| File | Lines | Health | Description |
| :--- | :--- | :--- | :--- |
| `Dashboard.tsx` | 977 | 🔴 | **God Component.** Manages layout, global state orchestration, and multiple modals. |
| `SettingsDialog.tsx` | 443 | 🟡 | All application settings in one file. Should be split by tab. |
| `WindowControls.tsx` | 224 | 🟢 | Custom titlebar for Windows/macOS. |
| `ProfileDialog.tsx` | 79 | 🟢 | User profile configuration. |

### Chat Interface (`/chat`)
| File | Lines | Health | Description |
| :--- | :--- | :--- | :--- |
| `ChatInput.tsx` | 506 | 🟡 | High complexity: handles text, files, voice, and web search toggles. |
| `ModelSelector.tsx` | 320 | 🟡 | Complex multi-provider dropdown logic. |
| `SearchOnboarding.tsx`| 223 | 🟢 | Setup UI for web search providers. |
| `ChatArea.tsx` | 169 | 🟢 | Message list container with auto-scroll. |
| `MessageBubble.tsx` | 154 | 🟢 | Individual message rendering (Markdown). |
| `CodeBlock.tsx` | 117 | 🟢 | Syntax-highlighted code blocks. |
| `VoiceIndicator.tsx` | 79 | 🟢 | Visual feedback for voice activity. |

### Sidebar (`/sidebar`)
| File | Lines | Health | Description |
| :--- | :--- | :--- | :--- |
| `RightSidebar.tsx` | 653 | 🟡 | Contains all AI parameter controls and hardware stats. |
| `ChatSidebar.tsx` | 308 | 🟢 | History management and session switching. |
| `MaxTokensSlider.tsx` | 175 | 🟢 | Precision control for context window limits. |

---

## Frontend Logic

### Hooks (`/src/hooks`)
| File | Lines | Health | Description |
| :--- | :--- | :--- | :--- |
| `useAIStreaming.ts` | 192 | 🟢 | SSE/Channel handling for AI responses. |
| `useChatPersistence.ts`| 151 | 🟢 | Auto-saving chat history to Rust backend. |
| `useVoiceTranscription.ts`| 148 | 🟢 | Integration with local Whisper inference. |
| `useAudioVisualization.ts`| 104 | 🟢 | Canvas-based wave animation. |
| `useInactivityEject.ts` | 81 | 🟢 | Auto-unload logic for local models. |

### State & Utils (`/src/store`, `/src/lib`)
| File | Lines | Health | Description |
| :--- | :--- | :--- | :--- |
| `modelParamsSlice.ts`| 84 | 🟢 | AI parameter state (Temp, Top-P, etc.). |
| `chatSlice.ts` | 47 | 🟢 | Active session and provider state. |
| `luminance.ts` | 62 | 🟢 | Color analysis for dynamic UI contrast. |
| `tauri.ts` | 58 | 🟢 | IPC wrapper and error handling. |
