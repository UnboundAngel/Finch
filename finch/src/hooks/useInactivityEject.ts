import { useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

const DEV_FAST_EJECT = false;
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
 * Robust against re-renders and unstable callbacks.
 */
export const useInactivityEject = ({
  provider,
  modelId,
  onEject,
  delay = DEFAULT_DELAY,
}: UseInactivityEjectProps) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use refs for props to avoid timer resets on every render/callback change
  const propsRef = useRef({ provider, modelId, onEject, delay });
  
  useEffect(() => {
    propsRef.current = { provider, modelId, onEject, delay };
  }, [provider, modelId, onEject, delay]);

  const resetTimer = useCallback(() => {
    // 1. Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const { provider: currentProvider, modelId: currentModelId, delay: currentDelay } = propsRef.current;

    // 2. Only set timer if it's a local model
    if (!currentProvider.startsWith('local_') || !currentModelId) {
      return;
    }

    // 3. Start new countdown
    timerRef.current = setTimeout(async () => {
      try {
        const { provider: targetProvider, modelId: targetModelId, onEject: ejectCb } = propsRef.current;
        
        await invoke('eject_model', { 
          provider: targetProvider, 
          modelId: targetModelId 
        });
        
        ejectCb();
      } catch (err) {
        // Silent catch as per requirements
        console.error('Auto-eject failed:', err);
      }
    }, currentDelay);
  }, []); // resetTimer is now stable

  // Start/Restart timer only when the model selection actually changes
  useEffect(() => {
    resetTimer();
  }, [provider, modelId, resetTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { resetTimer };
};
