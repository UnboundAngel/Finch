# Phase Plan: Startup Screen & Profile Management Integration

This phase involves adapting pre-built frontend components from `temp_export/`, implementing a Rust-based IPC module for profile persistence, and integrating everything into the Finch application root.

## Research Summary
- **Components:** `temp_export/` contains `App.tsx` (with `ProfileSelection` and `ProfileCard`), `ProfileCreation.tsx`, and `ProfileEditing.tsx`.
- **Styling:** The exported components use hardcoded OKLCH colors and some custom animation classes.
- **Persistence:** Current profile-like data is in `finch_config.json`. New profiles must live in `finch_profiles.json`.
- **App Root:** `src/App.tsx` currently renders `Dashboard` unconditionally.

## Strategy
1. **Backend:** Implement `src-tauri/src/ipc/profiles.rs` using `tauri-plugin-store` to manage `finch_profiles.json`.
2. **Store:** Create `src/store/profileSlice.ts` to manage active profile state and sync with Rust backend.
3. **Components:** Adapt exported components to `src/components/startup/`, replacing hardcoded values with Tailwind variables and ensuring WebKit-friendly animations.
4. **Integration:** Update `src/App.tsx` for conditional rendering and `src/index.css` for animation utilities.

## Task Breakdown

### Task 1: Foundation & Backend (Rust/IPC)
- [ ] Define `Profile` type in `src/types/chat.ts`.
- [ ] Create `src-tauri/src/ipc/profiles.rs` with `get_profiles`, `save_profile`, `delete_profile`.
- [ ] Expose `profiles` module in `src-tauri/src/ipc/mod.rs`.
- [ ] Register profile commands in `src-tauri/src/lib.rs`.
- [ ] Update `src-tauri/capabilities/default.json` with new permissions.

### Task 2: State Management (Zustand)
- [ ] Create `src/store/profileSlice.ts`.
- [ ] Add `reset` action to `src/store/chatSlice.ts`.
- [ ] Integrate `profileSlice` into `src/store/index.ts`.

### Task 3: Component Adaptation
- [ ] Move and adapt `ProfileCreation.tsx` to `src/components/startup/ProfileCreation.tsx`.
- [ ] Move and adapt `ProfileEditing.tsx` to `src/components/startup/ProfileEditing.tsx`.
- [ ] Extract and adapt `ProfileSelection.tsx` and `ProfileCard.tsx` from `temp_export/src/App.tsx` to `src/components/startup/`.
- [ ] Replace all hardcoded OKLCH values with Finch Tailwind v4 tokens.
- [ ] Add WebKit-specific CSS properties for 3D animations.

### Task 4: Main Integration
- [ ] Create `src/components/startup/StartupScreen.tsx` as a container for the three views.
- [ ] Update `src/App.tsx` to gate `Dashboard` behind `activeProfile !== null`.
- [ ] Append animation utility classes to `src/index.css`.
- [ ] Ensure `useDynamicBackground` is not called on the startup screen.

### Task 5: Verification & Polish
- [ ] Verify profile creation, selection, editing, and deletion.
- [ ] Ensure state resets (chat, tokens) on profile switch.
- [ ] Test on Linux (WebKit) for animation jank.

## Verification Strategy
- **Unit Tests:** (If applicable) Test store actions.
- **Manual Verification:**
  - Launch app -> Should show `ProfileCreation` if empty.
  - Create profile -> Should save and show `ProfileSelection`.
  - Select profile -> Should show `Dashboard`.
  - Edit profile -> Should update and persist.
  - Delete profile -> Should remove and redirect to selection/creation.
  - Switch profile -> Should clear chat history and tokens.
