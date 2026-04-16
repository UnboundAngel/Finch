import React, { useRef, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Globe, Image as ImageIcon, Plus, Sparkles, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { ThinkingBox } from './ThinkingBox';
import { Message } from '../../types/chat';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { SearchStatus } from './SearchStatus';

interface ChatAreaProps {
  messages: Message[];
  isThinking: boolean;
  selectedModel: string;
  isDark: boolean;
  setInput: (val: string) => void;
  isIncognito?: boolean;
  hasCustomBg?: boolean;
  isPinkMode?: boolean;
  researchEvents: any[];
  voiceStatus: 'idle' | 'recording' | 'transcribing';
}

export const ChatArea = memo(({ 
  messages, 
  isThinking, 
  researchEvents, 
  selectedModel, 
  isDark, 
  setInput, 
  isIncognito, 
  hasCustomBg, 
  isPinkMode,
  voiceStatus 
}: ChatAreaProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  return (
    <div className="flex-1 overflow-y-auto pt-20 pb-8 px-4 scrollbar-hide">
      <div className="max-w-3xl mx-auto min-h-full flex flex-col">
        <div className="flex-1 space-y-6">
          {messages.length === 0 && (
            isIncognito ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight">Incognito Mode Active</h2>
                  <div className="flex items-center justify-center text-muted-foreground max-w-sm mx-auto">
                    <p className="text-sm">Your conversation will not be saved to history.</p>
                    <TooltipProvider delay={200}>
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="text-primary hover:underline ml-1 cursor-help inline-flex items-center gap-0.5"><HelpCircle className="h-3 w-3" /> Privacy Policy</span>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="bottom" 
                          className="w-72 p-4 space-y-3 text-xs leading-relaxed bg-popover/95 backdrop-blur-md border-white/10 shadow-2xl"
                        >
                          <p className="font-bold border-b border-white/10 pb-1.5 mb-2 text-foreground text-[13px]">Privacy Policy</p>
                          <div className="space-y-2">
                            <p><span className="font-semibold text-primary">Local Privacy:</span> Finch does not save this conversation to your history or disk.</p>
                            <p><span className="font-semibold text-primary">Model Training:</span> API providers (OpenAI, Anthropic, Gemini) generally do not use API data for training.</p>
                            <p><span className="font-semibold text-primary">Data Retention:</span> Cloud providers may keep logs for 15-30 days for safety reviews.</p>
                          </div>
                          <p className="pt-1.5 border-t border-white/5 italic opacity-70 text-[10px]">For 100% private offline use, use local models (Ollama/LM Studio).</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 space-y-10">
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-medium tracking-tight text-center">How can I help you today?</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mx-auto px-4 h-full min-h-[140px]">
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
              hasCustomBg={hasCustomBg}
              isPinkMode={isPinkMode}
            />
          ))}

          {/* Thinking State */}
          {isThinking && (
            <div className="flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-4">
                <SearchStatus events={researchEvents} isThinking={isThinking} />
                <ThinkingBox isActivelyThinking={true} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
});

const ShieldCheck = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);
