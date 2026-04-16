# Finch - dashboard MVP Scope

Based on the audit of `dashboard.tsx`, the following categorization defines the priority for extraction and implementation.

## 🟢 MVP-Critical (Focus First)
These sections represent the core functional loop of the Finch chat interface.

- **Core State Management**: `messages`, `recentChats`, and `input` states.
- **`handleSend` Logic**: The bridge between user input and AI response (even if currently mocked).
- **Message Rendering**: The Markdown-enabled message bubbles.
- **Persistence Layer**: `localStorage` effects that ensure chat history isn't lost on refresh.
- **Chat History Management**: Saving, deleting, and loading sessions from the sidebar.
- **Model Selection**: The ability to toggle between different backend configurations.

## 🟡 Deferred / Secondary (Post-MVP)
Useful features that enhance the experience but aren't required for a functional prototype.

- **`ThinkingBox`**: Visual reasoning steps are high-polish but low-utility for a core MVP.
- **`MetadataRow`**: Detailed token and speed stats are primarily for debugging/power users.
- **Incognito Mode**: A privacy layer that can be added once the base storage logic is robust.
- **Advanced Settings**: "Enter to Send" toggles and profile editing can be managed via constants initially.

## 🔴 Cut / Refactor (Technical Debt)
Placeholders that should be stripped or completely rebuilt before being called "built".

- **Web Search Placeholder**: Currently just a toast message; requires real engine integration.
- **File Upload Placeholder**: UI exists but no processing or backend logic is present.
- **Hardcoded Avatars**: Unsplash URLs should be replaced with internal assets or dynamic initials.
