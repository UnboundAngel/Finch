import { useState, useEffect, useCallback, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { WhisperModel } from '../components/chat/ModelMarketplace';
import { useChatStore } from '../store';

interface DownloadProgressEvent {
  id: string;
  progress: number;
  total_bytes: number;
  current_bytes: number;
}

export const useVoiceTranscription = (onTranscriptionComplete?: (text: string) => void) => {
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const status = useChatStore(state => state.voiceStatus);
  const setStatus = useChatStore(state => state.setVoiceStatus);
  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [downloadingModels, setDownloadingModels] = useState<Record<string, number>>({});
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);

  // Check which models are already downloaded on mount
  useEffect(() => {
    const checkModels = async () => {
      try {
        const models = await invoke<string[]>('list_downloaded_voice_models');
        setInstalledModels(models);
      } catch (err) {
        console.error("Failed to check models:", err);
      }
    };
    checkModels();
  }, []);

  // Polling for transcription result
  useEffect(() => {
    if (status === 'transcribing') {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const currentStatus = await invoke<any>('get_transcription_status');
          if (currentStatus.status === 'Completed') {
            const text = currentStatus.data;
            if (onTranscriptionComplete) {
              onTranscriptionComplete(text);
            }
            setStatus('idle');
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          } else if (currentStatus.status === 'Error') {
            toast.error(`Transcription failed: ${currentStatus.data}`);
            setStatus('idle');
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        } catch (err) {
          console.error("Failed to poll transcription status:", err);
        }
      }, 500);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    };
  }, [status, onTranscriptionComplete]);

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
      setIsRecording(false);
      const selectedModel = modelId || installedModels[0];
      await invoke('stop_recording', { modelId: selectedModel });
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
