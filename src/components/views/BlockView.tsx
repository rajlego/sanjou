import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Checkbox, SubeteTaskPicker } from '../common';
import { TaskNotesModal } from './TaskNotesModal';
import { useTimer, formatTime } from '../../hooks/useTimer';
import { useBlocks } from '../../hooks/useBlocks';
import { useBreaks } from '../../hooks/useBreaks';
import { useAudio } from '../../hooks/useAudio';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useDeepLink } from '../../hooks/useDeepLink';
import { useTaskNotes } from '../../hooks/useTaskNotes';
import { useSubeteTasks, filterTasksByStatus, sortTasksByPriority, type SubeteTask } from '../../hooks/useSubeteTasks';
import { useNotification } from '../../hooks/useNotification';
import { useSettingsStore } from '../../store/settingsStore';
import { useUIStore } from '../../store/uiStore';
import { showToast } from '../../store/toastStore';
import { recordCompletion } from '../../sync/completionSync';
import type { BlockMeta } from '../../models';
import './BlockView.css';

export const BlockView = () => {
  const blockDuration = useSettingsStore((s) => s.blockDuration);
  const breakDuration = useSettingsStore((s) => s.breakDuration);
  const [taskText, setTaskText] = useState('');
  const [selectedSubeteTaskId, setSelectedSubeteTaskId] = useState<string | null>(null);
  const [rightNowText, setRightNowText] = useState('');
  const [rightNowExpanded, setRightNowExpanded] = useState(true); // Open by default
  const [altPressed, setAltPressed] = useState(false);
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const taskPickerRef = useRef<HTMLDivElement>(null);

  // Task notes
  const { getNotesForTask, saveNotes, hasNotes } = useTaskNotes();

  // Subete task integration
  const { tasks: subeteTasks, loading: subeteLoading } = useSubeteTasks();

  // Filter to show only actionable tasks (today, in_progress, sprint)
  const actionableTasks = useMemo(() => {
    const filtered = filterTasksByStatus(subeteTasks, ['today', 'in_progress', 'sprint']);
    return sortTasksByPriority(filtered);
  }, [subeteTasks]);

  const {
    currentBlockId,
    setCurrentBlockId,
    currentMeta,
    setMetaItem,
    resetMeta,
    setTimerState,
    timerState,
    setIsOnBreak,
    setCurrentBreakId,
  } = useUIStore();

  const { startBreak } = useBreaks();

  // Handle deep links from Subete
  const handleDeepLink = useCallback((data: { task?: string; taskId?: string; rightNow?: string }) => {
    // Only accept deep links when timer is idle
    if (timerState === 'idle') {
      if (data.task) {
        setTaskText(data.task);
      }
      if (data.taskId) {
        setSelectedSubeteTaskId(data.taskId);
      }
      if (data.rightNow) {
        setRightNowText(data.rightNow);
        setRightNowExpanded(true);
      }
    }
  }, [timerState]);

  useDeepLink(handleDeepLink);

  const { blocks, todayValidCount, createBlock, completeBlock, invalidateBlock } = useBlocks();
  const { playBlockComplete, playError } = useAudio();
  const { notifyBlockComplete } = useNotification();

  const isMetaComplete = Object.values(currentMeta).every(Boolean);

  const handleBlockComplete = useCallback(() => {
    if (currentBlockId) {
      completeBlock(currentBlockId, true);
      playBlockComplete();
      notifyBlockComplete();
      showToast.success(`Block complete! ${blockDuration} minutes of focused work.`);

      // Record completion for Subete sync if a task was selected
      if (selectedSubeteTaskId) {
        recordCompletion(selectedSubeteTaskId, blockDuration, currentBlockId);
      }
    }
  }, [currentBlockId, completeBlock, playBlockComplete, notifyBlockComplete, selectedSubeteTaskId, blockDuration]);

  const timer = useTimer({
    duration: blockDuration * 60,
    onComplete: handleBlockComplete,
  });

  // Sync timer state with UI store
  useEffect(() => {
    setTimerState(timer.state);
  }, [timer.state, setTimerState]);

  // Track Alt key press for showing shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setAltPressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setAltPressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Handle task selection from picker
  const handleSelectTask = useCallback((task: SubeteTask) => {
    setTaskText(task.content);
    setSelectedSubeteTaskId(task.id);
    setTaskPickerOpen(false);
  }, []);

  const handleStart = useCallback(() => {
    if (!isMetaComplete) {
      playError();
      return;
    }
    const block = createBlock(undefined, currentMeta);
    setCurrentBlockId(block.id);
    timer.start();
  }, [isMetaComplete, createBlock, currentMeta, setCurrentBlockId, timer, playError]);

  const handleToggle = useCallback(() => {
    if (timer.state === 'idle') {
      handleStart();
    } else {
      timer.toggle();
    }
  }, [timer, handleStart]);

  const handleReset = useCallback(() => {
    if (currentBlockId) {
      invalidateBlock(currentBlockId);
      setCurrentBlockId(null);
    }
    timer.reset();
    resetMeta();
  }, [currentBlockId, invalidateBlock, setCurrentBlockId, timer, resetMeta]);

  const handleMarkInterrupted = useCallback(() => {
    if (currentBlockId) {
      invalidateBlock(currentBlockId);
      setCurrentBlockId(null);
    }
    timer.reset();
    resetMeta();
  }, [currentBlockId, invalidateBlock, setCurrentBlockId, timer, resetMeta]);

  const handleNextBlock = useCallback(() => {
    setCurrentBlockId(null);
    timer.reset();
    resetMeta();
    setTaskText('');
    setSelectedSubeteTaskId(null);
    setRightNowText('');
  }, [setCurrentBlockId, timer, resetMeta]);

  const handleStartBreak = useCallback((duration: number) => {
    const breakItem = startBreak(duration);
    setCurrentBreakId(breakItem.id);
    setIsOnBreak(true);
    // Also reset the block state
    setCurrentBlockId(null);
    timer.reset();
    resetMeta();
    setTaskText('');
    setSelectedSubeteTaskId(null);
    setRightNowText('');
  }, [startBreak, setCurrentBreakId, setIsOnBreak, setCurrentBlockId, timer, resetMeta]);

  // Meta items configuration
  const metaItems: { key: keyof BlockMeta; label: string; shortcut: string }[] = [
    { key: 'finishLinePictured', label: 'Finish line', shortcut: '1' },
    { key: 'notInterrupted', label: 'Uninterrupted', shortcut: '2' },
    { key: 'committedToFocus', label: 'No distractions', shortcut: '3' },
    { key: 'phoneSeparate', label: 'Phone away', shortcut: '4' },
    { key: 'celebrated', label: 'Celebrate', shortcut: '5' },
  ];

  // Toggle meta item by index
  const toggleMeta = useCallback((index: number) => {
    if (timer.state !== 'idle') return;
    const item = metaItems[index];
    if (item) {
      setMetaItem(item.key, !currentMeta[item.key]);
    }
  }, [timer.state, currentMeta, setMetaItem]);

  // Global keyboard shortcuts (Alt+key)
  useKeyboard({
    'alt+space': handleToggle,
    'alt+enter': () => {
      if (timer.state === 'idle' && isMetaComplete) {
        handleStart();
      } else if (timer.state === 'completed') {
        handleNextBlock();
      }
    },
    'alt+r': () => {
      if (timer.state === 'paused') {
        handleReset();
      }
    },
    'alt+i': () => {
      if (timer.state === 'running') {
        handleMarkInterrupted();
      }
    },
    'alt+b': () => {
      if (timer.state === 'completed') {
        handleStartBreak(breakDuration);
      }
    },
    'alt+1': () => toggleMeta(0),
    'alt+2': () => toggleMeta(1),
    'alt+3': () => toggleMeta(2),
    'alt+4': () => toggleMeta(3),
    'alt+5': () => toggleMeta(4),
    'alt+n': () => {
      if (taskText.trim()) {
        setNotesModalOpen(true);
      }
    },
  }, [handleToggle, handleStart, handleReset, handleMarkInterrupted, handleNextBlock, handleStartBreak, timer.state, isMetaComplete, toggleMeta, breakDuration, taskText]);

  // Recent blocks for sidebar (sorted newest first)
  const recentBlocks = useMemo(() => {
    return [...blocks]
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 20);
  }, [blocks]);

  const formatBlockTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).replace(' ', '');
  };

  // Render the history sidebar
  const renderSidebar = () => (
    <aside className="history-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-tally">{todayValidCount}</div>
        <div className="sidebar-label">today</div>
      </div>
      <div className="sidebar-list">
        {timer.state !== 'idle' && timer.state !== 'completed' && (
          <div className="sidebar-item current">
            <span className="status-icon">▶</span>
            <span className="item-time">now</span>
          </div>
        )}
        {recentBlocks.length === 0 && timer.state === 'idle' ? (
          <div className="sidebar-empty">No blocks yet</div>
        ) : (
          recentBlocks.map((block) => (
            <div
              key={block.id}
              className={`sidebar-item ${block.isValid && block.completedAt ? 'valid' : 'invalid'}`}
            >
              <span className="status-icon">
                {block.isValid && block.completedAt ? '✓' : '✗'}
              </span>
              <span className="item-time">{formatBlockTime(block.startedAt)}</span>
            </div>
          ))
        )}
      </div>
      <div className="sidebar-footer">
        <span className="sidebar-footer-hint"><kbd>H</kbd> full</span>
      </div>
    </aside>
  );

  // Render idle state (pre-block)
  const renderIdleView = () => (
    <div className="idle-view">
      {/* Meta Checklist */}
      <section className="section-box">
        <h3 className="section-title">Meta <span className="title-hint">[1-5]</span></h3>
        <div className="meta-list">
          {metaItems.map(({ key, label, shortcut }) => (
            <div key={key} className="meta-item">
              <span className="meta-shortcut">{shortcut}</span>
              <Checkbox
                checked={currentMeta[key]}
                onChange={(checked) => setMetaItem(key, checked)}
                label={label}
              />
            </div>
          ))}
        </div>
        <p className={`meta-hint ${isMetaComplete ? 'ready' : ''}`}>
          {isMetaComplete ? 'Ready to focus' : 'Check all to start'}
        </p>
      </section>

      {/* Start Button */}
      <div className="start-section">
        <button
          className="start-btn"
          onClick={handleStart}
          disabled={!isMetaComplete}
        >
          {altPressed && <span className="shortcut-badge">Enter</span>}
          Start Block
        </button>
        <span className="start-hint">
          {isMetaComplete ? 'Alt+Enter to start' : 'Complete checklist first'}
        </span>
      </div>

      {/* Task Input - right above Right Now */}
      <section className="section-box">
        <div className="task-header">
          <h3 className="section-title">Task</h3>
          <div className="task-header-actions">
            {taskText.trim() && (
              <button
                className={`task-notes-btn ${hasNotes(taskText.trim()) ? 'has-notes' : ''}`}
                onClick={() => setNotesModalOpen(true)}
                title="Task notes (Alt+N)"
              >
                {altPressed && <span className="shortcut-badge">N</span>}
                {hasNotes(taskText.trim()) ? 'Notes' : '+ Notes'}
              </button>
            )}
            {actionableTasks.length > 0 && (
              <div className="task-picker-container" ref={taskPickerRef}>
                <button
                  className="task-picker-btn"
                  onClick={() => setTaskPickerOpen(!taskPickerOpen)}
                  title="Pick from Subete tasks"
                >
                  {subeteLoading ? '...' : `Pick (${actionableTasks.length})`}
                </button>
                <SubeteTaskPicker
                  isOpen={taskPickerOpen}
                  onOpenChange={setTaskPickerOpen}
                  onSelect={handleSelectTask}
                  triggerRef={taskPickerRef as React.RefObject<HTMLElement>}
                />
              </div>
            )}
          </div>
        </div>
        <textarea
          className="task-input"
          placeholder="What are you working on?"
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          rows={2}
        />
      </section>

      {/* Right Now - Collapsed or Expanded */}
      {rightNowExpanded ? (
        <section className="section-box rightnow-expanded">
          <h3 className="section-title">Right Now</h3>
          <p className="rightnow-prompt">First 30-120 seconds:</p>
          <textarea
            className="rightnow-input"
            placeholder="- Open project&#10;- Find the file&#10;- Write first line"
            value={rightNowText}
            onChange={(e) => setRightNowText(e.target.value)}
          />
        </section>
      ) : (
        <div
          className="rightnow-collapsed"
          onClick={() => setRightNowExpanded(true)}
        >
          <span className="rightnow-label">Right Now list</span>
          <span className="rightnow-expand">+</span>
        </div>
      )}
    </div>
  );

  // Render running state
  const renderRunningView = () => (
    <div className="running-view">
      {/* Timer - Prominent */}
      <div className="timer-prominent">
        <span className="timer-time">{formatTime(timer.remaining)}</span>
        <span className="timer-label">Focus</span>
        <div className="timer-progress">
          <div
            className="timer-progress-fill"
            style={{ width: `${timer.progress * 100}%` }}
          />
        </div>
      </div>

      {/* Task Display - Read only */}
      {taskText && (
        <div className="task-display">
          <div className="task-display-title">Task</div>
          <div className="task-display-text">{taskText}</div>
        </div>
      )}

      {/* Right Now - Expanded */}
      <section className="section-box rightnow-expanded">
        <h3 className="section-title">Right Now</h3>
        <p className="rightnow-prompt">First 30-120 seconds:</p>
        <textarea
          className="rightnow-input"
          placeholder="- Open project&#10;- Find the file&#10;- Write first line"
          value={rightNowText}
          onChange={(e) => setRightNowText(e.target.value)}
        />
      </section>

      {/* Interrupt Button */}
      <div className="interrupt-section">
        <button className="interrupt-btn" onClick={handleMarkInterrupted}>
          {altPressed && <span className="shortcut-badge danger">I</span>}
          Interrupted
        </button>
      </div>
    </div>
  );

  // Render paused state
  const renderPausedView = () => (
    <div className="paused-view">
      {/* Timer - Paused style */}
      <div className="timer-paused">
        <span className="timer-time">{formatTime(timer.remaining)}</span>
        <span className="timer-label">Paused</span>
        <div className="timer-progress">
          <div
            className="timer-progress-fill"
            style={{ width: `${timer.progress * 100}%` }}
          />
        </div>
      </div>

      {/* Task Display */}
      {taskText && (
        <div className="task-display">
          <div className="task-display-title">Task</div>
          <div className="task-display-text">{taskText}</div>
        </div>
      )}

      {/* Right Now */}
      <section className="section-box rightnow-expanded">
        <h3 className="section-title">Right Now</h3>
        <textarea
          className="rightnow-input"
          placeholder="- Open project&#10;- Find the file"
          value={rightNowText}
          onChange={(e) => setRightNowText(e.target.value)}
        />
      </section>

      {/* Pause Controls */}
      <div className="pause-controls">
        <button className="pause-btn resume" onClick={timer.toggle}>
          {altPressed && <span className="shortcut-badge">Space</span>}
          Resume
        </button>
        <button className="pause-btn reset" onClick={handleReset}>
          {altPressed && <span className="shortcut-badge">R</span>}
          Reset
        </button>
      </div>
    </div>
  );

  // Render completed state
  const renderCompletedView = () => (
    <div className="completed-view">
      <div className="complete-celebration">
        <div className="complete-icon">✓</div>
        <div className="complete-title">Block Complete!</div>
        <div className="complete-duration">
          {blockDuration}:00 of focused work
        </div>
      </div>

      <div className="complete-actions">
        <div className="break-options">
          <span className="break-label">Take a break?</span>
          <div className="break-buttons">
            <button
              className="break-option-btn"
              onClick={() => handleStartBreak(breakDuration)}
            >
              {altPressed && <span className="shortcut-badge">B</span>}
              {breakDuration} min
            </button>
            <button
              className="break-option-btn"
              onClick={() => handleStartBreak(15)}
            >
              15 min
            </button>
          </div>
        </div>
        <div className="or-divider">or</div>
        <button className="next-block-btn" onClick={handleNextBlock}>
          {altPressed && <span className="shortcut-badge">Enter</span>}
          Start Next Block
        </button>
        <span className="start-hint">Alt+Enter</span>
      </div>
    </div>
  );

  // Render footer hints based on state
  const renderFooterHints = () => {
    if (timer.state === 'idle') {
      return (
        <footer className="footer-hints">
          <span className="hint"><kbd>Alt</kbd>+<kbd>1-5</kbd> meta</span>
          <span className="hint"><kbd>Alt</kbd>+<kbd>Enter</kbd> start</span>
          <span className="hint"><kbd>Alt</kbd>+<kbd>S</kbd> settings</span>
        </footer>
      );
    }
    if (timer.state === 'running') {
      return (
        <footer className="footer-hints">
          <span className="hint"><kbd>Alt</kbd>+<kbd>Space</kbd> pause</span>
          <span className="hint"><kbd>Alt</kbd>+<kbd>I</kbd> interrupt</span>
        </footer>
      );
    }
    if (timer.state === 'paused') {
      return (
        <footer className="footer-hints">
          <span className="hint"><kbd>Alt</kbd>+<kbd>Space</kbd> resume</span>
          <span className="hint"><kbd>Alt</kbd>+<kbd>R</kbd> reset</span>
        </footer>
      );
    }
    if (timer.state === 'completed') {
      return (
        <footer className="footer-hints">
          <span className="hint"><kbd>Alt</kbd>+<kbd>B</kbd> take break</span>
          <span className="hint"><kbd>Alt</kbd>+<kbd>Enter</kbd> next block</span>
        </footer>
      );
    }
    return null;
  };

  // Create a pseudo task object for the notes modal
  const currentTaskForNotes = taskText.trim() ? {
    id: taskText.trim(),
    title: taskText.trim(),
    subtasks: [],
    completed: false,
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    blocksSpent: 0,
    notes: getNotesForTask(taskText.trim()),
  } : null;

  const handleSaveNotes = useCallback((taskContent: string, notes: string) => {
    saveNotes(taskContent, notes);
  }, [saveNotes]);

  return (
    <div className={`block-view ${altPressed ? 'alt-active' : ''}`}>
      {renderSidebar()}

      <main className="main-content">
        {timer.state === 'idle' && renderIdleView()}
        {timer.state === 'running' && renderRunningView()}
        {timer.state === 'paused' && renderPausedView()}
        {timer.state === 'completed' && renderCompletedView()}
      </main>

      {renderFooterHints()}

      <TaskNotesModal
        isOpen={notesModalOpen}
        onClose={() => setNotesModalOpen(false)}
        task={currentTaskForNotes}
        onSave={handleSaveNotes}
      />
    </div>
  );
};
