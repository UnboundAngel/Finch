import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAudioVisualization } from '@/src/hooks/useAudioVisualization';

interface VoiceIndicatorProps {
  isActive: boolean;
  isPinkMode?: boolean;
}

export const VoiceIndicator = ({ isActive, isPinkMode }: VoiceIndicatorProps) => {
  // We use 15 bars for a more data-rich but thin density
  const barsCount = 15;
  const rawLevels = useAudioVisualization(isActive, barsCount);

  // Energy Pulse Logic: Ensure all dots react to the VOLUME, not just frequency
  // This stops the 'left-right walk' and ensures a cohesive vertical bounce
  const levels = React.useMemo(() => {
    // 1. Calculate the active volume (average of all bins)
    const average = rawLevels.reduce((a, b) => a + b, 0) / (barsCount || 1);
    
    // 2. Map volume to bars with a Gaussian-like weight distribution
    // Center bars react more, edge bars react less
    return new Array(barsCount).fill(0).map((_, i) => {
      const distFromCenter = Math.abs(i - Math.floor(barsCount / 2));
      const weight = Math.max(0.3, 1 - (distFromCenter / (barsCount / 1.5)));
      
      // Ensure a minimum floor so dots never 'delete' (disappear) as requested
      const floor = 0.12; 
      const reaction = average * weight * 1.5; // Boost the reaction slightly
      
      return Math.max(floor, reaction);
    });
  }, [rawLevels, barsCount]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.9, x: "-50%" }}
          animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
          exit={{ opacity: 0, y: 8, scale: 0.95, x: "-50%" }}
          transition={{ type: "spring", damping: 25, stiffness: 400 }}
          style={{ left: '50%' }}
          className={cn(
            "absolute bottom-full mb-2 z-[100] pointer-events-none",
            "px-2.5 py-2 rounded-full flex items-center justify-center min-w-[70px]", // Increased min-width for stability
            "backdrop-blur-3xl border shadow-[0_15px_40px_rgba(0,0,0,0.25)]",
            isPinkMode 
              ? "bg-rose-500/10 border-rose-200/50 shadow-rose-200/20" 
              : "bg-black/75 border-white/15 dark:border-white/10"
          )}
        >
          {/* Stabilized Unified Waveform */}
          <div className="flex items-center gap-[1.5px] h-3.5 w-[50px] justify-center">
            {levels.map((level, i) => (
              <motion.div 
                key={i}
                initial={{ scaleY: 0.12 }}
                animate={{ 
                  scaleY: level,
                  opacity: 0.4 + (level * 0.6)
                }}
                transition={{ 
                  type: "spring", 
                  damping: 35, // Smoother vertical damping
                  stiffness: 450,
                  mass: 0.5
                }}
                style={{ originY: 0.5 }} 
                className={cn(
                  "w-[1.5px] h-full rounded-full transition-colors duration-300",
                  isPinkMode ? "bg-rose-400" : "bg-white"
                )}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
