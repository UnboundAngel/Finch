import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAudioVisualization } from '@/src/hooks/useAudioVisualization';

interface VoiceIndicatorProps {
  isActive: boolean;
  isPinkMode?: boolean;
}

export const VoiceIndicator = ({ isActive, isPinkMode }: VoiceIndicatorProps) => {
  // 12 bars — matches Wispr Flow desktop
  const barsCount = 12;
  const barRefs = useAudioVisualization(isActive, barsCount);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.88, x: "-50%" }}
          animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
          exit={{ opacity: 0, y: 6, scale: 0.92, x: "-50%" }}
          transition={{ type: "spring", damping: 22, stiffness: 380 }}
          style={{ left: '50%', height: 34 }}
          className={cn(
            "absolute bottom-full mb-2 z-[100] pointer-events-none",
            // Pill shape matching Wispr Flow: compact, ~34px tall, dark
            "px-3 py-0 rounded-full flex items-center justify-center",
            "border",
            isPinkMode
              ? "bg-[#1a0810] border-rose-400/20 shadow-[0_8px_24px_rgba(244,63,94,0.25)]"
              : "bg-[#0f0f0f] border-white/[0.07] shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
          )}
        >
          {/* Waveform: clean solid bars, no glow, no gradient */}
          <div className="flex items-center gap-[2px]" style={{ height: 16 }}>
            {Array.from({ length: barsCount }, (_, i) => (
              <div
                key={i}
                ref={(el) => { barRefs.current[i] = el; }}
                style={{
                  transform: 'scaleY(0.06)',
                  transformOrigin: 'center',
                  opacity: 1,
                  width: 2,
                  height: '100%',
                  borderRadius: 9999,
                  background: isPinkMode ? '#fb7185' : '#ffffff',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
