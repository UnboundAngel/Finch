/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Dashboard } from '@/src/components/dashboard/Dashboard';
import { Toaster } from 'sonner';
import '@/src/styles/toasts.css';
import { useProfileStore } from './store';
import StartupScreen from './components/startup/StartupScreen';

export default function App() {
  const { activeProfile, profiles, loadProfiles, setActiveProfile } = useProfileStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      await loadProfiles();
      const rememberedId = localStorage.getItem('finch_remembered_profile');
      if (rememberedId) {
        // We need the profiles from the store which are updated after loadProfiles
        // But since we are in the same render, we might need to get them from the store state
        const currentProfiles = useProfileStore.getState().profiles;
        const rememberedProfile = currentProfiles.find(p => p.id === rememberedId);
        if (rememberedProfile) {
          setActiveProfile(rememberedProfile);
        }
      }
      setIsInitialized(true);
    };
    init();
  }, [loadProfiles, setActiveProfile]);

  if (!isInitialized) {
    return (
      <div className="h-full min-h-0 bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {activeProfile ? <Dashboard /> : <StartupScreen />}
      <Toaster 
        position="top-right" 
        visibleToasts={3} 
        offset={72} 
        style={{ 
          right: '16px',
          '--width': 'auto' 
        } as React.CSSProperties}
        toastOptions={{
          style: {
            maxWidth: '40vw',
            width: 'auto',
            backgroundImage: "url('/assets/light-grain.png')",
            backgroundRepeat: 'repeat',
            backgroundSize: '256px 256px',
          }
        }}
      />
    </>
  );
}