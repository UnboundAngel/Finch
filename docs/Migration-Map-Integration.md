# 🔗 Migration Map: Integration & Dependencies

> [!info] Objective
> Document the explicit links required to re-connect the modularized files without functional breakage.

## 1. Rust Import Graph
- **`lib.rs`** ➔ `mod ipc;`, `mod providers;`, `mod types;`, `mod session;`, `mod config;`.
- **`ipc/*.rs`** ➔ `crate::types::*`, `crate::providers::*`, `crate::session::*`.
- **`providers/*.rs`** ➔ `crate::types::*`, `crate::providers::mod::*` (utilities).

### State Injection
- Ensure `AppState` is managed in `lib.rs` and available via `tauri::State` in every command handler in `/ipc`.

## 2. React Prop Drilling & Context
- **Modal Hookup:** `DashboardMain` calls `useModals().openOverflowLimit(() => handleSend(true))` when context window limits are exceeded.
- **Ref Syncing:** `useChatSession` must expose the `activeSessionId` to the `streamMessage` callback within `Dashboard.tsx` or `DashboardMain.tsx` to ensure the correct message thread is updated.
- **Zustand Usage:**
  - `ModelSelector` (in Header) updates `selectedModel`.
  - `useModelPolling` (Custom Hook) listens to these updates and calls Rust.
  - `RightSidebar` (in Layout) reads `selectedModel` for parameter fetching.

## 3. CSS & Design Token Invariants
- The `--selection-*` CSS variables must be set at the `:root` or `html` level by `useDynamicBackground` to ensure all children (ChatArea, Input, Sidebar) inherit the correct contrast regardless of which file they live in.
- The `.has-custom-bg` and `.is-pink-mode` classes should be applied to the layout root in the new `Dashboard.tsx`.

## 4. Initialization Sequence
1. **Rust:** `setup` hook ensures directories exist ➔ Load Store ➔ Manage `AppState`.
2. **React:** `useChatPersistence` (Existing) loads config ➔ `useChatSession` loads most recent chat ➔ `useDynamicBackground` performs initial luminance check.
