import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Download, Files, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createHighlighter, type Highlighter } from 'shiki';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { resolveMediaSrc } from '@/src/lib/mediaPaths';
import { isTauri } from '@/src/lib/tauri-utils';
import { CodeBlock } from '@/src/components/chat/CodeBlock';
import { ExternalLink } from '@/src/components/ui/ExternalLink';

// ─── Constants ───────────────────────────────────────────────────────────────

const IMAGE_EXTS = /\.(png|jpe?g|gif|webp)$/i;
const PDF_EXT = /\.pdf$/i;
const MD_EXT = /\.md$/i;
const TEXT_LIKE_EXTS = new Set([
  'txt', 'md', 'csv', 'rtf', 'html', 'json',
  'py', 'js', 'ts', 'jsx', 'tsx', 'rs', 'go', 'java', 'cpp', 'c', 'cs', 'rb', 'php',
  'yaml', 'yml', 'toml', 'xml', 'sql', 'css', 'sh', 'bash',
]);

const SHIKI_LANG_MAP: Record<string, string> = {
  py: 'python', js: 'javascript', ts: 'typescript', jsx: 'javascript',
  tsx: 'typescript', rs: 'rust', go: 'go', java: 'java', cpp: 'cpp',
  c: 'c', cs: 'csharp', rb: 'ruby', php: 'php', json: 'json',
  yaml: 'yaml', yml: 'yaml', toml: 'toml', md: 'markdown', html: 'html',
  css: 'css', sql: 'sql', xml: 'xml', sh: 'bash', bash: 'bash',
};

// Soft cap: files larger than this are truncated before render
const MAX_PREVIEW_BYTES = 500 * 1024;

// remark plugin list is stable — defined once outside components
const REMARK_PLUGINS = [remarkGfm];

// Shiki singleton — one instance for the preview modal, never reinitialised per render
let previewHighlighter: Highlighter | null = null;
const previewHighlighterPromise = createHighlighter({
  themes: ['github-dark', 'github-light'],
  langs: [
    'typescript', 'javascript', 'python', 'rust', 'go', 'java', 'cpp', 'c',
    'csharp', 'ruby', 'php', 'json', 'yaml', 'toml', 'markdown', 'html',
    'css', 'sql', 'bash', 'xml', 'text',
  ],
}).then(h => { previewHighlighter = h; return h; });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PreviewFile {
  name: string;
  path: string;
}

interface FilePreviewModalProps {
  file: PreviewFile | null;
  onClose: () => void;
  isDark: boolean;
}

// ─── Obsidian preprocessing ───────────────────────────────────────────────────

const CALLOUT_ICONS: Record<string, string> = {
  note: 'ℹ️', tip: '💡', info: 'ℹ️', warning: '⚠️', caution: '⚠️',
  danger: '🚨', bug: '🐛', example: '📌', success: '✅', question: '❓',
  abstract: '📋', summary: '📋', todo: '☑️', quote: '💬', failure: '❌',
  error: '🔴', help: '🆘', check: '✅',
};

