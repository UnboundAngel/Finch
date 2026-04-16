import React, { useState, useEffect } from 'react';
import { Sliders, HelpCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useModelParams } from '@/src/store';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ParameterZone } from './ParameterZone';
import { useSidebarTheme } from '../hooks/useSidebarTheme';
import { useParameterGradients } from '../hooks/useParameterGradients';

interface SamplingSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  isPinkMode?: boolean;
  contrast?: 'light' | 'dark';
}

export const SamplingSection = ({ 
  isOpen, 
  onToggle, 
  isPinkMode, 
  contrast 
}: SamplingSectionProps) => {
  const temperature = useModelParams(state => state.temperature);
  const topP = useModelParams(state => state.topP);
  const setTemperature = useModelParams(state => state.setTemperature);
  const setTopP = useModelParams(state => state.setTopP);
  
  const { themeMode, textColor, mutedTextColor, inputBg, borderColor, iconColor, circleBorderClass } = useSidebarTheme(isPinkMode, contrast);
  const { getTemperatureGradient, getTopPGradient } = useParameterGradients(isPinkMode, contrast, themeMode);

  const [tempInput, setTempInput] = useState(temperature.toString());
  const [pInput, setPInput] = useState(topP.toString());

  useEffect(() => {
    setTempInput(temperature.toString());
  }, [temperature]);

  useEffect(() => {
    setPInput(topP.toString());
  }, [topP]);

  const getTemperatureWarning = (val: number) => {
    if (val > 1.8) return "Extremely high creativity can result in incoherent or gibberish output.";
    if (val > 1.4) return "Increasing creativity can lead to hallucinations or repetitive patterns.";
    if (val < 0.3) return "Very low values may result in stiff, repetitive, or overly literal text.";
    return null;
  };

  const getTopPWarning = (val: number) => {
    if (val < 0.2) return "Tight focus can lead to generic or repeated phrases.";
    if (val > 0.95) return "Maximum diversity might introduce unexpected or irrelevant topics.";
    return null;
  };

  return (
    <ParameterZone 
      label="Sampling" 
      icon={<Sliders className="h-3.5 w-3.5" />}
      isOpen={isOpen} 
      onToggle={onToggle}
      mutedTextColor={mutedTextColor}
      iconColor={iconColor}
      contrast={contrast}
      isPinkMode={isPinkMode}
    >
      <div className="space-y-6 px-1">
        {/* Creativity (Temperature) */}
        <div className="space-y-3 group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Label className={cn("text-[10px] font-bold uppercase tracking-wider transition-colors duration-300", mutedTextColor)}>Creativity</Label>
              <Tooltip>
                <TooltipTrigger render={(props) => (
                  <div {...props}>
                    <HelpCircle className={cn("h-3 w-3 cursor-help transition-none hover:scale-110 active:scale-95", iconColor)} />
                  </div>
                )} />
                <TooltipContent side="left" className="max-w-[200px]">
                  Temperature: High is creative and random. Low is focused and literal.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger render={(props) => (
                  <button 
                    {...props}
                    onClick={() => setTemperature(0.7)}
                    className={cn("p-1 rounded-md transition-none hover:bg-destructive/10 active:scale-90 opacity-40 hover:opacity-100", textColor)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )} />
                <TooltipContent side="left" className="text-[10px] py-1 px-2">
                  Reset to 0.7
                </TooltipContent>
              </Tooltip>
              <input
                type="text"
                value={tempInput}
                onChange={(e) => setTempInput(e.target.value)}
                onBlur={() => {
                  const parsed = parseFloat(tempInput);
                  const clamped = isNaN(parsed) ? 0.7 : Math.min(2, Math.max(0, parsed));
                  setTemperature(clamped);
                  setTempInput(clamped.toString());
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                className={cn(
                  "w-12 h-6 px-1.5 rounded-md text-[10px] font-mono text-right border transition-none focus:outline-none focus:ring-1 focus:ring-primary/30",
                  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                  inputBg,
                  borderColor,
                  textColor
                )}
              />
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.01"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            style={{ background: getTemperatureGradient(temperature) }}
            className={cn(
              "w-full h-1 rounded-lg appearance-none cursor-pointer transition-none",
              "active:scale-[1.002]",
              "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border",
              circleBorderClass,
              "[&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border shadow-md"
            )}
          />
          <AnimatePresence>
            {getTemperatureWarning(temperature) && (
              <motion.p
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 4 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className={cn("text-[9px] italic leading-tight px-1", isPinkMode ? (temperature > 1.8 || temperature < 0.3 ? "text-rose-500" : "text-amber-500") : (temperature > 1.8 || temperature < 0.3 ? "text-rose-400/80" : "text-amber-400/80"))}
              >
                {getTemperatureWarning(temperature)}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Focus (Top P) */}
        <div className="space-y-3 group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Label className={cn("text-[10px] font-bold uppercase tracking-wider transition-colors duration-300", mutedTextColor)}>Focus</Label>
              <Tooltip>
                <TooltipTrigger render={(props) => (
                  <div {...props}>
                    <HelpCircle className={cn("h-3 w-3 cursor-help transition-none hover:scale-110 active:scale-95", iconColor)} />
                  </div>
                )} />
                <TooltipContent side="left" className="max-w-[200px]">
                  Top P: High is a wide vocabulary. Low is a narrow and focused vocabulary.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger render={(props) => (
                  <button 
                    {...props}
                    onClick={() => setTopP(0.9)}
                    className={cn("p-1 rounded-md transition-none hover:bg-destructive/10 active:scale-90 opacity-40 hover:opacity-100", textColor)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )} />
                <TooltipContent side="left" className="text-[10px] py-1 px-2">
                  Reset to 0.9
                </TooltipContent>
              </Tooltip>
              <input
                type="text"
                value={pInput}
                onChange={(e) => setPInput(e.target.value)}
                onBlur={() => {
                  const parsed = parseFloat(pInput);
                  const clamped = isNaN(parsed) ? 1.0 : Math.min(1, Math.max(0.01, parsed));
                  setTopP(clamped);
                  setPInput(clamped.toString());
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                className={cn(
                  "w-12 h-6 px-1.5 rounded-md text-[10px] font-mono text-right border transition-none focus:outline-none focus:ring-1 focus:ring-primary/30",
                  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                  inputBg,
                  borderColor,
                  textColor
                )}
              />
            </div>
          </div>
          <input
            type="range"
            min="0.01"
            max="1"
            step="0.01"
            value={topP}
            onChange={(e) => setTopP(parseFloat(e.target.value))}
            style={{ background: getTopPGradient(topP) }}
            className={cn(
              "w-full h-1 rounded-lg appearance-none cursor-pointer transition-none",
              "active:scale-[1.002]",
              "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border",
              circleBorderClass,
              "[&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border shadow-md"
            )}
          />
          <AnimatePresence>
            {getTopPWarning(topP) && (
              <motion.p
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 4 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className={cn("text-[9px] italic leading-tight px-1", isPinkMode ? (topP < 0.2 ? "text-rose-500" : "text-amber-500") : (topP < 0.2 ? "text-rose-400/80" : "text-amber-400/80"))}
              >
                {getTopPWarning(topP)}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </ParameterZone>
  );
};
