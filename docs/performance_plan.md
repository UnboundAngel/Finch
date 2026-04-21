Finch performance implementation plan
This plan turns the audit into ordered work: measure → quick wins → streaming path → layout/Motion compliance → structural state → polish. Each phase ends with something you can verify in the app.

Phase 0 — Baseline & guardrails (0.5 day)
Goals: Know you improved something; avoid regressions.

Task	Detail
0.1
Record baseline: DevTools Performance (streaming 30s with a long reply + one fenced code block), React Profiler (commit count for DashboardContent / MessageBubble during stream).
0.2
Add a short internal checklist doc (optional): “streaming test”, “code block while streaming”, “right sidebar open + max token drag”, “mic settings open”.
0.3
Branch from current linux/main as agreed in AGENTS.md (private remote only).
Exit: One saved profiler screenshot or numbers (commits/sec, long tasks) for before/after.

Phase 1 — Quick wins (same day, ~2–4 hours)
Goals: Low risk, immediate relief; no architecture change.

ID	Task	Files
1.1
Remove production console.log in model polling
src/hooks/useModelPolling.ts
1.2
Fix whole-store subscriptions
src/components/dashboard/DashboardMain.tsx, src/App.tsx, src/components/startup/StartupScreen.tsx — use scalar selectors or getState() for setters only
1.3
Streaming scroll: scrollIntoView({ behavior: 'auto' }) while messages update rapidly; optional rAF single flush
src/components/chat/ChatArea.tsx
1.4
Hoist remarkGfm plugin array to module scope (stable reference)
src/components/chat/MessageBubble.tsx
1.5
Hoist Shiki <style> to global CSS once (remove per-CodeBlock duplicate)
src/components/chat/CodeBlock.tsx + one stylesheet import
Exit: Fewer re-renders from (1.2); less scroll jank (1.3); slightly cheaper markdown (1.4); fewer DOM nodes (1.5).

Phase 2 — Streaming IPC → React batching (0.5–1 day)
Goals: Cut React commits per model token; align with “don’t flood main thread”.

ID	Task	Files
2.1
In channel.onmessage, buffer text events; flush on requestAnimationFrame (or ~16ms timer); flush immediately before stats / search_* if needed for ordering
src/hooks/useAIStreaming.ts
2.2
Ensure onToken still receives concatenated deltas so Dashboard’s last.content + token logic stays correct (flush sends accumulated string)
same
2.3
On abort/complete, cancel rAF and flush pending buffer
same
Exit: Profiler shows materially fewer commits during identical stream; UI still shows smooth text growth.

Risk: Ordering of search events vs first text token — add tests or manual checklist item.

Phase 3 — Markdown + Shiki hot path (1 day)
Goals: Stop re-parsing / re-highlighting work every token for the streaming assistant message.

ID	Task	Files
3.1
useMemo for ReactMarkdown components map (stable between prop changes); consider factory + useMemo keyed by isDark, msg.role, msg.streaming
MessageBubble.tsx
3.2
Pass streaming into fenced CodeBlock; skip codeToHtml while streaming === true (plain <pre><code>)
MessageBubble.tsx, CodeBlock.tsx
3.3
Optional: useDeferredValue(msg.content) for assistant markdown only (not user while editing)
MessageBubble.tsx
Exit: With a streaming fenced block, CPU drops and no long yellow blocks in Performance tab; final highlight matches theme after stream ends.

Risk: Brief flash when switching plain → highlighted — acceptable or fade opacity in CSS.

Phase 4 — AGENTS.md Motion / collapsible compliance (1–1.5 days)
Goals: Remove height: "auto" Motion collapsibles where they conflict with store-driven updates; keep discrete Motion (chevrons, icon swaps).

