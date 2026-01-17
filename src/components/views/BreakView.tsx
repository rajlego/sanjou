import { useState, useCallback, useEffect } from 'react';
import { useTimer, formatTime } from '../../hooks/useTimer';
import { useBreaks } from '../../hooks/useBreaks';
import { useAudio } from '../../hooks/useAudio';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useNotification } from '../../hooks/useNotification';
import { useUIStore } from '../../store/uiStore';
import './BreakView.css';

export const BreakView = () => {
  const [notes, setNotes] = useState('');
  const [altPressed, setAltPressed] = useState(false);

  const {
    currentBreakId,
    setCurrentBreakId,
    setIsOnBreak,
    setCurrentView,
  } = useUIStore();

  const { endBreak, getBreak } = useBreaks();
  const { playBlockComplete } = useAudio();
  const { notifyBreakComplete } = useNotification();

  const currentBreak = currentBreakId ? getBreak(currentBreakId) : null;
  const breakDuration = currentBreak?.duration || 5;

  const handleBreakComplete = useCallback(() => {
    if (currentBreakId) {
      endBreak(currentBreakId, notes || undefined);
      playBlockComplete();
      notifyBreakComplete();
    }
  }, [currentBreakId, endBreak, notes, playBlockComplete, notifyBreakComplete]);

  const timer = useTimer({
    duration: breakDuration * 60,
    onComplete: handleBreakComplete,
  });

  // Auto-start timer when view mounts
  useEffect(() => {
    if (timer.state === 'idle' && currentBreakId) {
      timer.start();
    }
  }, [timer, currentBreakId]);

  // Track Alt key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setAltPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setAltPressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleSkipToBlock = useCallback(() => {
    if (currentBreakId) {
      endBreak(currentBreakId, notes || undefined);
    }
    setCurrentBreakId(null);
    setIsOnBreak(false);
    setCurrentView('block');
  }, [currentBreakId, endBreak, notes, setCurrentBreakId, setIsOnBreak, setCurrentView]);

  // Keyboard shortcuts
  useKeyboard({
    'alt+enter': handleSkipToBlock,
    'alt+space': timer.toggle,
  }, [handleSkipToBlock, timer.toggle]);

  const isCompleted = timer.state === 'completed';

  return (
    <div className={`break-view ${altPressed ? 'alt-active' : ''}`}>
      <header className="break-header">
        <h1 className="break-title">Break Time</h1>
      </header>

      <main className="break-content">
        {!isCompleted ? (
          <>
            {/* Timer */}
            <div className="break-timer">
              <span className="break-time">{formatTime(timer.remaining)}</span>
              <span className="break-label">
                {timer.state === 'paused' ? 'Paused' : 'Relax'}
              </span>
              <div className="break-progress">
                <div
                  className="break-progress-fill"
                  style={{ width: `${timer.progress * 100}%` }}
                />
              </div>
            </div>

            {/* Notes */}
            <section className="break-notes-section">
              <h3 className="break-notes-title">Notes (optional)</h3>
              <textarea
                className="break-notes-input"
                placeholder="Thoughts, ideas, or things to remember..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </section>

            {/* Controls */}
            <div className="break-controls">
              <button className="break-btn secondary" onClick={timer.toggle}>
                {altPressed && <span className="shortcut-badge">Space</span>}
                {timer.state === 'paused' ? 'Resume' : 'Pause'}
              </button>
              <button className="break-btn primary" onClick={handleSkipToBlock}>
                {altPressed && <span className="shortcut-badge">Enter</span>}
                Start Next Block
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Break Complete */}
            <div className="break-complete">
              <div className="break-complete-icon">☕</div>
              <div className="break-complete-title">Break Complete!</div>
              <div className="break-complete-message">
                Ready for another focused block?
              </div>
            </div>

            <div className="break-controls">
              <button className="break-btn primary" onClick={handleSkipToBlock}>
                {altPressed && <span className="shortcut-badge">Enter</span>}
                Start Next Block
              </button>
            </div>
          </>
        )}
      </main>

      <footer className="break-hints">
        <span className="hint"><kbd>Alt</kbd>+<kbd>Space</kbd> pause</span>
        <span className="hint"><kbd>Alt</kbd>+<kbd>Enter</kbd> next block</span>
      </footer>
    </div>
  );
};
