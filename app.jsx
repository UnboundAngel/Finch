import React, { useState } from 'react';
import { 
  Plus, MessageSquare, Settings, LayoutGrid, User, 
  Bot, SendHorizontal, Paperclip, ChevronDown, 
  Trash2, ShieldKey, Sparkles, Sliders, X, Globe,
  Cpu, Zap
} from 'lucide-react';

const AuraDashboard = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [selectedModel, setSelectedModel] = useState('GPT-4o');

  return (
    <div className="flex h-screen w-full bg-[#0D0D0D] text-gray-200 overflow-hidden font-sans select-none">
      
      {/* TAURI DRAG REGION (Allows dragging the window) */}
      <div className="fixed top-0 left-0 w-full h-8 z-50 pointer-events-none" style={{ WebkitAppRegion: 'drag' }} />

      {/* SIDEBAR */}
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 bg-[#121212] border-r border-white/5 flex flex-col relative`}>
        <div className="p-4 mt-4">
          <button className="flex items-center justify-between w-full p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
            <div className="flex items-center gap-3">
              <Plus size={18} className="text-emerald-400" />
              <span className="text-sm font-medium">New Chat</span>
            </div>
            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400 group-hover:text-white">⌘N</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
          <p className="text-[11px] font-bold text-gray-500 px-3 mt-6 mb-2 uppercase tracking-wider">History</p>
          {['Market Analysis Strategy', 'Python FastAPI Backend', 'Vector Database Design', 'Product Launch Copy'].map((chat, i) => (
            <div key={i} className="group flex items-center justify-between p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
              <div className="flex items-center gap-3 truncate">
                <MessageSquare size={16} className="text-gray-500 group-hover:text-emerald-400" />
                <span className="text-sm truncate">{chat}</span>
              </div>
              <Trash2 size={14} className="text-gray-600 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity" />
            </div>
          ))}
        </div>

        <div className="p-4 bg-[#121212] border-t border-white/5">
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5 transition-colors group"
          >
            <Settings size={18} className="text-gray-400 group-hover:rotate-45 transition-transform duration-500" />
            <span className="text-sm">Settings</span>
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col relative bg-[#0D0D0D]">
        
        {/* HEADER */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#0D0D0D]/50 backdrop-blur-xl z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg text-gray-400 transition-colors"
            >
              <LayoutGrid size={20} />
            </button>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full cursor-pointer hover:bg-white/10 transition-all">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              <span className="text-xs font-semibold tracking-wide">{selectedModel}</span>
              <ChevronDown size={14} className="text-gray-500" />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="h-8 w-[1px] bg-white/10 mx-2"></div>
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-blue-500 p-[1px]">
                <div className="w-full h-full rounded-full bg-[#0D0D0D] flex items-center justify-center text-[10px] font-bold">JD</div>
             </div>
          </div>
        </header>

        {/* CHAT CONTENT */}
        <div className="flex-1 overflow-y-auto px-6 custom-scrollbar">
          <div className="max-w-3xl mx-auto py-12 space-y-10">
            
            {/* Assistant Message */}
            <div className="flex gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-2xl shadow-emerald-500/10">
                <Bot size={20} className="text-emerald-500" />
              </div>
              <div className="space-y-4 pt-1.5">
                <h3 className="text-lg font-medium text-white">How can Aura help you today?</h3>
                <p className="text-gray-400 leading-relaxed">
                  I can help you write code, analyze data, or just brainstorm ideas. 
                  My current environment is optimized for high-performance desktop workflows.
                </p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {[
                    { t: 'Optimize React Code', s: 'Performance check', i: <Zap size={14}/> },
                    { t: 'Security Audit', s: 'Check vulnerabilities', i: <ShieldKey size={14}/> }
                  ].map((item, i) => (
                    <button key={i} className="text-left p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group">
                      <div className="flex items-center gap-2 mb-1 text-emerald-400">
                        {item.i}
                        <span className="text-xs font-semibold uppercase tracking-tighter">Action</span>
                      </div>
                      <div className="text-sm font-medium text-gray-200">{item.t}</div>
                      <div className="text-xs text-gray-500 mt-1">{item.s}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* INPUT BAR */}
        <div className="p-6 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D] to-transparent">
          <div className="max-w-3xl mx-auto relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-[24px] blur opacity-0 group-focus-within:opacity-100 transition duration-1000"></div>
            <div className="relative bg-[#171717] border border-white/10 rounded-[22px] shadow-2xl transition-all group-focus-within:border-white/20">
              <textarea 
                rows="1"
                placeholder="Ask Aura anything..."
                className="w-full bg-transparent text-white py-4 pl-6 pr-24 focus:outline-none resize-none leading-relaxed"
              />
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                <button className="p-2 text-gray-500 hover:text-white transition-colors">
                  <Paperclip size={20} />
                </button>
                <button className="p-2 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20">
                  <SendHorizontal size={20} />
                </button>
              </div>
            </div>
          </div>
          <p className="text-center text-[10px] text-gray-600 mt-4 tracking-widest uppercase">Aura AI Desktop • v1.0.4</p>
        </div>
      </main>

      {/* SETTINGS MODAL (Tauri Optimized) */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 backdrop-blur-md bg-black/60 animate-in fade-in duration-300">
          <div className="w-full max-w-4xl h-[600px] bg-[#121212] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex">
            
            {/* Modal Sidebar */}
            <div className="w-64 border-r border-white/5 bg-[#0a0a0a]/50 p-6 flex flex-col">
              <h2 className="text-xl font-bold mb-8 flex items-center gap-2 text-white">
                <Sliders size={20} className="text-emerald-500" /> Settings
              </h2>
              <nav className="space-y-2 flex-1">
                {[
                  {id: 'general', label: 'General', icon: <Globe size={18}/>},
                  {id: 'models', label: 'Models', icon: <Cpu size={18}/>},
                  {id: 'api', label: 'API Keys', icon: <ShieldKey size={18}/>},
                  {id: 'aura', label: 'Aura Pro', icon: <Sparkles size={18}/>},
                ].map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-400 hover:bg-white/5'}`}
                  >
                    {item.icon}
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                ))}
              </nav>
              <button 
                onClick={() => setShowSettings(false)}
                className="mt-auto flex items-center gap-2 text-gray-500 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-white/5"
              >
                <X size={18} /> Close
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
              {activeTab === 'api' && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">API Configuration</h3>
                    <p className="text-sm text-gray-500">Enter your credentials to connect Aura to external LLM providers.</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-tighter">OpenAI API Key</label>
                      <input 
                        type="password" 
                        placeholder="sk-••••••••••••••••••••••••"
                        className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-3 focus:border-emerald-500/50 outline-none transition-all text-sm font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Anthropic API Key</label>
                      <input 
                        type="password" 
                        placeholder="ant-••••••••••••••••••••••••"
                        className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-3 focus:border-emerald-500/50 outline-none transition-all text-sm font-mono"
                      />
                    </div>
                    <button className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-emerald-400 transition-colors">
                      Save Changes
                    </button>
                  </div>
                </div>
              )}
              {activeTab !== 'api' && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                  <div className="p-4 bg-white/5 rounded-full"><LayoutGrid size={32} /></div>
                  <p className="text-sm font-medium">This panel is under development</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
};

export default AuraDashboard;