import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button, buttonVariants } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BackgroundPlus } from '@/components/ui/background-plus';
import {
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Ghost,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import Switch from '@/components/ui/sky-toggle';
import { Message, ChatSession } from '../../types/chat';
import { ChatArea } from '@/src/components/chat/ChatArea';
import { ChatInput } from '@/src/components/chat/ChatInput';
import { ChatSidebar } from '@/src/components/sidebar/ChatSidebar';
import { useChatPersistence } from '@/src/hooks/useChatPersistence';
import { useAIStreaming } from '@/src/hooks/useAIStreaming';
import { useKeyboardShortcuts } from '@/src/hooks/useKeyboardShortcuts';
import { ProfileDialog } from '@/src/components/dashboard/ProfileDialog';
import { SettingsDialog } from '@/src/components/dashboard/SettingsDialog';
import { ModelSelector } from '@/src/components/chat/ModelSelector';
import { invoke } from '@tauri-apps/api/core';
import { useSidebar } from '@/components/ui/sidebar';
import { WindowControls } from '@/src/components/dashboard/WindowControls';
import { RightSidebar } from '@/src/components/sidebar/RightSidebar';
import { useModelParams, useChatStore } from '@/src/store';
import { convertFileSrc } from '@tauri-apps/api/core';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useInactivityEject } from '@/src/hooks/useInactivityEject';
import { getImageLuminance } from '../../lib/luminance';
import { ContextOverflowModal } from '@/src/components/modals/ContextOverflowModal';

const SidebarIncognitoController = ({ isIncognito, children }: { isIncognito: boolean, children: React.ReactNode }) => {
  const { setOpen } = useSidebar();

  React.useEffect(() => {
    if (isIncognito) {
      setOpen(false);
    }
  }, [isIncognito, setOpen]);

  return <>{children}</>;
};

const RightSidebarToggle = ({ headerContrast }: { headerContrast: 'light' | 'dark' }) => {
  const isRightSidebarOpen = useChatStore(state => state.isRightSidebarOpen);
  const setIsRightSidebarOpen = useChatStore(state => state.setIsRightSidebarOpen);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsRightSidebarOpen(prev => !prev)}
      className={`h-9 w-9 rounded-lg transition-all ${headerContrast === 'dark' ? 'hover:bg-black/10 text-black' : 'hover:bg-white/10 text-white'}`}
    >
      <img
        src={isRightSidebarOpen ? "/assets/open-state-right.svg" : "/assets/closed-state-right.svg"}
        className={`h-5 w-5 transition-all duration-300 ${headerContrast === 'dark' ? 'brightness-0' : 'brightness-0 invert'}`}
        alt="Toggle Right Sidebar"
      />
    </Button>
  );
};

