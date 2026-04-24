import { useState, useEffect, useRef } from 'react';
import { Check, Copy } from 'lucide-react';
import { createHighlighter, type Highlighter } from 'shiki';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { getContrastText } from '@/src/lib/colorUtils';

interface CodeBlockProps {
  children: string;
  language: string;
  isDark: boolean;
  streaming?: boolean;
}

// Global highlighter instance to avoid re-initialization
let highlighterInstance: Highlighter | null = null;
const highlighterPromise = createHighlighter({
  themes: ['github-dark', 'github-light'],
  langs: ['typescript', 'javascript', 'python', 'rust', 'go', 'bash', 'json', 'yaml', 'markdown', 'html', 'css', 'sql'],
}).then((h) => {
  highlighterInstance = h;
  return h;
});

export const CodeBlock = ({ children, language, isDark, streaming }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(!!highlighterInstance);
  
  // Track the current request to avoid race conditions
  const renderId = useRef(0);

  const isPaletteLanguage = language === 'palette' || language === 'color' || language === 'colors';
  const paletteColors = isPaletteLanguage
    ? Array.from(children.matchAll(/(#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-fA-F])|rgba?\([^)]+\)|hsla?\([^)]+\))/gi)).map(m => m[0])
    : [];

  useEffect(() => {
    // Skip expensive Shiki work while the message is still streaming — show plain
    // pre/code instead and highlight once the stream finalises (streaming goes false).
    if (streaming || isPaletteLanguage) {
      setHighlightedHtml('');
      return;
    }

    const currentRenderId = ++renderId.current;

    const highlight = async () => {
      const h = highlighterInstance || (await highlighterPromise);
      if (currentRenderId !== renderId.current) return;
      if (!isLoaded) setIsLoaded(true);

      try {
        const html = h.codeToHtml(children, {
          lang: language || 'text',
          theme: isDark ? 'github-dark' : 'github-light',
        });

        if (currentRenderId === renderId.current) {
          setHighlightedHtml(html);
        }
      } catch (e) {
        console.error('Shiki highlighting failed:', e);
        const fallbackHtml = h.codeToHtml(children, {
          lang: 'text',
          theme: isDark ? 'github-dark' : 'github-light',
        });
        if (currentRenderId === renderId.current) {
          setHighlightedHtml(fallbackHtml);
        }
      }
    };

    highlight();
  }, [children, language, isDark, streaming]);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isPaletteLanguage && paletteColors.length > 0) {
    return <ColorPaletteBlock colors={paletteColors} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative group/code my-8 overflow-visible max-w-full min-w-0"
    >
      {/* Sticky Controls Container */}
      <div className="sticky top-20 z-30 h-0 w-full flex justify-end items-start pointer-events-none">
        <div className="pt-4 pr-5 flex items-center gap-4 opacity-0 group-hover/code:opacity-100 transition-opacity duration-200 pointer-events-auto bg-transparent">
          <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground select-none pb-0.5">
            {language || 'text'}
          </span>

          <button
            className="transition-colors duration-100 hover:text-foreground active:opacity-50 text-muted-foreground"
            onClick={handleCopy}
          >
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.05 }}
                >
                  <Check className="h-4 w-4" />
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.05 }}
                >
                  <Copy className="h-4 w-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Internal Clipping Wrapper */}
      <div className="relative rounded-2xl overflow-hidden border border-muted-foreground/10 bg-muted/5 backdrop-blur-2xl">
        {/* Top Edge Gradient Accent */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-muted-foreground/10 to-transparent pointer-events-none" />

        <div className="relative">
          {!isLoaded || !highlightedHtml ? (
            <pre className="p-8 text-sm font-mono whitespace-pre overflow-x-auto min-h-[1.5rem] selection:bg-primary/20">
              <code>{children}</code>
            </pre>
          ) : (
            <div
              className="shiki-container p-8 text-[13px] leading-relaxed overflow-x-auto selection:bg-primary/20"
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
};


const ColorPaletteBlock = ({ colors }: { colors: string[] }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  if (colors.length === 0) return null;

  return (
    <div className="my-8 rounded-2xl overflow-visible border border-muted-foreground/10 bg-muted/5 backdrop-blur-2xl flex h-20 shadow-sm w-full group/palette relative">
      {colors.map((color, idx) => (
        <div
          key={idx}
          className={cn(
            "group/slice relative flex-1 flex flex-col justify-end p-2 sm:p-3 transition-[flex] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:flex-[2.5] cursor-pointer overflow-visible",
            idx === 0 && "rounded-l-2xl",
            idx === colors.length - 1 && "rounded-r-2xl"
          )}
          style={{
            backgroundColor: '#fff',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Crect width='4' height='4' fill='%23ccc'/%3E%3Crect x='4' y='4' width='4' height='4' fill='%23ccc'/%3E%3C/svg%3E")`,
            backgroundSize: '8px 8px'
          }}
          onClick={() => {
            navigator.clipboard.writeText(color);
            setCopiedIndex(idx);
            setTimeout(() => setCopiedIndex(null), 2000);
          }}
        >
          <div
            className={cn(
              "absolute inset-0 transition-colors",
              idx === 0 && "rounded-l-[15px]",
              idx === colors.length - 1 && "rounded-r-[15px]"
            )}
            style={{ backgroundColor: color }}
          />

          <div
            className="relative z-10 opacity-0 group-hover/slice:opacity-100 transition-opacity duration-200 delay-100 font-mono text-[10px] sm:text-[11px] font-bold tracking-widest uppercase whitespace-nowrap overflow-hidden"
            style={{ color: getContrastText(color) }}
          >
            {color}
          </div>

          {/* Centered Copied Feedback Overlay */}
          <AnimatePresence>
            {copiedIndex === idx && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
              >
                <div 
                  className="flex flex-col items-center gap-1 drop-shadow-sm"
                  style={{ color: getContrastText(color) }}
                >
                  <Check className="w-6 h-6 stroke-[3px] opacity-90" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">Copied</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};





