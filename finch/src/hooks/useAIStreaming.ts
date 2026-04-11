import { useState, useCallback } from 'react';
import { invoke, Channel } from "@tauri-apps/api/core";
import { isTauri } from '@/src/lib/tauri';

export function useAIStreaming() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abort = useCallback(async () => {
    if (isTauri()) {
      try {
        await invoke("abort_generation");
      } catch (err) {
        console.error("Failed to abort generation:", err);
      }
    } else {
      setIsStreaming(false);
    }
  }, []);

  const streamMessage = useCallback(async (
    prompt: string,
    model: string,
    onToken: (token: string) => void,
    onComplete?: () => void,
    onError?: (error: string) => void
  ) => {
    setIsStreaming(true);
    setError(null);

    if (!isTauri()) {
      console.warn("streamMessage called outside of Tauri context. Mocking stream.");
      // Mock stream
      const tokens = `This is a mocked streaming response from Rust using ${model}. You said: "${prompt}"`.split(" ");
      for (let i = 0; i < tokens.length; i++) {
        if (!isStreaming) break; // Simple mock abort
        await new Promise(resolve => setTimeout(resolve, 50));
        onToken(tokens[i] + (i === tokens.length - 1 ? "" : " "));
      }
      setIsStreaming(false);
      onComplete?.();
      return;
    }

    try {
      const channel = new Channel<string>();
      channel.onData((token) => {
        onToken(token);
      });

      await invoke("stream_message", { prompt, model, channel });
      setIsStreaming(false);
      onComplete?.();
    } catch (err: any) {
      const errorMsg = err.toString();
      setError(errorMsg);
      setIsStreaming(false);
      onError?.(errorMsg);
    }
  }, []);

  return { streamMessage, abort, isStreaming, error };
}
