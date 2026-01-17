import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { Block, Task, RightNowList, Break } from '../models';

export const ydoc = new Y.Doc();

// Yjs data structures
export const blocksArray = ydoc.getArray<Block>('blocks');
export const tasksMap = ydoc.getMap<Task>('tasks');
export const rightNowListsMap = ydoc.getMap<RightNowList>('rightNowLists');
export const breaksArray = ydoc.getArray<Break>('breaks');
export const taskNotesMap = ydoc.getMap<string>('taskNotes'); // key: task content, value: notes

let localPersistence: IndexeddbPersistence | null = null;

export const initLocalPersistence = (): Promise<void> => {
  return new Promise((resolve) => {
    localPersistence = new IndexeddbPersistence('sanjou-data', ydoc);
    localPersistence.on('synced', () => {
      console.log('[Yjs] Local data loaded from IndexedDB');
      resolve();
    });
  });
};

export const destroyLocalPersistence = () => {
  if (localPersistence) {
    localPersistence.destroy();
    localPersistence = null;
  }
};

// Block operations
export const addBlock = (block: Block) => {
  blocksArray.push([block]);
};

export const updateBlock = (id: string, updates: Partial<Block>) => {
  const blocks = blocksArray.toArray();
  const index = blocks.findIndex(b => b.id === id);
  if (index !== -1) {
    const updated = { ...blocks[index], ...updates };
    ydoc.transact(() => {
      blocksArray.delete(index, 1);
      blocksArray.insert(index, [updated]);
    });
  }
};

export const getBlocksForDate = (date: string): Block[] => {
  return blocksArray.toArray().filter(b => b.date === date);
};

export const getTodayBlocks = (): Block[] => {
  const today = new Date().toISOString().split('T')[0];
  return getBlocksForDate(today);
};

export const getValidBlockCount = (date: string): number => {
  return getBlocksForDate(date).filter(b => b.isValid && b.completedAt).length;
};

// Task operations
export const addTask = (task: Task) => {
  tasksMap.set(task.id, task);
};

export const updateTask = (id: string, updates: Partial<Task>) => {
  const task = tasksMap.get(id);
  if (task) {
    tasksMap.set(id, { ...task, ...updates, modifiedAt: Date.now() });
  }
};

export const deleteTask = (id: string) => {
  tasksMap.delete(id);
};

export const getTasks = (): Task[] => {
  return Array.from(tasksMap.values());
};

export const getIncompleteTasks = (): Task[] => {
  return getTasks().filter(t => !t.completed);
};

// Right Now List operations
export const addRightNowList = (list: RightNowList) => {
  rightNowListsMap.set(list.id, list);
};

export const updateRightNowList = (id: string, updates: Partial<RightNowList>) => {
  const list = rightNowListsMap.get(id);
  if (list) {
    rightNowListsMap.set(id, { ...list, ...updates });
  }
};

export const deleteRightNowList = (id: string) => {
  rightNowListsMap.delete(id);
};

export const getRightNowListForBlock = (blockId: string): RightNowList | undefined => {
  return Array.from(rightNowListsMap.values()).find(l => l.blockId === blockId);
};

// Break operations
export const addBreak = (breakItem: Break) => {
  breaksArray.push([breakItem]);
};

export const updateBreak = (id: string, updates: Partial<Break>) => {
  const breaks = breaksArray.toArray();
  const index = breaks.findIndex(b => b.id === id);
  if (index !== -1) {
    const updated = { ...breaks[index], ...updates };
    ydoc.transact(() => {
      breaksArray.delete(index, 1);
      breaksArray.insert(index, [updated]);
    });
  }
};

// Subscribe to changes
export const subscribeToBlocks = (callback: (blocks: Block[]) => void) => {
  const handler = () => callback(blocksArray.toArray());
  blocksArray.observe(handler);
  return () => blocksArray.unobserve(handler);
};

export const subscribeToTasks = (callback: (tasks: Task[]) => void) => {
  const handler = () => callback(getTasks());
  tasksMap.observe(handler);
  return () => tasksMap.unobserve(handler);
};

export const subscribeToRightNowLists = (callback: (lists: RightNowList[]) => void) => {
  const handler = () => callback(Array.from(rightNowListsMap.values()));
  rightNowListsMap.observe(handler);
  return () => rightNowListsMap.unobserve(handler);
};

export const subscribeToBreaks = (callback: (breaks: Break[]) => void) => {
  const handler = () => callback(breaksArray.toArray());
  breaksArray.observe(handler);
  return () => breaksArray.unobserve(handler);
};

// Task notes operations (keyed by task content)
export const getTaskNotes = (taskContent: string): string | undefined => {
  return taskNotesMap.get(taskContent);
};

export const setTaskNotes = (taskContent: string, notes: string) => {
  if (notes.trim()) {
    taskNotesMap.set(taskContent, notes);
  } else {
    taskNotesMap.delete(taskContent);
  }
};

export const subscribeToTaskNotes = (callback: (notes: Map<string, string>) => void) => {
  const handler = () => callback(new Map(taskNotesMap.entries()));
  taskNotesMap.observe(handler);
  return () => taskNotesMap.unobserve(handler);
};
