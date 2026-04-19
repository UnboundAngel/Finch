/**
 * Static lookup table for model context window sizes.
 * Values are based on official provider documentation as of April 2026.
 */
export function getContextWindowSize(modelId: string): number | null {
  const modelMap: { [key: string]: number } = {
    // Anthropic
    'claude-4-7-opus': 500000,
    'claude-4-6-sonnet': 500000,
    'claude-4-5-haiku': 500000,
    'claude-3-5-sonnet-20240620': 200000,
    'claude-3-haiku-20240307': 200000,
    'claude-3-opus-20240229': 200000,
    
    // OpenAI
    'gpt-5.4-pro': 256000,
    'gpt-5.4-thinking': 256000,
    'gpt-5.4-mini': 128000,
    'o3-preview': 200000,
    'o3-mini': 200000,
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000,
    'o1-preview': 128000,
    'o1-mini': 128000,
    
    // Google Gemini
    'gemini-3.1-pro': 2000000,
    'gemini-3.1-flash': 2000000,
    'gemini-1.5-pro': 1000000,
    'gemini-1.5-flash': 1000000,
  };

  // Exact match first
  if (modelMap[modelId]) {
    return modelMap[modelId];
  }

  // Fallback for versioned/aliased IDs
  const lowerId = modelId.toLowerCase();
  
  // Anthropic
  if (lowerId.includes('claude-4')) return 500000;
  if (lowerId.includes('claude-3-5-sonnet')) return 200000;
  if (lowerId.includes('claude-3-haiku')) return 200000;
  if (lowerId.includes('claude-3-opus')) return 200000;

  // OpenAI
  if (lowerId.includes('gpt-5.4')) return 256000;
  if (lowerId.includes('o3')) return 200000;
  if (lowerId.includes('gpt-4o')) return 128000;

  // Google Gemini
  if (lowerId.includes('gemini-3.1')) return 2000000;
  if (lowerId.includes('gemini-1.5-pro')) return 1000000;
  if (lowerId.includes('gemini-1.5-flash')) return 1000000;

  return null;
}
