import { useState, useCallback, useRef } from 'react';
import { invoke, Channel } from "@tauri-apps/api/core";
import { isTauri } from '@/src/lib/tauri-utils';
import { useChatStore } from '@/src/store/index';

import { Message } from '../types/chat';

export interface AIStats {
  totalTokens: number;
  inputTokens?: number;
  outputTokens?: number;
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
  const channelRef = useRef<Channel<string> | null>(null);
  const abortedRef = useRef(false);

  const abort = useCallback(async () => {
    abortedRef.current = true;
    if (channelRef.current) {
      channelRef.current.onmessage = null as any;
      channelRef.current = null;
    }
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
    onResearch?: (event: { type: string; data?: any }) => void,
    onComplete?: (finalStats?: AIStats) => void,
    onError?: (error: string) => void,
    params?: GenerationParams & { enableWebSearch?: boolean },
    history: Message[] = []
  ) => {
    setIsStreaming(true);
    setError(null);
    setStats(null);
    tokenCount.current = 0;
    startTime.current = performance.now();

    // Prepare conversation history for Rust
    // 1. Slice up to (but not including) the last message
    // 2. Map role 'ai' -> 'assistant'
    // 3. Keep only role and content
    const conversationHistory = history.slice(0, -1).map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content
    }));

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

    abortedRef.current = false;
    try {
      const channel = new Channel<string>();
      channelRef.current = channel;
      let finalStats: AIStats | undefined;

      channel.onmessage = (eventJson) => {
        if (abortedRef.current) return;
        try {
          const event = JSON.parse(eventJson);

          switch (event.type) {
            case "text":
              onToken(event.data);
              break;

            case "search_start":
            case "search_source":
            case "search_done":
              onResearch?.(event);
              break;

            case "stats": {
              const rawStats = event.data;
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

              const inputTokens = rawStats.input_tokens || 0;
              const outputTokens = rawStats.output_tokens || 0;

              finalStats = {
                totalTokens,
                inputTokens,
                outputTokens,
                tokensPerSecond,
                stopReason: rawStats.stop_reason || "end_turn",
                totalDuration
              };
              setStats(finalStats);

              // Increment global token counter
              useChatStore.getState().incrementTokensUsed(inputTokens + outputTokens);
              break;
            }
          }
        } catch (e) {
          console.error("Failed to parse event JSON:", eventJson, e);
        }
      };

      await invoke("stream_message", {
        prompt,
        model,
        provider,
        conversationHistory: conversationHistory,
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

      channelRef.current = null;
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
