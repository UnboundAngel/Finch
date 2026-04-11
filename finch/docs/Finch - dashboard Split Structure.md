# Finch - dashboard Split Structure

Proposed reorganization of `dashboard.tsx` to resolve the 1000-line "Mega-Component" issue.

## 📂 Proposed File Structure

### 1. `src/types/chat.ts`
- **Contents**: `Message`, `MessageMetadata`, `ChatSession`, and related enums.
- **Goal**: Centralize the data schema for the entire app.

### 2. `src/hooks/useChatPersistence.ts`
- **Contents**: `useEffect` hooks for `localStorage`, profile management, and session recovery logic.
- **Goal**: Decouple side-effects from the UI.

### 3. `src/components/chat/MessageBubble.tsx`
- **Contents**: Individual message bubble rendering, including `ReactMarkdown`, `CodeBlock`, and `MetadataRow`.
- **Goal**: A clean, reusable component for rendering conversation turns.

### 4. `src/components/chat/ChatArea.tsx`
- **Contents**: The scrollable message list and the `ThinkingBox` logic.
- **Goal**: Manage the "stage" where the conversation happens.

### 5. `src/components/chat/ChatInput.tsx`
- **Contents**: The auto-resizing `textarea`, file attachment preview, and action buttons (Send, Web Search).
- **Goal**: Isolate the complex "Composer" logic.

### 6. `src/components/sidebar/ChatSidebar.tsx`
- **Contents**: Search input, Recent/Pinned lists, and the Profile footer.
- **Goal**: Handle navigation and session switching.

### 7. `src/components/dashboard/Dashboard.tsx`
- **Contents**: The top-level orchestrator.
- **Goal**: Initialize the `SidebarProvider`, layout the grid, and pass state between the Sidebar and ChatArea.
