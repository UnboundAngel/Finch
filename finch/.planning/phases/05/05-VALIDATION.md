# Phase 05: Dashboard & Settings Polish — Validation

## Requirements Coverage
- [ ] R-01: Prompt cards must have equal height and 16px rounded corners.
- [ ] R-02: Settings tabs must use AnimatePresence for non-simultaneous rendering.
- [ ] R-03: Provider cards must use staggered entry animations.
- [ ] R-04: Model selector must use compact grouping and motion.

## Visual Checklist
- [ ] 2x2 grid in `ChatArea.tsx` shows cards with identical height.
- [ ] `rounded-2xl` is present on prompt buttons.
- [ ] Settings dialog tab switch is smooth (no snap).
- [ ] Provider sections in settings have staggered entry.
- [ ] Model selector dropdown expands smoothly and shows headers.

## Build & Errors
- [ ] `npm run build` succeeds.
- [ ] No console errors during any interaction.
