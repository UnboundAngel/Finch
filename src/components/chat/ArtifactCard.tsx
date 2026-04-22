import React, { memo } from 'react';
import { Code2, FileText, Globe, Layers, FileCode2, AlignLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Artifact, ArtifactKind } from '@/src/types/chat';

const KIND_LABELS: Record<ArtifactKind, string> = {
  code: 'Code',
  html: 'HTML',
  markdown: 'Document',
  svg: 'SVG',
  react: 'React',
  text: 'Text',
};

const KIND_ICONS: Record<ArtifactKind, React.ElementType> = {
  code: Code2,
  html: Globe,
  markdown: FileText,
  svg: Layers,
  react: FileCode2,
  text: AlignLeft,
};

interface ArtifactCardProps {
  artifact: Artifact;
  isDark: boolean;
  onClick: (artifact: Artifact) => void;
}

/** Tiny code thumbnail shown on the right side of an artifact card. */
const ArtifactThumbnail = ({ content, isDark }: { content: string; isDark: boolean }) => {
  const lines = content.split('\n').slice(0, 12);
  return (
    <div
      className={cn(
        'w-[52px] h-[52px] rounded-md overflow-hidden shrink-0 border',
        isDark ? 'bg-[#0d1117] border-white/10' : 'bg-[#f6f8fa] border-black/10'
      )}
      aria-hidden
    >
      <div
        className="w-[200px] origin-top-left pointer-events-none select-none"
        style={{ transform: 'scale(0.26)', transformOrigin: '0 0' }}
      >
        <pre
          className={cn(
            'p-2 text-[9px] font-mono leading-[1.4] whitespace-pre overflow-hidden',
            isDark ? 'text-[#8b949e]' : 'text-[#57606a]'
          )}
        >
          {lines.join('\n')}
        </pre>
      </div>
    </div>
  );
};

export const ArtifactCard = memo(function ArtifactCard({
  artifact,
  isDark,
  onClick,
}: ArtifactCardProps) {
  const Icon = KIND_ICONS[artifact.kind] ?? Code2;
  const kindLabel = KIND_LABELS[artifact.kind] ?? 'File';
  const versionLabel = artifact.version > 1 ? ` • Version ${artifact.version}` : '';
  const langLabel = artifact.language ? ` · ${artifact.language}` : '';

  return (
    <button
      type="button"
      onClick={() => onClick(artifact)}
      className={cn(
        'group w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150',
        'hover:shadow-sm active:scale-[0.99]',
        isDark
          ? 'bg-[#1e2025] border-white/8 hover:bg-[#23272e] hover:border-white/15'
          : 'bg-[#f6f8fa] border-black/8 hover:bg-[#eef0f3] hover:border-black/15'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'shrink-0 flex items-center justify-center w-8 h-8 rounded-lg',
          isDark ? 'bg-white/5' : 'bg-black/5'
        )}
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Text stack */}
      <div className="flex-1 min-w-0">
        <p className={cn('truncate text-sm font-medium leading-tight', isDark ? 'text-[#e6edf3]' : 'text-[#1f2328]')}>
          {artifact.title}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground leading-none">
          {kindLabel}{langLabel}{versionLabel}
        </p>
      </div>

      {/* Code thumbnail */}
      <ArtifactThumbnail content={artifact.content} isDark={isDark} />
    </button>
  );
});
