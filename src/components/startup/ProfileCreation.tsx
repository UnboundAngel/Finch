import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Camera, RefreshCw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import {
  fetchModelsMap,
  firstUsableModel,
  PROVIDER_LABELS,
  type ModelsMap,
  type ProviderId,
} from '@/src/lib/availableModels';
import { SearchOnboarding } from '@/src/components/chat/SearchOnboarding';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AvatarPickerDialog } from '@/src/components/profile/AvatarPickerDialog';
import { resolveMediaSrc } from '@/src/lib/mediaPaths';
import { funEmojiAvatarUrl } from '@/src/lib/dicebearAvatar';
import { cn } from '@/lib/utils';

export type ProfileCreationPayload = {
  name: string;
  prompt: string;
  model: string;
  provider: string;
  passiveLearning: boolean;
  webSearch: boolean;
  /** Absolute path to copied avatar file under app data, if the user uploaded one. */
  avatarUrl?: string;
};

export default function ProfileCreation({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (data: ProfileCreationPayload) => void;
}) {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [modelsMap, setModelsMap] = useState<ModelsMap>({
    anthropic: [],
    openai: [],
    gemini: [],
    local_ollama: [],
    local_lmstudio: [],
  });
  const [selectedProvider, setSelectedProvider] = useState<ProviderId | ''>('');
  const [selectedModel, setSelectedModel] = useState('');
  const [modelsLoading, setModelsLoading] = useState(true);
  const [webSearch, setWebSearch] = useState(false);
  const [searchOnboardingOpen, setSearchOnboardingOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [avatarLocalPath, setAvatarLocalPath] = useState<string | null>(null);

  const [activeStep, setActiveStep] = useState(1);
  const [highestStep, setHighestStep] = useState(1);

  const loadModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const map = await fetchModelsMap();
      setModelsMap(map);
      const pick = firstUsableModel(map);
      if (pick) {
        setSelectedProvider(pick.provider);
        setSelectedModel(pick.model);
      }
    } catch (e) {
      console.error(e);
      toast.error('Could not load models');
    } finally {
      setModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  const hasAnyModel = Object.values(modelsMap).some((m) => m.length > 0);

  const dicebearPreview = funEmojiAvatarUrl(name || 'New');
  const avatarPreviewSrc = avatarLocalPath ? resolveMediaSrc(avatarLocalPath) : dicebearPreview;

  const hasSearchCredentials = (c: Record<string, unknown> | null) =>
    !!(c?.tavily_api_key || c?.brave_api_key || c?.searxng_url);

  const tryEnableWebSearch = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (webSearch) {
      setWebSearch(false);
      return;
    }
    try {
      const c = (await invoke('get_provider_config')) as Record<string, unknown> | null;
      if (hasSearchCredentials(c)) {
        setWebSearch(true);
        toast.success('Web research will default to on for new chats');
      } else {
        setSearchOnboardingOpen(true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not read search configuration');
    }
  };

  const handleNext = (step: number) => {
    setHighestStep(Math.max(highestStep, step + 1));
    setActiveStep(step + 1);
  };

  const getCardVariants = (step: number) => ({
    active: {
      y: 0,
      scale: 1,
      rotateX: 0,
      opacity: 1,
      zIndex: 10,
      pointerEvents: 'auto' as any,
    },
    past: {
      y: -90 * (activeStep - step),
      scale: 1 - 0.06 * (activeStep - step),
      rotateX: 12,
      opacity: Math.max(0, 1 - 0.4 * (activeStep - step)),
      zIndex: 10 - (activeStep - step),
      pointerEvents: 'auto' as any,
    },
    future: {
      y: 120,
      scale: 0.9,
      rotateX: -12,
      opacity: 0,
      zIndex: 0,
      pointerEvents: 'none' as any,
    }
  });

  const getStepState = (step: number) => {
    if (step === activeStep) return 'active';
    if (step < activeStep) return 'past';
    return 'future';
  };

  const springTransition = { type: 'spring' as const, stiffness: 260, damping: 25 };

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center overflow-hidden px-4 relative bg-background">
      {/* Header — stacks on narrow widths so title + Cancel never overlap */}
      <div className="absolute top-6 left-0 right-0 z-50 flex justify-center px-3 sm:top-8 sm:px-4">
        <div
          data-tauri-drag-region
          className={cn(
            'flex w-full max-w-md rounded-xl py-2',
            'flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4'
          )}
        >
          <div className="min-w-0 sm:flex-1 sm:pr-2">
            <h1 className="break-words text-xl font-medium leading-snug text-primary sm:text-2xl">
              Create Profile
            </h1>
            <p className="text-sm text-primary/60">Step {activeStep} of 3</p>
          </div>
          <div className="flex shrink-0 justify-end sm:justify-start sm:pt-0.5">
            <button
              type="button"
              onClick={onCancel}
              className="no-drag inline-flex items-center justify-center rounded-md px-1 py-0.5 text-sm font-medium text-primary/60 transition-colors hover:bg-primary/5 hover:text-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
      
      {/* Cards Container with Perspective */}
      <div className="relative w-full max-w-md h-[460px] flex items-center justify-center mt-8" style={{ perspective: '1200px' }}>
        
        {/* STEP 1: IDENTITY */}
        <motion.div 
          variants={getCardVariants(1)}
          initial="active"
          animate={getStepState(1)}
          transition={springTransition}
          onClick={() => activeStep !== 1 && setActiveStep(1)}
          className={`absolute w-full min-h-[420px] bg-card border border-border rounded-3xl p-5 shadow-2xl flex flex-col items-center justify-center sm:p-8 ${activeStep !== 1 ? 'cursor-pointer hover:border-primary/30' : ''}`}
          style={{ 
            transformOrigin: 'bottom center',
            willChange: 'transform, opacity',
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden'
          }}
        >
          <div className="relative group mb-10">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-background border-2 border-border transition-transform duration-300 group-hover:scale-105">
              <img
                src={avatarPreviewSrc}
                alt="Avatar preview"
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              className={cn(
                'no-drag absolute inset-0 z-10 inline-flex cursor-pointer items-center justify-center rounded-full border-0 p-0 transition-opacity duration-200',
                'bg-black/35 [background-clip:unset] [-webkit-background-clip:unset]',
                'pointer-events-none opacity-0',
                'group-hover:pointer-events-auto group-hover:opacity-100',
                'focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent'
              )}
              onClick={(e) => {
                e.stopPropagation();
                setAvatarPickerOpen(true);
              }}
              aria-label="Change profile picture"
            >
              <Camera className="h-8 w-8 text-white/85 drop-shadow-sm" strokeWidth={1.75} />
            </button>
          </div>
          
          <input 
            type="text" 
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && name.trim()) {
                e.preventDefault();
                handleNext(1);
              }
            }}
            placeholder="Profile Name" 
            className="w-full max-w-sm bg-transparent text-center text-3xl font-medium text-primary placeholder:text-primary/20 outline-none border-b-2 border-border focus:border-primary transition-colors pb-2" 
            autoFocus
            disabled={activeStep !== 1}
          />

          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: (name.trim() && activeStep === 1) ? 1 : 0, height: (name.trim() && activeStep === 1) ? 'auto' : 0 }}
            className="overflow-hidden mt-8"
          >
            <button 
              onClick={(e) => { e.stopPropagation(); handleNext(1); }}
              className="px-8 py-2.5 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Continue
            </button>
          </motion.div>
        </motion.div>

        {/* STEP 2: MINDSET */}
        <motion.div 
          variants={getCardVariants(2)}
          initial="future"
          animate={getStepState(2)}
          transition={springTransition}
          onClick={() => activeStep !== 2 && highestStep >= 2 && setActiveStep(2)}
          className={`absolute w-full min-h-[420px] bg-card border border-border rounded-3xl p-5 shadow-2xl flex flex-col justify-center sm:p-8 ${activeStep !== 2 ? (highestStep >= 2 ? 'cursor-pointer hover:border-primary/30' : '') : ''}`}
          style={{ 
            transformOrigin: 'bottom center',
            willChange: 'transform, opacity',
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden'
          }}
        >
          <div className="space-y-6 w-full">
            <div className="mb-6 text-center sm:mb-8">
              <h2 className="text-xl font-medium text-primary sm:text-2xl">The Mindset</h2>
              <p className="mt-1 text-sm text-primary/60">How should this profile behave?</p>
            </div>

            <div>
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <label className="min-w-0 text-sm font-medium text-primary/80">Default model</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="no-drag h-8 w-fit shrink-0 self-start px-2 text-xs text-primary/60 hover:text-primary sm:self-auto"
                  disabled={activeStep !== 2 || modelsLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    void loadModels();
                  }}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${modelsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              <select
                value={selectedProvider && selectedModel ? `${selectedProvider}|${selectedModel}` : ''}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  const [p, ...rest] = v.split('|');
                  const m = rest.join('|');
                  setSelectedProvider(p as ProviderId);
                  setSelectedModel(m);
                }}
                className="w-full min-w-0 bg-background border border-border rounded-lg px-3 py-3 text-sm text-primary outline-none appearance-none focus:border-primary/50 transition-colors sm:px-4 sm:text-base"
                disabled={activeStep !== 2 || modelsLoading || !hasAnyModel}
                title={
                  !hasAnyModel
                    ? 'Add API keys or local endpoints in Settings, then pick a model in the app.'
                    : undefined
                }
              >
                {!hasAnyModel ? (
                  <option value="">
                    No models — configure providers in Settings
                  </option>
                ) : (
                  (Object.keys(PROVIDER_LABELS) as ProviderId[]).map((pid) => {
                    const ids = modelsMap[pid];
                    if (!ids.length) return null;
                    return (
                      <optgroup key={pid} label={PROVIDER_LABELS[pid]}>
                        {ids.map((mid) => (
                          <option key={`${pid}:${mid}`} value={`${pid}|${mid}`}>
                            {mid}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })
                )}
              </select>
              {!modelsLoading && !hasAnyModel && (
                <p className="text-xs text-primary/50 mt-2">
                  You can still create a profile; configure providers in Settings, then pick a model in the app.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-primary/80 mb-2">
                Global system prompt{' '}
                <span className="text-primary/50 font-normal">(optional)</span>
              </label>
              <p className="text-xs text-primary/50 mb-2">
                Applied as the default system prompt for every chat while this profile is active (you can still edit it per chat in the sidebar).
              </p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="e.g. You are a concise technical writer..."
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-primary outline-none resize-none focus:border-primary/50 transition-colors"
                disabled={activeStep !== 2}
              />
            </div>

            {activeStep === 2 && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasAnyModel && (!selectedModel || !selectedProvider)) return;
                    handleNext(2);
                  }}
                  disabled={hasAnyModel && (!selectedModel || !selectedProvider)}
                  className="px-8 py-2.5 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* STEP 3: SETTINGS */}
        <motion.div 
          variants={getCardVariants(3)}
          initial="future"
          animate={getStepState(3)}
          transition={springTransition}
          onClick={() => activeStep !== 3 && highestStep >= 3 && setActiveStep(3)}
          className={`absolute w-full min-h-[420px] bg-card border border-border rounded-3xl p-5 shadow-2xl flex flex-col justify-center sm:p-8 ${activeStep !== 3 ? (highestStep >= 3 ? 'cursor-pointer hover:border-primary/30' : '') : ''}`}
          style={{ 
            transformOrigin: 'bottom center',
            willChange: 'transform, opacity',
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden'
          }}
        >
          <div className="space-y-6 w-full">
            <div className="mb-6 text-center sm:mb-8">
              <h2 className="text-xl font-medium text-primary sm:text-2xl">Capabilities</h2>
              <p className="mt-1 text-sm text-primary/60">What tools can this profile use?</p>
            </div>

            <div className="space-y-4">
              <div className="pointer-events-none flex items-center justify-between gap-4 p-4 bg-background rounded-lg border border-border select-none">
                <div>
                  <div className="text-sm font-medium text-destructive">Passive Learning</div>
                  <div className="text-xs text-primary/60 mt-1">
                    Placeholder for a future memory feature — no effect yet.
                  </div>
                </div>
                <div
                  className="no-drag flex h-6 w-12 shrink-0 items-center justify-start rounded-full bg-muted p-1 ring-1 ring-inset ring-border/70"
                  aria-hidden
                >
                  <span className="block h-4 w-4 shrink-0 rounded-full bg-primary shadow-sm" />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 p-4 bg-background rounded-lg border border-border">
                <div>
                  <div className="text-sm font-medium text-primary">Web research (default on)</div>
                  <div className="text-xs text-primary/60 mt-1">
                    Runs a web search pass before each reply when the globe is on. Turning this on requires a
                    Tavily, Brave, or SearXNG setup.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => void tryEnableWebSearch(e)}
                  disabled={activeStep !== 3}
                  className={cn(
                    'no-drag flex h-6 w-12 shrink-0 items-center rounded-full p-1 transition-colors',
                    webSearch
                      ? 'justify-end bg-primary'
                      : 'justify-start bg-muted ring-1 ring-inset ring-border/70'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none block h-4 w-4 shrink-0 rounded-full shadow-sm',
                      webSearch ? 'bg-primary-foreground' : 'bg-primary'
                    )}
                  />
                </button>
              </div>
            </div>

            {activeStep === 3 && (
              <div className="flex justify-center pt-6">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!name.trim()) return;
                    if (hasAnyModel && (!selectedModel || !selectedProvider)) return;
                    onSave({
                      name: name.trim(),
                      prompt,
                      model: selectedModel,
                      provider: selectedProvider || '',
                      passiveLearning: false,
                      webSearch,
                      avatarUrl: avatarLocalPath || undefined,
                    });
                  }}
                  disabled={!name.trim() || (hasAnyModel && (!selectedModel || !selectedProvider))}
                  className="px-10 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-lg shadow-primary/10"
                >
                  Complete Profile
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <AvatarPickerDialog
        open={avatarPickerOpen}
        onOpenChange={setAvatarPickerOpen}
        onChoose={(path) => setAvatarLocalPath(path)}
      />

      <Dialog open={searchOnboardingOpen} onOpenChange={setSearchOnboardingOpen}>
        <DialogContent className="no-drag max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Set up web search</DialogTitle>
          </DialogHeader>
          <SearchOnboarding
            initialStep={0}
            onComplete={() => {
              setWebSearch(true);
              setSearchOnboardingOpen(false);
              toast.success('Web research will default to on for new chats');
            }}
            onClose={() => setSearchOnboardingOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
