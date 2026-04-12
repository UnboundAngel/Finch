import React, { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Cloud, Cpu, Sparkles, Zap, Bookmark } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BookmarkIconButton } from '@/components/ui/bookmark-icon-button';

interface ModelSelectorProps {
  selectedProvider: string;
  setSelectedProvider: (provider: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

interface ProviderModels {
  id: string;
  name: string;
  icon: React.ElementType;
  models: string[];
}

interface BookmarkedModel {
  providerId: string;
  modelId: string;
}

export const ModelSelector = ({
  selectedProvider,
  setSelectedProvider,
  selectedModel,
  setSelectedModel,
}: ModelSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [bookmarkedModels, setBookmarkedModels] = useState<BookmarkedModel[]>([]);
  const [models, setModels] = useState<{ [key: string]: string[] }>({
    anthropic: [],
    openai: [],
    gemini: [],
    local_ollama: [],
    local_lmstudio: [],
  });

  const providers: ProviderModels[] = [
    { id: 'anthropic', name: 'Anthropic', icon: Sparkles, models: models.anthropic },
    { id: 'openai', name: 'OpenAI', icon: Cloud, models: models.openai },
    { id: 'gemini', name: 'Gemini', icon: Zap, models: models.gemini },
    { id: 'local_ollama', name: 'Ollama', icon: Cpu, models: models.local_ollama },
    { id: 'local_lmstudio', name: 'LM Studio', icon: Cpu, models: models.local_lmstudio },
  ];

  const fetchModels = async () => {
    try {
      const config: any = await invoke('get_provider_config');
      if (!config) return;

      // Try fetching for each provider
      const anthropic = await invoke<string[]>('list_anthropic_models');
      const openai = await invoke<string[]>('list_openai_models');
      const gemini = await invoke<string[]>('list_gemini_models');
      
      let ollama: string[] = [];
      if (config.ollama_endpoint) {
        try {
          ollama = await invoke<string[]>('list_local_models', { 
            endpoint: config.ollama_endpoint, 
            provider: 'local_ollama' 
          });
        } catch (e) { console.error("Ollama fetch failed", e); }
      }

      let lmstudio: string[] = [];
      if (config.lmstudio_endpoint) {
        try {
          lmstudio = await invoke<string[]>('list_local_models', { 
            endpoint: config.lmstudio_endpoint, 
            provider: 'local_lmstudio' 
          });
        } catch (e) { console.error("LM Studio fetch failed", e); }
      }

      setModels({
        anthropic: anthropic || [],
        openai: openai || [],
        gemini: gemini || [],
        local_ollama: ollama || [],
        local_lmstudio: lmstudio || [],
      });

      // Load bookmarks from config
      if (config.bookmarked_models) {
        setBookmarkedModels(config.bookmarked_models);
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const saveBookmarks = async (bookmarks: BookmarkedModel[]) => {
    try {
      await invoke('save_provider_config', {
        config: {
          bookmarked_models: bookmarks
        }
      });
    } catch (e) {
      console.error('Failed to save bookmarks:', e);
    }
  };

  const toggleBookmark = (e: React.MouseEvent, providerId: string, modelId: string) => {
    e.stopPropagation();
    const isBookmarked = bookmarkedModels.some(b => b.providerId === providerId && b.modelId === modelId);
    let newBookmarks;
    if (isBookmarked) {
      newBookmarks = bookmarkedModels.filter(b => !(b.providerId === providerId && b.modelId === modelId));
      toast.info(`Removed ${modelId} from bookmarks`);
    } else {
      newBookmarks = [...bookmarkedModels, { providerId, modelId }];
      toast.success(`Bookmarked ${modelId}`);
    }
    setBookmarkedModels(newBookmarks);
    saveBookmarks(newBookmarks);
  };

  const handleSelect = (providerId: string, modelId: string) => {
    setSelectedProvider(providerId);
    setSelectedModel(modelId);
    toast.success(`Switched to ${modelId}`);
    setIsOpen(false);
  };

  const currentProvider = providers.find(p => p.id === selectedProvider);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger className="flex items-center h-9 px-3 gap-2 rounded-xl hover:bg-muted/50 transition-all font-semibold text-lg border-0 bg-transparent cursor-pointer outline-none active:scale-95 group">
        <div className="p-1 rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
          {currentProvider?.icon && <currentProvider.icon className="h-4 w-4" />}
        </div>
        <span className="truncate max-w-[200px] bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">{selectedModel}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="start" 
        className="w-72 rounded-2xl shadow-2xl border-muted-foreground/10 bg-popover/95 backdrop-blur-xl p-1.5 z-50 overflow-hidden"
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className="overflow-hidden"
            >
              <div className="max-h-[400px] overflow-y-auto pr-1">
                {/* Bookmarked Section */}
                {bookmarkedModels.length > 0 && (
                  <div className="mb-2">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-500/80 flex items-center gap-2 select-none">
                      <Bookmark className="h-3 w-3" />
                      Bookmarked
                    </div>
                    <div className="space-y-0.5">
                      {bookmarkedModels.map((bm) => (
                        <DropdownMenuItem
                          key={`bookmark-${bm.providerId}-${bm.modelId}`}
                          className="relative z-0 flex items-center justify-between px-3 py-2 cursor-pointer rounded-xl focus:bg-accent/50 transition-colors group outline-none"
                          onClick={() => handleSelect(bm.providerId, bm.modelId)}
                        >
                          {selectedModel === bm.modelId && (
                            <motion.div
                              layoutId="active-model-pill"
                              className="absolute inset-0 bg-primary/10 rounded-xl -z-10"
                              transition={{ duration: 0.2, ease: "easeOut" }}
                            />
                          )}
                          <div className="flex items-center gap-2 overflow-hidden">
                            {(() => {
                              const provider = providers.find(p => p.id === bm.providerId);
                              const Icon = provider?.icon;
                              return Icon ? <Icon className="h-3 w-3 text-muted-foreground/60" /> : null;
                            })()}
                            <span className={cn(
                              "text-sm truncate transition-all duration-200",
                              selectedModel === bm.modelId ? "font-bold text-primary" : "font-medium text-muted-foreground group-hover:text-foreground"
                            )}>
                              {bm.modelId}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <BookmarkIconButton 
                              isBookmarked={true} 
                              onToggle={(e) => toggleBookmark(e, bm.providerId, bm.modelId)} 
                            />
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                    <DropdownMenuSeparator className="my-1.5 opacity-40" />
                  </div>
                )}

                {providers.map((provider) => {
                  const visibleModels = provider.models.filter(modelId => 
                    !bookmarkedModels.some(bm => bm.providerId === provider.id && bm.modelId === modelId)
                  );

                  if (visibleModels.length === 0) return null;

                  return (
                    <div key={provider.id}>
                      <div className="mb-2 last:mb-0">
                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2 select-none">
                          <provider.icon className="h-3 w-3" />
                          {provider.name}
                        </div>
                        <div className="space-y-0.5">
                          {visibleModels.map((modelId) => {
                            return (
                              <DropdownMenuItem
                                key={`${provider.id}-${modelId}`}
                                className="relative z-0 flex items-center justify-between px-3 py-2 cursor-pointer rounded-xl focus:bg-accent/50 transition-colors group outline-none"
                                onClick={() => handleSelect(provider.id, modelId)}
                              >
                                {selectedModel === modelId && (
                                  <motion.div
                                    layoutId="active-model-pill"
                                    className="absolute inset-0 bg-primary/10 rounded-xl -z-10"
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                  />
                                )}
                                <span className={cn(
                                  "text-sm transition-all duration-200",
                                  selectedModel === modelId ? "font-bold text-primary" : "font-medium text-muted-foreground group-hover:text-foreground"
                                )}>
                                  {modelId}
                                </span>
                                <div className="flex items-center gap-1">
                                  <BookmarkIconButton 
                                    isBookmarked={false} 
                                    onToggle={(e) => toggleBookmark(e, provider.id, modelId)} 
                                  />
                                </div>
                              </DropdownMenuItem>
                            );
                          })}
                        </div>
                        <DropdownMenuSeparator className="my-1.5 opacity-40" />
                      </div>
                    </div>
                  );
                })}
                
                <DropdownMenuItem 
                  className="mt-1 px-3 py-2 cursor-pointer rounded-xl focus:bg-primary/10 text-center justify-center font-bold text-[11px] uppercase tracking-tighter text-primary/80 hover:text-primary transition-all active:scale-95"
                  onClick={(e) => { e.stopPropagation(); fetchModels(); }}
                >
                  Refresh Models
                </DropdownMenuItem>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
