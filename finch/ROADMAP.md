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

## Phase 09: Right Sidebar Shell + Toggle
**Requirements:** [R-17, R-18]
- [x] R-17: Add a collapsible right sidebar shell to the app layout (shell only, no content).
- [x] R-18: Sidebar toggle button in chat header using predefined SVG assets.

**Plans:** 1 plans
- [x] 09-01-PLAN.md — Right Sidebar Shell + Toggle

## Phase 09.1: Header & Sidebar Refinement (Bug Fixes)
**Requirements:** [R-09.1-01, R-09.1-02]
- [x] R-09.1-01: Header must separate chat controls from system controls with a vertical separator.       
- [x] R-09.1-02: Right sidebar toggle must use functional state updates and correctly trigger layout shift.

**Plans:** 1 plans
- [x] 09.1-01-PLAN.md — Header Grouping & Toggle Behavior Fix

## Phase 09.2: Header Refinement & Model Bar (09-01 fixes)
**Requirements:** [R-09.2-01, R-09.2-02]
- [x] R-09.2-01: Move model selector and right sidebar toggle to a dedicated second bar.
- [x] R-09.2-02: Add an unload (Eject) button for local models to clear current selection.

**Plans:** 1 plans
- [x] 09.2-01-PLAN.md — Refactor dashboard header and add model bar.

## Phase 09.3: Layout Polish — Three-Tier Header & Sidebar Refinement
**Requirements:** [R-09.3-01, R-09.3-02, R-09.3-03]
- [x] R-09.3-01: Restructure Dashboard into Top Bar, Second Bar, and constrained Sidebar Zone.
- [x] R-09.3-02: Polish RightSidebar background and width animation.
- [x] R-09.3-03: Restrict drag regions to Top Bar and ensure component alignment.

**Plans:** 1 plans
- [x] 09.3-01-PLAN.md — Dashboard Layout Restructuring & Sidebar Polish

## Phase 09.4: Header Consolidation
**Requirements:** [R-09.4-01]
- [x] R-09.4-01: Header must be a single unified strip (h-14) containing all chat and system controls.    

**Plans:** 1 plans
- [x] 09.4-01-PLAN.md — Consolidate header bars into single strip.

## Phase 09.5: Layout Hotfixes & Migration Stability
**Requirements:** [R-09.5-01, R-09.5-02]
- [x] R-09.5-01: Ensure left sidebar toggle icons use correct assets with leading slashes.
- [x] R-09.5-02: Ensure chat migration includes `created_at` timestamp.

**Plans:** 1 plans
- [x] 09.5-01-PLAN.md — Fix Sidebar Icon & Chat Migration (Completed)

## Phase 09.6: Dark Mode SVG Fixes
**Requirements:** [R-09.6-01]
- [x] R-09.6-01: Ensure all SVG icons in Dashboard are visible in dark mode via `dark:invert` class.      

**Plans:** 1 plan
- [x] 09.6-01-PLAN.md — Add dark:invert to Dashboard icons (Completed).

## Phase 09.7: Eject Model Implementation
**Requirements:** [R-09.7-01, R-09.7-02]
- [x] R-09.7-01: Implement Tauri permissions for the `eject_model` command.
- [x] R-09.7-02: Wire the `eject_model` command to the Dashboard eject button with error handling.        

**Plans:** 1 plan
- [x] 09.7-01-PLAN.md — Implement permissions and wire eject button.

## Phase 09.8: Window Controls Fix
**Requirements:** [WINDOW-FIX-01]
- [x] WINDOW-FIX-01: Fix WindowControls.tsx for Tauri v2 API and nested button House errors in tooltips.   

**Plans:** 1 plan
- [x] 09.8-01-PLAN.md — Fix WindowControls.tsx

## Phase 10: Inactivity Eject
**Requirements:** [R-10-01, R-10-02]
- [x] R-10-01: Implement `useInactivityEject` hook to auto-unload local models.
- [x] R-10-02: Wire hook to Dashboard for automatic cleanup on 10-minute inactivity.

**Plans:** 1 plan
- [x] 10-01-PLAN.md — Implement useInactivityEject and wire Dashboard.

## Phase 11: Chat Duplication Fix
**Requirements:** [R-07-10]
- [ ] R-07-10: (REVISIT) Fix chat duplication on first message via ref tracking and save logic refinement.

**Plans:** 1 plan
- [ ] 11-01-PLAN.md — Ref-track activeSessionId and fix handleSend callback.

## Phase 12: Token Stats Fix
**Requirements:** [R-12-01, R-12-02]
- [x] R-12-01: Extract native LM Studio duration in Rust.
- [x] R-12-02: Prioritize native stats in useAIStreaming hook.

**Plans:** 1 plan
- [x] 12-01-PLAN.md — Implement Token Stats Fix.

## Phase 13: Voice & Search (Deferred)
