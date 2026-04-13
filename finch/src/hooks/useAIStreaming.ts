import { useState, useCallback, useRef } from 'react';
import { invoke, Channel } from "@tauri-apps/api/core";
import { isTauri } from '@/src/lib/tauri';

export interface AIStats {
  totalTokens: number;
  tokensPerSecond: number;
  stopReason: string;
  totalDuration?: number;
}

export function useAIStreaming() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AIStats | null>(null);

  const tokenCount = useRef(0);
  const startTime = useRef(0);

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
    provider: string,
    onToken: (token: string) => void,
    onComplete?: (finalStats?: AIStats) => void,
    onError?: (error: string) => void
  ) => {
    setIsStreaming(true);
    setError(null);
    setStats(null);
    tokenCount.current = 0;
    startTime.current = performance.now();

    if (!isTauri()) {
      console.warn("streamMessage called outside of Tauri context. Mocking stream.");
      // Mock stream
      const tokens = `This is a mocked streaming response from Rust using ${provider}:${model}. You said: "${prompt}"`.split(" ");
      for (let i = 0; i < tokens.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        tokenCount.current++;
        onToken(tokens[i] + (i === tokens.length - 1 ? "" : " "));
      }
      
      const durationMs = performance.now() - startTime.current;
      const durationSec = durationMs / 1000;
      const finalStats = {
        totalTokens: tokenCount.current,
        tokensPerSecond: Math.round((tokenCount.current / durationSec) * 10) / 10,
        stopReason: "end_turn",
        totalDuration: durationMs
      };
      
      setStats(finalStats);
      setIsStreaming(false);
      onComplete?.(finalStats);
      return;
    }

    try {
      const channel = new Channel<string>();
      let finalStats: AIStats | undefined;

      channel.onmessage = (token) => {
        if (token.startsWith("__STATS__:")) {
          try {
            const rawStats = JSON.parse(token.substring(10));
            const durationMs = performance.now() - startTime.current;
            const durationSec = durationMs / 1000;
            
            // Prefer total_tokens from Rust if available, otherwise use our counter
            const totalTokens = rawStats.total_tokens || tokenCount.current;
            
            finalStats = {
              totalTokens,
              tokensPerSecond: Math.round((totalTokens / durationSec) * 10) / 10,
              stopReason: rawStats.stop_reason || "end_turn",
              totalDuration: durationMs
            };
            setStats(finalStats);
          } catch (e) {
            console.error("Failed to parse stats sentinel:", e);
          }
        } else {
          tokenCount.current++;
          onToken(token);
        }
      };

      await invoke("stream_message", { prompt, model, provider, channel });
      
      // Ensure we have final duration if it hasn't been set by stats sentinel yet
      if (!finalStats) {
        const durationMs = performance.now() - startTime.current;
        finalStats = {
          totalTokens: tokenCount.current,
          tokensPerSecond: Math.round((tokenCount.current / (durationMs / 1000)) * 10) / 10,
          stopReason: "stop",
          totalDuration: durationMs
        };
      } else {
         // Finalize duration on completion to be precise
         finalStats.totalDuration = performance.now() - startTime.current;
      }
      
      setIsStreaming(false);
      onComplete?.(finalStats);
    } catch (err: any) {
      const errorMsg = err.toString();
      setError(errorMsg);
      setIsStreaming(false);
      onError?.(errorMsg);
    }
  }, []);

  return { streamMessage, abort, isStreaming, error, stats };
}
