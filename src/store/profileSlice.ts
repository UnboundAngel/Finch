import { StateCreator } from 'zustand';
import { Profile } from '../types/chat';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@/src/lib/tauri-utils';

const WEB_PROFILES_KEY = 'finch_web_profiles';

const readWebProfiles = (): Profile[] => {
  try {
    const raw = localStorage.getItem(WEB_PROFILES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Profile[]) : [];
  } catch (err) {
    console.error('Failed to parse web profiles:', err);
    return [];
  }
};

const writeWebProfiles = (profiles: Profile[]) => {
  localStorage.setItem(WEB_PROFILES_KEY, JSON.stringify(profiles));
};

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
      if (!isTauri()) {
        const profiles = readWebProfiles();
        set({ profiles, isLoading: false, error: null });
        return;
      }
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
      if (!isTauri()) {
        const profiles = readWebProfiles();
        const existingIdx = profiles.findIndex((p) => p.id === profile.id);
        const nextProfiles =
          existingIdx === -1
            ? [...profiles, profile]
            : profiles.map((p, idx) => (idx === existingIdx ? profile : p));
        writeWebProfiles(nextProfiles);
        const { activeProfile } = get();
        const merged = nextProfiles.find((p) => p.id === profile.id) ?? profile;
        const nextActive =
          activeProfile?.id === profile.id ? merged : activeProfile;
        set({ profiles: nextProfiles, activeProfile: nextActive, error: null });
        return;
      }
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
      if (!isTauri()) {
        const profiles = readWebProfiles().filter((p) => p.id !== profileId);
        writeWebProfiles(profiles);
        const { activeProfile } = get();
        set({
          profiles,
          activeProfile: activeProfile?.id === profileId ? null : activeProfile,
          error: null,
        });
        return;
      }
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
