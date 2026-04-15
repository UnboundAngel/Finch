import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Globe, Send, Square, Mic, MicOff, Edit2, ExternalLink, ListFilter, Check, Headphones } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { VoiceIndicator } from './VoiceIndicator';
import { ModelMarketplace } from './ModelMarketplace';
import { useVoiceTranscription } from '@/src/hooks/useVoiceTranscription';
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuGroup
} from '@/components/ui/dropdown-menu';
import { SearchOnboarding } from './SearchOnboarding';
import { invoke } from '@tauri-apps/api/core';
import { useChatStore } from '@/src/store/index';

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  handleSend: (bypassCheck?: boolean) => void;
  onStop?: () => void;
  isThinking: boolean;
  attachedFile: File | null;
  setAttachedFile: (file: File | null) => void;
  isWebSearchActive: boolean;
  setIsWebSearchActive: (val: boolean) => void;
  enterToSend: boolean;
  isIncognito?: boolean;
  isDark?: boolean;
  hasCustomBg?: boolean;
  isPinkMode?: boolean;
  isModelLoaded?: boolean;
  onFocus?: () => void;
  isListening?: boolean;
  setIsListening?: (val: boolean) => void;
}

export const ChatInput = ({
  input,
  setInput,
  handleSend,
  onStop,
  isThinking,
  attachedFile,
  setAttachedFile,
  isWebSearchActive,
  setIsWebSearchActive,
  enterToSend,
  isIncognito,
  isDark,
  hasCustomBg,
  isPinkMode,
  isModelLoaded = true,
  onFocus,
  isListening,
  setIsListening,
}: ChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [config, setConfig] = useState<any>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [activeSearchProvider, setActiveSearchProvider] = useState('tavily');
  
  // Controlled Menu States
  const [isSearchMenuOpen, setIsSearchMenuOpen] = useState(false);
  const [isMicMenuOpen, setIsMicMenuOpen] = useState(false);
  
  // Mic Data
  const [audioDevices, setAudioDevices] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('Default');

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const c = await invoke('get_provider_config');
        setConfig(c);
        setConfigLoaded(true);
        if (c?.active_search_provider) {
          setActiveSearchProvider(c.active_search_provider);
        }
      } catch (err) {
        console.error("Failed to load config:", err);
      }
    };
    loadConfig();
  }, []);

  const fetchDevices = async () => {
    try {
      const devices = await invoke<string[]>('list_audio_devices');
      setAudioDevices(devices);
    } catch (err) {
      console.error("Failed to list audio devices:", err);
    }
  };

  const hasSearchKey = !!(config?.tavily_api_key || config?.brave_api_key || config?.searxng_url);
  
  const {
    installedModels,
    downloadingModels,
    isMarketplaceOpen,
    setIsMarketplaceOpen,
    downloadModel,
    startRecording,
    stopRecording,
    status
  } = useVoiceTranscription((text) => {
    const trimmedText = text?.trim();
    // Guard against empty results, blank audio sentinels, or hallucinatory chirping
    if (trimmedText && trimmedText !== '[BLANK_AUDIO]' && !trimmedText.includes('[Birds chirping]')) {
      setInput(trimmedText);
      setTimeout(() => {
        handleSend();
      }, 150);
    } else {
      // No audio detected guard
      toast.error("No audio detected!", { 
        duration: 2500,
        position: 'bottom-center'
      });
    }
  });

  const isMicEnabled = installedModels.length > 0;
  const isTranscribing = status === 'transcribing';

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '56px'; 
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [input, isTranscribing]);

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

  const handleMicClick = () => {
    if (!isMicEnabled) {
      setIsMarketplaceOpen(true);
    } else {
      if (isListening) {
        stopRecording();
        setIsListening?.(false);
      } else {
        startRecording();
        setIsListening?.(true);
      }
    }
  };

  return (
    <div className="flex-shrink-0 w-full z-20 transition-all bg-transparent">
      <style>{`
        @keyframes shimmer-sweep {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .transcription-skeleton {
          background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.1) 50%, transparent 75%);
          background-size: 200% 100%;
          animation: shimmer-sweep 2s infinite linear;
        }
        .dark .transcription-skeleton {
          background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.05) 50%, transparent 75%);
          background-size: 200% 100%;
        }
      `}</style>
      <div className="max-w-3xl mx-auto relative px-4 pb-4 md:px-6 md:pb-6">
        <VoiceIndicator isActive={isListening || false} isPinkMode={isPinkMode} />
        
        <ModelMarketplace 
          isOpen={isMarketplaceOpen}
          onClose={() => setIsMarketplaceOpen(false)}
          installedModels={installedModels}
          downloadingModels={downloadingModels}
          onDownload={downloadModel}
        />

        <div className={`relative flex items-end w-full rounded-2xl transition-all duration-300 overflow-hidden border-[1.5px] ${!isModelLoaded
            ? 'border-destructive/50 bg-background shadow-[0_0_15px_-3px_rgba(239,68,68,0.15)] ring-1 ring-destructive/20'
            : (isWebSearchActive
                ? 'border-blue-500/50 bg-background shadow-[0_0_15px_-3px_rgba(59,130,246,0.1)]'
                : (isIncognito
                  ? (isDark
                    ? 'bg-neutral-900 border-neutral-800 focus-within:border-neutral-700'
                    : 'bg-white border-neutral-300 focus-within:border-neutral-400')
                  : (isPinkMode 
                    ? 'bg-white/80 backdrop-blur-xl border-rose-200 focus-within:ring-1 focus-within:ring-rose-300 focus-within:border-rose-300 shadow-sm' 
                    : (hasCustomBg 
                      ? 'bg-background/20 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/50' 
                      : 'bg-background border-muted-foreground/20 shadow-sm focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/50'))))
          }`}>
          <div className="flex flex-col w-full min-h-[56px]">
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
            
            {isTranscribing ? (
              <div className="w-full flex flex-col gap-2 px-4 py-5 pointer-events-none">
                <div className="h-2 w-3/4 rounded-full bg-muted/40 transcription-skeleton" />
                <div className="h-2 w-1/2 rounded-full bg-muted/40 transcription-skeleton" />
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={onFocus}
                placeholder="Message..."
                className="w-full max-h-[40vh] min-h-[56px] resize-none bg-transparent px-4 py-4 text-sm focus:outline-none placeholder:text-muted-foreground/70"
                rows={1}
              />
            )}

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
                
                <div className="inline-flex relative">
                  <DropdownMenu open={isSearchMenuOpen} onOpenChange={setIsSearchMenuOpen}>
                    <Popover open={showOnboarding && !hasSearchKey} onOpenChange={setShowOnboarding}>
                      <PopoverAnchor asChild>
                        <div className="inline-flex relative">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 rounded-lg transition-colors ${isWebSearchActive ? 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                            onClick={(e) => {
                              if (!configLoaded) return;
                              if (!hasSearchKey) {
                                setShowOnboarding(true);
                              } else {
                                setIsWebSearchActive(!isWebSearchActive);
                                toast(isWebSearchActive ? 'Web Research disabled' : 'Web Research enabled');
                              }
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (hasSearchKey) {
                                setIsSearchMenuOpen(true);
                              } else {
                                setShowOnboarding(true);
                              }
                            }}
                          >
                            <Globe className="h-4 w-4" />
                          </Button>
                          <DropdownMenuTrigger className="absolute inset-0 opacity-0 pointer-events-none" />
                          <PopoverTrigger className="absolute inset-0 opacity-0 pointer-events-none" />
                        </div>
                      </PopoverAnchor>
                      
                      <DropdownMenuContent align="start" side="top" sideOffset={8} className="w-48 bg-background/80 backdrop-blur-xl border-white/10 rounded-xl p-1 shadow-2xl">
                        <DropdownMenuGroup>
                          <DropdownMenuItem 
                            className="text-xs rounded-lg gap-2 cursor-pointer"
                            onClick={() => {
                              setOnboardingStep(3);
                              setShowOnboarding(true);
                            }}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            Edit API Keys
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-xs rounded-lg gap-2 cursor-pointer"
                            onClick={() => window.open('https://tavily.com/', '_blank')}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View Documentation
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        
                        <DropdownMenuSeparator className="opacity-50" />
                        
                        <DropdownMenuGroup>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="text-xs rounded-lg gap-2 cursor-pointer focus:bg-blue-500/10 focus:text-blue-400">
                              <ListFilter className="h-3.5 w-3.5" />
                              Search Provider
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="bg-background/90 backdrop-blur-xl border-white/10 rounded-xl p-1 shadow-2xl">
                              {(['tavily', 'brave', 'searxng'] as const).map((p) => (
                                <DropdownMenuItem
                                  key={p}
                                  onClick={async () => {
                                    try {
                                      await invoke('update_search_config', { 
                                        config: { active_search_provider: p } 
                                      });
                                      setActiveSearchProvider(p);
                                      toast.success(`Search provider set to ${p}`);
                                    } catch (e: any) {
                                      toast.error(e.toString());
                                    }
                                  }}
                                  className="text-xs rounded-lg flex items-center justify-between cursor-pointer"
                                >
                                  <span className="capitalize">{p}</span>
                                  {activeSearchProvider === p && <Check className="h-3 w-3" />}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>

                      <PopoverContent side="top" align="start" sideOffset={12} className="p-0 border-none bg-transparent shadow-none overflow-visible w-auto">
                        <div className="p-4 bg-background border border-white/10 rounded-2xl shadow-2xl">
                          <SearchOnboarding 
                            initialStep={onboardingStep}
                            onComplete={(key) => {
                              const newConfig = { ...config };
                              if (activeSearchProvider === 'tavily') newConfig.tavily_api_key = key;
                              else if (activeSearchProvider === 'brave') newConfig.brave_api_key = key;
                              else newConfig.searxng_url = key;
                              
                              setConfig(newConfig);
                              setIsWebSearchActive(true);
                              setShowOnboarding(false);
                            }}
                            onClose={() => {
                              setShowOnboarding(false);
                              setOnboardingStep(0);
                            }}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </DropdownMenu>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex relative">
                  <DropdownMenu open={isMicMenuOpen} onOpenChange={setIsMicMenuOpen}>
                    <div className="inline-flex relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8 rounded-lg transition-all relative overflow-hidden",
                          !isMicEnabled 
                            ? "text-destructive hover:bg-destructive/10" 
                            : (isListening ? "text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")
                        )}
                        onClick={handleMicClick}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (isMicEnabled) {
                            fetchDevices();
                            setIsMicMenuOpen(true);
                          }
                        }}
                      >
                        {isMicEnabled ? (
                          <Mic className={cn("h-4 w-4", isListening && "animate-pulse")} />
                        ) : (
                          <MicOff className="h-4 w-4" />
                        )}
                      </Button>
                      <DropdownMenuTrigger className="absolute inset-0 opacity-0 pointer-events-none" />
                    </div>
                    
                    <DropdownMenuContent align="end" side="top" sideOffset={8} className="w-64 bg-background/80 backdrop-blur-xl border-white/10 rounded-xl p-1 shadow-2xl">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                          Microphone Input
                        </DropdownMenuLabel>
                        <DropdownMenuRadioGroup value={selectedDevice} onValueChange={async (val) => {
                          try {
                            await invoke('set_audio_device', { name: val });
                            setSelectedDevice(val);
                            toast.success(`Microphone set to ${val}`);
                          } catch (e: any) {
                            toast.error(e.toString());
                          }
                        }}>
                          {audioDevices.length > 0 ? (
                            audioDevices.map((device) => (
                              <DropdownMenuRadioItem 
                                key={device} 
                                value={device}
                                className="text-xs rounded-lg gap-2 cursor-pointer"
                              >
                                <Headphones className="h-3.5 w-3.5" />
                                <span className="truncate">{device}</span>
                              </DropdownMenuRadioItem>
                            ))
                          ) : (
                            <div className="text-[10px] text-muted-foreground px-2 py-2 italic text-center">
                              No devices found
                            </div>
                          )}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Button
                  size="icon"
                  className={`h-8 w-8 rounded-lg transition-all ${isThinking
                      ? 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90'
                      : (input.trim() ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed')
                    }`}
                  disabled={!isThinking && !input.trim()}
                  onClick={isThinking ? onStop : handleSend}
                >
                  {isThinking ? <Square className="h-4 w-4 fill-current" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="text-center mt-1">
          <span className={`text-[10px] transition-colors duration-300 ${isPinkMode ? 'text-rose-500 font-medium' : (hasCustomBg ? 'text-muted-foreground opacity-100 font-medium' : 'text-muted-foreground/70')}`}>
            AI can make mistakes. Please verify important information.
          </span>
        </div>
      </div>
    </div>
  );
};
