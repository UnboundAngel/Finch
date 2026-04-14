import { useState, useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { WhisperModel, WHISPER_MODELS } from '../components/chat/ModelMarketplace';

export interface DownloadProgressEvent {
  id: string;
  progress: f64;
  total_bytes: u64;
  current_bytes: u64;
}

export const useVoiceTranscription = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [downloadingModels, setDownloadingModels] = useState<Record<string, number>>({});
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);

  // Check which models are already downloaded on mount
  useEffect(() => {
    const checkModels = async () => {
      // In a real app, we'd have an invoke to check existing files
      // For now, let's assume we check on mount or after downloads
      // We'll implementation this backend-side in Phase 13.3 or similar
      // For this POC, we'll just track state in-memory or check files if command exists
      try {
        // Mocking for now, will implement Rust side if needed
        // const models = await invoke<string[]>('list_downloaded_voice_models');
        // setInstalledModels(models);
      } catch (err) {
        console.error("Failed to check models:", err);
      }
    };
    checkModels();
  }, []);

  // Listen for download progress from Rust
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      unlisten = await listen<DownloadProgressEvent>('download-progress', (event) => {
        const { id, progress } = event.payload;
        setDownloadingModels(prev => ({
          ...prev,
          [id]: progress
        }));

        if (progress >= 100) {
          // Wrap up download
          setDownloadingModels(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
          setInstalledModels(prev => [...new Set([...prev, id])]);
          toast.success(`Model ${id} installed successfully!`);
        }
      });
    };

    setupListener();
    return () => { if (unlisten) unlisten(); };
  }, []);

  const downloadModel = useCallback(async (model: WhisperModel) => {
    try {
      setDownloadingModels(prev => ({ ...prev, [model.id]: 0 }));
      await invoke('download_voice_model', { manifest: model });
    } catch (err: any) {
      setDownloadingModels(prev => {
        const next = { ...prev };
        delete next[model.id];
        return next;
      });
      toast.error(`Failed to download model: ${err}`);
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (installedModels.length === 0) {
      setIsMarketplaceOpen(true);
      return;
    }
    try {
      await invoke('start_recording');
      setIsRecording(true);
      setStatus('recording');
    } catch (err: any) {
      toast.error(`Failed to start recording: ${err}`);
    }
  }, [installedModels]);

  const stopRecording = useCallback(async (modelId?: string) => {
    try {
      setStatus('transcribing');
      const selectedModel = modelId || installedModels[0];
      await invoke('stop_recording', { modelId: selectedModel });
      // Logic to poll status would go here or in a separate effect
      setIsRecording(false);
      setStatus('idle');
    } catch (err: any) {
      toast.error(`Failed to stop recording: ${err}`);
      setIsRecording(false);
      setStatus('idle');
    }
  }, [installedModels]);

  return {
    isRecording,
    status,
    installedModels,
    downloadingModels,
    isMarketplaceOpen,
    setIsMarketplaceOpen,
    downloadModel,
    startRecording,
    stopRecording
  };
};
