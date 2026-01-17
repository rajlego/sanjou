import { useCallback, useRef } from 'react';
import { useSettingsStore } from '../store/settingsStore';

interface UseAudioReturn {
  playBlockComplete: () => void;
  playBreakComplete: () => void;
  playClick: () => void;
  playError: () => void;
}

export const useAudio = (): UseAudioReturn => {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const audioContextRef = useRef<AudioContext | null>(null);

  const getContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback(
    (frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) => {
      if (!soundEnabled) return;

      const ctx = getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    },
    [soundEnabled, getContext]
  );

  const playBlockComplete = useCallback(() => {
    if (!soundEnabled) return;

    const ctx = getContext();
    const now = ctx.currentTime;

    // Ascending triumphant tones
    [800, 1000, 1200].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = freq;
      osc.type = 'sine';

      const startTime = now + i * 0.12;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }, [soundEnabled, getContext]);

  const playBreakComplete = useCallback(() => {
    if (!soundEnabled) return;

    const ctx = getContext();
    const now = ctx.currentTime;

    // Gentle double beep
    [600, 800].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = freq;
      osc.type = 'sine';

      const startTime = now + i * 0.15;
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  }, [soundEnabled, getContext]);

  const playClick = useCallback(() => {
    playTone(1200, 0.05, 'square', 0.1);
  }, [playTone]);

  const playError = useCallback(() => {
    if (!soundEnabled) return;

    const ctx = getContext();
    const now = ctx.currentTime;

    // Descending error tones
    [400, 300].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = freq;
      osc.type = 'square';

      const startTime = now + i * 0.1;
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });
  }, [soundEnabled, getContext]);

  return {
    playBlockComplete,
    playBreakComplete,
    playClick,
    playError,
  };
};
