import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, X, Loader2, Trash2, ChevronDown, 
  Terminal, Sliders, FileJson, Hash 
} from 'lucide-react';
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
    const isEdited = Math.abs(val - 0.7) > 0.01;
    const thumbPct = (val / 2) * 100;
    
    // Theme-aware track and fill colors
    const baseTrack = isPinkMode 
      ? 'rgba(16, 185, 129, 0.1)'  // Green for Susie
      : (contrast === 'light' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)');

    const fillTrack = isPinkMode
      ? 'rgba(16, 185, 129, 0.3)'  // Brighter fill for Susie
      : (contrast === 'light' ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.16)');

    if (!isEdited) {
      return `linear-gradient(to right, ${fillTrack} 0%, ${fillTrack} ${thumbPct}%, ${baseTrack} ${thumbPct}%, ${baseTrack} 100%)`;
    }

    const rStop = (0.3 / 2) * 100;
    const gStop = (1.2 / 2) * 100;
    const aStop = (1.8 / 2) * 100;
    const bleed = 5;

    const stops = [
      `#ef4444 0%`,
      `#ef4444 ${rStop - bleed}%`,
      `#10b981 ${rStop + bleed}%`,
      `#10b981 ${gStop - bleed}%`,
      `#f59e0b ${gStop + bleed}%`,
      `#f59e0b ${aStop - bleed}%`,
      `#ef4444 ${aStop + bleed}%`,
      `#ef4444 100%`
    ];

    const clippedStops = stops.map(s => {
      const [color, posStr] = s.split(' ');
      const pos = parseFloat(posStr);
      return pos > thumbPct ? `${color} ${thumbPct}%` : s;
    });

    return `linear-gradient(to right, ${clippedStops.join(', ')}, ${baseTrack} ${thumbPct}%, ${baseTrack} 100%)`;
  }, [contrast, themeMode, isPinkMode]);

  const getTopPGradient = React.useCallback((val: number) => {
    const isEdited = Math.abs(val - 0.9) > 0.01;
    const thumbPct = val * 100;
    
    // Theme-aware track and fill colors
    const baseTrack = isPinkMode 
      ? 'rgba(16, 185, 129, 0.1)'  // Green for Susie
      : (contrast === 'light' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)');

    const fillTrack = isPinkMode
      ? 'rgba(16, 185, 129, 0.3)'  // Brighter fill for Susie
      : (contrast === 'light' ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.16)');

    if (!isEdited) {
      return `linear-gradient(to right, ${fillTrack} 0%, ${fillTrack} ${thumbPct}%, ${baseTrack} ${thumbPct}%, ${baseTrack} 100%)`;
    }

    const rStop = 0.3 * 100;
    const aStop = 0.7 * 100;
    const bleed = 5;

    const stops = [
      `#ef4444 0%`,
      `#ef4444 ${rStop - bleed}%`,
      `#f59e0b ${rStop + bleed}%`,
      `#f59e0b ${aStop - bleed}%`,
      `#10b981 ${aStop + bleed}%`,
      `#10b981 100%`
    ];

    const clippedStops = stops.map(s => {
      const [color, posStr] = s.split(' ');
      const pos = parseFloat(posStr);
      return pos > thumbPct ? `${color} ${thumbPct}%` : s;
    });

    return `linear-gradient(to right, ${clippedStops.join(', ')}, ${baseTrack} ${thumbPct}%, ${baseTrack} 100%)`;
  }, [contrast, themeMode, isPinkMode]);

  const textColor = contrast === 'dark' ? 'text-black' : 'text-white';
  const mutedTextColor = contrast === 'dark' ? 'text-black/40' : 'text-white/40';
  const inputBg = contrast === 'dark' ? 'bg-black/10' : 'bg-white/10';
  const borderColor = contrast === 'dark' ? 'border-black/10' : 'border-white/10';
  const iconColor = contrast === 'dark' ? 'text-black/40 hover:text-black' : 'text-white/40 hover:text-white';

  const getTemperatureWarning = (val: number) => {
    if (val > 1.8) return "Extremely high creativity can result in incoherent or gibberish output.";
    if (val > 1.4) return "Increasing creativity can lead to hallucinations or repetitive patterns.";
    if (val < 0.3) return "Very low values may result in stiff, repetitive, or overly literal text.";
    return null;
  };

  const getTopPWarning = (val: number) => {
    if (val < 0.2) return "Tight focus can lead to generic or repeated phrases.";
    if (val > 0.95) return "Maximum diversity might introduce unexpected or irrelevant topics.";
    return null;
  };

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
            <div className="py-4 space-y-0 relative">
              {/* Header */}
              <div className="space-y-1 px-5 pb-6 pt-2">
                <h2 className={cn("text-[10px] font-bold uppercase tracking-[0.4em] transition-colors duration-300", textColor)}>Parameters</h2>
                <p className={cn("text-[9px] leading-relaxed transition-colors duration-300", mutedTextColor)}>
                  Global configuration for all AI interactions.
                </p>
              </div>

              {/* Zone 1: Prompt */}
              <ParameterZone 
                label="Prompt" 
                icon={<Terminal className="h-3.5 w-3.5" />}
                isOpen={isPromptOpen} 
                onToggle={() => setIsPromptOpen(!isPromptOpen)}
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

              {/* Zone 2: Sampling */}
              <ParameterZone 
                label="Sampling" 
                icon={<Sliders className="h-3.5 w-3.5" />}
                isOpen={isSamplingOpen} 
                onToggle={() => setIsSamplingOpen(!isSamplingOpen)}
                mutedTextColor={mutedTextColor}
                iconColor={iconColor}
                contrast={contrast}
                isPinkMode={isPinkMode}
              >
                <div className="space-y-6 px-1">
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
                            Temperature: High is creative and random. Low is focused and literal.
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
                        "w-full h-1 rounded-lg appearance-none cursor-pointer transition-none",
                        "active:scale-[1.002]",
                        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-zinc-300 dark:[&::-webkit-slider-thumb]:border-zinc-700",
                        "[&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-none shadow-md"
                      )}
                    />
                    <AnimatePresence>
                      {getTemperatureWarning(temperature) && (
                        <motion.p
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: "auto", marginTop: 4 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          className={cn("text-[9px] italic leading-tight px-1", isPinkMode ? "text-rose-500/80" : (temperature > 1.8 || temperature < 0.3 ? "text-rose-400/80" : "text-amber-400/80"))}
                        >
                          {getTemperatureWarning(temperature)}
                        </motion.p>
                      )}
                    </AnimatePresence>
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
                            Top P: High is a wide vocabulary. Low is a narrow and focused vocabulary.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Tooltip>
                          <TooltipTrigger render={(props) => (
                            <button 
                              {...props}
                              onClick={() => setTopP(0.9)}
                              className={cn("p-1 rounded-md transition-none hover:bg-destructive/10 active:scale-90 opacity-40 hover:opacity-100", textColor)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )} />
                          <TooltipContent side="left" className="text-[10px] py-1 px-2">
                            Reset to 0.9
                          </TooltipContent>
                        </Tooltip>
                        <input
                          type="text"
                          value={pInput}
                          onChange={(e) => setPInput(e.target.value)}
                          onBlur={() => {
                            const parsed = parseFloat(pInput);
                            const clamped = isNaN(parsed) ? 1.0 : Math.min(1, Math.max(0.01, parsed));
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
                      min="0.01"
                      max="1"
                      step="0.01"
                      value={topP}
                      onChange={(e) => setTopP(parseFloat(e.target.value))}
                      style={{ background: getTopPGradient(topP) }}
                      className={cn(
                        "w-full h-1 rounded-lg appearance-none cursor-pointer transition-none",
                        "active:scale-[1.002]",
                        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-zinc-300 dark:[&::-webkit-slider-thumb]:border-zinc-700",
                        "[&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-none shadow-md"
                      )}
                    />
                    <AnimatePresence>
                      {getTopPWarning(topP) && (
                        <motion.p
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: "auto", marginTop: 4 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          className={cn("text-[9px] italic leading-tight px-1", isPinkMode ? "text-rose-500/80" : (topP < 0.2 ? "text-rose-400/80" : "text-amber-400/80"))}
                        >
                          {getTopPWarning(topP)}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </ParameterZone>

              {/* Zone 3: Output */}
              <ParameterZone 
                label="Output" 
                icon={<FileJson className="h-3.5 w-3.5" />}
                isOpen={isOutputOpen} 
                onToggle={() => setIsOutputOpen(!isOutputOpen)}
                mutedTextColor={mutedTextColor}
                iconColor={iconColor}
                contrast={contrast}
                isPinkMode={isPinkMode}
              >
                <div className="space-y-3 group px-1">
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

              {/* Zone 4: Stop Words (Unified) */}
              <ParameterZone 
                label="Stop Words" 
                icon={<Hash className="h-3.5 w-3.5" />}
                isOpen={true} // Usually always there
                onToggle={() => {}} // Disabled toggle for stop words to match 'always there' feel? 
                // Wait, user said "is always there visually too", maybe they mean the section is un-collapsible or just the word is pinned.
                // I'll make it collapsible but pre-opened.
                mutedTextColor={mutedTextColor}
                iconColor={iconColor}
                contrast={contrast}
                isPinkMode={isPinkMode}
                uncollapsible
              >
                <div className="space-y-4 px-1">
                  <input
                    ref={stopInputRef}
                    type="text"
                    onKeyDown={handleAddStop}
                    placeholder="Type and press Enter..."
                    className={cn(
                      "w-full h-8 px-3 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 transition-none",
                      inputBg,
                      borderColor,
                      textColor,
                      isPinkMode && "focus:ring-rose-400/30 border-rose-200/10"
                    )}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    <AnimatePresence initial={false}>
                      {stopStrings.map((stop) => {
                        const isGhost = stop === '</think>';
                        return (
                          <motion.span
                            key={stop}
                            layout
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ opacity: isGhost ? 0.4 : 1, scale: 1 }}
                            whileHover={{ opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            onClick={() => removeStopString(stop)}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] group cursor-default transition-all active:scale-95",
                              isGhost && "border-dashed",
                              contrast === 'dark' ? "bg-black/5 text-black/80 border-black/10" : "bg-white/5 text-white/80 border-white/10",
                              isPinkMode && "border-rose-200/20 bg-rose-50/10 text-rose-600"
                            )}
                          >
                            {stop}
                            <X className="h-2.5 w-2.5 opacity-40 group-hover:opacity-100 transition-opacity cursor-pointer" />
                          </motion.span>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              </ParameterZone>
            </div>
          </ScrollArea>
        </TooltipProvider>
      </div>
    </aside>
  );
};

interface ParameterZoneProps {
  label: string;
  icon?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  mutedTextColor: string;
  iconColor: string;
  contrast?: 'light' | 'dark';
  isPinkMode?: boolean;
  uncollapsible?: boolean;
}

const ParameterZone = ({ 
  label, 
  icon,
  isOpen, 
  onToggle, 
  children, 
  mutedTextColor, 
  iconColor, 
  contrast, 
  isPinkMode,
  uncollapsible
}: ParameterZoneProps) => (
  <div className={cn(
    "transition-all duration-300",
    contrast === 'light' 
      ? "border-b-[0.5px] border-b-[#1E1E1E]" 
      : "border-b border-b-black/5 border-t-white/80 border-t first:border-t-0",
    isPinkMode && "border-b-rose-200/30 border-t-rose-50/20"
  )}>
    <button 
      onClick={!uncollapsible ? onToggle : undefined}
      className={cn(
        "w-full h-8 px-5 flex items-center justify-between group transition-colors",
        !uncollapsible && "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className={cn("transition-colors duration-300", iconColor)}>
          {icon}
        </div>
        <span className={cn("text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-300", mutedTextColor)}>
          {label}
        </span>
      </div>
      {!uncollapsible && (
        <motion.div
          animate={{ rotate: isOpen ? 0 : -90 }}
          transition={{ duration: 0.2 }}
          className={iconColor}
        >
          <ChevronDown className="h-3 w-3" />
        </motion.div>
      )}
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
          <div className="px-5 pb-5 pt-3 space-y-4">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
