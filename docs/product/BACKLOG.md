# Finch Backlog & To-Do

Items are ordered by priority. Close all **Baseline** items before touching **Differentiator** items.

---

## 🔴 Baseline — Must Close First

### [ ] 1. AI Message Actions — Positioning + Regenerate Visibility
**Two issues in one:**

1. **Copy button is on the left** of `MetadataRow`. Should be on the right, mirroring user message layout: `[MetadataRow] [Regenerate | Copy]`. **Files:** `MessageBubble.tsx:236–289`.

2. **Regenerate button is invisible in practice.** The prop chain exists (`Dashboard → DashboardMain → ChatArea → MessageBubble`) but `ChatArea.tsx:148` only passes `onRegenerate` when the message is the very last one in the list — and even then it's hover-only. Users never discover it. **Fix:** Show regenerate on all AI messages (or at minimum keep it on last-message but make it always visible, not hover-gated).

---

### [ ] 2. File Attachment — Image Preview + Broader File Types
**Two issues in one:**

1. **No image thumbnail preview.** When an image is attached, the input shows a paperclip pill with just the filename (`ChatInput.tsx:216–225`). It should show an actual thumbnail for image files (png, jpg, gif, webp). Use Tauri's `convertFileSrc()` to get a local URL from the file path, detect image by extension, and render a small `<img>` inside the pill.

2. **File picker is too narrow.** `ChatInput.tsx:135` only allows `['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf']`. Should support the full range that providers accept:
   - **Documents:** `txt, md, csv, rtf, html, json`
   - **Code:** `py, js, ts, jsx, tsx, rs, go, java, cpp, c, cs, rb, php, yaml, toml, xml`
   - **Office:** `docx, xlsx, pptx`
   - **Images:** keep existing
   - **PDF:** keep existing
   
   Also consider enabling `multiple: true` so users can attach more than one file per message (Claude supports up to 20).

---

### [ ] 4. Power / Advanced Settings Tab
**What's missing:** Several UI features are surfaced by default that power users want but casual users don't need:
- Right sidebar toggle button in the header (hidden by default)
- Token stats / metadata row under AI messages (hidden by default)
- System prompt / persona controls (keep visible — these are core)

**Fix:** Add an **Advanced** (or "Power") tab inside the Settings dialog. Put feature-flag toggles there:
- "Show right sidebar" — off by default
- "Show message stats" — off by default

Store flags in `useProfileStore` or `useModelParams` with `persist`. Gate the right sidebar toggle button and `<MetadataRow />` render behind these flags.

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

*Last updated: 2026-04-19*
