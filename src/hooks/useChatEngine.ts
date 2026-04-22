import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { invoke } from '@tauri-apps/api/core';
import type { Artifact, Message, ChatSession, WebSearchResearchEvent } from '@/src/types/chat';
import { extractArtifacts } from '@/src/lib/artifactParser';
import { buildChatSystemPrompt } from '@/src/lib/artifactTooling';
import { useModelParams, useChatStore } from '@/src/store';

interface SavedArtifactMeta {
  path: string;
  filename: string;
  size_bytes: number;
  written_at: number;
}

/** Persist all artifacts in a completed message and return them with filePath populated. */
async function persistArtifacts(
  sessionId: string,
  artifacts: Artifact[],
): Promise<Artifact[]> {
  return Promise.all(
    artifacts.map(async (artifact) => {
      try {
        const meta = await invoke<SavedArtifactMeta>('save_artifact_version', {
          args: {
            session_id: sessionId,
            artifact_id: artifact.id,
            version: artifact.version,
            kind: artifact.kind,
            language: artifact.language ?? null,
            title: artifact.title,
            content: artifact.content,
          },
        });
        return { ...artifact, filePath: meta.path };
      } catch {
        return artifact;
      }
    }),
  );
}

function replaceArtifactsInMessage(
  messages: Message[],
  messageId: string,
  artifacts: Artifact[],
): Message[] {
  return messages.map((message) => {
    if (message.id !== messageId || !message.metadata?.artifacts) {
      return message;
    }

    return {
      ...message,
      metadata: { ...message.metadata, artifacts },
    };
  });
}

// Cloud providers are rate-limited — avoid an extra API call just for the title.
// Strip leading filler words and take the first 6 significant words of the message.
function deriveClientTitle(message: string): string {
  const stripped = message
    .trim()
    .replace(/^(?:what(?:'s| is| are| were)?|who(?:'s)?|where(?:'s)?|when|why|how(?:'s| do| does| did)?|can(?: you)?|could(?: you)?|would(?: you)?|should(?: i)?|please|tell(?: me)?|explain|help(?: me)?|write|create|make|give(?: me)?|show(?: me)?|is|are|do|does|did)\s+/i, '')
    .replace(/[?!.]+$/, '')
    .trim();
  const words = (stripped || message.trim()).split(/\s+/).slice(0, 6);
  const title = words.join(' ');
  return title ? title.charAt(0).toUpperCase() + title.slice(1) : '';
}

const CLOUD_PROVIDERS = new Set(['anthropic', 'openai', 'gemini']);

interface UseChatEngineOptions {
  selectedModel: string;
  selectedProvider: string;
  isWebSearchActive: boolean;
  isArtifactToolActive: boolean;
  isStreaming: boolean;
  streamMessage: any; // from useAIStreaming
  abort: () => void;
  session: any; // ReturnType<typeof useChatSession>
  isIncognito: boolean;
  openOverflowModal: (safeLimit: number, currentTokens: number, onConfirm: () => void) => void;
  activeProfile: any;
  setRecentChats: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  recentChats: ChatSession[];
  inputRef: React.MutableRefObject<string>;
  attachedFileRef: React.MutableRefObject<{ name: string; path: string } | null>;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  setAttachedFile: React.Dispatch<React.SetStateAction<{ name: string; path: string } | null>>;
}

