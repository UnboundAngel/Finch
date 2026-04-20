# ⚛️ Migration Map: React Frontend Refactor

> [!info] Objective
> Decompose `src/components/dashboard/Dashboard.tsx` (977 lines) into specialized hooks, a modal provider, and modular layout components.

## 1. Behavior Extraction (Hooks)

### `useModelPolling.ts`
- **Logic:** The `useEffect` block managing the 30s status interval for local models.
- **State Dependency:** `selectedProvider`, `selectedModel` (Zustand).

### `useDynamicBackground.ts`
- **Logic:** `analyzeBackground` callback and the background analysis `useEffect`.
- **Side Effect:** Direct DOM manipulation for `--selection-bg` and `--selection-text`.
- **Return:** `{ headerContrast, sidebarContrast, rightSidebarContrast }`.

### `useChatSession.ts`
- **Logic:** Handlers for session lifecycle: `handleSwitchSession`, `handleNewChat`, `handleDeleteChat`, `handlePinChat`, `handleRenameCommit`.
- **Ref Management:** Move `activeSessionIdRef` here to maintain consistency during streaming.

## 2. UI Decomposition

### `ModalProvider.tsx`
- **Logic:** Move `isProfileOpen`, `isSettingsOpen`, and `isOverflowModalOpen` state.
- **Components:** Wrap `<ProfileDialog>`, `<SettingsDialog>`, and `<ContextOverflowModal>`.
- **Context API:** Provide `openProfile()`, `openSettings()`, `openOverflowLimit(onConfirm: () => void)`.

### `DashboardHeader.tsx`
- **Logic:** Move `<header>` (Lines ~530-605).
- **Props:** Contrast states, theme toggle handlers, and sidebar controls.

### `DashboardMain.tsx`
- **Logic:** Move the `<main>` area, `BackgroundPlus`, and `ContextMenu`.
- **Props:** `messages`, `handleSend`, `isThinking`, `isWebSearchActive`.

## 3. New `Dashboard.tsx` (Orchestrator)
```tsx
export function Dashboard() {
  const { headerContrast, ... } = useDynamicBackground();
  const { messages, handleSend, ... } = useChatSession();
  
  return (
    <ModalProvider>
      <div className="layout-root">
        <DashboardHeader contrast={headerContrast} />
        <SidebarProvider>
          <ChatSidebar />
          <DashboardMain messages={messages} onSend={handleSend} />
        </SidebarProvider>
        <RightSidebarContainer />
      </div>
    </ModalProvider>
  );
}
```
