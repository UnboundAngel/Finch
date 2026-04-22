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
function buildReactPreviewHtml(content: string): string {
  // Strip ES-module imports that can't run in a plain script context.
  // React hooks/APIs are re-exposed as globals before the component code.
  const stripped = content
    // Drop bare `import React from 'react'`
    .replace(/import\s+React\s*(?:,\s*\{[^}]*\})?\s+from\s+['"]react['"];?\n?/g, '')
    // `import { useState, ... } from 'react'` → destructure from global React
    .replace(
      /import\s+\{([^}]+)\}\s+from\s+['"]react['"];?\n?/g,
      (_, names: string) => `const { ${names.split(',').map((n: string) => n.trim()).join(', ')} } = React;\n`,
    )
    // Remove all other imports (can't resolve external deps)
    .replace(/import\s+.*from\s+['"][^'"]+['"];?\n?/g, '')
    // `export default function Foo` → `function Foo`; track name
    .replace(/export\s+default\s+function\s+(\w+)/, 'var __RC = function $1')
    .replace(/export\s+default\s+class\s+(\w+)/, 'var __RC = class $1')
    .replace(/export\s+default\s+/, 'var __RC = ')
    // Remove remaining named export keywords
    .replace(/export\s+(function|class|const|let|var)\s+/g, '$1 ');

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
body{margin:16px;font-family:system-ui,-apple-system,sans-serif;background:#fff;color:#1f2328}
</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
const {useState,useEffect,useRef,useCallback,useMemo,useReducer,useContext,createContext,forwardRef,memo}=React;
var __RC;
${stripped}
// Render: prefer __RC (default export), else scan for likely component names
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

  if (!html) {
    return (
      <pre className="p-6 text-sm font-mono whitespace-pre overflow-x-auto leading-relaxed">
        <code>{content}</code>
      </pre>
    );
  }

  return (
    <div
      className="shiki-container p-6 text-[13px] leading-relaxed overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

/** Renders an HTML or SVG artifact in a sandboxed iframe / inline element. */
const PreviewPane = ({ artifact }: { artifact: Artifact }) => {
  if (artifact.kind === 'svg') {
    return (
      <div className="flex items-center justify-center h-full p-8 overflow-auto">
        <div dangerouslySetInnerHTML={{ __html: artifact.content }} />
      </div>
    );
  }

  const htmlSource =
    artifact.kind === 'react'
      ? buildReactPreviewHtml(artifact.content)
      : artifact.content;

  const blob = new Blob([htmlSource], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  return (
    <iframe
      key={url}
      src={url}
      // allow-same-origin is required so CDN scripts inside the blob can execute
      sandbox="allow-scripts allow-same-origin"
      className="w-full h-full border-0"
      title={artifact.title}
      onLoad={() => URL.revokeObjectURL(url)}
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

  // Reset to code tab when artifact changes
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

  const panelBg = isDark ? 'bg-[#13151a] border-white/8' : 'bg-[#fafafa] border-black/8';

  return (
    <AnimatePresence>
      {isOpen && artifact && (
        <motion.div
          key="artifact-panel"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 32, mass: 0.8 }}
          className={cn(
            'absolute inset-y-0 right-0 z-50 flex flex-col border-l shadow-2xl',
            panelBg
          )}
          style={{ width: 'min(480px, 100%)' }}
        >
          {/* Header */}
          <div
            className={cn(
              'flex items-center gap-3 px-4 py-3 border-b shrink-0',
              isDark ? 'border-white/8' : 'border-black/8'
            )}
          >
            <div className="flex-1 min-w-0">
              <p className={cn('truncate text-sm font-semibold', isDark ? 'text-[#e6edf3]' : 'text-[#1f2328]')}>
                {artifact.title}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-none capitalize">
                {artifact.kind}
                {artifact.language ? ` · ${artifact.language}` : ''}
                {allVersions.length > 1 ? ` · v${artifact.version}` : ''}
              </p>
            </div>

            {/* Version selector */}
            {allVersions.length > 1 && onSelectVersion && (
              <div className="flex items-center gap-1">
                {allVersions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => onSelectVersion(v)}
                    className={cn(
                      'px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
                      artifact.id === v.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    v{v.version}
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {canPreview && (
                <>
                  <button
                    onClick={() => setActiveTab('code')}
                    className={cn(
                      'p-1.5 rounded-md transition-colors text-xs flex items-center gap-1',
                      activeTab === 'code'
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <Code2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={cn(
                      'p-1.5 rounded-md transition-colors',
                      activeTab === 'preview'
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50"
                title="Copy content"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.div key="check" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.12 }}>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    </motion.div>
                  ) : (
                    <motion.div key="copy" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.12 }}>
                      <Copy className="h-3.5 w-3.5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
              <button
                onClick={handleDownload}
                className="p-1.5 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50"
                title="Download"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50"
                title="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto min-h-0">
            {activeTab === 'preview' && canPreview ? (
              <PreviewPane artifact={artifact} />
            ) : (
              <PanelCodeView
                content={artifact.content}
                language={artifact.language || artifact.kind}
                isDark={isDark}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
