import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { invoke } from '@tauri-apps/api/core';
import { Key, Globe, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export interface ProviderSectionProps {
  title: string;
  icon: React.ElementType;
  description: string;
  storeKey: string;
  type: 'key' | 'url';
  placeholder?: string;
  testCommand?: string;
  provider?: string;
}

export const ProviderSection = ({ title, icon: Icon, description, storeKey, type, placeholder, testCommand, provider }: ProviderSectionProps) => {
  const [value, setValue] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  };

  React.useEffect(() => {
    const loadValue = async () => {
      try {
        const config: any = await invoke('get_provider_config');
        if (config && config[storeKey]) {
          setValue(config[storeKey]);
        }
      } catch (e) {
        console.error(`Failed to load ${title} config:`, e);
      }
    };
    loadValue();
  }, [storeKey, title]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const config: any = await invoke('get_provider_config') || {
        anthropic_api_key: null,
        openai_api_key: null,
        gemini_api_key: null,
        lmstudio_endpoint: null,
        ollama_endpoint: null,
      };
      
      const updatedConfig = {
        ...config,
        [storeKey]: value || null
      };

      // Remove masked keys from the config we send back to save
      // so we don't overwrite real keys with dots
      const cleanConfig = { ...updatedConfig };
      ['anthropic_api_key', 'openai_api_key', 'gemini_api_key'].forEach(k => {
        if (cleanConfig[k] === "••••••••") {
          delete cleanConfig[k];
        }
      });

      await invoke('save_provider_config', { config: cleanConfig });
      toast.success(`${title} settings updated`);
    } catch (e) {
      toast.error(`Failed to save ${title} settings`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      let models: string[] = [];
      if (testCommand) {
        models = await invoke(testCommand);
      } else if (provider) {
        models = await invoke('list_local_models', { endpoint: value, provider });
      }

      if (models.length > 0) {
        toast.success(`Successfully loaded ${models.length} models from ${title}`);
      } else {
        toast.warning(`No models found for ${title}. Check your ${type === 'key' ? 'API key' : 'endpoint'}.`);
      }
    } catch (e) {
      toast.error(`Connection failed: ${e}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <motion.div 
      variants={itemVariants}
      whileTap={{ scale: 0.98 }}
      className="space-y-4 p-5 border rounded-2xl bg-muted/5 transition-all hover:bg-muted/10 hover:border-primary/30 group"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-lg">{title}</span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground pl-1">
            {type === 'key' ? 'API Access Key' : 'Endpoint URL'}
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={type === 'key' ? 'password' : 'text'}
                placeholder={placeholder || `Enter ${title} ${type === 'key' ? 'key' : 'URL'}...`}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="rounded-xl pl-10 h-11 border-muted-foreground/20 focus:border-primary transition-all"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {type === 'key' ? <Key className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
              </div>
            </div>
            <Button 
              variant="outline" 
              className="rounded-xl h-11 px-4 hover:bg-primary hover:text-white transition-all"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <RefreshCcw className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>

        <Button 
          variant="ghost" 
          className="w-full rounded-xl h-10 gap-2 text-xs font-semibold hover:bg-primary/5 transition-all"
          onClick={handleTest}
          disabled={isTesting || !value}
        >
          {isTesting ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          {type === 'key' ? 'Load Models' : 'Detect Models'}
        </Button>
      </div>
    </motion.div>
  );
};
