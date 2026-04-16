import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X as CloseIcon, ShieldCheck, Cpu, Sparkles } from 'lucide-react';

interface SettingsModalProps {
  theme: 'sketch' | 'terminal';
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  theme, isOpen, onClose, selectedModel, setSelectedModel 
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-8 backdrop-blur-md bg-black/40">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`w-full max-w-2xl h-[600px] relative transition-all duration-500 overflow-hidden ${
              theme === 'sketch' ? 'sketch-border bg-white sketch-shadow paper-texture flex flex-col rotate-[-0.5deg]' : 'bg-[#0d1117] border border-white/10 rounded-3xl p-10 text-[#e6edf3]'
            }`}
          >
            <div className="p-8 flex-1 overflow-y-auto paper-scrollbar">
              <div className="flex items-center justify-between mb-8">
                <h2 className={`text-3xl font-bold ${theme === 'sketch' ? 'underline decoration-wavy decoration-emerald-400' : ''}`}>Configuration</h2>
                <button onClick={onClose} className="hover:rotate-90 transition-transform">
                  <CloseIcon />
                </button>
              </div>

              <div className="space-y-8 text-left">
                {/* Model Selection */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 opacity-60">
                    <Cpu size={18} />
                    <span className="text-sm font-bold uppercase tracking-wider">Active Model</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {['GPT-4o', 'Claude 3.5 Sonnet', 'GPT-4 Turbo', 'Finch Paper-1'].map((m) => (
                      <button
                        key={m}
                        onClick={() => setSelectedModel(m)}
                        className={`p-3 text-left transition-all ${
                          selectedModel === m
                            ? theme === 'sketch' ? 'bg-emerald-100 border-2 border-emerald-500 rotate-1' : 'bg-blue-600 text-white'
                            : theme === 'sketch' ? 'bg-black/5 border border-transparent hover:bg-white' : 'bg-white/5 hover:bg-white/10'
                        } ${theme === 'sketch' ? 'font-bold' : 'rounded-xl text-sm'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </section>

                {/* API Keys */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 opacity-60">
                    <ShieldCheck size={18} />
                    <span className="text-sm font-bold uppercase tracking-wider">API Credentials</span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold opacity-50">OpenAI Key</label>
                      <input 
                        type="password" 
                        placeholder="sk-..." 
                        className={`w-full p-3 outline-none transition-all ${
                          theme === 'sketch' ? 'sketch-border bg-white' : 'bg-[#161b22] border border-white/10 rounded-xl focus:border-blue-500/50'
                        }`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold opacity-50">Anthropic Key</label>
                      <input 
                        type="password" 
                        placeholder="ant-..." 
                        className={`w-full p-3 outline-none transition-all ${
                          theme === 'sketch' ? 'sketch-border bg-white' : 'bg-[#161b22] border border-white/10 rounded-xl focus:border-blue-500/50'
                        }`}
                      />
                    </div>
                  </div>
                </section>

                {/* Appearance Toggle */}
                <section className="space-y-4">
                   <div className="flex items-center justify-between border-t pt-6 opacity-80">
                      <span>Physical Texture</span>
                      <div className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${theme === 'sketch' ? 'bg-emerald-400' : 'bg-gray-700'}`}>
                         <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${theme === 'sketch' ? 'translate-x-6' : 'translate-x-0'}`} />
                      </div>
                   </div>
                </section>
              </div>
            </div>
            {theme === 'sketch' && (
              <div className="h-6 bg-red-400/10 w-full mt-auto border-t border-black/10 flex items-center px-8 text-[10px] font-bold uppercase tracking-widest italic opacity-50">
                Finch System Configuration • April 2026 Build
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
