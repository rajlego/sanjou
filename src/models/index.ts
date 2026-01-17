export interface BlockMeta {
  finishLinePictured: boolean;
  notInterrupted: boolean;
  committedToFocus: boolean;
  phoneSeparate: boolean;
  celebrated: boolean;
}

export interface Block {
  id: string;
  date: string; // YYYY-MM-DD
  startedAt: number;
  completedAt?: number;
  taskId?: string;
  meta: BlockMeta;
  isValid: boolean;
  notes?: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  subtasks: Subtask[];
  completed: boolean;
  createdAt: number;
  modifiedAt: number;
  blocksSpent: number;
  notes?: string;
}

export interface RightNowItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface RightNowList {
  id: string;
  blockId?: string;
  items: RightNowItem[];
  createdAt: number;
}

export interface Break {
  id: string;
  startedAt: number;
  endedAt?: number;
  duration: number; // planned duration in minutes
  notes?: string;
}

export type TimerState = 'idle' | 'running' | 'paused' | 'completed';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error';

export interface Settings {
  blockDuration: number; // in minutes, default 25
  breakDuration: number; // in minutes, default 5
  longBreakDuration: number; // in minutes, default 15
  blocksUntilLongBreak: number; // default 4
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  theme: 'dark' | 'light' | 'system';
}

export const DEFAULT_SETTINGS: Settings = {
  blockDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  blocksUntilLongBreak: 4,
  soundEnabled: true,
  notificationsEnabled: true,
  theme: 'system',
};

export const createEmptyMeta = (): BlockMeta => ({
  finishLinePictured: false,
  notInterrupted: false,
  committedToFocus: false,
  phoneSeparate: false,
  celebrated: false,
});

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const getToday = (): string => {
  return new Date().toISOString().split('T')[0];
};
