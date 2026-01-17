/**
 * Completion Sync - Write Pomodoro/block completions to shared file for Subete
 * Location: ~/Library/Application Support/subete-sanjou-shared/completions.json
 *
 * Offline-first design:
 * - Queue writes if file is temporarily unavailable
 * - Retry with exponential backoff
 * - Never block the UI
 */

import { mkdir, writeTextFile, readTextFile, exists } from '@tauri-apps/plugin-fs';
import { homeDir } from '@tauri-apps/api/path';

// Completion record structure
export interface TaskCompletion {
  taskId: string;
  completedAt: string; // ISO date string
  duration: number;    // Duration in minutes
  blockId?: string;    // Optional Sanjou block ID for reference
}

// Queue item for pending writes
interface QueuedCompletion extends TaskCompletion {
  retryCount: number;
  queuedAt: number;
}

const SHARED_DIR_NAME = 'subete-sanjou-shared';
const COMPLETIONS_FILE_NAME = 'completions.json';
const MAX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;

// In-memory queue for pending writes
let pendingQueue: QueuedCompletion[] = [];
let isProcessingQueue = false;
let retryTimeout: number | null = null;

/**
 * Get the full path to the shared directory
 */
async function getSharedDirPath(): Promise<string> {
  const home = await homeDir();
  return `${home}Library/Application Support/${SHARED_DIR_NAME}`;
}

/**
 * Get the full path to the completions file
 */
async function getCompletionsFilePath(): Promise<string> {
  const dirPath = await getSharedDirPath();
  return `${dirPath}/${COMPLETIONS_FILE_NAME}`;
}

/**
 * Ensure the shared directory exists
 * Returns false if directory creation fails
 */
async function ensureSharedDirExists(): Promise<boolean> {
  try {
    const dirPath = await getSharedDirPath();
    const dirExists = await exists(dirPath);
    if (!dirExists) {
      await mkdir(dirPath, { recursive: true });
    }
    return true;
  } catch (error) {
    console.warn('[CompletionSync] Failed to ensure shared directory exists:', error);
    return false;
  }
}

/**
 * Read existing completions from the shared file
 * Returns empty array if file doesn't exist or is unreadable
 */
async function readExistingCompletions(): Promise<TaskCompletion[]> {
  try {
    const filePath = await getCompletionsFilePath();
    const fileExists = await exists(filePath);
    if (!fileExists) {
      return [];
    }
    const content = await readTextFile(filePath);
    const completions = JSON.parse(content) as TaskCompletion[];
    return Array.isArray(completions) ? completions : [];
  } catch (error) {
    console.warn('[CompletionSync] Failed to read existing completions:', error);
    return [];
  }
}

/**
 * Write completions to the shared file
 * Throws on failure for retry handling
 */
async function writeCompletionsToFile(completions: TaskCompletion[]): Promise<void> {
  const dirReady = await ensureSharedDirExists();
  if (!dirReady) {
    throw new Error('Failed to create shared directory');
  }

  const filePath = await getCompletionsFilePath();
  const json = JSON.stringify(completions, null, 2);
  await writeTextFile(filePath, json);
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(retryCount: number): number {
  const delay = Math.min(
    BASE_RETRY_DELAY_MS * Math.pow(2, retryCount),
    MAX_RETRY_DELAY_MS
  );
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

/**
 * Process the pending queue
 * Runs asynchronously without blocking
 */
async function processQueue(): Promise<void> {
  if (isProcessingQueue || pendingQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  try {
    // Read existing completions
    const existing = await readExistingCompletions();

    // Merge with pending items (avoid duplicates by taskId + completedAt)
    const existingKeys = new Set(
      existing.map(c => `${c.taskId}-${c.completedAt}`)
    );

    const newCompletions: TaskCompletion[] = [];
    const stillPending: QueuedCompletion[] = [];

    for (const queued of pendingQueue) {
      const key = `${queued.taskId}-${queued.completedAt}`;
      if (!existingKeys.has(key)) {
        newCompletions.push({
          taskId: queued.taskId,
          completedAt: queued.completedAt,
          duration: queued.duration,
          blockId: queued.blockId,
        });
      }
    }

    if (newCompletions.length > 0) {
      // Write all completions
      await writeCompletionsToFile([...existing, ...newCompletions]);
      console.log(`[CompletionSync] Successfully wrote ${newCompletions.length} completion(s)`);
    }

    // Clear the queue on success
    pendingQueue = stillPending;

  } catch (error) {
    console.warn('[CompletionSync] Failed to process queue:', error);

    // Move items back to queue with incremented retry count
    const updatedQueue: QueuedCompletion[] = [];

    for (const item of pendingQueue) {
      if (item.retryCount < MAX_RETRIES) {
        updatedQueue.push({
          ...item,
          retryCount: item.retryCount + 1,
        });
      } else {
        console.error('[CompletionSync] Dropping completion after max retries:', item.taskId);
      }
    }

    pendingQueue = updatedQueue;

    // Schedule retry if there are still items
    if (pendingQueue.length > 0) {
      const minRetryCount = Math.min(...pendingQueue.map(q => q.retryCount));
      const delay = getRetryDelay(minRetryCount);

      if (retryTimeout !== null) {
        clearTimeout(retryTimeout);
      }

      retryTimeout = window.setTimeout(() => {
        retryTimeout = null;
        processQueue();
      }, delay);

      console.log(`[CompletionSync] Scheduling retry in ${Math.round(delay / 1000)}s`);
    }
  } finally {
    isProcessingQueue = false;
  }
}

/**
 * Record a task completion
 * Non-blocking - queues the write and returns immediately
 *
 * @param taskId - The Subete task ID that was worked on
 * @param duration - Duration in minutes
 * @param blockId - Optional Sanjou block ID for cross-reference
 */
export function recordCompletion(
  taskId: string,
  duration: number,
  blockId?: string
): void {
  const completion: QueuedCompletion = {
    taskId,
    completedAt: new Date().toISOString(),
    duration,
    blockId,
    retryCount: 0,
    queuedAt: Date.now(),
  };

  pendingQueue.push(completion);
  console.log('[CompletionSync] Queued completion for task:', taskId);

  // Process queue asynchronously
  processQueue();
}

/**
 * Get the number of pending completions in the queue
 * Useful for UI indicators
 */
export function getPendingCount(): number {
  return pendingQueue.length;
}

/**
 * Force retry processing the queue
 * Useful when coming back online
 */
export function retryPendingCompletions(): void {
  if (retryTimeout !== null) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }
  processQueue();
}

/**
 * Clear the pending queue (use with caution)
 */
export function clearPendingQueue(): void {
  pendingQueue = [];
  if (retryTimeout !== null) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }
}
