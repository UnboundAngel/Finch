import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createModelParamsSlice, ModelParamsState } from './modelParamsSlice';
import { createChatSlice, ChatState } from './chatSlice';

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

export const useChatStore = create<ChatState>()(
  persist(
    (...a) => ({
      ...createChatSlice(...a),
    }),
    {
      name: 'finch-chat-state',
    }
  )
);
