# Finch Backlog & To-Do

Items are ordered by priority. Close all **Baseline** items before touching **Differentiator** items.

---

## 🔴 Baseline — Must Close First

### [ ] 1. File / Image Upload → Actually Sent to AI
**What's broken:** File picker UI exists (`ChatInput.tsx:241–254`), files attach visually, but nothing is ever sent to the AI. The "Analyze an image" empty-state card is a broken promise on first launch.

**Architecture (already designed — just needs building):**

Rust unified message type:
```rust
enum ContentPart {
    Text(String),
    Image { base64: String, mime: String },
    Document { base64: String, mime: String },
}
struct InternalMessage {
    role: String,
    content: Vec<ContentPart>,
}
```

Provider adapter mapping:
| Provider | Block Type | Field | Data Format |
|:---|:---|:---|:---|
| Anthropic | `image` / `document` | `source` | `{"type": "base64", "data": "..."}` |
| OpenAI | `image_url` | `image_url` | `{"url": "data:image/png;base64,..."}` |
| Gemini | `inlineData` | `inlineData` | `{"mimeType": "...", "data": "..."}` |
| Ollama | `image` (array) | `images` | List of raw base64 strings |
| LM Studio | Same as OpenAI | — | — |

IPC contract: Frontend sends `[{ type: "file", path: "/abs/path/img.png" }]`. Rust reads + encodes to base64 JIT when building the outbound HTTP request per provider.

**Also:** Either wire up or replace the "Analyze an image" empty-state suggestion card in the dashboard.

---

### [ ] 2. Copy Button on AI Messages
**What's broken:** Copy button exists on user messages (`MessageBubble.tsx:122–166`) but not on AI messages — only a metadata row at line 168.
**Fix:** Mirror the same copy button pattern on the AI message side.

---

### [ ] 3. Auto-Naming Chats
**What's broken:** Chat title defaults to `messages[0].content.substring(0, 40)` (`Dashboard.tsx:177`). No AI-generated naming. Manual rename exists via double-click in sidebar.
**Fix:** On first message sent, fire a lightweight non-streaming AI call: *"Give this conversation a 4–6 word title based on this opening message."* Store result in session metadata. Use the cheapest/fastest available model for this call.

---

### [ ] 4. Regenerate Response
**What's missing:** No retry/regenerate UI anywhere. User must manually retype.
**Fix:** Add a regenerate button to AI message actions. Re-invoke `streamMessage` using the last user message in history, replacing the current AI message.

---

### [ ] 5. Edit User Message + Resend
**What's missing:** Messages are immutable after send. No edit button exists.
**Fix:** Add edit button to user message actions. On confirm: truncate `messages` array to exclude the edited message and everything after it, replace with edited content, re-invoke stream.

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
**Issue:** Fetches favicons from `icons.duckduckgo.com` — leaks visited domains to third party.
**Fix:** Generate local fallback icons: deterministic HSL color from domain name hash + first-letter initial. Zero external pings.

---

### [ ] Search Bar UI Polish
**Issue:** Search bar in left sidebar works (filters by title + content) but animations and UI are rough.
**Fix:** Polish animations and transitions. No functional changes needed.

---

### [ ] Settings Cleanup
**Issue:** Settings has theme/background toggles that duplicate controls already in the top bar. Feels sparse.
**Fix:** Remove duplicate toggles from Settings. Consider consolidating into a single clean tab.

---

### [ ] Right Sidebar Default State
**Issue:** Right sidebar is collapsed by default, which is correct. But the content (token stats, sampling params) may be too technical to surface prominently.
**Consideration:** Keep collapsed by default. May want to hide token stats entirely until user opens sidebar.

---

## 🟢 Differentiators — Build After All Above Is Done

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
See `docs/IDEAS.md` for full spec.

### [ ] Folder / Category Organization in Sidebar
Drag-and-drop folder system for chats. Beyond basic pin/rename/delete.

### [ ] Local ML / Semantic Vector Memory
- Local vector embeddings (`all-MiniLM-L6-v2`) for conceptual/semantic search
- OCR on images/screenshots, indexed on ingest
- RAG "Librarian" orchestrator — Top-K retrieval, token-efficient context injection
- Ghost Context discovery (>90% relevance score triggers faint glow on input)
See `docs/IDEAS.md` for full spec.

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
