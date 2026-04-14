/**
 * Static lookup table for model context window sizes.
 * Values are based on official provider documentation as of 2024.
 */
export function getContextWindowSize(modelId: string): number | null {
  const modelMap: { [key: string]: number } = {
    // Anthropic
    'claude-3-5-sonnet-20240620': 200000,
    'claude-3-haiku-20240307': 200000,
    'claude-3-opus-20240229': 200000,
    
    // OpenAI
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000,
    'o1-preview': 128000,
    'o1-mini': 128000,
    
    // Google Gemini
    'gemini-1.5-pro': 1000000,
    'gemini-1.5-flash': 1000000,
  };

  // Exact match first
  if (modelMap[modelId]) {
    return modelMap[modelId];
  }

  // Fallback for versioned/aliased IDs
  const lowerId = modelId.toLowerCase();
  
  if (lowerId.includes('claude-3-5-sonnet')) return 200000;
  if (lowerId.includes('claude-3-haiku')) return 200000;
  if (lowerId.includes('claude-3-opus')) return 200000;
  if (lowerId.includes('gpt-4o')) return 128000;
  if (lowerId.includes('gemini-1.5-pro')) return 1000000;
  if (lowerId.includes('gemini-1.5-flash')) return 1000000;

  return null;
}
