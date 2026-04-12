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
**Requirements:** [R-13, R-14, R-15, R-16]
- [x] R-13: Bookmarked models must only appear in the "Bookmarked" section.
- [x] R-14: Models must return to their provider section when unbookmarked.
- [x] R-15: Refreshing models must maintain exclusive bookmark visibility.
- [x] R-16: Model selection must use Ghost Pill highlight and Typography Pop indicators.

**Plans:** 2 plans
- [x] 08-01-PLAN.md — Exclusive Bookmark Visibility (Completed as Quick Task)
- [x] 002-model-selection-ui-refinement.md — Ghost Pill & Typography Pop
