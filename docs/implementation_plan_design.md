# Goal Description

Re-architect the "Color Studio" feature into a dedicated **Studio Workspace**. This will be accessed through a new navigation pattern at the top of the left sidebar, featuring a distinct grid-based visual environment that isolates the design tools from the general chat while sharing the same core input and streaming infrastructure.

## User Review Required

> [!IMPORTANT]
> **Workspace Navigation:** As per the provided design, the top of the sidebar will be split into three navigation segments. The first is "Chat" (default), and the second will be "Studio". 
> **Visual Environment:** Studio Workspace will use a forced **grid-like background** (blueprint/technical style). Wallpaper and custom background overrides will be disabled while in this workspace to maintain a professional "Studio" aesthetic.

## Open Questions

- **Third Nav Item:** The screenshot shows a third icon (`< />`). Should this remain as a placeholder/future mode (e.g., Code Studio), or should we only implement the Chat and Studio toggles for now?

## Proposed Changes

### State Management
#### [MODIFY] `src/store/chatSlice.ts`
- Add `activeWorkspace: 'chat' | 'studio' | 'code'` (matching the three nav segments).
- Ensure `setIsIncognito` and other mode-related logic respects workspace transitions.

### Sidebar Navigation
#### [MODIFY] `src/components/sidebar/ChatSidebar.tsx`
- Implement the segmented control at the top of the sidebar.
- Add tooltips to each icon (e.g., "Chat Mode", "Studio Mode").
- Style the active segment with a highlight/pill background as seen in the screenshot.

### Workspace Layout & Appearance
#### [MODIFY] `src/components/dashboard/DashboardMain.tsx`
- Implement conditional background rendering:
  - If `activeWorkspace === 'studio'`, ignore `customBg` and render a **CSS Grid background** (e.g., a subtle 40px or 20px grid pattern).
  - Update the main pane layout to swap between `ChatArea` and `StudioWorkspace`.
- Maintain the `ChatInput` at the bottom for both workspaces.

### Studio Workspace
#### [NEW] `src/components/studio/StudioWorkspace.tsx`
- Create the container for the studio environment.
- Render the `ColorStudioViewer` (advanced palette tool) as the primary interface.
- Implement the lenient JSON parser to handle the direct AI stream into the studio components.

### AI Integration
#### [MODIFY] `src/lib/artifactTooling.ts`
- Remove `color-studio` from the global `UI_CAPABILITIES_INSTRUCTIONS`.
- Dynamically append Studio-specific instructions to the system prompt *only* when `activeWorkspace === 'studio'`.
- Instruct the AI to output strictly structured JSON for the active studio tool.

## Verification Plan
1. **Nav Switching:** Click through the top sidebar segments and verify the workspace state updates correctly.
2. **Background Lock:** Confirm that in Studio Mode, any user-set wallpaper disappears and is replaced by the grid pattern.
3. **Tooltip Verification:** Hover over the new nav buttons to verify descriptive tooltips.
4. **Functional Test:** Generate a palette in Studio Mode and ensure it renders within the grid-background environment.
