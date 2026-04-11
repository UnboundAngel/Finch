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
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import Switch from '@/components/ui/sky-toggle';
import { Message, ChatSession } from '@/src/types/chat';
import { ChatArea } from '@/src/components/chat/ChatArea';
import { ChatInput } from '@/src/components/chat/ChatInput';
import { ChatSidebar } from '@/src/components/sidebar/ChatSidebar';
import { useChatPersistence } from '@/src/hooks/useChatPersistence';
import { useAIStreaming } from '@/src/hooks/useAIStreaming';
import { ProfileDialog } from '@/src/components/dashboard/ProfileDialog';
import { SettingsDialog } from '@/src/components/dashboard/SettingsDialog';
import { useSidebar } from '@/components/ui/sidebar';
import { WindowControls } from '@/src/components/dashboard/WindowControls';

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

export function Dashboard() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [selectedModel, setSelectedModel] = useState('Finch 3.5 Sonnet');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWebSearchActive, setIsWebSearchActive] = useState(false);
  const [isIncognito, setIsIncognito] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [enterToSend, setEnterToSend] = useState(true);
  const [profileName, setProfileName] = useState('Jane Doe');
  const [profileEmail, setProfileEmail] = useState('jane.doe@example.com');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const { streamMessage, abort, isStreaming } = useAIStreaming();

  useChatPersistence({
    recentChats,
    setRecentChats,
    profileName,
    setProfileName,
    profileEmail,
    setProfileEmail,
    enterToSend,
    setEnterToSend,
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

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const chatToDelete = recentChats.find(c => c.id === id);
    if (!chatToDelete) return;
    
    const updatedChats = recentChats.filter(c => c.id !== id);
    setRecentChats(updatedChats);
    
    if (activeSessionId === id) {
      handleNewChat();
    }
    
    toast('Chat deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          const restoredChats = [...updatedChats, chatToDelete].sort((a, b) => b.timestamp - a.timestamp);
          setRecentChats(restoredChats);
        }
      },
      duration: 4000
    });
  };

  const handlePinChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedChats = recentChats.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c);
    setRecentChats(updatedChats);
  };

  const handleRenameCommit = (id: string) => {
    if (editingTitle.trim()) {
      const updatedChats = recentChats.map(c => c.id === id ? { ...c, title: editingTitle.trim() } : c);
      setRecentChats(updatedChats);
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

  const updateActiveSessionInList = (updatedMessages: Message[]) => {
    if (isIncognito) return;

    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      currentSessionId = Date.now().toString();
      setActiveSessionId(currentSessionId);
    }

    setRecentChats(prev => {
      const existing = prev.find(c => c.id === currentSessionId);
      if (existing) {
        // Move to top if updated
        const updated = prev.map(c => 
          c.id === currentSessionId 
            ? { ...c, messages: updatedMessages, timestamp: Date.now() } 
            : c
        );
        return updated.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return b.timestamp - a.timestamp;
        });
      } else if (updatedMessages.length > 0) {
        const title = updatedMessages[0].content.substring(0, 40);
        const newSession: ChatSession = {
          id: currentSessionId!,
          title,
          messages: updatedMessages,
          timestamp: Date.now(),
          type: 'active',
          pinned: false,
          incognito: false,
          systemPrompt: '',
          generationParams: { temperature: 0.7, maxTokens: 2048, topP: 1.0 },
          stats: { totalTokens: 0, totalMessages: updatedMessages.length, averageSpeed: 0 }
        };
        return [newSession, ...prev];
      }
      return prev;
    });
  };

  const handleSend = () => {
    if (!input.trim() || isThinking || isStreaming) return;
    
    const userMessage = input.trim();
    setInput('');
    const updatedMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(updatedMessages);
    updateActiveSessionInList(updatedMessages);
    setIsThinking(true);

    let isFirstToken = true;
    streamMessage(
      userMessage,
      selectedModel,
      (token) => {
        if (isFirstToken) {
          setIsThinking(false);
          isFirstToken = false;
          setMessages(prev => {
            const next = [...prev, {
              role: 'ai',
              content: token,
              streaming: true,
              metadata: {
                timestamp: new Date(),
                model: selectedModel,
              }
            }];
            return next;
          });
        } else {
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === 'ai') {
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, content: lastMessage.content + token }
              ];
            }
            return prev;
          });
        }
      },
      () => {
        // onComplete
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === 'ai') {
            const finalMessages: Message[] = [
              ...prev.slice(0, -1),
              { ...lastMessage, streaming: false }
            ];
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
        <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
          {/* Sidebar */}
          <ChatSidebar 
            recentChats={recentChats}
            activeSessionId={activeSessionId}
            handleSwitchSession={handleSwitchSession}
            setActiveSessionId={setActiveSessionId}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handleNewChat={handleNewChat}
            setMessages={setMessages}
            editingSessionId={editingSessionId}
            setEditingSessionId={setEditingSessionId}
            editingTitle={editingTitle}
            setEditingTitle={setEditingTitle}
            handleRenameKeyDown={handleRenameKeyDown}
            handleRenameCommit={handleRenameCommit}
            handlePinChat={handlePinChat}
            handleDeleteChat={handleDeleteChat}
            profileName={profileName}
            setIsProfileOpen={setIsProfileOpen}
            setIsSettingsOpen={setIsSettingsOpen}
            setRecentChats={setRecentChats}
            setProfileName={setProfileName}
            setProfileEmail={setProfileEmail}
          />


          {/* Main Content */}
          <div className={`flex-1 flex flex-col min-w-0 min-h-0 relative transition-colors duration-300 ${
            isIncognito 
              ? (isDark ? "bg-[#0a0a0a] border-4 border-[#222] text-[#e5e5e5]" : "bg-[#fcfaf2] border-4 border-black text-[#333]")
              : "bg-background text-foreground"
          }`}>
            {/* Header */}
            <header 
              data-tauri-drag-region
              className={`h-14 flex items-center justify-between px-4 sticky top-0 z-10 backdrop-blur-md border-b select-none ${isIncognito ? 'border-transparent bg-transparent' : 'bg-background/80 border-muted-foreground/10'}`}
            >
              <div className="flex items-center gap-2 no-drag">
                <SidebarToggleButton />
                {isIncognito && <span className="font-bold tracking-wider uppercase text-xs ml-2">Incognito</span>}
                <DropdownMenu>
                  <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", className: "h-9 px-3 gap-2 rounded-lg hover:bg-muted/50 transition-colors font-semibold text-lg" })}>
                    {selectedModel}
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 rounded-xl shadow-lg border-muted-foreground/20">
                    <DropdownMenuItem 
                      className="flex flex-col items-start p-3 cursor-pointer rounded-lg focus:bg-muted/50"
                      onClick={() => { setSelectedModel('Finch 3.5 Sonnet'); toast.success('Switched to Finch 3.5 Sonnet'); }}
                    >
                      <span className="font-medium">Finch 3.5 Sonnet</span>
                      <span className="text-xs text-muted-foreground mt-1">Most intelligent model</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="flex flex-col items-start p-3 cursor-pointer rounded-lg focus:bg-muted/50"
                      onClick={() => { setSelectedModel('Finch 3 Haiku'); toast.success('Switched to Finch 3 Haiku'); }}
                    >
                      <span className="font-medium">Finch 3 Haiku</span>
                      <span className="text-xs text-muted-foreground mt-1">Fastest and most compact</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center gap-2 mr-4 no-drag">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleIncognito} 
                  className={isIncognito ? (isDark ? "text-white" : "text-black") : "text-muted-foreground"}
                >
                  <Ghost className="h-5 w-5" />
                </Button>
                <Switch checked={isDark} onChange={handleThemeChange} />
                <WindowControls isIncognito={isIncognito} />
              </div>
            </header>

            {/* Chat Area */}
            <ChatArea 
              messages={messages} 
              isThinking={isThinking} 
              selectedModel={selectedModel} 
              isDark={isDark} 
              setInput={setInput} 
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
            />
          </div>
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
