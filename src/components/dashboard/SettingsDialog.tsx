import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Switch from '@/components/ui/sky-toggle';
import { toast } from 'sonner';
import { Message, ChatSession } from '../../types/chat';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Cloud, Cpu, Sparkles, Zap, Key, Globe, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { ProviderSection } from './ProviderSection';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isDark: boolean;
  onThemeChange: (checked: boolean) => void;
  enterToSend: boolean;
  setEnterToSend: (enter: boolean) => void;
  setMessages?: (messages: Message[]) => void;
  setRecentChats: (chats: ChatSession[]) => void;
  setActiveSessionId?: (id: string | null) => void;
  onOpenWallpaperPicker?: (mode: 'light' | 'dark') => void;
  onClearWallpapers?: () => void | Promise<void>;
}

export const SettingsDialog = ({
  isOpen,
  onOpenChange,
  isDark,
  onThemeChange,
  enterToSend,
  setEnterToSend,
  setMessages,
  setRecentChats,
  setActiveSessionId,
  onOpenWallpaperPicker,
  onClearWallpapers,
}: SettingsDialogProps) => {
  const [activeTab, setActiveTab] = React.useState('general');

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
      },
    },
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Settings</DialogTitle>
          <DialogDescription>
            Customize your app experience and manage your AI model providers.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/20 p-1 overflow-visible">
            <TabsTrigger value="general" className="rounded-lg py-2">General</TabsTrigger>
            <TabsTrigger value="models" className="rounded-lg py-2">Models & Keys</TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 grid-rows-1 py-6">
            <TabsContent value="general" key="general">
              <motion.div 
                animate={{ 
                  opacity: activeTab === 'general' ? 1 : 0,
                  y: activeTab === 'general' ? 0 : 8,
                  pointerEvents: activeTab === 'general' ? 'auto' : 'none'
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="col-start-1 row-start-1 flex flex-col gap-6"
              >
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Appearance</h4>
                  <div className="flex items-center justify-between p-4 border rounded-2xl bg-muted/5">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">Theme</span>
                      <span className="text-xs text-muted-foreground">Toggle between light and dark mode</span>
                    </div>
                    <Switch checked={isDark} onChange={onThemeChange} />
                  </div>
                  
                  <div className="flex flex-col gap-3 p-4 border rounded-2xl bg-muted/5">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">Chat Background</span>
                      <span className="text-xs text-muted-foreground">Select a custom GIF or image for the chat area</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl flex-1 h-9 gap-2"
                        onClick={() => onOpenWallpaperPicker?.('light')}
                      >
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        Set Light BG
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl flex-1 h-9 gap-2"
                        onClick={() => onOpenWallpaperPicker?.('dark')}
                      >
                        <Zap className="h-4 w-4 text-primary" />
                        Set Dark BG
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="rounded-xl h-9 px-3 text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => void onClearWallpapers?.()}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Chat</h4>
                  <div className="flex items-center justify-between p-4 border rounded-2xl bg-muted/5">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">Enter to Send</span>
                      <span className="text-xs text-muted-foreground">Send messages by pressing Enter</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={!!enterToSend} 
                      onChange={(e) => {
                        setEnterToSend(e.target.checked);
                      }} 
                      className="h-5 w-5 rounded-lg border-muted-foreground/30 text-primary focus:ring-primary cursor-pointer" 
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-destructive uppercase tracking-widest pl-1">Danger Zone</h4>
                  <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-2xl bg-destructive/5">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-destructive">Clear All Conversations</span>
                      <span className="text-xs text-muted-foreground">Permanently delete all your chat history.</span>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger render={<Button variant="destructive" size="sm" className="rounded-xl px-4" />}>
                        Clear All
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl border-muted-foreground/20 shadow-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-xl">Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription className="text-muted-foreground">
                            This action cannot be undone. This will permanently delete all your 
                            local chat sessions and clear the current conversation.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2">
                          <AlertDialogCancel className="rounded-xl border-muted-foreground/20">Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                              setMessages?.([]);
                              setRecentChats([]);
                              setActiveSessionId?.(null);
                              toast.error('All chat history cleared');
                              onOpenChange(false);
                            }}
                          >
                            Delete Everything
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="models" key="models">
              <motion.div 
                animate={{ 
                  opacity: activeTab === 'models' ? 1 : 0,
                  y: activeTab === 'models' ? 0 : 8,
                  pointerEvents: activeTab === 'models' ? 'auto' : 'none'
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="col-start-1 row-start-1"
              >
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate={activeTab === 'models' ? "show" : "hidden"}
                  className="space-y-8 h-[400px] overflow-y-auto px-4 pb-12 scrollbar-hide"
                >
                  <ProviderSection 
                    title="Anthropic" 
                    icon={Sparkles} 
                    description="Power Finch with Claude-4 series models."
                    storeKey="anthropic_api_key"
                    type="key"
                    testCommand="list_anthropic_models"
                  />
                  <ProviderSection 
                    title="OpenAI" 
                    icon={Cloud} 
                    description="Use GPT-5.4, o3, and more."
                    storeKey="openai_api_key"
                    type="key"
                    testCommand="list_openai_models"
                  />
                  <ProviderSection 
                    title="Google Gemini" 
                    icon={Zap} 
                    description="Connect Gemini 3.1 Pro and Flash."
                    storeKey="gemini_api_key"
                    type="key"
                    testCommand="list_gemini_models"
                  />
                  <ProviderSection 
                    title="LM Studio" 
                    icon={Cpu} 
                    description="Connect local models via LM Studio OpenAI server."
                    storeKey="lmstudio_endpoint"
                    type="url"
                    placeholder="http://localhost:1234"
                    provider="local_lmstudio"
                  />
                  <ProviderSection 
                    title="Ollama" 
                    icon={Cpu} 
                    description="Connect local models running in Ollama."
                    storeKey="ollama_endpoint"
                    type="url"
                    placeholder="http://localhost:11434"
                    provider="local_ollama"
                  />
                </motion.div>
              </motion.div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end pt-2">
          <Button onClick={() => onOpenChange(false)} className="rounded-xl px-6">Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

