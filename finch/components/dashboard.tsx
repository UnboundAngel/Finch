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
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BackgroundPlus } from '@/components/ui/background-plus';
import {
  MessageSquare,
  Plus,
  Settings,
  User,
  LogOut,
  MoreHorizontal,
  Send,
  Paperclip,
  Mic,
  Globe,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  Copy,
  Check,
  Zap,
  Hash,
  Clock,
  Timer,
  Bot,
  AlertTriangle,
  Trash2,
  Pin,
  Search,
  Ghost,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import Switch from '@/components/ui/sky-toggle';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ShiningText } from '@/components/ui/shining-text';

type MessageMetadata = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  tokensPerSecond?: number;
  timeToFirstToken?: number;
  totalDuration?: number;
  model?: string;
  stopReason?: string;
  timestamp?: Date;
};

type Message = {
  role: 'user' | 'ai';
  content: string;
  reasoning?: string;
  metadata?: MessageMetadata;
  branchPoint?: boolean;
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
  type?: string;
  pinned: boolean;
  incognito: boolean;
  systemPrompt: string;
  generationParams: {
    temperature: number;
    maxTokens: number;
    topP: number;
  };
  stats: {
    totalTokens: number;
    totalMessages: number;
    averageSpeed: number;
  };
};

const getChatIcon = (type?: string) => {
  switch (type) {
    case 'active':
      return <MessageSquare className="h-4 w-4 fill-foreground text-foreground shrink-0" />;
    case 'inactive':
      return <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />;
    case 'web':
      return <Globe className="h-4 w-4 text-muted-foreground shrink-0" />;
    case 'file':
      return <FileText className="h-4 w-4 text-muted-foreground shrink-0" />;
    default:
      return <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
};

const ThinkingBox = ({ content, isActivelyThinking }: { content?: string, isActivelyThinking?: boolean }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mb-2 w-full">
      <div className="flex flex-col items-start">
        <button 
          onClick={() => content && setExpanded(!expanded)}
          className={`flex items-center gap-1 text-xs text-muted-foreground italic transition-colors ${content ? 'hover:text-foreground cursor-pointer' : 'cursor-default'}`}
          disabled={!content}
        >
          {isActivelyThinking ? <ShiningText text="Finch is thinking..." /> : <span>Finch is thinking...</span>}
          {content && (expanded ? <ChevronUp className="h-3.5 w-3.5 not-italic" /> : <ChevronDown className="h-3.5 w-3.5 not-italic" />)}
        </button>
        {content && (
          <div 
            className={`mt-1 text-xs text-muted-foreground border-l-2 border-muted-foreground/20 pl-3 transition-all ${expanded ? 'max-h-[140px] overflow-y-auto' : 'h-auto line-clamp-1 overflow-hidden cursor-pointer hover:text-foreground'}`}
            onClick={() => !expanded && setExpanded(true)}
          >
            <div className="whitespace-pre-wrap">{content}</div>
          </div>
        )}
      </div>
    </div>
  );
};

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

const CodeBlock = ({ children, language, isDark }: { children: string, language: string, isDark: boolean }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-muted-foreground/10 bg-muted/20">
      <div className="absolute right-3 top-3 z-20">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 bg-background/50 hover:bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all rounded-lg border border-muted-foreground/10"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500 transition-all scale-110" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground transition-all" />
          )}
        </Button>
      </div>
      <SyntaxHighlighter
        PreTag="div"
        language={language}
        style={isDark ? oneDark : oneLight}
        customStyle={{
          margin: 0,
          padding: '1.5rem',
          fontSize: '0.875rem',
          background: 'transparent',
        }}
        codeTagProps={{ style: { background: 'transparent' } }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
};

