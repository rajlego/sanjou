import { useState, useEffect, useRef, useCallback } from 'react';
import type { TimerState } from '../models';

interface UseTimerOptions {
  duration: number; // in seconds
  onComplete?: () => void;
  onTick?: (remaining: number) => void;
}

interface UseTimerReturn {
  remaining: number;
  elapsed: number;
  progress: number; // 0 to 1
  state: TimerState;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  toggle: () => void;
}

export const useTimer = ({
  duration,
  onComplete,
  onTick,
}: UseTimerOptions): UseTimerReturn => {
  const [remaining, setRemaining] = useState(duration);
  const [state, setState] = useState<TimerState>('idle');
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (state !== 'idle') return;
    startTimeRef.current = Date.now();
    pausedAtRef.current = null;
    setState('running');
  }, [state]);

  const pause = useCallback(() => {
    if (state !== 'running') return;
    pausedAtRef.current = remaining;
    clearTimer();
    setState('paused');
  }, [state, remaining, clearTimer]);

  const resume = useCallback(() => {
    if (state !== 'paused') return;
    startTimeRef.current = Date.now() - (duration - (pausedAtRef.current || duration)) * 1000;
    setState('running');
  }, [state, duration]);

  const reset = useCallback(() => {
    clearTimer();
    setRemaining(duration);
    setState('idle');
    startTimeRef.current = null;
    pausedAtRef.current = null;
  }, [duration, clearTimer]);

  const toggle = useCallback(() => {
    if (state === 'idle') {
      start();
    } else if (state === 'running') {
      pause();
    } else if (state === 'paused') {
      resume();
    }
  }, [state, start, pause, resume]);

  useEffect(() => {
    if (state === 'running') {
      intervalRef.current = window.setInterval(() => {
        if (!startTimeRef.current) return;

        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const newRemaining = Math.max(0, duration - elapsed);

        setRemaining(newRemaining);
        onTick?.(newRemaining);

        if (newRemaining <= 0) {
          clearTimer();
          setState('completed');
          onComplete?.();
        }
      }, 100); // Update every 100ms for smooth display
    }

    return clearTimer;
  }, [state, duration, onComplete, onTick, clearTimer]);

  // Reset timer when duration changes
  useEffect(() => {
    if (state === 'idle') {
      setRemaining(duration);
    }
  }, [duration, state]);

  const elapsed = duration - remaining;
  const progress = duration > 0 ? elapsed / duration : 0;

  return {
    remaining,
    elapsed,
    progress,
    state,
    start,
    pause,
    resume,
    reset,
    toggle,
  };
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
