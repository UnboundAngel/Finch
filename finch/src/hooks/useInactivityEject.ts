import { useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

const DEV_FAST_EJECT = true;
const DEFAULT_DELAY = DEV_FAST_EJECT ? 10000 : 600000; // 10s for dev, 10m for prod

interface UseInactivityEjectProps {
  provider: string;
  modelId: string;
  onEject: () => void;
  delay?: number;
}

/**
 * useInactivityEject
 * Automatically unloads local models after a period of inactivity.
 */
export const useInactivityEject = ({
  provider,
  modelId,
  onEject,
  delay = DEFAULT_DELAY,
}: UseInactivityEjectProps) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (!provider.startsWith('local_') || !modelId) {
      return;
    }

    timerRef.current = setTimeout(async () => {
      try {
        await invoke('eject_model', { 
          provider, 
          modelId 
        }).catch(() => {
          // Silent catch as per requirements
        });
        onEject();
      } catch (err) {
        // Silent catch as per requirements
      }
    }, delay);
  }, [provider, modelId, onEject, delay]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [resetTimer]);

  return { resetTimer };
};
