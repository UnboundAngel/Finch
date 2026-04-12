---
phase: quick
plan: 002
type: execute
wave: 1
depends_on: []
files_modified: [src/components/chat/ModelSelector.tsx]
autonomous: false
requirements: [R-13, R-14, R-15]
must_haves:
  truths:
    - "Selected model has a semi-transparent ghost pill background (10-15% opacity)"
    - "Selected model text is bold and uses the primary accent color"
    - "Highlight slides smoothly between models using layoutId"
    - "Bookmark icon remains visible and clickable on all models"
  artifacts:
    - path: "src/components/chat/ModelSelector.tsx"
      provides: "Refined model selection UI"
---

<objective>
Refine the active model indicator in ModelSelector.tsx to improve visual clarity and follow 2026 design standards. Replace the basic dot indicator with a "Ghost Pill" highlight and "Typography Pop" styling, ensuring smooth motion during selection changes.
</objective>

<execution_context>
@$HOME/.gemini/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@src/components/chat/ModelSelector.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Implement Ghost Pill structure and sliding motion</name>
  <files>src/components/chat/ModelSelector.tsx</files>
  <action>
    - Remove the `active-model-indicator` and `active-model-indicator-bm` dot indicators (motion.div with rounded-full).
    - In both the Bookmarked section and Provider list, add a new `motion.div` inside the `DropdownMenuItem` when it is selected.
    - Set the ghost pill styling: `absolute inset-0 bg-primary/10 rounded-xl -z-10`.
    - Apply a shared `layoutId="active-model-pill"` to both sections to enable smooth sliding between any selection.
    - Set the transition to `duration: 0.2` and `ease: "easeOut"` (per 2026 standards).
    - Ensure `DropdownMenuItem` has `relative` class and `z-0` if needed to ensure the pill stays behind the text but within the item.
  </action>
  <verify>
    <automated>grep -q "layoutId=\"active-model-pill\"" src/components/chat/ModelSelector.tsx</automated>
  </verify>
  <done>The dot is gone, and a background highlight exists for the selected model with layoutId sliding.</done>
</task>

<task type="auto">
  <name>Task 2: Apply Typography Pop styling</name>
  <files>src/components/chat/ModelSelector.tsx</files>
  <action>
    - Update the conditional styling for the model name `span`.
    - Change the selected state from `font-semibold` to `font-bold`.
    - Ensure it uses `text-primary` for the selected state.
    - Add `transition-all duration-200` to the `span` to ensure color and weight changes feel smooth (as much as possible for weight).
    - Verify that `BookmarkIconButton` is still visible and not obscured by the new highlight.
  </action>
  <verify>
    <automated>grep -q "font-bold text-primary" src/components/chat/ModelSelector.tsx</automated>
  </verify>
  <done>Selected model text is bold and primary-colored with a 200ms transition.</done>
</task>

<task type="checkpoint:human-verify">
  <name>Task 3: Verify visual flow and accessibility</name>
  <action>
    1. Open the Model Selector dropdown.
    2. Select different models (including across sections if possible).
    3. Verify the highlight slides smoothly to the new selection.
    4. Verify the active model text is bold and primary colored.
    5. Verify the bookmark button is still clickable and doesn't trigger selection if clicked specifically.
    6. Ensure the corners are 12px (rounded-xl) and motion feels responsive (200ms).
  </action>
  <verify>Visual inspection matches 2026 standards</verify>
  <done>UI refinement verified and approved</done>
</task>

</tasks>

<success_criteria>
- No more dot indicators in ModelSelector.
- Background highlight (10-15% primary opacity) appears on the active model.
- Highlight slides between any two models in the menu.
- Active model text is bold and primary colored.
- UI remains responsive and bookmark buttons are accessible.
</success_criteria>
