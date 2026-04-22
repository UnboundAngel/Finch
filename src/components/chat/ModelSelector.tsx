import React, { useEffect, useRef, useState } from 'react';
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
import { ChevronDown, Bookmark, Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { BookmarkIconButton } from '@/components/ui/bookmark-icon-button';
import { fetchModelsMap } from '@/src/lib/availableModels';
import { getTauriInvoke } from '@/src/lib/tauri-utils';
import { isLocalInferenceProvider } from '@/src/lib/providers';
import { useChatStore } from '@/src/store';

interface ModelSelectorProps {
  selectedProvider: string;
  setSelectedProvider: (provider: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  contrast?: 'light' | 'dark';
  isPinkMode?: boolean;
  /** True only while a local model is actively loading. */
  showLoadRing?: boolean;
  loadProgress?: number;
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

// Shared CSS mask style that turns a filled div into a border-only element.
const BORDER_MASK: React.CSSProperties = {
  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
  WebkitMaskComposite: 'xor',
  maskComposite: 'exclude' as React.CSSProperties['maskComposite'],
  padding: '2px',
};

export const ModelSelector = ({
  selectedProvider,
  setSelectedProvider,
  selectedModel,
  setSelectedModel,
  contrast,
  isPinkMode,
  showLoadRing = false,
  loadProgress = 0,
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

  const setIsModelLoaded = useChatStore(state => state.setIsModelLoaded);
  const setIsModelLoading = useChatStore(state => state.setIsModelLoading);
  const setModelLoadProgress = useChatStore(state => state.setModelLoadProgress);
  const [showCheck, setShowCheck] = useState(false);
  const prevShowLoadRing = useRef(false);
  const showCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const wasLoading = prevShowLoadRing.current;
    prevShowLoadRing.current = showLoadRing;

    if (showLoadRing) {
      setShowCheck(false);
      if (showCheckTimerRef.current) clearTimeout(showCheckTimerRef.current);
      return;
    }

    if (!showLoadRing && wasLoading) {
      setShowCheck(true);
      showCheckTimerRef.current = setTimeout(() => setShowCheck(false), 2000);
    }
  }, [showLoadRing]);

  useEffect(() => () => {
    if (showCheckTimerRef.current) clearTimeout(showCheckTimerRef.current);
  }, []);

  // ─── Model list fetching ──────────────────────────────────────────────────
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
        config: { bookmarked_models: bookmarks },
      });
    } catch (e) {
      console.error('Failed to save bookmarks:', e);
    }
  };

  const toggleBookmark = (e: React.MouseEvent, providerId: string, modelId: string) => {
    e.stopPropagation();
    const isBookmarked = bookmarkedModels.some(
      b => b.providerId === providerId && b.modelId === modelId,
    );
    const newBookmarks = isBookmarked
      ? bookmarkedModels.filter(b => !(b.providerId === providerId && b.modelId === modelId))
      : [...bookmarkedModels, { providerId, modelId }];
    if (isBookmarked) toast.info(`Removed ${modelId} from bookmarks`);
    else toast.success(`Bookmarked ${modelId}`);
    setBookmarkedModels(newBookmarks);
    saveBookmarks(newBookmarks);
  };

  // ─── Selection: eject previous local model, set state, preload new one ───
  const handleSelect = async (providerId: string, modelId: string) => {
    const prevProvider = selectedProvider;
    const prevModel = selectedModel;

    // #region agent log
    const _dbgLog = (hypothesisId: string, message: string, data: Record<string, unknown>) => fetch('http://127.0.0.1:7723/ingest/61911eee-37e5-42f2-9689-53dd89e5e47b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'69f910'},body:JSON.stringify({sessionId:'69f910',location:'ModelSelector.tsx:handleSelect',hypothesisId,message,data,timestamp:Date.now()})}).catch(()=>{});
    void _dbgLog('H1','handleSelect entered',{providerId,modelId,prevProvider,prevModel,isLocal:isLocalInferenceProvider(providerId)});
    // #endregion

    setSelectedProvider(providerId);
    setSelectedModel(modelId);
    toast.success(`Switched to ${modelId}`);
    setIsOpen(false);

    if (isLocalInferenceProvider(providerId)) {
      setIsModelLoaded(false);
      setIsModelLoading(true);
      setModelLoadProgress(5);
    } else {
      setIsModelLoaded(true);
      setIsModelLoading(false);
      setModelLoadProgress(0);
    }

    const invoke = await getTauriInvoke();
    // #region agent log
    void _dbgLog('H2','getTauriInvoke result',{invokeIsNull: invoke == null, isLocal: isLocalInferenceProvider(providerId)});
    // #endregion
    if (!invoke) return;

    // Eject the previous local model before loading any local selection.
    // This includes re-selecting the same local model, which prevents LM Studio
    // from accumulating multiple loaded instances for one model.
    const shouldEjectPreviousLocalModel =
      isLocalInferenceProvider(prevProvider) &&
      prevModel &&
      (
        prevProvider !== providerId ||
        prevModel !== modelId ||
        isLocalInferenceProvider(providerId)
      );

    if (shouldEjectPreviousLocalModel) {
      try {
        await invoke('eject_model', { provider: prevProvider, modelId: prevModel });
      } catch {
        // Keep selection responsive even if local server unload fails.
      }
    }

    // Trigger preload for the newly selected local model (fire-and-forget).
    if (isLocalInferenceProvider(providerId)) {
      // #region agent log
      void _dbgLog('H3','about to invoke preload_model',{provider: providerId, modelId});
      // #endregion
      invoke('preload_model', { provider: providerId, modelId }).then(() => {
        // #region agent log
        void _dbgLog('H3','preload_model resolved OK',{provider: providerId, modelId});
        // #endregion
      }).catch((err: unknown) => {
        // #region agent log
        void _dbgLog('H3','preload_model rejected',{provider: providerId, modelId, err: String(err)});
        // #endregion
      });
    }
  };

  const currentProvider = providers.find(p => p.id === selectedProvider);
  void currentProvider; // used by consumers; suppress unused warning

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      {/* Relative container anchors the ring and checkmark badge. */}
      <div className="relative">
        <DropdownMenuTrigger
          render={(props) => (
            <Button
              {...props}
              variant="ghost"
              className={cn(
                'flex items-center h-9 px-3 gap-2 rounded-xl transition-all font-semibold text-lg border-0 bg-transparent cursor-pointer outline-none active:scale-95 group hover:no-underline',
                isPinkMode ? 'hover:bg-rose-200/40' : 'hover:bg-muted/50',
              )}
            >
              <span className={cn(
                'truncate max-w-[200px] transition-colors duration-300',
                contrast === 'dark' ? 'text-black' : 'text-white',
              )}>
                {selectedModel}
              </span>
              <ChevronDown className={cn(
                'h-4 w-4 transition-all duration-300',
                isOpen && 'rotate-180',
                contrast === 'dark' ? 'text-black/60' : 'text-white/60',
              )} />
            </Button>
          )}
        />

        {/* Progress ring shown only during active local model loading */}
        {showLoadRing && (
          <div
            className="absolute inset-[-2px] rounded-xl pointer-events-none"
            style={{
              background: `conic-gradient(from -90deg, #60a5fa ${Math.max(
                0,
                Math.min(100, loadProgress),
              )}%, transparent ${Math.max(0, Math.min(100, loadProgress))}% 100%)`,
              ...BORDER_MASK,
            }}
          />
        )}

        <AnimatePresence>
          {showCheck && (
            <motion.div
              key="load-check"
              initial={{ opacity: 0, y: 4, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -3, scale: 0.9 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[10px] font-semibold text-blue-400 whitespace-nowrap pointer-events-none"
            >
              <Check className="h-2.5 w-2.5" />
              Model loaded
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DropdownMenuContent
        align="center"
        className={cn(
          'w-72 rounded-2xl shadow-2xl backdrop-blur-xl p-1.5 z-50 overflow-hidden',
          isPinkMode
            ? 'bg-rose-50/95 border-rose-200/50'
            : 'bg-popover/95 border-muted-foreground/10',
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
                      'px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 select-none border-none bg-transparent',
                      isPinkMode ? 'text-rose-500/80' : 'text-blue-500/80',
                    )}>
                      <Bookmark className="h-3 w-3" />
                      Bookmarked
                    </DropdownMenuLabel>
                    <div className="space-y-0.5">
                      {bookmarkedModels.map((bm) => (
                        <DropdownMenuItem
                          key={`bookmark-${bm.providerId}-${bm.modelId}`}
                          className={cn(
                            'relative z-0 flex items-center justify-between px-3 py-2 cursor-pointer rounded-xl transition-colors group outline-none',
                            isPinkMode ? 'focus:bg-rose-200/50' : 'focus:bg-accent/50',
                          )}
                          onClick={() => handleSelect(bm.providerId, bm.modelId)}
                        >
                          {selectedModel === bm.modelId && (
                            <motion.div
                              layoutId="active-model-pill"
                              className={cn(
                                'absolute inset-0 rounded-xl -z-10',
                                isPinkMode ? 'bg-rose-200/50' : 'bg-primary/10',
                              )}
                              transition={{ duration: 0.2, ease: 'easeOut' }}
                            />
                          )}
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className={cn(
                              'text-sm truncate transition-all duration-200',
                              selectedModel === bm.modelId
                                ? 'font-bold text-primary'
                                : 'font-medium text-muted-foreground group-hover:text-foreground',
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
                    !bookmarkedModels.some(
                      bm => bm.providerId === provider.id && bm.modelId === modelId,
                    ),
                  );
                  if (visibleModels.length === 0) return null;

                  return (
                    <div key={provider.id}>
                      <DropdownMenuGroup className="mb-2 last:mb-0">
                        <DropdownMenuLabel className={cn(
                          'px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 select-none border-none bg-transparent',
                          isPinkMode ? 'text-rose-400/60' : 'text-muted-foreground/50',
                        )}>
                          {provider.name}
                        </DropdownMenuLabel>
                        <div className="space-y-0.5">
                          {visibleModels.map((modelId) => (
                            <DropdownMenuItem
                              key={`${provider.id}-${modelId}`}
                              className={cn(
                                'relative z-0 flex items-center justify-between px-3 py-2 cursor-pointer rounded-xl transition-colors group outline-none',
                                isPinkMode ? 'focus:bg-rose-200/50' : 'focus:bg-accent/50',
                              )}
                              onClick={() => handleSelect(provider.id, modelId)}
                            >
                              {selectedModel === modelId && (
                                <motion.div
                                  layoutId="active-model-pill"
                                  className={cn(
                                    'absolute inset-0 rounded-xl -z-10',
                                    isPinkMode ? 'bg-rose-200/50' : 'bg-primary/10',
                                  )}
                                  transition={{ duration: 0.2, ease: 'easeOut' }}
                                />
                              )}
                              <span className={cn(
                                'text-sm transition-all duration-200',
                                selectedModel === modelId
                                  ? 'font-bold text-primary'
                                  : 'font-medium text-muted-foreground group-hover:text-foreground',
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
                          ))}
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
