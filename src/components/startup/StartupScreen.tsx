import React, { useState, useEffect } from 'react';
import { useProfileStore, useChatStore } from '../../store';
import ProfileSelection from './ProfileSelection';
import ProfileCreation, { type ProfileCreationPayload } from './ProfileCreation';
import ProfileEditing from './ProfileEditing';
import { Profile } from '../../types/chat';
import { funEmojiAvatarUrl } from '@/src/lib/dicebearAvatar';

export default function StartupScreen() {
  const { profiles, loadProfiles, saveProfile, deleteProfile, setActiveProfile, isLoading } = useProfileStore();
  const resetChat = useChatStore(state => state.reset);
  
  const [view, setView] = useState<'selection' | 'creation' | 'editing'>('selection');
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  /** When true, empty profile list shows selection (Add Profile) instead of forcing creation — set when user cancels first-run creation. */
  const [emptyCreationDismissed, setEmptyCreationDismissed] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Profile / startup UI is designed for dark surfaces; sync <html> until we hand off to Dashboard.
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => {
      const dark = useChatStore.getState().isDark;
      document.documentElement.classList.toggle('dark', dark);
    };
  }, []);

  useEffect(() => {
    if (profiles.length > 0) {
      setEmptyCreationDismissed(false);
    }
  }, [profiles.length]);

  useEffect(() => {
    if (isLoading) return;
    if (profiles.length === 0 && !emptyCreationDismissed) {
      setView('creation');
    } else if (profiles.length > 0 && view !== 'editing') {
      setView('selection');
    }
    // Intentionally omit `view` from deps: including it sends users back to selection as soon as they open "Add profile" while already having profiles.
  }, [isLoading, profiles.length, emptyCreationDismissed]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddProfile = async (profileData: ProfileCreationPayload) => {
    const dicebear = funEmojiAvatarUrl(profileData.name || 'New');
    const newProfile: Profile = {
      id: crypto.randomUUID(),
      ...profileData,
      avatarUrl: profileData.avatarUrl?.trim() ? profileData.avatarUrl.trim() : dicebear,
    };
    await saveProfile(newProfile);
    setView('selection');
  };

  const handleUpdateProfile = async (updatedProfile: Profile) => {
    await saveProfile(updatedProfile);
    setView('selection');
  };

  const handleDeleteProfile = async (id: string) => {
    await deleteProfile(id);
    const rememberedId = localStorage.getItem('finch_remembered_profile');
    if (rememberedId === id) {
      localStorage.removeItem('finch_remembered_profile');
    }
    // State logic for activeProfile is handled in slice
  };

  const handleSelectProfile = (profile: Profile, remember: boolean) => {
    resetChat();
    if (remember) {
      localStorage.setItem('finch_remembered_profile', profile.id);
    } else {
      localStorage.removeItem('finch_remembered_profile');
    }
    setActiveProfile(profile);
  };

  if (isLoading) {
    return (
      <div className="h-full min-h-0 overflow-y-auto bg-background flex items-center justify-center relative">
        <div
          data-tauri-drag-region
          className="absolute inset-x-0 top-0 h-14 z-10"
          aria-hidden
        />
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-background text-primary flex flex-col items-center justify-center font-sans relative">
      {/* Only on profile grid: full-width drag strip. Edit/creation screens have their own headers + buttons — strip would steal clicks (e.g. Cancel). */}
      {view === 'selection' && (
        <div
          data-tauri-drag-region
          className="absolute inset-x-0 top-0 z-10 h-14"
          aria-hidden
        />
      )}
      {view === 'selection' && (
        <ProfileSelection 
          profiles={profiles} 
          onAddProfile={() => {
            setEmptyCreationDismissed(false);
            setView('creation');
          }}
          onEditProfile={(profile) => {
            setEditingProfile(profile);
            setView('editing');
          }}
          onSelectProfile={handleSelectProfile}
        />
      )}
      {view === 'creation' && (
        <ProfileCreation
          onCancel={() => {
            if (profiles.length === 0) {
              setEmptyCreationDismissed(true);
            }
            setView('selection');
          }}
          onSave={handleAddProfile}
        />
      )}
      {view === 'editing' && editingProfile && (
        <ProfileEditing
          profile={editingProfile}
          onCancel={() => setView('selection')}
          onSave={handleUpdateProfile}
          onDelete={handleDeleteProfile}
        />
      )}
    </div>
  );
}
