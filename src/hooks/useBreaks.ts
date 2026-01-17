import { useState, useEffect, useCallback } from 'react';
import { addBreak, updateBreak, subscribeToBreaks, breaksArray } from '../sync/yjsProvider';
import { generateId } from '../models';
import type { Break } from '../models';

interface UseBreaksReturn {
  breaks: Break[];
  startBreak: (duration: number) => Break;
  endBreak: (id: string, notes?: string) => void;
  getBreak: (id: string) => Break | undefined;
}

export const useBreaks = (): UseBreaksReturn => {
  const [breaks, setBreaks] = useState<Break[]>(() => breaksArray.toArray());

  useEffect(() => {
    const unsubscribe = subscribeToBreaks(setBreaks);
    return unsubscribe;
  }, []);

  const startBreak = useCallback((duration: number): Break => {
    const breakItem: Break = {
      id: generateId(),
      startedAt: Date.now(),
      duration,
    };
    addBreak(breakItem);
    return breakItem;
  }, []);

  const endBreak = useCallback((id: string, notes?: string) => {
    updateBreak(id, {
      endedAt: Date.now(),
      notes,
    });
  }, []);

  const getBreak = useCallback((id: string): Break | undefined => {
    return breaks.find(b => b.id === id);
  }, [breaks]);

  return {
    breaks,
    startBreak,
    endBreak,
    getBreak,
  };
};
