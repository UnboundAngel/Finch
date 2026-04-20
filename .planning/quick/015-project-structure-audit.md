# Quick Task: Project Structure Audit (015)

**Date**: 2026-04-16
**Status**: Completed

## Goal
Identify and report every file or directory that looks out of place, redundant, or inconsistent with the active project structure rooted at `src/`.

## Audit Findings

### 1. Inconsistent Source Structure
The project exhibits a "split personality" between the root directory and `src/`.
- **Redundant Root Directories**: `components/`, `hooks/`, and `lib/` exist at the root level, mirroring directories inside `src/`.
- **Shadcn/UI Placement**: Nearly all UI components (e.g., `button.tsx`, `dialog.tsx`) are located in `ROOT/components/ui/`. However, `src/components/ui/` also exists but only contains `Icons.tsx`.
- **Hooks Fragmentation**: `ROOT/hooks/use-mobile.ts` is isolated from the rest of the hooks in `src/hooks/`.
- **Library Fragmentation**: `ROOT/lib/utils.ts` is isolated from the utilities in `src/lib/`.
- **Suspicious Path Mapping**: `tsconfig.json` uses `"@/*": ["./*"]` to support this root-level structure, which deviates from the standard `"@/*": ["src/*"]`.

### 2. Legacy & Audit Artifacts
Several directories and files appear to be leftovers from previous tasks or snapshots.
- **`audit/`**: Contains snapshots like `original/Dashboard.tsx` and `lib.rs`.
- **`Old_references/`**: Another set of legacy files (`Dashboard.tsx`, `lib.rs`).
- **`audit_results.txt`, `cleanup_errors.txt`, `full_lint.txt`, `knip_report.json`**: Generated maintenance reports scattered in the root.
- **`profile_screen.zip`**: A compressed backup or asset in the root.

### 3. Documentation & State Fragmentation
- **Scattered UAT Logs**: Resolved — UAT logs live under `docs/qa/`.
- **Duplicate/Legacy Docs**: Resolved — `codebase.md` and `Finch - Todo.md` live under `docs/architecture/` and `docs/product/` respectively (see `docs/README.md`).

### 4. Configuration Anomalies
- **`package.json`**: Includes `express` and `dotenv`, which are typical for Node.js backends but suspicious in a Tauri-focused project unless specifically required for a sidecar.

## Recommendations
- Consolidate all source code (`components`, `hooks`, `lib`) into `src/`.
- Move legacy artifacts (`audit/`, `Old_references/`) to a `maintenance/archive/` or similar directory.
- Relocate all `.md` logs and scattered reports to `docs/` or a `reports/` folder.
- Clean up unused dependencies in `package.json`.
