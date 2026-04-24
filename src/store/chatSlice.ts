import { StateCreator } from 'zustand';
import { getContextWindowSize } from '@/src/lib/contextWindows';

export interface ChatState {
  activeWorkspace: 'chat' | 'studio';
  selectedProvider: string;
  selectedModel: string;
  isIncognito: boolean;
  isRightSidebarOpen: boolean;
  tokensUsed: number;
  contextWindowSize: number | null;
  voiceStatus: 'idle' | 'recording' | 'transcribing';
  isModelLoaded: boolean;
  isModelLoading: boolean;
  modelLoadProgress: number;
  isDark: boolean;
  isLeftSidebarOpen: boolean;
  holdToRecord: boolean;
  selectedMicDevice: string;
  input: string;

  setActiveWorkspace: (workspace: 'chat' | 'studio', abortFn?: () => void) => void;
  setSelectedProvider: (provider: string) => void;
  setSelectedModel: (model: string) => void;
  setIsIncognito: (isIncognito: boolean) => void;
  setIsRightSidebarOpen: (isOpen: boolean | ((prev: boolean) => boolean)) => void;
  incrementTokensUsed: (amount: number) => void;
  setContextWindowSize: (size: number | null) => void;
  setVoiceStatus: (status: 'idle' | 'recording' | 'transcribing') => void;
  setIsModelLoaded: (isLoaded: boolean) => void;
  setIsModelLoading: (isLoading: boolean) => void;
  setModelLoadProgress: (progress: number) => void;
  setIsDark: (isDark: boolean | ((prev: boolean) => boolean)) => void;
  setIsLeftSidebarOpen: (isOpen: boolean | ((prev: boolean) => boolean)) => void;
  setHoldToRecord: (hold: boolean) => void;
  setSelectedMicDevice: (device: string) => void;
  setInput: (val: string | ((prev: string) => string)) => void;
  reset: () => void;
}

export const createChatSlice: StateCreator<ChatState, [], [], ChatState> = (set) => ({
  activeWorkspace: 'chat',
  selectedProvider: 'anthropic',
  selectedModel: 'claude-3-5-sonnet-20240620',
  isIncognito: false,
  isRightSidebarOpen: false,
  tokensUsed: 0,
  contextWindowSize: getContextWindowSize('claude-3-5-sonnet-20240620'),
  voiceStatus: 'idle',
  isModelLoaded: true,
  isModelLoading: false,
  modelLoadProgress: 0,
  isDark: false,
  isLeftSidebarOpen: true,
  holdToRecord: false,
  selectedMicDevice: '',
  input: '',

  setActiveWorkspace: (workspace, abortFn) => {
    if (abortFn) abortFn();
    set({ 
      activeWorkspace: workspace,
      ...(workspace === 'studio' ? { isIncognito: false, isDark: true } : {})
    });
  },
  setSelectedProvider: (provider) => set({ selectedProvider: provider }),
  setSelectedModel: (model) => set({ 
    selectedModel: model,
    contextWindowSize: getContextWindowSize(model)
  }),
  setIsIncognito: (isIncognito) => set({ isIncognito }),
  setIsRightSidebarOpen: (isOpen) => set((state) => ({ 
    isRightSidebarOpen: typeof isOpen === 'function' ? isOpen(state.isRightSidebarOpen) : isOpen 
  })),
  incrementTokensUsed: (amount) => set((state) => ({ tokensUsed: state.tokensUsed + amount })),
  setContextWindowSize: (size) => set({ contextWindowSize: size }),
  setVoiceStatus: (voiceStatus) => set({ voiceStatus }),
  setIsModelLoaded: (isModelLoaded) => set({ isModelLoaded }),
  setIsModelLoading: (isModelLoading) => set({ isModelLoading }),
  setModelLoadProgress: (modelLoadProgress) => set({
    modelLoadProgress: Math.max(0, Math.min(100, modelLoadProgress)),
  }),
  setIsDark: (isDark) => set((state) => ({ 
    isDark: typeof isDark === 'function' ? isDark(state.isDark) : isDark 
  })),
  setIsLeftSidebarOpen: (isOpen) => set((state) => ({ 
    isLeftSidebarOpen: typeof isOpen === 'function' ? isOpen(state.isLeftSidebarOpen) : isOpen 
  })),
  setHoldToRecord: (holdToRecord) => set({ holdToRecord }),
  setSelectedMicDevice: (selectedMicDevice) => set({ selectedMicDevice }),
  setInput: (input) => set((state) => ({
    input: typeof input === 'function' ? input(state.input) : input
  })),
  reset: () => set({
    tokensUsed: 0,
    isModelLoaded: true,
    isModelLoading: false,
    modelLoadProgress: 0,
    isIncognito: false,
    input: '',
  }),
});
