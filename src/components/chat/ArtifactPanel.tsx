import React, { useState, useEffect, useRef, memo } from 'react';
import { X, Copy, Check, Code2, Eye, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { createHighlighter, type Highlighter } from 'shiki';
import type { Artifact, ArtifactKind } from '@/src/types/chat';

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

const PREVIEW_KINDS: ArtifactKind[] = ['html', 'svg', 'react'];

/** Builds a self-contained HTML document that renders a React component via CDN Babel. */
function buildReactPreviewHtml(content: string, isDark: boolean): string {
  // Strip ES-module imports that can't run in a plain script context.
  const stripped = content
    .replace(/import\s+React\s*(?:,\s*\{[^}]*\})?\s+from\s+['"]react['"];?\n?/g, '')
    .replace(
      /import\s+\{([^}]+)\}\s+from\s+['"]react['"];?\n?/g,
      (_, names: string) => `const { ${names.split(',').map((n: string) => n.trim()).join(', ')} } = React;\n`,
    )
    .replace(/import\s+.*from\s+['"][^'"]+['"];?\n?/g, '')
    .replace(/export\s+default\s+function\s+(\w+)/, 'var __RC = function $1')
    .replace(/export\s+default\s+class\s+(\w+)/, 'var __RC = class $1')
    .replace(/export\s+default\s+/, 'var __RC = ')
    .replace(/export\s+(function|class|const|let|var)\s+/g, '$1 ');

  const bgColor = isDark ? '#111111' : '#ffffff';
  const textColor = isDark ? '#f8f8f8' : '#1f2328';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<style>
*{box-sizing:border-box}
body{
  margin:16px;
  font-family:system-ui,-apple-system,sans-serif;
  background:${bgColor};
  color:${textColor};
  transition: background-color 0.2s, color 0.2s;
}
button {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
  background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
  color: inherit;
  cursor: pointer;
  font-size: 14px;
}
button:hover {
  background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
}
</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
const {useState,useEffect,useRef,useCallback,useMemo,useReducer,useContext,createContext,forwardRef,memo}=React;
var __RC;
${stripped}
const _candidates=["App","Page","Component","Main","Root","Index"];
const _root=__RC||(()=>{for(const k of _candidates){try{if(typeof eval(k)==="function")return eval(k);}catch(_){}}return null;})();
if(_root){ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(_root));}
else{document.getElementById("root").textContent="Could not detect a React component to render.";}
</script>
</body>
</html>`;
}

interface ArtifactPanelProps {
  artifact: Artifact | null;
  allVersions?: Artifact[];
  isDark: boolean;
  onClose: () => void;
  onSelectVersion?: (artifact: Artifact) => void;
}

/** Shiki-highlighted code view used inside the panel. */
const PanelCodeView = ({
  content,
  language,
  isDark,
}: {
  content: string;
  language: string;
  isDark: boolean;
}) => {
  const [html, setHtml] = useState('');
  const renderId = useRef(0);

  useEffect(() => {
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

/** Renders an HTML or SVG artifact in a sandboxed iframe / inline element. */
const PreviewPane = ({ artifact, isDark }: { artifact: Artifact; isDark: boolean }) => {
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

  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    const htmlSource =
      artifact.kind === 'react'
        ? buildReactPreviewHtml(artifact.content, isDark)
        : artifact.content;

    const blob = new Blob([htmlSource], { type: 'text/html' });
    const newUrl = URL.createObjectURL(blob);
    setUrl(newUrl);

    return () => {
      URL.revokeObjectURL(newUrl);
    };
  }, [artifact.content, artifact.kind, isDark]);

  if (!url) return null;

  return (
    <iframe
      key={`${url}-${isDark}`}
      src={url}
      sandbox="allow-scripts allow-same-origin"
      className="w-full h-full border-0"
      title={artifact.title}
    />
  );
};

export const ArtifactPanel = memo(function ArtifactPanel({
  artifact,
  allVersions = [],
  isDark,
  onClose,
  onSelectVersion,
}: ArtifactPanelProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [copied, setCopied] = useState(false);

  const isOpen = artifact !== null;
  const canPreview = artifact ? PREVIEW_KINDS.includes(artifact.kind) : false;

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
    const ext = artifact.language ? `.${artifact.language}` : artifact.kind === 'html' ? '.html' : '.txt';
    const filename = artifact.title.includes('.') ? artifact.title : `${artifact.title}${ext}`;
    const blob = new Blob([artifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const panelBg = isDark ? 'bg-[#171717]' : 'bg-[#ffffff]';
  const headerBorder = isDark ? 'border-white/5' : 'border-black/5';

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
                  className={cn(
                    "p-2.5 rounded-full border transition-all active:scale-95 hover:shadow-md",
                    isDark ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-black/5 border-black/10 hover:bg-black/10 text-neutral-900"
                  )}
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
                  className={cn(
                    "p-2.5 rounded-full border transition-all active:scale-95 hover:shadow-md",
                    isDark ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-black/5 border-black/10 hover:bg-black/10 text-neutral-900"
                  )}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={onClose}
                  className={cn(
                    "p-2.5 rounded-full border transition-all hover:bg-rose-500/10 hover:text-rose-500 active:scale-95",
                    isDark ? "bg-white/5 border-white/10 text-white" : "bg-black/5 border-black/10 text-neutral-900"
                  )}
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
                />
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
