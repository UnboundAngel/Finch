import React, { useEffect, useRef } from 'react';
import { Terminal, HelpCircle } from 'lucide-react';
import { useModelParams } from '@/src/store';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ParameterZone } from './ParameterZone';
import { useSidebarTheme } from '../hooks/useSidebarTheme';

interface SystemPromptSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  isPinkMode?: boolean;
  contrast?: 'light' | 'dark';
}

export const SystemPromptSection = ({ 
  isOpen, 
  onToggle, 
  isPinkMode, 
  contrast 
}: SystemPromptSectionProps) => {
  const systemPrompt = useModelParams(state => state.systemPrompt);
  const setSystemPrompt = useModelParams(state => state.setSystemPrompt);
  
  const { textColor, mutedTextColor, inputBg, borderColor, iconColor } = useSidebarTheme(isPinkMode, contrast);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea on mount and when systemPrompt changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 144)}px`;
    }
  }, [systemPrompt]);

  const tokenCount = Math.ceil(systemPrompt.length / 4);

  return (
    <ParameterZone 
      label="Prompt" 
      icon={<Terminal className="h-3.5 w-3.5" />}
      isOpen={isOpen} 
      onToggle={onToggle}
      mutedTextColor={mutedTextColor}
      iconColor={iconColor}
      contrast={contrast}
      isPinkMode={isPinkMode}
    >
      <div className="space-y-3 group px-1">
        <div className="flex items-center gap-1.5">
          <Label className={cn("text-[10px] font-bold uppercase tracking-wider transition-colors duration-300", mutedTextColor)}>System Prompt</Label>
          <Tooltip>
            <TooltipTrigger render={(props) => (
              <div {...props}>
                <HelpCircle className={cn("h-3 w-3 cursor-help transition-none hover:scale-110 active:scale-95", iconColor)} />
              </div>
            )} />
            <TooltipContent side="left" className="max-w-[200px]">
              Sets the persona and behavior constraints for the AI.
            </TooltipContent>
          </Tooltip>
        </div>
        <textarea
          ref={textareaRef}
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="You are a helpful assistant..."
          className={cn(
            "w-full min-h-[80px] p-2 text-xs border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-primary/30 transition-none",
            inputBg,
            borderColor,
            textColor,
            isPinkMode && "focus:ring-rose-400/30 border-rose-200/20"
          )}
        />
        <div className="flex justify-end">
          <span className={cn("text-[10px] font-medium transition-colors duration-300", mutedTextColor)}>{tokenCount} tokens</span>
        </div>
      </div>
    </ParameterZone>
  );
};
