import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { BackgroundPlus } from '@/components/ui/background-plus';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { ChatSidebar } from '@/src/components/sidebar/ChatSidebar';
import { ChatArea } from '@/src/components/chat/ChatArea';
import { ChatInput } from '@/src/components/chat/ChatInput';
import { RightSidebar } from '@/src/components/sidebar/RightSidebar';
import { ArtifactPanel } from '@/src/components/chat/ArtifactPanel';
import { useChatStore } from '@/src/store';
import { StudioWorkspace } from '@/src/components/studio/StudioWorkspace';
import type { Artifact } from '@/src/types/chat';

interface DashboardMainProps {
  recentChats: any[];
  activeSessionId: string;
  handleSwitchSession: (id: string) => void;
  setActiveSessionId: (id: string | null) => void;
  setMessages: (messages: any[]) => void;
  setRecentChats: (chats: any[]) => void;
  handleNewChat: () => void;
  profileName: string;
  setProfileName: (val: string) => void;
  profileEmail: string;
  setProfileEmail: (val: string) => void;
  isIncognito: boolean;
  setIsIncognito: (val: boolean) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  editingSessionId: string | null;
  setEditingSessionId: (val: string | null) => void;
  editingTitle: string;
  setEditingTitle: (val: string) => void;
  handleRenameKeyDown: (e: React.KeyboardEvent, id: string) => void;
  handleRenameCommit: (id: string) => void;
  handlePinChat: (id: string, e: React.MouseEvent) => void;
  handleDeleteChat: (id: string, e: React.MouseEvent) => void;
  setIsProfileOpen: (val: boolean) => void;
  setIsSettingsOpen: (val: boolean) => void;
  userAvatarSrc: string;
  userAvatarLetter: string;
  showPinkMode: boolean;
  isDark: boolean;
  customBgDark: string;
  customBgLight: string;
  sidebarContrast: 'light' | 'dark';
  rightSidebarContrast: 'light' | 'dark';
  messages: any[];
  isThinking: boolean;
  researchEvents: any[];
  selectedModel: string;
  stableSetInput: (val: string | ((prev: string) => string)) => void;
  hasCustomBgValue: boolean;
  voiceStatus: any;
  input: string;
  handleInputChange: (val: string) => void;
  handleSend: () => void;
  abort: () => void;
  isStreaming: boolean;
  attachedFile: { name: string; path: string } | null;
  setAttachedFile: (val: { name: string; path: string } | null) => void;
  isWebSearchActive: boolean;
  setIsWebSearchActive: (val: boolean) => void;
  isArtifactToolActive: boolean;
  setIsArtifactToolActive: (val: boolean) => void;
  enterToSend: boolean;
  isModelLoaded: boolean;
  handleInputFocus: () => void;
  isListening: boolean;
  setIsListening: (val: boolean) => void;
  handleChangeBackground: () => void;
  setCustomBgDark: (val: string) => void;
  setCustomBgLight: (val: string) => void;
  onRegenerate: (messageId?: string) => void;
  onEditResend: (messageId: string, newContent: string) => void;
  activeArtifact: Artifact | null;
  onArtifactClick: (artifact: Artifact) => void;
  onArtifactClose: () => void;
  allVersionsOfActive: Artifact[];
}


