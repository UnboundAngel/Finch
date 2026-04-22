# Finch Backlog & To-Do

Items are ordered by priority. Close all **Baseline** items before touching **Differentiator** items.

**Next focus:** Baseline is closed. Start with **Polish** (web search persistence, then favicon privacy, search bar polish, settings cleanup).

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

### [ ] Web Search Result Persistence Bug
**Issue:** Search results (links, sources) disappear from UI the moment the AI starts responding.
- `isThinking` set to `false` on first token → `SearchStatus` unmounts
- `researchEvents` cleared on each new message

**Fix:** Attach `researchEvents` array to the AI message's `metadata` object when saving. Render `SearchStatus` from message metadata so it persists post-response.

**Files:** `SearchStatus.tsx`, `ChatArea.tsx`, `Dashboard.tsx`

---

### [ ] Favicon Privacy (Web Search Icons)
**Issue:** Fetches favicons from `icons.duckduckgo.com` — unreliable and leaks visited domains to a third party.
**Fix:** Generate local fallback icons: deterministic HSL color from domain name hash + first-letter initial. Zero external pings, always works.

---

### [ ] Search Bar UI Polish
**Issue:** Search bar in left sidebar works but animations and UI are rough.
**Fix:** Polish animations and transitions. No functional changes needed.

---

### [ ] Settings Cleanup
**Issue:** Settings has theme/background toggles that duplicate controls already in the top bar.
**Fix:** Remove duplicate toggles. Consolidate into the new Advanced tab if applicable.

---

## 🟢 Differentiators — Build After All Above Is Done

### [ ] File Attachment Preview Modal
Clicking an attached file (in the input or in a sent message) opens a preview modal — similar to Claude's implementation:

- **PDFs:** Render first page via `<iframe src={convertFileSrc(path)}>` (WebView has a built-in PDF renderer). Show filename at top, page count at bottom. On hover: card tilts slightly left, page count swaps to a Download arrow, clicking opens the file in the system browser (not a download).
- **Images:** Lightbox with `<img src={convertFileSrc(path)}>`.
- **Code/text files:** Read contents via Tauri `fs` plugin, display with Shiki syntax highlighting (already used in `CodeBlock.tsx`).
- **Other docs:** Filename + file size + type icon.

The tilt + label-swap hover effect is pure CSS `transform: rotate(-2deg)` + conditional render on hover state.

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
