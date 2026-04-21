import { useRef, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Image as ImageIcon, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
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
  setInput: (val: string | ((prev: string) => string)) => void;
  isIncognito?: boolean;
  hasCustomBg?: boolean;
  isPinkMode?: boolean;
  researchEvents: any[];
  voiceStatus: 'idle' | 'recording' | 'transcribing';
  userAvatarSrc: string;
  userAvatarLetter: string;
  onRegenerate?: (messageId?: string) => void;
  onEditResend?: (messageId: string, newContent: string) => void;
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
  voiceStatus,
  userAvatarSrc,
  userAvatarLetter,
  onRegenerate,
  onEditResend,
}: ChatAreaProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  return (
    <div
      className={`flex-1 pt-20 pb-8 pl-6 pr-4 scrollbar-hide ${messages.length === 0 && !isThinking ? 'overflow-hidden' : 'overflow-y-auto'}`}
      style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 72px)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 72px)' }}
    >
      <div className="max-w-3xl mx-auto min-h-full flex flex-col">
        <div className="flex-1 space-y-6">
          {messages.length === 0 && (
            isIncognito ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="h-20 w-20 rounded-2xl flex items-center justify-center">
                  <div className="relative">
                    <Sparkles className="h-12 w-12 text-[#f97316] fill-[#f97316]/10" strokeWidth={1.5} />
                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-[#f97316] rounded-full ring-4 ring-background" />
                  </div>
                </div>
                <div className="space-y-4 max-w-2xl mx-auto">
                  <h2 className="text-5xl font-serif font-normal tracking-tight text-foreground">You're incognito</h2>
                  <div className="flex flex-col items-center justify-center text-muted-foreground/80 leading-relaxed">
                    <p className="text-lg">Incognito chats aren't saved or kept in memory</p>
                    <TooltipProvider delay={200}>
                      <Tooltip>
                        <TooltipTrigger>
                          <button className="text-primary hover:underline font-medium mt-1 inline-flex items-center gap-1">
                            Learn more.
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="bottom"
                          className="w-72 p-4 space-y-3 text-xs leading-relaxed bg-popover/95 backdrop-blur-md border-white/10 shadow-2xl z-[100]"
                        >
                          <p className="font-bold border-b border-white/10 pb-1.5 mb-2 text-foreground text-[13px]">Privacy Policy</p>
                          <div className="space-y-2">
                            <p><span className="font-semibold text-primary">Local Privacy:</span> Finch does not save this conversation to your history or hardware.</p>
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
              <div className="flex flex-col items-center justify-center py-16 space-y-10 scrollbar-hide">
                <div className="flex flex-col items-center space-y-6">
                  <div className="h-24 w-24 rounded-3xl bg-white shadow-xl shadow-black/5 border border-black/5 flex items-center justify-center p-0 overflow-hidden">
                    <img src="/assets/finch.png" className="w-full h-full object-contain scale-[1.6]" alt="Finch" />
                  </div>
                  <h2 className="text-3xl font-semibold tracking-tight text-center text-foreground">How can I help you today?</h2>
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
              key={msg.id ?? index}
              msg={msg}
              selectedModel={selectedModel}
              isDark={isDark}
              isLatest={index === messages.length - 1 && !isThinking}
              isIncognito={isIncognito}
              hasCustomBg={hasCustomBg}
              isPinkMode={isPinkMode}
              userAvatarSrc={userAvatarSrc}
              userAvatarLetter={userAvatarLetter}
              onRegenerate={
                msg.role === 'ai' && !msg.streaming && !isThinking ? onRegenerate : undefined
              }
              onEditResend={msg.role === 'user' && !isThinking ? onEditResend : undefined}
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
