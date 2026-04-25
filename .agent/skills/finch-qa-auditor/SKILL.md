---
name: finch-qa-auditor
description: Professional-grade QA auditor for the Finch desktop app (Tauri v2 + React 19 + Rust). Run this skill when asked to audit, review, stress-test, find bugs, check production readiness, find performance issues, find UX problems, or compare Finch against industry-standard AI desktop apps. Outputs a structured report with severity-ranked issues, exact file:line references, and surgical fixes. Does NOT make changes — only reports findings unless explicitly asked to fix.
trigger_examples:
  - "audit Finch"
  - "is Finch ready to ship"
  - "find performance issues in Finch"
  - "do a production readiness review"
  - "what's wrong with Finch"
  - "compare Finch to Claude Desktop"
  - "QA pass on Finch"
  - "find UX issues with the onboarding flow"
---

# Finch QA Auditor

Professional code, performance, UX, and stability auditor for the Finch desktop app. Read AGENTS.md and .planning/STATE.md before starting any audit.

## When to Use This Skill

Trigger this skill when the user asks for any kind of quality, readiness, performance, UX, or comparative review of Finch. This skill produces a structured **audit report** — not code changes.

Do NOT use this skill for:
- Implementing features (use normal coding flow)
- Debugging a specific known bug (just fix it)
- Quick questions about a single file

## Audit Modes

The user may request a specific audit mode. If they don't specify, run a **full audit** (all 6 modes).

| Mode | Trigger phrases | Scope |
|---|---|---|
| `full` | "audit Finch", "production readiness", "is it ready" | All 6 categories below |
| `architecture` | "architecture review", "code quality", "tech debt" | Compliance with AGENTS.md rules |
| `performance` | "performance issues", "lag", "slow", "memory" | Render perf, Rust hot paths, IPC chatter |
| `ux` | "onboarding", "UX review", "first-run experience" | Cold-start flow, model selection, empty states |
| `security` | "security review", "vuln check" | API key handling, IPC surface, capabilities |
| `stability` | "stability", "crash review", "error handling" | Panics, unwraps, error boundaries, fallbacks |
| `gap-analysis` | "compare to Claude Desktop", "feature gap" | What Claude Desktop has that Finch lacks |

## Required Inputs Before Starting

Before producing any audit, read these files in order:

1. `AGENTS.md` — architectural rules (the bible)
2. `.planning/STATE.md` — current project state
3. `package.json` and `src-tauri/Cargo.toml` — actual versions
4. `src-tauri/capabilities/default.json` — IPC permission surface
5. The relevant source directories for the requested mode

If any of these files are missing, STOP and tell the user what's missing.

## Output Format

Every audit report MUST follow this structure:

```markdown
# Finch QA Audit Report — [MODE]
**Date:** [today]
**Branch:** [main / linux]
**Audit scope:** [list of modes run]

## Executive Summary
[3-5 sentences. Top-line verdict. Number of CRITICAL / HIGH / MEDIUM / LOW issues found. Overall readiness assessment on a 1-10 scale.]

## Critical Issues (ship blockers)
For each: title, file:line, description, exact fix.

## High-Severity Issues
[Same format]

## Medium-Severity Issues  
[Same format]

## Low-Severity / Polish
[Same format — bullet list is fine here]

## Wins (what Finch does well)
[Important — do NOT skip this. Balanced reports are credible reports.]

## Recommended Next Actions
[Prioritized list, max 5 items, each with rough time estimate]
```

## Severity Definitions

- **CRITICAL** — Will cause crashes, data loss, security breaches, or users to abandon on first launch. Ship blocker.
- **HIGH** — Significant UX friction, perf degradation users will notice, or violation of a core AGENTS.md rule.
- **MEDIUM** — Tech debt, minor UX papercuts, suboptimal patterns that compound over time.
- **LOW** — Polish, naming, comment quality, tiny consistency wins.

## Mode-Specific Checklists

### 🏛️ ARCHITECTURE MODE

Check every rule in AGENTS.md Section 4. For each rule, search the codebase and report violations:

