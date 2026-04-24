import 'react';
import { Button } from '@/components/ui/button';
import { Ghost } from 'lucide-react';
import Switch from '@/components/ui/sky-toggle';
import { ModelSelector } from '@/src/components/chat/ModelSelector';
import { WindowControls } from '@/src/components/dashboard/WindowControls';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { useChatStore } from '@/src/store';
import { RightSidebarToggleGated } from './RightSidebarToggle';
import { isLocalInferenceProvider } from '@/src/lib/providers';

interface DashboardHeaderProps {
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
  isModelLoaded: boolean;
  isModelLoading: boolean;
  modelLoadProgress: number;
}

export function DashboardHeader({
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
  showPinkMode,
  isModelLoaded: _isModelLoaded,
  isModelLoading,
  modelLoadProgress,
}: DashboardHeaderProps) {
  const isLeftSidebarOpen = useChatStore(state => state.isLeftSidebarOpen);
  const setIsLeftSidebarOpen = useChatStore(state => state.setIsLeftSidebarOpen);
  const activeWorkspace = useChatStore(state => state.activeWorkspace);

  const effectiveHeaderContrast = activeWorkspace === 'studio' ? 'light' : headerContrast;
  const effectiveSidebarContrast = activeWorkspace === 'studio' ? 'light' : sidebarContrast;

  return (
    <header
      data-tauri-drag-region
      className={`h-14 flex items-center justify-between px-4 z-50 transition-none shrink-0 ${
        activeWorkspace === 'studio'
          ? 'absolute top-0 left-0 right-0 bg-transparent'
          : `sticky top-0 ${isIncognito ? 'bg-transparent' : showPinkMode ? 'bg-[#fff5f7]/80 backdrop-blur-xl' : 'bg-transparent'}`
      }`}
    >
      <div className="flex-1 flex items-center justify-start gap-2 pointer-events-none">
        {!isIncognito && (
          <Button
            variant="ghost"
            size="icon"
            className={`h-9 w-9 rounded-lg transition-none no-drag pointer-events-auto ${effectiveSidebarContrast === 'dark' ? 'hover:bg-black/10 text-black' : 'hover:bg-white/10 text-white'
              }`}
            onClick={() => setIsLeftSidebarOpen(prev => !prev)}
          >
            <img
              src={isLeftSidebarOpen ? "/assets/open-state-left.svg" : "/assets/closed-state-left.svg"}
              className={`h-5 w-5 transition-none ${effectiveSidebarContrast === 'dark' ? 'brightness-0' : 'brightness-0 invert'}`}
              alt="Toggle Left Sidebar"
            />
          </Button>
        )}
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
            contrast={effectiveHeaderContrast}
            showLoadRing={isLocalInferenceProvider(selectedProvider) && isModelLoading}
            loadProgress={modelLoadProgress}
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
                  toast.success('Model is going to sleep now');
                } catch (err) {
                  console.error('Failed to eject model:', err);
                  toast.error('That model is having a hard time going to sleep.');
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
          {activeWorkspace !== 'studio' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleIncognito}
              className={`h-9 w-9 rounded-lg transition-none ${isIncognito
                ? (isDark ? "text-white hover:bg-white/10" : "text-black hover:bg-black/10")
                : (effectiveHeaderContrast === 'dark' ? "text-black hover:bg-black/10" : "text-white hover:bg-white/10")
                }`}
            >
              <Ghost className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4 no-drag pointer-events-auto">
          {activeWorkspace !== 'studio' && (
            <Switch checked={isDark} onChange={handleThemeChange} />
          )}
          {!isIncognito && <RightSidebarToggleGated headerContrast={effectiveHeaderContrast} />}
          <WindowControls isIncognito={isIncognito} contrast={effectiveHeaderContrast} />
        </div>
      </div>
    </header>
  );
}
