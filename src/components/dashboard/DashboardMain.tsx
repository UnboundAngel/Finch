import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { SidebarProvider, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { BackgroundPlus } from '@/components/ui/background-plus';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { ChatSidebar } from '@/src/components/sidebar/ChatSidebar';
import { ChatArea } from '@/src/components/chat/ChatArea';
import { ChatInput } from '@/src/components/chat/ChatInput';
import { RightSidebar } from '@/src/components/sidebar/RightSidebar';
import { useChatStore } from '@/src/store';

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
  stableSetInput: (val: string) => void;
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
}

const SidebarIncognitoController = ({ isIncognito, children }: { isIncognito: boolean, children: React.ReactNode }) => {
  const { setOpen } = useSidebar();
  useEffect(() => {
    if (isIncognito) setOpen(false);
  }, [isIncognito, setOpen]);
  return <>{children}</>;
};

const RightSidebarContainer = ({ showPinkMode, customBgDark, customBgLight, isDark, isIncognito, rightSidebarContrast }: any) => {
  const isRightSidebarOpen = useChatStore(state => state.isRightSidebarOpen);
  const [isFullyOpen, setIsFullyOpen] = useState(false);

  useEffect(() => {
    if (!isRightSidebarOpen) setIsFullyOpen(false);
  }, [isRightSidebarOpen]);

  return (
    <motion.div
      initial={false}
      animate={{
        width: isRightSidebarOpen ? 300 : 0,
        opacity: isRightSidebarOpen ? 1 : 0
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      onAnimationComplete={() => {
        if (isRightSidebarOpen) setIsFullyOpen(true);
      }}
      className={`flex-shrink-0 relative z-30 overflow-hidden ${showPinkMode
        ? "bg-gradient-to-b from-fuchsia-50/80 to-pink-50/80 backdrop-blur-2xl border-l border-pink-200/50"
        : isIncognito
          ? (isDark ? "bg-[#111] border-l border-[#222]" : "bg-[#fefaf0] border-l border-[#e5e5e5]")
          : !isIncognito && (isDark ? customBgDark : customBgLight)
            ? "bg-background/20 backdrop-blur-2xl border-l border-white/10 dark:border-white/5"
            : isDark ? "bg-[#161616] border-l border-black/40" : "bg-white border-l"
        }`}
    >
      <RightSidebar
        isOpen={isRightSidebarOpen}
        readyToFetch={isFullyOpen}
        isPinkMode={showPinkMode}
        contrast={rightSidebarContrast}
      />
    </motion.div>
  );
};

export function DashboardMain(props: DashboardMainProps) {
  const isLeftSidebarOpen = useChatStore(state => state.isLeftSidebarOpen);
  const { setIsLeftSidebarOpen } = useChatStore();
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
    setAttachedFile, isWebSearchActive, setIsWebSearchActive, enterToSend, isModelLoaded,
    handleInputFocus, isListening, setIsListening, handleChangeBackground, setCustomBgDark, setCustomBgLight,
    userAvatarSrc, userAvatarLetter, onRegenerate, onEditResend,
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

  return (
    <div className="flex flex-1 overflow-hidden relative">
      <SidebarProvider
        ref={sidebarProviderRef}
        open={isLeftSidebarOpen}
        onOpenChange={setIsLeftSidebarOpen}
        className="h-full min-h-0"
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
          className={
            showPinkMode
              ? "bg-gradient-to-b from-pink-100/75 to-rose-100/75 backdrop-blur-2xl"
              : !isIncognito && (isDark ? customBgDark : customBgLight)
                ? "bg-background/20 backdrop-blur-2xl"
                : isIncognito
                  ? (isDark ? "bg-[#111]/85 backdrop-blur-xl" : "bg-[#fefaf0]/85 backdrop-blur-xl")
                  : isDark
                    ? "bg-[#303030]/90 backdrop-blur-xl"
                    : "bg-[#efefef]/85 backdrop-blur-xl"
          }
          contrast={sidebarContrast}
          isPinkMode={showPinkMode}
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

        <SidebarInset className={`flex flex-col min-w-0 min-h-0 relative bg-transparent border-none`}>
          <SidebarIncognitoController isIncognito={isIncognito}>
            <main
              className={`flex-1 flex flex-col min-w-0 min-h-0 relative transition-all duration-300 ease-in-out overflow-hidden ${isIncognito
                ? (isDark
                  ? "bg-[#0a0a0a] border-[4px] border-[#222] text-[#e5e5e5] m-4 rounded-[24px]"
                  : "bg-[#fcfaf2] border-[4px] border-black text-[#333] m-4 rounded-[24px]")
                : showPinkMode
                  ? "bg-gradient-to-br from-rose-50/90 to-pink-50/90 shadow-none"
                  : (!isIncognito && (isDark ? customBgDark : customBgLight) ? "bg-transparent shadow-none" : "bg-background")
                } text-foreground`}
            >
                  <ContextMenu>
                <ContextMenuTrigger className="flex-1 flex flex-col min-w-0 min-h-0 relative">
                  {!isIncognito && (
                    <div className="absolute inset-0 pointer-events-none z-[1]">
                      {/* Atmospheric Overlays */}
                      <div className={`absolute inset-0 transition-opacity duration-500 ${(isDark ? customBgDark : customBgLight) ? 'opacity-20 bg-black' : 'opacity-0'}`} />
                    </div>
                  )}

                  <BackgroundPlus
                    plusColor={showPinkMode ? "#10b981" : (isDark ? "#fb3a5d" : "#6366f1")}
                    className={`absolute inset-0 z-0 ${showPinkMode ? "opacity-[0.2]" : "opacity-[0.12] dark:opacity-[0.15]"}`}
                    fade={true}
                    plusSize={40}
                  />

                  <div className="flex-1 relative z-10 flex flex-col min-h-0">
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
          </SidebarIncognitoController>
        </SidebarInset>
      </SidebarProvider>
      <RightSidebarContainer
        showPinkMode={showPinkMode}
        customBgDark={customBgDark}
        customBgLight={customBgLight}
        isDark={isDark}
        isIncognito={isIncognito}
        rightSidebarContrast={rightSidebarContrast}
      />
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
