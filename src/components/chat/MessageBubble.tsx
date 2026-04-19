import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Files, Check, Square, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../../types/chat';
import { ThinkingBox } from './ThinkingBox';
import { MetadataRow } from './MetadataRow';
import { CodeBlock } from './CodeBlock';
import { ExternalLink } from '@/src/components/ui/ExternalLink';

interface MessageBubbleProps {
  msg: Message;
  selectedModel: string;
  isDark: boolean;
  isLatest: boolean;
  isIncognito?: boolean;
  hasCustomBg?: boolean;
  isPinkMode?: boolean;
  userAvatarSrc: string;
  userAvatarLetter: string;
  onRegenerate?: () => void;
}

export const MessageBubble = ({
  msg,
  selectedModel,
  isDark,
  isLatest,
  isIncognito,
  hasCustomBg,
  isPinkMode,
  userAvatarSrc,
  userAvatarLetter,
  onRegenerate,
}: MessageBubbleProps) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex gap-4 w-full group">
      {msg.role === 'user' ? (
        <Avatar className="h-8 w-8 shrink-0 mt-0.5 rounded-lg border border-muted-foreground/20">
          <AvatarImage src={userAvatarSrc} alt="" referrerPolicy="no-referrer" />
          <AvatarFallback className="rounded-lg bg-primary/10 text-primary">{userAvatarLetter}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="h-8 w-8 shrink-0 mt-0.5 rounded-lg bg-primary flex items-center justify-center shadow-sm">
          <MessageSquare className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
      <div className="flex-1 space-y-2 text-wrap">
        <div className="font-medium text-sm px-1">{msg.role === 'user' ? 'You' : selectedModel}</div>

        <div className={`rounded-2xl px-4 py-3 shadow-sm transition-colors ${msg.role === 'user'
            ? 'bg-primary text-primary-foreground'
            : (isIncognito
              ? (isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-neutral-200')
              : (isPinkMode 
                ? 'bg-white/70 border border-rose-100/50' 
                : 'bg-muted/50 border border-muted-foreground/10'))
          }`}>
          <div className="min-h-[1.5rem]">
            {msg.reasoning && <ThinkingBox content={msg.reasoning} />}
            <div className={`prose prose-sm dark:prose-invert max-w-none ${msg.role === 'user' ? 'text-primary-foreground' : 'text-foreground/90'}`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }) => <h1 className="text-xl font-bold mb-4" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-lg font-bold mb-3" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-base font-bold mb-2" {...props} />,
                h4: ({ node, ...props }) => <h4 className="text-sm font-bold mb-2" {...props} />,
                h5: ({ node, ...props }) => <h5 className="text-sm font-semibold mb-1" {...props} />,
                h6: ({ node, ...props }) => <h6 className="text-xs font-semibold mb-1" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-4 rounded-lg border border-muted-foreground/10">
                    <table className="min-w-full divide-y divide-muted-foreground/10" {...props} />
                  </div>
                ),
                thead: ({ node, ...props }) => <thead className="bg-muted/50" {...props} />,
                th: ({ node, ...props }) => <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider" {...props} />,
                td: ({ node, ...props }) => <td className="px-4 py-2 text-sm border-t border-muted-foreground/10" {...props} />,
                a: ({ node, href, children, ...props }) => (
                  <ExternalLink href={href || ''} {...props}>
                    {children}
                  </ExternalLink>
                ),
                code(props) {
                  const { children, className, node, ...rest } = props
                  const match = /language-(\w+)/.exec(className || '')
                  return match ? (
                    <CodeBlock
                      children={String(children).replace(/\n$/, '')}
                      language={match[1]}
                      isDark={isDark}
                    />
                  ) : (
                    <code className={`px-1.5 py-0.5 rounded text-sm font-mono font-medium ${msg.role === 'user' ? 'bg-white/20' : 'bg-muted/80'}`} {...rest}>
                      {children}
                    </code>
                  )
                }
              }}
            >
              {msg.content}
            </ReactMarkdown>
          </div>

          </div>
        </div>

        {/* Action Row (Underneath - User Only) */}
        {msg.role === 'user' && (
          <div className={cn(
            "flex items-center justify-end gap-1 px-1 transition-opacity duration-200",
            copied ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}>
            <TooltipProvider delay={400}>
              <Tooltip>
                <TooltipTrigger
                  onClick={handleCopy}
                  className={cn(
                    "p-1.5 rounded-md transition-all active:scale-90",
                    "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="copy"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Files className="h-3.5 w-3.5" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px] py-1 px-2">
                  {copied ? "Copied!" : "Copy"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {msg.role === 'ai' && !msg.streaming && msg.metadata?.stopReason === 'user_stopped' && (
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground/50">
            <Square className="h-2.5 w-2.5 fill-current" />
            <span>Generation stopped</span>
          </div>
        )}

        {msg.role === 'ai' && (
          <div className="flex items-center gap-1">
            <div className={cn(
              "flex items-center gap-1 px-1 transition-opacity duration-200",
              copied ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
              {onRegenerate && (
                <TooltipProvider delay={400}>
                  <Tooltip>
                    <TooltipTrigger
                      onClick={onRegenerate}
                      className={cn(
                        "p-1.5 rounded-md transition-all active:scale-90",
                        "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[10px] py-1 px-2">
                      Regenerate
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <TooltipProvider delay={400}>
                <Tooltip>
                  <TooltipTrigger
                    onClick={handleCopy}
                    className={cn(
                      "p-1.5 rounded-md transition-all active:scale-90",
                      "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.div key="check" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }}>
                          <Check className="h-3.5 w-3.5" />
                        </motion.div>
                      ) : (
                        <motion.div key="copy" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }}>
                          <Files className="h-3.5 w-3.5" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px] py-1 px-2">
                    {copied ? "Copied!" : "Copy"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {msg.metadata && <MetadataRow metadata={msg.metadata} isLatest={isLatest || !!msg.streaming} hasCustomBg={hasCustomBg} />}
          </div>
        )}
      </div>
    </div>
  );
};
