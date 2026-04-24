import React, { useMemo, useDeferredValue, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { resolveMediaSrc } from '@/src/lib/mediaPaths';
import { useDebounce } from '../../hooks/useDebounce';
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
} from '@/components/ui/sidebar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Settings,
  User,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  Pin,
  Trash2,
  Palette,
  MessageSquare,
  Layers,
  Download,
  Code,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Message, ChatSession } from '../../types/chat';
import { getChatIcon, isAiNamed } from '../../lib/chatHelpers';
import { useProfileStore, useChatStore } from '@/src/store';
import { PinIconButton } from '@/components/ui/pin-icon-button';

interface ChatSidebarProps {
  recentChats: ChatSession[];
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  handleNewChat: () => void;
  isIncognito: boolean;
  setIsIncognito: (val: boolean) => void;
  setMessages: (messages: Message[]) => void;
  editingSessionId: string | null;
  setEditingSessionId: (id: string | null) => void;
  editingTitle: string;
  setEditingTitle: (title: string) => void;
  handleRenameKeyDown: (e: React.KeyboardEvent, id: string) => void;
  handleRenameCommit: (id: string) => void;
  handlePinChat: (id: string, e: React.MouseEvent) => void;
  handleDeleteChat: (id: string, e: React.MouseEvent) => void;
  profileName: string;
  profileEmail: string;
  setIsProfileOpen: (val: boolean) => void;
  setIsSettingsOpen: (val: boolean) => void;
  setRecentChats: (chats: ChatSession[]) => void;
  setProfileName: (name: string) => void;
  setProfileEmail: (email: string) => void;
  handleSwitchSession: (id: string) => void;
  className?: string;
  contrast?: 'light' | 'dark';
  isPinkMode?: boolean;
  abort?: () => void;
}

