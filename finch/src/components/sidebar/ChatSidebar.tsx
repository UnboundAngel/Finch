import React from 'react';
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
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Message, ChatSession } from '../../types/chat';
import { getChatIcon } from '../../lib/chatHelpers';

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
}: ChatSidebarProps) => {
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const isAiNamed = (title: string) => {
    const aiNames = ['Claude', 'GPT', 'Gemini', 'Llama', 'DeepSeek', 'Mistral'];
    return aiNames.some(name => title.toLowerCase().includes(name.toLowerCase()));
  };

  return (
    <Sidebar>
      <SidebarHeader data-tauri-drag-region className="p-4 select-none">
        <div className="no-drag">
          <Button 
            variant="outline" 
            className={`w-full justify-start gap-2 h-10 px-4 rounded-xl shadow-sm bg-background border-muted-foreground/20 transition-all ${isIncognito ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50'}`}
            onClick={isIncognito ? undefined : handleNewChat}
            disabled={isIncognito}
          >
            <Plus className="h-4 w-4" />
            <span className="font-medium">New Chat</span>
          </Button>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              id="sidebar-search-input"
              placeholder="Search chats..." 
              className="pl-9 h-9 rounded-lg bg-muted/50 border-transparent focus-visible:bg-background focus-visible:border-primary/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isIncognito}
            />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {(() => {
          const filteredChats = recentChats.filter(chat => {
            if (!debouncedSearchQuery.trim()) return true;
            const query = debouncedSearchQuery.toLowerCase();
            if (chat.title.toLowerCase().includes(query)) return true;
            return chat.messages.some(m => m.content.toLowerCase().includes(query));
          });
          const pinnedChats = filteredChats.filter(c => c.pinned);
          const unpinnedChats = filteredChats.filter(c => !c.pinned);

          return (
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
                            className={`h-10 px-4 hover:bg-muted/50 rounded-lg mx-2 transition-colors text-muted-foreground hover:text-foreground group ${activeSessionId === chat.id ? 'bg-[oklch(0.488_0.243_264.376)]/15 text-foreground' : ''}`} 
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
                                className={`truncate text-sm font-medium flex-1 ${isAiNamed(chat.title) ? 'italic text-muted-foreground/80' : ''}`}
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
                                <button className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={(e) => handlePinChat(chat.id, e)}>
                                  <Pin className="h-3.5 w-3.5 fill-current" />
                                </button>
                                <button className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={(e) => handleDeleteChat(chat.id, e)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
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
                            className={`h-10 px-4 hover:bg-muted/50 rounded-lg mx-2 transition-colors text-muted-foreground hover:text-foreground group ${activeSessionId === chat.id ? 'bg-[oklch(0.488_0.243_264.376)]/15 text-foreground' : ''}`} 
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
                                className={`truncate text-sm font-medium flex-1 ${isAiNamed(chat.title) ? 'italic text-muted-foreground/80' : ''}`}
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
                                <button className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={(e) => handlePinChat(chat.id, e)}>
                                  <Pin className="h-3.5 w-3.5" />
                                </button>
                                <button className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={(e) => handleDeleteChat(chat.id, e)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
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
  );
};
