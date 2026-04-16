---
phase: 08-refinements
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [src/components/chat/ModelSelector.tsx]
autonomous: true
requirements: [MOD-01]
must_haves:
  truths:
    - "Bookmarked models only appear in the Bookmarked section"
    - "When a model is unbookmarked, it reappears in its original provider section"
    - "A provider section is hidden if all its models are bookmarked"
  artifacts:
    - path: "src/components/chat/ModelSelector.tsx"
      provides: "Exclusive model selection logic"
---

<objective>
Modify `ModelSelector.tsx` to hide bookmarked models from their original provider sections and ensure they only appear in the "Bookmarked" section. When unbookmarked, they should return to their original section.
</objective>

<execution_context>
@$HOME/.gemini/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@src/components/chat/ModelSelector.tsx
@src-tauri/src/lib.rs
</context>

<tasks>

<task type="auto">
  <name>Task 1: Implement exclusive model rendering</name>
  <files>src/components/chat/ModelSelector.tsx</files>
  <action>
    Modify the `providers.map` loop in `ModelSelector.tsx` to filter `provider.models` before rendering:
    1. For each provider, filter out models that are already in `bookmarkedModels`.
    2. If the filtered list of models is empty, return `null` (this hides the provider header and separator).
    3. Ensure `handleSelect` and `toggleBookmark` still function correctly with filtered lists.
  </action>
  <verify>
    <automated>grep -n "provider.models.filter" src/components/chat/ModelSelector.tsx</automated>
  </verify>
  <done>Models are exclusive to either Bookmarked or Provider section, never both.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Exclusive bookmarking logic in ModelSelector</what-built>
  <how-to-verify>
    1. Open the Model Selector.
    2. Bookmark a model from a provider (e.g., Anthropic).
    3. Verify that the model now appears in the "Bookmarked" section and **is gone** from the "Anthropic" section.
    4. Unbookmark it and verify it returns to the "Anthropic" section.
    5. Bookmark all models from a single provider and verify that provider's header (e.g., "Ollama") disappears completely from the list.
  </how-to-verify>
  <resume-signal>approved</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| config update | Updated bookmarks are sent to Tauri store via IPC |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-01 | Information Disclosure | Tauri Store | mitigate | Store is local and uses standard Tauri-plugin-store encryption (if configured), though bookmarks are low sensitivity. |
</threat_model>

<success_criteria>
1. `ModelSelector` properly filters models such that no model is duplicated in the UI.
2. Provider sections vanish when empty due to all models being bookmarked.
3. UI remains snappy and interactive during bookmark toggles.
4. Persistence is verified via standard config saving mechanism.
</success_criteria>