export const ChatSidebar = ({
  recentChats,
  activeSessionId,
  setActiveSessionId,
  searchQuery,
  setSearchQuery,
  handleNewChat,
  setMessages,
  editingSessionId,
  setEditingSessionId,
  editingTitle,
  setEditingTitle,
  handleRenameKeyDown,
  handleRenameCommit,
  handlePinChat,
  handleDeleteChat,
  profileName,
  profileEmail,
  setIsProfileOpen,
  setIsSettingsOpen,
  setRecentChats,
  setProfileName,
  setProfileEmail,
  handleSwitchSession,
  isIncognito,
  setIsIncognito,
  className,
  contrast,
  isPinkMode,
  abort,
}: ChatSidebarProps) => {
  const activeWorkspace = useChatStore(state => state.activeWorkspace);
  const setActiveWorkspace = useChatStore(state => state.setActiveWorkspace);
  const setActiveProfile = useProfileStore(state => state.setActiveProfile);
  const activeProfile = useProfileStore(state => state.activeProfile);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const deferredQuery = useDeferredValue(debouncedSearchQuery);
  const [, startTransition] = useTransition();
  const hasLoggedSidebarButtonsRef = React.useRef(false);

  const { pinnedChats, unpinnedChats } = useMemo(() => {
    const filtered = recentChats.filter(chat => {
      if (!deferredQuery.trim()) return true;
      const query = deferredQuery.toLowerCase();
      if (chat.title.toLowerCase().includes(query)) return true;
      return chat.messages.some(m => m.content.toLowerCase().includes(query));
    });
    return {
      pinnedChats: filtered.filter(c => c.pinned),
      unpinnedChats: filtered.filter(c => !c.pinned),
    };
  }, [recentChats, deferredQuery]);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to switch profiles? This will end your current session.')) {
      localStorage.removeItem('finch_remembered_profile');
      setActiveProfile(null);
      toast.success('Switched profile');
    }
  };

  if (!hasLoggedSidebarButtonsRef.current && (pinnedChats.length > 0 || unpinnedChats.length > 0)) {
    hasLoggedSidebarButtonsRef.current = true;
  }

  return (
    <Sidebar variant="sidebar" className={cn(
      activeWorkspace === 'studio' 
        ? "!absolute !top-16 !bottom-4 !left-4 !h-auto !rounded-2xl !overflow-hidden shadow-2xl border border-white/10"
        : "!absolute !top-3 !bottom-20 !left-3 !h-auto !rounded-xl !overflow-hidden shadow-xl border border-black/15 dark:border-black/35",
      className
    )}>
      <SidebarHeader className="p-4 select-none">
        <div className="no-drag">
          <div className="flex bg-muted/30 p-1 rounded-xl mb-4">
            <button 
              onClick={() => setActiveWorkspace('chat', abort)}
              className={cn("flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-sm transition-all", activeWorkspace === 'chat' ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground")}
              title="Chat Workspace"
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </button>
            <button 
              onClick={() => setActiveWorkspace('studio', abort)}
              className={cn("flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-sm transition-all", activeWorkspace === 'studio' ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground")}
              title="Studio Workspace"
            >
              <Palette className="w-4 h-4" />
              Studio
            </button>
          </div>
          {activeWorkspace === 'studio' ? (
            <>
              <Button
                variant="ghost"
                className={`w-full justify-start gap-2 h-8 px-2 rounded-lg transition-none text-sm ${isIncognito ? 'opacity-50 cursor-not-allowed' : (isPinkMode ? 'hover:bg-rose-200/40 text-foreground' : (contrast === 'light' ? 'hover:bg-white/10 text-white' : 'hover:bg-white/8 text-foreground'))}`}
                disabled={isIncognito}
              >
                <Plus className="h-4 w-4" />
                <span>New canvas</span>
              </Button>
              <div className="mt-4 relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none transition-colors duration-200 group-focus-within:text-muted-foreground" />
                <Input
                  placeholder="Search canvases..."
                  className={`pl-9 h-9 rounded-lg border-transparent transition-[background-color,border-color,box-shadow] duration-200 ease-out focus-visible:bg-background focus-visible:border-primary/50 ${isPinkMode ? 'bg-white/40 placeholder:text-rose-400/70' : (contrast === 'light' ? 'bg-white/5 placeholder:text-white/40' : 'bg-muted/50')}`}
                  disabled={isIncognito}
                />
              </div>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                className={`w-full justify-start gap-2 h-8 px-2 rounded-lg transition-none text-sm ${isIncognito ? 'opacity-50 cursor-not-allowed' : (isPinkMode ? 'hover:bg-rose-200/40 text-foreground' : (contrast === 'light' ? 'hover:bg-white/10 text-white' : 'hover:bg-white/8 text-foreground'))}`}
                onClick={isIncognito ? undefined : handleNewChat}
                disabled={isIncognito}
              >
                <Plus className="h-4 w-4" />
                <span>New chat</span>
              </Button>
              <div className="mt-4 relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none transition-colors duration-200 group-focus-within:text-muted-foreground" />
                <Input
                  id="sidebar-search-input"
                  placeholder="Search chats..."
                  className={`pl-9 h-9 rounded-lg border-transparent transition-[background-color,border-color,box-shadow] duration-200 ease-out focus-visible:bg-background focus-visible:border-primary/50 ${isPinkMode ? 'bg-white/40 placeholder:text-rose-400/70' : (contrast === 'light' ? 'bg-white/5 placeholder:text-white/40' : 'bg-muted/50')}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isIncognito}
                />
              </div>
            </>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
        {activeWorkspace === 'studio' ? (
          <div className="flex flex-col gap-6 pt-2 pb-6">
            <SidebarGroup>
              <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Studio Tools</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton className={`h-8 px-3 rounded-lg group ${contrast === 'dark' ? 'text-black/70 hover:bg-black/5 hover:text-black' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
                      <Layers className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">Layer Inspector</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton className={`h-8 px-3 rounded-lg group ${contrast === 'dark' ? 'text-black/70 hover:bg-black/5 hover:text-black' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
                      <Palette className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">Design Tokens</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton className={`h-8 px-3 rounded-lg group ${contrast === 'dark' ? 'text-black/70 hover:bg-black/5 hover:text-black' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
                      <Code className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">Export Code</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton className={`h-8 px-3 rounded-lg group ${contrast === 'dark' ? 'text-black/70 hover:bg-black/5 hover:text-black' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
                      <Download className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">Save Assets</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Canvases</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {/* Stub items to show the UI works */}
                  <SidebarMenuItem>
                    <SidebarMenuButton className={`h-8 px-3 rounded-lg group ${contrast === 'dark' ? 'text-black/70 hover:bg-black/5 hover:text-black' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
                      <span className="text-sm font-medium flex-1 overflow-hidden whitespace-nowrap text-ellipsis">Finch Landing Page Colors</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton className={`h-8 px-3 rounded-lg group ${contrast === 'dark' ? 'text-black/70 hover:bg-black/5 hover:text-black' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
                      <span className="text-sm font-medium flex-1 overflow-hidden whitespace-nowrap text-ellipsis">Dashboard Theme Options</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        ) : (
          <>
            {pinnedChats.length > 0 && (
                <SidebarGroup className={isIncognito ? 'opacity-50 pointer-events-none' : ''}>
                  <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pinned</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {pinnedChats.map((chat) => (
                        <SidebarMenuItem key={chat.id}>
                          <SidebarMenuButton
                            isActive={activeSessionId === chat.id}
                            className={`h-8 px-3 hover:bg-muted/50 rounded-lg transition-none group ${activeSessionId === chat.id
                                ? 'bg-[oklch(0.488_0.243_264.376)]/30 text-foreground font-semibold'
                                : (contrast === 'dark' ? 'text-black/70 hover:text-black font-medium' : 'text-muted-foreground hover:text-foreground')
                              }`}
                            onClick={() => !isIncognito && handleSwitchSession(chat.id)}
                            disabled={isIncognito}
                          >
                            {getChatIcon(activeSessionId === chat.id ? 'active' : chat.type)}
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
                                className={`text-sm font-medium flex-1 overflow-hidden whitespace-nowrap ${isAiNamed(chat.title) ? 'italic text-muted-foreground/80' : ''}`}
                                style={{
                                  maskImage: 'linear-gradient(to right, black 80%, transparent 98%)',
                                  WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 98%)'
                                }}
                                onDoubleClick={(e) => {
                                  if (isIncognito) return;
                                  e.preventDefault();
                                  setEditingSessionId(chat.id);
                                  setEditingTitle(chat.title);
                                }}
                              >
                                {chat.title}
                              </span>
                            )}
                            {!isIncognito && (
                              <div className="hidden group-hover:flex items-center gap-1 ml-auto">
                                <PinIconButton isPinned={true} onToggle={(e) => handlePinChat(chat.id, e)} />
                                <div role="button" className="h-6 w-6 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors" onClick={(e) => handleDeleteChat(chat.id, e)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </div>
                              </div>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
              {unpinnedChats.length > 0 && (
                <SidebarGroup className={isIncognito ? 'opacity-50 pointer-events-none' : ''}>
                  <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {unpinnedChats.map((chat) => (
                        <SidebarMenuItem key={chat.id}>
                          <SidebarMenuButton
                            isActive={activeSessionId === chat.id}
                            className={`h-8 px-3 hover:bg-muted/50 rounded-lg transition-none group ${activeSessionId === chat.id
                                ? 'bg-[oklch(0.488_0.243_264.376)]/30 text-foreground font-semibold'
                                : (contrast === 'dark' ? 'text-black/70 hover:text-black font-medium' : 'text-muted-foreground hover:text-foreground')
                              }`}
                            onClick={() => !isIncognito && handleSwitchSession(chat.id)}
                            disabled={isIncognito}
                          >
                            {getChatIcon(activeSessionId === chat.id ? 'active' : chat.type)}
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
                                className={`text-sm font-medium flex-1 overflow-hidden whitespace-nowrap ${isAiNamed(chat.title) ? 'italic text-muted-foreground/80' : ''}`}
                                style={{
                                  maskImage: 'linear-gradient(to right, black 80%, transparent 98%)',
                                  WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 98%)'
                                }}
                                onDoubleClick={(e) => {
                                  if (isIncognito) return;
                                  e.preventDefault();
                                  setEditingSessionId(chat.id);
                                  setEditingTitle(chat.title);
                                }}
                              >
                                {chat.title}
                              </span>
                            )}
                            {!isIncognito && (
                              <div className="hidden group-hover:flex items-center gap-1 ml-auto">
                                <PinIconButton isPinned={false} onToggle={(e) => handlePinChat(chat.id, e)} />
                                <div role="button" className="h-6 w-6 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors" onClick={(e) => handleDeleteChat(chat.id, e)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </div>
                              </div>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
          )}
        </>
        )}
      </SidebarContent>

      <SidebarFooter className="px-4 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={(props) => (
              <button
                {...props}
                className={buttonVariants({
                  variant: "ghost",
                  className: "w-full justify-start gap-3 h-12 px-2 rounded-xl hover:bg-muted/50 transition-colors"
                })}
              >
                <Avatar className="h-8 w-8 rounded-lg border border-muted-foreground/20">
                  <AvatarImage src={resolveMediaSrc(activeProfile?.avatarUrl) || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces"} alt="User" />
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary">{profileName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start flex-1 overflow-hidden">
                  <span className="text-sm font-medium truncate w-full text-left">{profileName}</span>
                  <span className="text-xs text-muted-foreground truncate w-full text-left">Pro Plan</span>
                </div>
                <div className="p-1.5 rounded-md hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-colors">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            )}
          />
          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border-muted-foreground/20">
            <DropdownMenuItem className="gap-2 p-2 cursor-pointer rounded-lg" onClick={() => startTransition(() => setIsProfileOpen(true))}>
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 p-2 cursor-pointer rounded-lg" onClick={() => startTransition(() => setIsSettingsOpen(true))}>
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span>App Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 p-2 cursor-pointer rounded-lg text-destructive focus:text-destructive focus:bg-destructive/10" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span>Switch Profile</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
