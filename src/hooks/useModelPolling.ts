import { useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useChatStore } from '../store';
import { isLocalInferenceProvider } from '../lib/providers';

const SLOW_INTERVAL_MS = 30_000;
const MAX_SLOW_INTERVAL_MS = 60_000;
const FAST_INTERVAL_MS = 2_000;
const LOAD_HISTORY_KEY = 'finch-model-load-history-v1';
const MAX_HISTORY_PER_MODEL = 10;
const MIN_ESTIMATE_MS = 2_000;

type LoadHistoryMap = Record<string, number[]>;

const modelHistoryKey = (provider: string, model: string) => `${provider}::${model}`;

const readLoadHistory = (): LoadHistoryMap => {
  try {
    const raw = localStorage.getItem(LOAD_HISTORY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LoadHistoryMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeLoadHistory = (history: LoadHistoryMap) => {
  try {
    localStorage.setItem(LOAD_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Non-fatal: progress estimation can still fall back to defaults.
  }
};

const pushLoadDuration = (provider: string, model: string, durationMs: number) => {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return;
  const history = readLoadHistory();
  const key = modelHistoryKey(provider, model);
  const existing = history[key] ?? [];
  history[key] = [...existing, durationMs].slice(-MAX_HISTORY_PER_MODEL);
  writeLoadHistory(history);
};

const getAverageLoadDuration = (provider: string, model: string): number => {
  const key = modelHistoryKey(provider, model);
  const values = readLoadHistory()[key] ?? [];
  if (values.length === 0) return 15_000;
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.max(MIN_ESTIMATE_MS, avg);
};

export function useModelPolling(selectedModel: string, selectedProvider: string) {
  const setIsModelLoaded = useChatStore(state => state.setIsModelLoaded);
  const isModelLoading = useChatStore(state => state.isModelLoading);
  const setIsModelLoading = useChatStore(state => state.setIsModelLoading);
  const setModelLoadProgress = useChatStore(state => state.setModelLoadProgress);
  const isTyping = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadStartRef = useRef<number | null>(null);
  const consecutiveFailuresRef = useRef(0);

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
    if (!selectedModel || !isLocalInferenceProvider(selectedProvider)) {
      setIsModelLoaded(true);
      setIsModelLoading(false);
      setModelLoadProgress(0);
      loadStartRef.current = null;
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let latestLoaded: boolean | null = null;
    let isDisposed = false;
    let inFlight = false;

    if (isModelLoading && loadStartRef.current == null) {
      loadStartRef.current = Date.now();
    }

    const idleIntervalMs = () =>
      Math.floor(Math.random() * (MAX_SLOW_INTERVAL_MS - SLOW_INTERVAL_MS + 1)) + SLOW_INTERVAL_MS;

    const scheduleNext = (delayMs: number) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        void checkStatus(false);
      }, delayMs);
    };

    const checkStatus = async (skipTypingGuard: boolean) => {
      // Only skip typing guard during explicit rechecks, not scheduled ticks.
      if (!skipTypingGuard && isTyping.current) {
        scheduleNext(isModelLoading ? FAST_INTERVAL_MS : idleIntervalMs());
        return;
      }
      if (inFlight || isDisposed) return;
      inFlight = true;

      try {
        const status = await invoke<boolean>('get_model_loaded_status', {
          provider: selectedProvider,
          modelId: selectedModel,
        });

        consecutiveFailuresRef.current = 0; // Reset on any successful communication

        if (latestLoaded !== status) {
          setIsModelLoaded(status);
          latestLoaded = status;
        }

        if (status) {
          if (isModelLoading && loadStartRef.current != null) {
            pushLoadDuration(selectedProvider, selectedModel, Date.now() - loadStartRef.current);
          }
          loadStartRef.current = null;
          setIsModelLoading(false);
          setModelLoadProgress(0);
        } else if (isModelLoading) {
          if (loadStartRef.current == null) loadStartRef.current = Date.now();
          const elapsed = Date.now() - loadStartRef.current;
          const estimatedMs = getAverageLoadDuration(selectedProvider, selectedModel);
          const pct = Math.max(5, Math.min(95, (elapsed / estimatedMs) * 100));
          setModelLoadProgress(pct);
        } else {
          loadStartRef.current = null;
          setModelLoadProgress(0);
        }
      } catch (e) {
        console.error('[POLL ERROR]', e);
        consecutiveFailuresRef.current += 1;
        if (consecutiveFailuresRef.current >= 3) {
          if (latestLoaded !== false) {
            latestLoaded = false;
            setIsModelLoaded(false);
          }
        }
      } finally {
        inFlight = false;
        if (!isDisposed) {
          scheduleNext(isModelLoading ? FAST_INTERVAL_MS : idleIntervalMs());
        }
      }
    };

    const handleFocus = () => {
      void checkStatus(true);
    };

    const handleBlur = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    // Initial check on mount.
    void checkStatus(true);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      isDisposed = true;
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [
    selectedModel,
    selectedProvider,
    isModelLoading,
    setIsModelLoaded,
    setIsModelLoading,
    setModelLoadProgress,
  ]);

  return { handleInputChange, handleInputFocus };
}
