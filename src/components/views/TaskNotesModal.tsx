import { useState, useEffect, useCallback } from 'react';
import { Modal, Button } from '../common';
import { useKeyboard } from '../../hooks/useKeyboard';
import type { Task } from '../../models';
import './TaskNotesModal.css';

interface TaskNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSave: (taskId: string, notes: string) => void;
}

export const TaskNotesModal = ({ isOpen, onClose, task, onSave }: TaskNotesModalProps) => {
  const [notes, setNotes] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (task) {
      setNotes(task.notes || '');
      setHasChanges(false);
    }
  }, [task]);

  const handleSave = useCallback(() => {
    if (task && hasChanges) {
      onSave(task.id, notes);
    }
    onClose();
  }, [task, notes, hasChanges, onSave, onClose]);

  const handleChange = (value: string) => {
    setNotes(value);
    setHasChanges(true);
  };

  // Enable keyboard shortcuts only when modal is open
  useKeyboard(
    isOpen
      ? {
          'ctrl+enter': handleSave,
          'cmd+enter': handleSave,
        }
      : {},
    [handleSave, isOpen]
  );

  if (!task) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Notes: ${task.title}`} width="md">
      <div className="task-notes-modal">
        <textarea
          className="task-notes-textarea"
          value={notes}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Add notes about this task..."
          autoFocus
        />
        <div className="task-notes-footer">
          <span className="task-notes-hint">
            <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to save
          </span>
          <div className="task-notes-actions">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {hasChanges ? 'Save' : 'Close'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
