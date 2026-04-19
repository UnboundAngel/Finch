import { useState, useEffect, useRef } from 'react';
import { Check, Copy } from 'lucide-react';
import { createHighlighter, type Highlighter } from 'shiki';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  children: string;
  language: string;
  isDark: boolean;
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

export const CodeBlock = ({ children, language, isDark }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(!!highlighterInstance);
  
  // Track the current request to avoid race conditions
  const renderId = useRef(0);

  useEffect(() => {
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
        // Fallback to plain text if language not supported
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
  }, [children, language, isDark]);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

      <style dangerouslySetInnerHTML={{ __html: `
        .shiki-container pre {
          margin: 0 !important;
          padding: 0 !important;
          background: transparent !important;
        }
        .shiki-container code {
          background: transparent !important;
          padding: 0 !important;
          border-radius: 0 !important;
        }
      `}} />
    </motion.div>
  );
};





