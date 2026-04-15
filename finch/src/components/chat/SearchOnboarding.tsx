"use client";

import React, { useState } from 'react';
import { Globe, ArrowRight, ShieldCheck, Zap, Info, X, ChevronLeft, ChevronRight, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '@/lib/utils';

interface SearchOnboardingProps {
  onComplete: (apiKey: string) => void;
  onClose: () => void;
  initialStep?: number;
}

export const SearchOnboarding = ({ onComplete, onClose, initialStep }: SearchOnboardingProps) => {
  const [step, setStep] = useState(initialStep ?? 0);
  const [apiKey, setApiKey] = useState("");
  const [braveKey, setBraveKey] = useState("");
  const [searxUrl, setSearxUrl] = useState("");
  const [activeProvider, setActiveSearchProvider] = useState<'tavily' | 'brave' | 'searxng'>('tavily');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    const loadConfig = async () => {
      try {
        const config: any = await invoke('get_provider_config');
        if (config) {
          if (config.tavily_api_key) setApiKey(config.tavily_api_key === "••••••••" ? "" : config.tavily_api_key);
          if (config.brave_api_key) setBraveKey(config.brave_api_key === "••••••••" ? "" : config.brave_api_key);
          if (config.searxng_url) setSearxUrl(config.searxng_url);
          if (config.active_search_provider) setActiveSearchProvider(config.active_search_provider);
        }
      } catch (err) {
        console.error("Failed to load search config:", err);
      }
    };
    loadConfig();
  }, []);

  const steps = [
    {
      title: "Real-time Research",
      description: "Finch can search the web to provide up-to-date answers, check facts, and find the latest documentation.",
      icon: <Globe className="h-8 w-8 text-blue-400" />,
      color: "from-blue-500/20 to-cyan-500/20"
    },
    {
      title: "How it works",
      description: "Finch performs a 'pre-pass' search before the AI generates a response, ensuring the model has the freshest context possible.",
      icon: <Zap className="h-8 w-8 text-yellow-400" />,
      color: "from-yellow-500/20 to-orange-500/20"
    },
    {
      title: "Privacy First",
      description: "Your API keys are stored locally and encrypted. We support Tavily, Brave, and SearXNG for privacy-conscious searching.",
      icon: <ShieldCheck className="h-8 w-8 text-emerald-400" />,
      color: "from-emerald-500/20 to-teal-500/20"
    }
  ];

  const handleFinish = async () => {
    const trimmedKey = apiKey.trim();
    const trimmedBrave = braveKey.trim();
    const trimmedSearx = searxUrl.trim();

    if (activeProvider === 'tavily' && !trimmedKey) {
      toast.error("Please enter a Tavily API Key");
      return;
    }
    if (activeProvider === 'brave' && !trimmedBrave) {
      toast.error("Please enter a Brave API Key");
      return;
    }
    if (activeProvider === 'searxng' && !trimmedSearx) {
      toast.error("Please enter your SearXNG Instance URL");
      return;
    }
    
    setIsSaving(true);
    try {
      await invoke('update_search_config', { 
        config: {
          tavily_api_key: trimmedKey || null,
          brave_api_key: trimmedBrave || null,
          searxng_url: trimmedSearx || null,
          active_search_provider: activeProvider
        }
      });
      toast.success(`Web Research (${activeProvider}) activated!`);
      onComplete(activeProvider === 'tavily' ? trimmedKey : (activeProvider === 'brave' ? trimmedBrave : trimmedSearx));
    } catch (err: any) {
      toast.error(err.toString());
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-[320px] relative overflow-hidden">
      <AnimatePresence mode="wait">
        {step < steps.length ? (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${steps[step].color} border border-white/10 flex justify-center`}>
              {steps[step].icon}
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold tracking-tight">{steps[step].title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {steps[step].description}
              </p>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1 rounded-full transition-all duration-300 ${i === step ? 'w-4 bg-primary' : 'w-1 bg-muted'}`} 
                  />
                ))}
              </div>
              <div className="flex gap-2">
                {step > 0 && (
                  <Button variant="ghost" size="icon" onClick={() => setStep(step - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <Button size="sm" className="rounded-full px-4 gap-2" onClick={() => setStep(step + 1)}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col items-center gap-2">
              <Key className="h-8 w-8 text-blue-400" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-blue-400">Step 4: Connect</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                {(['tavily', 'brave', 'searxng'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setActiveProvider(p)}
                    className={cn(
                      "flex-1 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all",
                      activeProvider === p ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground ml-1 uppercase">
                  {activeProvider === 'searxng' ? 'Instance URL' : `${activeProvider} API Key`}
                </label>
                <Input 
                  value={activeProvider === 'tavily' ? apiKey : (activeProvider === 'brave' ? braveKey : searxUrl)}
                  onChange={(e) => {
                    if (activeProvider === 'tavily') setApiKey(e.target.value);
                    else if (activeProvider === 'brave') setBraveKey(e.target.value);
                    else setSearxUrl(e.target.value);
                  }}
                  placeholder={activeProvider === 'searxng' ? "https://searx.be" : (activeProvider === 'tavily' ? "tvly-..." : "brave-...")}
                  className="bg-black/20 border-white/10 rounded-xl"
                  type={activeProvider === 'searxng' ? "text" : "password"}
                />
              </div>
              <p className="text-[10px] text-muted-foreground bg-white/5 p-2 rounded-lg">
                {activeProvider === 'tavily' && (
                  <>Don't have a key? <a href="https://tavily.com" target="_blank" className="text-blue-400 hover:underline">Get one for free</a>. LLM-optimized.</>
                )}
                {activeProvider === 'brave' && (
                  <>Privacy focused. <a href="https://brave.com/search/api/" target="_blank" className="text-rose-400 hover:underline">Get a Brave Search API key</a>.</>
                )}
                {activeProvider === 'searxng' && (
                  <>Fully private & self-hosted. Enter the URL of your <a href="https://searx.github.io/searxng/" target="_blank" className="text-emerald-400 hover:underline">SearXNG instance</a>.</>
                )}
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => setStep(step - 1)}>
                Back
              </Button>
              <Button 
                className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20" 
                onClick={handleFinish}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Let's Go!"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <button 
        onClick={onClose}
        className="absolute top-0 right-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
