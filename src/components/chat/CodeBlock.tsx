import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { createHighlighter, type Highlighter } from 'shiki';

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
      
      // Ensure we only update if this is still the current request
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
    <div className="relative group/code my-4 rounded-xl overflow-hidden border border-muted-foreground/10 bg-muted/20 max-w-full min-w-0">
      <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
        <span className="text-[10px] uppercase font-bold text-muted-foreground/50 px-2 py-1 rounded bg-muted/30 border border-muted-foreground/5 backdrop-blur-sm opacity-0 group-hover/code:opacity-100 transition-all">
          {language}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 bg-background/50 hover:bg-background/80 backdrop-blur-sm opacity-0 group-hover/code:opacity-100 transition-all rounded-lg border border-muted-foreground/10"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500 transition-all scale-110" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground transition-all" />
          )}
        </Button>
      </div>
      
      {!isLoaded || !highlightedHtml ? (
        <pre className="p-6 text-sm font-mono whitespace-pre overflow-x-auto min-h-[1.5rem]">
          <code>{children}</code>
        </pre>
      ) : (
        <div 
          className="shiki-container p-6 text-sm overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      )}

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
    </div>
  );
};
