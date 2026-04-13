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
  contrast?: 'light' | 'dark';
}

export const RightSidebar = ({ isOpen, isPinkMode, contrast }: RightSidebarProps) => {
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

  const textColor = contrast === 'dark' ? 'text-black' : 'text-white';
  const mutedTextColor = contrast === 'dark' ? 'text-black/60' : 'text-white/60';
  const inputBg = contrast === 'dark' ? 'bg-black/10' : 'bg-white/10';
  const borderColor = contrast === 'dark' ? 'border-black/10' : 'border-white/10';
  const iconColor = contrast === 'dark' ? 'text-black/40 hover:text-black' : 'text-white/40 hover:text-white';

  return (
    <motion.aside
      initial={false}
      animate={{ 
        width: isOpen ? 300 : 0,
        opacity: isOpen ? 1 : 0
      }}
      className={cn(
        "h-full overflow-hidden flex flex-col border-l transition-colors duration-300",
        borderColor
      )}
    >
      <TooltipProvider delay={200}>
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8">
            {/* Header */}
            <div className="space-y-1.5">
              <h2 className={cn("text-sm font-bold uppercase tracking-widest transition-colors", textColor)}>Parameters</h2>
              <p className={cn("text-xs leading-relaxed transition-colors", mutedTextColor)}>
                Global configuration for all AI interactions.
              </p>
            </div>

            {/* 1. System Prompt */}
            <div className="space-y-3 group">
              <div className="flex items-center gap-1.5">
                <Label className={cn("text-[11px] font-bold uppercase tracking-wider transition-colors", mutedTextColor)}>System Prompt</Label>
                <Tooltip>
                  <TooltipTrigger render={(props) => (
                    <div {...props}>
                      <HelpCircle className={cn("h-3.5 w-3.5 cursor-help transition-all hover:scale-110 active:scale-95", iconColor)} />
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
                  "w-full min-h-[120px] p-3 text-xs border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all hover:translate-y-[-1px]",
                  inputBg,
                  borderColor,
                  textColor,
                  isPinkMode && "focus:ring-rose-400/40 border-rose-200/30"
                )}
              />
              <div className="flex justify-end">
                <span className={cn("text-[10px] font-medium transition-colors", mutedTextColor)}>{tokenCount} tokens</span>
              </div>
            </div>

            {/* 2. Creativity (Temperature) */}
            <div className="space-y-3 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Label className={cn("text-[11px] font-bold uppercase tracking-wider transition-colors", mutedTextColor)}>Creativity</Label>
                  <Tooltip>
                    <TooltipTrigger render={(props) => (
                      <div {...props}>
                        <HelpCircle className={cn("h-3.5 w-3.5 cursor-help transition-all hover:scale-110 active:scale-95", iconColor)} />
                      </div>
                    )} />
                    <TooltipContent side="left" className="max-w-[200px]">
                      Temperature: Controls randomness. 0 is deterministic, 2 is max chaos.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-mono transition-colors", mutedTextColor)}>{temperature.toFixed(2)}</span>
                  <span className={cn("text-[10px] font-mono font-bold w-8 text-right transition-colors", isPinkMode ? 'text-rose-500/60' : 'text-primary/60')}>
                    {Math.round((temperature / 2) * 100)}%
                  </span>
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
                  "w-full h-1.5 rounded-lg appearance-none cursor-pointer transition-all hover:translate-y-[-1px]",
                  contrast === 'dark' ? "bg-black/20" : "bg-white/20",
                  getTemperatureColor(temperature)
                )}
              />
            </div>

            {/* 3. Focus (Top P) */}
            <div className="space-y-3 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Label className={cn("text-[11px] font-bold uppercase tracking-wider transition-colors", mutedTextColor)}>Focus</Label>
                  <Tooltip>
                    <TooltipTrigger render={(props) => (
                      <div {...props}>
                        <HelpCircle className={cn("h-3.5 w-3.5 cursor-help transition-all hover:scale-110 active:scale-95", iconColor)} />
                      </div>
                    )} />
                    <TooltipContent side="left" className="max-w-[200px]">
                      Top P: Narrows token selection. Lower values make output more focused/precise.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-mono transition-colors", mutedTextColor)}>{topP.toFixed(2)}</span>
                  <span className={cn("text-[10px] font-mono font-bold w-8 text-right transition-colors", isPinkMode ? 'text-rose-500/60' : 'text-primary/60')}>
                    {Math.round(topP * 100)}%
                  </span>
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
                  "w-full h-1.5 rounded-lg appearance-none cursor-pointer transition-all hover:translate-y-[-1px]",
                  contrast === 'dark' ? "bg-black/20" : "bg-white/20",
                  getTopPColor(topP)
                )}
              />
            </div>

            {/* 4. Response Length (Max Tokens) */}
            <div className="space-y-3 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Label className={cn("text-[11px] font-bold uppercase tracking-wider transition-colors", mutedTextColor)}>Response Length</Label>
                  <Tooltip>
                    <TooltipTrigger render={(props) => (
                      <div {...props}>
                        <HelpCircle className={cn("h-3.5 w-3.5 cursor-help transition-all hover:scale-110 active:scale-95", iconColor)} />
                      </div>
                    )} />
                    <TooltipContent side="left" className="max-w-[200px]">
                      Maximum number of tokens to generate in the response.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-mono transition-colors", mutedTextColor)}>{maxTokens}</span>
                  <span className={cn("text-[10px] font-mono font-bold w-8 text-right transition-colors", isPinkMode ? 'text-rose-500/60' : 'text-primary/60')}>
                    {Math.round(((maxTokens - 1) / (8192 - 1)) * 100)}%
                  </span>
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
                  "w-full h-1.5 rounded-lg appearance-none cursor-pointer transition-all hover:translate-y-[-1px]",
                  contrast === 'dark' ? "bg-black/20" : "bg-white/20",
                  getMaxTokensColor(maxTokens)
                )}
              />
            </div>

            {/* 5. Stop Words */}
            <div className="space-y-3 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Label className={cn("text-[11px] font-bold uppercase tracking-wider transition-colors", mutedTextColor)}>Stop Words</Label>
                  <Tooltip>
                    <TooltipTrigger render={(props) => (
                      <div {...props}>
                        <HelpCircle className={cn("h-3.5 w-3.5 cursor-help transition-all hover:scale-110 active:scale-95", iconColor)} />
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
                    "w-full h-9 px-3 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all hover:translate-y-[-1px]",
                    inputBg,
                    borderColor,
                    textColor,
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
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        onClick={() => removeStopString(stop)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] group cursor-default transition-all active:scale-95 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20",
                          contrast === 'dark' ? "bg-black/5 text-black/80 border-black/10" : "bg-white/5 text-white/80 border-white/10",
                          isPinkMode && "border-rose-200/20"
                        )}
                      >
                        {stop}
                        <X className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity cursor-pointer" />
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
