import React, { useState, useEffect } from 'react';
import { FileJson, HelpCircle, Loader2 } from 'lucide-react';
import { useModelParams, useChatStore } from '@/src/store';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ParameterZone } from './ParameterZone';
import { MaxTokensSlider } from '../MaxTokensSlider';
import { useSidebarTheme } from '../hooks/useSidebarTheme';

const CLOUD_PROVIDERS = new Set(['anthropic', 'openai', 'gemini']);

interface OutputSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  isPinkMode?: boolean;
  contrast?: 'light' | 'dark';
}

export const OutputSection = ({ 
  isOpen, 
  onToggle, 
  isPinkMode, 
  contrast 
}: OutputSectionProps) => {
  const maxTokens = useModelParams(state => state.maxTokens);
  const setMaxTokens = useModelParams(state => state.setMaxTokens);
  const contextIntelligenceStatus = useModelParams(state => state.contextIntelligenceStatus);
  const contextIntelligence = useModelParams(state => state.contextIntelligence);
  const selectedProvider = useChatStore(state => state.selectedProvider);
  const isCloudProvider = CLOUD_PROVIDERS.has(selectedProvider);

  const { mutedTextColor, inputBg, borderColor, iconColor } = useSidebarTheme(isPinkMode, contrast);

  const [localMaxTokens, setLocalMaxTokens] = useState(maxTokens.toString());

  useEffect(() => {
    setLocalMaxTokens(maxTokens.toString());
  }, [maxTokens]);

  const handleMaxTokensBlur = () => {
    const parsed = parseInt(localMaxTokens);
    if (isNaN(parsed)) {
      setLocalMaxTokens(maxTokens.toString());
      return;
    }
    const modelLimit = contextIntelligence?.model_max || 8192;
    const clamped = Math.min(modelLimit, Math.max(1, parsed));
    setMaxTokens(clamped);
    setLocalMaxTokens(clamped.toString());
  };

  return (
    <ParameterZone 
      label="Output" 
      icon={<FileJson className="h-3.5 w-3.5" />}
      isOpen={isOpen} 
      onToggle={onToggle}
      mutedTextColor={mutedTextColor}
      iconColor={iconColor}
      contrast={contrast}
      isPinkMode={isPinkMode}
    >
      <div className={cn("space-y-3 group px-1", isCloudProvider && "opacity-70")}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-1.5 pr-2">
            <Label className={cn("text-[10px] font-bold uppercase tracking-wider transition-colors duration-300", mutedTextColor)}>Response Length</Label>
            <Tooltip>
              <TooltipTrigger render={(props) => (
                <div {...props}>
                  <HelpCircle className={cn("h-3 w-3 cursor-help transition-none hover:scale-110 active:scale-95", iconColor)} />
                </div>
              )} />
              <TooltipContent side="left" className="max-w-[200px]">
                {isCloudProvider
                  ? 'Not applied to cloud models — they use their own output limits.'
                  : "Controls the maximum length of the model's reply."}
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {contextIntelligenceStatus === 'loading' && <Loader2 className="h-3 w-3 animate-spin opacity-40" />}
            <input
              type="number"
              value={localMaxTokens}
              onChange={(e) => setLocalMaxTokens(e.target.value)}
              onBlur={handleMaxTokensBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleMaxTokensBlur()}
              className={cn(
                "w-16 h-6 px-1.5 rounded-lg text-[10px] font-mono text-right border focus:outline-none focus:ring-1 focus:ring-primary/40 transition-none",
                "appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                inputBg,
                borderColor,
                isPinkMode ? 'text-rose-500/60 focus:ring-rose-400/30' : mutedTextColor
              )}
            />
          </div>
        </div>
        <MaxTokensSlider contrast={contrast} isPinkMode={isPinkMode} />
        {isCloudProvider && (
          <p className={cn("text-[9px] italic leading-tight px-0.5", mutedTextColor)}>
            Local models only
          </p>
        )}
      </div>
    </ParameterZone>
  );
};
