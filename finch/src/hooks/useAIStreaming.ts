import { useState, useCallback, useRef } from 'react';
import { invoke, Channel } from "@tauri-apps/api/core";
import { isTauri } from '@/src/lib/tauri';

export interface AIStats {
  totalTokens: number;
  tokensPerSecond: number;
  stopReason: string;
  totalDuration?: number;
}

export interface GenerationParams {
  systemPrompt?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stopStrings?: string[];
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
    onError?: (error: string) => void,
    params?: GenerationParams
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
            const wallClockDurationMs = performance.now() - startTime.current;
            
            // Prefer total_tokens from Rust if available, otherwise use our counter
            const totalTokens = rawStats.total_tokens || tokenCount.current;
            
            // Use native duration if available (LM Studio provides total_duration in ms)
            // Otherwise fallback to wall clock
            const totalDuration = rawStats.total_duration || wallClockDurationMs;
            
            // Use native tokens per second if available, otherwise calculate from duration
            const tokensPerSecond = rawStats.tokens_per_second 
              ? Math.round(rawStats.tokens_per_second * 10) / 10
              : Math.round((totalTokens / (totalDuration / 1000)) * 10) / 10;
            
            finalStats = {
              totalTokens,
              tokensPerSecond,
              stopReason: rawStats.stop_reason || "end_turn",
              totalDuration
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

      await invoke("stream_message", { 
        prompt, 
        model, 
        provider, 
        channel,
        ...params
      });
      
      // Ensure we have final duration if it hasn't been set by stats sentinel yet
      if (!finalStats) {
        const durationMs = performance.now() - startTime.current;
        finalStats = {
          totalTokens: tokenCount.current,
          tokensPerSecond: Math.round((tokenCount.current / (durationMs / 1000)) * 10) / 10,
          stopReason: "stop",
          totalDuration: durationMs
        };
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
