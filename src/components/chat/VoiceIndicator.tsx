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

  // Reorder levels for the perfect Whisper 'Middle-Out' distribution
  // We want the highest energy (bass/mids) in the center, tapering to high frequencies on the ends
  const levels = React.useMemo(() => {
    const reordered = new Array(barsCount).fill(0.12);
    const mid = Math.floor(barsCount / 2);
    
    // Distribute frequency bins symmetrically from the center
    // rawLevels[0] is the most energetic (bass), we place it in the center.
    // Higher indices (treble) move to the edges.
    for (let i = 0; i <= mid; i++) {
      const value = rawLevels[i] || 0.12;
      if (mid + i < barsCount) reordered[mid + i] = value;
      if (mid - i >= 0) reordered[mid - i] = value;
    }
    return reordered;
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
            "px-2.5 py-2 rounded-full flex items-center justify-center min-w-[56px]",
            "backdrop-blur-3xl border shadow-[0_15px_40px_rgba(0,0,0,0.25)]",
            isPinkMode 
              ? "bg-rose-500/10 border-rose-200/50 shadow-rose-200/20" 
              : "bg-black/70 border-white/15 dark:border-white/10"
          )}
        >
          {/* Symmetrical Waveform */}
          <div className="flex items-center gap-[1.5px] h-3.5">
            {levels.map((level, i) => (
              <motion.div 
                key={i}
                initial={{ scaleY: 0.12 }}
                animate={{ 
                  scaleY: level,
                  opacity: 0.35 + (level * 0.65)
                }}
                transition={{ 
                  type: "spring", 
                  damping: 25, 
                  stiffness: 500,
                  mass: 0.4
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
