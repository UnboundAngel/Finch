# Finch Backlog & To-Do

Items are ordered by priority. Close all **Baseline** items before touching **Differentiator** items.

**Next focus:** Baseline is closed. Polish queue is complete; continue with prioritized Differentiators.

---

## 🔴 Baseline — Must Close First

### [x] 1. AI Message Actions — Positioning + Regenerate Visibility
**Shipped (2026-04):** Regenerate + Copy are always visible on completed AI messages (no hover gate); actions sit to the right with optional `MetadataRow` when message stats are enabled. `ChatArea` passes `onRegenerate` for all eligible AI turns.

---

### [x] 2. File Attachment — Image Preview + Broader File Types
**Shipped (2026-04):**
- Image thumbnails via `resolveMediaSrc` / Tauri `convertFileSrc` path; larger square preview in input; no filename on image cards.
- Tauri picker supports documents, code, Office, images, PDF; `multiple: true` on dialog (UI still attaches **first file only** — see follow-up below).
- **Browser:** hidden `<input type="file">` opens from paperclip when not in Tauri.
- Non-image cards: square card, full filename, async line count for text-like extensions, neutral type badge, dismiss (X) on hover.

**Still open (track here or under Differentiators):**
- **True multi-file attach:** one message with multiple attachments end-to-end (types, `Dashboard` send path, provider payload) — not only picker `multiple: true`.
- **PDF input card:** distinct preview treatment (staged; preview modal spec lives under Differentiators).

---

### [x] 4. Power / Advanced Settings Tab
**Shipped (2026-04):** **Advanced** tab in Settings with persisted toggles on `useModelParams`: "Show right sidebar" and "Show message stats" (default off). Header right-sidebar control and `<MetadataRow />` gated behind these flags.

---

## 🟡 Polish — After Baseline

### [x] Web Search Result Persistence + SearchStatus UX
**Shipped (2026-04):**
- `researchEvents` copied into assistant `metadata` on first token + stream end; `SearchStatus` rendered from `MessageBubble` via `msg.metadata.researchEvents` so sources persist during reply, after completion, and in saved chats (`Dashboard.tsx`, `MessageBubble.tsx`, `chat.ts`).
- Pre–first-token UI unchanged in `ChatArea` (thinking row).
- **SearchStatus polish:** removed Activity Log row; stable `rounded-2xl` (no pill/circle border jump); auto-collapse when research completes; gray binoculars without tinted icon box.


---

### [x] Search Bar UI Polish
**Issue:** Search bar in left sidebar works but animations and UI are rough.
**Shipped (2026-04):** Added coordinated focus/blur transitions for the sidebar search field and icon (`group` + `group-focus-within`, `transition-[background-color,border-color,box-shadow]`, icon color easing, and `pointer-events-none` on the icon). No search behavior changes.

---

### [x] Settings Cleanup
**Issue:** Settings has theme/background toggles that duplicate controls already in the top bar.
**Fix:** Remove duplicate toggles. Consolidate into the new Advanced tab if applicable.

---

## 🟢 Differentiators — Build After All Above Is Done

### [x] File Attachment Preview Modal
**Shipped (2026-04):** `FilePreviewModal.tsx` — clicking an attached file (input card or sent message) opens a fixed full-screen modal:
- **Images:** Lightbox via `resolveMediaSrc` — centered `<img>` with max dimensions.
- **PDFs:** `<iframe src={resolveMediaSrc(path)}>` inside a hoverable card; on hover the card rotates `-2deg` (CSS transform) and the filename footer swaps to a "Open in system viewer" label + `Download` icon; clicking calls `openPath(file.path)` via `@tauri-apps/plugin-opener` (falls back to `window.open` in browser).
- **Code / text files:** Content fetched via `fetch(resolveMediaSrc(path))`; highlighted with the Shiki singleton (`github-dark` / `github-light` themes, 20+ languages).
- **Other docs:** Filename + type badge centered with `Files` icon.
- Escape key + backdrop click close the modal; Motion `AnimatePresence` handles enter/exit.
- Wired into `AttachmentCard` (ChatInput, with `e.stopPropagation()` on the dismiss X) and into image/file renders in `MessageBubble`. Zero behavior changes outside file attachment UX.

---

### [ ] Artifacts System
Intercept `<antArtifact>` XML tags in the AI stream → render in a sliding side panel (code via Shiki, Markdown, or live preview). Store in message metadata for reopening.

### [ ] Finch Projects
- Project-wide system prompts / personas
- Persistent shared assets (docs, context snippets) always available to AI within a project
- Role-based permissions: Private / View / Edit

### [ ] OmniSearch (Ctrl+F)
Glassmorphic command palette with Discord-style syntax filters:
`has:image` | `has:file` | `after:YYYY-MM-DD` | `model:claude` | `is:bookmarked`
Rich snippets with highlighted keywords + "Jump to Context."
See `IDEAS.md` for full spec.

### [ ] Folder / Category Organization in Sidebar
Drag-and-drop folder system for chats. Beyond basic pin/rename/delete.

### [ ] Local ML / Semantic Vector Memory
- Local vector embeddings (`all-MiniLM-L6-v2`) for conceptual/semantic search
- OCR on images/screenshots, indexed on ingest
- RAG "Librarian" orchestrator — Top-K retrieval, token-efficient context injection
- Ghost Context discovery (>90% relevance score triggers faint glow on input)
See `IDEAS.md` for full spec.

### [ ] Hardware State Orchestration ("Warm Standby")
- "Hardware-Only Unload" on inactivity: UI state persists, only VRAM purged
- Red border on input when local model is sleeping
- Auto wake-up on type/send

### [ ] Profile Data Protection
- Atomic writes: Write Temp → Verify → Rename
- Shadow backups (`.bak`) for auto-recovery on file corruption
- Storage separation: `finch_config.json` (API keys) vs `user_profile.json` (identity/prefs)

### [ ] Semantic Vault / Progressive Identity
High-security "Contact Intelligence" system — structured persona vault with per-field metadata, 5-step Review & Commit autofill flow, Diff View modal for conflict resolution. Heavy lift, build last.

---

*Last updated: 2026-04-21*
