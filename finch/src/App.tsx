/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Dashboard } from '@/src/components/dashboard/Dashboard';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <>
      <Dashboard />
      <Toaster 
        position="top-center" 
        visibleToasts={3} 
        toastOptions={{
          className: "bg-neutral-900/90 backdrop-blur-md border border-white/10 text-white rounded-2xl",
        }}
      />
    </>
  );
}
