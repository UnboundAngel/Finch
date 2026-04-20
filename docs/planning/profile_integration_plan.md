# Implementation Plan: Profile System Integration (Persistent)

This document serves as a persistent record of the plan to merge the exported React/Vite frontend into the Finch Tauri application.

## Goal
Integrate a multi-step 3D profile creation and management flow while maintaining the "tangle" with the Rust backend for data persistence and strict adherence to the existing design system tokens.

## User Feedback Integrated
- **Theme Variables**: Do NOT import or overwrite OKLCH variables from the export's `@theme` block. The application's existing 3 themes and user-defined custom backgrounds must drive the styling. Only the structural/animation classes (e.g., `.animated-button`) will be imported.

## Proposed Changes

### Frontend Integration

#### Components
- **`src/components/ProfileCreation.tsx`**: New component for the animated step-by-step creation flow.
- **`src/components/ProfileEditing.tsx`**: New component for the side-by-side editing interface.

#### Logic
- **`src/App.tsx`**: Refactor to handle view switching between `selection`, `creation`, and `editing`.
- **Rust Invoke**: Replace local `useState` hooks for profiles with Tauri `invoke` calls:
    - `get_profiles` (Initial Load)
    - `create_profile`
    - `update_profile`
    - `delete_profile`

#### Styles
- **`src/index.css`**: Append the `.animated-button` CSS classes and any specific keyframes found in the export's `index.css`.

### Rust Backend (The "Tangle")

#### Data Model
- Create a `Profile` struct that mirrors the frontend requirements (ID, Name, Avatar, Prompt, Model, etc.).

#### IPC Commands
- Implement commands in `src-tauri/src/ipc/profiles.rs`:
    - `get_profiles`
    - `create_profile`
    - `update_profile`
    - `delete_profile`
- Use `tauri-plugin-store` to persist this data in `profiles.json` or within the main config.

#### Registration
- Register new commands in `src-tauri/src/lib.rs`.

## Verification Plan

### Manual Testing
1. Verify the 3D card transition animations match the expected "feel" from the export.
2. Confirm that switching the Finch theme (e.g., Dark/Pink) correctly updates the profile screen colors without hardcoded overrides.
3. Restart the app to ensure newly created profiles persist through the Rust backend.
