# Context Handoff: Studio Workspace Architecture

## Overview
We have successfully transitioned the legacy "Color Studio" (previously a chat-bound artifact) into a first-class, top-level **Studio Workspace**. This environment is architecturally decoupled from the Chat engine to allow for specialized, raw-JSON streaming directly into a node-based canvas, avoiding prompt bloat and UI cross-contamination.

---

## 1. State Management
*   **`chatSlice.ts`**: Introduced `activeWorkspace: 'chat' | 'studio'` to control which environment is currently active.
*   **`studioSlice.ts`**: Created a new Zustand slice (`useStudioStore`) dedicated to canvas state. It handles:
    *   `nodes: PaletteNode[]` (persisted to disk).
    *   `studioStreamBuffer: string` (ephemeral buffer for active AI generation).
    *   Actions to update node positions and append new nodes.

---

## 2. Data Orchestration (`useChatEngine.ts`)
The chat engine now explicitly branches logic based on the `activeWorkspace`:
*   **Chat Mode**: Operates normally (Markdown + Artifacts, saves to chat history).
*   **Studio Mode**: 
    *   Bypasses chat history.
    *   Injects a dedicated `STUDIO_SYSTEM_PROMPT` to enforce raw, strict JSON output (no Markdown formatting or `<artifact>` wrappers).
    *   Routes incoming streaming tokens directly to `studioStreamBuffer` instead of the chat log.
*   **Safety Lock**: We implemented a mandatory `abort_generation` signal whenever the user switches between Chat and Studio tabs to prevent cross-contamination of streams.

---

## 3. UI Routing & Environment
*   **`DashboardMain.tsx`**: Conditionally renders either the standard chat view or the `<StudioWorkspace />` container based on the active workspace state.
*   **`ChatSidebar.tsx`**: Added a segmented navigation pill (Chat / Studio) to toggle between environments.
*   **`useDynamicBackground.ts`**: Short-circuits the dynamic image luminance logic when in Studio mode. It forces a strict dark-mode contrast (`isDark=true`) to ensure the Studio environment remains clean and professional.

---

## 4. Studio Components (`src/components/studio/`)
*   **`StudioWorkspace.tsx`**: The main container. It connects to `useStudioStore`, applies a professional dark "blueprint" radial grid background, and parses the `studioStreamBuffer` in real-time using `parseLenientJson`.
*   **`StudioCanvas.tsx`**: A high-performance, custom-built canvas implementation that supports:
    *   **Node Orchestration**: Renders `PaletteNodeCard` components with native-feeling drag-and-drop, marquee selection, and multi-node movement.
    *   **Real-time Streaming**: Renders a "streaming node" that displays a skeleton state while parsing incomplete JSON to prevent layout shifts. It animates and updates its internal palette data in real-time as the AI generates JSON.
    *   **Fluid Interactions**: Custom pan and zoom logic (via wheel and pointer events) with an infinite grid-dot background.
    *   **Finch Design System Integration**: Fully themed using Finch's Tailwind tokens (`bg-card`, `border-border`, `animate-pulse` for streaming) and rounded geometry (16px cards, pill buttons).
    *   **Node Tools**: Support for inline renaming, expansion for color breakdown, JSON export, and "Save to Library" functionality.

---

## 5. Implementation Status
*   **Core Logic**: 100% Integrated.
*   **Prompting**: Specialized `STUDIO_SYSTEM_PROMPT` enforces raw-JSON output with few-shot examples.
*   **Visuals**: Streaming skeleton implemented to handle partial data gracefully.
*   **State Management**: Fully wired to `studioSlice.ts`.
*   **Chat Engine**: Unified with `useChatEngine.ts` for specialized Studio mode generation.
*   **Design Compliance**: Verified against 2026 Standards (rounded corners, glassmorphism, motion).

---

## Next Steps for New Agent
1. **Node Persistence**: Ensure `onSaveNode` in `StudioCanvas.tsx` is wired to a persistent library or asset manager if required.
2. **Selection Actions**: Implement batch actions (delete, export, group) for the `selectedIds` state in `StudioCanvas.tsx`.
3. **Responsive Polish**: Optimize canvas interactions for smaller viewports or touch interfaces if Finch is deployed to mobile.
