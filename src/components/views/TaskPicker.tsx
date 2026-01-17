import { useState, useCallback, useRef, useEffect } from 'react';
import { Modal, Button, Checkbox } from '../common';
import { useTasks } from '../../hooks/useTasks';
import './TaskPicker.css';

interface TaskPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (taskId: string | null) => void;
  selectedTaskId: string | null;
}

export const TaskPicker = ({
  isOpen,
  onClose,
  onSelect,
  selectedTaskId,
}: TaskPickerProps) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { tasks, incompleteTasks, createTask, completeTask, uncompleteTask, removeTask } = useTasks();

  const displayedTasks = showCompleted ? tasks : incompleteTasks;

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleCreateTask = useCallback(() => {
    if (!newTaskTitle.trim()) return;
    const task = createTask(newTaskTitle.trim());
    onSelect(task.id);
    setNewTaskTitle('');
  }, [newTaskTitle, createTask, onSelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateTask();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Task" width="md">
      <div className="task-picker">
        <div className="task-picker-input-row">
          <input
            ref={inputRef}
            type="text"
            className="task-picker-input"
            placeholder="Create new task..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateTask}
            disabled={!newTaskTitle.trim()}
          >
            Create
          </Button>
        </div>

        <div className="task-picker-filter">
          <Checkbox
            checked={showCompleted}
            onChange={setShowCompleted}
            label="Show completed tasks"
          />
        </div>

        <div className="task-list">
          {displayedTasks.length === 0 ? (
            <p className="no-tasks">
              {showCompleted ? 'No tasks yet' : 'No incomplete tasks'}
            </p>
          ) : (
            displayedTasks.map((task) => (
              <div
                key={task.id}
                className={`task-item ${selectedTaskId === task.id ? 'task-item-selected' : ''} ${task.completed ? 'task-item-completed' : ''}`}
              >
                <button
                  className="task-item-main"
                  onClick={() => onSelect(task.id)}
                >
                  <span className="task-item-title">{task.title}</span>
                  <span className="task-item-meta">
                    {task.blocksSpent} block{task.blocksSpent !== 1 ? 's' : ''}
                  </span>
                </button>
                <div className="task-item-actions">
                  <button
                    className="task-action"
                    onClick={() =>
                      task.completed ? uncompleteTask(task.id) : completeTask(task.id)
                    }
                    title={task.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {task.completed ? '↩' : '✓'}
                  </button>
                  <button
                    className="task-action task-action-danger"
                    onClick={() => removeTask(task.id)}
                    title="Delete task"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="task-picker-footer">
          <Button variant="ghost" onClick={() => onSelect(null)}>
            Clear Selection
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
