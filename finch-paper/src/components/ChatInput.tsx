import React, { useRef, useEffect } from 'react';
import { SendHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { SketchSend } from './ui/Icons';

interface ChatInputProps {
  theme: 'sketch' | 'terminal';
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ theme, value, onChange, onSubmit }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <footer className="p-8 pt-0">
      <motion.div layout className="max-w-3xl mx-auto relative group">
        {theme === 'sketch' ? (
          <div className="relative sketch-border sketch-shadow bg-white p-5 notepad-lines min-h-[80px] flex items-end transition-all focus-within:bg-yellow-50/30">
            <textarea 
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scribble something..."
              className="w-full bg-transparent border-none outline-none resize-none text-2xl leading-[27px] placeholder-black/20 custom-scrollbar-thin"
              rows={1}
            />
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={onSubmit}
              className="absolute bottom-5 right-5 p-2 text-emerald-600"
            >
              <SketchSend />
            </motion.button>
          </div>
        ) : (
          <div className="relative bg-[#161b22] border border-white/10 rounded-2xl overflow-hidden focus-within:border-blue-500/50 transition-all">
            <textarea 
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full bg-transparent border-none outline-none resize-none p-5 pr-16 text-sm custom-scrollbar-thin"
              rows={1}
            />
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSubmit}
              className={`absolute bottom-4 right-4 p-2 rounded-lg transition-all ${
                value.trim() ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/20'
              }`}
            >
              <SendHorizontal size={18} />
            </motion.button>
          </div>
        )}
      </motion.div>
    </footer>
  );
};