/** Strip YAML/TOML frontmatter and return the extracted title (if present) plus the body. */
function stripFrontmatter(src: string): { title: string | null; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  if (!match) return { title: null, body: src };
  const titleLine = match[1].split('\n').find(l => /^title\s*:/i.test(l));
  const title = titleLine
    ? titleLine.replace(/^title\s*:\s*/i, '').trim().replace(/^["']|["']$/g, '')
    : null;
  return { title, body: src.slice(match[0].length) };
}

/**
 * Lightweight Obsidian → GFM transform pipeline.
 * Operates on plain strings before react-markdown parses the AST, so it has
 * zero runtime cost at the React render layer.
 */
function preprocessObsidian(src: string): string {
  // [[Note|Alias]] → **Alias**
  let out = src.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?\|([^\]]+)\]\]/g, '**$2**');
  // [[Note#Heading]] or [[Note]] → **Note**
  out = out.replace(/\[\[([^\]|#]+)(?:#[^\]]*?)?\]\]/g, '**$1**');

  // Obsidian callouts: > [!TYPE] Optional title
  out = out.replace(
    /^> \[!([\w]+)\]([ \t]+(.+))?$/gm,
    (_, type, __, title) => {
      const icon = CALLOUT_ICONS[type.toLowerCase()] ?? '📌';
      const label = type.toUpperCase();
      return `> ${icon} **${label}**${title ? ': ' + title.trim() : ''}`;
    },
  );

  // Block math $$...$$ → fenced ```math block
  out = out.replace(/\$\$([\s\S]*?)\$\$/g, (_, expr) => '```math\n' + expr.trim() + '\n```');

  // Inline math $...$ (single-line only) → backtick code
  out = out.replace(/(?<!\$)\$([^$\n]+)\$(?!\$)/g, '`$1`');

  return out;
}

// ─── Image lightbox ───────────────────────────────────────────────────────────

function ImagePreview({ file }: { file: PreviewFile }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 overflow-hidden px-4 pb-4 pt-5">
      <div className="flex w-full items-center justify-center overflow-hidden rounded-xl">
        <img
          src={resolveMediaSrc(file.path)}
          alt={file.name}
          className="max-h-[min(66vh,620px)] max-w-full rounded-xl object-contain"
        />
      </div>
      <p className="w-full truncate text-center text-xs text-foreground/85">{file.name}</p>
    </div>
  );
}

// ─── Markdown preview ─────────────────────────────────────────────────────────

function MarkdownPreview({ file, isDark }: { file: PreviewFile; isDark: boolean }) {
  const [rawContent, setRawContent] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const renderId = useRef(0);

  useEffect(() => {
    const id = ++renderId.current;
    setRawContent(null);
    setTruncated(false);

    fetch(resolveMediaSrc(file.path))
      .then(async r => {
        const text = await r.text();
        if (id !== renderId.current) return;
        if (text.length > MAX_PREVIEW_BYTES) {
          setRawContent(text.slice(0, MAX_PREVIEW_BYTES));
          setTruncated(true);
        } else {
          setRawContent(text);
        }
      })
      .catch(() => {
        if (id === renderId.current) setRawContent('*(Could not read file)*');
      });
    return () => { renderId.current++; };
  }, [file.path]);

  const { title, processedContent } = useMemo(() => {
    if (rawContent === null) return { title: null, processedContent: '' };
    const { title, body } = stripFrontmatter(rawContent);
    return { title, processedContent: preprocessObsidian(body) };
  }, [rawContent]);

  const components = useMemo(() => ({
    h1: ({ node, ...props }: any) => <h1 className="mdp-h1" {...props} />,
    h2: ({ node, ...props }: any) => <h2 className="mdp-h2" {...props} />,
    h3: ({ node, ...props }: any) => <h3 className="mdp-h3" {...props} />,
    h4: ({ node, ...props }: any) => <h4 className="mdp-h4" {...props} />,
    h5: ({ node, ...props }: any) => <h5 className="mdp-h5" {...props} />,
    h6: ({ node, ...props }: any) => <h6 className="mdp-h6" {...props} />,
    p: ({ node, ...props }: any) => <p className="mdp-p" {...props} />,
    ul: ({ node, ...props }: any) => <ul className="mdp-ul" {...props} />,
    ol: ({ node, ...props }: any) => <ol className="mdp-ol" {...props} />,
    li: ({ node, ...props }: any) => <li className="mdp-li" {...props} />,
    blockquote: ({ node, ...props }: any) => <blockquote className="mdp-blockquote" {...props} />,
    hr: ({ node, ...props }: any) => <hr className="mdp-hr" />,
    table: ({ node, ...props }: any) => (
      <div className="overflow-x-auto my-5 rounded-lg border border-muted-foreground/10">
        <table className="mdp-table" {...props} />
      </div>
    ),
    thead: ({ node, ...props }: any) => <thead className="mdp-thead" {...props} />,
    th: ({ node, ...props }: any) => <th className="mdp-th" {...props} />,
    td: ({ node, ...props }: any) => <td className="mdp-td" {...props} />,
    a: ({ node, href, children, ...props }: any) => (
      <ExternalLink
        href={href || ''}
        className="text-primary underline underline-offset-2 decoration-primary/40 hover:decoration-primary transition-colors"
        {...props}
      >
        {children}
      </ExternalLink>
    ),
    // GFM task list checkboxes
    input: ({ node, ...props }: any) => (
      <input {...props} disabled className="mdp-checkbox" />
    ),
    code({ children, className, node, ...rest }: any) {
      const match = /language-(\w+)/.exec(className || '');
      return match ? (
        <CodeBlock
          children={String(children).replace(/\n$/, '')}
          language={match[1]}
          isDark={isDark}
        />
      ) : (
        <code className="mdp-inline-code" {...rest}>
          {children}
        </code>
      );
    },
  }), [isDark]);

  if (rawContent === null) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-3xl px-8 py-6">
        {title && (
          <h1 className="mb-6 border-b border-muted-foreground/15 pb-4 text-2xl font-bold text-foreground">
            {title}
          </h1>
        )}
        {truncated && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            File truncated at 500 KB for performance. Open externally to view the full document.
          </div>
        )}
        <div className="markdown-preview">
          <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={components}>
            {processedContent}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

// ─── PDF iframe with tilt hover ───────────────────────────────────────────────

function PdfPreview({ file, onClose }: { file: PreviewFile; onClose: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [pageCount, setPageCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(resolveMediaSrc(file.path))
      .then(r => r.arrayBuffer())
      .then(buffer => {
        if (cancelled) return;
        const text = new TextDecoder('latin1').decode(buffer);

        // Prefer /Type /Pages dictionaries since their /Count is page-tree specific.
        const pageTreeCounts = [...text.matchAll(/<<[\s\S]{0,1600}?\/Type\s*\/Pages[\s\S]{0,1600}?\/Count\s+(\d+)[\s\S]{0,1600}?>>/g)]
          .map((m) => Number.parseInt(m[1], 10))
          .filter((n) => Number.isFinite(n) && n > 0);
        if (pageTreeCounts.length > 0) {
          setPageCount(Math.max(...pageTreeCounts));
          return;
        }

        // Fallback: count leaf page objects.
        const singles = [...text.matchAll(/\/Type\s*\/Page([^\w])/g)].length;
        setPageCount(Math.max(singles, 1));
      })
      .catch(() => {
        if (!cancelled) setPageCount(1);
      });

    return () => {
      cancelled = true;
    };
  }, [file.path]);

  async function openInSystem() {
    if (isTauri()) {
      // Blob URLs have no filesystem path — came from a web drag-drop, can't open externally.
      if (file.path.startsWith('blob:')) return;
      try {
        const { openPath } = await import('@tauri-apps/plugin-opener');
        await openPath(file.path);
      } catch (e) {
        console.error('[preview] openPath failed', e);
      }
      return;
    }
    window.open(resolveMediaSrc(file.path), '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="flex flex-1 items-center justify-center overflow-hidden">
      <div className="flex aspect-square w-full max-w-[420px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1e] shadow-2xl">
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <span className="truncate text-base font-semibold text-white/90">
            {file.name}
          </span>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 rounded-md p-1.5 text-white/75 transition-all duration-150 hover:scale-105 hover:bg-white/10 hover:text-white"
            aria-label="Close PDF preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-2">
          <div
            className="relative w-full max-w-[196px] cursor-pointer"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={openInSystem}
          >
            {/* Background card layering effect for multiple pages */}
            {pageCount !== null && pageCount > 1 && (
              <>
                {/* Fourth card (furthest back) — fans the most */}
                <div
                  className="absolute inset-0 rounded-xl bg-[#8f939a] shadow-sm transition-transform duration-300"
                  style={{
                    transform: hovered ? 'translateX(9px) rotate(5.5deg)' : 'translateX(9px) rotate(1.5deg)',
                    transformOrigin: '50% 100%',
                    zIndex: -1,
                  }}
                />
                {/* Third card */}
                <div
                  className="absolute inset-0 rounded-xl bg-[#a7abb2] shadow-sm transition-transform duration-300"
                  style={{
                    transform: hovered ? 'translateX(6px) rotate(3deg)' : 'translateX(6px) rotate(1deg)',
                    transformOrigin: '50% 100%',
                    zIndex: 0,
                  }}
                />
                {/* Second card — fans the least */}
                <div
                  className="absolute inset-0 rounded-xl bg-[#c3c7ce] shadow-md transition-transform duration-300"
                  style={{
                    transform: hovered ? 'translateX(3px) rotate(1.2deg)' : 'translateX(3px) rotate(0.4deg)',
                    transformOrigin: '50% 100%',
                    zIndex: 1,
                  }}
                />
              </>
            )}

            {/* Main card */}
            <div
              className="relative z-10 w-full overflow-hidden rounded-xl bg-white transition-transform duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
              style={{
                transform: hovered ? 'rotate(-1.5deg)' : 'rotate(0deg)',
                transformOrigin: '50% 100%',
              }}
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-white">
                <iframe
                  src={`${resolveMediaSrc(file.path)}#toolbar=0&navpanes=0&scrollbar=0&page=1&zoom=page-fit&view=FitH`}
                  title={file.name}
                  className="pointer-events-none absolute left-0 -top-2 h-[calc(100%+16px)] w-[calc(100%+30px)] border-0 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 px-4 pb-4 pt-1 text-sm">
          {hovered ? (
            <>
              <Download className="h-4 w-4 text-blue-400" />
              <span className="font-semibold text-blue-400">Download</span>
            </>
          ) : (
            <span className="truncate text-xs font-medium uppercase tracking-wider text-white/60">
              {pageCount ? `${pageCount} ${pageCount === 1 ? 'page' : 'pages'}` : 'PDF'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Code / text with Shiki ───────────────────────────────────────────────────

function CodeTextPreview({ file, isDark }: { file: PreviewFile; isDark: boolean }) {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const lang = SHIKI_LANG_MAP[ext] ?? 'text';

  const [content, setContent] = useState<string | null>(null);
  const [highlightedHtml, setHighlightedHtml] = useState('');
  const renderId = useRef(0);

  useEffect(() => {
    const id = ++renderId.current;
    setContent(null);
    fetch(resolveMediaSrc(file.path))
      .then(r => r.text())
      .then(text => { if (id === renderId.current) setContent(text); })
      .catch(() => { if (id === renderId.current) setContent('(Could not read file)'); });
    return () => { renderId.current++; };
  }, [file.path]);

  useEffect(() => {
    if (content === null) return;
    const id = renderId.current;
    const theme = isDark ? 'github-dark' : 'github-light';

    const highlight = async () => {
      const h = previewHighlighter ?? (await previewHighlighterPromise);
      if (id !== renderId.current) return;
      try {
        const html = h.codeToHtml(content, { lang, theme });
        if (id === renderId.current) setHighlightedHtml(html);
      } catch {
        try {
          const html = h.codeToHtml(content, { lang: 'text', theme });
          if (id === renderId.current) setHighlightedHtml(html);
        } catch {
          if (id === renderId.current) {
            const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            setHighlightedHtml(`<pre><code>${escaped}</code></pre>`);
          }
        }
      }
    };

    highlight();
  }, [content, lang, isDark]);

  if (content === null) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      {highlightedHtml ? (
        <div
          className="shiki-container text-[13px] leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      ) : (
        <pre className="whitespace-pre-wrap font-mono text-sm text-foreground/90">{content}</pre>
      )}
    </div>
  );
}

// ─── Generic fallback ─────────────────────────────────────────────────────────

function GenericPreview({ file }: { file: PreviewFile }) {
  const label = file.name.split('.').pop()?.toUpperCase() ?? 'FILE';
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
      <Files className="h-16 w-16 opacity-40" />
      <p className="text-lg font-semibold text-foreground">{file.name}</p>
      <span className="rounded-md border border-muted-foreground/25 bg-muted/80 px-2 py-1 text-xs">
        {label}
      </span>
    </div>
  );
}

// ─── Root modal ───────────────────────────────────────────────────────────────

export function FilePreviewModal({ file, onClose, isDark }: FilePreviewModalProps) {
  const ext = file?.name.split('.').pop()?.toLowerCase() ?? '';
  const isImage = !!file && IMAGE_EXTS.test(file.name);
  const isMarkdown = !!file && MD_EXT.test(file.name);
  const isPdf = !!file && PDF_EXT.test(file.name);

  useEffect(() => {
    if (!file) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [file, onClose]);

  return (
    <AnimatePresence>
      {file && (
        <>
          {/* Backdrop */}
          <motion.div
            key="file-preview-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9998] bg-black/52 backdrop-blur-[1px]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="file-preview-panel"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={
              isImage
                ? 'fixed left-1/2 top-1/2 z-[9999] flex max-h-[86vh] w-[min(72vw,640px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-muted-foreground/20 bg-background/95 shadow-2xl'
                : isPdf
                  ? 'fixed left-1/2 top-1/2 z-[9999] flex w-[min(90vw,420px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-visible'
                : isMarkdown
                  ? 'fixed left-1/2 top-1/2 z-[9999] flex h-[min(76vh,880px)] w-[min(82vw,1160px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-muted-foreground/15 bg-background shadow-2xl'
                : 'fixed left-1/2 top-1/2 z-[9999] flex h-[min(86vh,920px)] w-[min(92vw,1120px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-muted-foreground/15 bg-background shadow-2xl'
            }
            onClick={e => e.stopPropagation()}
          >
            {!isImage && !isPdf && (
              <div className="flex shrink-0 items-center justify-between border-b border-muted-foreground/15 px-5 py-3.5">
                <span className="truncate text-sm font-semibold text-foreground/90">{file.name}</span>
                <button
                  onClick={onClose}
                  className="ml-3 shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {isImage && (
              <button
                onClick={onClose}
                className="absolute right-3 top-3 z-20 rounded-lg bg-black/35 p-1.5 text-white/85 transition-colors hover:bg-black/55 hover:text-white"
                aria-label="Close image preview"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Body — type-dispatched */}
            {IMAGE_EXTS.test(file.name) ? (
              <ImagePreview file={file} />
            ) : PDF_EXT.test(file.name) ? (
              <PdfPreview file={file} onClose={onClose} />
            ) : MD_EXT.test(file.name) ? (
              <MarkdownPreview file={file} isDark={isDark} />
            ) : TEXT_LIKE_EXTS.has(ext) ? (
              <CodeTextPreview file={file} isDark={isDark} />
            ) : (
              <GenericPreview file={file} />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
