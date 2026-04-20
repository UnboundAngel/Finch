# ROADMAP — Finch

## Phase 05: Dashboard & Settings Polish
- [x] R-01: Prompt cards must have equal height and 16px rounded corners.
- [x] R-02: Settings tabs must use AnimatePresence for non-simultaneous rendering.
- [x] R-03: Provider cards must use staggered entry animations.
- [x] R-04: Model selector must use compact grouping and motion.

## Phase 06: Chat Sidebar & Input Refinement
- [x] R-05: Sidebar active chats must use violet accent and clear distinction.
- [x] R-06: Web search toggle must use blue stroke and border glow.
- [x] R-07: Dark mode toasts must be frosted semi-transparent.
- [x] R-08: Message stats must show real-time performance metrics (stop_reason, total_tokens, tokens/s) with hover-reveal.

## Phase 07: Chat System Fixes
- [x] R-09: Incognito chats must not persist after session ends.
- [x] R-10: Messages must append to existing chats without duplication.
- [x] R-11: Last used model must persist between sessions.
- [x] R-12: Chats must be stored in individual JSON files via Rust commands.

## Phase 08: Model Selector Polish
- [x] R-13, R-14, R-15, R-16 (Completed)

## Phase 09: Right Sidebar Shell + Toggle
- [x] R-17, R-18, R-19, R-20 (Completed)

## Phase 09.1 to 09.8 (Completed)

## Phase 10: Inactivity Eject (Completed)

## Phase 11: Chat Duplication Fix (Completed)

## Phase 12: Token Stats Fix (Completed)

## Phase 13: Voice Transcription (Local-First)
**Requirements:** [VOICE-13-02, VOICE-13-03, VOICE-13-04, VOICE-13-05]
- [ ] VOICE-13-02: Audio capture with 'cpal' and inference with 'whisper-rs' using 'small' model.
- [ ] VOICE-13-03: Managed State for Whisper engine and audio buffers.
- [ ] VOICE-13-04: Tauri commands: start_recording, stop_recording, get_transcription_status.
- [ ] VOICE-13-05: Non-blocking inference on stop_recording.

**Plans:** 3 plans
- [x] 13-02-PLAN.md — Local-First Voice Transcription Backend
- [ ] 13-03-PLAN.md — Local Model Downloader Backend (Rust)
- [ ] 13-04-PLAN.md — Model Marketplace UI (React)

## Phase 14: Token Enrichment & Context Intelligence (Completed)

## Phase 15: Context Intelligence System (Completed)
