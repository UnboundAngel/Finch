import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createModelParamsSlice, ModelParamsState } from './modelParamsSlice';
import { createChatSlice, ChatState } from './chatSlice';
import { createProfileSlice, ProfileState } from './profileSlice';

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
      partialize: (state) => {
        const { tokensUsed, voiceStatus, ...rest } = state;
        return rest;
      },
    }
  )
);

export const useProfileStore = create<ProfileState>()(
  persist(
    (...a) => ({
      ...createProfileSlice(...a),
    }),
    {
      name: 'finch-profile-state',
    }
  )
);
