import { useState, useEffect, useCallback } from 'react';
import {
  getTaskNotes,
  setTaskNotes,
  subscribeToTaskNotes,
  taskNotesMap,
} from '../sync/yjsProvider';

interface UseTaskNotesReturn {
  notes: Map<string, string>;
  getNotesForTask: (taskContent: string) => string | undefined;
  saveNotes: (taskContent: string, notes: string) => void;
  hasNotes: (taskContent: string) => boolean;
}

export const useTaskNotes = (): UseTaskNotesReturn => {
  const [notes, setNotes] = useState<Map<string, string>>(
    new Map(taskNotesMap.entries())
  );

  useEffect(() => {
    const unsubscribe = subscribeToTaskNotes(setNotes);
    return unsubscribe;
  }, []);

  const getNotesForTask = useCallback((taskContent: string): string | undefined => {
    return getTaskNotes(taskContent);
  }, []);

  const saveNotes = useCallback((taskContent: string, notesText: string) => {
    setTaskNotes(taskContent, notesText);
  }, []);

  const hasNotes = useCallback((taskContent: string): boolean => {
    const existing = notes.get(taskContent);
    return !!existing && existing.trim().length > 0;
  }, [notes]);

  return {
    notes,
    getNotesForTask,
    saveNotes,
    hasNotes,
  };
};
