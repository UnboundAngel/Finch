# Implementation Plan - Studio Workspace Integration

Integrate the externally built studio canvas component into the Finch Studio Workspace. This involves sanitizing the extracted files, dropping them into the project, and wiring them to the existing Zustand store and chat engine.

## User Review Required

> [!IMPORTANT]
> The extracted `StudioCanvas.tsx` contains significant inline styling and local state for panning/resizing. I will sanitize the colors to match Finch's design system but keep the structure intact to avoid regressions.

## Proposed Changes

### [Studio Component]

#### [MODIFY] [StudioCanvas.tsx](file:///c:/Random%20things%20i%20dont%20want%20deleted/Finch/finch-sandbox/src/components/studio/StudioCanvas.tsx)
- Replace the stub with the sanitized canvas component.
- Ensure props match `StudioCanvasProps` interface.
- Sanitization:
    - Replace hardcoded hex colors with Tailwind utility classes or CSS variables (e.g., `text-foreground`, `bg-card`, `border-border`).
    - Remove demo/mock data generation logic.
    - Set background to transparent (inherited from `StudioWorkspace`).
    - Standardize rounded corners (16px for cards, pill for buttons).

#### [MODIFY] [StudioWorkspace.tsx](file:///c:/Random%20things%20i%20dont%20want%20deleted/Finch/finch-sandbox/src/components/studio/StudioWorkspace.tsx)
- Wire `updateNodePosition` correctly to the canvas `onNodeMove` prop.
- Ensure `streamingNode` derivation is passed correctly.

### [State Management]

#### [MODIFY] [studioSlice.ts](file:///c:/Random%20things%20i%20dont%20want%20deleted/Finch/finch-sandbox/src/store/studioSlice.ts)
- Move spawn position logic from `useChatEngine.ts` to `addNode` action.
- Update `addNode` to handle `id`, `position`, and `createdAt` internally.

### [Chat Engine]

#### [MODIFY] [useChatEngine.ts](file:///c:/Random%20things%20i%20dont%20want%20deleted/Finch/finch-sandbox/src/hooks/useChatEngine.ts)
- Simplify the `stats` callback for Studio mode by delegating node creation logic to the store.

## Verification Plan

### Automated Tests
- Build check: `npm run tauri build` (dry run of frontend build).

### Manual Verification
- **Task 1 & 2**: Switch to Studio mode and verify the canvas renders.
- **Task 3**: Start a generation in Studio mode and verify the `streamingNode` appears and updates in real-time.
- **Task 4**: Verify the node is permanently added to the canvas once the stream finishes.
- **Task 5**: Verify subsequent nodes spawn offset correctly.
- **Task 6**: Verify panning and zooming (if implemented) doesn't affect the global store.
- **Task 7**: Verify ChatInput is visible and functional in both modes.
