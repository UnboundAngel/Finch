import { useState, useCallback, useEffect, useRef } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import type { Message, ChatSession, WebSearchResearchEvent } from '../../types/chat';
import { useChatPersistence } from '@/src/hooks/useChatPersistence';
import { useAIStreaming } from '@/src/hooks/useAIStreaming';
import { useKeyboardShortcuts } from '@/src/hooks/useKeyboardShortcuts';
import { invoke } from '@tauri-apps/api/core';
import { useModelParams, useChatStore, useProfileStore } from '@/src/store';
import { useInactivityEject } from '@/src/hooks/useInactivityEject';
import { useModelPolling } from '@/src/hooks/useModelPolling';
import { useDynamicBackground } from '@/src/hooks/useDynamicBackground';
import { useChatSession } from '@/src/hooks/useChatSession';
import { ModalProvider, useModals } from '@/src/providers/ModalProvider';
import { DashboardHeader } from './DashboardHeader';
import { DashboardMain } from './DashboardMain';
import { BackgroundPlus } from '@/components/ui/background-plus';
import { fetchModelsMap, inferProviderForModel } from '@/src/lib/availableModels';
import { WallpaperPickerDialog } from '@/src/components/profile/WallpaperPickerDialog';
import { resolveMediaSrc } from '@/src/lib/mediaPaths';
import { funEmojiAvatarUrl } from '@/src/lib/dicebearAvatar';

// Cloud providers are rate-limited — avoid an extra API call just for the title.
// Strip leading filler words and take the first 6 significant words of the message.
function deriveClientTitle(message: string): string {
  const stripped = message
    .trim()
    .replace(/^(?:what(?:'s| is| are| were)?|who(?:'s)?|where(?:'s)?|when|why|how(?:'s| do| does| did)?|can(?: you)?|could(?: you)?|would(?: you)?|should(?: i)?|please|tell(?: me)?|explain|help(?: me)?|write|create|make|give(?: me)?|show(?: me)?|is|are|do|does|did)\s+/i, '')
    .replace(/[?!.]+$/, '')
    .trim();
  const words = (stripped || message.trim()).split(/\s+/).slice(0, 6);
  const title = words.join(' ');
  return title ? title.charAt(0).toUpperCase() + title.slice(1) : '';
}

const CLOUD_PROVIDERS = new Set(['anthropic', 'openai', 'gemini']);

