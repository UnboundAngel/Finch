# Phase Plan: Right Sidebar Split

Split the 505-line `RightSidebar.tsx` into focused, maintainable child components to improve readability and reduce complexity.

## Objectives
- Extract logical sections into standalone components.
- Reduce `RightSidebar.tsx` to < 150 lines.
- Centralize complex gradient and theme logic into a mandatory hook.
- Ensure zero regression in animations and micro-interactions.

## Architecture Decisions

### 1. State Location
- **Section Visibility**: The `isOpen` state for each section (Prompt, Sampling, Output, Stop Words) will remain in **`RightSidebar.tsx`**.
- **Control**: State is passed down via `isOpen` and `onToggle` props. This allows `RightSidebar` to maintain orchestration control and coordinate programmatic collapses/expansions in the future.

### 2. Theme & Styling (`useSidebarTheme`)
- **Mandatory Hook**: `useSidebarTheme.ts` is required. 
- **Responsibility**: 
    - Manages the `MutationObserver` on `document.documentElement` to track `themeMode`.
    - Computes and returns theme-derived style constants: `textColor`, `mutedTextColor`, `inputBg`, `borderColor`, `iconColor`, and `circleBorderClass`.
- **Dependency**: `SamplingSection` and others will consume this hook to ensure gradients and borders react instantly to theme switches.

## Proposed Components
New directory: `src/components/sidebar/components/`

1. **`ParameterZone.tsx`**: Shared UI wrapper for collapsible sections.
2. **`SystemPromptSection.tsx`**: System prompt textarea + token count.
3. **`SamplingSection.tsx`**: Creativity (Temperature) and Focus (Top P) sliders + gradients.
4. **`OutputSection.tsx`**: Response length input + MaxTokensSlider.
5. **`StopWordsSection.tsx`**: Stop string management.

## Tasks

### Step 1: Shared Infrastructure
- [ ] Create `src/components/sidebar/hooks/useSidebarTheme.ts` (Extracts MutationObserver and style constants).
- [ ] Create `src/components/sidebar/components/ParameterZone.tsx` (Extracts wrapper UI).
- [ ] Create `src/components/sidebar/hooks/useParameterGradients.ts` (Extracts complex gradient logic for SamplingSection).

### Step 2: Extraction
- [ ] Extract `SystemPromptSection` (receives `isOpen`, `onToggle` props).
- [ ] Extract `StopWordsSection` (receives `isOpen`, `onToggle` props).
- [ ] Extract `SamplingSection` (receives `isOpen`, `onToggle` props).
- [ ] Extract `OutputSection` (receives `isOpen`, `onToggle` props).

### Step 3: Integration & Cleanup
- [ ] Refactor `RightSidebar.tsx` to use extracted components.
- [ ] Verify all store connections (`useModelParams`) are intact.
- [ ] Ensure `AnimatePresence` and `motion` transitions remain smooth.

## Verification Plan

### Automated Tests
- [ ] Run `npm run lint` to ensure no broken imports or types.

### Manual Verification
- [ ] **State**: Toggle sections and ensure state is maintained locally.
- [ ] **Theme Switch**: Change app theme (Susie vs Dark vs Light) and verify:
    - Text/Border colors update immediately.
    - `SamplingSection` gradients reflect the correct theme colors.
- **Interactions**:
    - Verify System Prompt auto-resizes.
    - Verify Stop Words can be added/removed.
    - Verify Max Tokens syncs with the store.
