import { useMemo } from 'react';
import { useBlocks } from '../../hooks/useBlocks';
import { useTasks } from '../../hooks/useTasks';
import { useUIStore } from '../../store/uiStore';
import { useKeyboard } from '../../hooks/useKeyboard';
import type { Block } from '../../models';
import './HistoryView.css';

interface GroupedBlocks {
  date: string;
  label: string;
  blocks: Block[];
  validCount: number;
}

const formatDate = (dateStr: string): string => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';

  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatDuration = (startedAt: number, completedAt?: number): string => {
  if (!completedAt) return 'incomplete';
  const seconds = Math.round((completedAt - startedAt) / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const HistoryView = () => {
  const { blocks } = useBlocks();
  const { getTask } = useTasks();
  const setCurrentView = useUIStore((s) => s.setCurrentView);

  const handleBack = () => setCurrentView('block');

  // Close with Escape or H
  useKeyboard({
    'esc': handleBack,
    'h': handleBack,
  }, [handleBack]);

  // Group blocks by date, sorted most recent first
  const groupedBlocks = useMemo((): GroupedBlocks[] => {
    const groups = new Map<string, Block[]>();

    // Sort blocks by startedAt descending
    const sortedBlocks = [...blocks].sort((a, b) => b.startedAt - a.startedAt);

    for (const block of sortedBlocks) {
      const existing = groups.get(block.date) || [];
      groups.set(block.date, [...existing, block]);
    }

    // Convert to array and sort by date descending
    const dates = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

    return dates.map((date) => {
      const dayBlocks = groups.get(date) || [];
      return {
        date,
        label: formatDate(date),
        blocks: dayBlocks,
        validCount: dayBlocks.filter((b) => b.isValid && b.completedAt).length,
      };
    });
  }, [blocks]);

  const _totalBlocks = blocks.length;
  void _totalBlocks; // Reserved for future use
  const totalValid = blocks.filter((b) => b.isValid && b.completedAt).length;

  return (
    <div className="history-view">
      <header className="history-header">
        <button className="history-back" onClick={handleBack}>
          <span className="back-arrow">←</span>
          <span className="back-label">Back</span>
          <span className="back-hint">[H]</span>
        </button>
        <h1 className="history-title">Block History</h1>
        <div className="history-stats">
          <span className="stat-count">{totalValid}</span>
          <span className="stat-label">completed</span>
        </div>
      </header>

      <main className="history-content">
        {groupedBlocks.length === 0 ? (
          <div className="history-empty">
            <p>No blocks yet</p>
            <p className="history-empty-hint">Complete a block to see it here</p>
          </div>
        ) : (
          groupedBlocks.map(({ date, label, blocks: dayBlocks, validCount }) => (
            <section key={date} className="history-day">
              <header className="day-header">
                <h2 className="day-label">{label}</h2>
                <span className="day-count">{validCount} valid</span>
              </header>
              <ul className="day-blocks">
                {dayBlocks.map((block) => {
                  const task = block.taskId ? getTask(block.taskId) : null;
                  return (
                    <li
                      key={block.id}
                      className={`block-item ${block.isValid ? 'valid' : 'invalid'}`}
                    >
                      <span className="block-status">
                        {block.isValid && block.completedAt ? '✓' : '✗'}
                      </span>
                      <span className="block-time">{formatTime(block.startedAt)}</span>
                      <span className="block-task">
                        {task?.title || '(no task)'}
                      </span>
                      <span className="block-duration">
                        {block.isValid && block.completedAt
                          ? formatDuration(block.startedAt, block.completedAt)
                          : 'interrupted'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </main>

      <footer className="history-footer">
        <span className="shortcut-hint">
          <span className="shortcut-key">H</span> Back
        </span>
        <span className="shortcut-hint">
          <span className="shortcut-key">Esc</span> Back
        </span>
      </footer>
    </div>
  );
};