- [ ] Are API keys ever exposed to the React renderer? Grep for `apiKey` references in `src/`.
- [ ] Does every `#[command]` have a corresponding `allow-` entry in `capabilities/default.json`? Cross-reference both.
- [ ] Any `.onData()` calls on Channels? (Should all be `.onmessage =`)
- [ ] Any manual `snake_case` conversion in JS payloads sent to Rust?
- [ ] Any `handle.get_store()` calls outside `lib.rs` init lines 39-40?
- [ ] Imports from `@/components/ui/...` vs `@/src/components/...` — correctly distinguished?
- [ ] Is Shiki being initialized more than once? Search for `createHighlighter` calls.
- [ ] Are there exactly 4 Zustand stores? Count exports of `create()`.
- [ ] Any `motion.div` with `layout` prop on a node that's also tied to slider/drag state?
- [ ] Local model fallback context — is 32k the default for unknowns?
- [ ] Any Rust-side artifact event emissions? (Should be client-side only)
- [ ] Are `tokensUsed`, `voiceStatus`, `activeWorkspace` excluded from chat partializer?
- [ ] Is "remember me" stored in `localStorage` under `finch_remembered_profile`?
- [ ] Studio Canvas: any `transition-all` on draggable nodes?
- [ ] Atomic artifact writes: does `ipc/artifacts.rs` use the `.tmp` → rename pattern?
- [ ] Any direct `window.__TAURI__.invoke` calls? (Should all use `getTauriInvoke()`)

Also scan for:
- [ ] Any `#region agent log` blocks or hardcoded session IDs in IPC commands?
- 5th Zustand store creep
- Components > 400 lines (refactor candidates)
- Duplicate utility functions across `src/lib/`
- Unused IPC commands in `capabilities/default.json`

### ⚡ PERFORMANCE MODE

Specific Finch performance hot spots to interrogate:

**Artifact rendering (the prime suspect for "laggy when artifacts open"):**
- Is `artifactParser.ts` running on every keystroke vs only on stream complete?
- Is the artifact panel using `motion.div layout` (causes layout thrashing)?
- Is Shiki re-tokenizing on every render of the artifact code?
- Is there virtualization on long artifact content?

**Streaming:**
- Is `useAIStreaming.ts` actually using `requestAnimationFrame` batching? Verify.
- Are search events (`search_start`, `search_source`, `search_done`) properly flushing the text buffer first?
- Any synchronous JSON parsing in the stream handler?

**Zustand:**
- Are components subscribing to entire stores vs slice selectors?
- Look for `const state = useChatStore()` instead of `useChatStore(s => s.field)` — full-store subscription causes re-renders on any field change.

**Studio Canvas:**
- Verify direct DOM mutation pattern is honored
- Check `getBoundingClientRect` is cached at `pointerdown`, not called per-`pointermove`
- World-coord math: `delta / zoom` (not `delta * zoom`)

**Markdown rendering:**
- `react-markdown` + `remark-gfm` on every render of long messages? Memoize.
- Code block `<CodeBlock>` — is Shiki singleton being reused?

**Memory leaks:**
- Event listeners attached without cleanup in `useEffect`? Search for `addEventListener` without matching `removeEventListener`.
- Tauri event listeners (`listen()`) — are unlisten functions called on unmount?
- Long-lived `setInterval` without clearing?

**Rust hot paths to flag:**
- `inject_attachments_into_messages` — base64-encoding large files synchronously?
- Provider streaming loops — any blocking allocation per token?
- `whisper-rs` transcription — running on a blocking thread?

### 🎨 UX MODE (THE COLD-START AUDIT — most important right now)

This is where Finch is bleeding the most based on user feedback. Audit ruthlessly:

**First 60 seconds checklist:**
- [ ] Does the user understand WHAT Finch is within 5 seconds of launch?
- [ ] Profile creation screen — does it explain WHY a profile is needed?
- [ ] Can a user reach a working chat in under 2 minutes without reading any docs?
- [ ] When the model dropdown is empty, is there guidance on what to do next?
- [ ] Is there a "no API key" empty state with clear CTAs (link to provider, paste key, try local model)?
- [ ] Does the app surface "you can use Ollama/LM Studio for free locally" prominently?
- [ ] Are loading states distinguished from error states clearly?
- [ ] First message — is there a default suggestion or starter prompts?

