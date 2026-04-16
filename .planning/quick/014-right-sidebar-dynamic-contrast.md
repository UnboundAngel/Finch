---
task: "Implement dynamic contrast for RightSidebar"
date: 2026-04-12
status: completed
---

# Quick Task: Implement dynamic contrast for RightSidebar

## Problem
The RightSidebar text and controls were potentially unreadable against custom backgrounds.

## Plan
1. Update `src/lib/luminance.ts` to add a `'right-edge'` sample point. (Done)
2. Update `src/components/dashboard/Dashboard.tsx` to calculate `rightSidebarContrast` and pass it to `RightSidebar`. (Done)
3. Update `src/components/sidebar/RightSidebar.tsx` to use the `contrast` prop for dynamic styling of text, borders, inputs, and icons. (Done)

## Verification
- Background luminance is sampled at the right edge.
- RightSidebar elements (text, labels, tooltips, inputs, sliders, tags) now dynamically switch between light/dark themes based on background luminance.
- Visual consistency with left sidebar and header contrast logic maintained.
