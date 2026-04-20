import React, { useState, useEffect } from 'react';
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

  return (
    <div className="flex flex-1 overflow-hidden relative">
      <SidebarProvider open={isLeftSidebarOpen} onOpenChange={setIsLeftSidebarOpen} className="h-full min-h-0">
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
              ? "bg-gradient-to-b from-pink-100/80 to-rose-100/80 backdrop-blur-2xl border-r border-pink-200/50"
              : !isIncognito && (isDark ? customBgDark : customBgLight)
                ? "bg-background/20 backdrop-blur-2xl border-r border-white/10 dark:border-white/5"
                : isIncognito 
                  ? (isDark ? "bg-[#111] border-r border-[#222]" : "bg-[#fefaf0] border-r border-[#e5e5e5]")
                  : ""
          }
          contrast={sidebarContrast}
          isPinkMode={showPinkMode}
        />

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
    </div>
  );
}
