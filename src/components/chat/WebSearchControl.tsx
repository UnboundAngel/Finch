import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Globe, Edit2, ExternalLink, ListFilter, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
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
  DropdownMenuGroup
} from '@/components/ui/dropdown-menu';
import { SearchOnboarding } from './SearchOnboarding';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';

interface ProviderConfig {
  active_search_provider?: string;
  tavily_api_key?: string;
  brave_api_key?: string;
  searxng_url?: string;
}

interface WebSearchControlProps {
  isWebSearchActive: boolean;
  setIsWebSearchActive: (val: boolean) => void;
  isPinkMode?: boolean;
  isDark?: boolean;
}

export const WebSearchControl = ({
  isWebSearchActive,
  setIsWebSearchActive,
  isPinkMode,
  isDark
}: WebSearchControlProps) => {
  const [config, setConfig] = useState<ProviderConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [activeSearchProvider, setActiveSearchProvider] = useState('tavily');
  const [isSearchMenuOpen, setIsSearchMenuOpen] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const c = await invoke<ProviderConfig>('get_provider_config');
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

  const hasSearchKey = !!(config?.tavily_api_key || config?.brave_api_key || config?.searxng_url);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="inline-flex relative"
    >
      <DropdownMenu open={isSearchMenuOpen} onOpenChange={setIsSearchMenuOpen}>
        <Popover open={showOnboarding && !hasSearchKey} onOpenChange={setShowOnboarding}>
          <PopoverAnchor asChild>
            <div className="inline-flex relative">
              <Button                            
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-lg transition-all hover:-translate-y-0.5 active:scale-95",
                  isWebSearchActive 
                    ? "text-blue-500 bg-blue-500/10 hover:bg-blue-500/20" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                onClick={() => {
                  if (!configLoaded) return;
                  if (!hasSearchKey) {
                    setOnboardingStep(0);
                    setShowOnboarding(true);
                  } else {
                    const nextState = !isWebSearchActive;
                    setIsWebSearchActive(nextState);
                    toast(nextState ? 'Web Research enabled' : 'Web Research disabled');
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (hasSearchKey) {
                    setIsSearchMenuOpen(true);
                  } else {
                    setOnboardingStep(0);
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
                  setShowOnboarding(false);
                  setTimeout(() => {
                    setOnboardingStep(3);
                    setShowOnboarding(true);
                    setIsSearchMenuOpen(false);
                  }, 10);
                }}
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit API Keys
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-xs rounded-lg gap-2 cursor-pointer"
                onClick={async () => {
                  try {
                    await openUrl('https://tavily.com/');
                  } catch (e) {
                    window.open('https://tavily.com/', '_blank');
                  }
                }}
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
                          toast.error(`Bro, search provider swap failed this round: ${e}`);
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
                  const newConfig = { ...config } as ProviderConfig;
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
    </motion.div>
  );
};
