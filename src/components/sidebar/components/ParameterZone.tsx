import React from 'react';
import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export const ParameterZone = ({ 
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
    <div
      className={cn(
        "overflow-hidden transition-all duration-200",
        isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
      )}
    >
      <div className="px-5 pb-5 pt-3 space-y-4">
        {children}
      </div>
    </div>
  </div>
);
