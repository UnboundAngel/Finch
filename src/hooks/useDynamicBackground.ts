import { useState, useCallback, useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { getImageLuminance } from '../lib/luminance';

interface UseDynamicBackgroundProps {
  isDark: boolean;
  customBgLight: string;
  customBgDark: string;
  isIncognito: boolean;
  showPinkMode: boolean;
}

export function useDynamicBackground({
  isDark,
  customBgLight,
  customBgDark,
  isIncognito,
  showPinkMode
}: UseDynamicBackgroundProps) {
  const [headerContrast, setHeaderContrast] = useState<'light' | 'dark'>(isDark ? 'light' : 'dark');
  const [sidebarContrast, setSidebarContrast] = useState<'light' | 'dark'>(isDark ? 'light' : 'dark');
  const [rightSidebarContrast, setRightSidebarContrast] = useState<'light' | 'dark'>(isDark ? 'light' : 'dark');

  const analyzeBackground = useCallback(async () => {
    const activeBg = isDark ? customBgDark : customBgLight;
    const isDarkCurrent = isDark;

    if (showPinkMode) {
      setHeaderContrast('dark');
      setSidebarContrast('dark');
      setRightSidebarContrast('dark');
      document.documentElement.style.setProperty('--selection-bg', 'oklch(0.6 0.16 165 / 25%)');
      document.documentElement.style.setProperty('--selection-text', 'oklch(0.3 0.12 165)');
      return;
    }

    if (!activeBg || isIncognito) {
      setHeaderContrast(isDarkCurrent ? 'light' : 'dark');
      setSidebarContrast(isDarkCurrent ? 'light' : 'dark');
      setRightSidebarContrast(isDarkCurrent ? 'light' : 'dark');
      // Reset to modern defaults (Violet)
      document.documentElement.style.setProperty('--selection-bg', isDarkCurrent ? 'oklch(0.7 0.2 300 / 30%)' : 'oklch(0.6 0.2 300 / 20%)');
      document.documentElement.style.setProperty('--selection-text', isDarkCurrent ? 'oklch(0.9 0.1 300)' : 'oklch(0.4 0.2 300)');
      return;
    }

    try {
      const imageUrl = convertFileSrc(activeBg);
      const [headerLum, sidebarLum, mainAreaLum, rightSidebarLum] = await Promise.all([
        getImageLuminance(imageUrl, 'top-right'),
        getImageLuminance(imageUrl, 'left-edge'),
        getImageLuminance(imageUrl, 'center'),
        getImageLuminance(imageUrl, 'right-edge')
      ]);

      // Custom background: Use safe neutral selection based on the center luminance (where text is)
      const isMainAreaBright = mainAreaLum > 0.5;
      document.documentElement.style.setProperty('--selection-bg', isMainAreaBright ? 'oklch(0.6 0.2 300 / 25%)' : 'oklch(0.8 0.15 300 / 35%)');
      document.documentElement.style.setProperty('--selection-text', isMainAreaBright ? 'oklch(0.3 0.15 300)' : 'oklch(0.95 0.05 300)');

      setHeaderContrast(headerLum >= 0.5 ? 'dark' : 'light');
      setSidebarContrast(sidebarLum >= 0.5 ? 'dark' : 'light');
      setRightSidebarContrast(rightSidebarLum >= 0.5 ? 'dark' : 'light');
    } catch (error) {
      console.error('Failed to analyze background luminance:', error);
    }
  }, [customBgLight, customBgDark, isIncognito, showPinkMode, isDark]);

  useEffect(() => {
    analyzeBackground();
  }, [analyzeBackground]);

  return {
    headerContrast,
    sidebarContrast,
    rightSidebarContrast,
    analyzeBackground
  };
}
