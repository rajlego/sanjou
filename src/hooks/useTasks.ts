import { useState, useEffect, useCallback } from 'react';
import type { Task, Subtask } from '../models';
import { generateId } from '../models';
import {
  addTask,
  updateTask,
  deleteTask,
  getTasks,
  subscribeToTasks,
  tasksMap,
} from '../sync/yjsProvider';

interface UseTasksReturn {
  tasks: Task[];
  incompleteTasks: Task[];
  createTask: (title: string) => Task;
  updateTaskTitle: (id: string, title: string) => void;
  updateTaskNotes: (id: string, notes: string) => void;
  completeTask: (id: string) => void;
  uncompleteTask: (id: string) => void;
  removeTask: (id: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  updateSubtask: (taskId: string, subtaskId: string, updates: Partial<Subtask>) => void;
  removeSubtask: (taskId: string, subtaskId: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  incrementBlocksSpent: (taskId: string) => void;
  getTask: (id: string) => Task | undefined;
}

export const useTasks = (): UseTasksReturn => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    setTasks(getTasks());
    const unsubscribe = subscribeToTasks(setTasks);
    return unsubscribe;
  }, []);

  const incompleteTasks = tasks.filter((t) => !t.completed);

  const createTask = useCallback((title: string): Task => {
    const task: Task = {
      id: generateId(),
      title,
      subtasks: [],
      completed: false,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      blocksSpent: 0,
    };
    addTask(task);
    return task;
  }, []);

  const updateTaskTitle = useCallback((id: string, title: string) => {
    updateTask(id, { title });
  }, []);

  const updateTaskNotes = useCallback((id: string, notes: string) => {
    updateTask(id, { notes });
  }, []);

  const completeTask = useCallback((id: string) => {
    updateTask(id, { completed: true });
  }, []);

  const uncompleteTask = useCallback((id: string) => {
    updateTask(id, { completed: false });
  }, []);

  const removeTask = useCallback((id: string) => {
    deleteTask(id);
  }, []);

  const addSubtask = useCallback((taskId: string, title: string) => {
    const task = tasksMap.get(taskId);
    if (task) {
      const subtask: Subtask = {
        id: generateId(),
        title,
        completed: false,
      };
      updateTask(taskId, {
        subtasks: [...task.subtasks, subtask],
      });
    }
  }, []);

  const updateSubtask = useCallback(
    (taskId: string, subtaskId: string, updates: Partial<Subtask>) => {
      const task = tasksMap.get(taskId);
      if (task) {
        updateTask(taskId, {
          subtasks: task.subtasks.map((st) =>
            st.id === subtaskId ? { ...st, ...updates } : st
          ),
        });
      }
    },
    []
  );

  const removeSubtask = useCallback((taskId: string, subtaskId: string) => {
    const task = tasksMap.get(taskId);
    if (task) {
      updateTask(taskId, {
        subtasks: task.subtasks.filter((st) => st.id !== subtaskId),
      });
    }
  }, []);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    const task = tasksMap.get(taskId);
    if (task) {
      const subtask = task.subtasks.find((st) => st.id === subtaskId);
      if (subtask) {
        updateSubtask(taskId, subtaskId, { completed: !subtask.completed });
      }
    }
  }, [updateSubtask]);

  const incrementBlocksSpent = useCallback((taskId: string) => {
    const task = tasksMap.get(taskId);
    if (task) {
      updateTask(taskId, { blocksSpent: task.blocksSpent + 1 });
    }
  }, []);

  const getTask = useCallback(
    (id: string) => tasks.find((t) => t.id === id),
    [tasks]
  );

  return {
    tasks,
    incompleteTasks,
    createTask,
    updateTaskTitle,
    updateTaskNotes,
    completeTask,
    uncompleteTask,
    removeTask,
    addSubtask,
    updateSubtask,
    removeSubtask,
    toggleSubtask,
    incrementBlocksSpent,
    getTask,
  };
};
