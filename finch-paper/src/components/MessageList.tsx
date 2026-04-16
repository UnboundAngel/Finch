// finch/src/components/MessageList.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Zap, Hash, Clock, Timer, Bot, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageMetadata {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  tokensPerSecond?: number
  timeToFirstToken?: number  // ms
  totalDuration?: number     // ms
  model?: string
  stopReason?: string
  timestamp?: Date
}

interface Message {
  id: number;
  role: string;
  content: string;
  metadata?: MessageMetadata;
}

interface MessageListProps {
  theme: 'sketch' | 'terminal';
  messages: Message[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

const MetadataItem = ({ 
  icon: Icon, 
  value, 
  label, 
  theme 
}: { 
  icon: any, 
  value: string | number, 
  label: string, 
  theme: 'sketch' | 'terminal' 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative flex items-center gap-2 whitespace-nowrap cursor-help"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 0, x: '-50%' }}
            animate={{ opacity: 1, y: -40, x: '-50%' }}
            exit={{ opacity: 0, y: 0, x: '-50%' }}
            className={`absolute left-1/2 px-4 py-2 text-[16px] z-[60] pointer-events-none font-bold tracking-tight shadow-md min-w-[140px] text-center ${
              theme === 'sketch' 
                ? 'bg-[#fef3c7] border-2 border-black rotate-[-1deg] text-black' 
                : 'bg-[#30363d] text-[#e6edf3] rounded-lg border border-white/20'
            }`}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
      <Icon size={18} className="opacity-70" />
      <span>{value}</span>
    </div>
  );
};

const MetadataRow = ({ 
  metadata, 
  theme, 
  isLatestAI, 
  content 
}: { 
  metadata: MessageMetadata, 
  theme: 'sketch' | 'terminal', 
  isLatestAI: boolean, 
  content: string 
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: isLatestAI ? 0.6 : 0 }}
      whileHover={{ opacity: 1 }}
      className={`mt-3 flex items-center gap-8 text-[16px] transition-all duration-300 group-hover/msg:opacity-100 ${
        theme === 'sketch' ? 'text-black font-bold' : 'text-white'
      }`}
    >
      <div className="flex items-center gap-8 flex-1">
        {metadata.completionTokens !== undefined && (
          <MetadataItem 
            icon={Hash} 
            value={metadata.completionTokens} 
            label="Tokens generated" 
            theme={theme} 
          />
        )}
        {metadata.tokensPerSecond !== undefined && (
          <MetadataItem 
            icon={Zap} 
            value={`${metadata.tokensPerSecond} t/s`} 
            label="Generation speed" 
            theme={theme} 
          />
        )}
        {metadata.timeToFirstToken !== undefined && (
          <MetadataItem 
            icon={Timer} 
            value={`${metadata.timeToFirstToken}ms`} 
            label="Time to first token" 
            theme={theme} 
          />
        )}
        {metadata.totalDuration !== undefined && (
          <MetadataItem 
            icon={Clock} 
            value={`${(metadata.totalDuration / 1000).toFixed(1)}s`} 
            label="Total generation time" 
            theme={theme} 
          />
        )}
        {metadata.model && (
          <MetadataItem 
            icon={Bot} 
            value={metadata.model} 
            label="AI Model" 
            theme={theme} 
          />
        )}
        {metadata.stopReason === 'length' && (
          <MetadataItem 
            icon={AlertTriangle} 
            value="cut off" 
            label="Stopped early (length limit)" 
            theme={theme} 
          />
        )}
      </div>
      
      <button 
        onClick={handleCopy}
        className={`opacity-0 group-hover/msg:opacity-100 p-1.5 transition-all ${
          theme === 'sketch' ? 'hover:text-emerald-600' : 'hover:text-blue-400'
        }`}
      >
        {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
      </button>
    </motion.div>
  );
};

export const MessageList: React.FC<MessageListProps> = ({ theme, messages, scrollRef }) => {
  const lastAIIndex = [...messages].reverse().findIndex(m => m.role === 'ai');
  const actualLastAIIndex = lastAIIndex !== -1 ? messages.length - 1 - lastAIIndex : -1;

  const markdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      if (inline) {
        return (
          <code 
            className={`px-1 font-mono ${
              theme === 'sketch' ? 'bg-[#ede8df]' : 'bg-[#161b22] text-[#79c0ff]'
            }`} 
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <pre className={`p-4 my-2 font-mono overflow-x-auto ${
          theme === 'sketch' 
            ? 'bg-[#ede8df] border border-black/20 rounded-none' 
            : 'bg-[#161b22] border border-white/10 rounded-md'
        }`}>
          <code {...props}>{children}</code>
        </pre>
      );
    },
    h1: ({ children }: any) => <h1 className="text-2xl font-bold my-2">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-xl font-bold my-2">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-lg font-bold my-2">{children}</h3>,
    p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
    ul: ({ children }: any) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
    li: ({ children }: any) => <li className="mb-1">{children}</li>,
    blockquote: ({ children }: any) => (
      <blockquote className={`pl-3 my-2 italic border-l-2 ${
        theme === 'sketch' ? 'border-black/30' : 'border-white/20'
      }`}>
        {children}
      </blockquote>
    ),
    a: ({ children, href }: any) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className={`underline decoration-wavy transition-colors ${
        theme === 'sketch' ? 'text-emerald-700 hover:text-emerald-600' : 'text-blue-400 hover:text-blue-300'
      }`}>
        {children}
      </a>
    ),
  };

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto paper-scrollbar px-8 py-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <AnimatePresence>
          {messages.map((msg, i) => {
            const isAI = msg.role === 'ai';
            const isLatestAI = i === actualLastAIIndex;
            
            // TODO: wire from API response
            const metadata = isAI && !msg.metadata ? {
              promptTokens: 100 + (i * 10),
              completionTokens: 200 + (i * 20),
              tokensPerSecond: 24.6,
              timeToFirstToken: 340,
              totalDuration: 3200,
              model: "GPT-4o Paper",
              timestamp: new Date(Date.now() - (messages.length - i) * 60000)
            } : msg.metadata;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="flex flex-col max-w-[85%] group/msg">
                  <div className={`px-5 py-4 transition-all duration-500 ${
                    theme === 'sketch'
                      ? `sketch-border sketch-shadow text-xl leading-relaxed ${
                          msg.role === 'user' ? 'bg-[#fde68a] rotate-1' : 'bg-white -rotate-1'
                        }`
                      : `rounded-2xl ${msg.role === 'user' ? 'bg-[#2d333b]' : 'bg-[#1c2333]'}`
                  }`}>
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                  
                  {isAI && metadata && (
                    <MetadataRow 
                      metadata={metadata} 
                      theme={theme} 
                      isLatestAI={isLatestAI} 
                      content={msg.content} 
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
