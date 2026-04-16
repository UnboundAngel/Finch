import React from 'react';
import { Minus, Square, X as CloseIcon } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { SketchMinus, SketchSquare, SketchX } from './ui/Icons';

const appWindow = getCurrentWindow();

interface WindowControlsProps {
  theme: 'sketch' | 'terminal';
}

export const WindowControls: React.FC<WindowControlsProps> = ({ theme }) => {
  const handleMaximize = async () => {
    if (await appWindow.isMaximized()) {
      await appWindow.unmaximize();
    } else {
      await appWindow.maximize();
    }
  };

  return (
    <div className="fixed top-3 right-4 z-[200] flex items-center gap-1 pointer-events-auto">
      <button 
        onClick={() => appWindow.minimize()} 
        className={`p-1.5 transition-all ${theme === 'sketch' ? 'text-black hover:scale-110' : 'text-gray-400 hover:text-white hover:bg-white/10 rounded'}`}
      >
        {theme === 'sketch' ? <SketchMinus /> : <Minus size={16} />}
      </button>
      <button 
        onClick={handleMaximize} 
        className={`p-1.5 transition-all ${theme === 'sketch' ? 'text-black hover:scale-110' : 'text-gray-400 hover:text-white hover:bg-white/10 rounded'}`}
      >
        {theme === 'sketch' ? <SketchSquare /> : <Square size={14} />}
      </button>
      <button 
        onClick={() => appWindow.close()} 
        className={`p-1.5 transition-all ${theme === 'sketch' ? 'text-red-600 hover:scale-110' : 'text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded'}`}
      >
        {theme === 'sketch' ? <SketchX /> : <CloseIcon size={16} />}
      </button>
    </div>
  );
};
