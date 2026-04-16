import React, { createContext, useContext, useState } from 'react';
import { ProfileDialog } from '@/src/components/dashboard/ProfileDialog';
import { SettingsDialog } from '@/src/components/dashboard/SettingsDialog';
import { ContextOverflowModal } from '@/src/components/modals/ContextOverflowModal';

interface ModalContextType {
  setIsProfileOpen: (open: boolean) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setIsOverflowOpen: (open: boolean) => void;
  openOverflowModal: (hardwareLimit: number, requestedTokens: number, onConfirm: () => void) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ 
  children,
  profileProps,
  settingsProps,
}: { 
  children: React.ReactNode;
  profileProps: any;
  settingsProps: any;
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [overflowData, setOverflowData] = useState<{
    limit: number;
    requested: number;
    onConfirm: () => void;
  } | null>(null);

  const openOverflowModal = (limit: number, requested: number, onConfirm: () => void) => {
    setOverflowData({ limit, requested, onConfirm });
    setIsOverflowOpen(true);
  };

  return (
    <ModalContext.Provider value={{ 
      setIsProfileOpen, 
      setIsSettingsOpen, 
      setIsOverflowOpen,
      openOverflowModal
    }}>
      {children}
      <ProfileDialog
        isOpen={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        {...profileProps}
      />
      <SettingsDialog
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        {...settingsProps}
      />
      {overflowData && (
        <ContextOverflowModal
          isOpen={isOverflowOpen}
          onClose={() => setIsOverflowOpen(false)}
          onConfirm={() => {
            setIsOverflowOpen(false);
            overflowData.onConfirm();
          }}
          hardwareSafeLimit={overflowData.limit}
          requestedTokens={overflowData.requested}
        />
      )}
    </ModalContext.Provider>
  );
}

export const useModals = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModals must be used within ModalProvider');
  return context;
};
