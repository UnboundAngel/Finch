import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GlobalParams {
  system_prompt: string;
  temperature: number;
  top_p: number;
  max_tokens: number;
  stop_strings: string[];
}

interface ParamsState extends GlobalParams {
  setSystemPrompt: (prompt: string) => void;
  setTemperature: (temp: number) => void;
  setTopP: (topP: number) => void;
  setMaxTokens: (tokens: number) => void;
  setStopStrings: (stops: string[]) => void;
  addStopString: (stop: string) => void;
  removeStopString: (stop: string) => void;
}

export const useParamsStore = create<ParamsState>()(
  persist(
    (set) => ({
      system_prompt: '',
      temperature: 0.8,
      top_p: 0.95,
      max_tokens: 2048,
      stop_strings: [],

      setSystemPrompt: (prompt) => set({ system_prompt: prompt }),
      setTemperature: (temp) => set({ temperature: temp }),
      setTopP: (topP) => set({ top_p: topP }),
      setMaxTokens: (tokens) => set({ max_tokens: tokens }),
      setStopStrings: (stops) => set({ stop_strings: stops }),
      addStopString: (stop) => set((state) => ({
        stop_strings: state.stop_strings.includes(stop) 
          ? state.stop_strings 
          : [...state.stop_strings, stop]
      })),
      removeStopString: (stop) => set((state) => ({
        stop_strings: state.stop_strings.filter((s) => s !== stop)
      })),
    }),
    {
      name: 'finch-global-params',
    }
  )
);
