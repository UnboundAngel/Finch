import React from 'react';
import { Sparkles, Wrench, Settings as SettingsIcon, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

interface SidebarProps {
  theme: 'sketch' | 'terminal';
  toggleTheme: () => void;
  setShowTools: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ theme, toggleTheme, setShowTools, setShowSettings }) => {
  return (
    <aside className={`transition-all duration-500 flex flex-col relative z-10 ${
      theme === 'sketch' ? 'w-64 bg-[#f0ede6] border-r-2 border-black/10 paper-texture' : 'w-72 bg-[#161b22] border-r border-white/5'
    }`}>
      <div data-tauri-drag-region className="h-16 flex items-center px-6 shrink-0 cursor-default">
         <h2 className={`text-2xl font-bold ${theme === 'sketch' ? 'rotate-[-2deg]' : ''}`}>Finch</h2>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 space-y-4">
         <motion.button 
           whileHover={{ scale: 1.02 }}
           whileTap={{ scale: 0.98 }}
           className={`w-full p-3 transition-all flex items-center gap-3 ${
             theme === 'sketch' ? 'sketch-border bg-white sketch-shadow hover:bg-yellow-50 font-bold' : 'bg-blue-600 hover:bg-blue-500 rounded-xl text-white'
           }`}
         >
            <Sparkles size={18} /> <span>New Sketch</span>
         </motion.button>

         <div className="space-y-2 pt-4 text-left">
            <p className={`text-xs uppercase tracking-widest opacity-50 px-2 font-bold`}>Previous Ideas</p>
            {['Mars Colonization', 'FastAPI Notes', 'UI Sketches', 'Doodle List'].map((chat, i) => (
              <motion.div 
                key={i} 
                whileHover={{ x: 4 }}
                className={`group p-3 transition-all cursor-pointer relative ${
                  theme === 'sketch' 
                    ? 'bg-white/40 border-b border-black/5 hover:bg-white hover:rotate-1' 
                    : 'hover:bg-white/5 rounded-lg'
                }`}
              >
                <div className="flex items-center gap-3">
                   {theme === 'sketch' && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                   <span className="truncate">{chat}</span>
                </div>
              </motion.div>
            ))}
         </div>
      </div>

      <div className="p-4 space-y-2">
         {/* Theme Toggle in Sidebar to prevent overlap with Window Controls */}
         <motion.button 
           whileHover={{ scale: 1.05 }}
           whileTap={{ scale: 0.95 }}
           onClick={toggleTheme} 
           className={`w-full p-2 flex items-center gap-3 ${theme === 'sketch' ? 'hover:bg-black/5 rounded' : 'hover:bg-white/5 rounded'}`}
         >
            {theme === 'sketch' ? <Moon size={18} /> : <Sun size={18} />}
            <span>{theme === 'sketch' ? 'Night Mode' : 'Sketch Mode'}</span>
         </motion.button>

         <motion.button 
           whileHover={{ scale: 1.05 }}
           whileTap={{ scale: 0.95 }}
           onClick={() => setShowTools(true)} 
           className={`w-full p-2 flex items-center gap-3 ${theme === 'sketch' ? 'hover:bg-black/5 rounded' : 'hover:bg-white/5 rounded'}`}
         >
            <Wrench size={18} /> <span>Tools</span>
         </motion.button>

         <motion.button 
           whileHover={{ scale: 1.05 }}
           whileTap={{ scale: 0.95 }}
           onClick={() => setShowSettings(true)} 
           className={`w-full p-2 flex items-center gap-3 ${theme === 'sketch' ? 'hover:bg-black/5 rounded' : 'hover:bg-white/5 rounded'}`}
         >
            <SettingsIcon size={18} /> <span>Settings</span>
         </motion.button>
      </div>
    </aside>
  );
};
