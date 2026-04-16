import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../../types/chat';
import { ThinkingBox } from './ThinkingBox';
import { MetadataRow } from './MetadataRow';
import { CodeBlock } from './CodeBlock';

interface MessageBubbleProps {
  msg: Message;
  selectedModel: string;
  isDark: boolean;
  isLatest: boolean;
  isIncognito?: boolean;
}

export const MessageBubble = ({ msg, selectedModel, isDark, isLatest, isIncognito }: MessageBubbleProps) => {
  return (
    <div className="flex gap-4 w-full group">
      {msg.role === 'user' ? (
        <Avatar className="h-8 w-8 shrink-0 mt-0.5 rounded-lg border border-muted-foreground/20">
          <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces" alt="User" />
          <AvatarFallback className="rounded-lg bg-primary/10 text-primary">U</AvatarFallback>
        </Avatar>
      ) : (
        <div className="h-8 w-8 shrink-0 mt-0.5 rounded-lg bg-primary flex items-center justify-center shadow-sm">
          <MessageSquare className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
      <div className="flex-1 space-y-2 text-wrap">
        <div className="font-medium text-sm px-1">{msg.role === 'user' ? 'You' : selectedModel}</div>
        
        <div className={`rounded-2xl px-4 py-3 shadow-sm transition-colors ${
          msg.role === 'user' 
            ? 'bg-primary text-primary-foreground' 
            : (isIncognito 
                ? (isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-neutral-200') 
                : 'bg-muted/50 border border-muted-foreground/10')
        }`}>
          {msg.reasoning && <ThinkingBox content={msg.reasoning} />}
          <div className={`prose prose-sm dark:prose-invert max-w-none ${msg.role === 'user' ? 'text-primary-foreground' : 'text-foreground/90'}`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-4" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-3" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-base font-bold mb-2" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
                li: ({node, ...props}) => <li className="mb-1" {...props} />,
                table: ({node, ...props}) => (
                  <div className="overflow-x-auto my-4 rounded-lg border border-muted-foreground/10">
                    <table className="min-w-full divide-y divide-muted-foreground/10" {...props} />
                  </div>
                ),
                thead: ({node, ...props}) => <thead className="bg-muted/50" {...props} />,
                th: ({node, ...props}) => <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider" {...props} />,
                td: ({node, ...props}) => <td className="px-4 py-2 text-sm border-t border-muted-foreground/10" {...props} />,
                code(props) {
                  const {children, className, node, ...rest} = props
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
        {msg.role === 'ai' && msg.metadata && <MetadataRow metadata={msg.metadata} isLatest={isLatest || !!msg.streaming} />}
      </div>
    </div>
  );
};