const RightSidebarContainer = ({ showPinkMode, customBgDark, customBgLight, isDark, isIncognito, rightSidebarContrast }: any) => {
  const isRightSidebarOpen = useChatStore(state => state.isRightSidebarOpen);
  const [isFullyOpen, setIsFullyOpen] = useState(false);
  const RIGHT_SIDEBAR_WIDTH = 220;

  useEffect(() => {
    if (!isRightSidebarOpen) setIsFullyOpen(false);
  }, [isRightSidebarOpen]);

  const panelClass = showPinkMode
    ? "bg-[#fff5f7]/85 backdrop-blur-2xl"
    : isIncognito
      ? (isDark ? "bg-[#111]/85 backdrop-blur-xl" : "bg-[#fefaf0]/85 backdrop-blur-xl")
      : !isIncognito && (isDark ? customBgDark : customBgLight)
        ? "bg-background/20 backdrop-blur-2xl"
        : isDark
          ? "bg-[#171717] backdrop-blur-xl"
          : "bg-[#efefef]/85 backdrop-blur-xl";

  return (
    <div className="absolute inset-y-0 right-0 z-40 overflow-visible pointer-events-none">
      <div
        className={`absolute top-3 bottom-20 right-0 pr-3 transition-[transform,opacity] duration-300 ease-in-out ${
          isRightSidebarOpen
            ? 'translate-x-0 opacity-100 pointer-events-auto'
            : 'translate-x-[calc(100%+1.5rem)] opacity-0 pointer-events-none'
        }`}
        style={{ width: RIGHT_SIDEBAR_WIDTH }}
        onTransitionEnd={(event) => {
          if (event.propertyName === 'transform' && isRightSidebarOpen) {
            setIsFullyOpen(true);
          }
        }}
      >
        <div className={`h-full rounded-xl overflow-hidden shadow-xl border border-black/15 dark:border-black/35 ${panelClass}`}>
          <RightSidebar
            isOpen={isRightSidebarOpen}
            readyToFetch={isFullyOpen}
            isPinkMode={showPinkMode}
            contrast={rightSidebarContrast}
          />
        </div>
      </div>
    </div>
  );
};

