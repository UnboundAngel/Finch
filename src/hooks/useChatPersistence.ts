import { useEffect, useRef } from 'react';
import { ChatSession } from '../types/chat';
import { invoke } from '@tauri-apps/api/core';

interface UseChatPersistenceProps {
  setRecentChats: (chats: ChatSession[]) => void;
  enterToSend: boolean;
  setEnterToSend: (enter: boolean) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  selectedProvider: string;
  setSelectedProvider: (provider: string) => void;
  /** Active Finch profile — chats are listed and migrated under this id. */
  activeProfileId: string | null;
  /** First profile in store order: pre–profile-id chat files (no `profileId`) appear only for this profile. */
  legacyInboxOwnerProfileId: string | null;
}

export const useChatPersistence = ({
  setRecentChats,
  enterToSend,
  setEnterToSend,
  selectedModel,
  setSelectedModel,
  selectedProvider,
  setSelectedProvider,
  activeProfileId,
  legacyInboxOwnerProfileId,
}: UseChatPersistenceProps) => {
  const isLoaded = useRef(false);
  const migrationRan = useRef(false);

  // Initial settings load, one-time localStorage migration, and profile-scoped chat list
  useEffect(() => {
    const loadAndMigrate = async () => {
      try {
        const config: unknown = await invoke('get_provider_config');
        if (config && typeof config === 'object') {
          const c = config as Record<string, unknown>;
          if (c.enter_to_send !== undefined) setEnterToSend(!!c.enter_to_send);
          if (typeof c.selected_model === 'string') setSelectedModel(c.selected_model);
          if (typeof c.selected_provider === 'string') setSelectedProvider(c.selected_provider);
        } else {
          const savedEnterToSend = localStorage.getItem('finch_enter_to_send');
          if (savedEnterToSend !== null) {
            setEnterToSend(savedEnterToSend === 'true');
          }
        }

        if (!activeProfileId) {
          setRecentChats([]);
          isLoaded.current = true;
          return;
        }

        if (!migrationRan.current) {
          migrationRan.current = true;
          const legacyChatsStr = localStorage.getItem('finch_chats');
          if (legacyChatsStr) {
            try {
              const legacyChats = JSON.parse(legacyChatsStr) as unknown;
              if (Array.isArray(legacyChats) && legacyChats.length > 0) {
                console.log(`Migrating ${legacyChats.length} legacy chats to individual files...`);
                for (const chat of legacyChats) {
                  const migratedChat: ChatSession = {
                    ...(chat as ChatSession),
                    profileId: activeProfileId,
                    created_at: (chat as ChatSession).created_at || Date.now(),
                    updated_at: (chat as ChatSession).updated_at || Date.now(),
                    pinned: (chat as ChatSession).pinned ?? false,
                    incognito: (chat as ChatSession).incognito ?? false,
                    systemPrompt: (chat as ChatSession).systemPrompt ?? '',
                    generationParams:
                      (chat as ChatSession).generationParams ?? {
                        temperature: 0.7,
                        maxTokens: 2048,
                        topP: 1.0,
                      },
                    stats:
                      (chat as ChatSession).stats ?? {
                        totalTokens: 0,
                        totalMessages: (chat as ChatSession).messages?.length || 0,
                        averageSpeed: 0,
                      },
                  };

                  if (!migratedChat.incognito) {
                    await invoke('save_chat', { chat: migratedChat });
                  }
                }
                localStorage.removeItem('finch_chats');
                localStorage.removeItem('finch_profile');
                localStorage.removeItem('finch_enter_to_send');
                localStorage.removeItem('finch_bookmarked_models');
                console.log('Migration complete. LocalStorage cleared.');
              }
            } catch (e) {
              console.error('Failed to migrate legacy chats:', e);
            }
          }
        }

        const chats = await invoke<ChatSession[]>('list_chats', {
          profileId: activeProfileId,
          legacyInboxOwnerProfileId: legacyInboxOwnerProfileId,
        });

        setRecentChats(chats);
        isLoaded.current = true;
      } catch (e) {
        console.error('Failed to load persisted data:', e);
      }
    };

    void loadAndMigrate();
  }, [
    activeProfileId,
    legacyInboxOwnerProfileId,
    setRecentChats,
    setEnterToSend,
    setSelectedModel,
    setSelectedProvider,
  ]);

  // Reactive Save for settings
  useEffect(() => {
    if (!isLoaded.current) return;

    const saveSettings = async () => {
      try {
        await invoke('save_provider_config', {
          config: {
            enter_to_send: enterToSend,
            selected_model: selectedModel,
            selected_provider: selectedProvider,
          },
        });
      } catch (e) {
        console.error('Failed to save settings:', e);
      }
    };

    void saveSettings();
  }, [enterToSend, selectedModel, selectedProvider]);
};
