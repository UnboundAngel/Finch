import React, { useState } from 'react';
import {
  SidebarProvider,
} from '@/components/ui/sidebar';
import { Button, buttonVariants } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Ghost,
  Eject,
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

const SidebarToggleButton = () => {
  const { state, toggleSidebar } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 hover:bg-muted/50 rounded-lg transition-colors"
      onClick={toggleSidebar}
    >
      {state === "expanded" ? <PanelLeftClose className="h-5 w-5 text-muted-foreground" /> : <PanelLeftOpen className="h-5 w-5 text-muted-foreground" />}
    </Button>
  );
};

const SidebarIncognitoController = ({ isIncognito, children }: { isIncognito: boolean, children: React.ReactNode }) => {
  const { setOpen } = useSidebar();
  
  React.useEffect(() => {
    if (isIncognito) {
      setOpen(false);
    }
  }, [isIncognito, setOpen]);

  return <>{children}</>;
};

export function Dashboard() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [selectedModel, setSelectedModel] = useState('claude-3-5-sonnet-20240620');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWebSearchActive, setIsWebSearchActive] = useState(false);
  const [isIncognito, setIsIncognito] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [enterToSend, setEnterToSend] = useState(true);
  const [profileName, setProfileName] = useState('Jane Doe');
  const [profileEmail, setProfileEmail] = useState('jane.doe@example.com');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const { streamMessage, abort, isStreaming, stats } = useAIStreaming();

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

  const handleSwitchSession = (id: string) => {
    const session = recentChats.find(c => c.id === id);
    if (session) {
      if (isIncognito) {
        setIsIncognito(false);
      }
      setActiveSessionId(id);
      setMessages(session.messages || []);
      toast(`Opened chat: ${session.title}`);
    }
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
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
    } else {
      setIsIncognito(true);
      setActiveSessionId(null);
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
      
      if (activeSessionId === id) {
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
  };

  const updateActiveSessionInList = async (updatedMessages: Message[]) => {
    if (isIncognito) return;

    // Use a local copy of the ID to avoid race conditions with state updates
    let currentSessionId = activeSessionId;
    let existing = recentChats.find(c => c.id === currentSessionId);

    const title = existing?.title || updatedMessages[0].content.substring(0, 40);
    const sessionToSave: ChatSession = {
      id: currentSessionId || '',
      title,
      messages: updatedMessages,
      timestamp: Date.now(),
      model: selectedModel,
      provider: selectedProvider,
      pinned: existing?.pinned || false,
      incognito: false,
      systemPrompt: existing?.systemPrompt || '',
      generationParams: existing?.generationParams || { temperature: 0.7, maxTokens: 2048, topP: 1.0 },
      stats: { totalTokens: 0, totalMessages: updatedMessages.length, averageSpeed: 0 }
    };

    try {
      // Await the save and get the (possibly new) ID
      const savedId = await invoke<string>('save_chat', { chat: sessionToSave });
      
      // Update state only if it was a new chat
      if (!currentSessionId) {
        setActiveSessionId(savedId);
        sessionToSave.id = savedId;
      }

      setRecentChats(prev => {
        // Filter out any older versions of the same chat (prevents duplicates)
        const otherChats = prev.filter(c => c.id !== savedId);
        const updatedList = [sessionToSave, ...otherChats];
        
        // Re-sort with pinning logic
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

  const handleSend = async () => {
    if (!input.trim() || isThinking || isStreaming) return;
    
    const userMessage = input.trim();
    setInput('');
    const updatedMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(updatedMessages);
    
    // Await initial save to ensure activeSessionId is set before stream ends
    await updateActiveSessionInList(updatedMessages);
    
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
        // onComplete
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
            // Perform final save
            updateActiveSessionInList(finalMessages);
            return finalMessages;
          }
          return prev;
        });
        setIsThinking(false);
      },
      (error) => {
        // onError
        setIsThinking(false);
        toast.error(`Error: ${error}`);
      }
    );
  };


  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className={`flex h-screen w-full overflow-hidden font-sans transition-colors duration-500 ${
          isIncognito 
            ? (isDark ? "bg-black" : "bg-neutral-100") 
            : "bg-background text-foreground"
        }`}>
          {/* Sidebar */}
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
          />


          {/* Main Content */}
          <SidebarIncognitoController isIncognito={isIncognito}>
            <main className={`flex-1 flex flex-col min-w-0 min-h-0 relative transition-all duration-500 ease-in-out overflow-hidden ${
              isIncognito 
                ? (isDark 
                    ? "bg-[#0a0a0a] border-[4px] border-[#222] text-[#e5e5e5] m-4 rounded-[24px]" 
                    : "bg-[#fcfaf2] border-[4px] border-black text-[#333] m-4 rounded-[24px]")
                : "bg-background text-foreground"
            }`}>
              {/* Header */}
              <header 
                data-tauri-drag-region
                className={`h-14 flex items-center justify-between px-4 sticky top-0 z-10 backdrop-blur-md transition-all ${
                  isIncognito ? 'border-transparent bg-transparent' : 'bg-background/80 border-b border-muted-foreground/10'
                }`}
              >
                <div className="flex items-center gap-2 no-drag">
                  <SidebarToggleButton />
                  {isIncognito && <span className="font-bold tracking-wider uppercase text-xs ml-2">Incognito</span>}
                </div>
                <div className="flex items-center gap-4 no-drag">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={toggleIncognito} 
                      className={isIncognito ? (isDark ? "text-white" : "text-black") : "text-muted-foreground"}
                    >
                      <Ghost className="h-5 w-5" />
                    </Button>
                  </div>

                  <Separator orientation="vertical" className="h-4" />

                  <div className="flex items-center gap-4">
                    <Switch checked={isDark} onChange={handleThemeChange} />
                    <WindowControls isIncognito={isIncognito} />
                  </div>
                </div>
              </header>

              {/* Model & View Controls Bar */}
              {!isIncognito && (
                <div className="h-12 flex items-center justify-between px-4 border-b border-muted-foreground/10 bg-background/50 backdrop-blur-md z-10 sticky top-14 no-drag">
                  <div className="flex-1" />
                  <div className="flex-1 flex justify-center">
                    <ModelSelector 
                      selectedProvider={selectedProvider}
                      setSelectedProvider={setSelectedProvider}
                      selectedModel={selectedModel}
                      setSelectedModel={setSelectedModel}
                    />
                  </div>
                  <div className="flex-1 flex items-center justify-end gap-2">
                    {selectedProvider.startsWith('local_') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => {
                          setSelectedModel('');
                          setSelectedProvider('');
                        }}
                      >
                        <Eject className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsRightSidebarOpen(prev => !prev)}
                      className="text-muted-foreground"
                    >
                      <img
                        src={isRightSidebarOpen ? "/assets/open-state-right.svg" : "/assets/closed-state-right.svg"}
                        className="h-5 w-5"
                        alt="Toggle Right Sidebar"
                      />
                    </Button>
                  </div>
                </div>
              )}

              {/* Chat Area */}
              <ChatArea 
                messages={messages} 
                isThinking={isThinking} 
                selectedModel={selectedModel} 
                isDark={isDark} 
                setInput={setInput}
                isIncognito={isIncognito}
              />

              {/* Input Area */}
              <ChatInput 
                input={input}
                setInput={setInput}
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
              />
            </main>
            <RightSidebar isOpen={isRightSidebarOpen} />
          </SidebarIncognitoController>
        </div>
      </SidebarProvider>

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

    </TooltipProvider>
  );
}
