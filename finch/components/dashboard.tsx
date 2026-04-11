import React, { useState, useRef, useEffect } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BackgroundPlus } from '@/components/ui/background-plus';
import {
  Settings,
  User,
  LogOut,
  MoreHorizontal,
  Send,
  Paperclip,
  Globe,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Ghost,
  Pin,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import Switch from '@/components/ui/sky-toggle';
import { Message, ChatSession } from '../src/types/chat';
import { getChatIcon } from '../src/lib/chatHelpers';
import { ChatArea } from '../src/components/chat/ChatArea';
import { useChatPersistence } from '../src/hooks/useChatPersistence';
import { ProfileDialog } from '../src/components/dashboard/ProfileDialog';
import { SettingsDialog } from '../src/components/dashboard/SettingsDialog';
import { useSidebar } from '@/components/ui/sidebar';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useChatPersistence({
    setRecentChats,
    setProfileName,
    setProfileEmail,
    setEnterToSend,
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && enterToSend) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleNewChat = () => {
    if (messages.length > 0 && !isIncognito) {
      const title = messages[0].content.substring(0, 40);
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title,
        messages,
        timestamp: Date.now(),
        type: 'active',
        pinned: false,
        incognito: false,
        systemPrompt: '',
        generationParams: { temperature: 0.7, maxTokens: 2048, topP: 1.0 },
        stats: { totalTokens: 0, totalMessages: messages.length, averageSpeed: 0 }
      };
      const updatedChats = [newSession, ...recentChats];
      setRecentChats(updatedChats);
      localStorage.setItem('finch_chats', JSON.stringify(updatedChats));
    }
    setMessages([]);
    if (!isIncognito) {
      toast.info('Started a new chat');
    }
  };

  const toggleIncognito = () => {
    if (isIncognito) {
      setIsIncognito(false);
      setMessages([]);
    } else {
      setIsIncognito(true);
    }
  };

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const chatToDelete = recentChats.find(c => c.id === id);
    if (!chatToDelete) return;
    
    const updatedChats = recentChats.filter(c => c.id !== id);
    setRecentChats(updatedChats);
    localStorage.setItem('finch_chats', JSON.stringify(updatedChats));
    
    toast('Chat deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          const restoredChats = [...updatedChats, chatToDelete].sort((a, b) => b.timestamp - a.timestamp);
          setRecentChats(restoredChats);
          localStorage.setItem('finch_chats', JSON.stringify(restoredChats));
        }
      },
      duration: 4000
    });
  };

  const handlePinChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedChats = recentChats.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c);
    setRecentChats(updatedChats);
    localStorage.setItem('finch_chats', JSON.stringify(updatedChats));
  };

  const handleRenameCommit = (id: string) => {
    if (editingTitle.trim()) {
      const updatedChats = recentChats.map(c => c.id === id ? { ...c, title: editingTitle.trim() } : c);
      setRecentChats(updatedChats);
      localStorage.setItem('finch_chats', JSON.stringify(updatedChats));
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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '56px'; // Reset height to recalculate
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [input]);

  const handleThemeChange = (checked: boolean) => {
    setIsDark(checked);
    if (checked) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSend = () => {
    if (!input.trim() || isThinking) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsThinking(true);

    // Simulate AI response delay
    setTimeout(() => {
      setIsThinking(false);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: `This is a simulated response from ${selectedModel}. You said: "${userMessage}"`,
        reasoning: `Analyzing the user's request...\nIdentifying key entities: "${userMessage}"\nFormulating a helpful and concise response based on the selected model parameters.\nChecking for safety and policy compliance.\nGenerating final output.`,
        // TODO: wire from API response
        metadata: {
          promptTokens: 142,
          completionTokens: 318,
          tokensPerSecond: 24.6,
          timeToFirstToken: 340,
          totalDuration: 3200,
          model: selectedModel,
          stopReason: 'stop',
          timestamp: new Date()
        }
      }]);
    }, 3000);
  };

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
          {/* Sidebar */}
          <Sidebar>
            <SidebarHeader className="p-4">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 h-10 px-4 rounded-xl shadow-sm bg-background hover:bg-muted/50 border-muted-foreground/20"
                onClick={handleNewChat}
              >
                <Plus className="h-4 w-4" />
                <span className="font-medium">New Chat</span>
              </Button>
              <div className="mt-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search chats..." 
                  className="pl-9 h-9 rounded-lg bg-muted/50 border-transparent focus-visible:bg-background focus-visible:border-primary/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </SidebarHeader>
            <SidebarContent>
              {(() => {
                const filteredChats = recentChats.filter(chat => {
                  if (!searchQuery.trim()) return true;
                  const query = searchQuery.toLowerCase();
                  if (chat.title.toLowerCase().includes(query)) return true;
                  return chat.messages.some(m => m.content.toLowerCase().includes(query));
                });
                const pinnedChats = filteredChats.filter(c => c.pinned);
                const unpinnedChats = filteredChats.filter(c => !c.pinned);

                return (
                  <>
                    {pinnedChats.length > 0 && (
                      <SidebarGroup>
                        <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pinned</SidebarGroupLabel>
                        <SidebarGroupContent>
                          <SidebarMenu>
                            {pinnedChats.map((chat) => (
                              <SidebarMenuItem key={chat.id}>
                                <SidebarMenuButton 
                                  className="h-10 px-4 hover:bg-muted/50 rounded-lg mx-2 transition-colors text-muted-foreground hover:text-foreground group" 
                                  onClick={() => { 
                                    if (isIncognito) setIsIncognito(false);
                                    setMessages(chat.messages || []); 
                                    toast(`Opened chat: ${chat.title}`); 
                                  }}
                                >
                                  {getChatIcon(chat.type)}
                                  {editingSessionId === chat.id ? (
                                    <Input 
                                      autoFocus
                                      value={editingTitle}
                                      onChange={(e) => setEditingTitle(e.target.value)}
                                      onKeyDown={(e) => handleRenameKeyDown(e, chat.id)}
                                      onBlur={() => handleRenameCommit(chat.id)}
                                      className="h-7 text-sm px-2 py-0 border-primary/50"
                                      onClick={(e) => e.preventDefault()}
                                    />
                                  ) : (
                                    <span 
                                      className="truncate text-sm font-medium flex-1"
                                      onDoubleClick={(e) => {
                                        e.preventDefault();
                                        setEditingSessionId(chat.id);
                                        setEditingTitle(chat.title);
                                      }}
                                    >
                                      {chat.title}
                                    </span>
                                  )}
                                  <div className="hidden group-hover:flex items-center gap-1 ml-auto">
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={(e) => handlePinChat(chat.id, e)}>
                                      <Pin className="h-3.5 w-3.5 fill-current" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={(e) => handleDeleteChat(chat.id, e)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            ))}
                          </SidebarMenu>
                        </SidebarGroupContent>
                      </SidebarGroup>
                    )}
                    {unpinnedChats.length > 0 && (
                      <SidebarGroup>
                        <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent</SidebarGroupLabel>
                        <SidebarGroupContent>
                          <SidebarMenu>
                            {unpinnedChats.map((chat) => (
                              <SidebarMenuItem key={chat.id}>
                                <SidebarMenuButton 
                                  className="h-10 px-4 hover:bg-muted/50 rounded-lg mx-2 transition-colors text-muted-foreground hover:text-foreground group" 
                                  onClick={() => { 
                                    if (isIncognito) setIsIncognito(false);
                                    setMessages(chat.messages || []); 
                                    toast(`Opened chat: ${chat.title}`); 
                                  }}
                                >
                                  {getChatIcon(chat.type)}
                                  {editingSessionId === chat.id ? (
                                    <Input 
                                      autoFocus
                                      value={editingTitle}
                                      onChange={(e) => setEditingTitle(e.target.value)}
                                      onKeyDown={(e) => handleRenameKeyDown(e, chat.id)}
                                      onBlur={() => handleRenameCommit(chat.id)}
                                      className="h-7 text-sm px-2 py-0 border-primary/50"
                                      onClick={(e) => e.preventDefault()}
                                    />
                                  ) : (
                                    <span 
                                      className="truncate text-sm font-medium flex-1"
                                      onDoubleClick={(e) => {
                                        e.preventDefault();
                                        setEditingSessionId(chat.id);
                                        setEditingTitle(chat.title);
                                      }}
                                    >
                                      {chat.title}
                                    </span>
                                  )}
                                  <div className="hidden group-hover:flex items-center gap-1 ml-auto">
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={(e) => handlePinChat(chat.id, e)}>
                                      <Pin className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={(e) => handleDeleteChat(chat.id, e)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            ))}
                          </SidebarMenu>
                        </SidebarGroupContent>
                      </SidebarGroup>
                    )}
                  </>
                );
              })()}
            </SidebarContent>
            <SidebarFooter className="p-4">
              <DropdownMenu>
                <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", className: "w-full justify-start gap-3 h-12 px-2 rounded-xl hover:bg-muted/50 transition-colors" })}>
                  <Avatar className="h-8 w-8 rounded-lg border border-muted-foreground/20">
                    <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces" alt="User" />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary">U</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start flex-1 overflow-hidden">
                    <span className="text-sm font-medium truncate w-full text-left">{profileName}</span>
                    <span className="text-xs text-muted-foreground truncate w-full text-left">Pro Plan</span>
                  </div>
                  <div className="p-1.5 rounded-md hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-colors">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border-muted-foreground/20">
                  <DropdownMenuItem className="gap-2 p-2 cursor-pointer rounded-lg" onClick={() => setIsProfileOpen(true)}>
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 p-2 cursor-pointer rounded-lg" onClick={() => setIsSettingsOpen(true)}>
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 p-2 cursor-pointer rounded-lg text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => {
                    localStorage.removeItem('finch_chats');
                    localStorage.removeItem('finch_profile');
                    setRecentChats([]);
                    setMessages([]);
                    setProfileName('Jane Doe');
                    setProfileEmail('jane.doe@example.com');
                    toast.success('Logged out');
                  }}>
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarFooter>
          </Sidebar>

          {/* Main Content */}
          <div className={`flex-1 flex flex-col min-w-0 min-h-0 relative transition-colors duration-300 ${
            isIncognito 
              ? (isDark ? "bg-[#0a0a0a] border-4 border-[#222] text-[#e5e5e5]" : "bg-[#fcfaf2] border-4 border-black text-[#333]")
              : "bg-background text-foreground"
          }`}>
            {/* Header */}
            <header className={`h-14 flex items-center justify-between px-4 sticky top-0 z-10 backdrop-blur-md border-b ${isIncognito ? 'border-transparent bg-transparent' : 'bg-background/80 border-muted-foreground/10'}`}>
              <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-2 mr-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleIncognito} 
                  className={isIncognito ? (isDark ? "text-white" : "text-black") : "text-muted-foreground"}
                >
                  <Ghost className="h-5 w-5" />
                </Button>
                <Switch checked={isDark} onChange={handleThemeChange} />
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
            <div className="flex-shrink-0 w-full p-4 md:p-6 bg-background/80 backdrop-blur-md z-20">
              <div className="max-w-3xl mx-auto relative">
                
                <div className="relative flex items-end w-full rounded-2xl bg-background border border-muted-foreground/20 shadow-sm focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/50 transition-all overflow-hidden">
                  <div className="flex flex-col w-full">
                    {attachedFile && (
                      <div className="px-4 pt-3 pb-1">
                        <div className="inline-flex items-center gap-2 bg-muted/50 border border-muted-foreground/20 rounded-lg px-3 py-1.5 text-sm">
                          <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate max-w-[200px] font-medium">{attachedFile.name}</span>
                          <button 
                            onClick={() => setAttachedFile(null)}
                            className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    )}
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Message Finch..."
                      className="w-full max-h-[40vh] min-h-[56px] resize-none bg-transparent px-4 py-4 text-sm focus:outline-none placeholder:text-muted-foreground/70"
                      rows={1}
                    />
                    <div className="flex items-center justify-between px-3 pb-3 pt-1">
                      <div className="flex items-center gap-1">
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileChange} 
                          className="hidden" 
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`h-8 w-8 rounded-lg transition-colors ${attachedFile ? 'text-primary bg-primary/10 hover:bg-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`h-8 w-8 rounded-lg transition-colors ${isWebSearchActive ? 'text-primary bg-primary/10 hover:bg-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                          onClick={() => {
                            setIsWebSearchActive(!isWebSearchActive);
                            toast(isWebSearchActive ? 'Web Search disabled' : 'Web Search enabled');
                          }}
                        >
                          <Globe className={`h-4 w-4 ${isWebSearchActive ? 'fill-primary' : ''}`} />
                        </Button>
                      </div>
                      <Button 
                        size="icon" 
                        className={`h-8 w-8 rounded-lg transition-all ${input.trim() && !isThinking ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90' : 'bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground cursor-not-allowed'}`}
                        disabled={!input.trim() || isThinking}
                        onClick={handleSend}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="text-center mt-2">
                  <span className="text-[10px] text-muted-foreground/70">Finch can make mistakes. Please verify important information.</span>
                </div>
              </div>
            </div>
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
      />

    </TooltipProvider>
  );
}
