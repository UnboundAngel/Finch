import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { X, Copy, Check, Code2, Eye, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { createHighlighter, type Highlighter } from 'shiki';
import type { Artifact } from '@/src/types/chat';
import {
  isArtifactPreviewMessage,
  logPreparedPreviewMetrics,
  prepareReactPreview,
} from '@/src/lib/artifactPreviewRuntime';
import { artifactKindSupportsPreview } from '@/src/lib/artifactTooling';

// Reuse the same global highlighter from CodeBlock to avoid double init cost.
let panelHighlighter: Highlighter | null = null;
const panelHighlighterPromise = createHighlighter({
  themes: ['github-dark', 'github-light'],
  langs: [
    'typescript', 'javascript', 'tsx', 'jsx', 'python', 'rust', 'go', 'bash',
    'json', 'yaml', 'markdown', 'html', 'css', 'sql', 'lua', 'ruby', 'java',
    'csharp', 'cpp', 'c', 'php', 'swift', 'kotlin', 'text',
  ],
}).then((h) => {
  panelHighlighter = h;
  return h;
});

interface ArtifactPanelProps {
  artifact: Artifact | null;
  allVersions?: Artifact[];
  isDark: boolean;
  isStreaming?: boolean;
  onClose: () => void;
  onSelectVersion?: (artifact: Artifact) => void;
}

/** Shiki-highlighted code view used inside the panel. */
const PanelCodeView = ({
  content,
  language,
  isDark,
  isStreaming = false,
}: {
  content: string;
  language: string;
  isDark: boolean;
  isStreaming?: boolean;
}) => {
  const [html, setHtml] = useState('');
  const renderId = useRef(0);

  useEffect(() => {
    if (isStreaming) {
      setHtml('');
      return;
    }
    const id = ++renderId.current;
    const run = async () => {
      const h = panelHighlighter || (await panelHighlighterPromise);
      if (id !== renderId.current) return;
      try {
        const result = h.codeToHtml(content, {
          lang: language || 'text',
          theme: isDark ? 'github-dark' : 'github-light',
        });
        if (id === renderId.current) setHtml(result);
      } catch {
        const result = h.codeToHtml(content, {
          lang: 'text',
          theme: isDark ? 'github-dark' : 'github-light',
        });
        if (id === renderId.current) setHtml(result);
      }
    };
    run();
  }, [content, language, isDark]);

  return (
    <div className="relative h-full w-full bg-inherit">
      {!html ? (
        <pre className="p-6 text-[13px] font-mono whitespace-pre overflow-x-auto leading-relaxed text-muted-foreground animate-pulse">
          <code>{content}</code>
        </pre>
      ) : (
        <div
          className="shiki-container p-6 text-[13px] leading-relaxed overflow-x-auto h-full"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
};

const MARKDOWN_REMARK_PLUGINS = [remarkGfm];

function getArtifactDownloadExtension(artifact: Artifact): string {
  if (artifact.language) {
    return `.${artifact.language}`;
  }

  return artifact.kind === 'html' ? '.html' : '.txt';
}

const MarkdownPreview = ({
  content,
  isDark,
}: {
  content: string;
  isDark: boolean;
}) => {
  const components = useMemo(() => ({
    h1: ({ node, ...props }: any) => <h1 className="text-3xl font-bold tracking-tight mb-5" {...props} />,
    h2: ({ node, ...props }: any) => <h2 className="text-2xl font-semibold tracking-tight mb-4 mt-8" {...props} />,
    h3: ({ node, ...props }: any) => <h3 className="text-xl font-semibold mb-3 mt-6" {...props} />,
    h4: ({ node, ...props }: any) => <h4 className="text-lg font-semibold mb-2 mt-5" {...props} />,
    p: ({ node, ...props }: any) => <p className="mb-4 leading-7 text-foreground/90" {...props} />,
    ul: ({ node, ...props }: any) => <ul className="list-disc pl-6 mb-4 space-y-1.5" {...props} />,
    ol: ({ node, ...props }: any) => <ol className="list-decimal pl-6 mb-4 space-y-1.5" {...props} />,
    li: ({ node, ...props }: any) => <li className="leading-7" {...props} />,
    blockquote: ({ node, ...props }: any) => (
      <blockquote
        className={cn(
          'mb-4 border-l-2 pl-4 italic',
          isDark ? 'border-white/15 text-white/75' : 'border-black/15 text-black/70',
        )}
        {...props}
      />
    ),
    table: ({ node, ...props }: any) => (
      <div className="overflow-x-auto my-5 rounded-xl border border-muted-foreground/10">
        <table className="min-w-full border-collapse text-sm" {...props} />
      </div>
    ),
    thead: ({ node, ...props }: any) => <thead className="bg-muted/40" {...props} />,
    th: ({ node, ...props }: any) => <th className="px-4 py-2 text-left font-semibold border-b border-muted-foreground/10" {...props} />,
    td: ({ node, ...props }: any) => <td className="px-4 py-2 border-b border-muted-foreground/10 align-top" {...props} />,
    a: ({ node, href, children, ...props }: any) => (
      <a
        href={href || '#'}
        target="_blank"
        rel="noreferrer"
        className="text-primary underline underline-offset-2 decoration-primary/40 hover:decoration-primary"
        {...props}
      >
        {children}
      </a>
    ),
    code({ children, className, inline, ...props }: any) {
      const text = String(children).replace(/\n$/, '');
      if (inline) {
        return (
          <code
            className={cn(
              'rounded px-1.5 py-0.5 font-mono text-[0.9em]',
              isDark ? 'bg-white/10 text-white/90' : 'bg-black/5 text-black/85',
            )}
            {...props}
          >
            {children}
          </code>
        );
      }
      const match = /language-(\w+)/.exec(className || '');
      return <PanelCodeView content={text} language={match?.[1] || 'markdown'} isDark={isDark} />;
    },
  }), [isDark]);

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-3xl px-8 py-7">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={MARKDOWN_REMARK_PLUGINS} components={components}>
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

/** Renders an HTML or SVG artifact in a sandboxed iframe / inline element. */
const PreviewPane = ({ artifact, isDark }: { artifact: Artifact; isDark: boolean }) => {
  const [htmlSource, setHtmlSource] = useState<string | null>(
    artifact.kind === 'react' ? null : artifact.content,
  );
  const [frameKey, setFrameKey] = useState(() => `${artifact.kind}:${artifact.id}:${artifact.version}`);

  useEffect(() => {
    if (artifact.kind !== 'react') return;

    const handleMessage = (event: MessageEvent) => {
      if (!isArtifactPreviewMessage(event)) return;
      console.debug('[artifact-preview] render', event.data);
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [artifact.kind]);

  useEffect(() => {
    if (artifact.kind !== 'react') {
      setHtmlSource(artifact.content);
      setFrameKey(`${artifact.kind}:${artifact.id}:${artifact.version}`);
      return;
    }

    let isCancelled = false;
    setHtmlSource(null);

    const timeoutId = window.setTimeout(async () => {
      const prepared = await prepareReactPreview({
        content: artifact.content,
        isDark,
      });

      if (isCancelled) return;

      logPreparedPreviewMetrics(prepared);
      setHtmlSource(prepared.html);
      setFrameKey(`${prepared.key}:${isDark ? 'dark' : 'light'}`);
    }, 120);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [artifact.content, artifact.id, artifact.kind, artifact.version, isDark]);

  if (artifact.kind === 'markdown') {
    return <MarkdownPreview content={artifact.content} isDark={isDark} />;
  }

  if (artifact.kind === 'svg') {
    return (
      <div className="flex items-center justify-center h-full p-8 overflow-auto">
        <div 
          className={cn("p-8 rounded-2xl border shadow-sm", isDark ? "bg-[#161616] border-white/5" : "bg-white border-black/5")}
          dangerouslySetInnerHTML={{ __html: artifact.content }} 
        />
      </div>
    );
  }

  return (
    !htmlSource ? (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Preparing preview...
      </div>
    ) : (
      <iframe
        key={frameKey}
        srcDoc={htmlSource}
        sandbox="allow-scripts"
        className="w-full h-full border-0"
        title={artifact.title}
      />
    )
  );
};

export const ArtifactPanel = memo(function ArtifactPanel({
  artifact,
  allVersions = [],
  isDark,
  isStreaming = false,
  onClose,
  onSelectVersion,
}: ArtifactPanelProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [copied, setCopied] = useState(false);

  const isOpen = artifact !== null;
  const canPreview = artifact ? artifactKindSupportsPreview(artifact.kind) : false;

  useEffect(() => {
    setActiveTab('code');
  }, [artifact?.id]);

  const handleCopy = () => {
    if (!artifact) return;
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!artifact) return;
    const ext = getArtifactDownloadExtension(artifact);
    const filename = artifact.title.includes('.') ? artifact.title : `${artifact.title}${ext}`;
    const blob = new Blob([artifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenInEditor = async () => {
    if (!artifact?.filePath) {
      toast.error('File not yet saved to disk. Try again in a moment.');
      return;
    }
    try {
      const { openPath } = await import('@tauri-apps/plugin-opener');
      await openPath(artifact.filePath);
    } catch (err) {
      toast.error(`Could not open in editor: ${err}`);
    }
  };

  const panelBg = isDark ? 'bg-[#171717]' : 'bg-[#ffffff]';
  const headerBorder = isDark ? 'border-white/5' : 'border-black/5';
  const panelActionButtonClass = cn(
    'p-2.5 rounded-full border transition-all active:scale-95 hover:shadow-md',
    isDark
      ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
      : 'bg-black/5 border-black/10 hover:bg-black/10 text-neutral-900',
  );
  const closeButtonClass = cn(
    'p-2.5 rounded-full border transition-all hover:bg-rose-500/10 hover:text-rose-500 active:scale-95',
    isDark
      ? 'bg-white/5 border-white/10 text-white'
      : 'bg-black/5 border-black/10 text-neutral-900',
  );

  return (
    <AnimatePresence>
      {isOpen && artifact && (
        <motion.div
          key="artifact-panel"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 450, damping: 40, mass: 1 }}
          className={cn(
            'absolute top-8 bottom-[160px] right-8 z-50 flex flex-col border shadow-[0_0_60px_-15px_rgba(0,0,0,0.5)] rounded-[32px] overflow-hidden pointer-events-auto',
            panelBg
          )}
          style={{ width: 'min(540px, calc(100% - 64px))' }}
        >
          {/* Subtle Inner Highlight for Depth */}
          <div className="absolute inset-0 pointer-events-none rounded-[32px] border border-white/5 dark:border-white/[0.03]" />

          {/* Header Section */}
          <div className={cn('flex flex-col border-b shrink-0', headerBorder)}>
            <div className="flex items-center gap-4 px-6 py-5">
              <div className="flex-1 min-w-0">
                <h3 className={cn('truncate text-base font-bold tracking-tight', isDark ? 'text-white' : 'text-neutral-900')}>
                  {artifact.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                    isDark ? "bg-white/10 text-white/70" : "bg-black/5 text-black/60"
                  )}>
                    {artifact.kind}
                    {artifact.language ? ` · ${artifact.language}` : ''}
                  </span>
                  {allVersions.length > 1 && (
                    <span className="text-[11px] text-muted-foreground font-medium opacity-60">
                      Version {artifact.version} of {allVersions.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Top Right Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleCopy}
                  className={panelActionButtonClass}
                  title="Copy content"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {copied ? (
                      <motion.div key="check" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                        <Check className="h-4 w-4 text-emerald-500" />
                      </motion.div>
                    ) : (
                      <motion.div key="copy" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                        <Copy className="h-4 w-4" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
                <button
                  onClick={handleDownload}
                  className={panelActionButtonClass}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={handleOpenInEditor}
                  disabled={!artifact?.filePath}
                  className={cn(
                    panelActionButtonClass,
                    !artifact?.filePath && 'opacity-40 cursor-not-allowed',
                  )}
                  title={artifact?.filePath ? "Open in editor" : "Saving to disk…"}
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
                <button
                  onClick={onClose}
                  className={closeButtonClass}
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Sub-header: Tabs & History */}
            <div className="flex items-center justify-between px-6 pb-4 pt-1 gap-4">
              {canPreview ? (
                <div className={cn("flex p-1 rounded-full border shadow-inner", isDark ? "bg-black/40 border-white/5" : "bg-black/5 border-black/5")}>
                  <button
                    onClick={() => setActiveTab('code')}
                    className={cn(
                      'px-4 py-1.5 rounded-full transition-all text-xs font-bold flex items-center gap-2',
                      activeTab === 'code'
                        ? 'bg-white text-black shadow-md'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    Code
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={cn(
                      'px-4 py-1.5 rounded-full transition-all text-xs font-bold flex items-center gap-2',
                      activeTab === 'preview'
                        ? 'bg-white text-black shadow-md'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </button>
                </div>
              ) : <div />}

              {/* Version Pills */}
              {allVersions.length > 1 && onSelectVersion && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {allVersions.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => onSelectVersion(v)}
                      className={cn(
                        'min-w-[32px] h-8 rounded-full text-[11px] font-bold transition-all border flex items-center justify-center',
                        artifact.id === v.id
                          ? 'bg-white text-black border-white shadow-md'
                          : isDark ? 'bg-white/5 border-white/10 text-white/40 hover:text-white/80 hover:bg-white/10' : 'bg-black/5 border-black/10 text-black/40 hover:text-black/80 hover:bg-black/10'
                      )}
                    >
                      {v.version}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden min-h-0 relative">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="h-full w-full"
            >
              {activeTab === 'preview' && canPreview ? (
                <PreviewPane artifact={artifact} isDark={isDark} />
              ) : (
                <PanelCodeView
                  content={artifact.content}
                  language={artifact.language || artifact.kind}
                  isDark={isDark}
                  isStreaming={isStreaming}
                />
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