export function DashboardMain(props: DashboardMainProps) {
  const activeWorkspace = useChatStore(state => state.activeWorkspace);
  const isLeftSidebarOpen = useChatStore(state => state.isLeftSidebarOpen);
  const setIsLeftSidebarOpen = useChatStore(state => state.setIsLeftSidebarOpen);
  const setIsRightSidebarOpen = useChatStore(state => state.setIsRightSidebarOpen);
  const MIN_LEFT_SIDEBAR_WIDTH = 200;
  const MAX_LEFT_SIDEBAR_WIDTH = 420;
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(220);
  const [isResizingLeftSidebar, setIsResizingLeftSidebar] = useState(false);
  const resizeRef = useRef({ isDragging: false, moved: false, startX: 0, startWidth: 220 });
  const resizeRafRef = useRef<number | null>(null);
  const pendingWidthRef = useRef<number | null>(null);
  const sidebarProviderRef = useRef<HTMLDivElement | null>(null);
  const railTooltipRef = useRef<HTMLDivElement | null>(null);
  const {
    recentChats, activeSessionId, handleSwitchSession,
    setActiveSessionId, setMessages, setRecentChats, handleNewChat, profileName, setProfileName,
    profileEmail, setProfileEmail, isIncognito, setIsIncognito, searchQuery, setSearchQuery,
    editingSessionId, setEditingSessionId, editingTitle, setEditingTitle, handleRenameKeyDown,
    handleRenameCommit, handlePinChat, handleDeleteChat, setIsProfileOpen, setIsSettingsOpen,
    showPinkMode, isDark, customBgDark, customBgLight, sidebarContrast, rightSidebarContrast,
    messages, isThinking, researchEvents, selectedModel, stableSetInput, hasCustomBgValue,
    voiceStatus, input, handleSend, abort, isStreaming, attachedFile,
    setAttachedFile, isWebSearchActive, setIsWebSearchActive, isArtifactToolActive, setIsArtifactToolActive, enterToSend, isModelLoaded,
    handleInputFocus, isListening, setIsListening, handleChangeBackground, setCustomBgDark, setCustomBgLight,
    userAvatarSrc, userAvatarLetter, onRegenerate, onEditResend,
    activeArtifact, onArtifactClick, onArtifactClose,
    allVersionsOfActive,
  } = props;

  useEffect(() => {
    const flushPendingWidth = () => {
      resizeRafRef.current = null;
      const w = pendingWidthRef.current;
      if (w != null) setLeftSidebarWidth(w);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!resizeRef.current.isDragging) return;
      const delta = event.clientX - resizeRef.current.startX;
      if (Math.abs(delta) > 3) resizeRef.current.moved = true;
      const next = Math.min(
        MAX_LEFT_SIDEBAR_WIDTH,
        Math.max(MIN_LEFT_SIDEBAR_WIDTH, resizeRef.current.startWidth + delta)
      );
      pendingWidthRef.current = next;
      sidebarProviderRef.current?.style.setProperty('--sidebar-width', `${next}px`);
      if (resizeRafRef.current == null) {
        resizeRafRef.current = requestAnimationFrame(flushPendingWidth);
      }
    };

    const handleMouseUp = () => {
      if (!resizeRef.current.isDragging) return;
      resizeRef.current.isDragging = false;
      if (resizeRafRef.current != null) {
        cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
      const w = pendingWidthRef.current;
      if (w != null) setLeftSidebarWidth(w);
      pendingWidthRef.current = null;
      // Restore transitions after drag
      sidebarProviderRef.current?.querySelectorAll<HTMLElement>(
        '[data-slot="sidebar-gap"],[data-slot="sidebar-container"]'
      ).forEach(el => { el.style.transition = ''; });
      setIsResizingLeftSidebar(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      if (resizeRafRef.current != null) cancelAnimationFrame(resizeRafRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const getSidebarTransitionEls = () =>
    Array.from(
      sidebarProviderRef.current?.querySelectorAll<HTMLElement>(
        '[data-slot="sidebar-gap"],[data-slot="sidebar-container"]'
      ) ?? []
    );

  const startResize = (event: React.MouseEvent) => {
    if (!isLeftSidebarOpen) return;
    event.preventDefault();
    resizeRef.current = {
      isDragging: true,
      moved: false,
      startX: event.clientX,
      startWidth: leftSidebarWidth,
    };
    setIsResizingLeftSidebar(true);
    sidebarProviderRef.current?.style.setProperty('--sidebar-width', `${leftSidebarWidth}px`);
    // Kill CSS transitions so sidebar tracks cursor immediately with zero lag
    getSidebarTransitionEls().forEach(el => { el.style.transition = 'none'; });
    // Hide cursor-following tooltip for the duration of the drag
    if (railTooltipRef.current) railTooltipRef.current.style.opacity = '0';
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleRailClick = () => {
    if (resizeRef.current.moved) return;
    setIsLeftSidebarOpen(false);
  };

  // Close both sidebars when entering incognito or switching to studio.
  useEffect(() => {
    if (isIncognito || activeWorkspace === 'studio') {
      setIsLeftSidebarOpen(false);
      setIsRightSidebarOpen(false);
    }
  }, [isIncognito, activeWorkspace, setIsLeftSidebarOpen, setIsRightSidebarOpen]);

  const leftSidebarPanelClass = showPinkMode
    ? "bg-[#fff5f7]/85 backdrop-blur-2xl"
    : !isIncognito && (isDark ? customBgDark : customBgLight)
      ? "bg-background/20 backdrop-blur-2xl"
      : isIncognito
        ? (isDark ? "bg-[#111]/85 backdrop-blur-xl" : "bg-[#fefaf0]/85 backdrop-blur-xl")
        : isDark
          ? "bg-[#171717] backdrop-blur-xl"
          : "bg-[#efefef]/85 backdrop-blur-xl";

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* Full-width chat area — transparent so the root background shows everywhere */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden relative">
        <main
          className={`flex-1 flex flex-col min-w-0 min-h-0 relative overflow-hidden text-foreground ${
            isIncognito
              ? (isDark
                ? "bg-[#0a0a0a] border-[4px] border-[#222] text-[#e5e5e5] m-4 rounded-[24px]"
                : "bg-[#fcfaf2] border-[4px] border-black text-[#333] m-4 rounded-[24px]")
              : "bg-transparent"
          }`}
        >
          <ContextMenu>
            <ContextMenuTrigger className="flex-1 flex flex-col min-w-0 min-h-0 relative">
              {!isIncognito && activeWorkspace !== 'studio' && (
                <div className="absolute inset-0 pointer-events-none z-[1]">
                  <div className={`absolute inset-0 transition-opacity duration-500 ${(isDark ? customBgDark : customBgLight) ? 'opacity-20 bg-black' : 'opacity-0'}`} />
                </div>
              )}

              <BackgroundPlus
                plusColor={showPinkMode ? "#10b981" : (isDark ? "#fb3a5d" : "#6366f1")}
                className={`absolute inset-0 z-0 ${showPinkMode ? "opacity-[0.2]" : "opacity-[0.12] dark:opacity-[0.15]"}`}
                fade={true}
                plusSize={40}
              />

              {activeWorkspace === 'studio' ? (
                <div className="flex-1 w-full h-full relative flex flex-col">
                  <StudioWorkspace 
                    messages={messages}
                    setMessages={setMessages}
                    onSend={handleSend}
                    isStreaming={isStreaming}
                  />
                  {/* Floating Chat Input over the canvas */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl z-20 px-4">
                    <ChatInput
                      input={input}
                      setInput={stableSetInput}
                      handleSend={handleSend}
                      onStop={abort}
                      isThinking={isThinking || isStreaming}
                      attachedFile={attachedFile}
                      setAttachedFile={setAttachedFile}
                      isWebSearchActive={isWebSearchActive}
                      setIsWebSearchActive={setIsWebSearchActive}
                      isArtifactToolActive={isArtifactToolActive}
                      setIsArtifactToolActive={setIsArtifactToolActive}
                      enterToSend={enterToSend}
                      isIncognito={isIncognito}
                      isDark={isDark}
                      hasCustomBg={false}
                      isPinkMode={showPinkMode}
                      isModelLoaded={selectedModel ? isModelLoaded : true}
                      onFocus={handleInputFocus}
                      isListening={isListening}
                      setIsListening={setIsListening}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 relative z-10 flex flex-col min-h-0 px-4">
                  <ChatArea
                    messages={messages}
                    isThinking={isThinking}
                    researchEvents={researchEvents}
                    selectedModel={selectedModel}
                    isDark={isDark}
                    setInput={stableSetInput}
                    isIncognito={isIncognito}
                    hasCustomBg={hasCustomBgValue}
                    isPinkMode={showPinkMode}
                    voiceStatus={voiceStatus}
                    userAvatarSrc={userAvatarSrc}
                    userAvatarLetter={userAvatarLetter}
                    onRegenerate={onRegenerate}
                    onEditResend={onEditResend}
                    onArtifactClick={onArtifactClick}
                  />
                  <div className="relative z-20">
                    <ChatInput
                      input={input}
                      setInput={stableSetInput}
                      handleSend={handleSend}
                      onStop={abort}
                      isThinking={isThinking || isStreaming}
                      attachedFile={attachedFile}
                      setAttachedFile={setAttachedFile}
                      isWebSearchActive={isWebSearchActive}
                      setIsWebSearchActive={setIsWebSearchActive}
                      isArtifactToolActive={isArtifactToolActive}
                      setIsArtifactToolActive={setIsArtifactToolActive}
                      enterToSend={enterToSend}
                      isIncognito={isIncognito}
                      isDark={isDark}
                      hasCustomBg={!!(!isIncognito && (isDark ? customBgDark : customBgLight))}
                      isPinkMode={showPinkMode}
                      isModelLoaded={selectedModel ? isModelLoaded : true}
                      onFocus={handleInputFocus}
                      isListening={isListening}
                      setIsListening={setIsListening}
                    />
                  </div>
                </div>
              )}
            </ContextMenuTrigger>

            <ContextMenuContent className="w-56">
              <ContextMenuItem onClick={handleChangeBackground}>
                Change Background
              </ContextMenuItem>
              {(isDark ? customBgDark : customBgLight) && (
                <ContextMenuItem
                  onClick={() => isDark ? setCustomBgDark('') : setCustomBgLight('')}
                  className="text-destructive"
                >
                  Remove Background
                </ContextMenuItem>
              )}
            </ContextMenuContent>
          </ContextMenu>
        </main>
      </div>

      {/* Left sidebar — absolute overlay, no layout push */}
      <div className="absolute inset-0 pointer-events-none z-30">
        <SidebarProvider
          ref={sidebarProviderRef}
          open={isLeftSidebarOpen}
          onOpenChange={setIsLeftSidebarOpen}
          className="h-full min-h-0 bg-transparent"
          style={{ '--sidebar-width': `${leftSidebarWidth}px` } as React.CSSProperties}
        >
          <ChatSidebar
            recentChats={recentChats}
            activeSessionId={activeSessionId}
            handleSwitchSession={handleSwitchSession}
            setActiveSessionId={setActiveSessionId as any}
            setMessages={setMessages}
            setRecentChats={setRecentChats}
            handleNewChat={handleNewChat}
            profileName={profileName}
            setProfileName={setProfileName}
            profileEmail={profileEmail}
            setProfileEmail={setProfileEmail}
            isIncognito={isIncognito}
            setIsIncognito={setIsIncognito}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            editingSessionId={editingSessionId}
            setEditingSessionId={setEditingSessionId}
            editingTitle={editingTitle}
            setEditingTitle={setEditingTitle}
            handleRenameKeyDown={handleRenameKeyDown}
            handleRenameCommit={handleRenameCommit}
            handlePinChat={handlePinChat}
            handleDeleteChat={handleDeleteChat}
            setIsProfileOpen={setIsProfileOpen}
            setIsSettingsOpen={setIsSettingsOpen}
            className={`pointer-events-auto ${leftSidebarPanelClass}`}
            contrast={sidebarContrast}
            isPinkMode={showPinkMode}
            abort={abort}
          />
          {isLeftSidebarOpen && (
            <div
              className="absolute top-0 bottom-0 z-40 w-0 pointer-events-none"
              style={{ left: 'calc(var(--sidebar-width) + 0.75rem)' }}
            >
              <button
                type="button"
                onMouseDown={startResize}
                onClick={handleRailClick}
                onMouseMove={(e) => {
                  if (resizeRef.current.isDragging) return;
                  const t = railTooltipRef.current;
                  if (t) {
                    t.style.left = `${e.clientX + 18}px`;
                    t.style.top = `${e.clientY - 44}px`;
                    t.style.opacity = '1';
                  }
                }}
                onMouseEnter={(e) => {
                  if (resizeRef.current.isDragging) return;
                  const t = railTooltipRef.current;
                  if (t) {
                    t.style.left = `${e.clientX + 18}px`;
                    t.style.top = `${e.clientY - 44}px`;
                    t.style.opacity = '1';
                  }
                }}
                onMouseLeave={() => {
                  const t = railTooltipRef.current;
                  if (t) t.style.opacity = '0';
                }}
                className="pointer-events-auto group/rail absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-4 cursor-col-resize touch-none select-none flex items-center justify-center"
                aria-label="Resize or collapse sidebar"
              >
                <span
                  className="h-10 w-[4px] rounded-full opacity-0 group-hover/rail:opacity-100 transition-opacity duration-150 bg-foreground/30 dark:bg-white/35 group-hover/rail:bg-foreground/50 dark:group-hover/rail:bg-white/60 group-active/rail:bg-foreground/70 dark:group-active/rail:bg-white/80"
                  aria-hidden
                />
              </button>
            </div>
          )}
        </SidebarProvider>
      </div>

      <RightSidebarContainer
        showPinkMode={showPinkMode}
        customBgDark={customBgDark}
        customBgLight={customBgLight}
        isDark={isDark}
        isIncognito={isIncognito}
        rightSidebarContrast={rightSidebarContrast}
      />

      {/* Artifact panel — slides in from the right over the chat area */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        <div className="relative h-full w-full">
          <ArtifactPanel
            artifact={activeArtifact}
            isDark={isDark}
            isStreaming={isStreaming}
            onClose={onArtifactClose}
            allVersions={allVersionsOfActive}
            onSelectVersion={onArtifactClick}
          />
        </div>
      </div>

      {createPortal(
        <div
          ref={railTooltipRef}
          style={{
            position: 'fixed',
            opacity: 0,
            transition: 'opacity 0.12s ease',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
          className="rounded-lg border border-border/50 bg-background/90 backdrop-blur-md px-3 py-2 text-xs font-medium text-foreground shadow-xl"
        >
          <div className="flex items-center gap-2">
            <span>Click to collapse</span>
            <kbd className="rounded border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] font-mono leading-none">Ctrl+B</kbd>
          </div>
          <div className="text-muted-foreground mt-0.5">Drag to resize</div>
        </div>,
        document.body
      )}
    </div>
  );
}
