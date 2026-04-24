/**
 * @file artifactParser.ts
 *
 * ## Phase A — Hybrid XML extraction (current implementation)
 * Artifacts are parsed client-side from raw assistant text using a single-pass
 * regex. No extra IPC round-trips; no Rust-side changes needed. The token
 * batching in `useAIStreaming.ts` is untouched.
 *
 * ## Performance Decision Gate — when to move to Phase B (full tool-call protocol)
 *
 * Measure these after shipping Phase A. If ANY threshold is exceeded, schedule
 * migration to structured backend artifact events.
 *
 * | Metric                              | Threshold for upgrade |
 * |-------------------------------------|-----------------------|
 * | parseContentSegments() call time    | > 2 ms on 50k-char msg|
 * | Partial-tag flicker rate            | > 5% of artifact msgs  |
 * | Per-model schema compliance rate    | < 80% (correct tags)  |
 * | Memory per artifact in metadata    | > 500 KB per message  |
 *
 * Phase B design: add `ArtifactStart { id, kind, title }` / `ArtifactDelta { id, chunk }` /
 * `ArtifactEnd { id }` variants to `StreamingEvent` (types.rs) and handle them in
 * `useAIStreaming.ts` alongside `text` events — no XML parsing needed in frontend.
 */
import type { Artifact, ArtifactKind } from '@/src/types/chat';

export type ContentSegment =
  | { type: 'text'; content: string }
  | { type: 'artifact'; artifact: Artifact };

/** Parses `key="value"` attribute pairs from an opening tag's attribute string. */
function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = attrRegex.exec(attrString)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

/**
 * Returns true if `text` is a known IPC sentinel value that should never be
 * surfaced to the user. Trims whitespace before comparing so variants like
 * `" undefined\n"` are also caught.
 */
function isUndefinedSentinel(text: string): boolean {
  return text.trim() === 'undefined';
}

/**
 * Splits raw message content into interleaved text and artifact segments.
 *
 * - Complete `<artifact ...>...</artifact>` blocks become artifact segments.
 *   This is intentionally fence-agnostic: small local models frequently wrap
 *   their artifact output in triple-backtick fences even though the system
 *   prompt instructs them not to. Suppressing artifacts inside fences would
 *   silently discard real output from those models.
 * - All other text (including prose, markdown, code fences) becomes text segments.
 * - When `isStreaming` is true, an incomplete opening tag at the very end of the
 *   string is silently swallowed so partial XML never leaks into the rendered view.
 *
 * This function is called on every render — it must be fast. The regex only scans
 * the string once; no O(n²) accumulation.
 */
export function parseContentSegments(content: string, isStreaming?: boolean): ContentSegment[] {
  const segments: ContentSegment[] = [];
  // Matches a complete <artifact …>…</artifact> block (non-greedy inner content).
  const completeRegex = /<artifact\s+((?:[^>]|"[^"]*")*?)>([\s\S]*?)<\/artifact>/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let versionCounter = 0;

  while ((match = completeRegex.exec(content)) !== null) {
    // Push any text before this artifact block.
    if (match.index > lastIndex) {
      const before = content.slice(lastIndex, match.index);
      // Strip any trailing opening backtick fence that was wrapping the artifact
      // (e.g. "```jsx\n") so it doesn't appear as stray text in the message.
      const stripped = before.replace(/```[^\n]*\n?\s*$/, '');
      if (stripped && !isUndefinedSentinel(stripped)) {
        segments.push({ type: 'text', content: stripped });
      }
    }

    const attrs = parseAttributes(match[1]);
    versionCounter++;
    const kind = (attrs.type || 'text') as ArtifactKind;
    const title = attrs.title || 'Untitled';
    const stableId = attrs.id || `artifact-${kind}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    segments.push({
      type: 'artifact',
      artifact: {
        id: stableId,
        kind,
        title,
        language: attrs.language,
        content: match[2],
        version: versionCounter,
      },
    });
    lastIndex = match.index + match[0].length;
  }

  let remaining = content.slice(lastIndex);

  // Strip any leading closing backtick fence that was wrapping the artifact
  // (e.g. "\n```" left behind after the </artifact> tag).
  remaining = remaining.replace(/^\s*```/, '');

  if (isStreaming) {
    // Hide an incomplete opening tag at the tail so raw XML never flashes.
    const incompleteIdx = remaining.search(/<artifact[\s\S]*/);
    if (incompleteIdx !== -1) {
      const beforeIncomplete = remaining.slice(0, incompleteIdx);
      if (beforeIncomplete && !isUndefinedSentinel(beforeIncomplete)) {
        segments.push({ type: 'text', content: beforeIncomplete });
      }
      // Incomplete artifact is intentionally dropped during streaming.
      return segments;
    }
  }

  if (isUndefinedSentinel(remaining)) {
    console.warn('[artifactParser] Sentinel "undefined" in content buffer — upstream IPC bug. Content dropped.');
  } else if (remaining) {
    segments.push({ type: 'text', content: remaining });
  }

  return segments;
}

/**
 * Extracts completed `Artifact` objects from a raw content string.
 * Used by Dashboard to persist artifacts into message metadata on stream completion.
 */
export function extractArtifacts(content: string): Artifact[] {
  return parseContentSegments(content)
    .filter((s): s is { type: 'artifact'; artifact: Artifact } => s.type === 'artifact')
    .map(s => s.artifact);
}

/**
 * Returns the content string with all `<artifact>` blocks removed,
 * leaving only the prose text. Useful for display in contexts where
 * artifacts are shown separately (e.g. the ArtifactPanel).
 */
export function stripArtifacts(content: string): string {
  return content.replace(/<artifact\s+(?:[^>]|"[^"]*")*>[\s\S]*?<\/artifact>/g, '').trim();
}
