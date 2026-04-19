import React, { useRef } from 'react';
import { Hash, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useModelParams } from '@/src/store';
import { cn } from '@/lib/utils';
import { ParameterZone } from './ParameterZone';
import { useSidebarTheme } from '../hooks/useSidebarTheme';

interface StopWordsSectionProps {
  isOpen?: boolean;
  onToggle?: () => void;
  isPinkMode?: boolean;
  contrast?: 'light' | 'dark';
}

export const StopWordsSection = ({ 
  isOpen = true, 
  onToggle = () => {}, 
  isPinkMode, 
  contrast 
}: StopWordsSectionProps) => {
  const stopStrings = useModelParams(state => state.stopStrings);
  const addStopString = useModelParams(state => state.addStopString);
  const removeStopString = useModelParams(state => state.removeStopString);
  
  const { textColor, mutedTextColor, inputBg, borderColor, iconColor } = useSidebarTheme(isPinkMode, contrast);
  const stopInputRef = useRef<HTMLInputElement>(null);

  const handleAddStop = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && stopInputRef.current) {
      const val = stopInputRef.current.value.trim();
      if (val) {
        addStopString(val);
        stopInputRef.current.value = '';
      }
    }
  };

  return (
    <ParameterZone 
      label="Stop Words" 
      icon={<Hash className="h-3.5 w-3.5" />}
      isOpen={isOpen}
      onToggle={onToggle}
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
  );
};
