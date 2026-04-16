import React, { useState, useEffect } from 'react';
import { useProfileStore, useChatStore } from '../../store';
import ProfileSelection from './ProfileSelection';
import ProfileCreation from './ProfileCreation';
import ProfileEditing from './ProfileEditing';
import { Profile } from '../../types/chat';

export default function StartupScreen() {
  const { profiles, loadProfiles, saveProfile, deleteProfile, setActiveProfile, isLoading } = useProfileStore();
  const resetChat = useChatStore(state => state.reset);
  
  const [view, setView] = useState<'selection' | 'creation' | 'editing'>('selection');
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    if (!isLoading && profiles.length === 0) {
      setView('creation');
    } else if (!isLoading && profiles.length > 0 && view !== 'editing') {
      setView('selection');
    }
  }, [isLoading, profiles.length]);

  const handleAddProfile = async (profileData: Omit<Profile, 'id' | 'avatarUrl'>) => {
    const newProfile: Profile = {
      id: crypto.randomUUID(),
      avatarUrl: `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${profileData.name}&backgroundColor=transparent`,
      ...profileData
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
    // State logic for activeProfile is handled in slice
  };

  const handleSelectProfile = (profile: Profile) => {
    resetChat();
    setActiveProfile(profile);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-primary flex flex-col items-center justify-center font-sans">
      {view === 'selection' && (
        <ProfileSelection 
          profiles={profiles} 
          onAddProfile={() => setView('creation')} 
          onEditProfile={(profile) => {
            setEditingProfile(profile);
            setView('editing');
          }}
          onSelectProfile={handleSelectProfile}
        />
      )}
      {view === 'creation' && (
        <ProfileCreation 
          onCancel={() => profiles.length > 0 ? setView('selection') : null} 
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
