import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';
import { useModelParams } from '@/src/store';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface RightSidebarProps {
  isOpen: boolean;
  isPinkMode?: boolean;
}

export const RightSidebar = ({ isOpen, isPinkMode }: RightSidebarProps) => {
  const {
    systemPrompt,
    temperature,
    topP,
    maxTokens,
    stopStrings,
    setSystemPrompt,
    setTemperature,
    setTopP,
    setMaxTokens,
    addStopString,
    removeStopString
  } = useModelParams();

  const stopInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea on mount and when systemPrompt changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 144)}px`;
    }
  }, [systemPrompt]);

  const handleAddStop = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && stopInputRef.current) {
      const val = stopInputRef.current.value.trim();
      if (val) {
        addStopString(val);
        stopInputRef.current.value = '';
      }
    }
  };

  const tokenCount = Math.ceil(systemPrompt.length / 4);

  const getTemperatureColor = (val: number) => {
    if (val <= 0.3) return 'accent-red-500';
    if (val <= 1.2) return 'accent-emerald-500';
    if (val <= 1.8) return 'accent-amber-500';
    return 'accent-red-500';
  };

  const getTopPColor = (val: number) => {
    if (val <= 0.3) return 'accent-red-500';
    if (val <= 0.7) return 'accent-amber-500';
    return 'accent-emerald-500';
  };

  const getMaxTokensColor = (val: number) => {
    if (val <= 256) return 'accent-amber-500';
    if (val <= 4096) return 'accent-emerald-500';
    return 'accent-amber-500';
  };

  return (
    <motion.aside
      initial={false}
      animate={{ 
        width: isOpen ? 300 : 0,
        opacity: isOpen ? 1 : 0
      }}
      className="h-full border-l border-white/10 overflow-hidden flex flex-col"
    >
      <TooltipProvider delay={200}>
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8">
            {/* Header */}
            <div className="space-y-1.5">
              <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/80">Parameters</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Global configuration for all AI interactions.
              </p>
            </div>

            {/* 1. System Prompt */}
            <div className="space-y-3 group">
              <div className="flex items-center gap-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">System Prompt</Label>
                <Tooltip>
                  <TooltipTrigger render={(props) => (
                    <div {...props}>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/40 cursor-help hover:text-muted-foreground transition-colors hover:scale-110 active:scale-95" />
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
                  "w-full min-h-[120px] p-3 text-xs bg-black/20 border border-white/10 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all hover:translate-y-[-1px]",
                  isPinkMode && "focus:ring-rose-400/40 border-rose-200/30"
                )}
              />
              <div className="flex justify-end">
                <span className="text-[10px] font-medium text-muted-foreground/60">{tokenCount} tokens</span>
              </div>
            </div>

            {/* 2. Creativity (Temperature) */}
            <div className="space-y-3 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Creativity</Label>
                  <Tooltip>
                    <TooltipTrigger render={(props) => (
                      <div {...props}>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/40 cursor-help hover:text-muted-foreground transition-colors hover:scale-110 active:scale-95" />
                      </div>
                    )} />
                    <TooltipContent side="left" className="max-w-[200px]">
                      Temperature: Controls randomness. 0 is deterministic, 2 is max chaos.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground/80">{temperature.toFixed(2)}</span>
                  <span className="text-[10px] font-mono text-primary/60 font-bold w-8 text-right">{Math.round((temperature / 2) * 100)}%</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className={cn(
                  "w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-black/40 transition-all hover:translate-y-[-1px]",
                  getTemperatureColor(temperature)
                )}
              />
            </div>

            {/* 3. Focus (Top P) */}
            <div className="space-y-3 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Focus</Label>
                  <Tooltip>
                    <TooltipTrigger render={(props) => (
                      <div {...props}>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/40 cursor-help hover:text-muted-foreground transition-colors hover:scale-110 active:scale-95" />
                      </div>
                    )} />
                    <TooltipContent side="left" className="max-w-[200px]">
                      Top P: Narrows token selection. Lower values make output more focused/precise.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground/80">{topP.toFixed(2)}</span>
                  <span className="text-[10px] font-mono text-primary/60 font-bold w-8 text-right">{Math.round(topP * 100)}%</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className={cn(
                  "w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-black/40 transition-all hover:translate-y-[-1px]",
                  getTopPColor(topP)
                )}
              />
            </div>

            {/* 4. Response Length (Max Tokens) */}
            <div className="space-y-3 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Response Length</Label>
                  <Tooltip>
                    <TooltipTrigger render={(props) => (
                      <div {...props}>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/40 cursor-help hover:text-muted-foreground transition-colors hover:scale-110 active:scale-95" />
                      </div>
                    )} />
                    <TooltipContent side="left" className="max-w-[200px]">
                      Maximum number of tokens to generate in the response.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground/80">{maxTokens}</span>
                  <span className="text-[10px] font-mono text-primary/60 font-bold w-8 text-right">{Math.round(((maxTokens - 1) / (8192 - 1)) * 100)}%</span>
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="8192"
                step="1"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className={cn(
                  "w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-black/40 transition-all hover:translate-y-[-1px]",
                  getMaxTokensColor(maxTokens)
                )}
              />
            </div>

            {/* 5. Stop Words */}
            <div className="space-y-3 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Stop Words</Label>
                  <Tooltip>
                    <TooltipTrigger render={(props) => (
                      <div {...props}>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/40 cursor-help hover:text-muted-foreground transition-colors hover:scale-110 active:scale-95" />
                      </div>
                    )} />
                    <TooltipContent side="left" className="max-w-[200px]">
                      The model will stop generating text if it encounters any of these strings.
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div className="space-y-3">
                <input
                  ref={stopInputRef}
                  type="text"
                  onKeyDown={handleAddStop}
                  placeholder="Type and press Enter..."
                  className={cn(
                    "w-full h-9 px-3 text-xs bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all hover:translate-y-[-1px]",
                    isPinkMode && "focus:ring-rose-400/40 border-rose-200/30"
                  )}
                />
                <div className="flex flex-wrap gap-1.5">
                  <AnimatePresence initial={false}>
                    {stopStrings.map((stop) => (
                      <motion.span
                        key={stop}
                        layout
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] group cursor-default transition-all hover:bg-white/10",
                          isPinkMode && "border-rose-200/20"
                        )}
                      >
                        {stop}
                        <button
                          onClick={() => removeStopString(stop)}
                          className="hover:text-destructive transition-colors focus:outline-none"
                        >
                          <X className="h-3 w-3 opacity-40 group-hover:opacity-100" />
                        </button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </TooltipProvider>
    </motion.aside>
  );
};
