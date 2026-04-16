import { useState, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';

/**
 * useAudioVisualization
 * Listens for real-time volume events from the Rust backend.
 * Resolve device conflicts by sharing the backend's audio stream.
 * @param isActive - Whether the visualization should be active.
 * @param numberOfBars - How many bars to return.
 */
export const useAudioVisualization = (isActive: boolean, numberOfBars: number = 13) => {
  const [levels, setLevels] = useState<number[]>(new Array(numberOfBars).fill(0.05));
  const currentVolumeRef = useRef<number>(0);
  const targetVolumeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      setLevels(new Array(numberOfBars).fill(0.05));
      return;
    }

    // Listen for volume events from the Rust backend
    const unlistenPromise = listen<number>('voice-volume', (event) => {
      // The event data is a normalized volume (0.0 to 1.0)
      targetVolumeRef.current = event.payload;
    });

    // Animation loop for smooth decaying and "jitter"
    // This creates an organic feel even if the event frequency is low
    const update = () => {
      // Smoothly interpolate towards the target volume
      // 0.2 factor for fast response, 0.1 for slow decay
      const lerpFactor = targetVolumeRef.current > currentVolumeRef.current ? 0.3 : 0.15;
      currentVolumeRef.current += (targetVolumeRef.current - currentVolumeRef.current) * lerpFactor;

      // Decay the target volume constantly so it drops when no events arrive
      targetVolumeRef.current *= 0.92;

      // Generate the bars (pseudo-spectrum)
      // Index 0 is highest energy (bass), decaying towards higher indices
      const newLevels = new Array(numberOfBars).fill(0).map((_, i) => {
        // Linear decay factor for pseudo-spectrum
        const spectralFactor = Math.max(0.3, 1 - (i / numberOfBars));
        
        // Add a tiny bit of random jitter for that "live" look
        const jitter = (Math.random() - 0.5) * 0.04;
        
        // Calculate final bar height
        const height = (currentVolumeRef.current * spectralFactor) + jitter;
        
        // Enforce the 'floor' (0.12) requested so dots never delete
        return Math.max(0.12, height);
      });

      setLevels(newLevels);
      animationFrameRef.current = requestAnimationFrame(update);
    };

    animationFrameRef.current = requestAnimationFrame(update);

    return () => {
      unlistenPromise.then(unlisten => unlisten());
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isActive, numberOfBars]);

  return levels;
};
