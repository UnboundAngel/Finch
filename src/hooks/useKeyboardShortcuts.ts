import { useEffect } from 'react';

interface UseKeyboardShortcutsProps {
  onNewChat: () => void;
  onOpenSettings: () => void;
  onSearchFocus?: () => void;
}

export function useKeyboardShortcuts({
  onNewChat,
  onOpenSettings,
  onSearchFocus,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const isModifier = e.metaKey || e.ctrlKey;

      if (!isModifier) return;

      switch (e.key.toLowerCase()) {
        case 't':
          e.preventDefault();
          onNewChat();
          break;
        case ',':
          e.preventDefault();
          onOpenSettings();
          break;
        case 'k':
          if (onSearchFocus) {
            e.preventDefault();
            onSearchFocus();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewChat, onOpenSettings, onSearchFocus]);
}
