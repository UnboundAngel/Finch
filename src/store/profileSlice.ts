import { StateCreator } from 'zustand';
import { Profile } from '../types/chat';
import { invoke } from '@tauri-apps/api/core';

export interface ProfileState {
  activeProfile: Profile | null;
  profiles: Profile[];
  isLoading: boolean;
  error: string | null;

  loadProfiles: () => Promise<void>;
  setActiveProfile: (profile: Profile | null) => void;
  saveProfile: (profile: Profile) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
}

export const createProfileSlice: StateCreator<ProfileState, [], [], ProfileState> = (set, get) => ({
  activeProfile: null,
  profiles: [],
  isLoading: false,
  error: null,

  loadProfiles: async () => {
    set({ isLoading: true });
    try {
      const profiles = await invoke<Profile[]>('get_profiles');
      set({ profiles, isLoading: false });
    } catch (err) {
      console.error('Failed to load profiles:', err);
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  setActiveProfile: (profile) => {
    set({ activeProfile: profile });
  },

  saveProfile: async (profile) => {
    try {
      await invoke('save_profile', { profile });
      const profiles = await invoke<Profile[]>('get_profiles');
      const { activeProfile } = get();
      const merged = profiles.find((p) => p.id === profile.id) ?? profile;
      const nextActive =
        activeProfile?.id === profile.id ? merged : activeProfile;
      set({ profiles, activeProfile: nextActive });
    } catch (err) {
      console.error('Failed to save profile:', err);
      throw err;
    }
  },

  deleteProfile: async (profileId) => {
    try {
      await invoke('delete_profile', { profileId });
      const { activeProfile } = get();
      if (activeProfile?.id === profileId) {
        set({ activeProfile: null });
      }
      // Reload profiles
      const profiles = await invoke<Profile[]>('get_profiles');
      set({ profiles });
    } catch (err) {
      console.error('Failed to delete profile:', err);
      throw err;
    }
  },
});
