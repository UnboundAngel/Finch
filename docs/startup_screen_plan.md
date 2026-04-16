# Implementation Plan: Startup Screen & Profile System (Persistent)

This document serves as a persistent record of the plan to integrate the Startup Screen (Profile Selection/Creation) into the Finch Tauri application.

## Goal
Establish a "Who's chatting?" entry point for the application that supports multiple user profiles, each with its own AI settings, using the 3D-card animated flow from the design export.

## Proposed Changes

### 1. Rust Backend (Identity & Storage)
- **`src-tauri/src/ipc/profiles.rs`**: New module to handle profile logic.
- **`src-tauri/src/types.rs`**: Add a `Profile` struct.
- **IPC Commands**: `get_profiles`, `save_profile`, `delete_profile`.
- **Persistence**: Store profile data in `finch_config.json` via `tauri-plugin-store`.

### 2. Frontend State & Components
- **`src/store/chatSlice.ts`**: Update the Zustand store to include `activeProfile` and `isStartupFinished`.
- **`src/components/startup/`**:
  - `ProfileSelection.tsx`: The primary entry grid.
  - `ProfileCreation.tsx`: The 3D multi-step creation flow.
  - `ProfileEditing.tsx`: The card-based editing interface.

### 3. Integration & Routing
- **`src/App.tsx`**: Add a conditional check to render the Startup Screen if no profile is active or if the startup phase hasn't finished.
- **Transitions**: Smoothly animate the transition from profile selection to the Dashboard.

### 4. Styles & Tokens
- **`src/index.css`**: Append `.animated-button` and associated animations.
- **Constraint**: **Do NOT** modify existing theme variables. components must use Finch's CSS tokens (`--color-primary`, etc.) to ensure compatibility with Dark Mode, Light Mode, and Pink Mode.

## Verification Plan
1. **Initial Boot**: Verify the app launches into the Startup Screen correctly.
2. **Profile Creation**: Complete the 3D card flow and ensure the new profile is saved to the backend.
3. **Theme Response**: Confirm that the Startup Screen reflects theme changes (e.g., Pink Mode) without hardcoded color overrides.
4. **Persistence**: Ensure selected profiles and created users persist after app restarts.
