import { useState, useRef, useEffect, useCallback } from 'react';
import { Message, ChatSession } from '../types/chat';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { useChatStore } from '../store';

interface UseChatSessionProps {
  recentChats: ChatSession[];
  setRecentChats: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  activeProfileId: string | null;
}

export function useChatSession({
  recentChats,
  setRecentChats,
  activeProfileId,
}: UseChatSessionProps) {
  const isIncognito = useChatStore(state => state.isIncognito);
  const setIsIncognito = useChatStore(state => state.setIsIncognito);
  const setSelectedModel = useChatStore(state => state.setSelectedModel);
  const setSelectedProvider = useChatStore(state => state.setSelectedProvider);

  const [messages, setMessages] = useState<Message[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const hasInitialized = useRef(false);

  const prevProfileIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      prevProfileIdRef.current !== null &&
      activeProfileId !== null &&
      prevProfileIdRef.current !== activeProfileId
    ) {
      hasInitialized.current = false;
      setActiveSessionId(null);
      setMessages([]);
      setEditingSessionId(null);
    }
    prevProfileIdRef.current = activeProfileId;
  }, [activeProfileId]);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  const handleSwitchSession = useCallback((id: string) => {
    const session = recentChats.find(c => c.id === id);
    if (session) {
      if (isIncognito) setIsIncognito(false);
      setSelectedModel(session.model);
      setSelectedProvider(session.provider);
      setActiveSessionId(id);
      setMessages(session.messages || []);
      toast(`Opened chat: ${session.title}`);
    }
  }, [recentChats, isIncognito, setIsIncognito, setSelectedModel, setSelectedProvider]);

  const handleNewChat = useCallback(() => {
    setActiveSessionId(null);
    setMessages([]);
    if (!isIncognito) toast.info('Started a new chat');
  }, [isIncognito]);

  const handleDeleteChat = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const chatToDelete = recentChats.find(c => c.id === id);
    if (!chatToDelete) return;

    try {
      await invoke('delete_chat', { id });
      setRecentChats(prev => prev.filter(c => c.id !== id));

      if (activeSessionIdRef.current === id) {
        handleNewChat();
      }

      toast('Chat deleted', {
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              const restoredId = await invoke<string>('save_chat', { chat: chatToDelete });
              setRecentChats(prev => {
                const restored = [...prev, { ...chatToDelete, id: restoredId }];
                return restored.sort((a, b) => b.timestamp - a.timestamp);
              });
            } catch (err) {
              console.error('Failed to undo delete:', err);
            }
          }
        },
        duration: 4000
      });
    } catch (err) {
      console.error('Failed to delete chat:', err);
      toast.error('Bro, that chat would not delete, so give it another shot.');
    }
  }, [recentChats, handleNewChat, setRecentChats]);

  const handlePinChat = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const chat = recentChats.find(c => c.id === id);
    if (!chat) return;

    const updatedChat = { ...chat, pinned: !chat.pinned };
    try {
      await invoke('save_chat', { chat: updatedChat });
      setRecentChats(prev => prev.map(c => c.id === id ? updatedChat : c));
    } catch (err) {
      console.error('Failed to pin chat:', err);
    }
  }, [recentChats, setRecentChats]);

  const handleRenameCommit = useCallback(async (id: string) => {
    if (editingTitle.trim()) {
      const chat = recentChats.find(c => c.id === id);
      if (chat) {
        const updatedChat = { ...chat, title: editingTitle.trim() };
        try {
          await invoke('save_chat', { chat: updatedChat });
          setRecentChats(prev => prev.map(c => c.id === id ? updatedChat : c));
        } catch (err) {
          console.error('Failed to rename chat:', err);
        }
      }
    }
    setEditingSessionId(null);
  }, [editingTitle, recentChats, setRecentChats]);

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleRenameCommit(id);
    } else if (e.key === 'Escape') {
      setEditingSessionId(null);
    }
  }, [handleRenameCommit, setEditingSessionId]);

  useEffect(() => {
    if (!activeProfileId) return;
    if (!hasInitialized.current && recentChats.length > 0) {
      hasInitialized.current = true;
      if (!activeSessionId && !isIncognito && messages.length === 0) {
        const mostRecent = recentChats[0];
        setActiveSessionId(mostRecent.id);
        setMessages(mostRecent.messages);
      }
    }
  }, [recentChats, activeSessionId, isIncognito, messages.length, activeProfileId]);

  return {
    messages,
    setMessages,
    activeSessionId,
    setActiveSessionId,
    activeSessionIdRef,
    editingSessionId,
    setEditingSessionId,
    editingTitle,
    setEditingTitle,
    handleSwitchSession,
    handleNewChat,
    handleDeleteChat,
    handlePinChat,
    handleRenameCommit,
    handleRenameKeyDown
  };
}
