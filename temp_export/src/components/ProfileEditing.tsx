import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Trash2 } from 'lucide-react';

export default function ProfileEditing({ 
  profile, 
  onCancel, 
  onSave, 
  onDelete 
}: { 
  profile: any, 
  onCancel: () => void, 
  onSave: (p: any) => void,
  onDelete: (id: string) => void
}) {
  const [name, setName] = useState(profile.name || '');
  const [prompt, setPrompt] = useState(profile.prompt || '');
  const [model, setModel] = useState(profile.model || 'model-1');
  const [passiveLearning, setPassiveLearning] = useState(profile.passiveLearning ?? true);
  const [webSearch, setWebSearch] = useState(profile.webSearch ?? true);

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center px-4 relative bg-background overflow-y-auto py-20">
      <div className="absolute top-8 left-0 right-0 px-8 flex justify-between items-center max-w-7xl mx-auto w-full z-50">
        <h1 className="text-2xl font-medium text-primary">Edit Profile</h1>
        <button onClick={onCancel} className="text-primary/60 hover:text-primary transition-colors text-sm font-medium">
          Cancel
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-stretch justify-center w-full max-w-6xl mt-8">
        
        {/* LEFT CARD: MINDSET */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 bg-surface border border-border rounded-3xl p-8 shadow-2xl flex flex-col"
        >
          <div className="text-center mb-8">
            <h2 className="text-xl font-medium text-primary">The Mindset</h2>
            <p className="text-sm text-primary/60 mt-1">How should this profile behave?</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-primary/80 mb-2">Model</label>
              <select 
                value={model} 
                onChange={e => setModel(e.target.value)} 
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-primary outline-none appearance-none focus:border-primary/50 transition-colors"
              >
                <option value="model-1">Primary Model</option>
                <option value="model-2">Secondary Model</option>
                <option value="model-3">Fast Model</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary/80 mb-2">
                System Prompt <span className="text-primary/50 font-normal">(Optional)</span>
              </label>
              <textarea 
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={6} 
                placeholder="e.g. You are a helpful coding assistant..." 
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-primary outline-none resize-none focus:border-primary/50 transition-colors"
              ></textarea>
            </div>
          </div>
        </motion.div>

        {/* CENTER CARD: IDENTITY */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 bg-surface border border-border rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-between min-h-[420px]"
        >
          <div className="flex flex-col items-center w-full">
            <div className="relative group mb-10 mt-4">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-background border-2 border-border transition-transform duration-300 group-hover:scale-105">
                <img 
                  src={profile.avatarUrl} 
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute inset-0 bg-background/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                <Camera className="w-8 h-8 text-primary" />
              </div>
            </div>

            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Profile Name" 
              className="w-full max-w-sm bg-transparent text-center text-3xl font-medium text-primary placeholder:text-primary/20 outline-none border-b-2 border-border focus:border-primary transition-colors pb-2 mb-10" 
            />
          </div>

          <div className="flex gap-4 w-full mt-auto">
            <button 
              onClick={() => onDelete(profile.id)}
              className="flex-1 py-3 rounded-full border border-red-500/50 text-red-500 font-medium hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
            <button 
              onClick={() => name.trim() && onSave({ ...profile, name: name.trim(), prompt, model, passiveLearning, webSearch })}
              disabled={!name.trim()}
              className="flex-1 py-3 rounded-full bg-primary text-background font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Save
            </button>
          </div>
        </motion.div>

        {/* RIGHT CARD: CAPABILITIES */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 bg-surface border border-border rounded-3xl p-8 shadow-2xl flex flex-col"
        >
          <div className="text-center mb-8">
            <h2 className="text-xl font-medium text-primary">Capabilities</h2>
            <p className="text-sm text-primary/60 mt-1">What tools can this profile use?</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
              <div>
                <div className="text-sm font-medium text-primary">Passive Learning</div>
                <div className="text-xs text-primary/60 mt-1">Allow the AI to learn and remember details.</div>
              </div>
              <button 
                onClick={() => setPassiveLearning(!passiveLearning)} 
                className={`w-12 h-6 rounded-full p-1 transition-colors flex-shrink-0 ml-4 ${passiveLearning ? 'bg-primary' : 'bg-muted'}`}
              >
                <div className={`w-4 h-4 rounded-full transform transition-transform ${passiveLearning ? 'translate-x-6 bg-background' : 'translate-x-0 bg-primary'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
              <div>
                <div className="text-sm font-medium text-primary">Web Search</div>
                <div className="text-xs text-primary/60 mt-1">Enable web search capabilities by default.</div>
              </div>
              <button 
                onClick={() => setWebSearch(!webSearch)} 
                className={`w-12 h-6 rounded-full p-1 transition-colors flex-shrink-0 ml-4 ${webSearch ? 'bg-primary' : 'bg-muted'}`}
              >
                <div className={`w-4 h-4 rounded-full transform transition-transform ${webSearch ? 'translate-x-6 bg-background' : 'translate-x-0 bg-primary'}`} />
              </button>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
