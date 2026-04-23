import React, { memo, useMemo, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Files, Check, Square, RefreshCw, Pencil } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../../types/chat';
import type { Artifact } from '../../types/chat';
import { SearchStatus } from './SearchStatus';
import { ThinkingBox } from './ThinkingBox';
import { MetadataRow } from './MetadataRow';
import { CodeBlock } from './CodeBlock';
import { ArtifactCard } from './ArtifactCard';
import { ExternalLink } from '@/src/components/ui/ExternalLink';
import { resolveMediaSrc } from '@/src/lib/mediaPaths';
import { useModelParams } from '@/src/store';
import { FilePreviewModal, type PreviewFile } from '@/src/components/chat/FilePreviewModal';
import { parseContentSegments } from '@/src/lib/artifactParser';

function isImageFileName(name: string) {
  return /\.(png|jpe?g|gif|webp)$/i.test(name);
}

const remarkPlugins = [remarkGfm];

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
  onRegenerate?: (messageId?: string) => void;
  onEditResend?: (messageId: string, newContent: string) => void;
  onArtifactClick?: (artifact: Artifact) => void;
}

export const MessageBubble = memo(function MessageBubble({
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
  onEditResend,
  onArtifactClick,
}: MessageBubbleProps) {
  const [copied, setCopied] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState('');
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const showMessageStats = useModelParams(state => state.showMessageStats);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditSubmit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== msg.content && msg.id) {
      onEditResend?.(msg.id, trimmed);
    }
    setIsEditing(false);
  };

  const isStreaming = !!msg.streaming;
  const isUserMsg = msg.role === 'user';
  const isStreamingRef = useRef(isStreaming);
  isStreamingRef.current = isStreaming;

  const contentSegments = useMemo(
    () => parseContentSegments(msg.content, isStreaming),
    [msg.content, isStreaming],
  );

  const markdownComponents = useMemo(() => ({
    h1: ({ node, ...props }: any) => <h1 className="text-xl font-bold mb-4" {...props} />,
    h2: ({ node, ...props }: any) => <h2 className="text-lg font-bold mb-3" {...props} />,
    h3: ({ node, ...props }: any) => <h3 className="text-base font-bold mb-2" {...props} />,
    h4: ({ node, ...props }: any) => <h4 className="text-sm font-bold mb-2" {...props} />,
    h5: ({ node, ...props }: any) => <h5 className="text-sm font-semibold mb-1" {...props} />,
    h6: ({ node, ...props }: any) => <h6 className="text-xs font-semibold mb-1" {...props} />,
    ul: ({ node, ...props }: any) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
    ol: ({ node, ...props }: any) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
    li: ({ node, ...props }: any) => <li className="mb-1" {...props} />,
    table: ({ node, ...props }: any) => (
      <div className="overflow-x-auto my-4 rounded-lg border border-muted-foreground/10">
        <table className="min-w-full border-collapse" {...props} />
      </div>
    ),
    tbody: ({ node, ...props }: any) => <tbody className="[&_tr:last-child_td]:border-b-0" {...props} />,
    tr: ({ node, ...props }: any) => <tr className="border-0" {...props} />,
    thead: ({ node, ...props }: any) => <thead className="bg-muted/50" {...props} />,
    th: ({ node, ...props }: any) => <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-muted-foreground/10" {...props} />,
    td: ({ node, ...props }: any) => <td className="px-4 py-2 text-sm border-b border-muted-foreground/10" {...props} />,
    a: ({ node, href, children, ...props }: any) => (
      <ExternalLink href={href || ''} {...props}>
        {children}
      </ExternalLink>
    ),
    code(props: any) {
      const { children, className, node, ...rest } = props;
      const match = /language-(\w+)/.exec(className || '');
      return match ? (
        <CodeBlock
          children={String(children).replace(/\n$/, '')}
          language={match[1]}
          isDark={isDark}
          streaming={isStreamingRef.current}
        />
      ) : (
        <code className={`px-1.5 py-0.5 rounded text-sm font-mono font-medium break-all whitespace-pre-wrap ${isUserMsg ? 'bg-white/20' : 'bg-muted/80'}`} {...rest}>
          {children}
        </code>
      );
    },
  }), [isDark, isUserMsg]);

  return (
    <>
    <div className="flex gap-4 w-full min-w-0 group">
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
      <div className="flex-1 min-w-0 space-y-2 overflow-hidden">
        <div className="font-medium text-sm px-1">{msg.role === 'user' ? 'You' : selectedModel}</div>

        {msg.role === 'ai' && msg.metadata?.researchEvents && msg.metadata.researchEvents.length > 0 && (
          <SearchStatus events={msg.metadata.researchEvents} />
        )}

        <div className={`transition-colors min-w-0 ${msg.role === 'user'
            ? 'rounded-2xl px-4 py-3 shadow-sm bg-primary text-primary-foreground'
            : 'px-0 py-0 shadow-none bg-transparent border-0'
          }`}>
          <div className="min-h-[1.5rem]">
            {msg.role === 'user' && isEditing ? (
              <div className="flex flex-col gap-2">
                <textarea
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSubmit(); }
                    if (e.key === 'Escape') setIsEditing(false);
                  }}
                  className="w-full bg-white/20 text-primary-foreground rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-white/40 min-h-[60px]"
                  rows={3}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-xs px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-primary-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditSubmit}
                    className="text-xs px-3 py-1 rounded-md bg-white/30 hover:bg-white/40 text-primary-foreground font-medium transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            ) : (
              <>
                {msg.reasoning && <ThinkingBox content={msg.reasoning} />}
                {msg.role === 'user' && msg.attachment && (
                  <div className="mb-3">
                    {isImageFileName(msg.attachment.name) ? (
                      <img
                        src={resolveMediaSrc(msg.attachment.path)}
                        alt={msg.attachment.name}
                        className="max-h-44 w-auto max-w-full cursor-pointer rounded-lg border border-white/25 object-contain transition-opacity hover:opacity-90"
                        onClick={() => setPreviewFile(msg.attachment!)}
                      />
                    ) : (
                      <div
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs transition-opacity hover:opacity-80"
                        onClick={() => setPreviewFile(msg.attachment!)}
                      >
                        <Files className="h-4 w-4 shrink-0 opacity-90" />
                        <span className="truncate font-medium">{msg.attachment.name}</span>
                      </div>
                    )}
                  </div>
                )}
                {msg.role === 'ai' ? (
                  // Segment the content so artifact XML renders as cards, not raw text.
                  <div className="space-y-3 min-w-0">
                    {contentSegments.map((seg, i) =>
                      seg.type === 'artifact' ? (
                        <ArtifactCard
                          key={seg.artifact.id}
                          artifact={seg.artifact}
                          isDark={isDark}
                          onClick={(art) => onArtifactClick?.(art)}
                        />
                      ) : (
                        seg.content.trim() && seg.content !== 'undefined' ? (
                          <div key={i} className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 break-words overflow-hidden">
                            <ReactMarkdown remarkPlugins={remarkPlugins} components={markdownComponents}>
                              {seg.content}
                            </ReactMarkdown>
                          </div>
                        ) : null
                      )
                    )}
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-primary-foreground break-words overflow-hidden">
                    <ReactMarkdown remarkPlugins={remarkPlugins} components={markdownComponents}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Action Row (Underneath - User Only) */}
        {msg.role === 'user' && (
          <div className={cn(
            "flex items-center justify-end gap-1 px-1 transition-opacity duration-500 delay-200 group-hover:duration-200 group-hover:delay-0",
            copied ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}>
            {onEditResend && !isEditing && (
              <TooltipProvider delay={400}>
                <Tooltip>
                  <TooltipTrigger
                    onClick={() => { setEditValue(msg.content); setIsEditing(true); }}
                    className={cn(
                      "p-1.5 rounded-md transition-all active:scale-90",
                      "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px] py-1 px-2">Edit</TooltipContent>
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

        {msg.role === 'ai' && !msg.streaming && (
          <div className="flex items-center gap-1">
            {showMessageStats && msg.metadata && (
              <MetadataRow metadata={msg.metadata} isLatest={isLatest || !!msg.streaming} hasCustomBg={hasCustomBg} />
            )}
            <div className="flex items-center gap-1 px-1 ml-auto">
              {onRegenerate && (
                <TooltipProvider delay={400}>
                  <Tooltip>
                    <TooltipTrigger
                      onClick={() => onRegenerate?.(msg.id)}
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
          </div>
        )}
      </div>
      <div className="h-8 w-8 shrink-0 mt-0.5 opacity-0 pointer-events-none" aria-hidden="true" />
    </div>
    <FilePreviewModal
      file={previewFile}
      onClose={() => setPreviewFile(null)}
      isDark={isDark}
    />
    </>
  );
});
