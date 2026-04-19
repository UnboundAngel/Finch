import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

/**
 * useAudioVisualization
 *
 * Mimics Wispr Flow's bar physics:
 *  - 8 independent bars driven by pseudo-frequency bands
 *  - Per-bar spring: stiffness=35, damping=8 (slightly elastic, no harsh bounce)
 *  - Gaussian taper — center bars get the most energy
 *  - Bars updated via direct DOM writes, zero React re-renders
 */

interface BarSpring {
  pos: number;
  vel: number;
  target: number;
}

const DT = 1 / 60;
const STIFFNESS = 35;
const DAMPING = 8;
const DECAY = 0.80; // how fast targets fall off when quiet
const GAIN = 6.0;   // amplitude sensitivity
const FLOOR = 0.06; // idle minimum scaleY

// Gaussian taper: bar i out of N, centered
function gaussianTaper(i: number, n: number): number {
  const center = (n - 1) / 2;
  const sigma = n / 3.5;
  return Math.exp(-((i - center) ** 2) / (2 * sigma ** 2));
}

// Each bar has a pseudo-frequency multiplier that drifts slowly
// to simulate independent frequency band behaviour
function makeFreqMultipliers(n: number): Float32Array {
  const arr = new Float32Array(n);
  for (let i = 0; i < n; i++) arr[i] = 0.6 + Math.random() * 0.8;
  return arr;
}

export const useAudioVisualization = (isActive: boolean, numberOfBars: number = 8) => {
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!isActive) {
      barRefs.current.forEach((el) => {
        if (el) {
          el.style.transform = `scaleY(${FLOOR})`;
        }
      });
      return;
    }

    let rafId = 0;
    let pollTick = 0;
    let rawVolume = 0;

    // Per-bar spring state
    const springs: BarSpring[] = Array.from({ length: numberOfBars }, () => ({
      pos: FLOOR,
      vel: 0,
      target: FLOOR,
    }));

    // Each bar has a static frequency-band multiplier + a slow drift phase
    const freqMult = makeFreqMultipliers(numberOfBars);
    const phases = new Float32Array(numberOfBars).map(() => Math.random() * Math.PI * 2);
    let t = 0;

    const update = () => {
      t += DT;
      pollTick += 1;

      // Poll Rust for the microphone level every other frame
      if (pollTick % 2 === 0) {
        void invoke<number>('get_voice_meter_level')
          .then((v) => { if (typeof v === 'number' && Number.isFinite(v)) rawVolume = v; })
          .catch(() => {});
      }

      const scaledVol = Math.min(1, rawVolume * GAIN);

      for (let i = 0; i < numberOfBars; i++) {
        const taper = gaussianTaper(i, numberOfBars);

        // Slow drift of each bar's freq multiplier (+/- 15%) for organic independence
        const drift = 1 + 0.15 * Math.sin(t * 1.8 + phases[i]);
        const bandEnergy = scaledVol * freqMult[i] * drift * taper;

        // Target: scaled energy + small noise floor jitter
        const jitter = scaledVol > 0.05 ? (Math.random() - 0.5) * 0.04 : 0;
        springs[i].target = Math.max(FLOOR, bandEnergy + jitter);

        // Apply spring physics
        const displacement = springs[i].pos - springs[i].target;
        const springForce = -STIFFNESS * displacement;
        const dampingForce = -DAMPING * springs[i].vel;
        springs[i].vel += (springForce + dampingForce) * DT;
        springs[i].pos += springs[i].vel * DT;
        springs[i].pos = Math.max(0, springs[i].pos);

        // When quiet, decay targets gently back to floor
        if (scaledVol < 0.05) {
          springs[i].target = FLOOR + (springs[i].target - FLOOR) * DECAY;
        }

        const el = barRefs.current[i];
        if (el) {
          el.style.transform = `scaleY(${springs[i].pos.toFixed(3)})`;
        }
      }

      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [isActive, numberOfBars]);

  return barRefs;
};
