import tinycolor from 'tinycolor2';

/**
 * Normalizes any color string to a consistent Hex format.
 * Falls back to black if invalid.
 */
export function normalizeToHex(colorStr: string): string {
  const color = tinycolor(colorStr);
  if (!color.isValid()) return '#000000';
  return color.toHexString().toUpperCase();
}

/**
 * Calculates whether black or white text has better contrast against a background color.
 * Uses WCAG 2.1 relative luminance math via tinycolor2.
 */
export function getContrastText(colorStr: string): string {
  const color = tinycolor(colorStr);
  if (!color.isValid()) return 'rgba(0,0,0,0.8)';
  
  // tinycolor.isLight() uses the same 0.2126R + 0.7152G + 0.0722B formula
  return color.isLight() ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)';
}

/**
 * Checks if a color meets WCAG AA contrast ratio (4.5:1) against a specific background.
 */
export function checkWCAGContrast(colorStr: string, bgStr: string = '#FFFFFF'): {
  ratio: number;
  isAA: boolean;
  isAAA: boolean;
} {
  const ratio = tinycolor.readability(colorStr, bgStr);
  return {
    ratio,
    isAA: ratio >= 4.5,
    isAAA: ratio >= 7
  };
}
