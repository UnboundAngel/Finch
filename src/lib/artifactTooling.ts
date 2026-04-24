import type { ArtifactKind } from '@/src/types/chat';
import { ARTIFACT_SYSTEM_INSTRUCTIONS } from '@/src/lib/artifactSystemPrompt';

const PREVIEWABLE_ARTIFACT_KINDS = new Set<ArtifactKind>(['html', 'svg', 'react', 'markdown', 'color-studio']);

const UI_CAPABILITIES_INSTRUCTIONS = `
UI Capability: Renders hex codes as visual swatches. Use inline code blocks for colors (e.g. \`#FF0000\`). For multiple colors/palettes, output a code block with language \`palette\` containing only hex codes, one per line. 

Advanced Tool: You have access to a "Color Studio" tool for professional palette management. If the user asks for advanced color work (themes, CSS variables, accessibility checks), use:
<artifact type="color-studio" title="Title">
{
  "colors": ["#hex", "rgb()", "hsl()"],
  "gradients": ["linear-gradient(...)"]
}
</artifact>
Never say you cannot display colors.
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
