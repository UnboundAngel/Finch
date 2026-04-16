import React from 'react';
import { Button } from '@/components/ui/button';
import { Ghost } from 'lucide-react';
import Switch from '@/components/ui/sky-toggle';
import { ModelSelector } from '@/src/components/chat/ModelSelector';
import { WindowControls } from '@/src/components/dashboard/WindowControls';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { useChatStore } from '@/src/store';

interface DashboardHeaderProps {
  isLeftSidebarOpen: boolean;
  setIsLeftSidebarOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  sidebarContrast: 'light' | 'dark';
  isIncognito: boolean;
  toggleIncognito: () => void;
  selectedProvider: string;
  setSelectedProvider: (val: string) => void;
  selectedModel: string;
  setSelectedModel: (val: string) => void;
  headerContrast: 'light' | 'dark';
  isDark: boolean;
  handleThemeChange: (checked: boolean) => void;
  showPinkMode: boolean;
}

const RightSidebarToggle = ({ headerContrast }: { headerContrast: 'light' | 'dark' }) => {
  const isRightSidebarOpen = useChatStore(state => state.isRightSidebarOpen);
  const setIsRightSidebarOpen = useChatStore(state => state.setIsRightSidebarOpen);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsRightSidebarOpen(prev => !prev)}
      className={`h-9 w-9 rounded-lg transition-none ${headerContrast === 'dark' ? 'hover:bg-black/10 text-black' : 'hover:bg-white/10 text-white'}`}
    >
      <img
        src={isRightSidebarOpen ? "/assets/open-state-right.svg" : "/assets/closed-state-right.svg"}
        className={`h-5 w-5 transition-none ${headerContrast === 'dark' ? 'brightness-0' : 'brightness-0 invert'}`}
        alt="Toggle Right Sidebar"
      />
    </Button>
  );
};

export function DashboardHeader({
  isLeftSidebarOpen,
  setIsLeftSidebarOpen,
  sidebarContrast,
  isIncognito,
  toggleIncognito,
  selectedProvider,
  setSelectedProvider,
  selectedModel,
  setSelectedModel,
  headerContrast,
  isDark,
  handleThemeChange,
  showPinkMode
}: DashboardHeaderProps) {
  return (
    <header
      data-tauri-drag-region
      className={`h-14 flex items-center justify-between px-4 sticky top-0 z-50 transition-none shrink-0 ${isIncognito
        ? 'border-transparent bg-transparent'
        : showPinkMode
          ? 'bg-gradient-to-r from-pink-300/40 via-rose-200/40 to-fuchsia-200/40 backdrop-blur-xl border-b border-pink-200/30'
          : 'bg-background/40 backdrop-blur-xl border-b border-white/10 dark:border-white/5'
        }`}
    >
      <div className="flex-1 flex items-center justify-start gap-2 pointer-events-none">
        <Button
          variant="ghost"
          size="icon"
          className={`h-9 w-9 rounded-lg transition-none no-drag pointer-events-auto ${sidebarContrast === 'dark' ? 'hover:bg-black/10 text-black' : 'hover:bg-white/10 text-white'
            }`}
          onClick={() => setIsLeftSidebarOpen(prev => !prev)}
        >
          <img
            src={isLeftSidebarOpen ? "/assets/open-state-left.svg" : "/assets/closed-state-left.svg"}
            className={`h-5 w-5 transition-none ${sidebarContrast === 'dark' ? 'brightness-0' : 'brightness-0 invert'}`}
            alt="Toggle Left Sidebar"
          />
        </Button>
        {isIncognito && <span className="font-bold tracking-wider uppercase text-xs ml-2 pointer-events-none">Incognito</span>}
      </div>

      {/* Center: Model Selection */}
      <div className="flex-1 flex items-center justify-center gap-2 pointer-events-none">
        <div className="flex items-center gap-2 no-drag pointer-events-auto">
          <ModelSelector
            selectedProvider={selectedProvider}
            setSelectedProvider={setSelectedProvider}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            contrast={headerContrast}
          />
          {!isIncognito && selectedProvider.startsWith('local_') && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 opacity-50 hover:opacity-100 transition-opacity no-drag"
              onClick={async () => {
                try {
                  await invoke('eject_model', {
                    provider: selectedProvider,
                    modelId: selectedModel
                  });
                  setSelectedModel('');
                  setSelectedProvider('');
                  toast.success('Model ejected successfully');
                } catch (err) {
                  console.error('Failed to eject model:', err);
                  toast.error('Failed to eject model');
                }
              }}
            >
              <img src="/assets/eject.svg" className="h-5 w-5 dark:invert" alt="Eject" />
            </Button>
          )}
        </div>
      </div>

      {/* Right Side: System Controls */}
      <div className="flex-1 flex items-center justify-end gap-2 pointer-events-none">
        <div className="flex items-center gap-2 no-drag pointer-events-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleIncognito}
            className={`h-9 w-9 rounded-lg transition-none ${isIncognito
              ? (isDark ? "text-white hover:bg-white/10" : "text-black hover:bg-black/10")
              : (headerContrast === 'dark' ? "text-black hover:bg-black/10" : "text-white hover:bg-white/10")
              }`}
          >
            <Ghost className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-4 no-drag pointer-events-auto">
          <Switch checked={isDark} onChange={handleThemeChange} />
          <RightSidebarToggle headerContrast={headerContrast} />
          <WindowControls isIncognito={isIncognito} contrast={headerContrast} />
        </div>
      </div>
    </header>
  );
}
