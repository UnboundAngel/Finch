# Finch Product Strategy — Design Document

*Created: 2026-04-19*

## Context

Finch is a mature-enough desktop AI chat app (Tauri v2 + Rust + React 19) that has never been publicly shipped. The goal: treat Finch as a real product, define what "done enough to ship" looks like, identify the differentiator that makes it worth using over existing alternatives, and establish a business model that can eventually sustain the project.

The core tension: the multi-model desktop chat client space is already crowded (Msty, Chatbox, Jan). Shipping a "pretty good" version of what already exists will not drive organic growth. Finch needs one feature that's demonstrably better than anything else at something specific.

---

## Product Identity

**What Finch is:** A native desktop AI chat client for Windows and Linux. Not a self-hosted web server, not an Electron app — a real native binary built with Tauri and Rust that installs like any other software.

**What Finch is not (yet):** Just another multi-model chat client. That's table stakes in 2026, not a differentiator.

**The differentiator to build toward:** Smart model routing. Finch helps users understand what to run locally vs. what to send to a cloud provider — saving real money — and profiles (personas) that persist their intent across any model. A fitness coach profile behaves like a fitness coach whether you're on Ollama, Claude, or GPT. Personal context is injected smartly, not front-loaded as 40k tokens on every chat open.

**External hook:** "One app, every model — and it tells you when to go local." That's a concrete, shareable outcome (cost savings), not a vague promise.

**Platform targets:** Windows primary, Linux secondary, Mac future (no timeline).

---

## Business Model

- **Free forever:** Core app — local models (Ollama/LM Studio), bring-your-own API keys (Anthropic, OpenAI, Gemini). This builds the user base and trust.
- **GitHub Sponsors from day one:** Tip jar, low friction, signals the project is actively maintained.
- **Paid tier — later, when users exist:** Only for features that cost infrastructure to provide (cross-device sync, hosted relay). Never gate locally-running features.
- **Open-core structure:** Public GitHub repo (frontend only) builds community trust. Private Rust backend is the competitive moat and future monetization lever.

Do not design the paid tier yet. Build it when users tell you what they'd pay for.

---

## Competitive Landscape

| App | Type | Gap Finch fills |
|---|---|---|
| OpenWebUI | Self-hosted web | Requires Docker/server. Finch = download and run. |
| Msty | Desktop (Mac-first) | No smart routing, no persona profiles. |
| Chatbox | Cross-platform web+desktop | Broad but shallow. No local context vault. |
| Jan | Electron desktop | Electron overhead. No cloud providers well-integrated. |
| LM Studio | Desktop | Local-only. No cloud providers, no web search, no voice. |

Finch's moat: Tauri (not Electron), Rust security layer, and the smart routing + persona system (once built).

---

## Roadmap

### Phase 1 — Baseline (ship nothing until this is done)

Close all 7 gaps. Every item below will be hit by a first-time user or reviewer within 5 minutes:

1. **File/image upload → actually sent to AI** — architecture fully specced in `docs/BACKLOG.md`
2. **Copy button on AI messages** — mirror existing pattern from user messages in `MessageBubble.tsx`
3. **Auto-naming chats** — lightweight AI call on first message, store in session metadata
4. **Regenerate response** — button on AI message, re-invoke `streamMessage` from last user message
5. **Edit user message + resend** — truncate history, replace, re-invoke stream
6. **Stop button cancellation state** — visual "Generation stopped" indicator; currently stops silently with no feedback
7. **Text selection contrast fix (Darkmoon)** — `::selection` renders white text on light user message bubbles, making selected text invisible

### Phase 2 — Hero Feature (the differentiator)

Smart routing + persona profiles. This is what makes Finch worth writing about:

- **Profiles as model-agnostic personas:** system prompt, preferred model tier (local/cloud), default web search on/off
- **Smart routing suggestions:** when a task looks like a quick query, Finch surfaces "this could run locally" with a one-click switch
- **Context vault (lightweight first pass):** user-defined facts injected only when relevant, not front-loaded. No 40k token cold-starts.
- **Privacy guardrail:** warn before a profile's personal context is sent to a cloud provider

### Phase 3 — Distribution

Only after Phase 2:

- Proper GitHub README with demo GIF showing routing/persona system in action
- GitHub Sponsors page
- Single post to r/LocalLLaMA (one well-timed post, not spam)
- Landing page (separate project, Gemini-assisted)
- Conversation export (markdown/JSON) — reviewers check for this

### What NOT to build until users validate it

OmniSearch, Vector Memory (full semantic vault), Artifacts system, Finch Projects. All specced in `docs/BACKLOG.md` — park there until real users ask for them.

---

## Distribution Philosophy

- No paid marketing. Word of mouth only until there's something worth paying to market.
- The r/LocalLLaMA community will try it if the demo shows something they don't have. One demo GIF of smart routing > any feature list.
- The GitHub repo IS the landing page until a real one exists. Invest in the README.

---

## Success Criteria (6 months)

- All 7 baseline gaps closed
- Smart routing + persona profiles shipped and working end-to-end
- GitHub repo public with demo GIF
- At least one external mention (Reddit, YouTube, blog) not written by the developer
- GitHub Sponsors active (even $0 — the infrastructure matters)

---

## Verification

**After Phase 1:**
- Fresh install on Windows, manually exercise every baseline item
- Test file upload through each provider (Anthropic, OpenAI, Gemini, Ollama, LM Studio)
- Confirm stop button shows cancellation state visually
- Test text selection in Darkmoon on user message bubbles — text must be readable
- Confirm auto-naming fires on first message and persists across session reload

**After Phase 2:**
- Create 3 persona profiles (fitness, coding, general); switch between them mid-session
- Verify system prompt and model preference follow the active profile
- Send a short query; verify routing suggestion appears for local-eligible tasks
- Add personal context to vault; verify it doesn't appear in token count on cold start
- Trigger cloud send with personal context in vault; verify privacy warning appears
