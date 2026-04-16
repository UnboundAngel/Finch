import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X, Plus } from 'lucide-react';
import { useParamsStore } from '@/src/store/useParamsStore';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface RightSidebarProps {
  isOpen: boolean;
  isPinkMode?: boolean;
}

export const RightSidebar = ({ isOpen, isPinkMode }: RightSidebarProps) => {
  const {
    system_prompt,
    temperature,
    top_p,
    max_tokens,
    stop_strings,
    setSystemPrompt,
    setTemperature,
    setTopP,
    setMaxTokens,
    addStopString,
    removeStopString
  } = useParamsStore();

  const [newStop, setNewStop] = useState('');

  const handleAddStop = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newStop.trim()) {
      addStopString(newStop.trim());
      setNewStop('');
    }
  };

  const tokenCount = Math.ceil(system_prompt.length / 4);

  return (
    <motion.aside
      initial={false}
      animate={{ 
        width: isOpen ? 300 : 0,
        opacity: isOpen ? 1 : 0
      }}
      className="h-full border-l border-white/10 overflow-hidden flex flex-col"
    >
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8">
          {/* Header */}
          <div className="space-y-1.5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/80">Parameters</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Global configuration for all AI interactions.
            </p>
          </div>

          {/* System Prompt */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">System Prompt</Label>
              <span className="text-[10px] font-medium text-muted-foreground/60">{tokenCount} tokens</span>
            </div>
            <textarea
              value={system_prompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful assistant..."
              className={cn(
                "w-full min-h-[120px] p-3 text-xs bg-black/20 border border-white/10 rounded-xl resize-none focus:outline-none focus:ring-1 transition-all",
                isPinkMode ? "focus:ring-rose-400 border-rose-200/30" : "focus:ring-primary/50"
              )}
            />
          </div>

          {/* Creativity - Temperature */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Creativity</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground/40 cursor-help hover:text-muted-foreground transition-colors" />
                  </TooltipTrigger>

                  <TooltipContent side="left" className="max-w-[200px] p-3 text-xs">
                    Temperature — controls randomness. Higher = more creative, lower = more predictable.
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/80">Temperature</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className={cn(
                  "flex-1 h-1 rounded-lg appearance-none cursor-pointer accent-primary",
                  isPinkMode && "accent-rose-400"
                )}
              />
              <Input
                type="number"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-14 h-7 text-[10px] px-1.5 text-center bg-black/20 border-white/10"
              />
            </div>
          </div>

          {/* Focus - Top P */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Focus</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground/40 cursor-help hover:text-muted-foreground transition-colors" />
                  </TooltipTrigger>

                  <TooltipContent side="left" className="max-w-[200px] p-3 text-xs">
                    Top P — narrows token selection. Lower = more focused.
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/80">Top P</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={top_p}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className={cn(
                  "flex-1 h-1 rounded-lg appearance-none cursor-pointer accent-primary",
                  isPinkMode && "accent-rose-400"
                )}
              />
              <Input
                type="number"
                value={top_p}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="w-14 h-7 text-[10px] px-1.5 text-center bg-black/20 border-white/10"
              />
            </div>
          </div>

          {/* Response Length */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Response Length</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground/40 cursor-help hover:text-muted-foreground transition-colors" />
                  </TooltipTrigger>

                  <TooltipContent side="left" className="max-w-[200px] p-3 text-xs">
                    Max Tokens — maximum length of the AI response.
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/80">Max Tokens</span>
            </div>
            <Input
              type="number"
              value={max_tokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="w-full h-9 text-xs bg-black/20 border-white/10 focus:ring-1"
            />
          </div>

          {/* Stop Words */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Stop Words</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground/40 cursor-help hover:text-muted-foreground transition-colors" />
                  </TooltipTrigger>

                  <TooltipContent side="left" className="max-w-[200px] p-3 text-xs">
                    Stop Strings — model stops generating when it hits these.
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/80">Stop Strings</span>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newStop}
                  onChange={(e) => setNewStop(e.target.value)}
                  onKeyDown={handleAddStop}
                  placeholder="Add string..."
                  className="h-8 text-xs bg-black/20 border-white/10"
                />
                <button 
                  onClick={() => { if(newStop.trim()) { addStopString(newStop.trim()); setNewStop(''); } }}
                  className={cn(
                    "p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-95",
                    isPinkMode && "bg-rose-400/10 text-rose-500 hover:bg-rose-400/20"
                  )}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <AnimatePresence>
                  {stop_strings.map((stop) => (
                    <motion.span
                      key={stop}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] group cursor-pointer hover:bg-destructive/10 hover:border-destructive/20 transition-all",
                        isPinkMode && "border-rose-200/20"
                      )}
                      onClick={() => removeStopString(stop)}
                    >
                      {stop}
                      <X className="h-2.5 w-2.5 opacity-40 group-hover:opacity-100 group-hover:text-destructive transition-all" />
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </motion.aside>
  );
};
