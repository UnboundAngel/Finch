import React from 'react';

export const useParameterGradients = (
  isPinkMode: boolean | undefined,
  contrast: 'light' | 'dark' | undefined,
  themeMode: string
) => {
  const getTemperatureGradient = React.useCallback((val: number) => {
    const isEdited = Math.abs(val - 0.7) > 0.01;
    const thumbPct = (val / 2) * 100;
    
    // Theme-aware track and fill colors
    const baseTrack = isPinkMode 
      ? 'rgba(16, 185, 129, 0.1)'  // Green for Susie
      : (contrast === 'light' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)');

    const fillTrack = isPinkMode
      ? 'rgba(16, 185, 129, 0.3)'  // Brighter fill for Susie
      : (contrast === 'light' ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.16)');

    if (!isEdited) {
      return `linear-gradient(to right, ${fillTrack} 0%, ${fillTrack} ${thumbPct}%, ${baseTrack} ${thumbPct}%, ${baseTrack} 100%)`;
    }

    const rStop = (0.3 / 2) * 100;
    const gStop = (1.2 / 2) * 100;
    const aStop = (1.8 / 2) * 100;
    const bleed = 5;

    const stops = [
      `#ef4444 0%`,
      `#ef4444 ${rStop - bleed}%`,
      `#10b981 ${rStop + bleed}%`,
      `#10b981 ${gStop - bleed}%`,
      `#f59e0b ${gStop + bleed}%`,
      `#f59e0b ${aStop - bleed}%`,
      `#ef4444 ${aStop + bleed}%`,
      `#ef4444 100%`
    ];

    const clippedStops = stops.map(s => {
      const [color, posStr] = s.split(' ');
      const pos = parseFloat(posStr);
      return pos > thumbPct ? `${color} ${thumbPct}%` : s;
    });

    return `linear-gradient(to right, ${clippedStops.join(', ')}, ${baseTrack} ${thumbPct}%, ${baseTrack} 100%)`;
  }, [contrast, themeMode, isPinkMode]);

  const getTopPGradient = React.useCallback((val: number) => {
    const isEdited = Math.abs(val - 0.9) > 0.01;
    const thumbPct = val * 100;
    
    // Theme-aware track and fill colors
    const baseTrack = isPinkMode 
      ? 'rgba(16, 185, 129, 0.1)'  // Green for Susie
      : (contrast === 'light' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)');

    const fillTrack = isPinkMode
      ? 'rgba(16, 185, 129, 0.3)'  // Brighter fill for Susie
      : (contrast === 'light' ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.16)');

    if (!isEdited) {
      return `linear-gradient(to right, ${fillTrack} 0%, ${fillTrack} ${thumbPct}%, ${baseTrack} ${thumbPct}%, ${baseTrack} 100%)`;
    }

    const rStop = 0.3 * 100;
    const aStop = 0.7 * 100;
    const bleed = 5;

    const stops = [
      `#ef4444 0%`,
      `#ef4444 ${rStop - bleed}%`,
      `#f59e0b ${rStop + bleed}%`,
      `#f59e0b ${aStop - bleed}%`,
      `#10b981 ${aStop + bleed}%`,
      `#10b981 100%`
    ];

    const clippedStops = stops.map(s => {
      const [color, posStr] = s.split(' ');
      const pos = parseFloat(posStr);
      return pos > thumbPct ? `${color} ${thumbPct}%` : s;
    });

    return `linear-gradient(to right, ${clippedStops.join(', ')}, ${baseTrack} ${thumbPct}%, ${baseTrack} 100%)`;
  }, [contrast, themeMode, isPinkMode]);

  return {
    getTemperatureGradient,
    getTopPGradient
  };
};
