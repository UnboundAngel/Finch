# Phase 06-02: Message Generation Stats — Validation

## Requirements Coverage
- [ ] R-08: Message stats must show real-time performance metrics (stop_reason, total_tokens, tokens/s) with hover-reveal.

## Functional Checklist
- [ ] Rust sends `__STATS__:` JSON sentinel at the end of every stream.
- [ ] `useAIStreaming` hook correctly parses the sentinel and ignores it for message content.
- [ ] `tokensPerSecond` is calculated accurately based on stream duration.
- [ ] Assistant messages in `MessageBubble` / `MetadataRow` show performance stats.
- [ ] Stats reveal animation is smooth (200ms).
- [ ] Hover over historical assistant messages reveals their stats.
- [ ] `HelpCircle` tooltip displays formatted JSON of stats.
- [ ] `Copy` button successfully copies stats JSON to clipboard.
- [ ] Aborting a stream sets `stop_reason` to "abort".

## Build & Errors
- [ ] `npm run build` succeeds.
- [ ] No console errors related to sentinel parsing.
- [ ] No Rust panics or errors during sentinel dispatch.
