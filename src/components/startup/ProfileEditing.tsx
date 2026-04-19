import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
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
  const [passiveLearning, setPassiveLearning] = useState(profile.passiveLearning ?? true);
  const [webSearch, setWebSearch] = useState(profile.webSearch ?? false);
  const [searchOnboardingOpen, setSearchOnboardingOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [avatarLocalPath, setAvatarLocalPath] = useState<string | null>(null);

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
      toast.error('Could not load models');
    } finally {
      setModelsLoading(false);
    }
  }, [profile.model, profile.provider]);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  const hasAnyModel = Object.values(modelsMap).some((m) => m.length > 0);

  const hasSearchCredentials = (c: Record<string, unknown> | null) =>
    !!(c?.tavily_api_key || c?.brave_api_key || c?.searxng_url);

  const tryEnableWebSearch = async () => {
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

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center px-4 relative bg-background overflow-y-auto py-20">
      <div className="absolute top-8 left-0 right-0 px-8 z-50 flex justify-center">
        <div
          data-tauri-drag-region
          className="flex w-full max-w-7xl items-center justify-between gap-4 rounded-xl py-2"
        >
          <h1 className="text-2xl font-medium text-primary min-w-0">Edit Profile</h1>
          <button
            type="button"
            onClick={onCancel}
            className="no-drag shrink-0 text-primary/60 hover:text-primary transition-colors text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-stretch justify-center w-full max-w-6xl mt-8">
        {/* LEFT CARD: MINDSET */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 bg-card border border-border rounded-3xl p-8 shadow-2xl flex flex-col"
          style={{
            willChange: 'transform, opacity',
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
          }}
        >
          <div className="text-center mb-8">
            <h2 className="text-xl font-medium text-primary">The Mindset</h2>
            <p className="text-sm text-primary/60 mt-1">How should this profile behave?</p>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label className="block text-sm font-medium text-primary/80">Default model</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="no-drag h-8 px-2 text-xs text-primary/60 hover:text-primary"
                  disabled={modelsLoading}
                  onClick={() => void loadModels()}
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
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-primary outline-none appearance-none focus:border-primary/50 transition-colors"
                disabled={modelsLoading || !hasAnyModel}
              >
                {!hasAnyModel ? (
                  <option value="">No models found — configure providers in Settings</option>
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

            <div>
              <label className="block text-sm font-medium text-primary/80 mb-2">
                Global system prompt{' '}
                <span className="text-primary/50 font-normal">(optional)</span>
              </label>
              <p className="text-xs text-primary/50 mb-2">
                Default system prompt for every chat while this profile is active.
              </p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                placeholder="e.g. You are a concise technical writer..."
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-primary outline-none resize-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>
        </motion.div>

        {/* CENTER CARD: IDENTITY */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 bg-card border border-border rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-between min-h-[420px]"
          style={{
            willChange: 'transform, opacity',
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
          }}
        >
          <div className="flex flex-col items-center w-full">
            <div className="relative group mb-10 mt-4">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-background border-2 border-border transition-transform duration-300 group-hover:scale-105">
                <img
                  src={resolveMediaSrc(avatarLocalPath || profile.avatarUrl)}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <button
                type="button"
                className="no-drag absolute inset-0 bg-background/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer border-0 p-0"
                onClick={() => setAvatarPickerOpen(true)}
                aria-label="Change profile picture"
              >
                <Camera className="w-8 h-8 text-primary" />
              </button>
            </div>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Profile Name"
              className="w-full max-w-sm bg-transparent text-center text-3xl font-medium text-primary placeholder:text-primary/20 outline-none border-b-2 border-border focus:border-primary transition-colors pb-2 mb-10"
            />
          </div>

          <div className="flex gap-4 w-full mt-auto">
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
              className="no-drag flex-1 py-3 rounded-full border border-destructive/50 text-destructive font-medium hover:bg-destructive/10 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Delete
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
                  passiveLearning,
                  webSearch,
                  avatarUrl: avatarLocalPath ?? profile.avatarUrl,
                });
              }}
              disabled={!name.trim() || (hasAnyModel && (!selectedModel || !selectedProvider))}
              className="no-drag flex-1 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Save
            </button>
          </div>
        </motion.div>

        {/* RIGHT CARD: CAPABILITIES */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 bg-card border border-border rounded-3xl p-8 shadow-2xl flex flex-col"
          style={{
            willChange: 'transform, opacity',
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
          }}
        >
          <div className="text-center mb-8">
            <h2 className="text-xl font-medium text-primary">Capabilities</h2>
            <p className="text-sm text-primary/60 mt-1">What tools can this profile use?</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
              <div>
                <div className="text-sm font-medium text-primary">Passive Learning</div>
                <div className="text-xs text-primary/60 mt-1">
                  Placeholder for a future memory feature — no effect yet.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPassiveLearning(!passiveLearning)}
                className={`no-drag w-12 h-6 rounded-full p-1 transition-colors flex-shrink-0 ml-4 ${passiveLearning ? 'bg-primary' : 'bg-muted'}`}
              >
                <div
                  className={`w-4 h-4 rounded-full transform transition-transform ${passiveLearning ? 'translate-x-6 bg-background' : 'translate-x-0 bg-primary'}`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
              <div>
                <div className="text-sm font-medium text-primary">Web research (default on)</div>
                <div className="text-xs text-primary/60 mt-1">
                  Requires Tavily, Brave, or SearXNG credentials before it can stay enabled.
                </div>
              </div>
              <button
                type="button"
                onClick={() => void tryEnableWebSearch()}
                className={`no-drag w-12 h-6 rounded-full p-1 transition-colors flex-shrink-0 ml-4 ${webSearch ? 'bg-primary' : 'bg-muted'}`}
              >
                <div
                  className={`w-4 h-4 rounded-full transform transition-transform ${webSearch ? 'translate-x-6 bg-background' : 'translate-x-0 bg-primary'}`}
                />
              </button>
            </div>
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
