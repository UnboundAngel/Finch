import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useModelParams } from '@/src/store';
import { cn } from '@/lib/utils';

interface MaxTokensSliderProps {
  contrast?: 'light' | 'dark';
  isPinkMode?: boolean;
}

const PRESETS = [512, 2048, 4096, 8192, 16384, 32768, 'Max'];

export const MaxTokensSlider = ({ contrast, isPinkMode }: MaxTokensSliderProps) => {
  const maxTokens = useModelParams(state => state.maxTokens);
  const setMaxTokens = useModelParams(state => state.setMaxTokens);
  const contextIntelligence = useModelParams(state => state.contextIntelligence);

  const { hardware_safe_limit, model_max } = useMemo(() => {
    return contextIntelligence || {
      hardware_safe_limit: 8192,
      model_max: 8192,
      server_num_ctx: 8192,
    };
  }, [contextIntelligence]);

  const handlePresetClick = (val: number | 'Max') => {
    const finalVal = val === 'Max' ? model_max : val;
    setMaxTokens(finalVal);
  };

  const getZoneColor = (val: number | 'Max') => {
    if (val === 'Max') return 'red';
    return (val as number) <= hardware_safe_limit ? 'emerald' : 'amber';
  };

  const mutedTextColor = contrast === 'light' ? 'text-white/40' : 'text-black/40';
  const trackBg = contrast === 'light' ? 'bg-white/12' : 'bg-black/10';
  const borderColor = contrast === 'light' ? 'border-white/15' : 'border-black/5';

  // Theme-aware border for circular elements (slider thumbs/status dots)
  const circleBorderClass = isPinkMode 
    ? "border-[#064e3b]" 
    : contrast === 'light' 
        ? "border-black" 
        : "border-zinc-400";

  const visiblePresets = useMemo(() => {
    return PRESETS.filter(p => p === 'Max' || (p as number) <= model_max);
  }, [model_max]);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  React.useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = 'grabbing';
      return () => { document.body.style.cursor = ''; };
    }
  }, [isDragging]);

  const handlePan = (info: { point: { x: number } }) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = info.point.x - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    const index = Math.floor(progress * visiblePresets.length);
    const clampedIndex = Math.min(index, visiblePresets.length - 1);
    handlePresetClick(visiblePresets[clampedIndex] as number | 'Max');
  };

  return (
    <div className="space-y-4 w-full pt-1">
      {/* Hardware Segmented Track */}
      <motion.div 
        ref={containerRef}
        onPan={(_, info) => handlePan(info)}
        onPanStart={(_, info) => {
          setIsDragging(true);
          handlePan(info);
        }}
        onPanEnd={() => setIsDragging(false)}
        className={cn(
          "relative flex p-1 rounded-xl border transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]",
          borderColor,
          trackBg,
          isDragging ? "cursor-grabbing" : "cursor-default"
        )}
      >
        {visiblePresets.map((preset, idx) => {
            const zone = getZoneColor(preset as number | 'Max');
            const isSelected = preset === 'Max' ? maxTokens === model_max : maxTokens === preset;
            
            return (
              <React.Fragment key={preset}>
                <button
                disabled={isDragging}
                onClick={() => handlePresetClick(preset as number | 'Max')}
                className={cn(
                    "relative flex-1 py-1.5 px-1 rounded-md text-[9px] font-bold transition-all uppercase tracking-wide z-10",
                    isSelected ? "text-white" : mutedTextColor,
                    isDragging ? "pointer-events-none" : (isSelected ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"),
                    "hover:text-white/80 transition-colors"
                )}
                >
                  <span className={cn(
                    "relative z-10 transition-all duration-300",
                    isSelected && contrast === 'light' && "drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] [text-shadow:0_0_1px_rgba(0,0,0,0.5)]"
                  )}>
                    {preset}
                  </span>
                  
                  {/* Hardware Status LED (Bottom Tick) */}
                  <div className={cn(
                      "absolute bottom-[2.5px] left-1/2 -translate-x-1/2 w-3 h-[1.5px] rounded-full transition-all duration-300",
                      zone === 'emerald' ? "bg-emerald-500" : 
                      zone === 'amber' ? "bg-amber-500" : 
                      "bg-rose-500",
                      isSelected && "opacity-0" // Hide tick when selected to avoid bleed
                  )} />

                  {/* Sliding Selection Pill */}
                  {isSelected && (
                      <motion.div
                      layoutId="active-pill"
                      layout="position"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                      className={cn(
                          "absolute inset-0 rounded-md shadow-sm z-0",
                          zone === 'emerald' ? "bg-emerald-500" : 
                          zone === 'amber' ? "bg-amber-500" : 
                          "bg-rose-500"
                      )}
                      />
                  )}
                </button>
                {idx < visiblePresets.length - 1 && (
                  <div className={cn("w-[1px] my-1.5 opacity-10", contrast === 'light' ? "bg-white" : "bg-black")} />
                )}
              </React.Fragment>
            );
        })}
      </motion.div>

      {/* Status Legend (Quiet Dashboard Style) */}
      <div className="space-y-2">
        <div className={cn("flex justify-between items-center text-[9px] font-bold uppercase tracking-[0.15em] px-1 opacity-40 grayscale", mutedTextColor)}>
          <div className="flex items-center gap-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full bg-emerald-500 border", circleBorderClass)} />
            Safe ({hardware_safe_limit})
          </div>
          <div className={cn(
            "flex items-center gap-1.5",
            model_max <= hardware_safe_limit && "hidden"
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full bg-amber-500 border", circleBorderClass)} />
            Caution
          </div>
        </div>
        
        <AnimatePresence>
          {maxTokens === model_max && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-[9px] italic leading-tight text-rose-400/80 px-1"
            >
              'Max' tokens might exceed hardware VRAM or context limits.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
