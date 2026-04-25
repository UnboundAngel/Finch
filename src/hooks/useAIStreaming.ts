import { useState, useCallback, useRef } from 'react';
import { invoke, Channel } from "@tauri-apps/api/core";
import { isTauri } from '@/src/lib/tauri-utils';
import { useChatStore } from '@/src/store/index';
import { toast } from 'sonner';

import { Message } from '../types/chat';

interface AIStats {
  totalTokens: number;
  inputTokens?: number;
  outputTokens?: number;
  tokensPerSecond: number;
  stopReason: string;
  totalDuration?: number;
}

interface GenerationParams {
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
  const textBufferRef = useRef('');
  const rafRef = useRef<number | null>(null);

  const abort = useCallback(async (onToken?: (token: string) => void) => {
    abortedRef.current = true;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Flush any buffered text before aborting so no tokens are silently dropped
    if (textBufferRef.current && onToken) {
      onToken(textBufferRef.current);
      textBufferRef.current = '';
    }
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
    history: Message[] = [],
    attachments?: { path: string }[]
  ) => {
    setIsStreaming(true);
    setError(null);
    setStats(null);
    tokenCount.current = 0;
    startTime.current = performance.now();
    textBufferRef.current = '';
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

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
      const ack = `Response received: ${prompt}`;
      const tokens = ack.split(" ");
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

      // Flush the accumulated text buffer immediately (called from rAF or before ordering-sensitive events)
      const flushTextBuffer = () => {
        rafRef.current = null;
        if (textBufferRef.current) {
          onToken(textBufferRef.current);
          textBufferRef.current = '';
        }
      };

      channel.onmessage = (eventJson) => {
        if (abortedRef.current) return;
        try {
          const event = JSON.parse(eventJson);

          switch (event.type) {
            case "text":
              if (typeof event.data !== 'string') {
                console.warn('[useAIStreaming] Received text event with non-string data:', event.data, '— raw JSON:', eventJson);
                break;
              }
              textBufferRef.current += event.data;
              if (rafRef.current === null) {
                rafRef.current = requestAnimationFrame(flushTextBuffer);
              }
              break;

            case "search_start":
            case "search_source":
            case "search_done":
              // Flush pending text before search events to preserve ordering
              if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                flushTextBuffer();
              }
              onResearch?.(event);
              break;

            case "stats": {
              // Flush any remaining text before finalising
              if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                flushTextBuffer();
              }

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

            case "error": {
              const errorMsg = event.data;
              toast.error(errorMsg);
              setError(errorMsg);
              setIsStreaming(false);
              onError?.(errorMsg);
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
        ...params,
        ...(attachments && attachments.length > 0 ? { attachments } : {}),
      });

      // Cancel any pending rAF and flush remaining buffer before completing
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        if (textBufferRef.current) {
          onToken(textBufferRef.current);
          textBufferRef.current = '';
        }
      }

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
      const errorMsg = typeof err === 'string' ? err : (err?.message ?? JSON.stringify(err));
      setError(errorMsg);
      setIsStreaming(false);
      onError?.(errorMsg);
    }
  }, []);

  return { streamMessage, abort, isStreaming, error, stats };
}
