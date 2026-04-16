import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Camera } from 'lucide-react';

export default function ProfileCreation({ onCancel, onSave }: { onCancel: () => void, onSave: (data: { name: string, prompt: string, model: string, passiveLearning: boolean, webSearch: boolean }) => void }) {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('model-1');
  const [passiveLearning, setPassiveLearning] = useState(true);
  const [webSearch, setWebSearch] = useState(true);

  const [activeStep, setActiveStep] = useState(1);
  const [highestStep, setHighestStep] = useState(1);

  const handleNext = (step: number) => {
    setHighestStep(Math.max(highestStep, step + 1));
    setActiveStep(step + 1);
  };

  const getCardVariants = (step: number) => ({
    active: {
      y: 0,
      scale: 1,
      rotateX: 0,
      opacity: 1,
      zIndex: 10,
      pointerEvents: 'auto' as any,
    },
    past: {
      y: -90 * (activeStep - step),
      scale: 1 - 0.06 * (activeStep - step),
      rotateX: 12,
      opacity: Math.max(0, 1 - 0.4 * (activeStep - step)),
      zIndex: 10 - (activeStep - step),
      pointerEvents: 'auto' as any,
    },
    future: {
      y: 120,
      scale: 0.9,
      rotateX: -12,
      opacity: 0,
      zIndex: 0,
      pointerEvents: 'none' as any,
    }
  });

  const getStepState = (step: number) => {
    if (step === activeStep) return 'active';
    if (step < activeStep) return 'past';
    return 'future';
  };

  const springTransition = { type: 'spring', stiffness: 260, damping: 25 };

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center overflow-hidden px-4 relative bg-background">
      {/* Header */}
      <div className="absolute top-8 left-0 right-0 px-8 flex justify-between items-center max-w-5xl mx-auto w-full z-50">
        <div>
          <h1 className="text-2xl font-medium text-primary">Create Profile</h1>
          <p className="text-sm text-primary/60">Step {activeStep} of 3</p>
        </div>
        <button onClick={onCancel} className="text-primary/60 hover:text-primary transition-colors text-sm font-medium">
          Cancel
        </button>
      </div>
      
      {/* Cards Container with Perspective */}
      <div className="relative w-full max-w-md h-[460px] flex items-center justify-center mt-8" style={{ perspective: '1200px' }}>
        
        {/* STEP 1: IDENTITY */}
        <motion.div 
          variants={getCardVariants(1)}
          initial="active"
          animate={getStepState(1)}
          transition={springTransition}
          onClick={() => activeStep !== 1 && setActiveStep(1)}
          className={`absolute w-full min-h-[420px] bg-surface border border-border rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center ${activeStep !== 1 ? 'cursor-pointer hover:border-primary/30' : ''}`}
          style={{ transformOrigin: 'bottom center' }}
        >
          <div className="relative group mb-10">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-background border-2 border-border transition-transform duration-300 group-hover:scale-105">
              <img 
                src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${name || 'New'}&backgroundColor=transparent`} 
                alt="Avatar preview"
                className="w-full h-full object-cover"
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
            onKeyDown={e => {
              if (e.key === 'Enter' && name.trim()) {
                e.preventDefault();
                handleNext(1);
              }
            }}
            placeholder="Profile Name" 
            className="w-full max-w-sm bg-transparent text-center text-3xl font-medium text-primary placeholder:text-primary/20 outline-none border-b-2 border-border focus:border-primary transition-colors pb-2" 
            autoFocus
            disabled={activeStep !== 1}
          />

          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: (name.trim() && activeStep === 1) ? 1 : 0, height: (name.trim() && activeStep === 1) ? 'auto' : 0 }}
            className="overflow-hidden mt-8"
          >
            <button 
              onClick={(e) => { e.stopPropagation(); handleNext(1); }}
              className="px-8 py-2.5 rounded-full bg-primary text-background font-medium hover:bg-primary/90 transition-colors"
            >
              Continue
            </button>
          </motion.div>
        </motion.div>

        {/* STEP 2: MINDSET */}
        <motion.div 
          variants={getCardVariants(2)}
          initial="future"
          animate={getStepState(2)}
          transition={springTransition}
          onClick={() => activeStep !== 2 && highestStep >= 2 && setActiveStep(2)}
          className={`absolute w-full min-h-[420px] bg-surface border border-border rounded-3xl p-8 shadow-2xl flex flex-col justify-center ${activeStep !== 2 ? (highestStep >= 2 ? 'cursor-pointer hover:border-primary/30' : '') : ''}`}
          style={{ transformOrigin: 'bottom center' }}
        >
          <div className="space-y-6 w-full">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-medium text-primary">The Mindset</h2>
              <p className="text-sm text-primary/60 mt-1">How should this profile behave?</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary/80 mb-2">Model</label>
              <select 
                value={model} 
                onChange={e => setModel(e.target.value)} 
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-primary outline-none appearance-none focus:border-primary/50 transition-colors"
                disabled={activeStep !== 2}
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
                rows={4} 
                placeholder="e.g. You are a helpful coding assistant..." 
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-primary outline-none resize-none focus:border-primary/50 transition-colors"
                disabled={activeStep !== 2}
              ></textarea>
            </div>

            {activeStep === 2 && (
              <div className="flex justify-center pt-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleNext(2); }}
                  className="px-8 py-2.5 rounded-full bg-primary text-background font-medium hover:bg-primary/90 transition-colors"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* STEP 3: SETTINGS */}
        <motion.div 
          variants={getCardVariants(3)}
          initial="future"
          animate={getStepState(3)}
          transition={springTransition}
          onClick={() => activeStep !== 3 && highestStep >= 3 && setActiveStep(3)}
          className={`absolute w-full min-h-[420px] bg-surface border border-border rounded-3xl p-8 shadow-2xl flex flex-col justify-center ${activeStep !== 3 ? (highestStep >= 3 ? 'cursor-pointer hover:border-primary/30' : '') : ''}`}
          style={{ transformOrigin: 'bottom center' }}
        >
          <div className="space-y-6 w-full">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-medium text-primary">Capabilities</h2>
              <p className="text-sm text-primary/60 mt-1">What tools can this profile use?</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                <div>
                  <div className="text-sm font-medium text-primary">Passive Learning</div>
                  <div className="text-xs text-primary/60 mt-1">Allow the AI to learn and remember details.</div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setPassiveLearning(!passiveLearning); }} 
                  disabled={activeStep !== 3}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${passiveLearning ? 'bg-primary' : 'bg-muted'}`}
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
                  onClick={(e) => { e.stopPropagation(); setWebSearch(!webSearch); }} 
                  disabled={activeStep !== 3}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${webSearch ? 'bg-primary' : 'bg-muted'}`}
                >
                  <div className={`w-4 h-4 rounded-full transform transition-transform ${webSearch ? 'translate-x-6 bg-background' : 'translate-x-0 bg-primary'}`} />
                </button>
              </div>
            </div>

            {activeStep === 3 && (
              <div className="flex justify-center pt-6">
                <button 
                  onClick={(e) => { e.stopPropagation(); name.trim() && onSave({ name: name.trim(), prompt, model, passiveLearning, webSearch }); }}
                  disabled={!name.trim()}
                  className="px-10 py-3 rounded-full bg-primary text-background font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-lg shadow-primary/10"
                >
                  Complete Profile
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