function DashboardContent({
  recentChats, setRecentChats,
  profileName, setProfileName,
  profileEmail, setProfileEmail,
  customBgLight, setCustomBgLight,
  customBgDark, setCustomBgDark,
  enterToSend, setEnterToSend,
  handleThemeChange,
  openWallpaperPicker,
  chatSessionActionsRef,
}: any) {
  const isDark = useChatStore(state => state.isDark);
  const setIsIncognito = useChatStore(state => state.setIsIncognito);
  const selectedProvider = useChatStore(state => state.selectedProvider);
  const setSelectedProvider = useChatStore(state => state.setSelectedProvider);
  const selectedModel = useChatStore(state => state.selectedModel);
  const setSelectedModel = useChatStore(state => state.setSelectedModel);
  const isIncognito = useChatStore(state => state.isIncognito);
  const isModelLoaded = useChatStore(state => state.isModelLoaded);
  const isModelLoading = useChatStore(state => state.isModelLoading);
  const modelLoadProgress = useChatStore(state => state.modelLoadProgress);
  const voiceStatus = useChatStore(state => state.voiceStatus);
  const activeProfile = useProfileStore((s) => s.activeProfile);
  const profiles = useProfileStore((s) => s.profiles);
  const legacyInboxOwnerProfileId = profiles[0]?.id ?? null;
  const setSystemPrompt = useModelParams((s) => s.setSystemPrompt);
  const fetchContextIntelligence = useModelParams((s) => s.fetchContextIntelligence);

  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isWebSearchActive, setIsWebSearchActive] = useState(false);
  const [researchEvents, setResearchEvents] = useState<WebSearchResearchEvent[]>([]);
  const researchEventsRef = useRef<WebSearchResearchEvent[]>([]);
  const [attachedFile, setAttachedFile] = useState<{ name: string; path: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);

  // Refs so handleSend (wrapped in useCallback) can read latest values without
  // needing them as deps — avoids recreating handleSend on every keystroke.
  const inputRef = useRef(input);
  inputRef.current = input;
  const attachedFileRef = useRef(attachedFile);
  attachedFileRef.current = attachedFile;

  const { openOverflowModal, setIsProfileOpen, setIsSettingsOpen } = useModals();
  const { streamMessage, abort, isStreaming } = useAIStreaming();

  const wasAbortedRef = useRef(false);

  const handleStop = useCallback(() => {
    wasAbortedRef.current = true;
    abort();
  }, [abort]);

  const appliedProfileKey = useRef<string | null>(null);

  useEffect(() => {
    if (!activeProfile?.id) {
      appliedProfileKey.current = null;
      return;
    }
    const key = [
      activeProfile.id,
      activeProfile.model ?? '',
      activeProfile.provider ?? '',
      activeProfile.prompt ?? '',
      activeProfile.webSearch ? '1' : '0',
    ].join(':');
    if (appliedProfileKey.current === key) return;
    appliedProfileKey.current = key;

    let cancelled = false;
    (async () => {
      let provider = activeProfile.provider || '';
      const model = activeProfile.model || '';
      if (model && !provider) {
        const map = await fetchModelsMap();
        if (cancelled) return;
        const inferred = inferProviderForModel(model, map);
        if (inferred) provider = inferred;
      }
      if (cancelled) return;
      if (model) setSelectedModel(model);
      if (provider) setSelectedProvider(provider);
      setSystemPrompt(activeProfile.prompt ?? '');
      setIsWebSearchActive(!!activeProfile.webSearch);
      if (provider && model) void fetchContextIntelligence(provider, model);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeProfile?.id,
    activeProfile?.model,
    activeProfile?.provider,
    activeProfile?.prompt,
    activeProfile?.webSearch,
    setSelectedModel,
    setSelectedProvider,
    setSystemPrompt,
    setIsWebSearchActive,
    fetchContextIntelligence,
  ]);

  const showPinkMode = !isDark && !customBgLight && !isIncognito;

  const userAvatarSrc =
    activeProfile?.avatarUrl && activeProfile.avatarUrl.trim() !== ''
      ? resolveMediaSrc(activeProfile.avatarUrl)
      : funEmojiAvatarUrl(activeProfile?.name || profileName || 'User');
  const userAvatarLetter = (activeProfile?.name || profileName || 'U').charAt(0).toUpperCase();

  const { handleInputChange, handleInputFocus } = useModelPolling(selectedModel, selectedProvider);
  const { headerContrast, sidebarContrast, rightSidebarContrast } = useDynamicBackground({
    isDark, customBgLight, customBgDark, isIncognito, showPinkMode
  });

  const session = useChatSession({
    recentChats,
    setRecentChats,
    activeProfileId: activeProfile?.id ?? null,
  });

  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = session.messages;

  useEffect(() => {
    setAttachedFile(null);
  }, [session.activeSessionId, activeProfile?.id]);

  useEffect(() => {
    chatSessionActionsRef.current = {
      setMessages: session.setMessages,
      setActiveSessionId: session.setActiveSessionId,
    };
  }, [chatSessionActionsRef, session.setMessages, session.setActiveSessionId]);

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
    setRecentChats,
    enterToSend,
    setEnterToSend,
    selectedModel,
    setSelectedModel,
    selectedProvider,
    setSelectedProvider,
    activeProfileId: activeProfile?.id ?? null,
    legacyInboxOwnerProfileId,
  });

  const handleNewChatWrapped = useCallback(() => {
    setAttachedFile(null);
    session.handleNewChat();
  }, [session.handleNewChat]);

  useKeyboardShortcuts({
    onNewChat: handleNewChatWrapped,
    onOpenSettings: () => setIsSettingsOpen(true),
    onSearchFocus: () => document.getElementById('sidebar-search-input')?.focus()
  });

  const handleChangeBackground = () => {
    openWallpaperPicker(isDark ? 'dark' : 'light');
  };

  // Always read latest list when saving. invokeStream is stable (narrow useCallback deps), so
  // saves that run after streaming must not read a stale `recentChats` closure.
  const recentChatsRef = useRef(recentChats);
  recentChatsRef.current = recentChats;

  // AI title is written here synchronously as soon as the model returns, before React commits
  // setRecentChats. Stream-end saves must see this even if chat list state is still catching up.
  const pendingAutoTitleBySessionIdRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    pendingAutoTitleBySessionIdRef.current.clear();
  }, [activeProfile?.id]);

  const resolveSessionTitle = (
    sessionId: string | null | undefined,
    updatedMessages: Message[],
    existingChat: ChatSession | undefined,
  ): string => {
    const pending = (sessionId && pendingAutoTitleBySessionIdRef.current.get(sessionId)?.trim()) || '';
    const existingTitle = existingChat?.title?.trim() ?? '';
    const firstUser = updatedMessages.find((m) => m.role === 'user');
    const rawPeek = (firstUser?.content ?? '').substring(0, 40).trim() || 'New Chat';
    // Pending applies only while the list still shows the default slice (not yet committed AI name).
    // Once the list has any other title (AI or user rename), trust the list over pending so renames win.
    const listStillDefaultSlice = !existingTitle || existingTitle === rawPeek;
    if (pending && listStillDefaultSlice) return pending;
    if (existingTitle) return existingTitle;
    return rawPeek;
  };

  const updateActiveSessionInList = useCallback(async (updatedMessages: Message[]) => {
    if (isIncognito) return;
    const currentSessionId = session.activeSessionIdRef.current;
    const existing = recentChatsRef.current.find(c => c.id === currentSessionId);
    const firstUserForPeek = updatedMessages.find((m) => m.role === 'user');
    const rawPeekForPurge =
      (firstUserForPeek?.content ?? '').substring(0, 40).trim() || 'New Chat';
    if (currentSessionId) {
      const p = pendingAutoTitleBySessionIdRef.current.get(currentSessionId)?.trim();
      const ex = existing?.title?.trim();
      if (p && ex && ex !== rawPeekForPurge && ex !== p) {
        pendingAutoTitleBySessionIdRef.current.delete(currentSessionId);
      }
    }
    const pendingBefore = currentSessionId
      ? pendingAutoTitleBySessionIdRef.current.get(currentSessionId)?.trim()
      : '';
    const resolvedTitle = resolveSessionTitle(currentSessionId, updatedMessages, existing);
    const sessionToSave: ChatSession = {
      id: currentSessionId || '',
      title: resolvedTitle,
      messages: updatedMessages as any,
      profileId: activeProfile?.id,
      timestamp: Date.now(),
      created_at: existing?.created_at || Date.now(),
      updated_at: Date.now(),
      model: selectedModel,
      provider: selectedProvider,
      pinned: existing?.pinned || false,
      incognito: false,
      systemPrompt: existing?.systemPrompt || useModelParams.getState().systemPrompt || '',
      generationParams: existing?.generationParams || { temperature: 0.7, maxTokens: 2048, topP: 1.0 },
      stats: { totalTokens: useChatStore.getState().tokensUsed, totalMessages: updatedMessages.length, averageSpeed: 0 }
    };

    try {
      const savedId = await invoke<string>('save_chat', { chat: sessionToSave });
      if (!currentSessionId) {
        session.setActiveSessionId(savedId);
        session.activeSessionIdRef.current = savedId;
        sessionToSave.id = savedId;
      }
      const sid = sessionToSave.id;
      if (pendingBefore && resolvedTitle === pendingBefore) {
        pendingAutoTitleBySessionIdRef.current.delete(sid);
      }
      setRecentChats((prev: any) => [sessionToSave, ...prev.filter((c: any) => c.id !== savedId)].sort((a, b) => (a.pinned === b.pinned ? b.timestamp - a.timestamp : a.pinned ? -1 : 1)));
    } catch (err) { console.error('Failed to save chat:', err); }
  }, [isIncognito, session.activeSessionIdRef, session.setActiveSessionId]);

  const invokeStream = useCallback((
    userMessage: string,
    historyWithUserMsg: Message[],
    attachmentPath?: string,
  ) => {
    const { systemPrompt, temperature, topP, maxTokens } = useModelParams.getState();
    setIsThinking(true);
    let isFirstToken = true;
    const aiMessageId = crypto.randomUUID();
    wasAbortedRef.current = false;

    const cloudProviders = new Set(['anthropic', 'openai', 'gemini']);
    const streamParams = {
      systemPrompt, temperature, topP,
      ...(cloudProviders.has(selectedProvider) ? {} : { maxTokens }),
      enableWebSearch: isWebSearchActive,
    };

    streamMessage(
      userMessage, selectedModel, selectedProvider,
      (token) => {
        if (isFirstToken) {
          setIsThinking(false);
          isFirstToken = false;
          const snapshottedEvents = [...researchEventsRef.current];
          session.setMessages(prev => [...prev, {
            id: aiMessageId, role: 'ai', content: token, streaming: true,
            metadata: {
              timestamp: new Date(), model: selectedModel,
              ...(snapshottedEvents.length > 0 ? { researchEvents: snapshottedEvents } : {}),
            }
          }]);
        } else {
          session.setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'ai') return [...prev.slice(0, -1), { ...last, content: last.content + token }];
            return prev;
          });
        }
      },
      (ev: WebSearchResearchEvent) => {
        researchEventsRef.current = [...researchEventsRef.current, ev];
        setResearchEvents(researchEventsRef.current);
        // If an AI streaming message already exists (search event after first token), patch its metadata too
        session.setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'ai' && last.streaming) {
            const existing = last.metadata?.researchEvents ?? [];
            return [...prev.slice(0, -1), {
              ...last,
              metadata: { ...last.metadata, researchEvents: [...existing, ev] }
            }];
          }
          return prev;
        });
      },
      (stats) => {
        session.setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'ai') {
            const wasAborted = wasAbortedRef.current;
            wasAbortedRef.current = false;
            const mergedStats = { ...(stats || {}) };
            if (wasAborted) mergedStats.stopReason = 'user_stopped';
            // Preserve researchEvents from the streaming message — stats payload never includes it
            const final = [...prev.slice(0, -1), { ...last, streaming: false, metadata: { ...last.metadata, ...mergedStats } }];
            setTimeout(() => updateActiveSessionInList(final), 0);
            return final;
          }
          return prev;
        });
        setIsThinking(false);
      },
      (err) => {
        setIsThinking(false);
        toast.error(`That reply went sideways: ${err}`);
      },
      streamParams,
      historyWithUserMsg,
      attachmentPath ? [{ path: attachmentPath }] : undefined,
    );
  }, [selectedModel, selectedProvider, isWebSearchActive, streamMessage, session.setMessages, updateActiveSessionInList]);

  // Refs for stable callbacks used across send/autoName — updated each render so
  // useCallback deps stay narrow without stale closures.
  const handleSendRef = useRef<(bypassCheck?: boolean) => Promise<void>>(async () => {});
  const autoNameChatRef = useRef<(msg: string) => Promise<void>>(async () => {});

  const handleSend = useCallback(async (bypassCheck = false) => {
    const currentInput = inputRef.current;
    if (!currentInput.trim() || isThinking || isStreaming) return;
    const { maxTokens, contextIntelligence: ci } = useModelParams.getState();
    if (!bypassCheck && maxTokens > (ci?.hardware_safe_limit || 8192)) {
      openOverflowModal(ci?.hardware_safe_limit || 8192, maxTokens, () => handleSendRef.current(true));
      return;
    }

    const userMessage = currentInput.trim();
    setInput('');
    setResearchEvents([]);
    researchEventsRef.current = [];
    const msgs = messagesRef.current;
    const isFirstMessage = msgs.length === 0;
    const pendingAttach = attachedFileRef.current;
    const updatedMessages: Message[] = [
      ...msgs,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: userMessage,
        ...(pendingAttach ? { attachment: { name: pendingAttach.name, path: pendingAttach.path } } : {}),
      },
    ];
    session.setMessages(updatedMessages);
    setIsThinking(true);
    await updateActiveSessionInList(updatedMessages);
    if (isFirstMessage) {
      await autoNameChatRef.current(userMessage);
    }
    const attachmentPath = pendingAttach?.path;
    setAttachedFile(null);
    invokeStream(userMessage, updatedMessages, attachmentPath);
  }, [isThinking, isStreaming, openOverflowModal, session.setMessages, updateActiveSessionInList, invokeStream, setAttachedFile]);
  handleSendRef.current = handleSend;

  const handleRegenerate = useCallback(async (messageId?: string) => {
    if (isThinking || isStreaming) return;
    const msgs = messagesRef.current;
    
    let lastUserIdx = -1;
    if (messageId) {
      const aiIdx = msgs.findIndex(m => m.id === messageId);
      if (aiIdx !== -1) {
        // Find the user message just before this AI message
        for (let i = aiIdx - 1; i >= 0; i--) {
          if (msgs[i].role === 'user') {
            lastUserIdx = i;
            break;
          }
        }
      }
    } else {
      lastUserIdx = msgs.reduceRight(
        (found, m, i) => found !== -1 ? found : (m.role === 'user' ? i : -1), -1
      );
    }

    if (lastUserIdx === -1) return;
    const userMsg = msgs[lastUserIdx];
    const truncated = msgs.slice(0, lastUserIdx + 1);
    session.setMessages(truncated);
    setResearchEvents([]);
    researchEventsRef.current = [];
    setIsThinking(true);
    await updateActiveSessionInList(truncated);
    invokeStream(userMsg.content, truncated);
  }, [isThinking, isStreaming, invokeStream, session.setMessages, updateActiveSessionInList]);

  const handleEditResend = useCallback(async (messageId: string, newContent: string) => {
    if (isThinking || isStreaming) return;
    const msgs = messagesRef.current;
    const idx = msgs.findIndex(m => m.id === messageId);
    if (idx === -1) return;
    const editedMessage: Message = { ...msgs[idx], content: newContent };
    const truncated = [...msgs.slice(0, idx), editedMessage];
    session.setMessages(truncated);
    setResearchEvents([]);
    researchEventsRef.current = [];
    setIsThinking(true);
    await updateActiveSessionInList(truncated);
    invokeStream(newContent, truncated);
  }, [isThinking, isStreaming, invokeStream, session.setMessages, updateActiveSessionInList]);

  const applyTitle = useCallback((sessionId: string, cleanTitle: string) => {
    pendingAutoTitleBySessionIdRef.current.set(sessionId, cleanTitle);
    setRecentChats(prev => {
      const chat = prev.find(c => c.id === sessionId);
      if (!chat) return prev;
      const updated = { ...chat, title: cleanTitle };
      void invoke('save_chat', { chat: updated });
      return prev.map(c => c.id === sessionId ? updated : c);
    });
  }, [setRecentChats]);

  const autoNameChat = useCallback(async (userMessage: string) => {
    const sessionId = session.activeSessionIdRef.current;
    if (!sessionId || !selectedModel || !selectedProvider) return;

    // Cloud providers: derive title client-side — no extra API call, no quota hit.
    if (CLOUD_PROVIDERS.has(selectedProvider)) {
      const cleanTitle = deriveClientTitle(userMessage);
      if (cleanTitle && cleanTitle.length <= 80) {
        applyTitle(sessionId, cleanTitle);
      }
      return;
    }

    // Local models are already in memory — free to ask for a better title.
    try {
      const title = await invoke<string>('send_message', {
        prompt: `Give this chat a 4-6 word title based on the opening message. Reply with ONLY the title — no quotes, no punctuation, no explanation.\n\nMessage: "${userMessage.substring(0, 300)}"`,
        model: selectedModel,
        provider: selectedProvider,
        conversationHistory: [],
        systemPrompt: 'You are a chat title generator. Reply with only a concise title.',
        maxTokens: 256,
      });
      const cleanTitle = title.trim().replace(/^["'\s]+|["'\s]+$/g, '').replace(/[.,!?]$/, '');
      if (!cleanTitle || cleanTitle.length > 80) return;
      applyTitle(sessionId, cleanTitle);
    } catch {
      // Silent fail — client-side fallback title was not needed (local model only path)
    }
  }, [selectedModel, selectedProvider, session.activeSessionIdRef, applyTitle]);
  autoNameChatRef.current = autoNameChat;

  return (
    <div className={`flex flex-col h-full min-h-0 w-full overflow-hidden font-sans transition-none duration-500 ${isIncognito 
      ? (isDark ? "bg-[#1a1a1a]" : "bg-[#fffcf0]") 
      : (!isIncognito && (isDark ? customBgDark : customBgLight)) 
        ? 'bg-transparent text-foreground has-custom-bg' 
        : showPinkMode 
          ? 'bg-[#fff5f7] text-foreground is-pink-mode' 
          : 'bg-background text-foreground'}`}
      style={{
        ...(!isIncognito && (isDark ? customBgDark : customBgLight)
          ? {
              backgroundImage: `url(${resolveMediaSrc(isDark ? customBgDark : customBgLight)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }
          : {}),
      }}
    >
      {!isIncognito && !(isDark ? customBgDark : customBgLight) && (
        <BackgroundPlus 
          plusColor={showPinkMode ? "#10b981" : (isDark ? "#fb3a5d" : "#6366f1")}
          plusSize={40} 
          fade={true}
          className={showPinkMode ? "opacity-[0.18]" : "opacity-[0.12] dark:opacity-[0.15]"}
        />
      )}
      <DashboardHeader
        sidebarContrast={sidebarContrast} isIncognito={isIncognito}
        toggleIncognito={() => setIsIncognito(!isIncognito)} selectedProvider={selectedProvider}
        setSelectedProvider={setSelectedProvider} selectedModel={selectedModel}
        setSelectedModel={setSelectedModel} headerContrast={headerContrast}
        isDark={isDark} handleThemeChange={handleThemeChange} showPinkMode={showPinkMode}
        isModelLoaded={isModelLoaded}
        isModelLoading={isModelLoading}
        modelLoadProgress={modelLoadProgress}
      />
      <DashboardMain
        {...session}
        handleNewChat={handleNewChatWrapped}
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
        handleSend={handleSend} abort={handleStop} isStreaming={isStreaming}
        onRegenerate={handleRegenerate}
        onEditResend={handleEditResend}
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
        userAvatarSrc={userAvatarSrc}
        userAvatarLetter={userAvatarLetter}
      />
    </div>
  );
}

export function Dashboard() {
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const [wallpaperMode, setWallpaperMode] = useState<'light' | 'dark'>('dark');
  const chatSessionActionsRef = useRef<{
    setMessages: (messages: Message[]) => void;
    setActiveSessionId: (id: string | null) => void;
  } | null>(null);

  const activeProfile = useProfileStore(state => state.activeProfile);
  const saveProfile = useProfileStore(state => state.saveProfile);
  const setActiveProfile = useProfileStore(state => state.setActiveProfile);

  const profileName = activeProfile?.name || 'Jane Doe';
  const profileEmail = activeProfile?.email || '';
  const customBgLight = activeProfile?.customBgLight || '';
  const customBgDark = activeProfile?.customBgDark || '';

  const setProfileName = (name: string) => activeProfile && saveProfile({ ...activeProfile, name });
  const setProfileEmail = (email: string) => activeProfile && saveProfile({ ...activeProfile, email });
  const setCustomBgLight = (path: string) => activeProfile && saveProfile({ ...activeProfile, customBgLight: path });
  const setCustomBgDark = (path: string) => activeProfile && saveProfile({ ...activeProfile, customBgDark: path });

  const openWallpaperPicker = (mode: 'light' | 'dark') => {
    setWallpaperMode(mode);
    setWallpaperOpen(true);
  };

  const handleClearWallpapers = async () => {
    if (!activeProfile) return;
    try {
      await saveProfile({
        ...activeProfile,
        customBgLight: undefined,
        customBgDark: undefined,
      });
      toast.success('Backgrounds cleared');
    } catch (e) {
      toast.error(`Your wallpapers are having a hard time clearing right now: ${e}`);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to switch profiles? This will end your current session.')) {
      localStorage.removeItem('finch_remembered_profile');
      setActiveProfile(null);
      toast.success('Switched profile');
    }
  };

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

  const prevActiveProfileId = useRef<string | undefined>(undefined);
  useEffect(() => {
    const id = activeProfile?.id;
    if (prevActiveProfileId.current !== undefined && prevActiveProfileId.current !== id) {
      setRecentChats([]);
    }
    prevActiveProfileId.current = id;
  }, [activeProfile?.id]);

  return (
    <TooltipProvider>
      <ModalProvider 
        profileProps={{
          profileName, setProfileName, profileEmail, setProfileEmail, onLogout: handleLogout
        }} 
        settingsProps={{
          enterToSend, setEnterToSend,
          setRecentChats,
          setMessages: (messages: Message[]) =>
            chatSessionActionsRef.current?.setMessages(messages),
          setActiveSessionId: (id: string | null) =>
            chatSessionActionsRef.current?.setActiveSessionId(id),
        }} 
      >
        <WallpaperPickerDialog
          open={wallpaperOpen}
          onOpenChange={setWallpaperOpen}
          mode={wallpaperMode}
          onApply={(path) => {
            if (wallpaperMode === 'light') setCustomBgLight(path);
            else setCustomBgDark(path);
          }}
        />
        <DashboardContent 
          recentChats={recentChats} setRecentChats={setRecentChats}
          profileName={profileName} setProfileName={setProfileName}
          profileEmail={profileEmail} setProfileEmail={setProfileEmail}
          customBgLight={customBgLight} setCustomBgLight={setCustomBgLight}
          customBgDark={customBgDark} setCustomBgDark={setCustomBgDark}
          enterToSend={enterToSend} setEnterToSend={setEnterToSend}
          handleThemeChange={handleThemeChange}
          openWallpaperPicker={openWallpaperPicker}
          chatSessionActionsRef={chatSessionActionsRef}
        />
      </ModalProvider>
    </TooltipProvider>
  );
}
