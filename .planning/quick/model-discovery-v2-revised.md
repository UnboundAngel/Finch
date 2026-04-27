# Model Discovery v2 — Locked decisions (2026-04-27)

Plan-only revision. Implementation tracks phases; Phases B/C follow Phase A merge.

## 1. Curated list IDs (verify at implementation against live provider docs)

| Provider | Policy | IDs (initial targets) |
|----------|--------|------------------------|
| Anthropic | Static 3 in Rust | `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001` |
| OpenAI | Do **not** hardcode from memory | At implementation: read [OpenAI models docs](https://platform.openai.com/docs/models) for current **flagship**, **instant**, and **reasoning** model IDs (API surface changed Feb 2026). |
| Gemini | Static 3; verify deprecations | `gemini-3.1-pro-preview`, `gemini-3-flash-preview`, plus one more **current stable** ID. Confirm `gemini-3-pro-preview` shutdown (March 9, 2026) before including. |
| Local (Ollama / LM Studio) | **Always unfiltered**, never curated | No change to list behavior beyond existing endpoints. |

## 2. Reasoning effort

- **UI:** `low` | `medium` | `high` | `max` (default on first install: **`medium`**).
- **Anthropic:** `output_config.effort` with those values; map **`max` → `high`** when the selected model is not Opus-tier (Sonnet caps below max).
- **OpenAI:** `reasoning_effort` (or Responses-API equivalent for the surface in use); **omit** for non-reasoning models.
- **Gemini:** One field, aligned with **existing** `gemini.rs` request shape — no dual OpenAI-compat + native paths.
- **Local:** ignore.

## 3. `send_message` parity

- **Audit:** `send_message` is only invoked from `useChatEngine.ts` for **local** providers (`local_ollama` / `local_lmstudio`) auto-title. Cloud titles use `deriveClientTitle` (no IPC).
- **Decision:** **Skip** `reasoning_effort` on `send_message` unless a new call site needs it.

## 4. OpenAI “show all” semantics

- When `show_all_discovered === true`, **drop** the `owned_by == "openai"` filter so power users see the full provider response.
- When `false`, use curated + normal filtering per Phase B spec.

## 5. Capability check

- **`get_model_param_support`** IPC — single source of truth in **Rust** (aligns with API-key boundary patterns). Frontend calls invoke; **no** duplicated TS heuristics for gating the effort UI.
- **Capabilities:** `allow-get-model-param-support` in `default.json` (+ `lib.rs` register).

## 6. `map_model` (Phase A)

- Ships **first** as its **own commit** (correctness; do not bundle with discovery v2 or effort).
- **Behavior:** legacy “Finch …” display names → fixed API ids; **all other** strings pass through unchanged (no default-to-Sonnet).

## 7. Git

- After each phase passes verification, **push to `origin` branch `linux`**.

---

## Phase checklist

- [x] **A:** `map_model` passthrough — standalone commit, verify `cargo test` / `cargo check`
- [ ] **B:** Curated lists + `show_all_discovered` on list IPC + store toggle + UI
- [ ] **C:** `reasoning_effort` on `stream_message` + providers + `get_model_param_support` + sidebar UI
