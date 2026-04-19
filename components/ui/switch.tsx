import * as React from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
  disabled?: boolean
  "aria-label"?: string
}

export function Switch({ checked, onCheckedChange, className, disabled, "aria-label": ariaLabel }: SwitchProps) {
  return (
    <div 
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={cn(
        "relative flex h-8 w-16 shrink-0 cursor-pointer items-center rounded-xl border border-muted-foreground/10 bg-muted/20 p-1 transition-all duration-300 select-none",
        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/40 active:scale-95",
        checked && "bg-primary/10 border-primary/20",
        className
      )}
    >
      <motion.div
        layout
        initial={false}
        animate={{ 
          x: checked ? 32 : 0,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "flex h-6 w-7 items-center justify-center rounded-lg shadow-md transition-colors duration-300",
          checked 
            ? "bg-primary text-primary-foreground shadow-primary/20" 
            : "bg-white dark:bg-neutral-800 text-muted-foreground border border-muted-foreground/10"
        )}
      >
        <span className="text-[9px] font-black tracking-tight uppercase">
          {checked ? "ON" : "OFF"}
        </span>
      </motion.div>
    </div>
  )
}
