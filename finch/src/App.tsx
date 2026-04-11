/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Dashboard } from '@/src/components/dashboard/Dashboard';
import { Toaster } from 'sonner';
import '@/src/styles/toasts.css';

export default function App() {
  return (
    <>
      <Dashboard />
      <Toaster 
        position="top-center" 
        visibleToasts={3} 
      />
    </>
  );
}
