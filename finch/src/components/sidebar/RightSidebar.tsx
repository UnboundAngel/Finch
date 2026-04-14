import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, Loader2, Trash2, ChevronDown } from 'lucide-react';
import { useModelParams, useChatStore } from '@/src/store';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { MaxTokensSlider } from './MaxTokensSlider';

interface RightSidebarProps {
  isOpen: boolean;
  readyToFetch?: boolean;
  isPinkMode?: boolean;
  contrast?: 'light' | 'dark';
}

export const RightSidebar = ({ isOpen, readyToFetch, isPinkMode, contrast }: RightSidebarProps) => {
  const systemPrompt = useModelParams(state => state.systemPrompt);
  const temperature = useModelParams(state => state.temperature);
  const topP = useModelParams(state => state.topP);
  const maxTokens = useModelParams(state => state.maxTokens);
  const stopStrings = useModelParams(state => state.stopStrings);
  const setSystemPrompt = useModelParams(state => state.setSystemPrompt);
  const setTemperature = useModelParams(state => state.setTemperature);
  const setTopP = useModelParams(state => state.setTopP);
  const addStopString = useModelParams(state => state.addStopString);
  const removeStopString = useModelParams(state => state.removeStopString);
  const fetchContextIntelligence = useModelParams(state => state.fetchContextIntelligence);
  const contextIntelligenceStatus = useModelParams(state => state.contextIntelligenceStatus);

  const selectedModel = useChatStore((state) => state.selectedModel);
  const selectedProvider = useChatStore((state) => state.selectedProvider);
  const setMaxTokens = useModelParams(state => state.setMaxTokens);
  const contextIntelligence = useModelParams(state => state.contextIntelligence);

  const [localMaxTokens, setLocalMaxTokens] = React.useState(maxTokens.toString());
  const [tempInput, setTempInput] = React.useState(temperature.toString());
  const [pInput, setPInput] = React.useState(topP.toString());
  const [themeMode, setThemeMode] = React.useState('');

  const [isPromptOpen, setIsPromptOpen] = React.useState(true);
  const [isSamplingOpen, setIsSamplingOpen] = React.useState(true);
  const [isOutputOpen, setIsOutputOpen] = React.useState(true);

  // Sync with store
  React.useEffect(() => {
    setLocalMaxTokens(maxTokens.toString());
  }, [maxTokens]);

  // Theme Observer for zero-flash gradients
  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeMode(document.documentElement.className);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    setThemeMode(document.documentElement.className);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    setTempInput(temperature.toString());
  }, [temperature]);

  React.useEffect(() => {
    setPInput(topP.toString());
  }, [topP]);

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

  React.useEffect(() => {
    // Only fetch if sidebar is open AND animation is finished
    if (selectedProvider && selectedModel && isOpen && readyToFetch) {
      fetchContextIntelligence(selectedProvider, selectedModel);
    }
  }, [selectedProvider, selectedModel, isOpen, readyToFetch, fetchContextIntelligence]);

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

  const getTemperatureGradient = React.useCallback((val: number) => {
    const thumbPct = (val / 2) * 100;
    const rStop = (0.3 / 2) * 100;
    const gStop = (1.2 / 2) * 100;
    const aStop = (1.8 / 2) * 100;
    const bleed = 5; // 5% on each side = 10% total bleed
    const muted = contrast === 'dark' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)';

    const stops = [];
    // Red zone -> Emerald zone
    stops.push(`#ef4444 0%, #ef4444 ${rStop - bleed}%`);
    stops.push(`#10b981 ${rStop + bleed}%`);
    
    // Emerald zone -> Amber zone
    stops.push(`#10b981 ${gStop - bleed}%`);
    stops.push(`#f59e0b ${gStop + bleed}%`);
    
    // Amber zone -> Red zone (high)
    stops.push(`#f59e0b ${aStop - bleed}%`);
    stops.push(`#ef4444 ${aStop + bleed}%`);

    return `linear-gradient(to right, ${stops.join(', ')}, #ef4444 ${thumbPct}%, ${muted} ${thumbPct}%, ${muted} 100%)`;
  }, [contrast, themeMode]);

  const getTopPGradient = React.useCallback((val: number) => {
    const thumbPct = val * 100;
    const rStop = 0.3 * 100;
    const aStop = 0.7 * 100;
    const bleed = 5;
    const muted = contrast === 'dark' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)';

    const stops = [];
    // Red zone -> Amber zone
    stops.push(`#ef4444 0%, #ef4444 ${rStop - bleed}%`);
    stops.push(`#f59e0b ${rStop + bleed}%`);

    // Amber zone -> Emerald zone
    stops.push(`#f59e0b ${aStop - bleed}%`);
    stops.push(`#10b981 ${aStop + bleed}%`);

    return `linear-gradient(to right, ${stops.join(', ')}, #10b981 ${thumbPct}%, ${muted} ${thumbPct}%, ${muted} 100%)`;
  }, [contrast, themeMode]);

  const textColor = contrast === 'dark' ? 'text-black' : 'text-white';
  const mutedTextColor = contrast === 'dark' ? 'text-black/60' : 'text-white/60';
  const inputBg = contrast === 'dark' ? 'bg-black/10' : 'bg-white/10';
  const borderColor = contrast === 'dark' ? 'border-black/10' : 'border-white/10';
  const iconColor = contrast === 'dark' ? 'text-black/40 hover:text-black' : 'text-white/40 hover:text-white';

  return (
    <aside
      className={cn(
        "h-full w-[300px] flex flex-col transition-opacity duration-300 ease-in-out relative overflow-hidden",
        isOpen ? "opacity-100" : "opacity-0",
        borderColor
      )}
    >
      <div className="absolute inset-0 w-[300px] flex flex-col min-h-0">
        <TooltipProvider delay={200}>
          <ScrollArea className="flex-1 w-full h-full scrollbar-thin">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="space-y-1.5 px-1">
                <h2 className={cn("text-xs font-bold uppercase tracking-[0.3em] transition-colors duration-300", textColor)}>Parameters</h2>
                <p className={cn("text-[10px] leading-relaxed transition-colors duration-300", mutedTextColor)}>
                  Global configuration for all AI interactions.
                </p>
              </div>

              {/* Zone 1: Prompt */}
              <ParameterZone 
                label="Prompt" 
                isOpen={isPromptOpen} 
                onToggle={() => setIsPromptOpen(!isPromptOpen)}
                mutedTextColor={mutedTextColor}
                iconColor={iconColor}
                contrast={contrast}
                isPinkMode={isPinkMode}
              >
                <div className="space-y-3 group">
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
                      "w-full min-h-[100px] p-2.5 text-xs border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-primary/30 transition-none",
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

              <div className={cn("h-px w-full mx-auto", borderColor)} />

              {/* Zone 2: Sampling */}
              <ParameterZone 
                label="Sampling" 
                isOpen={isSamplingOpen} 
                onToggle={() => setIsSamplingOpen(!isSamplingOpen)}
                mutedTextColor={mutedTextColor}
                iconColor={iconColor}
                contrast={contrast}
                isPinkMode={isPinkMode}
              >
                {/* Creativity (Temperature) */}
                <div className="space-y-3 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Label className={cn("text-[10px] font-bold uppercase tracking-wider transition-colors duration-300", mutedTextColor)}>Creativity</Label>
                      <Tooltip>
                        <TooltipTrigger render={(props) => (
                          <div {...props}>
                            <HelpCircle className={cn("h-3 w-3 cursor-help transition-none hover:scale-110 active:scale-95", iconColor)} />
                          </div>
                        )} />
                        <TooltipContent side="left" className="max-w-[200px]">
                          Temperature: Controls randomness. 0 is deterministic, 2 is max chaos.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Tooltip>
                        <TooltipTrigger render={(props) => (
                          <button 
                            {...props}
                            onClick={() => setTemperature(0.7)}
                            className={cn("p-1 rounded-md transition-none hover:bg-destructive/10 active:scale-90 opacity-40 hover:opacity-100", textColor)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )} />
                        <TooltipContent side="left" className="text-[10px] py-1 px-2">
                          Reset to 0.7
                        </TooltipContent>
                      </Tooltip>
                      <input
                        type="text"
                        value={tempInput}
                        onChange={(e) => setTempInput(e.target.value)}
                        onBlur={() => {
                          const parsed = parseFloat(tempInput);
                          const clamped = isNaN(parsed) ? 0.7 : Math.min(2, Math.max(0, parsed));
                          setTemperature(clamped);
                          setTempInput(clamped.toString());
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                        }}
                        className={cn(
                          "w-12 h-6 px-1.5 rounded-md text-[10px] font-mono text-right border transition-none focus:outline-none focus:ring-1 focus:ring-primary/30",
                          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                          inputBg,
                          borderColor,
                          textColor
                        )}
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.01"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    style={{ background: getTemperatureGradient(temperature) }}
                    className={cn(
                      "w-full h-1 rounded-lg appearance-none cursor-pointer transition-none hover:translate-y-[-0.5px]",
                      "active:scale-[1.002]",
                      "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-zinc-300 dark:[&::-webkit-slider-thumb]:border-zinc-700",
                      "[&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-none shadow-md"
                    )}
                  />
                </div>

                {/* Focus (Top P) */}
                <div className="space-y-3 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Label className={cn("text-[10px] font-bold uppercase tracking-wider transition-colors duration-300", mutedTextColor)}>Focus</Label>
                      <Tooltip>
                        <TooltipTrigger render={(props) => (
                          <div {...props}>
                            <HelpCircle className={cn("h-3 w-3 cursor-help transition-none hover:scale-110 active:scale-95", iconColor)} />
                          </div>
                        )} />
                        <TooltipContent side="left" className="max-w-[200px]">
                          Top P: Narrows token selection. Lower values make output more focused/precise.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Tooltip>
                        <TooltipTrigger render={(props) => (
                          <button 
                            {...props}
                            onClick={() => setTopP(1.0)}
                            className={cn("p-1 rounded-md transition-none hover:bg-destructive/10 active:scale-90 opacity-40 hover:opacity-100", textColor)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )} />
                        <TooltipContent side="left" className="text-[10px] py-1 px-2">
                          Reset to 1.0
                        </TooltipContent>
                      </Tooltip>
                      <input
                        type="text"
                        value={pInput}
                        onChange={(e) => setPInput(e.target.value)}
                        onBlur={() => {
                          const parsed = parseFloat(pInput);
                          const clamped = isNaN(parsed) ? 1.0 : Math.min(1, Math.max(0, parsed));
                          setTopP(clamped);
                          setPInput(clamped.toString());
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                        }}
                        className={cn(
                          "w-12 h-6 px-1.5 rounded-md text-[10px] font-mono text-right border transition-none focus:outline-none focus:ring-1 focus:ring-primary/30",
                          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                          inputBg,
                          borderColor,
                          textColor
                        )}
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={topP}
                    onChange={(e) => setTopP(parseFloat(e.target.value))}
                    style={{ background: getTopPGradient(topP) }}
                    className={cn(
                      "w-full h-1 rounded-lg appearance-none cursor-pointer transition-none hover:translate-y-[-0.5px]",
                      "active:scale-[1.002]",
                      "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-zinc-300 dark:[&::-webkit-slider-thumb]:border-zinc-700",
                      "[&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-none shadow-md"
                    )}
                  />
                </div>
              </ParameterZone>

              <div className={cn("h-px w-full mx-auto", borderColor)} />

              {/* Zone 3: Output */}
              <ParameterZone 
                label="Output" 
                isOpen={isOutputOpen} 
                onToggle={() => setIsOutputOpen(!isOutputOpen)}
                mutedTextColor={mutedTextColor}
                iconColor={iconColor}
                contrast={contrast}
                isPinkMode={isPinkMode}
              >
                <div className="space-y-3 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Label className={cn("text-[10px] font-bold uppercase tracking-wider transition-colors duration-300", mutedTextColor)}>Response Length</Label>
                      <Tooltip>
                        <TooltipTrigger render={(props) => (
                          <div {...props}>
                            <HelpCircle className={cn("h-3 w-3 cursor-help transition-none hover:scale-110 active:scale-95", iconColor)} />
                          </div>
                        )} />
                        <TooltipContent side="left" className="max-w-[200px]">
                          Controls the maximum length of the model's reply.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-2">
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
                  <MaxTokensSlider contrast={contrast} />
                </div>
              </ParameterZone>

              {/* Stop Words - Footnote Section */}
              <div className="pt-2 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <Label className={cn("text-[10px] font-bold uppercase tracking-wider transition-colors duration-300", mutedTextColor)}>Stop Words</Label>
                    <Tooltip>
                      <TooltipTrigger render={(props) => (
                        <div {...props}>
                          <HelpCircle className={cn("h-3 w-3 cursor-help transition-none hover:scale-110 active:scale-95", iconColor)} />
                        </div>
                      )} />
                      <TooltipContent side="left" className="max-w-[200px]">
                        The model will stop generating text if it encounters any of these strings.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <div className="space-y-3 px-1">
                  <input
                    ref={stopInputRef}
                    type="text"
                    onKeyDown={handleAddStop}
                    placeholder="Type and press Enter..."
                    className={cn(
                      "w-full h-9 px-3 text-xs border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/30 transition-none",
                      inputBg,
                      borderColor,
                      textColor,
                      isPinkMode && "focus:ring-rose-400/30 border-rose-200/20"
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
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] group cursor-default transition-none active:scale-95 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20",
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
      </div>
    </aside>
  );
};

interface ParameterZoneProps {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  mutedTextColor: string;
  iconColor: string;
  contrast?: 'light' | 'dark';
  isPinkMode?: boolean;
}

const ParameterZone = ({ 
  label, 
  isOpen, 
  onToggle, 
  children, 
  mutedTextColor, 
  iconColor, 
  contrast, 
  isPinkMode 
}: ParameterZoneProps) => (
  <div className={cn(
    "rounded-xl border transition-all duration-300",
    contrast === 'dark' ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5",
    isPinkMode && "border-rose-200/10"
  )}>
    <button 
      onClick={onToggle}
      className="w-full h-9 px-3 flex items-center justify-between group cursor-pointer"
    >
      <span className={cn("text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-300", mutedTextColor)}>
        {label}
      </span>
      <motion.div
        animate={{ rotate: isOpen ? 0 : -90 }}
        transition={{ duration: 0.2 }}
        className={iconColor}
      >
        <ChevronDown className="h-4 w-4" />
      </motion.div>
    </button>
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: "auto" }}
          exit={{ height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="px-3 pb-4 pt-1 space-y-4">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
