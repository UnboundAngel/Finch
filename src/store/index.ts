import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createModelParamsSlice, ModelParamsState } from './modelParamsSlice';
import { createChatSlice, ChatState } from './chatSlice';
import { createProfileSlice, ProfileState } from './profileSlice';
import { createStudioSlice, StudioState } from './studioSlice';

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
        const { tokensUsed, voiceStatus, activeWorkspace, ...rest } = state;
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

export const useStudioStore = create<StudioState>()(
  persist(
    (...a) => ({
      ...createStudioSlice(...a),
    }),
    {
      name: 'finch-studio-state',
      partialize: (state) => {
        const { studioStreamBuffer, ...rest } = state;
        return rest;
      },
    }
  )
);