const RightSidebarContainer = ({ showPinkMode, customBgDark, customBgLight, isDark, isIncognito, rightSidebarContrast }: any) => {
  const isRightSidebarOpen = useChatStore(state => state.isRightSidebarOpen);
  const [isFullyOpen, setIsFullyOpen] = useState(false);

  // Reset fully open state when closing
  useEffect(() => {
    if (!isRightSidebarOpen) {
      setIsFullyOpen(false);
    }
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
        if (isRightSidebarOpen) {
          setIsFullyOpen(true);
        }
      }}
      className={`flex-shrink-0 relative z-30 overflow-hidden ${showPinkMode
        ? "bg-gradient-to-b from-fuchsia-50/80 to-pink-50/80 backdrop-blur-2xl border-l border-pink-200/50"
        : !isIncognito && (isDark ? customBgDark : customBgLight)
          ? "bg-background/20 backdrop-blur-2xl border-l border-white/10 dark:border-white/5"
          : ""
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

export function Dashboard() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const activeSessionIdRef = useRef<string | null>(activeSessionId);

  // Sync ref with state
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  const [isThinking, setIsThinking] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const selectedProvider = useChatStore(state => state.selectedProvider);
  const setSelectedProvider = useChatStore(state => state.setSelectedProvider);
  const selectedModel = useChatStore(state => state.selectedModel);
  const setSelectedModel = useChatStore(state => state.setSelectedModel);
  const isIncognito = useChatStore(state => state.isIncognito);
  const setIsIncognito = useChatStore(state => state.setIsIncognito);

  const stableSetInput = useCallback((val: string) => setInput(val), []);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWebSearchActive, setIsWebSearchActive] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [enterToSend, setEnterToSend] = useState(true);
  const [profileName, setProfileName] = useState('Jane Doe');
  const [profileEmail, setProfileEmail] = useState('jane.doe@example.com');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [customBgLight, setCustomBgLight] = useState('');
  const [customBgDark, setCustomBgDark] = useState('');
  const [headerContrast, setHeaderContrast] = useState<'light' | 'dark'>(isDark ? 'light' : 'dark');
  const [sidebarContrast, setSidebarContrast] = useState<'light' | 'dark'>(isDark ? 'light' : 'dark');
  const [rightSidebarContrast, setRightSidebarContrast] = useState<'light' | 'dark'>(isDark ? 'light' : 'dark');
  const [isModelLoaded, setIsModelLoaded] = useState(true);
  const [isOverflowModalOpen, setIsOverflowModalOpen] = useState(false);



  // Dev mode flag
  const IS_DEV_PINK_MODE = true; // pink mode for susie.. turn it on if you dare
  const showPinkMode = IS_DEV_PINK_MODE && !isDark && !customBgLight && !isIncognito;

  const { streamMessage, abort, isStreaming, stats } = useAIStreaming();

  const isTyping = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = React.useCallback((val: string) => {
    setInput(val);
    isTyping.current = true;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTyping.current = false;
    }, 1000);
  }, []);

  const handleInputFocus = React.useCallback(() => {
    isTyping.current = true;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTyping.current = false;
    }, 1000);
  }, []);

  // Polling for local model status
  useEffect(() => {
    if (!selectedModel || !selectedProvider.startsWith('local_')) {
      setIsModelLoaded(true);
      return;
    }

    const checkStatus = async () => {
      if (isTyping.current) return;

      try {
        const status = await invoke<boolean>('get_model_loaded_status', {
          provider: selectedProvider,
          modelId: selectedModel
        });

        setIsModelLoaded(prev => {
          if (prev !== status) return status;
          return prev;
        });
      } catch (e) {
        console.error('[POLL ERROR]', e);
        setIsModelLoaded(prev => {
          if (prev !== false) return false;
          return prev;
        });
      }
    };

    let interval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (interval) clearInterval(interval);
      interval = setInterval(checkStatus, 30000);
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleFocus = () => {
      checkStatus();
      startPolling();
    };

    const handleBlur = () => {
      stopPolling();
    };

    // Initial check and start polling
    checkStatus();
    if (document.hasFocus()) {
      startPolling();
    }

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      stopPolling();
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [selectedModel, selectedProvider]);

  useEffect(() => {
    if (showPinkMode) {
      setHeaderContrast('dark');
      setSidebarContrast('dark');
    }
  }, [showPinkMode]);

  const handleEject = React.useCallback(() => {
    setSelectedModel('');
    setSelectedProvider('');
    toast.info("Local model unloaded due to inactivity");
  }, []);

  const { resetTimer } = useInactivityEject({
    provider: selectedProvider,
    modelId: selectedModel,
    onEject: handleEject
  });

  useChatPersistence({
    recentChats,
    setRecentChats,
    profileName,
    setProfileName,
    profileEmail,
    setProfileEmail,
    enterToSend,
    setEnterToSend,
    selectedModel,
    setSelectedModel,
    selectedProvider,
    setSelectedProvider,
    customBgLight,
    setCustomBgLight,
    customBgDark,
    setCustomBgDark,
  });

  const hasInitialized = React.useRef(false);

  // Auto-load most recent session on startup
  React.useEffect(() => {
    try {
      if (!hasInitialized.current && recentChats.length > 0) {
        hasInitialized.current = true;
        if (!activeSessionId && !isIncognito && messages.length === 0) {
          const mostRecent = recentChats[0];
          setActiveSessionId(mostRecent.id);
          setMessages(mostRecent.messages);
        }
      }
    } catch (e) {
      console.error('Failed to initialize most recent session:', e);
    }
  }, [recentChats, activeSessionId, isIncognito, messages.length]);

  // Analyze background luminance for dynamic contrast
  const analyzeBackground = React.useCallback(async () => {
    const activeBg = document.documentElement.classList.contains('dark') ? customBgDark : customBgLight;
    const isDarkCurrent = document.documentElement.classList.contains('dark');

    if (showPinkMode) {
      setHeaderContrast('dark');
      setSidebarContrast('dark');
      setRightSidebarContrast('dark');
      document.documentElement.style.setProperty('--selection-bg', 'oklch(0.6 0.16 165 / 25%)');
      document.documentElement.style.setProperty('--selection-text', 'oklch(0.3 0.12 165)');
      return;
    }

    if (!activeBg || isIncognito) {
      setHeaderContrast(isDarkCurrent ? 'light' : 'dark');
      setSidebarContrast(isDarkCurrent ? 'light' : 'dark');
      setRightSidebarContrast(isDarkCurrent ? 'light' : 'dark');
      // Reset to modern defaults (Violet)
      document.documentElement.style.setProperty('--selection-bg', isDarkCurrent ? 'oklch(0.7 0.2 300 / 30%)' : 'oklch(0.6 0.2 300 / 20%)');
      document.documentElement.style.setProperty('--selection-text', isDarkCurrent ? 'oklch(0.9 0.1 300)' : 'oklch(0.4 0.2 300)');
      return;
    }

    const imageUrl = convertFileSrc(activeBg);
    const [headerLum, sidebarLum, mainAreaLum, rightSidebarLum] = await Promise.all([
      getImageLuminance(imageUrl, 'top-right'),
      getImageLuminance(imageUrl, 'left-edge'),
      getImageLuminance(imageUrl, 'center'),
      getImageLuminance(imageUrl, 'right-edge')
    ]);

    // Custom background: Use safe neutral selection based on the center luminance (where text is)
    const isMainAreaBright = mainAreaLum > 0.5;
    document.documentElement.style.setProperty('--selection-bg', isMainAreaBright ? 'oklch(0.6 0.2 300 / 25%)' : 'oklch(0.8 0.15 300 / 35%)');
    document.documentElement.style.setProperty('--selection-text', isMainAreaBright ? 'oklch(0.3 0.15 300)' : 'oklch(0.95 0.05 300)');

    setHeaderContrast(headerLum >= 0.5 ? 'dark' : 'light');
    setSidebarContrast(sidebarLum >= 0.5 ? 'dark' : 'light');
    setRightSidebarContrast(rightSidebarLum >= 0.5 ? 'dark' : 'light');
  }, [customBgLight, customBgDark, isIncognito, showPinkMode]);

  React.useEffect(() => {
    analyzeBackground();
  }, [analyzeBackground, customBgLight, customBgDark, isIncognito, showPinkMode]);

  const handleSwitchSession = (id: string) => {
    const session = recentChats.find(c => c.id === id);
    if (session) {
      if (isIncognito) {
        setIsIncognito(false);
      }
      setActiveSessionId(id);
      activeSessionIdRef.current = id;
      setMessages(session.messages || []);
      toast(`Opened chat: ${session.title}`);
    }
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    activeSessionIdRef.current = null;
    setMessages([]);
    if (!isIncognito) {
      toast.info('Started a new chat');
    }
  };

  useKeyboardShortcuts({
    onNewChat: handleNewChat,
    onOpenSettings: () => setIsSettingsOpen(true),
    onSearchFocus: () => {
      document.getElementById('sidebar-search-input')?.focus();
    }
  });

  const toggleIncognito = () => {
    if (isIncognito) {
      setIsIncognito(false);
      setMessages([]);
      setActiveSessionId(null);
      activeSessionIdRef.current = null;
    } else {
      setIsIncognito(true);
      setActiveSessionId(null);
      activeSessionIdRef.current = null;
    }
  };

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const chatToDelete = recentChats.find(c => c.id === id);
    if (!chatToDelete) return;

    try {
      await invoke('delete_chat', { id });
      const updatedChats = recentChats.filter(c => c.id !== id);
      setRecentChats(updatedChats);

      if (activeSessionIdRef.current === id) {
        handleNewChat();
      }

      toast('Chat deleted', {
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              const restoredId = await invoke<string>('save_chat', { chat: chatToDelete });
              setRecentChats(prev => {
                const restoredChats = [...prev, { ...chatToDelete, id: restoredId }].sort((a, b) => b.timestamp - a.timestamp);
                return restoredChats;
              });
            } catch (err) {
              console.error('Failed to undo delete:', err);
            }
          }
        },
        duration: 4000
      });
    } catch (err) {
      console.error('Failed to delete chat:', err);
      toast.error('Failed to delete chat');
    }
  };

  const handlePinChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const chat = recentChats.find(c => c.id === id);
    if (!chat) return;

    const updatedChat = { ...chat, pinned: !chat.pinned };
    try {
      await invoke('save_chat', { chat: updatedChat });
      const updatedChats = recentChats.map(c => c.id === id ? updatedChat : c);
      setRecentChats(updatedChats);
    } catch (err) {
      console.error('Failed to pin chat:', err);
    }
  };

  const handleRenameCommit = async (id: string) => {
    if (editingTitle.trim()) {
      const chat = recentChats.find(c => c.id === id);
      if (chat) {
        const updatedChat = { ...chat, title: editingTitle.trim() };
        try {
          await invoke('save_chat', { chat: updatedChat });
          const updatedChats = recentChats.map(c => c.id === id ? updatedChat : c);
          setRecentChats(updatedChats);
        } catch (err) {
          console.error('Failed to rename chat:', err);
        }
      }
    }
    setEditingSessionId(null);
  };


  const handleRenameKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleRenameCommit(id);
    } else if (e.key === 'Escape') {
      setEditingSessionId(null);
    }
  };

  const handleThemeChange = (checked: boolean) => {
    setIsDark(checked);
    if (checked) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Synchronously update selection tokens to prevent flash
    const activeBg = checked ? customBgDark : customBgLight;
    if (!activeBg || isIncognito) {
      document.documentElement.style.setProperty('--selection-bg', checked ? 'oklch(0.7 0.2 300 / 30%)' : 'oklch(0.6 0.2 300 / 20%)');
      document.documentElement.style.setProperty('--selection-text', checked ? 'oklch(0.9 0.1 300)' : 'oklch(0.4 0.2 300)');
    }

    // Trigger analysis immediately for contrast synchronization
    analyzeBackground();
  };

  const handleChangeBackground = async () => {
    try {
      const mode = isDark ? 'dark' : 'light';
      const path = await invoke<string>('set_background_image', { mode });
      if (mode === 'light') {
        setCustomBgLight(path);
      } else {
        setCustomBgDark(path);
      }
      toast.success('Background updated');
    } catch (err) {
      if (err !== 'No file selected') {
        console.error('Failed to set background:', err);
        toast.error('Failed to set background');
      }
    }
  };

  const updateActiveSessionInList = async (updatedMessages: Message[]) => {
    if (isIncognito) return;

    let currentSessionId = activeSessionIdRef.current;
    let existing = recentChats.find(c => c.id === currentSessionId);

    const title = existing?.title || updatedMessages[0].content.substring(0, 40);
    const sessionToSave: ChatSession = {
      id: currentSessionId || '',
      title,
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
        setActiveSessionId(savedId);
        activeSessionIdRef.current = savedId;
        sessionToSave.id = savedId;
      }

      setRecentChats(prev => {
        const otherChats = prev.filter(c => c.id !== savedId);
        const updatedList = [sessionToSave, ...otherChats];

        return updatedList.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return b.timestamp - a.timestamp;
        });
      });
    } catch (err) {
      console.error('Failed to save chat session:', err);
    }
  };

  const contextIntelligence = useModelParams(state => state.contextIntelligence);

  const hasCustomBgValue = useMemo(() => !!(!isIncognito && (isDark ? customBgDark : customBgLight)), [isIncognito, isDark, customBgDark, customBgLight]);

  const handleSend = async (bypassCheck = false) => {
    if (!input.trim() || isThinking || isStreaming) return;

    const { systemPrompt, temperature, topP, maxTokens, stopStrings, contextIntelligence: ci } = useModelParams.getState();
    const hardwareSafeLimit = ci?.hardware_safe_limit || 8192;

    if (!bypassCheck && maxTokens > hardwareSafeLimit) {
      setIsOverflowModalOpen(true);
      return;
    }

    const userMessage = input.trim();
    setInput('');
    const updatedMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(updatedMessages);

    await updateActiveSessionInList(updatedMessages);
    resetTimer();
    setIsThinking(true);

    let isFirstToken = true;
    streamMessage(
      userMessage,
      selectedModel,
      selectedProvider,
      (token) => {
        if (isFirstToken) {
          setIsThinking(false);
          isFirstToken = false;
          setMessages(prev => [...prev, {
            role: 'ai' as const,
            content: token,
            streaming: true,
            metadata: {
              timestamp: new Date(),
              model: selectedModel
            }
          }]);
        } else {
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === 'ai') {
              return [
                ...prev.slice(0, -1),
                {
                  ...lastMessage,
                  content: lastMessage.content + token,
                  metadata: {
                    ...lastMessage.metadata,
                    ...(stats || {})
                  }
                }
              ];
            }
            return prev;
          });
        }
      },
      (finalStats) => {
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === 'ai') {
            const finalMessages: Message[] = [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                streaming: false,
                metadata: {
                  ...lastMessage.metadata,
                  ...(finalStats || {})
                }
              }
            ];
            setTimeout(() => updateActiveSessionInList(finalMessages), 0);
            return finalMessages;
          }
          return prev;
        });
        setIsThinking(false);
      },
      (error) => {
        setIsThinking(false);
        toast.error(`Error: ${error}`);
      },
      {
        systemPrompt,
        temperature,
        topP,
        maxTokens,
        stopStrings
      }
    );
  };


  return (
    <TooltipProvider>
      <div
        className={`flex flex-col h-screen w-full overflow-hidden font-sans transition-all duration-500 ${isIncognito
          ? (isDark ? "bg-black" : "bg-neutral-100")
          : (!isIncognito && (isDark ? customBgDark : customBgLight))
            ? 'bg-transparent text-foreground'
            : showPinkMode
              ? 'bg-[#fff5f7] text-foreground is-pink-mode'
              : 'bg-background text-foreground'
          } ${(!isIncognito && (isDark ? customBgDark : customBgLight)) ? 'has-custom-bg' : ''}`}
        style={{
          ...(!isIncognito && (isDark ? customBgDark : customBgLight) ? {
            backgroundImage: `url(${convertFileSrc(isDark ? customBgDark : customBgLight)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          } : {}),
          ...(showPinkMode ? {
            background: 'linear-gradient(to bottom, #fff5f7, #ffe4e8)'
          } : {})
        }}
      >
        <header
          data-tauri-drag-region
          className={`h-14 flex items-center justify-between px-4 sticky top-0 z-50 transition-all shrink-0 ${isIncognito
            ? 'border-transparent bg-transparent'
            : showPinkMode
              ? 'bg-gradient-to-r from-pink-300/40 via-rose-200/40 to-fuchsia-200/40 backdrop-blur-xl border-b border-pink-200/30'
              : 'bg-background/40 backdrop-blur-xl border-b border-white/10 dark:border-white/5'
            }`}
        >
          <div className="flex-1 flex items-center justify-start gap-2 pointer-events-none">
            <Button
              variant="ghost"
              size="icon"
              className={`h-9 w-9 rounded-lg transition-all no-drag pointer-events-auto ${sidebarContrast === 'dark' ? 'hover:bg-black/10 text-black' : 'hover:bg-white/10 text-white'
                }`}
              onClick={() => setIsLeftSidebarOpen(prev => !prev)}
            >
              <img
                src={isLeftSidebarOpen ? "/assets/open-state-left.svg" : "/assets/closed-state-left.svg"}
                className={`h-5 w-5 transition-all duration-300 ${sidebarContrast === 'dark' ? 'brightness-0' : 'brightness-0 invert'}`}
                alt="Toggle Left Sidebar"
              />
            </Button>
            {isIncognito && <span className="font-bold tracking-wider uppercase text-xs ml-2 pointer-events-none">Incognito</span>}
          </div>

          {/* Center: Model Selection */}
          <div className="flex-1 flex items-center justify-center gap-2 pointer-events-none">
            <div className="flex items-center gap-2 no-drag pointer-events-auto">
              <ModelSelector
                selectedProvider={selectedProvider}
                setSelectedProvider={setSelectedProvider}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                contrast={headerContrast}
              />
              {!isIncognito && selectedProvider.startsWith('local_') && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 opacity-50 hover:opacity-100 transition-opacity no-drag"
                  onClick={async () => {
                    try {
                      await invoke('eject_model', {
                        provider: selectedProvider,
                        modelId: selectedModel
                      });
                      setSelectedModel('');
                      setSelectedProvider('');
                      toast.success('Model ejected successfully');
                    } catch (err) {
                      console.error('Failed to eject model:', err);
                      toast.error('Failed to eject model');
                    }
                  }}
                >
                  <img src="/assets/eject.svg" className="h-5 w-5 dark:invert" alt="Eject" />
                </Button>
              )}
            </div>
          </div>

          {/* Right Side: System Controls */}
          <div className="flex-1 flex items-center justify-end gap-2 pointer-events-none">
            <div className="flex items-center gap-2 no-drag pointer-events-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleIncognito}
                className={`h-9 w-9 rounded-lg transition-all ${isIncognito
                  ? (isDark ? "text-white hover:bg-white/10" : "text-black hover:bg-black/10")
                  : (headerContrast === 'dark' ? "text-black hover:bg-black/10" : "text-white hover:bg-white/10")
                  }`}
              >
                <Ghost className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center gap-4 no-drag pointer-events-auto">
              <Switch checked={isDark} onChange={handleThemeChange} />
              <RightSidebarToggle headerContrast={headerContrast} />
              <WindowControls isIncognito={isIncognito} contrast={headerContrast} />
            </div>
          </div>
        </header>

        {/* ZONE */}
        <div className="flex flex-1 overflow-hidden relative">
          <SidebarProvider open={isLeftSidebarOpen} onOpenChange={setIsLeftSidebarOpen} className="h-full min-h-0">
            <ChatSidebar
              recentChats={recentChats}
              activeSessionId={activeSessionId || ''}
              handleSwitchSession={handleSwitchSession}
              setActiveSessionId={setActiveSessionId as any}
              setMessages={setMessages}
              setRecentChats={setRecentChats}
              handleNewChat={() => {
                setActiveSessionId(null);
                setMessages([]);
              }}
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
                    : ""
              }
              contrast={sidebarContrast}
              isPinkMode={showPinkMode}
            />

            <SidebarInset className={`flex flex-col min-w-0 min-h-0 relative bg-transparent border-none`}>
              {/* Main Content */}
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

                      {/* Unified Background Pattern */}
                      <BackgroundPlus
                        plusColor={showPinkMode ? "#db2777" : "#888888"}
                        className={`absolute inset-0 z-0 ${showPinkMode ? "opacity-[0.08]" : "opacity-[0.05] dark:opacity-[0.1]"}`}
                        fade={true}
                        plusSize={40}
                      />

                      {/* Content Layer */}
                      <div className="flex-1 relative z-10 flex flex-col min-h-0">
                        <ChatArea
                          messages={messages}
                          isThinking={isThinking}
                          selectedModel={selectedModel}
                          isDark={isDark}
                          setInput={stableSetInput}
                          isIncognito={isIncognito}
                          hasCustomBg={hasCustomBgValue}
                          isPinkMode={showPinkMode}
                        />

                        {/* Input Area */}
                        <div className="relative z-20">
                          <ChatInput
                            input={input}
                            setInput={handleInputChange}
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
      </div>

      <ProfileDialog
        isOpen={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        profileName={profileName}
        setProfileName={setProfileName}
        profileEmail={profileEmail}
        setProfileEmail={setProfileEmail}
      />

      <SettingsDialog
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        isDark={isDark}
        onThemeChange={handleThemeChange}
        enterToSend={enterToSend}
        setEnterToSend={setEnterToSend}
        setMessages={setMessages}
        setRecentChats={setRecentChats}
        setActiveSessionId={setActiveSessionId}
      />

      <ContextOverflowModal
        isOpen={isOverflowModalOpen}
        onClose={() => setIsOverflowModalOpen(false)}
        onConfirm={() => {
          setIsOverflowModalOpen(false);
          handleSend(true);
        }}
        hardwareSafeLimit={contextIntelligence?.hardware_safe_limit || 8192}
        requestedTokens={useModelParams.getState().maxTokens}
      />

    </TooltipProvider>
  );
}
