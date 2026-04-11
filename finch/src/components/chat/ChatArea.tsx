import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Globe, Image as ImageIcon, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { BackgroundPlus } from '@/components/ui/background-plus';
import { Message } from '../../types/chat';
import { MessageBubble } from './MessageBubble';
import { ThinkingBox } from './ThinkingBox';

interface ChatAreaProps {
  messages: Message[];
  isThinking: boolean;
  selectedModel: string;
  isDark: boolean;
  setInput: (val: string) => void;
}

export const ChatArea = ({ messages, isThinking, selectedModel, isDark, setInput }: ChatAreaProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
      {/* Background Pattern */}
      <BackgroundPlus 
        plusColor="#888888" 
        className="opacity-[0.05] dark:opacity-[0.1]" 
        fade={true}
        plusSize={40}
      />
      
      <div className="flex-1 min-h-0 overflow-y-auto w-full relative z-10 scroll-smooth">
        <div className="max-w-3xl mx-auto w-full p-4 md:p-6 lg:p-8 flex flex-col gap-8 pb-12">
          
          {/* Empty State / Welcome */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center mt-20 mb-10 space-y-6">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 shadow-sm border border-primary/20">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">How can I help you today?</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl mt-8">
                <Button 
                  variant="outline" 
                  className="h-auto p-4 justify-start text-left flex flex-col items-start gap-2 rounded-xl border-muted-foreground/20 hover:bg-muted/50 hover:border-muted-foreground/30 transition-all shadow-sm"
                  onClick={() => { setInput('Summarize this article: '); toast('Added prompt to input'); }}
                >
                  <span className="font-medium flex items-center gap-2"><Globe className="h-4 w-4 text-blue-500" /> Summarize an article</span>
                  <span className="text-xs text-muted-foreground font-normal line-clamp-2">Paste a URL or text to get a quick summary of the main points.</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-4 justify-start text-left flex flex-col items-start gap-2 rounded-xl border-muted-foreground/20 hover:bg-muted/50 hover:border-muted-foreground/30 transition-all shadow-sm"
                  onClick={() => { setInput('Analyze this image: '); toast('Added prompt to input'); }}
                >
                  <span className="font-medium flex items-center gap-2"><ImageIcon className="h-4 w-4 text-purple-500" /> Analyze an image</span>
                  <span className="text-xs text-muted-foreground font-normal line-clamp-2">Upload an image and ask questions about its contents.</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-4 justify-start text-left flex flex-col items-start gap-2 rounded-xl border-muted-foreground/20 hover:bg-muted/50 hover:border-muted-foreground/30 transition-all shadow-sm"
                  onClick={() => { setInput('Draft an email about: '); toast('Added prompt to input'); }}
                >
                  <span className="font-medium flex items-center gap-2"><MessageSquare className="h-4 w-4 text-green-500" /> Draft an email</span>
                  <span className="text-xs text-muted-foreground font-normal line-clamp-2">Get help writing a professional or casual email.</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-4 justify-start text-left flex flex-col items-start gap-2 rounded-xl border-muted-foreground/20 hover:bg-muted/50 hover:border-muted-foreground/30 transition-all shadow-sm"
                  onClick={() => { setInput('Brainstorm ideas for: '); toast('Added prompt to input'); }}
                >
                  <span className="font-medium flex items-center gap-2"><Plus className="h-4 w-4 text-orange-500" /> Brainstorm ideas</span>
                  <span className="text-xs text-muted-foreground font-normal line-clamp-2">Generate creative ideas for your next project.</span>
                </Button>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, index) => (
            <MessageBubble 
              key={index} 
              msg={msg} 
              selectedModel={selectedModel} 
              isDark={isDark} 
              isLatest={index === messages.length - 1 && !isThinking} 
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
