import React from 'react';

export const useSidebarTheme = (isPinkMode: boolean | undefined, contrast: 'light' | 'dark' | undefined) => {
  const [themeMode, setThemeMode] = React.useState('');

  // Theme Observer for zero-flash updates
  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeMode(document.documentElement.className);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    setThemeMode(document.documentElement.className);
    return () => observer.disconnect();
  }, []);

  const textColor = contrast === 'dark' ? 'text-black' : 'text-white';
  const mutedTextColor = contrast === 'dark' ? 'text-black/40' : 'text-white/40';
  const inputBg = contrast === 'dark' ? 'bg-black/10' : 'bg-white/10';
  const borderColor = contrast === 'dark' ? 'border-black/10' : 'border-white/10';
  const iconColor = contrast === 'dark' ? 'text-black/40 hover:text-black' : 'text-white/40 hover:text-white';

  const circleBorderClass = isPinkMode 
    ? "[&::-webkit-slider-thumb]:border-[#064e3b] [&::-moz-range-thumb]:border-[#064e3b] border-[#064e3b]" 
    : contrast === 'light' 
        ? "[&::-webkit-slider-thumb]:border-black [&::-moz-range-thumb]:border-black border-black" 
        : "[&::-webkit-slider-thumb]:border-zinc-400 [&::-moz-range-thumb]:border-zinc-400 border-zinc-400";

  return {
    themeMode,
    textColor,
    mutedTextColor,
    inputBg,
    borderColor,
    iconColor,
    circleBorderClass
  };
};
