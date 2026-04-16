import { useState, useEffect, useRef } from 'react';

/**
 * useAudioVisualization
 * Captures microphone input and provides real-time frequency data for a waveform.
 * @param isActive - Whether the audio capture should be running.
 * @param numberOfBars - How many frequency 'bins' to return.
 */
export const useAudioVisualization = (isActive: boolean, numberOfBars: number = 13) => {
  const [levels, setLevels] = useState<number[]>(new Array(numberOfBars).fill(0));
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!isActive) {
      cleanup();
      return;
    }

    const startAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        // A smaller fftSize gives us enough bins for a smooth visualizer
        analyser.fftSize = 64; 
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateLevels = () => {
          if (!analyserRef.current) return;
          
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Map frequency data to our desired number of bars
          const normalizedLevels: number[] = [];
          const stepSize = Math.floor(bufferLength / numberOfBars) || 1;
          
          for (let i = 0; i < numberOfBars; i++) {
            // Sample frequency data and normalize (0 to 1)
            // We use a slight shift to ignore very low frequencies (sub-bass/rumble)
            const index = i * stepSize;
            const value = dataArray[index] / 255.0;
            
            // Add a "minimum" height for a subtle floating look even when quiet
            const clampedValue = Math.max(0.05, value);
            normalizedLevels.push(clampedValue);
          }
          
          setLevels(normalizedLevels);
          animationFrameRef.current = requestAnimationFrame(updateLevels);
        };

        updateLevels();
      } catch (err) {
        console.error("Failed to access microphone:", err);
        // Fallback breathing animation on error
        startFallbackAnimation();
      }
    };

    startAudio();

    return cleanup;
  }, [isActive, numberOfBars]);

  const startFallbackAnimation = () => {
    let t = 0;
    const update = () => {
      t += 0.05;
      const breathing = new Array(numberOfBars).fill(0).map((_, i) => 
        0.1 + Math.sin(t + i * 0.3) * 0.05
      );
      setLevels(breathing);
      animationFrameRef.current = requestAnimationFrame(update);
    };
    animationFrameRef.current = requestAnimationFrame(update);
  };

  const cleanup = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    setLevels(new Array(numberOfBars).fill(0));
  };

  return levels;
};
