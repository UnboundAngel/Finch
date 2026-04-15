import React from 'react';
import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';

interface TranscriptionSkeletonProps {
  isPinkMode?: boolean;
}

export const TranscriptionSkeleton = ({ isPinkMode }: TranscriptionSkeletonProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex gap-4 w-full"
    >
      <div className={`h-8 w-8 shrink-0 mt-0.5 rounded-lg flex items-center justify-center shadow-sm ${
        isPinkMode 
          ? "bg-pink-500 text-white" 
          : "bg-primary text-primary-foreground"
      }`}>
        <Mic className="h-4 w-4 animate-pulse" />
      </div>
      
      <div className="flex-1 space-y-3 overflow-hidden">
        <div className="flex items-center gap-2">
          <div className={`text-xs font-bold tracking-wider uppercase opacity-50 ${
            isPinkMode ? "text-pink-600" : ""
          }`}>
            Transcribing Audio
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                className={`h-1 w-1 rounded-full ${isPinkMode ? "bg-pink-400" : "bg-primary/40"}`}
              />
            ))}
          </div>
        </div>

        <div className={`relative overflow-hidden rounded-2xl p-4 min-h-[80px] border ${
          isPinkMode
            ? "bg-white/40 border-pink-200/50 backdrop-blur-md"
            : "bg-muted/40 border-white/10 backdrop-blur-md"
        }`}>
          {/* Shimmer Effect */}
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className={`absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent`}
          />
          
          <div className="space-y-2 relative z-10">
            <div className={`h-4 w-3/4 rounded-md ${isPinkMode ? "bg-pink-200/50" : "bg-foreground/5"}`} />
            <div className={`h-4 w-1/2 rounded-md ${isPinkMode ? "bg-pink-200/30" : "bg-foreground/5"}`} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
