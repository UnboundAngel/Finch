import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  children: string;
  language: string;
  isDark: boolean;
}

export const CodeBlock = ({ children, language, isDark }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-muted-foreground/10 bg-muted/20">
      <div className="absolute right-3 top-3 z-20">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 bg-background/50 hover:bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all rounded-lg border border-muted-foreground/10"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500 transition-all scale-110" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground transition-all" />
          )}
        </Button>
      </div>
      <SyntaxHighlighter
        PreTag="div"
        language={language}
        style={isDark ? oneDark : oneLight}
        customStyle={{
          margin: 0,
          padding: '1.5rem',
          fontSize: '0.875rem',
          background: 'transparent',
        }}
        codeTagProps={{ style: { background: 'transparent' } }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
};
