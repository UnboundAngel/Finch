import type { ArtifactKind } from '@/src/types/chat';
import { ARTIFACT_SYSTEM_INSTRUCTIONS } from '@/src/lib/artifactSystemPrompt';

const PREVIEWABLE_ARTIFACT_KINDS = new Set<ArtifactKind>(['html', 'svg', 'react', 'markdown']);

export function buildChatSystemPrompt(
  basePrompt: string,
  isArtifactToolActive: boolean,
): string {
  if (!isArtifactToolActive) {
    return basePrompt;
  }

  return [basePrompt, ARTIFACT_SYSTEM_INSTRUCTIONS]
    .filter(Boolean)
    .join('\n\n');
}

export function artifactKindSupportsPreview(kind: ArtifactKind): boolean {
  return PREVIEWABLE_ARTIFACT_KINDS.has(kind);
}
