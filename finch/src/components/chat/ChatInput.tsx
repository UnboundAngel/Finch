import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Globe, Send, Square } from 'lucide-react';
import { toast } from 'sonner';

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  handleSend: () => void;
  onStop?: () => void;
  isThinking: boolean;
  attachedFile: File | null;
  setAttachedFile: (file: File | null) => void;
  isWebSearchActive: boolean;
  setIsWebSearchActive: (val: boolean) => void;
  enterToSend: boolean;
  isIncognito?: boolean;
  isDark?: boolean;
}

export const ChatInput = ({
  input,
  setInput,
  handleSend,
  onStop,
  isThinking,
  attachedFile,
  setAttachedFile,
  isWebSearchActive,
  setIsWebSearchActive,
  enterToSend,
  isIncognito,
  isDark,
}: ChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '56px'; // Reset height to recalculate
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && enterToSend) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-shrink-0 w-full z-20 transition-all bg-transparent">
      <div className="max-w-3xl mx-auto relative px-4 pb-4 md:px-6 md:pb-6">
        <div className={`relative flex items-end w-full rounded-2xl transition-all overflow-hidden border-[1.5px] ${
          isWebSearchActive 
            ? 'border-blue-500/50' 
            : (isIncognito 
                ? (isDark 
                    ? 'bg-neutral-900 border-neutral-800 focus-within:border-neutral-700' 
                    : 'bg-white border-neutral-300 focus-within:border-neutral-400')
                : 'bg-background border-muted-foreground/20 shadow-sm focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/50')
        }`}>
          <div className="flex flex-col w-full">
            {attachedFile && (
              <div className="px-4 pt-3 pb-1">
                <div className="inline-flex items-center gap-2 bg-muted/50 border border-muted-foreground/20 rounded-lg px-3 py-1.5 text-sm">
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate max-w-[200px] font-medium">{attachedFile.name}</span>
                  <button 
                    onClick={() => setAttachedFile(null)}
                    className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    &times;
                  </button>
                </div>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              className="w-full max-h-[40vh] min-h-[56px] resize-none bg-transparent px-4 py-4 text-sm focus:outline-none placeholder:text-muted-foreground/70"
              rows={1}
            />
            <div className="flex items-center justify-between px-3 pb-3 pt-1">
              <div className="flex items-center gap-1">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`h-8 w-8 rounded-lg transition-colors ${attachedFile ? 'text-primary bg-primary/10 hover:bg-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`h-8 w-8 rounded-lg transition-colors ${isWebSearchActive ? 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                  onClick={() => {
                    setIsWebSearchActive(!isWebSearchActive);
                    toast(isWebSearchActive ? 'Web Search disabled' : 'Web Search enabled');
                  }}
                >
                  <Globe className="h-4 w-4" />
                </Button>
              </div>
              <Button 
                size="icon" 
                className={`h-8 w-8 rounded-lg transition-all ${
                  isThinking 
                    ? 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90' 
                    : (input.trim() ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed')
                }`}
                disabled={!isThinking && !input.trim()}
                onClick={isThinking ? onStop : handleSend}
              >
                {isThinking ? <Square className="h-4 w-4 fill-current" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
        <div className="text-center mt-1">
          <span className="text-[10px] text-muted-foreground/70">AI can make mistakes. Please verify important information.</span>
        </div>
      </div>
    </div>
  );
};