ID	Task	Files
4.1
Replace ParameterZone expand/collapse with CSS max-height + opacity transition; keep chevron as Motion or pure CSS rotate
src/components/sidebar/components/ParameterZone.tsx
4.2
Same for SearchStatus expandable log
src/components/chat/SearchStatus.tsx
4.3
Replace SamplingSection warning motion.p height animations with CSS max-height or static show/hide
src/components/sidebar/components/SamplingSection.tsx
4.4
MaxTokensSlider refactor: remove motion onPan + layoutId pill; use pointer events + CSS transform for pill; debounce or commit setMaxTokens on pointer up / snap only
src/components/sidebar/MaxTokensSlider.tsx
Exit: Drag max-tokens / temperature sliders with right sidebar open: no layout thrashing, no fighting spring + Zustand. Collapsibles still feel snappy.

Risk: Visual parity — snapshot or quick design pass.

Phase 5 — Sidebar search & list cost (0.5 day)
Goals: Cheaper filtering when many chats / long messages.

ID	Task	Files
5.1
useMemo for filteredChats / pinned split from debouncedSearchQuery
src/components/sidebar/ChatSidebar.tsx
5.2
Optional: useDeferredValue(debouncedSearchQuery) so typing in search doesn’t block typing elsewhere
same
5.3
Optional follow-up: precompute searchText on save in Rust or when loading list_chats (bigger change — defer if not needed)
persistence layer
Exit: Search with large recentChats feels instant; no full sidebar tree recomputing unrelated sections.

Phase 6 — Structural: messages out of Dashboard local state (2–4 days, optional but best long-term)
Goals: Token updates don’t re-render DashboardHeader, settings props, etc.

ID	Task	Detail
6.1
Design slice: messages, activeSessionId, setters, appendStreamingToken, finalizeStreamingMessage
New src/store/messagesSlice.ts or extend pattern in src/store/index.ts
6.2
Migrate useChatSession + Dashboard invoke/send/regenerate/edit flows to store
useChatSession.ts, Dashboard.tsx
6.3
Narrow subscriptions: ChatArea only messages; header only model/theme
consumers
6.4
Persistence: keep updateActiveSessionInList semantics; use refs/getState where needed
Dashboard.tsx
Exit: Profiler: Dashboard commits per token drop sharply; only chat subtree updates.

Risk: Regression on incognito, profile switch, undo delete — full regression pass.

Phase 7 — React 19 & remaining polish (ongoing / 0.5 day chunks)
ID	Task
7.1
useTransition for non-urgent UI: e.g. opening heavy modals, or sidebar filter updates if still heavy
7.2
React.memo(DashboardHeader) if props remain stable after Phase 6
7.3
Voice meter: evaluate event-based meter from Rust vs 60ms invoke polling when mic menu open
7.4
Debounce save_provider_config in useChatPersistence if model flips rapidly (only if measured problem)
Dependency graph (short)
Phase 0 ─┬─► Phase 1 (quick wins)
         ├─► Phase 2 (rAF batch tokens) ─► Phase 3 (markdown/shiki)  [2+3 stack well]
         └─► Phase 4 (Motion/CSS)         [parallel with 2–3 after 1]
Phase 5 can run after 1 or in parallel with 4.
Phase 6 after 2+3 prove stable (or in parallel if dedicated branch + QA).
Acceptance criteria (definition of done)
Streaming: Same prompt + code block — fewer long tasks (>50ms) on main thread vs Phase 0 capture.
No regressions: Send, stop, regenerate, edit-resend, incognito, profile switch, save chat, sidebar search.
AGENTS.md: No Motion height: "auto" for collapsibles in touched zones; max-token drag doesn’t stack Motion layout + per-frame Zustand writes.
Store hygiene: No useChatStore() / useProfileStore() bare destructuring in hot paths (DashboardMain, App, startup).
Suggested PR breakdown
PR	Phases	Title (example)
1
1 + 0.2 checklist
perf: quick wins + store selector fixes
2
2
perf: batch streaming channel tokens on rAF
3
3
perf: markdown memo + skip Shiki while streaming
4
4
perf: CSS collapsibles + max-token slider without layout motion
5
5
perf: memoize sidebar chat filtering
6
6
refactor: move chat messages to dedicated Zustand slice
If you want this mirrored into .planning/ or docs/architecture/, say where you prefer it and I can add a single file there in a follow-up (you previously asked only for the plan in chat).




Select