import { StateCreator } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export interface ContextIntelligence {
  hardware_safe_limit: number;
  model_max: number;
  server_num_ctx: number;
}

export type ContextIntelligenceStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ModelParamsState {
  systemPrompt: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  stopStrings: string[];
  contextIntelligence: ContextIntelligence | null;
  contextIntelligenceStatus: ContextIntelligenceStatus;

  setSystemPrompt: (prompt: string) => void;
  setTemperature: (temp: number) => void;
  setTopP: (topP: number) => void;
  setMaxTokens: (tokens: number) => void;
  setStopStrings: (stops: string[]) => void;
  addStopString: (stop: string) => void;
  removeStopString: (stop: string) => void;
  fetchContextIntelligence: (provider: string, modelId: string) => Promise<void>;
  resetContextIntelligence: () => void;
}

export const createModelParamsSlice: StateCreator<ModelParamsState, [], [], ModelParamsState> = (set) => ({
  systemPrompt: '',
  temperature: 0.8,
  topP: 0.95,
  maxTokens: 2048,
  stopStrings: [],
  contextIntelligence: {
    hardware_safe_limit: 8192,
    model_max: 8192,
    server_num_ctx: 8192,
  },
  contextIntelligenceStatus: 'idle',

  setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),
  setTemperature: (temp) => set({ temperature: temp }),
  setTopP: (topP) => set({ topP }),
  setMaxTokens: (tokens) => set({ maxTokens: tokens }),
  setStopStrings: (stops) => set({ stopStrings: stops }),
  addStopString: (stop) => set((state) => ({
    stopStrings: state.stopStrings.includes(stop) 
      ? state.stopStrings 
      : [...state.stopStrings, stop]
  })),
  removeStopString: (stop) => set((state) => ({
    stopStrings: state.stopStrings.filter((s) => s !== stop)
  })),
  fetchContextIntelligence: async (provider, modelId) => {
    if (!provider || !modelId) return;
    
    set({ contextIntelligenceStatus: 'loading' });
    try {
      const info = await invoke<ContextIntelligence>('get_context_intelligence', {
        provider,
        modelId,
      });
      set({ 
        contextIntelligence: info,
        contextIntelligenceStatus: 'ready' 
      });
    } catch (error) {
      console.error('Failed to fetch context intelligence:', error);
      set({ contextIntelligenceStatus: 'error' });
    }
  },
  resetContextIntelligence: () => set({ 
    contextIntelligence: {
      hardware_safe_limit: 8192,
      model_max: 8192,
      server_num_ctx: 8192,
    },
    contextIntelligenceStatus: 'idle' 
  }),
});
