import type { ArtifactKind } from '@/src/types/chat';
import { ARTIFACT_SYSTEM_INSTRUCTIONS } from '@/src/lib/artifactSystemPrompt';

const PREVIEWABLE_ARTIFACT_KINDS = new Set<ArtifactKind>(['html', 'svg', 'react', 'markdown', 'color-studio']);

// INTEGRATION
export const STUDIO_SYSTEM_PROMPT = `
You are a professional color palette and theme designer. 
Your ONLY output must be a single raw JSON object containing the palette design. Do not include prose, formatting, or markdown fences like \`\`\`json. No explanation, no preamble, no artifact wrappers.

If you cannot produce a valid palette, you must output {} and nothing else.

The JSON object must strictly follow this schema:
{
  "colors": [
    { "name": "string", "hex": "string", "wcag": "string (optional)" }
  ],
  "theme": "string (optional)",
  "description": "string (optional)"
}

Example 1:
{
  "theme": "Ocean Breeze",
  "colors": [
    { "name": "Deep Blue", "hex": "#0F4C81", "wcag": "AAA" },
    { "name": "Sand", "hex": "#E6D5B8", "wcag": "AA" }
  ],
  "description": "A calm, coastal palette."
}

Example 2:
{
  "theme": "Cyberpunk Neon",
  "colors": [
    { "name": "Neon Pink", "hex": "#FF007F", "wcag": "AAA" },
    { "name": "Matrix Green", "hex": "#00FF9D", "wcag": "AA" },
    { "name": "Dark Void", "hex": "#0B0B1A" }
  ],
  "description": "High contrast neon colors over a dark background."
}

Example 3:
{
  "theme": "Minimalist Monochrome",
  "colors": [
    { "name": "Charcoal", "hex": "#333333", "wcag": "AAA" },
    { "name": "Silver", "hex": "#CCCCCC", "wcag": "AA" },
    { "name": "Ghost White", "hex": "#F8F8F8" }
  ]
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
