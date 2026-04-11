/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { Dashboard } from '@/src/components/dashboard/Dashboard';
import { Toaster } from 'sonner';
import { greet } from '@/src/lib/tauri';

export default function App() {
  useEffect(() => {
    greet('Finch Developer')
      .then((greeting) => console.log('Tauri IPC Test:', greeting))
      .catch((err) => console.error('Tauri IPC Error:', err));
  }, []);

  return (
    <>
      <Dashboard />
      <Toaster position="top-center" visibleToasts={3} />
    </>
  );
}
