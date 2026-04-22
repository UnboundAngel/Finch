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
        // #region agent log
        fetch('http://127.0.0.1:7723/ingest/61911eee-37e5-42f2-9689-53dd89e5e47b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4070ff'},body:JSON.stringify({sessionId:'4070ff',runId:'pre-fix',hypothesisId:'H3',location:'useInactivityEject.ts:54',message:'Auto-eject timer fired',data:{provider:targetProvider,modelId:targetModelId},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        
        await invoke('eject_model', { 
          provider: targetProvider, 
          modelId: targetModelId 
        });
        
        ejectCb();
      } catch (err) {
        // #region agent log
        fetch('http://127.0.0.1:7723/ingest/61911eee-37e5-42f2-9689-53dd89e5e47b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4070ff'},body:JSON.stringify({sessionId:'4070ff',runId:'pre-fix',hypothesisId:'H3',location:'useInactivityEject.ts:63',message:'Auto-eject failed',data:{error:err instanceof Error ? err.message : String(err)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
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
