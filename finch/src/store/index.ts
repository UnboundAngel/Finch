import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createModelParamsSlice, ModelParamsState } from './modelParamsSlice';
import { createChatSlice, ChatState } from './chatSlice';
import { createBrowserSlice, BrowserState } from './browserSlice';

export const useModelParams = create<ModelParamsState>()(
  persist(
    (...a) => ({
      ...createModelParamsSlice(...a),
    }),
    {
      name: 'finch-model-params',
    }
  )
);

export const useChatStore = create<ChatState & BrowserState>()(
  persist(
    (...a) => ({
      ...createChatSlice(...a),
      ...createBrowserSlice(...a),
    }),
    {
      name: 'finch-chat-state',
    }
  )
);
