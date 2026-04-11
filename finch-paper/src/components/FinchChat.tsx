import React, { useState, useEffect, useRef } from 'react';
import { WindowControls } from './WindowControls';
import { Sidebar } from './Sidebar';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ToolsDrawer } from './ToolsDrawer';
import { SettingsModal } from './SettingsModal';

const FinchChat: React.FC = () => {
  const [theme, setTheme] = useState<'sketch' | 'terminal'>('sketch');
  const [inputValue, setInputValue] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [selectedModel, setSelectedModel] = useState('GPT-4o Paper');
  
  const [messages, setMessages] = useState([
    { id: 1, role: 'user', content: "what's the weather like on mars" },
    { id: 2, role: 'ai', content: "Mars averages about -60°C, with dust storms that can cover the entire planet for months." },
    { id: 3, role: 'user', content: "could humans survive there without a suit" },
    { id: 4, role: 'ai', content: "No. Atmosphere is 95% CO2, pressure is less than 1% of Earth's. Exposure kills in under 2 minutes." },
    { id: 5, role: 'user', content: "what about underground" },
    { id: 6, role: 'ai', content: "Possibly. Underground protects from radiation and temperature swings. Active area of research." },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, theme]);

  const toggleTheme = () => setTheme(prev => prev === 'sketch' ? 'terminal' : 'sketch');

  const handleSubmit = () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputValue
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Mock AI response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'ai',
        content: `I'm a paper-based AI! I've received your note: "${inputValue}". (Backend integration pending)`
      }]);
    }, 600);
  };

  return (
    <div 
      data-theme={theme}
      className={`relative h-screen w-full flex flex-col transition-all duration-500 font-main antialiased overflow-hidden select-none ${
        theme === 'sketch' ? 'bg-[#f7f3ec] text-gray-800' : 'bg-[#0d1117] text-[#e6edf3]'
      }`}
      style={{ fontFamily: theme === 'sketch' ? '"Caveat", cursive' : '"Inter", sans-serif' }}
    >
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Inter:wght@400;600&family=JetBrains+Mono&display=swap');
          
          /* Improved Sketch Border: Applies filter ONLY to background/border, not text */
          .sketch-border {
            position: relative;
            border: none !important; /* Remove standard border */
          }
          
          .sketch-border::before {
            content: '';
            position: absolute;
            inset: 0;
            border: 2px solid rgba(0,0,0,0.8);
            filter: url(#rough-edge);
            pointer-events: none;
            z-index: -1;
            background: inherit;
            border-radius: inherit;
          }

          /* Ensure text stays sharp */
          .font-main {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
          }
          
          .sketch-shadow {
            box-shadow: 2px 3px 6px rgba(0,0,0,0.12);
          }

          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

          .notepad-lines {
            background-image: repeating-linear-gradient(transparent, transparent 27px, #d1d5db 27px, #d1d5db 28px);
            background-attachment: local;
          }

          .paper-texture {
            background-image: url("https://www.transparenttextures.com/patterns/paper.png");
          }
        `}
      </style>

      {/* SVG Filters */}
      <svg width="0" height="0" className="absolute invisible pointer-events-none">
        <filter id="rough-edge">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
        </filter>
      </svg>

      <WindowControls theme={theme} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          theme={theme} 
          toggleTheme={toggleTheme}
          setShowTools={setShowTools} 
          setShowSettings={setShowSettings} 
        />

        <main className="flex-1 flex flex-col relative overflow-hidden">
          <header data-tauri-drag-region className="h-16 flex items-center justify-between px-8 z-20 cursor-default">
             <div className="flex items-center gap-2">
                <span className={`px-3 py-1 transition-all ${theme === 'sketch' ? 'sketch-border bg-[#fef3c7] rotate-1' : 'bg-white/5 rounded-full text-xs font-mono'}`}>
                   {selectedModel}
                </span>
             </div>
          </header>

          <MessageList theme={theme} messages={messages} scrollRef={scrollRef} />
          
          <ChatInput 
            theme={theme} 
            value={inputValue} 
            onChange={setInputValue} 
            onSubmit={handleSubmit}
          />
        </main>
      </div>

      <ToolsDrawer 
        theme={theme} 
        isOpen={showTools} 
        onClose={() => setShowTools(false)} 
      />

      <SettingsModal 
        theme={theme} 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
      />
    </div>
  );
};

export default FinchChat;
