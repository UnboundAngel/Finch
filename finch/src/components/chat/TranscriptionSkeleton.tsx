import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TranscriptionSkeletonProps {
  isPinkMode?: boolean;
}

export const TranscriptionSkeleton = ({ isPinkMode }: TranscriptionSkeletonProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="flex flex-col items-start w-full pl-12 pr-4 py-2"
    >
      <div className={cn(
        "relative overflow-hidden rounded-2xl px-4 py-3 min-w-[120px] max-w-[60%] shadow-sm",
        isPinkMode 
          ? "bg-rose-100/30 border border-rose-200/30" 
          : "bg-primary/5 border border-primary/10"
      )}>
        {/* Shimmer Effect */}
        <motion.div
          animate={{
            x: ['-100%', '100%']
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear"
          }}
          className={cn(
            "absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent",
            isPinkMode && "via-rose-200/20"
          )}
        />

        <div className="flex items-center gap-2 relative z-10">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ 
                  opacity: [0.3, 1, 0.3] 
                }}
                transition={{ 
                  duration: 1, 
                  repeat: Infinity, 
                  delay: i * 0.2 
                }}
                className={cn(
                  "h-1 w-1 rounded-full",
                  isPinkMode ? "bg-rose-400" : "bg-primary/60"
                )}
              />
            ))}
          </div>
          <span className={cn(
            "text-[10px] font-medium tracking-wide uppercase opacity-60",
            isPinkMode ? "text-rose-500" : "text-primary"
          )}>
            Transcribing
          </span>
        </div>
        
        <div className="mt-2 space-y-1.5 relative z-10">
          <div className={cn("h-1.5 w-full rounded-full opacity-20", isPinkMode ? "bg-rose-400" : "bg-primary")} />
          <div className={cn("h-1.5 w-[70%] rounded-full opacity-20", isPinkMode ? "bg-rose-400" : "bg-primary")} />
        </div>
      </div>
    </motion.div>
  );
};
