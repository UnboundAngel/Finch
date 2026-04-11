import { useEffect, useRef } from 'react';
import { ChatSession } from '../types/chat';

interface UseChatPersistenceProps {
  recentChats: ChatSession[];
  setRecentChats: (chats: ChatSession[]) => void;
  profileName: string;
  setProfileName: (name: string) => void;
  profileEmail: string;
  setProfileEmail: (email: string) => void;
  enterToSend: boolean;
  setEnterToSend: (enter: boolean) => void;
}

export const useChatPersistence = ({
  recentChats,
  setRecentChats,
  profileName,
  setProfileName,
  profileEmail,
  setProfileEmail,
  enterToSend,
  setEnterToSend,
}: UseChatPersistenceProps) => {
  const isLoaded = useRef(false);

  // Initial Load
  useEffect(() => {
    const savedChats = localStorage.getItem('finch_chats');
    if (savedChats) {
      try {
        const parsed = JSON.parse(savedChats);
        const migrated = parsed.map((chat: any) => ({
          ...chat,
          pinned: chat.pinned ?? false,
          incognito: chat.incognito ?? false,
          systemPrompt: chat.systemPrompt ?? '',
          generationParams: chat.generationParams ?? { temperature: 0.7, maxTokens: 2048, topP: 1.0 },
          stats: chat.stats ?? { totalTokens: 0, totalMessages: chat.messages?.length || 0, averageSpeed: 0 }
        }));
        setRecentChats(migrated);
      } catch (e) {
        console.error('Failed to parse saved chats:', e);
      }
    }

    const savedProfile = localStorage.getItem('finch_profile');
    if (savedProfile) {
      try {
        const { name, email } = JSON.parse(savedProfile);
        if (name) setProfileName(name);
        if (email) setProfileEmail(email);
      } catch (e) {
        console.error('Failed to parse saved profile:', e);
      }
    }

    const savedEnterToSend = localStorage.getItem('finch_enter_to_send');
    if (savedEnterToSend !== null) {
      setEnterToSend(savedEnterToSend === 'true');
    }

    isLoaded.current = true;
  }, [setRecentChats, setProfileName, setProfileEmail, setEnterToSend]);

  // Reactive Save
  useEffect(() => {
    if (!isLoaded.current) return;

    // Filter out incognito chats just in case, though they shouldn't be in recentChats anyway
    const nonIncognitoChats = recentChats.filter(chat => !chat.incognito);
    localStorage.setItem('finch_chats', JSON.stringify(nonIncognitoChats));

    localStorage.setItem('finch_profile', JSON.stringify({
      name: profileName,
      email: profileEmail,
    }));

    localStorage.setItem('finch_enter_to_send', enterToSend.toString());
  }, [recentChats, profileName, profileEmail, enterToSend]);
};

