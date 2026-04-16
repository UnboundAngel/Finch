import { useState, useCallback, useEffect } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Message, ChatSession } from '../../types/chat';
import { useChatPersistence } from '@/src/hooks/useChatPersistence';
import { useAIStreaming } from '@/src/hooks/useAIStreaming';
import { useKeyboardShortcuts } from '@/src/hooks/useKeyboardShortcuts';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { useModelParams, useChatStore, useProfileStore } from '@/src/store';
import { useInactivityEject } from '@/src/hooks/useInactivityEject';
import { useModelPolling } from '@/src/hooks/useModelPolling';
import { useDynamicBackground } from '@/src/hooks/useDynamicBackground';
import { useChatSession } from '@/src/hooks/useChatSession';
import { ModalProvider, useModals } from '@/src/providers/ModalProvider';
import { DashboardHeader } from './DashboardHeader';
import { DashboardMain } from './DashboardMain';

function DashboardContent({
  recentChats, setRecentChats,
  profileName, setProfileName,
  profileEmail, setProfileEmail,
  customBgLight, setCustomBgLight,
  customBgDark, setCustomBgDark,
  enterToSend, setEnterToSend,
  handleThemeChange
}: any) {
  const isDark = useChatStore(state => state.isDark);
  const setIsIncognito = useChatStore(state => state.setIsIncognito);
  const selectedProvider = useChatStore(state => state.selectedProvider);
  const setSelectedProvider = useChatStore(state => state.setSelectedProvider);
  const selectedModel = useChatStore(state => state.selectedModel);
  const setSelectedModel = useChatStore(state => state.setSelectedModel);
  const isIncognito = useChatStore(state => state.isIncognito);
  const isModelLoaded = useChatStore(state => state.isModelLoaded);
  const voiceStatus = useChatStore(state => state.voiceStatus);

  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isWebSearchActive, setIsWebSearchActive] = useState(false);
  const [researchEvents, setResearchEvents] = useState<any[]>([]);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);

  const { openOverflowModal, setIsProfileOpen, setIsSettingsOpen } = useModals();
  const { streamMessage, abort, isStreaming } = useAIStreaming();

  const showPinkMode = !isDark && !customBgLight && !isIncognito;

  const { handleInputChange, handleInputFocus } = useModelPolling(selectedModel, selectedProvider);
  const { headerContrast, sidebarContrast, rightSidebarContrast } = useDynamicBackground({
    isDark, customBgLight, customBgDark, isIncognito, showPinkMode
  });

  const session = useChatSession({
    recentChats, setRecentChats
  });

  const stableSetInput = useCallback((val: string | ((prev: string) => string)) => {
    setInput(val);
    handleInputChange();
  }, [handleInputChange]);

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
    onOpenSettings: () => setIsSettingsOpen(true),
    onSearchFocus: () => document.getElementById('sidebar-search-input')?.focus()
  });

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
      messages: updatedMessages as any,
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
      setRecentChats((prev: any) => [sessionToSave, ...prev.filter((c: any) => c.id !== savedId)].sort((a, b) => (a.pinned === b.pinned ? b.timestamp - a.timestamp : a.pinned ? -1 : 1)));
    } catch (err) { console.error('Failed to save chat:', err); }
  };

  const handleSend = async (bypassCheck = false) => {
    if (!input.trim() || isThinking || isStreaming) return;
    const { systemPrompt, temperature, topP, maxTokens, contextIntelligence: ci } = useModelParams.getState();
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
    { systemPrompt, temperature, topP, maxTokens, enableWebSearch: isWebSearchActive }, updatedMessages);
  };

  return (
    <div className={`flex flex-col h-screen w-full overflow-hidden font-sans transition-none duration-500 ${isIncognito 
      ? (isDark ? "bg-[#1a1a1a]" : "bg-[#fffcf0]") 
      : (!isIncognito && (isDark ? customBgDark : customBgLight)) 
        ? 'bg-transparent text-foreground has-custom-bg' 
        : showPinkMode 
          ? 'bg-[#fff5f7] text-foreground is-pink-mode' 
          : 'bg-background text-foreground'}`}
      style={{
        ...(!isIncognito && (isDark ? customBgDark : customBgLight) ? { backgroundImage: `url(${convertFileSrc(isDark ? customBgDark : customBgLight)})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundAttachment: 'fixed' } : {}),
        ...(showPinkMode ? { background: 'linear-gradient(to bottom, #fff5f7, #ffe4e8)' } : {})
      }}
    >
      <DashboardHeader
        sidebarContrast={sidebarContrast} isIncognito={isIncognito}
        toggleIncognito={() => setIsIncognito(!isIncognito)} selectedProvider={selectedProvider}
        setSelectedProvider={setSelectedProvider} selectedModel={selectedModel}
        setSelectedModel={setSelectedModel} headerContrast={headerContrast}
        isDark={isDark} handleThemeChange={handleThemeChange} showPinkMode={showPinkMode}
      />
      <DashboardMain
        {...session}
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
    </div>
  );
}

export function Dashboard() {
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const activeProfile = useProfileStore(state => state.activeProfile);
  const saveProfile = useProfileStore(state => state.saveProfile);

  const profileName = activeProfile?.name || 'Jane Doe';
  const profileEmail = activeProfile?.email || '';
  const customBgLight = activeProfile?.customBgLight || '';
  const customBgDark = activeProfile?.customBgDark || '';

  const setProfileName = (name: string) => activeProfile && saveProfile({ ...activeProfile, name });
  const setProfileEmail = (email: string) => activeProfile && saveProfile({ ...activeProfile, email });
  const setCustomBgLight = (path: string) => activeProfile && saveProfile({ ...activeProfile, customBgLight: path });
  const setCustomBgDark = (path: string) => activeProfile && saveProfile({ ...activeProfile, customBgDark: path });

  const [enterToSend, setEnterToSend] = useState(true);
  const isDark = useChatStore(state => state.isDark);
  const setIsDark = useChatStore(state => state.setIsDark);

  // Sync theme with document root on mount and state change
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleThemeChange = (checked: boolean) => {
    setIsDark(checked);
    if (checked) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  return (
    <TooltipProvider>
      <ModalProvider 
        profileProps={{
          profileName, setProfileName, profileEmail, setProfileEmail
        }} 
        settingsProps={{
          isDark, onThemeChange: handleThemeChange, enterToSend, setEnterToSend,
          setRecentChats
        }} 
      >
        <DashboardContent 
          recentChats={recentChats} setRecentChats={setRecentChats}
          profileName={profileName} setProfileName={setProfileName}
          profileEmail={profileEmail} setProfileEmail={setProfileEmail}
          customBgLight={customBgLight} setCustomBgLight={setCustomBgLight}
          customBgDark={customBgDark} setCustomBgDark={setCustomBgDark}
          enterToSend={enterToSend} setEnterToSend={setEnterToSend}
          handleThemeChange={handleThemeChange}
        />
      </ModalProvider>
    </TooltipProvider>
  );
}
