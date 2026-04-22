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
  showRightSidebarToggle: boolean;
  showMessageStats: boolean;

  setSystemPrompt: (prompt: string) => void;
  setTemperature: (temp: number) => void;
  setTopP: (topP: number) => void;
  setMaxTokens: (tokens: number) => void;
  setStopStrings: (stops: string[]) => void;
  addStopString: (stop: string) => void;
  removeStopString: (stop: string) => void;
  fetchContextIntelligence: (provider: string, modelId: string) => Promise<void>;
  resetContextIntelligence: () => void;
  setShowRightSidebarToggle: (show: boolean) => void;
  setShowMessageStats: (show: boolean) => void;
}

export const createModelParamsSlice: StateCreator<ModelParamsState, [], [], ModelParamsState> = (set) => ({
  systemPrompt: '',
  temperature: 0.8,
  topP: 0.9,
  maxTokens: 2048,
  stopStrings: ['</think>'],
  contextIntelligence: null,
  contextIntelligenceStatus: 'idle',
  showRightSidebarToggle: false,
  showMessageStats: false,

  setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),
  setTemperature: (temp) => set({ temperature: temp }),
  setTopP: (topP) => set({ topP: Math.max(0.01, Math.min(1.0, topP)) }),
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
      // #region agent log
      fetch('http://127.0.0.1:7723/ingest/61911eee-37e5-42f2-9689-53dd89e5e47b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4070ff'},body:JSON.stringify({sessionId:'4070ff',runId:'pre-fix',hypothesisId:'H2',location:'modelParamsSlice.ts:61',message:'Fetching context intelligence',data:{provider,modelId},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      const info = await invoke<ContextIntelligence>('get_context_intelligence', {
        provider,
        modelId,
      });
      set({ 
        contextIntelligence: info,
        contextIntelligenceStatus: 'ready' 
      });
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7723/ingest/61911eee-37e5-42f2-9689-53dd89e5e47b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4070ff'},body:JSON.stringify({sessionId:'4070ff',runId:'pre-fix',hypothesisId:'H2',location:'modelParamsSlice.ts:72',message:'Context intelligence fetch failed',data:{provider,modelId,error:error instanceof Error ? error.message : String(error)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      console.error('Failed to fetch context intelligence:', error);
      set({ contextIntelligenceStatus: 'error' });
    }
  },
  resetContextIntelligence: () => set({
    contextIntelligence: null,
    contextIntelligenceStatus: 'idle'
  }),
  setShowRightSidebarToggle: (show) => set({ showRightSidebarToggle: show }),
  setShowMessageStats: (show) => set({ showMessageStats: show }),
});
