import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X as CloseIcon } from 'lucide-react';

interface ToolsDrawerProps {
  theme: 'sketch' | 'terminal';
  isOpen: boolean;
  onClose: () => void;
}

export const ToolsDrawer: React.FC<ToolsDrawerProps> = ({ theme, isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          className={`fixed right-0 top-0 h-full w-80 z-[150] p-6 shadow-2xl transition-all duration-500 ${
            theme === 'sketch' ? 'bg-[#f7f3ec] border-l-4 border-black/20 paper-texture' : 'bg-[#161b22] border-l border-white/10'
          }`}
        >
          <div className="flex items-center justify-between mb-8">
            {/* Moved Close Button to the left to avoid conflict with Window Controls */}
            <motion.button 
              whileHover={{ scale: 1.1, rotate: -90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose} 
              className={`p-1.5 transition-all ${theme === 'sketch' ? 'sketch-border bg-white' : 'hover:bg-white/10 rounded-full'}`}
            >
              <CloseIcon size={18} />
            </motion.button>
            <h3 className={`text-2xl font-bold ${theme === 'sketch' ? 'rotate-1' : ''}`}>AI Tools</h3>
            <div className="w-8" /> {/* Spacer to keep title centeredish */}
          </div>
          
          <div className="space-y-4">
            {[
              { n: 'Summarizer', d: 'Tear down long text' },
              { n: 'Code Scribe', d: 'Sketch out logic' },
              { n: 'Idea Generator', d: 'Brainstorm sketches' }
            ].map((tool, i) => (
              <motion.div 
                key={i} 
                whileHover={{ scale: 1.02, x: -4 }}
                className={`p-4 cursor-pointer text-left transition-all ${
                  theme === 'sketch' ? 'sketch-border bg-white sketch-shadow' : 'bg-white/5 rounded-xl border border-white/10'
                }`}
              >
                <p className="font-bold text-lg">{tool.n}</p>
                <p className="text-sm opacity-60">{tool.d}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
