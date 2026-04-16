import { StateCreator } from 'zustand';

export interface BrowserState {
  isBrowserOpen: boolean;
  browserUrl: string;
  isBrowserLoading: boolean;
  isInitializing: boolean;
  webviewLabel: string | null;

  openBrowser: (url: string) => void;
  closeBrowser: () => void;
  setBrowserLoading: (isLoading: boolean) => void;
  setInitializing: (isInitializing: boolean) => void;
  setWebviewLabel: (label: string | null) => void;
}

export const createBrowserSlice: StateCreator<BrowserState, [], [], BrowserState> = (set) => ({
  isBrowserOpen: false,
  browserUrl: '',
  isBrowserLoading: false,
  isInitializing: false,
  webviewLabel: null,

  openBrowser: (url: string) => set({ 
    isBrowserOpen: true, 
    browserUrl: url,
    isBrowserLoading: true 
  }),
  
  closeBrowser: () => set({ 
    isBrowserOpen: false, 
    browserUrl: '',
    isBrowserLoading: false,
    isInitializing: false,
    webviewLabel: null
  }),

  setBrowserLoading: (isLoading) => set({ isBrowserLoading: isLoading }),
  setInitializing: (isInitializing) => set({ isInitializing }),
  setWebviewLabel: (label) => set({ webviewLabel: label }),
});
