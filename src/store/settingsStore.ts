import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Settings, DEFAULT_SETTINGS } from '../models';

interface SettingsState extends Settings {
  setBlockDuration: (duration: number) => void;
  setBreakDuration: (duration: number) => void;
  setLongBreakDuration: (duration: number) => void;
  setBlocksUntilLongBreak: (count: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  resetToDefaults: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setBlockDuration: (duration) => set({ blockDuration: duration }),
      setBreakDuration: (duration) => set({ breakDuration: duration }),
      setLongBreakDuration: (duration) => set({ longBreakDuration: duration }),
      setBlocksUntilLongBreak: (count) => set({ blocksUntilLongBreak: count }),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setTheme: (theme) => set({ theme }),
      resetToDefaults: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'sanjou-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
