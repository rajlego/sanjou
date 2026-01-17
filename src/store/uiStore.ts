import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TimerState, BlockMeta, SyncState } from '../models';

type View = 'block' | 'tasks' | 'history' | 'settings' | 'stats';

interface UIState {
  // Navigation
  currentView: View;
  setCurrentView: (view: View) => void;

  // Current block state
  currentBlockId: string | null;
  setCurrentBlockId: (id: string | null) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;

  // Timer state (not the time itself, just the state)
  timerState: TimerState;
  setTimerState: (state: TimerState) => void;

  // Meta checklist (current, pre-block)
  currentMeta: BlockMeta;
  setMetaItem: (key: keyof BlockMeta, value: boolean) => void;
  resetMeta: () => void;

  // Break state
  isOnBreak: boolean;
  setIsOnBreak: (value: boolean) => void;
  currentBreakId: string | null;
  setCurrentBreakId: (id: string | null) => void;

  // Modals
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  showTaskPicker: boolean;
  setShowTaskPicker: (show: boolean) => void;
  showShortcuts: boolean;
  setShowShortcuts: (show: boolean) => void;

  // Sync state (from firebase)
  syncState: SyncState;
  setSyncState: (state: SyncState) => void;

  // Data loaded flag
  dataLoaded: boolean;
  setDataLoaded: (loaded: boolean) => void;
}

const emptyMeta: BlockMeta = {
  finishLinePictured: false,
  notInterrupted: false,
  committedToFocus: false,
  phoneSeparate: false,
  celebrated: false,
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Navigation
      currentView: 'block',
      setCurrentView: (view) => set({ currentView: view }),

      // Current block
      currentBlockId: null,
      setCurrentBlockId: (id) => set({ currentBlockId: id }),
      selectedTaskId: null,
      setSelectedTaskId: (id) => set({ selectedTaskId: id }),

      // Timer
      timerState: 'idle',
      setTimerState: (state) => set({ timerState: state }),

      // Meta checklist
      currentMeta: { ...emptyMeta },
      setMetaItem: (key, value) =>
        set((state) => ({
          currentMeta: { ...state.currentMeta, [key]: value },
        })),
      resetMeta: () => set({ currentMeta: { ...emptyMeta } }),

      // Break
      isOnBreak: false,
      setIsOnBreak: (value) => set({ isOnBreak: value }),
      currentBreakId: null,
      setCurrentBreakId: (id) => set({ currentBreakId: id }),

      // Modals
      showSettings: false,
      setShowSettings: (show) => set({ showSettings: show }),
      showTaskPicker: false,
      setShowTaskPicker: (show) => set({ showTaskPicker: show }),
      showShortcuts: false,
      setShowShortcuts: (show) => set({ showShortcuts: show }),

      // Sync
      syncState: 'offline',
      setSyncState: (state) => set({ syncState: state }),

      // Data
      dataLoaded: false,
      setDataLoaded: (loaded) => set({ dataLoaded: loaded }),
    }),
    {
      name: 'sanjou-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentView: state.currentView,
        selectedTaskId: state.selectedTaskId,
      }),
    }
  )
);
