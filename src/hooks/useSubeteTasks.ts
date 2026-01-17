/**
 * useSubeteTasks - Read tasks from Subete's shared task file
 * Location: ~/Library/Application Support/subete-sanjou-shared/tasks.json
 *
 * Offline-first design:
 * - Cache last known tasks for use when file is unavailable
 * - Graceful handling when shared directory/file doesn't exist
 * - Handle file lock scenarios with retry logic
 * - Never block the UI
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { readTextFile, exists } from '@tauri-apps/plugin-fs';
import { homeDir } from '@tauri-apps/api/path';
import { showToast } from '../store/toastStore';

// Shared task structure from Subete
export interface SubeteTask {
  id: string;
  content: string;
  status: string;
  value: number;
  time: number;
  tags?: string[];
}

// Sync status for UI indicators
export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

const SHARED_DIR_NAME = 'subete-sanjou-shared';
const SHARED_FILE_NAME = 'tasks.json';
const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds
const CACHE_KEY = 'sanjou-subete-tasks-cache';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

/**
 * Get the full path to the shared tasks file
 */
async function getSharedFilePath(): Promise<string> {
  const home = await homeDir();
  return `${home}Library/Application Support/${SHARED_DIR_NAME}/${SHARED_FILE_NAME}`;
}

/**
 * Load cached tasks from localStorage
 */
function loadCachedTasks(): SubeteTask[] {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as SubeteTask[];
    }
  } catch (error) {
    console.warn('[useSubeteTasks] Failed to load cached tasks:', error);
  }
  return [];
}

/**
 * Save tasks to localStorage cache
 */
function saveCachedTasks(tasks: SubeteTask[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.warn('[useSubeteTasks] Failed to cache tasks:', error);
  }
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Read tasks from the shared file with retry logic
 */
async function readSharedTasks(retries = MAX_RETRIES): Promise<{ tasks: SubeteTask[]; fromCache: boolean }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const filePath = await getSharedFilePath();
      const fileExists = await exists(filePath);

      if (!fileExists) {
        // File doesn't exist - this is normal if Subete hasn't run yet
        return { tasks: [], fromCache: false };
      }

      const content = await readTextFile(filePath);
      const tasks = JSON.parse(content) as SubeteTask[];

      // Validate the data structure
      if (!Array.isArray(tasks)) {
        throw new Error('Invalid tasks format: expected array');
      }

      return { tasks, fromCache: false };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if it's a lock error that might resolve with retry
      const errorMessage = lastError.message.toLowerCase();
      const isRetryable = errorMessage.includes('lock') ||
                          errorMessage.includes('busy') ||
                          errorMessage.includes('ebusy') ||
                          errorMessage.includes('eagain');

      if (isRetryable && attempt < retries - 1) {
        // Wait with exponential backoff before retry
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        console.log(`[useSubeteTasks] Retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await sleep(delay);
        continue;
      }

      // For non-retryable errors or final attempt, break
      break;
    }
  }

  // All retries failed - throw the last error
  throw lastError || new Error('Failed to read shared tasks');
}

/**
 * Hook to read and poll Subete tasks from the shared file
 * Provides offline resilience with caching and graceful error handling
 */
export function useSubeteTasks() {
  const [tasks, setTasks] = useState<SubeteTask[]>(() => loadCachedTasks());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');

  const previousTaskCountRef = useRef<number | null>(null);
  const hasInitialLoadRef = useRef(false);
  const lastErrorRef = useRef<string | null>(null);
  const consecutiveErrorsRef = useRef(0);

  const refresh = useCallback(async () => {
    setSyncStatus('syncing');

    try {
      const { tasks: sharedTasks, fromCache } = await readSharedTasks();
      const previousCount = previousTaskCountRef.current;
      const newCount = sharedTasks.length;

      // Update state
      setTasks(sharedTasks);
      setError(null);
      setSyncStatus(fromCache ? 'offline' : 'synced');
      consecutiveErrorsRef.current = 0;

      // Cache the tasks for offline use
      if (!fromCache && sharedTasks.length > 0) {
        saveCachedTasks(sharedTasks);
      }

      // Show toast for sync events (only after initial load)
      if (hasInitialLoadRef.current && previousCount !== null) {
        if (newCount !== previousCount) {
          const diff = newCount - previousCount;
          if (diff > 0) {
            showToast.success(`${diff} task${diff > 1 ? 's' : ''} synced from Subete`);
          } else if (diff < 0) {
            showToast.info(`Task list updated (${newCount} tasks)`);
          }
        }
      }

      // Clear error state if we were previously in error
      if (lastErrorRef.current) {
        showToast.success('Sync restored');
        lastErrorRef.current = null;
      }

      previousTaskCountRef.current = newCount;
      hasInitialLoadRef.current = true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tasks';
      setError(errorMessage);
      setSyncStatus('error');
      consecutiveErrorsRef.current++;

      // Don't show repeated error toasts - only show on first error or if error type changes
      const shouldShowToast = hasInitialLoadRef.current &&
                              lastErrorRef.current !== errorMessage &&
                              consecutiveErrorsRef.current <= 3;

      if (shouldShowToast) {
        if (errorMessage.includes('locked') || errorMessage.includes('EBUSY') || errorMessage.includes('busy')) {
          showToast.warning('Task file is locked, will retry...');
        } else if (errorMessage.includes('ENOENT') || errorMessage.includes('not found')) {
          // Don't show error for missing file - it's expected if Subete hasn't run
          setSyncStatus('offline');
        } else if (errorMessage.includes('parse') || errorMessage.includes('JSON')) {
          showToast.error('Invalid task file format');
        } else {
          showToast.warning('Sync temporarily unavailable');
        }
        lastErrorRef.current = errorMessage;
      }

      // Keep using cached data during errors
      // Tasks state is not cleared on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load
    refresh();

    // Poll for changes
    const interval = setInterval(refresh, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [refresh]);

  return {
    tasks,
    loading,
    error,
    syncStatus,
    refresh,
    // Helper to check if we're using cached data
    isOffline: syncStatus === 'offline' || syncStatus === 'error',
  };
}

/**
 * Get tasks filtered by status - useful for showing only "today" or "in_progress" tasks
 */
export function filterTasksByStatus(tasks: SubeteTask[], statuses: string[]): SubeteTask[] {
  return tasks.filter(task => statuses.includes(task.status));
}

/**
 * Get tasks sorted by priority (value/time ratio, higher is better)
 */
export function sortTasksByPriority(tasks: SubeteTask[]): SubeteTask[] {
  return [...tasks].sort((a, b) => {
    const ratioA = a.time > 0 ? a.value / a.time : (a.value > 0 ? Infinity : 0);
    const ratioB = b.time > 0 ? b.value / b.time : (b.value > 0 ? Infinity : 0);
    return ratioB - ratioA;
  });
}
