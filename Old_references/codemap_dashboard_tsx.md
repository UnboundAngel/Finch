# Forensic Codemap: Old_references/Dashboard.tsx

This document maps every item from the original `Dashboard.tsx` (36KB) to the new modularized codebase.

## Frontend Items: Dashboard.tsx (Original)

### 1. State & Logic
| Item | Category | New Location | Notes |
| :--- | :--- | :--- | :--- |
| `input` | **Identified** | [Dashboard.tsx](file:///home/unboundangel/Projects/github-finch/Finch/src/components/dashboard/Dashboard.tsx#L39) | Local state preserved. |
| `messages` | **Identified** | [Dashboard.tsx](file:///home/unboundangel/Projects/github-finch/Finch/src/components/dashboard/Dashboard.tsx#L137) | Managed via `useChatSession` hook. |
| `isDark` | **Identified** | [Dashboard.tsx](file:///home/unboundangel/Projects/github-finch/Finch/src/components/dashboard/Dashboard.tsx#L27) | Consumed from `useChatStore`. |
| `setIsDark` | **Missing** | N/A | [CRITICAL] `useChatStore` does not define this setter. Causes crash in Header and Settings. |
| `isLeftSidebarOpen` | **Identified** | [Dashboard.tsx](file:///home/unboundangel/Projects/github-finch/Finch/src/components/dashboard/Dashboard.tsx#L34) | Consumed from `useChatStore`. |
| `setIsLeftSidebarOpen` | **Missing** | N/A | [CRITICAL] `useChatStore` does not define this setter. Causes crash in Header. |
| `selectedProvider` | **Identified** | `useChatStore` | Moved to global store. |
| `selectedModel` | **Identified** | `useChatStore` | Moved to global store. |
| `isIncognito` | **Identified** | `useChatStore` | Moved to global store. |
| `isThinking` | **Identified** | [Dashboard.tsx](file:///home/unboundangel/Projects/github-finch/Finch/src/components/dashboard/Dashboard.tsx#L40) | Local state preserved. |
| `researchEvents` | **Identified** | [Dashboard.tsx](file:///home/unboundangel/Projects/github-finch/Finch/src/components/dashboard/Dashboard.tsx#L42) | Local state preserved. |
| `customBgLight` | **Identified** | [Dashboard.tsx](file:///home/unboundangel/Projects/github-finch/Finch/src/components/dashboard/Dashboard.tsx#L219) | Parent state preserved. |
| `customBgDark` | **Identified** | [Dashboard.tsx](file:///home/unboundangel/Projects/github-finch/Finch/src/components/dashboard/Dashboard.tsx#L220) | Parent state preserved. |
| `headerContrast` | **Identified** | `useDynamicBackground` | Extracted to custom hook. |
| `sidebarContrast` | **Identified** | `useDynamicBackground` | Extracted to custom hook. |
| `rightSidebarContrast` | **Identified** | `useDynamicBackground` | Extracted to custom hook. |
| `analyzeBackground` | **Identified** | `useDynamicBackground` | Extracted to custom hook. |
| `isModelLoaded` | **Identified** | `useChatStore` | |
| `voiceStatus` | **Identified** | `useChatStore` | |

### 2. Event Handlers & Functions
| Item | Category | New Location | Notes |
| :--- | :--- | :--- | :--- |
| `handleSend` | **Identified** | [Dashboard.tsx](file:///home/unboundangel/Projects/github-finch/Finch/src/components/dashboard/Dashboard.tsx#L127) | Mostly preserved but logic slightly modified for `openOverflowModal`. |
| `handleDeleteChat` | **Identified** | `DashboardMain.tsx` | Prop-drilled from `useChatSession`? Let me check. Actually it seems to be in `useChatSession` hook? (Wait, I need to check `useChatSession.ts`). |
| `handleRenameCommit` | **Identified** | [useChatSession.ts](file:///home/unboundangel/Projects/github-finch/Finch/src/hooks/useChatSession.ts) | Moved to custom hook. |
| `handleRenameKeyDown` | **Identified** | `DashboardMain.tsx` | Prop-drilled to sidebar. |
| `handleThemeChange` | **Identified** | [Dashboard.tsx](file:///home/unboundangel/Projects/github-finch/Finch/src/components/dashboard/Dashboard.tsx#L225) | Preserved in the wrapper component. |
| `handleChangeBackground` | **Identified** | [Dashboard.tsx](file:///home/unboundangel/Projects/github-finch/Finch/src/components/dashboard/Dashboard.tsx#L84) | Preserved. |
| `updateActiveSessionInList` | **Identified** | [Dashboard.tsx](file:///home/unboundangel/Projects/github-finch/Finch/src/components/dashboard/Dashboard.tsx#L96) | Preserved. |
| `toggleIncognito` | **Identified** | [Dashboard.tsx](file:///home/unboundangel/Projects/github-finch/Finch/src/components/dashboard/Dashboard.tsx#L180) | Linked to store. |

### 3. Sub-components & Integration
| Item | Category | New Location | Notes |
| :--- | :--- | :--- | :--- |
| `SidebarIncognitoController` | **Identified** | [DashboardMain.tsx](file:///home/unboundangel/Projects/github-finch/Finch/src/components/dashboard/DashboardMain.tsx#L73) | |
| `RightSidebarToggle` | **Identified** | [DashboardHeader.tsx](file:///home/unboundangel/Projects/github-finch/Finch/src/components/dashboard/DashboardHeader.tsx#L27) | |
| `RightSidebarContainer` | **Identified** | [DashboardMain.tsx](file:///home/unboundangel/Projects/github-finch/Finch/src/components/dashboard/DashboardMain.tsx#L81) | |

### 4. Critical Dependencies (Tauri Store)
| Item | Category | Status | Notes |
| :--- | :--- | :--- | :--- |
| `handle.get_store` | **Missing** | Broken | "Store not found" error persists. Likely due to async race condition or incorrect store name in frontend hooks. |

---
**Summary for Dashboard.tsx**:
- Identified: 23
- Orphaned: 0
- Missing: 3 (setIsDark, setIsLeftSidebarOpen, handle.get_store)
- Unverified: 0
