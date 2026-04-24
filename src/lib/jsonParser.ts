export interface ParsedPalette {
  colors: Array<{ name: string; hex: string; wcag?: string }>;
  theme?: string;
  description?: string;
}

export function parseLenientJson(text: string): ParsedPalette | null {
  if (!text) return null;
  
  try {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '');
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    
    if (start === -1 || end === -1 || end < start) {
      return null;
    }
    
    const jsonString = cleaned.substring(start, end + 1);
    return JSON.parse(jsonString) as ParsedPalette;
  } catch (e) {
    return null;
  }
}
