import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Message, ChatSession } from '../../types/chat';
import { useChatPersistence } from '@/src/hooks/useChatPersistence';
import { useAIStreaming } from '@/src/hooks/useAIStreaming';
import { useKeyboardShortcuts } from '@/src/hooks/useKeyboardShortcuts';
import { invoke } from '@tauri-apps/api/core';
import { useModelParams, useChatStore } from '@/src/store';
import { useInactivityEject } from '@/src/hooks/useInactivityEject';
import { useModelPolling } from '@/src/hooks/useModelPolling';
import { useDynamicBackground } from '@/src/hooks/useDynamicBackground';
import { useChatSession } from '@/src/hooks/useChatSession';
import { ModalProvider, useModals } from '@/src/providers/ModalProvider';
import { DashboardHeader } from './DashboardHeader';
import { DashboardMain } from './DashboardMain';

export function DashboardContent() {
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const isDark = useChatStore(state => state.isDark);
  const setIsDark = useChatStore(state => state.setIsDark);
  const selectedProvider = useChatStore(state => state.selectedProvider);
  const setSelectedProvider = useChatStore(state => state.setSelectedProvider);
  const selectedModel = useChatStore(state => state.selectedModel);
  const setSelectedModel = useChatStore(state => state.setSelectedModel);
  const isIncognito = useChatStore(state => state.isIncognito);
  const setIsIncognito = useChatStore(state => state.setIsIncognito);
  const isLeftSidebarOpen = useChatStore(state => state.isLeftSidebarOpen);
  const setIsLeftSidebarOpen = useChatStore(state => state.setIsLeftSidebarOpen);
  const isModelLoaded = useChatStore(state => state.isModelLoaded);
  const voiceStatus = useChatStore(state => state.voiceStatus);

  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isWebSearchActive, setIsWebSearchActive] = useState(false);
  const [researchEvents, setResearchEvents] = useState<any[]>([]);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [enterToSend, setEnterToSend] = useState(true);
  const [profileName, setProfileName] = useState('Jane Doe');
  const [profileEmail, setProfileEmail] = useState('jane.doe@example.com');
  const [searchQuery, setSearchQuery] = useState('');
  const [customBgLight, setCustomBgLight] = useState('');
  const [customBgDark, setCustomBgDark] = useState('');
  const [isListening, setIsListening] = useState(false);

  const { openOverflowModal, setIsProfileOpen, setIsSettingsOpen } = useModals();
  const { streamMessage, abort, isStreaming } = useAIStreaming();

  const showPinkMode = !isDark && !customBgLight && !isIncognito;

  const { handleInputChange, handleInputFocus } = useModelPolling(selectedModel, selectedProvider);
  const { headerContrast, sidebarContrast, rightSidebarContrast, analyzeBackground } = useDynamicBackground({
    isDark, customBgLight, customBgDark, isIncognito, showPinkMode
  });

  const session = useChatSession({
    recentChats, setRecentChats, isIncognito, setIsIncognito,
    selectedModel, setSelectedModel, selectedProvider, setSelectedProvider
  });

  const stableSetInput = useCallback((val: string) => setInput(val), []);

  const handleEject = useCallback(() => {
    setSelectedModel('');
    setSelectedProvider('');
    toast.info("Local model unloaded due to inactivity");
  }, [setSelectedModel, setSelectedProvider]);

  useInactivityEject({ provider: selectedProvider, modelId: selectedModel, onEject: handleEject });

  useChatPersistence({
    recentChats, setRecentChats, profileName, setProfileName, profileEmail, setProfileEmail,
    enterToSend, setEnterToSend, selectedModel, setSelectedModel, selectedProvider,
    setSelectedProvider, customBgLight, setCustomBgLight, customBgDark, setCustomBgDark
  });

  useKeyboardShortcuts({
    onNewChat: session.handleNewChat,
    onOpenSettings: () => (window as any).setIsSettingsOpen(true), // Fallback for provider
    onSearchFocus: () => document.getElementById('sidebar-search-input')?.focus()
  });

  const handleThemeChange = (checked: boolean) => {
    setIsDark(checked);
    if (checked) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    analyzeBackground();
  };

  const handleChangeBackground = async () => {
    try {
      const mode = isDark ? 'dark' : 'light';
      const path = await invoke<string>('set_background_image', { mode });
      if (mode === 'light') setCustomBgLight(path);
      else setCustomBgDark(path);
      toast.success('Background updated');
    } catch (err) {
      if (err !== 'No file selected') toast.error('Failed to set background');
    }
  };

  const updateActiveSessionInList = async (updatedMessages: Message[]) => {
    if (isIncognito) return;
    const currentSessionId = session.activeSessionIdRef.current;
    const existing = recentChats.find(c => c.id === currentSessionId);
    const sessionToSave: ChatSession = {
      id: currentSessionId || '',
      title: existing?.title || updatedMessages[0].content.substring(0, 40),
      messages: updatedMessages,
      timestamp: Date.now(),
      created_at: existing?.created_at || Date.now(),
      updated_at: Date.now(),
      model: selectedModel,
      provider: selectedProvider,
      pinned: existing?.pinned || false,
      incognito: false,
      systemPrompt: existing?.systemPrompt || '',
      generationParams: existing?.generationParams || { temperature: 0.7, maxTokens: 2048, topP: 1.0 },
      stats: { totalTokens: 0, totalMessages: updatedMessages.length, averageSpeed: 0 }
    };

    try {
      const savedId = await invoke<string>('save_chat', { chat: sessionToSave });
      if (!currentSessionId) {
        session.setActiveSessionId(savedId);
        session.activeSessionIdRef.current = savedId;
        sessionToSave.id = savedId;
      }
      setRecentChats(prev => [sessionToSave, ...prev.filter(c => c.id !== savedId)].sort((a, b) => (a.pinned === b.pinned ? b.timestamp - a.timestamp : a.pinned ? -1 : 1)));
    } catch (err) { console.error('Failed to save chat:', err); }
  };

  const handleSend = async (bypassCheck = false) => {
    if (!input.trim() || isThinking || isStreaming) return;
    const { systemPrompt, temperature, topP, maxTokens, stopStrings, contextIntelligence: ci } = useModelParams.getState();
    if (!bypassCheck && maxTokens > (ci?.hardware_safe_limit || 8192)) {
      openOverflowModal(ci?.hardware_safe_limit || 8192, maxTokens, () => handleSend(true));
      return;
    }
    const userMessage = input.trim();
    setInput('');
    setResearchEvents([]);
    const updatedMessages: Message[] = [...session.messages, { role: 'user', content: userMessage }];
    session.setMessages(updatedMessages);
    await updateActiveSessionInList(updatedMessages);
    setIsThinking(true);

    let isFirstToken = true;
    streamMessage(userMessage, selectedModel, selectedProvider, (token) => {
      if (isFirstToken) {
        setIsThinking(false);
        isFirstToken = false;
        session.setMessages(prev => [...prev, { role: 'ai', content: token, streaming: true, metadata: { timestamp: new Date(), model: selectedModel } }]);
      } else {
        session.setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'ai') return [...prev.slice(0, -1), { ...last, content: last.content + token }];
          return prev;
        });
      }
    }, (ev) => setResearchEvents(prev => [...prev, ev]), (stats) => {
      session.setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'ai') {
          const final = [...prev.slice(0, -1), { ...last, streaming: false, metadata: { ...last.metadata, ...(stats || {}) } }];
          setTimeout(() => updateActiveSessionInList(final), 0);
          return final;
        }
        return prev;
      });
      setIsThinking(false);
    }, (err) => { setIsThinking(false); toast.error(`Error: ${err}`); },
    { systemPrompt, temperature, topP, maxTokens, stopStrings, enableWebSearch: isWebSearchActive }, updatedMessages);
  };

  return (
    <ModalProvider 
      profileProps={{
        profileName, setProfileName, profileEmail, setProfileEmail
      }} 
      settingsProps={{
        isDark, onThemeChange: handleThemeChange, enterToSend, setEnterToSend,
        setMessages: session.setMessages, setRecentChats, setActiveSessionId: session.setActiveSessionId
      }} 
    >
      <div className={`flex flex-col h-screen w-full overflow-hidden font-sans transition-none duration-500 ${isIncognito ? (isDark ? "bg-black" : "bg-neutral-100") : (!isIncognito && (isDark ? customBgDark : customBgLight)) ? 'bg-transparent text-foreground has-custom-bg' : showPinkMode ? 'bg-[#fff5f7] text-foreground is-pink-mode' : 'bg-background text-foreground'}`}
      style={{
        ...(!isIncognito && (isDark ? customBgDark : customBgLight) ? { backgroundImage: `url(${convertFileSrc(isDark ? customBgDark : customBgLight)})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundAttachment: 'fixed' } : {}),
        ...(showPinkMode ? { background: 'linear-gradient(to bottom, #fff5f7, #ffe4e8)' } : {})
      }}
    >
      <DashboardHeader
        isLeftSidebarOpen={isLeftSidebarOpen} setIsLeftSidebarOpen={setIsLeftSidebarOpen}
        sidebarContrast={sidebarContrast} isIncognito={isIncognito}
        toggleIncognito={() => setIsIncognito(!isIncognito)} selectedProvider={selectedProvider}
        setSelectedProvider={setSelectedProvider} selectedModel={selectedModel}
        setSelectedModel={setSelectedModel} headerContrast={headerContrast}
        isDark={isDark} handleThemeChange={handleThemeChange} showPinkMode={showPinkMode}
      />
      <DashboardMain
        {...session}
        isLeftSidebarOpen={isLeftSidebarOpen} setIsLeftSidebarOpen={setIsLeftSidebarOpen}
        recentChats={recentChats} setRecentChats={setRecentChats}
        isIncognito={isIncognito} setIsIncognito={setIsIncognito}
        showPinkMode={showPinkMode} isDark={isDark}
        customBgDark={customBgDark} customBgLight={customBgLight}
        sidebarContrast={sidebarContrast} rightSidebarContrast={rightSidebarContrast}
        messages={session.messages} isThinking={isThinking} 
        researchEvents={researchEvents}
        selectedModel={selectedModel} stableSetInput={stableSetInput}
        hasCustomBgValue={!!(!isIncognito && (isDark ? customBgDark : customBgLight))}
        voiceStatus={voiceStatus} input={input} handleInputChange={handleInputChange}
        handleSend={handleSend} abort={abort} isStreaming={isStreaming}
        attachedFile={attachedFile} setAttachedFile={setAttachedFile}
        isWebSearchActive={isWebSearchActive} setIsWebSearchActive={setIsWebSearchActive}
        enterToSend={enterToSend} isModelLoaded={selectedModel ? isModelLoaded : true}
        handleInputFocus={handleInputFocus} isListening={isListening}
        setIsListening={setIsListening} handleChangeBackground={handleChangeBackground}
        setCustomBgDark={setCustomBgDark} setCustomBgLight={setCustomBgLight}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        profileName={profileName} setProfileName={setProfileName}
        profileEmail={profileEmail} setProfileEmail={setProfileEmail}
        setIsProfileOpen={setIsProfileOpen}
        setIsSettingsOpen={setIsSettingsOpen}
      />
    </ModalProvider>
  );
}

export function Dashboard() {
  return (
    <TooltipProvider>
      <DashboardContent />
    </TooltipProvider>
  );
}
