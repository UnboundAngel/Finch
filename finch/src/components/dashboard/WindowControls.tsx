import React, { useState, useRef, useEffect } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import { getCurrentWindow, currentMonitor } from '@tauri-apps/api/window';
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi';
import { useTauri } from '@/src/hooks/useTauri';
import { SketchMinus, SketchSquare, SketchX } from '@/src/components/ui/Icons';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';

const appWindow = getCurrentWindow();

interface WindowControlsProps {
  theme?: 'sketch' | 'terminal';
  isIncognito?: boolean;
  contrast?: 'light' | 'dark';
}

/**
 * Custom window controls for Tauri desktop environment.
 */
export function WindowControls({ theme, isIncognito, contrast }: WindowControlsProps) {
  const { isTauri, isMaximized } = useTauri();
  const [showSnapLayouts, setShowSnapLayouts] = useState(false);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  if (!isTauri) return null;

  const handleMaximize = async () => {
    if (await appWindow.isMaximized()) {
      await appWindow.unmaximize();
    } else {
      await appWindow.maximize();
    }
  };

  const isSketch = theme === 'sketch' || isIncognito;

  const buttonClass = `p-1.5 transition-all flex items-center justify-center rounded-lg ${isSketch
      ? `hover:scale-110 bg-transparent ${contrast === 'dark' ? 'text-black hover:bg-black/10' : 'text-white hover:bg-white/10'}`
      : `${contrast === 'dark' ? 'text-black/60 hover:text-black hover:bg-black/5' : 'text-white/60 hover:text-white hover:bg-white/10'}`
    }`;

  const snapTo = async (layout: string) => {
    try {
      const monitor = await currentMonitor();
      if (!monitor) return;

      const { position: { x, y }, size: { width, height } } = monitor.workArea;

      // Robust unmaximize sequencing as suggested
      const isMax = await appWindow.isMaximized();
      if (isMax) {
        // Create a promise that resolves on the next resize event
        await new Promise<void>(async (resolve) => {
          const unlisten = await appWindow.onResized(() => {
            unlisten();
            resolve();
          });
          await appWindow.unmaximize();
          // Safety fallback for race conditions
          setTimeout(resolve, 250);
        });
      }

      let newX = x, newY = y, newW = width, newH = height;

      switch (layout) {
        case 'l50': newW = width / 2; break;
        case 'r50': newX = x + width / 2; newW = width / 2; break;
        case 'l25': newW = width / 4; break;
        case 'r25': newX = x + (width * 3) / 4; newW = width / 4; break;
        case 'c50': newX = x + width / 4; newW = width / 2; break;
        case 'tl25': newW = width / 2; newH = height / 2; break;
        case 'tr25': newX = x + width / 2; newW = width / 2; newH = height / 2; break;
        case 'bl25': newY = y + height / 2; newW = width / 2; newH = height / 2; break;
        case 'br25': newX = x + width / 2; newY = y + height / 2; newW = width / 2; newH = height / 2; break;
      }

      await appWindow.setSize(new LogicalSize(newW, newH));
      await appWindow.setPosition(new LogicalPosition(newX, newY));
      setShowSnapLayouts(false);
    } catch (err) {
      console.error('Snapping failed:', err);
    }
  };

  const handleMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setShowSnapLayouts(true), 400);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    // Minimal delay for immediate exit
    hoverTimeout.current = setTimeout(() => setShowSnapLayouts(false), 50);
  };

  const handlePopupEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setShowSnapLayouts(true);
  };

  return (
    <div className="flex items-center gap-0.5 ml-2 no-drag relative">
      <Tooltip>
        <TooltipTrigger
          render={(props) => (
            <button
              {...props}
              onClick={() => appWindow.minimize()}
              className={buttonClass}
            >
              {isSketch ? <SketchMinus /> : <Minus className="h-4 w-4" />}
            </button>
          )}
        />
        <TooltipContent side="bottom">Minimize</TooltipContent>
      </Tooltip>

      <div
        className="relative flex items-center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          onClick={handleMaximize}
          className={buttonClass}
        >
          {isSketch ? <SketchSquare /> : (isMaximized ? <Copy className="h-4 w-4" /> : <Square className="h-3.5 w-3.5" />)}
        </button>

        <AnimatePresence>
          {showSnapLayouts && (
            <>
              {/* Hover bridge to prevent menu from closing when moving mouse between button and menu */}
              <div
                className="absolute top-[80%] left-0 right-0 h-4 z-[90]"
                onMouseEnter={handlePopupEnter}
              />

              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                onMouseEnter={handlePopupEnter}
                onMouseLeave={handleMouseLeave}
                className="absolute top-full right-0 mt-2 p-5 rounded-2xl border border-black/5 dark:border-white/10 bg-[#FCF9F2]/98 dark:bg-zinc-950/98 backdrop-blur-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] z-[100] w-[280px]"
              >
                <div className="flex flex-col gap-8">
                  {/* Top Row: Split and Quarters */}
                  <div className="flex flex-row justify-between items-start gap-4">
                    {/* Pair 1: Halves */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-[9px] uppercase tracking-[0.15em] text-black/40 dark:text-white/40 font-bold">Split</div>
                      <div className="flex gap-1.5 h-20 w-28">
                        <button onClick={() => snapTo('l50')} className="flex-1 border border-black/5 dark:border-white/5 rounded-md bg-black/[0.03] dark:bg-white/[0.03] hover:bg-primary/20 transition-all relative overflow-hidden group">
                          <div className="absolute inset-y-0.5 left-0.5 w-[calc(100%-4px)] bg-primary/30 group-hover:bg-primary/50 rounded-sm transition-colors" />
                        </button>
                        <button onClick={() => snapTo('r50')} className="flex-1 border border-black/5 dark:border-white/5 rounded-md bg-black/[0.03] dark:bg-white/[0.03] hover:bg-primary/20 transition-all relative overflow-hidden group">
                          <div className="absolute inset-y-0.5 right-0.5 w-[calc(100%-4px)] bg-primary/30 group-hover:bg-primary/50 rounded-sm transition-colors" />
                        </button>
                      </div>
                    </div>

                    {/* Pair 3: Quarters */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-[9px] uppercase tracking-[0.15em] text-black/40 dark:text-white/40 font-bold">Quarters</div>
                      <div className="grid grid-cols-2 grid-rows-2 gap-1.5 h-20 w-28">
                        <button onClick={() => snapTo('tl25')} className="border border-black/5 dark:border-white/5 rounded-md bg-black/[0.03] dark:bg-white/[0.03] hover:bg-primary/20 transition-all relative overflow-hidden group">
                          <div className="absolute inset-0.5 bg-primary/30 group-hover:bg-primary/50 rounded-sm transition-colors" />
                        </button>
                        <button onClick={() => snapTo('tr25')} className="border border-black/5 dark:border-white/5 rounded-md bg-black/[0.03] dark:bg-white/[0.03] hover:bg-primary/20 transition-all relative overflow-hidden group">
                          <div className="absolute inset-0.5 bg-primary/30 group-hover:bg-primary/50 rounded-sm transition-colors" />
                        </button>
                        <button onClick={() => snapTo('bl25')} className="border border-black/5 dark:border-white/5 rounded-md bg-black/[0.03] dark:bg-white/[0.03] hover:bg-primary/20 transition-all relative overflow-hidden group">
                          <div className="absolute inset-0.5 bg-primary/30 group-hover:bg-primary/50 rounded-sm transition-colors" />
                        </button>
                        <button onClick={() => snapTo('br25')} className="border border-black/5 dark:border-white/5 rounded-md bg-black/[0.03] dark:bg-white/[0.03] hover:bg-primary/20 transition-all relative overflow-hidden group">
                          <div className="absolute inset-0.5 bg-primary/30 group-hover:bg-primary/50 rounded-sm transition-colors" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Focus */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="text-[9px] uppercase tracking-[0.15em] text-black/40 dark:text-white/40 font-bold">Focus</div>
                    <div className="flex gap-1.5 h-20 w-full">
                      <button onClick={() => snapTo('l25')} className="w-1/4 border border-black/5 dark:border-white/5 rounded-md bg-black/[0.03] dark:bg-white/[0.03] hover:bg-primary/20 transition-all relative overflow-hidden group">
                        <div className="absolute inset-y-1.5 left-1 w-[calc(100%-8px)] bg-primary/30 group-hover:bg-primary/50 rounded-sm transition-colors" />
                      </button>
                      <button onClick={() => snapTo('c50')} className="w-1/2 border border-black/5 dark:border-white/5 rounded-md bg-black/[0.03] dark:bg-white/[0.03] hover:bg-primary/20 transition-all relative overflow-hidden group">
                        <div className="absolute inset-y-1.5 inset-x-1.5 bg-primary/30 group-hover:bg-primary/50 rounded-sm transition-colors" />
                      </button>
                      <button onClick={() => snapTo('r25')} className="w-1/4 border border-black/5 dark:border-white/5 rounded-md bg-black/[0.03] dark:bg-white/[0.03] hover:bg-primary/20 transition-all relative overflow-hidden group">
                        <div className="absolute inset-y-1.5 right-1 w-[calc(100%-8px)] bg-primary/30 group-hover:bg-primary/50 rounded-sm transition-colors" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <Tooltip>
        <TooltipTrigger
          render={(props) => (
            <button
              {...props}
              onClick={() => appWindow.close()}
              className={`${buttonClass} ${isSketch ? "hover:text-red-600 hover:bg-red-500/10" : "hover:bg-red-500/10 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400"}`}
            >
              {isSketch ? <SketchX /> : <X className="h-4 w-4" />}
            </button>
          )}
        />
        <TooltipContent side="bottom">Close</TooltipContent>
      </Tooltip>
    </div>
  );
}
