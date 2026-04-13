# Phase 07: Chat System Fixes — Validation

## Requirements Coverage
- [ ] R-09: Incognito chats must not persist after session ends.
- [ ] R-10: Messages must append to existing chats without duplication.
- [ ] R-11: Last used model must persist between sessions.
- [ ] R-12: Chats must be stored in individual JSON files via Rust commands.

## Functional Checklist
- [ ] New incognito chats are not written to store and vanish on app reload.
- [ ] Sending a message in an existing chat does not create a duplicate sidebar entry.
- [ ] Selected model is remembered after app restart.
- [ ] App creates individual `<uuid>.json` files for each chat in the user data directory.
- [ ] Sidebar loads metadata (titles) without reading full message histories on boot.

## Security & Reliability
- [ ] Atomic file writes: chats are written to `.tmp` before renaming.
- [ ] Permissions: `capabilities/default.json` contains `allow-list_chats`, `allow-load_chat`, etc.

## Build & Errors
- [ ] `npm run build` succeeds.
- [ ] `cargo build` succeeds (if Rust was touched).
- [ ] No IPC or console errors.
