import type { ArtifactKind } from '@/src/types/chat';
import { ARTIFACT_SYSTEM_INSTRUCTIONS } from '@/src/lib/artifactSystemPrompt';

const PREVIEWABLE_ARTIFACT_KINDS = new Set<ArtifactKind>(['html', 'svg', 'react', 'markdown', 'color-studio']);

// INTEGRATION
export const STUDIO_SYSTEM_PROMPT = `
You are a professional color palette and theme designer. 
Your ONLY output must be a single raw JSON object containing the palette design. Do not include prose, formatting, or markdown fences like \`\`\`json. No explanation, no preamble, no artifact wrappers.

If you cannot produce a valid palette, you must output {} and nothing else.

Guidelines for Metadata:
- "theme": Create a punchy, premium name (e.g., "Neon Overdrive", "Violet Vortex").
- "description": Provide a high-contrast, professional summary. AVOID hashtags. Keep it concise and evocative.

The JSON object must strictly follow this schema:
{
  "colors": [
    { "name": "string", "hex": "#HEXCODE", "wcag": "string (optional)" }
  ],
  "theme": "string",
  "description": "string"
}

Example 1:
{
  "theme": "Cyberpunk Terminal",
  "colors": [
    { "name": "Deep Void Black", "hex": "#080808", "wcag": "AAA" },
    { "name": "Matrix Green", "hex": "#00FF41", "wcag": "AA" },
    { "name": "Neon Pink", "hex": "#FF007F" }
  ],
  "description": "A high-contrast terminal palette featuring iconic neon tones against a deep black background."
}

Example 2:
{
  "theme": "Arctic Vapor",
  "colors": [
    { "name": "Glacier Blue", "hex": "#A0D2EB", "wcag": "AAA" },
    { "name": "Frost", "hex": "#E1F8FF", "wcag": "AA" }
  ],
  "description": "Cool, ethereal tones inspired by polar landscapes."
}
`.trim();

// INTEGRATION
const UI_CAPABILITIES_INSTRUCTIONS = `
UI Capability: Renders hex codes as visual swatches. Use inline code blocks for colors (e.g. \`#FF0000\`). For multiple colors/palettes, output a code block with language \`palette\` containing only hex codes, one per line.
`.trim();

export function buildChatSystemPrompt(
  basePrompt: string,
  isArtifactToolActive: boolean,
): string {
  const parts = [basePrompt];

  if (isArtifactToolActive) {
    parts.push(ARTIFACT_SYSTEM_INSTRUCTIONS);
  }

  parts.push(UI_CAPABILITIES_INSTRUCTIONS);

  return parts.filter(Boolean).join('\n\n');
}

export function artifactKindSupportsPreview(kind: ArtifactKind): boolean {
  return PREVIEWABLE_ARTIFACT_KINDS.has(kind);
}
