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
import { ChevronDown, Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { BookmarkIconButton } from '@/components/ui/bookmark-icon-button';
import { fetchModelsMap } from '@/src/lib/availableModels';
import { getTauriInvoke } from '@/src/lib/tauri-utils';

interface ModelSelectorProps {
  selectedProvider: string;
  setSelectedProvider: (provider: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  contrast?: 'light' | 'dark';
  isPinkMode?: boolean;
}

interface ProviderModels {
  id: string;
  name: string;
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
  contrast,
  isPinkMode,
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
    { id: 'anthropic', name: 'Anthropic', models: models.anthropic },
    { id: 'openai', name: 'OpenAI', models: models.openai },
    { id: 'gemini', name: 'Gemini', models: models.gemini },
    { id: 'local_ollama', name: 'Ollama', models: models.local_ollama },
    { id: 'local_lmstudio', name: 'LM Studio', models: models.local_lmstudio },
  ].map(p => {
    if (p.id === selectedProvider && selectedModel && !p.models.includes(selectedModel)) {
      return { ...p, models: [selectedModel, ...p.models] };
    }
    return p;
  });

  const fetchModels = async () => {
    try {
      const map = await fetchModelsMap();
      setModels(map);

      const invoke = await getTauriInvoke();
      if (invoke) {
        const config: any = await invoke('get_provider_config');
        if (config?.bookmarked_models) {
          setBookmarkedModels(config.bookmarked_models);
        }
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
      const invoke = await getTauriInvoke();
      if (!invoke) return;
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
      <DropdownMenuTrigger
        render={(props) => (
          <Button 
            {...props}
            variant="ghost"
            className={cn(
              "flex items-center h-9 px-3 gap-2 rounded-xl transition-all font-semibold text-lg border-0 bg-transparent cursor-pointer outline-none active:scale-95 group hover:no-underline",
              isPinkMode ? "hover:bg-rose-200/40" : "hover:bg-muted/50"
            )}
          >
            <span className={cn(
              "truncate max-w-[200px] transition-colors duration-300",
              contrast === 'dark' ? "text-black" : "text-white"
            )}>{selectedModel}</span>
            <ChevronDown className={cn("h-4 w-4 transition-all duration-300", isOpen && "rotate-180", contrast === 'dark' ? "text-black/60" : "text-white/60")} />
          </Button>
        )}
      />

      <DropdownMenuContent
        align="center"
        className={cn(
          "w-72 rounded-2xl shadow-2xl backdrop-blur-xl p-1.5 z-50 overflow-hidden",
          isPinkMode
            ? "bg-rose-50/95 border-rose-200/50"
            : "bg-popover/95 border-muted-foreground/10"
        )}
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
                  <DropdownMenuGroup className="mb-2">
                    <DropdownMenuLabel className={cn(
                      "px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 select-none border-none bg-transparent",
                      isPinkMode ? "text-rose-500/80" : "text-blue-500/80"
                    )}>
                      <Bookmark className="h-3 w-3" />
                      Bookmarked
                    </DropdownMenuLabel>
                    <div className="space-y-0.5">
                      {bookmarkedModels.map((bm) => (
                        <DropdownMenuItem
                          key={`bookmark-${bm.providerId}-${bm.modelId}`}
                          className={cn(
                            "relative z-0 flex items-center justify-between px-3 py-2 cursor-pointer rounded-xl transition-colors group outline-none",
                            isPinkMode ? "focus:bg-rose-200/50" : "focus:bg-accent/50"
                          )}
                          onClick={() => handleSelect(bm.providerId, bm.modelId)}
                        >
                          {selectedModel === bm.modelId && (
                            <motion.div
                              layoutId="active-model-pill"
                              className={cn(
                                "absolute inset-0 rounded-xl -z-10",
                                isPinkMode ? "bg-rose-200/50" : "bg-primary/10"
                              )}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                            />
                          )}
                          <div className="flex items-center gap-2 overflow-hidden">
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
                  </DropdownMenuGroup>
                )}

                {providers.map((provider) => {
                  const visibleModels = provider.models.filter(modelId =>
                    !bookmarkedModels.some(bm => bm.providerId === provider.id && bm.modelId === modelId)
                  );

                  if (visibleModels.length === 0) return null;

                  return (
                    <div key={provider.id}>
                      <DropdownMenuGroup className="mb-2 last:mb-0">
                        <DropdownMenuLabel className={cn(
                          "px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 select-none border-none bg-transparent",
                          isPinkMode ? "text-rose-400/60" : "text-muted-foreground/50"
                        )}>
                          {provider.name}
                        </DropdownMenuLabel>
                        <div className="space-y-0.5">
                          {visibleModels.map((modelId) => {
                            return (
                              <DropdownMenuItem
                                key={`${provider.id}-${modelId}`}
                                className={cn(
                                  "relative z-0 flex items-center justify-between px-3 py-2 cursor-pointer rounded-xl transition-colors group outline-none",
                                  isPinkMode ? "focus:bg-rose-200/50" : "focus:bg-accent/50"
                                )}
                                onClick={() => handleSelect(provider.id, modelId)}
                              >
                                {selectedModel === modelId && (
                                  <motion.div
                                    layoutId="active-model-pill"
                                    className={cn(
                                      "absolute inset-0 rounded-xl -z-10",
                                      isPinkMode ? "bg-rose-200/50" : "bg-primary/10"
                                    )}
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
                      </DropdownMenuGroup>
                    </div>
                  );
                })}

                <button
                  type="button"
                  className="mt-1 w-full px-3 py-2 cursor-pointer rounded-xl text-center justify-center font-bold text-[11px] uppercase tracking-tighter text-primary/80 hover:text-primary transition-all active:scale-95"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchModels();
                  }}
                >
                  Refresh Models
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
