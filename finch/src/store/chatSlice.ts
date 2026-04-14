import { StateCreator } from 'zustand';

export interface ChatState {
  selectedProvider: string;
  selectedModel: string;
  isIncognito: boolean;
  isRightSidebarOpen: boolean;

  setSelectedProvider: (provider: string) => void;
  setSelectedModel: (model: string) => void;
  setIsIncognito: (isIncognito: boolean) => void;
  setIsRightSidebarOpen: (isOpen: boolean | ((prev: boolean) => boolean)) => void;
}

export const createChatSlice: StateCreator<ChatState, [], [], ChatState> = (set) => ({
  selectedProvider: 'anthropic',
  selectedModel: 'claude-3-5-sonnet-20240620',
  isIncognito: false,
  isRightSidebarOpen: false,

  setSelectedProvider: (provider) => set({ selectedProvider: provider }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setIsIncognito: (isIncognito) => set({ isIncognito }),
  setIsRightSidebarOpen: (isOpen) => set((state) => ({ 
    isRightSidebarOpen: typeof isOpen === 'function' ? isOpen(state.isRightSidebarOpen) : isOpen 
  })),
});
