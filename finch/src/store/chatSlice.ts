import { StateCreator } from 'zustand';
import { getContextWindowSize } from '@/src/lib/contextWindows';

export interface ChatState {
  selectedProvider: string;
  selectedModel: string;
  isIncognito: boolean;
  isRightSidebarOpen: boolean;
  tokensUsed: number;
  contextWindowSize: number | null;

  setSelectedProvider: (provider: string) => void;
  setSelectedModel: (model: string) => void;
  setIsIncognito: (isIncognito: boolean) => void;
  setIsRightSidebarOpen: (isOpen: boolean | ((prev: boolean) => boolean)) => void;
  incrementTokensUsed: (amount: number) => void;
  setContextWindowSize: (size: number | null) => void;
}

export const createChatSlice: StateCreator<ChatState, [], [], ChatState> = (set) => ({
  selectedProvider: 'anthropic',
  selectedModel: 'claude-3-5-sonnet-20240620',
  isIncognito: false,
  isRightSidebarOpen: false,
  tokensUsed: 0,
  contextWindowSize: getContextWindowSize('claude-3-5-sonnet-20240620'),

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
});
