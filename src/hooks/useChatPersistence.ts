import { useEffect, useRef } from 'react';
import { ChatSession } from '../types/chat';
import { invoke } from '@tauri-apps/api/core';

interface UseChatPersistenceProps {
  recentChats: ChatSession[];
  setRecentChats: (chats: ChatSession[]) => void;
  profileName: string;
  setProfileName: (name: string) => void;
  profileEmail: string;
  setProfileEmail: (email: string) => void;
  enterToSend: boolean;
  setEnterToSend: (enter: boolean) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  selectedProvider: string;
  setSelectedProvider: (provider: string) => void;
  customBgLight: string;
  setCustomBgLight: (path: string) => void;
  customBgDark: string;
  setCustomBgDark: (path: string) => void;
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
  selectedModel,
  setSelectedModel,
  selectedProvider,
  setSelectedProvider,
  customBgLight,
  setCustomBgLight,
  customBgDark,
  setCustomBgDark,
}: UseChatPersistenceProps) => {
  const isLoaded = useRef(false);

  // Initial Load & Migration
  useEffect(() => {
    const loadAndMigrate = async () => {
      try {
        // 1. Load settings from Tauri store
        const config: any = await invoke('get_provider_config');
        if (config) {
          if (config.enter_to_send !== undefined) setEnterToSend(config.enter_to_send);
          if (config.selected_model) setSelectedModel(config.selected_model);
          if (config.selected_provider) setSelectedProvider(config.selected_provider);
        } else {
          const savedEnterToSend = localStorage.getItem('finch_enter_to_send');
          if (savedEnterToSend !== null) {
            setEnterToSend(savedEnterToSend === 'true');
          }
        }

        // 2. Load chats from individual files via Rust
        let chats = await invoke<ChatSession[]>('list_chats');

        // 3. Migration from localStorage if needed
        const legacyChatsStr = localStorage.getItem('finch_chats');
        if (legacyChatsStr) {
          try {
            const legacyChats = JSON.parse(legacyChatsStr);
            if (Array.isArray(legacyChats) && legacyChats.length > 0) {
              console.log(`Migrating ${legacyChats.length} legacy chats to individual files...`);
              for (const chat of legacyChats) {
                // Ensure chat has required fields for the new format
                const migratedChat: ChatSession = {
                  ...chat,
                  created_at: chat.created_at || Date.now(),
                  updated_at: chat.updated_at || Date.now(),
                  pinned: chat.pinned ?? false,
                  incognito: chat.incognito ?? false,
                  systemPrompt: chat.systemPrompt ?? '',
                  generationParams: chat.generationParams ?? { temperature: 0.7, maxTokens: 2048, topP: 1.0 },
                  stats: chat.stats ?? { totalTokens: 0, totalMessages: chat.messages?.length || 0, averageSpeed: 0 }
                };

                // Only migrate non-incognito chats
                if (!migratedChat.incognito) {
                  await invoke('save_chat', { chat: migratedChat });
                }
              }
              // Reload chat list after migration
              chats = await invoke<ChatSession[]>('list_chats');
              // Clear legacy data
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

        setRecentChats(chats);
      } catch (e) {
        console.error('Failed to load persisted data:', e);
      } finally {
        isLoaded.current = true;
      }
    };

    loadAndMigrate();
  }, [setRecentChats, setProfileName, setProfileEmail, setEnterToSend, setSelectedModel, setSelectedProvider, setCustomBgLight, setCustomBgDark]);

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
          }
        });
      } catch (e) {
        console.error('Failed to save settings:', e);
      }
    };

    saveSettings();
  }, [enterToSend, selectedModel, selectedProvider]);
};
