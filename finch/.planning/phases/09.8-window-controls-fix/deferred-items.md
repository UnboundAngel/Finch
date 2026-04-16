# Deferred Items - Phase 09.8

The following pre-existing TypeScript errors were found during verification of Plan 01. They are out of scope for this plan as they are in files not targeted for modification and relate to pre-existing issues with `framer-motion` types and `TooltipTrigger` usage in other components.

## TypeScript Errors

### components/ui/bookmark-icon-button.tsx
- **Line 74, 102**: `ease` string in `framer-motion` transition is not assignable to `Easing | Easing[]`.

### src/components/chat/MetadataRow.tsx
- **Line 113, 128**: `TooltipTrigger` does not support `asChild`. Needs to be updated to use `render` prop (similar to the fix applied in `WindowControls.tsx`).

### src/components/dashboard/SettingsDialog.tsx
- **Line 330**: `Variants` transition `ease` type mismatch.

## Recommendation
A follow-up task should be created to update all `TooltipTrigger` usages to use the `render` prop and fix the `framer-motion` type mismatches.