export function useChatEngine({
  selectedModel,
  selectedProvider,
  isWebSearchActive,
  isArtifactToolActive,
  isStreaming,
  streamMessage,
  abort,
  session,
  isIncognito,
  openOverflowModal,
  activeProfile,
  setRecentChats,
  recentChats,
  inputRef,
  attachedFileRef,
  setInput,
  setAttachedFile,
}: UseChatEngineOptions) {
  const [isThinking, setIsThinking] = useState(false);
  const [researchEvents, setResearchEvents] = useState<WebSearchResearchEvent[]>([]);
  const researchEventsRef = useRef<WebSearchResearchEvent[]>([]);
  const wasAbortedRef = useRef(false);

  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = session.messages;

  const handleStop = useCallback(() => {
    wasAbortedRef.current = true;
    abort();
  }, [abort]);

  // Always read latest list when saving. invokeStream is stable (narrow useCallback deps), so
  // saves that run after streaming must not read a stale `recentChats` closure.
  const recentChatsRef = useRef(recentChats);
  recentChatsRef.current = recentChats;

  // AI title is written here synchronously as soon as the model returns, before React commits
  // setRecentChats. Stream-end saves must see this even if chat list state is still catching up.
  const pendingAutoTitleBySessionIdRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    pendingAutoTitleBySessionIdRef.current.clear();
  }, [activeProfile?.id]);

  const resolveSessionTitle = (
    sessionId: string | null | undefined,
    updatedMessages: Message[],
    existingChat: ChatSession | undefined,
  ): string => {
    const pending = (sessionId && pendingAutoTitleBySessionIdRef.current.get(sessionId)?.trim()) || '';
    const existingTitle = existingChat?.title?.trim() ?? '';
    const firstUser = updatedMessages.find((m) => m.role === 'user');
    const rawPeek = (firstUser?.content ?? '').substring(0, 40).trim() || 'New Chat';
    // Pending applies only while the list still shows the default slice (not yet committed AI name).
    // Once the list has any other title (AI or user rename), trust the list over pending so renames win.
    const listStillDefaultSlice = !existingTitle || existingTitle === rawPeek;
    if (pending && listStillDefaultSlice) return pending;
    if (existingTitle) return existingTitle;
    return rawPeek;
  };

  const updateActiveSessionInList = useCallback(async (updatedMessages: Message[]) => {
    if (isIncognito) return;
    const currentSessionId = session.activeSessionIdRef.current;
    const existing = recentChatsRef.current.find(c => c.id === currentSessionId);
    const firstUserForPeek = updatedMessages.find((m) => m.role === 'user');
    const rawPeekForPurge =
      (firstUserForPeek?.content ?? '').substring(0, 40).trim() || 'New Chat';
    if (currentSessionId) {
      const p = pendingAutoTitleBySessionIdRef.current.get(currentSessionId)?.trim();
      const ex = existing?.title?.trim();
      if (p && ex && ex !== rawPeekForPurge && ex !== p) {
        pendingAutoTitleBySessionIdRef.current.delete(currentSessionId);
      }
    }
    const pendingBefore = currentSessionId
      ? pendingAutoTitleBySessionIdRef.current.get(currentSessionId)?.trim()
      : '';
    const resolvedTitle = resolveSessionTitle(currentSessionId, updatedMessages, existing);
    const sessionToSave: ChatSession = {
      id: currentSessionId || '',
      title: resolvedTitle,
      messages: updatedMessages as any,
      profileId: activeProfile?.id,
      timestamp: Date.now(),
      created_at: existing?.created_at || Date.now(),
      updated_at: Date.now(),
      model: selectedModel,
      provider: selectedProvider,
      pinned: existing?.pinned || false,
      incognito: false,
      systemPrompt: existing?.systemPrompt || useModelParams.getState().systemPrompt || '',
      generationParams: existing?.generationParams || { temperature: 0.7, maxTokens: 2048, topP: 1.0 },
      stats: { totalTokens: useChatStore.getState().tokensUsed, totalMessages: updatedMessages.length, averageSpeed: 0 }
    };

    try {
      const savedId = await invoke<string>('save_chat', { chat: sessionToSave });
      if (!currentSessionId) {
        session.setActiveSessionId(savedId);
        session.activeSessionIdRef.current = savedId;
        sessionToSave.id = savedId;
      }
      const sid = sessionToSave.id;
      if (pendingBefore && resolvedTitle === pendingBefore) {
        pendingAutoTitleBySessionIdRef.current.delete(sid);
      }
      setRecentChats((prev: any) => [sessionToSave, ...prev.filter((c: any) => c.id !== savedId)].sort((a, b) => (a.pinned === b.pinned ? b.timestamp - a.timestamp : a.pinned ? -1 : 1)));
    } catch (err) { console.error('Failed to save chat:', err); }
  }, [isIncognito, session.activeSessionIdRef, session.setActiveSessionId, activeProfile?.id, selectedModel, selectedProvider, setRecentChats]);

  const invokeStream = useCallback((
    userMessage: string,
    historyWithUserMsg: Message[],
    attachmentPath?: string,
  ) => {
    const { systemPrompt, temperature, topP, maxTokens } = useModelParams.getState();
    setIsThinking(true);
    let isFirstToken = true;
    const aiMessageId = crypto.randomUUID();
    wasAbortedRef.current = false;

    const composedSystemPrompt = buildChatSystemPrompt(systemPrompt, isArtifactToolActive);

    const streamParams = {
      systemPrompt: composedSystemPrompt, temperature, topP,
      ...(CLOUD_PROVIDERS.has(selectedProvider) ? {} : { maxTokens }),
      enableWebSearch: isWebSearchActive,
    };

    streamMessage(
      userMessage, selectedModel, selectedProvider,
      (token: string) => {
        if (!token || token === 'undefined') return;
        if (isFirstToken) {
          setIsThinking(false);
          isFirstToken = false;
          const snapshottedEvents = [...researchEventsRef.current];
          session.setMessages((prev: Message[]) => [...prev, {
            id: aiMessageId, role: 'ai', content: token, streaming: true,
            metadata: {
              timestamp: new Date(), model: selectedModel,
              ...(snapshottedEvents.length > 0 ? { researchEvents: snapshottedEvents } : {}),
            }
          }]);
        } else {
          session.setMessages((prev: Message[]) => {
            const last = prev[prev.length - 1];
            if (last?.role === 'ai') return [...prev.slice(0, -1), { ...last, content: last.content + token }];
            return prev;
          });
        }
      },
      (ev: WebSearchResearchEvent) => {
        researchEventsRef.current = [...researchEventsRef.current, ev];
        setResearchEvents(researchEventsRef.current);
        // If an AI streaming message already exists (search event after first token), patch its metadata too
        session.setMessages((prev: Message[]) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'ai' && last.streaming) {
            const existing = last.metadata?.researchEvents ?? [];
            return [...prev.slice(0, -1), {
              ...last,
              metadata: { ...last.metadata, researchEvents: [...existing, ev] }
            }];
          }
          return prev;
        });
      },
      (stats: any) => {
        session.setMessages((prev: Message[]) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'ai') {
            const wasAborted = wasAbortedRef.current;
            wasAbortedRef.current = false;
            const mergedStats = { ...(stats || {}) };
            if (wasAborted) mergedStats.stopReason = 'user_stopped';
            const parsedArtifacts = extractArtifacts(last.content);
            // Preserve researchEvents from the streaming message — stats payload never includes it
            const final = [...prev.slice(0, -1), { 
              ...last, 
              streaming: false, 
              metadata: { 
                ...last.metadata, 
                ...mergedStats, 
                artifacts: parsedArtifacts,
              } 
            }];
            setTimeout(() => updateActiveSessionInList(final), 0);

            // Persist artifacts to disk; patch filePath back into state once complete.
            if (parsedArtifacts.length > 0) {
              const sessionId = session.activeSessionIdRef.current;
              if (sessionId) {
                const msgId = last.id;
                persistArtifacts(sessionId, parsedArtifacts).then((withPaths) => {
                  session.setMessages((messages: Message[]) =>
                    replaceArtifactsInMessage(messages, msgId, withPaths),
                  );
                });
              }
            }

            return final;
          }
          return prev;
        });
        setIsThinking(false);
      },
      (err: any) => {
        setIsThinking(false);
        toast.error(`That reply went sideways: ${err}`);
      },
      streamParams,
      historyWithUserMsg,
      attachmentPath ? [{ path: attachmentPath }] : undefined,
    );
  }, [selectedModel, selectedProvider, isWebSearchActive, isArtifactToolActive, streamMessage, session, updateActiveSessionInList]);

  // Refs for stable callbacks used across send/autoName — updated each render so
  // useCallback deps stay narrow without stale closures.
  const handleSendRef = useRef<(bypassCheck?: boolean) => Promise<void>>(async () => {});
  const autoNameChatRef = useRef<(msg: string) => Promise<void>>(async () => {});

  const handleSend = useCallback(async (bypassCheck = false) => {
    const currentInput = inputRef.current;
    if (!currentInput.trim() || isThinking || isStreaming) return;
    const { maxTokens, contextIntelligence: ci } = useModelParams.getState();
    if (!bypassCheck && maxTokens > (ci?.hardware_safe_limit || 8192)) {
      openOverflowModal(ci?.hardware_safe_limit || 8192, maxTokens, () => handleSendRef.current(true));
      return;
    }

    const userMessage = currentInput.trim();
    setInput('');
    setResearchEvents([]);
    researchEventsRef.current = [];
    const msgs = messagesRef.current;
    const isFirstMessage = msgs.length === 0;
    const pendingAttach = attachedFileRef.current;
    const updatedMessages: Message[] = [
      ...msgs,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: userMessage,
        ...(pendingAttach ? { attachment: { name: pendingAttach.name, path: pendingAttach.path } } : {}),
      },
    ];
    session.setMessages(updatedMessages);
    setIsThinking(true);
    await updateActiveSessionInList(updatedMessages);
    if (isFirstMessage) {
      await autoNameChatRef.current(userMessage);
    }
    const attachmentPath = pendingAttach?.path;
    setAttachedFile(null);
    invokeStream(userMessage, updatedMessages, attachmentPath);
  }, [isThinking, isStreaming, openOverflowModal, session, updateActiveSessionInList, invokeStream, setInput, setAttachedFile, inputRef, attachedFileRef]);
  handleSendRef.current = handleSend;

  const handleRegenerate = useCallback(async (messageId?: string) => {
    if (isThinking || isStreaming) return;
    const msgs = messagesRef.current;
    
    let lastUserIdx = -1;
    if (messageId) {
      const aiIdx = msgs.findIndex(m => m.id === messageId);
      if (aiIdx !== -1) {
        // Find the user message just before this AI message
        for (let i = aiIdx - 1; i >= 0; i--) {
          if (msgs[i].role === 'user') {
            lastUserIdx = i;
            break;
          }
        }
      }
    } else {
      lastUserIdx = msgs.reduceRight(
        (found, m, i) => found !== -1 ? found : (m.role === 'user' ? i : -1), -1
      );
    }

    if (lastUserIdx === -1) return;
    const userMsg = msgs[lastUserIdx];
    const truncated = msgs.slice(0, lastUserIdx + 1);
    session.setMessages(truncated);
    setResearchEvents([]);
    researchEventsRef.current = [];
    setIsThinking(true);
    await updateActiveSessionInList(truncated);
    invokeStream(userMsg.content, truncated);
  }, [isThinking, isStreaming, invokeStream, session, updateActiveSessionInList]);

  const handleEditResend = useCallback(async (messageId: string, newContent: string) => {
    if (isThinking || isStreaming) return;
    const msgs = messagesRef.current;
    const idx = msgs.findIndex(m => m.id === messageId);
    if (idx === -1) return;
    const editedMessage: Message = { ...msgs[idx], content: newContent };
    const truncated = [...msgs.slice(0, idx), editedMessage];
    session.setMessages(truncated);
    setResearchEvents([]);
    researchEventsRef.current = [];
    setIsThinking(true);
    await updateActiveSessionInList(truncated);
    invokeStream(newContent, truncated);
  }, [isThinking, isStreaming, invokeStream, session, updateActiveSessionInList]);

  const applyTitle = useCallback((sessionId: string, cleanTitle: string) => {
    pendingAutoTitleBySessionIdRef.current.set(sessionId, cleanTitle);
    setRecentChats((prev: ChatSession[]) => {
      const chat = prev.find(c => c.id === sessionId);
      if (!chat) return prev;
      const updated = { ...chat, title: cleanTitle };
      void invoke('save_chat', { chat: updated });
      return prev.map(c => c.id === sessionId ? updated : c);
    });
  }, [setRecentChats]);

  const autoNameChat = useCallback(async (userMessage: string) => {
    const sessionId = session.activeSessionIdRef.current;
    if (!sessionId || !selectedModel || !selectedProvider) return;

    // Cloud providers: derive title client-side — no extra API call, no quota hit.
    if (CLOUD_PROVIDERS.has(selectedProvider)) {
      const cleanTitle = deriveClientTitle(userMessage);
      if (cleanTitle && cleanTitle.length <= 80) {
        applyTitle(sessionId, cleanTitle);
      }
      return;
    }

    // Local models are already in memory — free to ask for a better title.
    try {
      const title = await invoke<string>('send_message', {
        prompt: `Give this chat a 4-6 word title based on the opening message. Reply with ONLY the title — no quotes, no punctuation, no explanation.\n\nMessage: "${userMessage.substring(0, 300)}"`,
        model: selectedModel,
        provider: selectedProvider,
        conversationHistory: [],
        systemPrompt: 'You are a chat title generator. Reply with only a concise title.',
        maxTokens: 256,
      });
      const cleanTitle = title.trim().replace(/^["'\s]+|["'\s]+$/g, '').replace(/[.,!?]$/, '');
      if (!cleanTitle || cleanTitle.length > 80) return;
      applyTitle(sessionId, cleanTitle);
    } catch {
      // Silent fail — client-side fallback title was not needed (local model only path)
    }
  }, [selectedModel, selectedProvider, session.activeSessionIdRef, applyTitle]);
  autoNameChatRef.current = autoNameChat;

  return {
    isThinking,
    researchEvents,
    handleSend,
    handleStop,
    handleRegenerate,
    handleEditResend,
    invokeStream,
  };
}
