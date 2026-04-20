import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, Trash2, RefreshCw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { Profile } from '../../types/chat';
import {
  fetchModelsMap,
  firstUsableModel,
  inferProviderForModel,
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
import { isTauri } from '@/src/lib/tauri-utils';
import { cn } from '@/lib/utils';

export default function ProfileEditing({
  profile,
  onCancel,
  onSave,
  onDelete,
}: {
  profile: Profile;
  onCancel: () => void;
  onSave: (p: Profile) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(profile.name || '');
  const [prompt, setPrompt] = useState(profile.prompt || '');
  const [modelsMap, setModelsMap] = useState<ModelsMap>({
    anthropic: [],
    openai: [],
    gemini: [],
    local_ollama: [],
    local_lmstudio: [],
  });
  const [selectedProvider, setSelectedProvider] = useState<ProviderId | ''>(
    (profile.provider as ProviderId) || ''
  );
  const [selectedModel, setSelectedModel] = useState(profile.model || '');
  const [modelsLoading, setModelsLoading] = useState(true);
  const [webSearch, setWebSearch] = useState(profile.webSearch ?? false);
  const [searchOnboardingOpen, setSearchOnboardingOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [avatarLocalPath, setAvatarLocalPath] = useState<string | null>(null);

  const middleSlideRef = useRef<HTMLElement>(null);

  const loadModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const map = await fetchModelsMap();
      setModelsMap(map);

      let provider: ProviderId | '' = (profile.provider as ProviderId) || '';
      let modelId = profile.model || '';

      if (modelId && !provider) {
        const inferred = inferProviderForModel(modelId, map);
        if (inferred) provider = inferred;
      }

      if (!modelId) {
        const pick = firstUsableModel(map);
        if (pick) {
          provider = pick.provider;
          modelId = pick.model;
        }
      }

      if (provider) setSelectedProvider(provider);
      if (modelId) setSelectedModel(modelId);
    } catch (e) {
      console.error(e);
      toast.error('Your models dipped out, so please give the refresh button a quick tap!');
    } finally {
      setModelsLoading(false);
    }
  }, [profile.model, profile.provider]);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  /** Open on the name/avatar card; re-run after layout so snap + centering settle. */
  useEffect(() => {
    const centerMiddle = () => {
      middleSlideRef.current?.scrollIntoView({
        inline: 'center',
        block: 'nearest',
        behavior: 'auto',
      });
    };
    centerMiddle();
    const a = window.requestAnimationFrame(centerMiddle);
    const t = window.setTimeout(centerMiddle, 80);
    const t2 = window.setTimeout(centerMiddle, 320);
    return () => {
      window.cancelAnimationFrame(a);
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, []);

  const hasAnyModel = Object.values(modelsMap).some((m) => m.length > 0);

  const hasSearchCredentials = (c: Record<string, unknown> | null) =>
    !!(c?.tavily_api_key || c?.brave_api_key || c?.searxng_url);

  const tryEnableWebSearch = async () => {
    if (webSearch) {
      setWebSearch(false);
      return;
    }
    if (!isTauri()) {
      toast.error('Web research can only be enabled in the desktop app.');
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
      toast.error("Your search settings are playing hide and seek right now.");
    }
  };

  /** Narrower than the viewport so neighboring cards peek; `snap-center` keeps focus on one card. */
  const slideCell =
    'flex h-full min-h-0 w-[min(88vw,26rem)] shrink-0 snap-center snap-always items-stretch justify-center py-2 pl-1 pr-1 sm:w-[min(86vw,30rem)] sm:py-3 sm:pl-1.5 sm:pr-1.5 md:w-[min(82vw,34rem)]';

  const cardBase =
    'flex h-full min-h-0 w-full max-h-full flex-1 flex-col overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl ring-1 ring-foreground/[0.06] sm:p-8';

  return (
    <div className="relative z-20 flex h-[100dvh] min-h-0 w-full flex-col bg-background">
      <header
        data-tauri-drag-region
        className="relative flex shrink-0 items-center justify-center border-b border-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-8"
      >
        <h1 className="text-center font-serif text-2xl font-normal italic tracking-tight text-primary sm:text-[1.75rem] md:text-3xl">
          Edit Profile
        </h1>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }}
          className="no-drag absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-primary/60 transition-colors hover:text-primary sm:right-8"
        >
          Cancel
        </button>
      </header>

      <p className="no-drag shrink-0 px-4 pb-2 text-center text-[11px] text-muted-foreground sm:px-8 sm:text-xs">
        Swipe or scroll — cards snap; you&apos;ll see the next one peeking at the edge.
      </p>

      <div className="scrollbar-hide flex min-h-0 flex-1 flex-row gap-2 overflow-y-hidden overflow-x-auto scroll-smooth snap-x snap-mandatory overscroll-x-contain bg-muted/25 px-1 pb-1 [-webkit-overflow-scrolling:touch] dark:bg-muted/15 sm:gap-3 sm:px-2 sm:pb-2">
        {/* 1 — Left: system prompt + default model */}
        <section className={slideCell}>
          <div className={cn(cardBase, 'max-w-xl')}>
            <div className="mb-6 text-center">
              <h2 className="text-xl font-medium text-primary">System prompt</h2>
              <p className="mt-1 text-sm text-primary/60">Default instructions for every chat with this profile.</p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label className="block text-sm font-medium text-primary/80">Default model</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="no-drag h-8 px-2 text-xs text-primary/60 hover:text-primary"
                    disabled={modelsLoading}
                    onClick={() => void loadModels()}
                  >
                    <RefreshCw className={`mr-1 h-3.5 w-3.5 ${modelsLoading ? 'animate-spin' : ''}`} />
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
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-primary outline-none transition-colors appearance-none focus:border-primary/50"
                  disabled={modelsLoading || !hasAnyModel}
                >
                  {!hasAnyModel ? (
                    <option value="">No models yet. Add a provider in Settings.</option>
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
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <label className="mb-3 block text-sm font-medium text-primary/80">
                  Global system prompt <span className="font-normal text-primary/50">(optional)</span>
                </label>
                <p className="mb-3 text-xs text-primary/50">
                  Applied while this profile is active. You can still override per chat later.
                </p>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. You are a concise technical writer..."
                  className="min-h-[12rem] w-full flex-1 resize-none rounded-lg border border-border bg-background px-4 py-3 text-primary outline-none transition-colors focus:border-primary/50 sm:min-h-[14rem]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 2 — Middle: photo + name + actions (default view) */}
        <section ref={middleSlideRef} className={slideCell}>
          <div className={cn(cardBase, 'max-w-md')}>
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-1 py-4 sm:gap-8 sm:py-6">
                <div className="group relative">
                  <div className="h-28 w-28 overflow-hidden rounded-full border-2 border-border bg-background transition-transform duration-300 group-hover:scale-[1.02] sm:h-32 sm:w-32 md:h-36 md:w-36">
                    <img
                      src={resolveMediaSrc(avatarLocalPath || profile.avatarUrl)}
                      alt="Avatar preview"
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <button
                    type="button"
                    className="no-drag absolute inset-0 flex cursor-pointer items-center justify-center rounded-full border-0 bg-background/60 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => setAvatarPickerOpen(true)}
                    aria-label="Change profile picture"
                  >
                    <Camera className="h-8 w-8 text-primary" />
                  </button>
                </div>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Profile name"
                  className="w-full max-w-[14rem] border-b-2 border-border bg-transparent pb-2 text-center text-2xl font-medium text-primary outline-none transition-colors placeholder:text-primary/20 focus:border-primary sm:max-w-sm sm:text-3xl"
                />
              </div>

              <div className="mt-auto flex w-full shrink-0 gap-3 pt-2 sm:gap-4">
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `Are you sure you want to delete "${profile.name}"? This action cannot be undone.`
                    )
                  ) {
                    onDelete(profile.id);
                  }
                }}
                className="no-drag flex flex-1 items-center justify-center gap-2 rounded-full border border-destructive/50 py-3 font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!name.trim()) return;
                  if (hasAnyModel && (!selectedModel || !selectedProvider)) return;
                  onSave({
                    ...profile,
                    name: name.trim(),
                    prompt,
                    model: selectedModel,
                    provider: selectedProvider || undefined,
                    passiveLearning: false,
                    webSearch,
                    avatarUrl: avatarLocalPath ?? profile.avatarUrl,
                  });
                }}
                disabled={!name.trim() || (hasAnyModel && (!selectedModel || !selectedProvider))}
                className="no-drag flex-1 rounded-full bg-primary py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                Save
              </button>
              </div>
            </div>
          </div>
        </section>

        {/* 3 — Right: capabilities */}
        <section className={slideCell}>
          <div className={cn(cardBase, 'max-w-xl')}>
            <div className="flex min-h-0 flex-1 flex-col justify-center">
              <div className="mb-6 text-center sm:mb-8">
                <h2 className="text-xl font-medium text-primary">Capabilities</h2>
                <p className="mt-1 text-sm text-primary/60">What tools can this profile use?</p>
              </div>

              <div className="space-y-4">
              <div className="pointer-events-none flex select-none items-center justify-between gap-4 rounded-lg border border-border bg-background p-4">
                <div>
                  <div className="text-sm font-medium text-destructive">Passive Learning</div>
                  <div className="mt-1 text-xs text-primary/60">
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

              <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-4">
                <div>
                  <div className="text-sm font-medium text-primary">Web research (default on)</div>
                  <div className="mt-1 text-xs text-primary/60">
                    Requires Tavily, Brave, or SearXNG credentials before it can stay enabled.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void tryEnableWebSearch()}
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
            </div>
          </div>
        </section>
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
