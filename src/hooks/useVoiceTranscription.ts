import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { WhisperModel } from '../components/chat/ModelMarketplace';
import { useChatStore } from '../store';
import { getTauriInvoke, isTauri } from '@/src/lib/tauri-utils';

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
        const invoke = await getTauriInvoke();
        if (!invoke) {
          setInstalledModels([]);
          return;
        }
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
          const invoke = await getTauriInvoke();
          if (!invoke) return;
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
            toast.error(`Bro, transcription went rogue for a sec: ${currentStatus.data}`);
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
      if (!isTauri()) return;
      const { listen } = await import('@tauri-apps/api/event');
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
      const invoke = await getTauriInvoke();
      if (!invoke) {
        toast.error('Voice model downloads are only available in desktop mode');
        return;
      }
      setDownloadingModels(prev => ({ ...prev, [model.id]: 0 }));
      await invoke('download_voice_model', { manifest: model });
    } catch (err: any) {
      setDownloadingModels(prev => {
        const next = { ...prev };
        delete next[model.id];
        return next;
      });
      toast.error(`Bro, that model download face-planted: ${err}`);
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (installedModels.length === 0) {
      setIsMarketplaceOpen(true);
      return;
    }
    try {
      const invoke = await getTauriInvoke();
      if (!invoke) {
        toast.error('Recording is only available in desktop mode');
        return;
      }
      await invoke('start_recording');
      setIsRecording(true);
      setStatus('recording');
    } catch (err: any) {
      toast.error(`Bro, recording never started, so hit it again: ${err}`);
    }
  }, [installedModels]);

  const stopRecording = useCallback(async (modelId?: string) => {
    try {
      const invoke = await getTauriInvoke();
      if (!invoke) {
        setIsRecording(false);
        setStatus('idle');
        return;
      }
      setStatus('transcribing');
      setIsRecording(false);
      const selectedModel = modelId || installedModels[0];
      await invoke('stop_recording', { modelId: selectedModel });
    } catch (err: any) {
      toast.error(`Bro, recording did not stop cleanly: ${err}`);
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
