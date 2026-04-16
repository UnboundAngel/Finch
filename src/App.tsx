/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Dashboard } from '@/src/components/dashboard/Dashboard';
import { Toaster } from 'sonner';
import '@/src/styles/toasts.css';
import { useProfileStore } from './store';
import StartupScreen from './components/startup/StartupScreen';

export default function App() {
  const activeProfile = useProfileStore(state => state.activeProfile);

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