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
      <Toaster position="top-right" visibleToasts={3} />
    </>
  );
}
