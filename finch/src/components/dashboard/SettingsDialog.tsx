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
import { invoke } from '@tauri-apps/api/core';
import { Cloud, Cpu, Sparkles, Zap, Key, Globe, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  setMessages: (messages: Message[]) => void;
  setRecentChats: (chats: ChatSession[]) => void;
  setActiveSessionId: (id: string | null) => void;
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
                              setMessages([]);
                              setRecentChats([]);
                              setActiveSessionId(null);
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
                    description="Power Finch with Claude-3 series models."
                    storeKey="anthropic_api_key"
                    type="key"
                    testCommand="list_anthropic_models"
                  />
                  <ProviderSection 
                    title="OpenAI" 
                    icon={Cloud} 
                    description="Use GPT-4o, o1, and more."
                    storeKey="openai_api_key"
                    type="key"
                    testCommand="list_openai_models"
                  />
                  <ProviderSection 
                    title="Google Gemini" 
                    icon={Zap} 
                    description="Connect Gemini 1.5 Pro and Flash."
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

interface ProviderSectionProps {
  title: string;
  icon: React.ElementType;
  description: string;
  storeKey: string;
  type: 'key' | 'url';
  placeholder?: string;
  testCommand?: string;
  provider?: string;
}

const ProviderSection = ({ title, icon: Icon, description, storeKey, type, placeholder, testCommand, provider }: ProviderSectionProps) => {
  const [value, setValue] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
  };

  React.useEffect(() => {
    const loadValue = async () => {
      try {
        const config: any = await invoke('get_provider_config');
        if (config && config[storeKey]) {
          setValue(config[storeKey]);
        }
      } catch (e) {
        console.error(`Failed to load ${title} config:`, e);
      }
    };
    loadValue();
  }, [storeKey, title]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const config: any = await invoke('get_provider_config') || {
        anthropic_api_key: null,
        openai_api_key: null,
        gemini_api_key: null,
        lmstudio_endpoint: null,
        ollama_endpoint: null,
      };
      
      const updatedConfig = {
        ...config,
        [storeKey]: value || null
      };

      // Remove masked keys from the config we send back to save
      // so we don't overwrite real keys with dots
      const cleanConfig = { ...updatedConfig };
      ['anthropic_api_key', 'openai_api_key', 'gemini_api_key'].forEach(k => {
        if (cleanConfig[k] === "••••••••") {
          delete cleanConfig[k];
        }
      });

      await invoke('save_provider_config', { config: cleanConfig });
      toast.success(`${title} settings updated`);
    } catch (e) {
      toast.error(`Failed to save ${title} settings`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      let models: string[] = [];
      if (testCommand) {
        models = await invoke(testCommand);
      } else if (provider) {
        models = await invoke('list_local_models', { endpoint: value, provider });
      }

      if (models.length > 0) {
        toast.success(`Successfully loaded ${models.length} models from ${title}`);
      } else {
        toast.warning(`No models found for ${title}. Check your ${type === 'key' ? 'API key' : 'endpoint'}.`);
      }
    } catch (e) {
      toast.error(`Connection failed: ${e}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <motion.div 
      variants={itemVariants}
      whileTap={{ scale: 0.98 }}
      className="space-y-4 p-5 border rounded-2xl bg-muted/5 transition-all hover:bg-muted/10 hover:border-primary/30 group"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-lg">{title}</span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground pl-1">
            {type === 'key' ? 'API Access Key' : 'Endpoint URL'}
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={type === 'key' ? 'password' : 'text'}
                placeholder={placeholder || `Enter ${title} ${type === 'key' ? 'key' : 'URL'}...`}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="rounded-xl pl-10 h-11 border-muted-foreground/20 focus:border-primary transition-all"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {type === 'key' ? <Key className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
              </div>
            </div>
            <Button 
              variant="outline" 
              className="rounded-xl h-11 px-4 hover:bg-primary hover:text-white transition-all"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <RefreshCcw className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>

        <Button 
          variant="ghost" 
          className="w-full rounded-xl h-10 gap-2 text-xs font-semibold hover:bg-primary/5 transition-all"
          onClick={handleTest}
          disabled={isTesting || !value}
        >
          {isTesting ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          {type === 'key' ? 'Load Models' : 'Detect Models'}
        </Button>
      </div>
    </motion.div>
  );
};
