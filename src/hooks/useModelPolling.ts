import { useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useChatStore } from '../store';

export function useModelPolling(selectedModel: string, selectedProvider: string) {
  const setIsModelLoaded = useChatStore(state => state.setIsModelLoaded);
  const isTyping = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = useCallback(() => {
    isTyping.current = true;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTyping.current = false;
    }, 1000);
  }, []);

  const handleInputFocus = useCallback(() => {
    isTyping.current = true;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTyping.current = false;
    }, 1000);
  }, []);

  useEffect(() => {
    if (!selectedModel || !['lmstudio', 'ollama'].includes(selectedProvider)) {
      setIsModelLoaded(true);
      return;
    }

    const checkStatus = async () => {
      if (isTyping.current) return;

      try {
        const status = await invoke<boolean>('get_model_loaded_status', {
          provider: selectedProvider,
          modelId: selectedModel
        });

        setIsModelLoaded(status);
      } catch (e) {
        console.error('[POLL ERROR]', e);
        setIsModelLoaded(false);
      }
    };

    let interval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (interval) clearInterval(interval);
      interval = setInterval(checkStatus, 30000);
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleFocus = () => {
      checkStatus();
      startPolling();
    };

    const handleBlur = () => {
      stopPolling();
    };

    // Initial check and start polling
    checkStatus();
    if (document.hasFocus()) {
      startPolling();
    }

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      stopPolling();
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [selectedModel, selectedProvider, setIsModelLoaded]);

  return { handleInputChange, handleInputFocus };
}
