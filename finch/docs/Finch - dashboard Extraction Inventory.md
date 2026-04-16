# Finch - dashboard Extraction Inventory

| Section Name | Description | Approx. Line Range | Dependencies |
| :--- | :--- | :--- | :--- |
| **Imports** | React hooks, UI components, and Lucide icons. | 1 - 77 | `shadcn/ui`, `lucide-react`, `framer-motion` |
| **Types & Interfaces** | Defines `MessageMetadata`, `Message`, and `ChatSession` structures. | 79 - 117 | None |
| **Helper Functions** | `getChatIcon`: returns the appropriate Lucide icon based on chat type. | 119 - 134 | `lucide-react` |
| **ThinkingBox Component** | Expandable UI component for AI "reasoning" steps. | 136 - 159 | `lucide-react`, `ShiningText` |
| **SidebarToggle Button** | UI control to collapse/expand the sidebar. | 161 - 173 | `useSidebar` hook |
| **CodeBlock Component** | Syntax-highlighted code block with a copy-to-clipboard button. | 175 - 209 | `react-syntax-highlighter`, `Button`, `Copy`, `Check` |
| **MetadataRow Component** | Displays AI performance metrics (tokens, speed, duration). | 211 - 251 | `lucide-react`, `MessageMetadata` |
| **Main Dashboard Component** | Central container for the entire application state. | 253 - 1018 | All sub-components and hooks |
| **State Initialization** | Sets up states for messages, input, theme, model, and modals. | 254 - 280 | `React.useState`, `useRef` |
| **Persistence Effects** | Loads/saves chat history and profile from `localStorage`. | 282 - 317 | `localStorage`, `useEffect` |
| **Event Handlers** | `handleKeyDown`, `handleNewChat`, `handleDeleteChat`, `handlePinChat`. | 319 - 418 | `setMessages`, `setRecentChats`, `toast` |
| **UI Utility Effects** | Auto-scrolling to bottom and auto-resizing textarea. | 420 - 435 | `useEffect`, `messagesEndRef`, `textareaRef` |
| **handleSend Logic** | Core messaging logic; adds user message and mocks AI response. | 448 - 478 | `setTimeout`, `isThinking` state, `selectedModel` |
| **JSX: Layout Root** | Main viewport wrapper with SidebarProvider. | 481 - 490 | `SidebarProvider`, `TooltipProvider` |
| **JSX: Sidebar** | Renders pinned/recent chats, search input, and profile footer. | 491 - 656 | `Sidebar`, `SidebarContent`, `SidebarFooter`, `Input`, `Avatar` |
| **JSX: Header** | Renders model selector, incognito toggle, and theme switch. | 658 - 707 | `DropdownMenu`, `Button`, `Switch`, `Ghost` |
| **JSX: Chat Messages** | Maps through messages; renders bubbles, ThinkingBox, and Markdown. | 709 - 808 | `ReactMarkdown`, `ThinkingBox`, `MetadataRow`, `Avatar` |
| **JSX: Input Area** | Renders the composer with file upload, web search, and send button. | 810 - 863 | `textarea`, `Paperclip`, `Globe`, `Send` |
| **JSX: Profile Dialog** | Modal for editing user name and email. | 868 - 927 | `Dialog`, `Input`, `Avatar` |
| **JSX: Settings Dialog** | Modal for theme, Enter-to-send, and clearing history. | 930 - 985 | `Dialog`, `Switch`, `Button` |
