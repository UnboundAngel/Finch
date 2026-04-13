# Phase 06: Chat Sidebar & Input Refinement — Validation

## Requirements Coverage
- [ ] R-05: Sidebar active chats must use violet accent and clear distinction.
- [ ] R-06: Web search toggle must use blue stroke and border glow.
- [ ] R-07: Dark mode toasts must be frosted semi-transparent.
- [ ] R-08: Message stats must show real-time performance metrics (stop_reason, total_tokens, tokens/s) with hover-reveal.

## Visual Checklist
- [ ] Sidebar active chat pill uses `oklch(0.488 0.243 264.376)` @ 15% opacity.
- [ ] AI-named chats are italicized.
- [ ] Globe icon stroke is blue when active.
- [ ] Input frame has a blue border glow when web search is on.
- [ ] Notification toasts are semi-transparent and frosted in dark mode.
- [ ] Generation stats appear during stream and reveal on hover after completion.

## Build & Errors
- [ ] `npm run build` succeeds.
- [ ] No console errors.
