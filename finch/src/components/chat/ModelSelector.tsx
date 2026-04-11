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
import { ChevronDown, Cloud, Cpu, Sparkles, Zap } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

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

export const ModelSelector = ({
  selectedProvider,
  setSelectedProvider,
  selectedModel,
  setSelectedModel,
}: ModelSelectorProps) => {
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
    } catch (err) {
      console.error('Failed to fetch models:', err);
    }
  };

  useEffect(() => {
    fetchModels();
    // Refresh models every 30 seconds if dropdown is open? 
    // For now just on mount or when called.
  }, []);

  const handleSelect = (providerId: string, modelId: string) => {
    setSelectedProvider(providerId);
    setSelectedModel(modelId);
    toast.success(`Switched to ${modelId}`);
  };

  const currentProvider = providers.find(p => p.id === selectedProvider);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center h-9 px-3 gap-2 rounded-lg hover:bg-muted/50 transition-colors font-semibold text-lg border-0 bg-transparent cursor-pointer outline-none">
        {currentProvider?.icon && <currentProvider.icon className="h-4 w-4 text-muted-foreground" />}
        <span className="truncate max-w-[200px]">{selectedModel}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 rounded-xl shadow-lg border-muted-foreground/20 max-h-[500px] overflow-y-auto z-50 bg-popover text-popover-foreground p-1">
        {providers.map((provider) => (
          <DropdownMenuGroup key={provider.id}>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground py-2 px-3">
              <provider.icon className="h-3 w-3" />
              {provider.name}
            </DropdownMenuLabel>
            {provider.models.length > 0 ? (
              provider.models.map((modelId) => (
                <DropdownMenuItem
                  key={`${provider.id}-${modelId}`}
                  className="p-3 cursor-pointer rounded-lg focus:bg-muted/50"
                  onClick={() => handleSelect(provider.id, modelId)}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{modelId}</span>
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-muted-foreground italic">
                Add API key in Settings to load models
              </div>
            )}
            <DropdownMenuSeparator />
          </DropdownMenuGroup>
        ))}
        <DropdownMenuItem 
          className="p-3 cursor-pointer rounded-lg focus:bg-muted/50 text-center justify-center font-medium text-primary"
          onClick={fetchModels}
        >
          Refresh Models
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
