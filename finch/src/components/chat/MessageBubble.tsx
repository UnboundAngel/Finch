import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../../types/chat';
import { ThinkingBox } from './ThinkingBox';
import { MetadataRow } from './MetadataRow';
import { CodeBlock } from './CodeBlock';

interface MessageBubbleProps {
  msg: Message;
  selectedModel: string;
  isDark: boolean;
  isLatest: boolean;
}

export const MessageBubble = ({ msg, selectedModel, isDark, isLatest }: MessageBubbleProps) => {
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
      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="font-medium text-sm">{msg.role === 'user' ? 'You' : selectedModel}</div>
        {msg.reasoning && <ThinkingBox content={msg.reasoning} />}
        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90">
          <ReactMarkdown
            components={{
              h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-4" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-3" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-base font-bold mb-2" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
              li: ({node, ...props}) => <li className="mb-1" {...props} />,
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
                  <code className="bg-muted/80 px-1.5 py-0.5 rounded text-sm font-mono font-medium" {...rest}>
                    {children}
                  </code>
                )
              }
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
        {msg.role === 'ai' && msg.metadata && <MetadataRow metadata={msg.metadata} isLatest={isLatest} />}
      </div>
    </div>
  );
};