**BYOK friction audit:**
- [ ] How many clicks from cold launch to "first message sent"?
- [ ] Is there a "demo mode" using a local model with a prebuilt prompt?
- [ ] Provider setup — is it discoverable from main UI?
- [ ] Are API keys validated on entry, or do users find out they're wrong on first send?
- [ ] After paste, does Finch auto-detect available models or require manual model picking?

**Empty states audit:**
- Empty chat list
- Empty artifact panel
- Empty model dropdown
- Empty session
- Failed transcription
- Failed stream
Each should have: explanation + suggested action + (if applicable) recovery CTA.

**Onboarding gaps:**
- Is there a tooltip/walkthrough on first launch?
- Is there a "skip to local model" path that requires zero external setup?
- Are advanced features (Studio, Profiles) discoverable but not in the way?

### 🔒 SECURITY MODE

- [ ] `get_provider_config` — verify keys are masked before returning to JS. Look for the masking implementation.
- [ ] Any `unsafe` Rust blocks? Justify each.
- [ ] CORS / CSP — review `tauri.conf.json` for permissive settings.
- [ ] Are file paths from JS validated against path traversal in Rust?
- [ ] `fs` plugin scope — what can the renderer access?
- [ ] Voice recording — does it require explicit user gesture? Mic indicator visible?
- [ ] Web search providers (Tavily, Brave, SearXNG) — are queries sanitized?
- [ ] LLM tool-use / function calling — any path where model output triggers IPC without user confirmation?
- [ ] Atomic artifact writes — verify `.tmp` rename actually atomic (same-filesystem check)
- [ ] `localStorage` data — is "remember me" profile data sensitive? Should it be encrypted?

### 💥 STABILITY MODE

**Rust panic surface:**
- Grep for `.unwrap()` and `.expect()` in production code paths. Each one is a potential crash.
- Grep for `panic!()` calls. Should be near-zero outside tests.
- Are async errors properly bubbled (`?` operator) vs swallowed?

**Error boundaries:**
- Is there a top-level React `<ErrorBoundary>`?
- Are streaming errors surfaced to the user vs silently logged?
- IPC failures — does the UI show a useful error or just hang?

**Recovery paths:**
- What happens if the Tauri store file is corrupted on disk?
- What happens if an LLM provider returns 500 mid-stream?
- What happens if the user's API key expires during a session?
- What happens if the local model is ejected mid-stream?
- What happens if the user runs out of disk space during artifact write?

**Telemetry presence:**
- Is `tauri-plugin-sentry` installed? If no, this is CRITICAL for a production app.
- Is `auto_session_tracking: true` set? Without this, no crash-free metric exists.
- Is `release: sentry::release_name!()` set so crashes are tagged with the build?

### 📊 GAP ANALYSIS MODE (vs Claude Desktop)

Compare Finch's feature surface against Claude Desktop (April 2026 state). For each gap, assess: relevance to Finch's audience, build cost, and whether to add or skip.

Claude Desktop has (verified as of April 2026):
- Multi-session sidebar with parallel chat management
- Drag-and-drop pane layout (chat / preview / terminal / file editor)
- Integrated terminal in-app
- In-app file editor for spot edits
- Side chat that branches off main thread without polluting context
- Three view modes: Verbose / Normal / Summary
- Streaming responses (Finch has this ✓)
- MCP server connectors
- Computer use (beta)
- Routines (cloud-scheduled tasks)
- Shareable chat links
- Cross-device sync
- Memory across sessions

For each item, output one of:
- ✅ **Already in Finch** (note where)
- 🎯 **High value, build it** (estimate complexity)
- 🤔 **Maybe** (depends on audience)
- ❌ **Skip** (out of scope for solo dev / different audience)

## Output Constraints

- DO NOT propose architectural rewrites unless the user explicitly asks
- DO NOT recommend adding 5+ Zustand stores
- DO NOT suggest features that violate AGENTS.md rules
- ALWAYS reference exact file paths and line numbers when citing issues
- ALWAYS include the "Wins" section — balanced reports build trust
- KEEP each issue description ≤ 3 sentences. Surgical, not academic.
- For perf issues, include a quick-win flag (🚀) for fixes that take < 30 mins

## Closing Step

After producing the report, ALWAYS end with:

> **Next move:** [Single sentence — the ONE thing the user should do first based on the highest-severity finding.]

This forces the user to act, not just read.
