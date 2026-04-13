import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Globe, Image as ImageIcon, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { ThinkingBox } from './ThinkingBox';

interface ChatAreaProps {
  messages: Message[];
  isThinking: boolean;
  selectedModel: string;
  isDark: boolean;
  setInput: (val: string) => void;
  isIncognito?: boolean;
}

export const ChatArea = ({ messages, isThinking, selectedModel, isDark, setInput, isIncognito }: ChatAreaProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col bg-transparent">
      <div className="flex-1 min-h-0 overflow-y-auto w-full relative z-10 scroll-smooth">
        <div className="max-w-3xl mx-auto w-full p-4 md:p-6 lg:p-8 flex flex-col gap-8 pb-0">
          
          {/* Empty State / Welcome */}
          {messages.length === 0 && (
            isIncognito ? (
              <div className="flex flex-col items-center justify-center text-center mt-20 mb-10">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center space-y-6"
                >
                  <div className="flex items-center gap-3 text-4xl md:text-5xl font-serif tracking-tight">
                    <Sparkles className="h-10 w-10 text-orange-400" />
                    <span>You're incognito</span>
                  </div>
                  <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
                    Incognito chats aren't saved, added to memory, or used to train models. 
                    <a href="#" className="text-primary hover:underline ml-1">Learn more</a> about how your data is used.
                  </p>
                </motion.div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center mt-20 mb-10 space-y-6">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-32 w-32 rounded-[2.5rem] bg-zinc-100/80 dark:bg-zinc-900/80 backdrop-blur-xl flex items-center justify-center mb-4 shadow-2xl border border-zinc-200/50 dark:border-zinc-800/50"
                >
                  <img 
                    src="/assets/finch.svg" 
                    className="h-24 w-24 object-contain select-none" 
                    alt="Finch Logo" 
                  />
                </motion.div>
                <h1 className="text-3xl font-semibold tracking-tight">How can I help you today?</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl mt-8 items-stretch">
                  <Button 
                    variant="outline" 
                    className="h-full min-h-[140px] p-5 justify-start text-left flex flex-col items-start gap-2 rounded-2xl border-muted-foreground/20 hover:bg-muted/50 hover:border-muted-foreground/30 transition-all shadow-sm flex-1 group whitespace-normal"
                    onClick={() => { setInput('Summarize this article: '); toast('Added prompt to input'); }}
                  >
                    <span className="font-medium flex items-center gap-2 h-6 transition-transform group-hover:translate-x-1"><Globe className="h-4 w-4 text-blue-500" /> Summarize an article</span>
                    <span className="text-xs text-muted-foreground font-normal leading-relaxed">Paste a URL or text to get a quick summary of the main points.</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-full min-h-[140px] p-5 justify-start text-left flex flex-col items-start gap-2 rounded-2xl border-muted-foreground/20 hover:bg-muted/50 hover:border-muted-foreground/30 transition-all shadow-sm flex-1 group whitespace-normal"
                    onClick={() => { setInput('Analyze this image: '); toast('Added prompt to input'); }}
                  >
                    <span className="font-medium flex items-center gap-2 h-6 transition-transform group-hover:translate-x-1"><ImageIcon className="h-4 w-4 text-purple-500" /> Analyze an image</span>
                    <span className="text-xs text-muted-foreground font-normal leading-relaxed">Upload an image and ask questions about its contents.</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-full min-h-[140px] p-5 justify-start text-left flex flex-col items-start gap-2 rounded-2xl border-muted-foreground/20 hover:bg-muted/50 hover:border-muted-foreground/30 transition-all shadow-sm flex-1 group whitespace-normal"
                    onClick={() => { setInput('Draft an email about: '); toast('Added prompt to input'); }}
                  >
                    <span className="font-medium flex items-center gap-2 h-6 transition-transform group-hover:translate-x-1"><MessageSquare className="h-4 w-4 text-green-500" /> Draft an email</span>
                    <span className="text-xs text-muted-foreground font-normal leading-relaxed">Get help writing a professional or casual email.</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-full min-h-[140px] p-5 justify-start text-left flex flex-col items-start gap-2 rounded-2xl border-muted-foreground/20 hover:bg-muted/50 hover:border-muted-foreground/30 transition-all shadow-sm flex-1 group whitespace-normal"
                    onClick={() => { setInput('Brainstorm ideas for: '); toast('Added prompt to input'); }}
                  >
                    <span className="font-medium flex items-center gap-2 h-6 transition-transform group-hover:translate-x-1"><Plus className="h-4 w-4 text-orange-500" /> Brainstorm ideas</span>
                    <span className="text-xs text-muted-foreground font-normal leading-relaxed">Generate creative ideas for your next project.</span>
                  </Button>
                </div>
              </div>
            )
          )}

          {/* Messages */}
          {messages.map((msg, index) => (
            <MessageBubble 
              key={index} 
              msg={msg} 
              selectedModel={selectedModel} 
              isDark={isDark} 
              isLatest={index === messages.length - 1 && !isThinking} 
              isIncognito={isIncognito}
            />
          ))}

          {/* Thinking State */}
          {isThinking && (
            <div className="flex gap-4 w-full">
              <div className="h-8 w-8 shrink-0 mt-0.5 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                <MessageSquare className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex-1 space-y-2 overflow-hidden">
                <div className="font-medium text-sm">{selectedModel}</div>
                <ThinkingBox isActivelyThinking={true} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
};
