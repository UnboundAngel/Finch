import React from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTauri } from '@/src/hooks/useTauri';
import { SketchMinus, SketchSquare, SketchX } from '@/src/components/ui/Icons';

const appWindow = getCurrentWindow();

interface WindowControlsProps {
  theme?: 'sketch' | 'terminal';
  isIncognito?: boolean;
}

/**
 * Custom window controls for Tauri desktop environment.
 */
export function WindowControls({ theme, isIncognito }: WindowControlsProps) {
  const { isTauri, isMaximized } = useTauri();

  if (!isTauri) return null;

  const handleMaximize = async () => {
    if (await appWindow.isMaximized()) {
      await appWindow.unmaximize();
    } else {
      await appWindow.maximize();
    }
  };

  const isSketch = theme === 'sketch' || isIncognito;

  const buttonClass = `p-1.5 transition-all flex items-center justify-center rounded-lg ${
    isSketch 
      ? "text-current hover:scale-110 bg-transparent" 
      : "text-muted-foreground hover:bg-muted/50"
  }`;

  return (
    <div className="flex items-center gap-0.5 ml-2 no-drag">
      <button 
        onClick={() => appWindow.minimize()} 
        className={buttonClass}
        title="Minimize"
      >
        {isSketch ? <SketchMinus /> : <Minus className="h-4 w-4" />}
      </button>
      <button 
        onClick={handleMaximize} 
        className={buttonClass}
        title={isMaximized ? "Restore" : "Maximize"}
      >
        {isSketch ? <SketchSquare /> : (isMaximized ? <Copy className="h-4 w-4" /> : <Square className="h-3.5 w-3.5" />)}
      </button>
      <button 
        onClick={() => appWindow.close()} 
        className={`${buttonClass} ${isSketch ? "hover:text-red-500" : "hover:text-white hover:bg-destructive"}`}
        title="Close"
      >
        {isSketch ? <SketchX /> : <X className="h-4 w-4" />}
      </button>
    </div>
  );
}