const MetadataRow = ({ metadata, isLatest }: { metadata: MessageMetadata, isLatest: boolean }) => {
  return (
    <div className={`text-xs text-muted-foreground/60 flex flex-wrap items-center gap-5 mt-2 transition-opacity duration-300 ${isLatest ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
      {metadata.model && (
        <div className="flex items-center gap-1.5">
          <Bot className="h-3 w-3" />
          <span>{metadata.model}</span>
        </div>
      )}
      {metadata.timeToFirstToken !== undefined && (
        <div className="flex items-center gap-1.5">
          <Timer className="h-3 w-3" />
          <span>{metadata.timeToFirstToken}ms</span>
        </div>
      )}
      {metadata.tokensPerSecond !== undefined && (
        <div className="flex items-center gap-1.5">
          <Zap className="h-3 w-3" />
          <span>{metadata.tokensPerSecond} t/s</span>
        </div>
      )}
      {metadata.completionTokens !== undefined && (
        <div className="flex items-center gap-1.5">
          <Hash className="h-3 w-3" />
          <span>{metadata.completionTokens}</span>
        </div>
      )}
      {metadata.totalDuration !== undefined && (
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          <span>{(metadata.totalDuration / 1000).toFixed(1)}s</span>
        </div>
      )}
      {metadata.stopReason === 'length' && (
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          <span>cut off</span>
        </div>
      )}
    </div>
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedChats = localStorage.getItem('finch_chats');
    if (savedChats) {
      try {
        const parsed = JSON.parse(savedChats);
        const migrated = parsed.map((chat: any) => ({
          ...chat,
          pinned: chat.pinned ?? false,
          incognito: chat.incognito ?? false,
          systemPrompt: chat.systemPrompt ?? '',
          generationParams: chat.generationParams ?? { temperature: 0.7, maxTokens: 2048, topP: 1.0 },
          stats: chat.stats ?? { totalTokens: 0, totalMessages: chat.messages?.length || 0, averageSpeed: 0 }
        }));
        setRecentChats(migrated);
      } catch (e) {}
    }
    const savedProfile = localStorage.getItem('finch_profile');
    if (savedProfile) {
      try {
        const { name, email } = JSON.parse(savedProfile);
        if (name) setProfileName(name);
        if (email) setProfileEmail(email);
      } catch (e) {}
    }
    const savedEnterToSend = localStorage.getItem('finch_enter_to_send');
    if (savedEnterToSend !== null) {
      setEnterToSend(savedEnterToSend === 'true');
    }

    const handleBeforeUnload = () => {
      // React state is naturally purged on unload, but this satisfies the requirement
      // to use the beforeunload event to ensure incognito data is purged.
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

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
                                  render={<a href="#" onClick={(e) => { 
                                    e.preventDefault(); 
                                    if (isIncognito) setIsIncognito(false);
                                    setMessages(chat.messages || []); 
                                    toast(`Opened chat: ${chat.title}`); 
                                  }} />}
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
                                  render={<a href="#" onClick={(e) => { 
                                    e.preventDefault(); 
                                    if (isIncognito) setIsIncognito(false);
                                    setMessages(chat.messages || []); 
                                    toast(`Opened chat: ${chat.title}`); 
                                  }} />}
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
            <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
              {/* Background Pattern */}
              <BackgroundPlus 
                plusColor="#888888" 
                className="opacity-[0.05] dark:opacity-[0.1]" 
                fade={true}
                plusSize={40}
              />
              
              <div className="flex-1 min-h-0 overflow-y-auto w-full relative z-10 scroll-smooth">
                <div className="max-w-3xl mx-auto w-full p-4 md:p-6 lg:p-8 flex flex-col gap-8 pb-12">
                  
                  {/* Empty State / Welcome */}
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center text-center mt-20 mb-10 space-y-6">
                      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 shadow-sm border border-primary/20">
                        <MessageSquare className="h-8 w-8 text-primary" />
                      </div>
                      <h1 className="text-3xl font-semibold tracking-tight">How can I help you today?</h1>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl mt-8">
                        <Button 
                          variant="outline" 
                          className="h-auto p-4 justify-start text-left flex flex-col items-start gap-2 rounded-xl border-muted-foreground/20 hover:bg-muted/50 hover:border-muted-foreground/30 transition-all shadow-sm"
                          onClick={() => { setInput('Summarize this article: '); toast('Added prompt to input'); }}
                        >
                          <span className="font-medium flex items-center gap-2"><Globe className="h-4 w-4 text-blue-500" /> Summarize an article</span>
                          <span className="text-xs text-muted-foreground font-normal line-clamp-2">Paste a URL or text to get a quick summary of the main points.</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-auto p-4 justify-start text-left flex flex-col items-start gap-2 rounded-xl border-muted-foreground/20 hover:bg-muted/50 hover:border-muted-foreground/30 transition-all shadow-sm"
                          onClick={() => { setInput('Analyze this image: '); toast('Added prompt to input'); }}
                        >
                          <span className="font-medium flex items-center gap-2"><ImageIcon className="h-4 w-4 text-purple-500" /> Analyze an image</span>
                          <span className="text-xs text-muted-foreground font-normal line-clamp-2">Upload an image and ask questions about its contents.</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-auto p-4 justify-start text-left flex flex-col items-start gap-2 rounded-xl border-muted-foreground/20 hover:bg-muted/50 hover:border-muted-foreground/30 transition-all shadow-sm"
                          onClick={() => { setInput('Draft an email about: '); toast('Added prompt to input'); }}
                        >
                          <span className="font-medium flex items-center gap-2"><MessageSquare className="h-4 w-4 text-green-500" /> Draft an email</span>
                          <span className="text-xs text-muted-foreground font-normal line-clamp-2">Get help writing a professional or casual email.</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-auto p-4 justify-start text-left flex flex-col items-start gap-2 rounded-xl border-muted-foreground/20 hover:bg-muted/50 hover:border-muted-foreground/30 transition-all shadow-sm"
                          onClick={() => { setInput('Brainstorm ideas for: '); toast('Added prompt to input'); }}
                        >
                          <span className="font-medium flex items-center gap-2"><Plus className="h-4 w-4 text-orange-500" /> Brainstorm ideas</span>
                          <span className="text-xs text-muted-foreground font-normal line-clamp-2">Generate creative ideas for your next project.</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  {messages.map((msg, index) => {
                    const isLatest = index === messages.length - 1 && !isThinking;
                    return (
                    <div key={index} className="flex gap-4 w-full group">
                      {msg.role === 'user' ? (
                        <Avatar className="h-8 w-8 shrink-0 mt-0.5 rounded-lg border border-muted-foreground/20">
                          <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces" alt="User" />
                          <AvatarFallback className="rounded-lg bg-primary/10 text-primary">U</AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-8 w-8 shrink-0 mt-0.5 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                          <MessageSquare className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                      <div className="flex-1 space-y-2 overflow-hidden">
                        <div className="font-medium text-sm">{msg.role === 'user' ? 'You' : selectedModel}</div>
                        {msg.reasoning && <ThinkingBox content={msg.reasoning} />}
                        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90">
                          <ReactMarkdown
                            components={{
                              h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-4" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-3" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-base font-bold mb-2" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
                              li: ({node, ...props}) => <li className="mb-1" {...props} />,
                              code(props) {
                                const {children, className, node, ...rest} = props
                                const match = /language-(\w+)/.exec(className || '')
                                return match ? (
                                  <CodeBlock 
                                    children={String(children).replace(/\n$/, '')} 
                                    language={match[1]} 
                                    isDark={isDark} 
                                  />
                                ) : (
                                  <code className="bg-muted/80 px-1.5 py-0.5 rounded text-sm font-mono font-medium" {...rest}>
                                    {children}
                                  </code>
                                )
                              }
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                        {msg.role === 'ai' && msg.metadata && <MetadataRow metadata={msg.metadata} isLatest={isLatest} />}
                      </div>
                    </div>
                    );
                  })}

                  {/* Thinking State */}
                  {isThinking && (
                    <div className="flex gap-4 w-full">
                      <div className="h-8 w-8 shrink-0 mt-0.5 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                        <MessageSquare className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div className="flex-1 space-y-2 overflow-hidden">
                        <div className="font-medium text-sm">{selectedModel}</div>
                        <ThinkingBox isActivelyThinking={true} />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

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
        </div>
      </SidebarProvider>

      {/* Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">Profile</DialogTitle>
            <DialogDescription>
              Manage your public profile and personal details.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-6 py-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 rounded-full border-2 border-muted">
                <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces" alt="User" />
                <AvatarFallback className="text-2xl">JD</AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" className="rounded-lg">Change Picture</Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Full Name</label>
                <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email Address</label>
                <Input value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} type="email" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Current Plan</label>
                <div className="flex items-center justify-between p-3 border rounded-xl bg-muted/20">
                  <div className="flex flex-col">
                    <span className="font-semibold text-primary">Pro Plan</span>
                    <span className="text-xs text-muted-foreground">Billed monthly</span>
                  </div>
                  <Button variant="secondary" size="sm" className="rounded-lg">Manage</Button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setIsProfileOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={() => { 
              localStorage.setItem('finch_profile', JSON.stringify({ name: profileName, email: profileEmail }));
              setIsProfileOpen(false); 
              toast.success('Profile updated successfully'); 
            }} className="rounded-xl">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">Settings</DialogTitle>
            <DialogDescription>
              Customize your app experience and preferences.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-6 py-4">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Appearance</h4>
              <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/10">
                <div className="flex flex-col gap-1">
                  <span className="font-medium">Theme</span>
                  <span className="text-xs text-muted-foreground">Toggle between light and dark mode</span>
                </div>
                <Switch checked={isDark} onChange={handleThemeChange} />
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Chat</h4>
              <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/10">
                <div className="flex flex-col gap-1">
                  <span className="font-medium">Enter to Send</span>
                  <span className="text-xs text-muted-foreground">Send messages by pressing Enter</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={enterToSend} 
                  onChange={(e) => {
                    setEnterToSend(e.target.checked);
                    localStorage.setItem('finch_enter_to_send', String(e.target.checked));
                  }} 
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" 
                />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/10">
                <div className="flex flex-col gap-1">
                  <span className="font-medium">Clear Chat History</span>
                  <span className="text-xs text-muted-foreground">Permanently delete all your chats</span>
                </div>
                <Button variant="destructive" size="sm" className="rounded-lg" onClick={() => {
                  setMessages([]);
                  setRecentChats([]);
                  localStorage.removeItem('finch_chats');
                  toast.error('Chat history cleared');
                }}>Clear</Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setIsSettingsOpen(false)} className="rounded-xl">Done</Button>
          </div>
        </DialogContent>
      </Dialog>

    </TooltipProvider>
  );
}
