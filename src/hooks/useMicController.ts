import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { getTauriInvoke } from '@/src/lib/tauri-utils';
import { useVoiceTranscription } from '@/src/hooks/useVoiceTranscription';
import { useChatStore } from '@/src/store';

export function useMicController(
  setInput: (val: string | ((prev: string) => string)) => void,
  isListening?: boolean,
  setIsListening?: (val: boolean) => void
) {
  // Store Controlled Settings
  const holdToRecord = useChatStore(state => state.holdToRecord);
  const setHoldToRecord = useChatStore(state => state.setHoldToRecord);
  const selectedDevice = useChatStore(state => state.selectedMicDevice);
  const setSelectedDevice = useChatStore(state => state.setSelectedMicDevice);

  // Controlled Menu States
  const [isMicMenuOpen, setIsMicMenuOpen] = useState(false);
  const [isMicHovering, setIsMicHovering] = useState(false);
  
  // Mic Data
  const [audioDevices, setAudioDevices] = useState<string[]>([]);
  const [meterLevel, setMeterLevel] = useState(0);

  const [micMenuPos, setMicMenuPos] = useState<{ bottom: number; right: number } | null>(null);
  
  const micMenuRef = useRef<HTMLDivElement>(null);
  const micPillRef = useRef<HTMLDivElement>(null);

  const fetchDevices = useCallback(async () => {
    try {
      const invoke = await getTauriInvoke();
      if (!invoke) {
        setAudioDevices([]);
        return;
      }
      const devices = await invoke<string[]>('list_audio_devices');
      setAudioDevices(devices);
      if (!selectedDevice && devices.length > 0) {
        setSelectedDevice(devices[0]);
      }
    } catch (err) {
      console.error("Failed to list audio devices:", err);
    }
  }, [selectedDevice, setSelectedDevice]);

  const {
    installedModels,
    downloadingModels,
    isMarketplaceOpen,
    setIsMarketplaceOpen,
    downloadModel,
    startRecording,
    stopRecording,
    status
  } = useVoiceTranscription((text) => {
    const trimmedText = text?.trim();
    // Guard against empty results, blank audio sentinels, or hallucinatory chirping
    const isBlank = !trimmedText || 
                    trimmedText === '[BLANK_AUDIO]' || 
                    trimmedText === '{empty-audio}' || 
                    trimmedText.includes('[Birds chirping]');

    if (!isBlank) {
      // Append text WITHOUT triggering auto-send
      setInput(prev => prev ? `${prev} ${trimmedText}` : trimmedText);
      toast.success("Transcription added!");
    } else {
      // No audio detected guard
      toast.error("No audio detected!", { 
        duration: 2500,
        position: 'bottom-center'
      });
    }
  });

  const isMicEnabled = installedModels.length > 0;
  const isTranscribing = status === 'transcribing';

  const handleMicClick = useCallback(() => {
    if (holdToRecord) return;
    if (!isMicEnabled) {
      setIsMarketplaceOpen(true);
    } else {
      if (isListening) {
        stopRecording();
        setIsListening?.(false);
      } else {
        startRecording();
        setIsListening?.(true);
      }
    }
  }, [holdToRecord, isMicEnabled, isListening, startRecording, stopRecording, setIsListening, setIsMarketplaceOpen]);

  const startVoiceCapture = useCallback(() => {
    if (!isMicEnabled) {
      setIsMarketplaceOpen(true);
      return;
    }
    if (!isListening) {
      startRecording();
      setIsListening?.(true);
    }
  }, [isMicEnabled, isListening, startRecording, setIsListening, setIsMarketplaceOpen]);

  const stopVoiceCapture = useCallback(() => {
    if (isListening) {
      stopRecording();
      setIsListening?.(false);
    }
  }, [isListening, stopRecording, setIsListening]);

  const handleMicSettingsToggle = useCallback(() => {
    if (!isMicEnabled) return;
    if (isMicMenuOpen) {
      setIsMicMenuOpen(false);
    } else {
      fetchDevices();
      setIsMicMenuOpen(true);
    }
  }, [isMicEnabled, isMicMenuOpen, fetchDevices]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!holdToRecord || !isMicEnabled) return;
      if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        startVoiceCapture();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!holdToRecord || !isMicEnabled) return;
      if (e.key.toLowerCase() === 'd') {
        stopVoiceCapture();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [holdToRecord, isMicEnabled, isListening, startVoiceCapture, stopVoiceCapture]);

  useEffect(() => {
    if (!isMicMenuOpen) {
      setMicMenuPos(null);
      return;
    }
    if (micPillRef.current) {
      const rect = micPillRef.current.getBoundingClientRect();
      setMicMenuPos({
        bottom: window.innerHeight - rect.top + 8,
        right: window.innerWidth - rect.right,
      });
    }
    const handler = (e: MouseEvent) => {
      if (
        micMenuRef.current && !micMenuRef.current.contains(e.target as Node) &&
        micPillRef.current && !micPillRef.current.contains(e.target as Node)
      ) {
        setIsMicMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isMicMenuOpen]);

  useEffect(() => {
    if (!isMicMenuOpen) {
      setMeterLevel(0);
      void getTauriInvoke().then((invoke) => invoke?.('stop_voice_preview'));
      return;
    }
    void getTauriInvoke().then((invoke) => invoke?.('start_voice_preview')).catch((e) => console.error('[voice preview] start failed:', e));
    const id = window.setInterval(async () => {
      try {
        const invoke = await getTauriInvoke();
        if (!invoke) {
          setMeterLevel(0);
          return;
        }
        const level = await invoke<number>('get_voice_meter_level');
        setMeterLevel(Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0);
      } catch {
        setMeterLevel(0);
      }
    }, 60);
    return () => {
      window.clearInterval(id);
      void getTauriInvoke().then((invoke) => invoke?.('stop_voice_preview'));
    };
  }, [isMicMenuOpen]);

  return {
    audioDevices,
    selectedDevice,
    setSelectedDevice,
    meterLevel,
    isMicMenuOpen,
    setIsMicMenuOpen,
    isMicHovering,
    setIsMicHovering,
    holdToRecord,
    setHoldToRecord,
    micMenuPos,
    micMenuRef,
    micPillRef,
    handleMicClick,
    startVoiceCapture,
    stopVoiceCapture,
    handleMicSettingsToggle,
    installedModels,
    downloadingModels,
    isMarketplaceOpen,
    setIsMarketplaceOpen,
    downloadModel,
    isMicEnabled,
    isTranscribing,
  };
}
