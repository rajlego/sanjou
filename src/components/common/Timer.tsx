import { formatTime } from '../../hooks/useTimer';
import type { TimerState } from '../../models';
import './Timer.css';

interface TimerProps {
  remaining: number;
  progress: number;
  state: TimerState;
  onToggle: () => void;
  onReset: () => void;
  disabled?: boolean;
}

export const Timer = ({
  remaining,
  progress,
  state,
  onToggle,
  onReset,
  disabled = false,
}: TimerProps) => {
  const getStateLabel = () => {
    switch (state) {
      case 'idle':
        return 'Ready';
      case 'running':
        return 'Focus';
      case 'paused':
        return 'Paused';
      case 'completed':
        return 'Complete!';
    }
  };

  return (
    <div className={`timer timer-${state}`}>
      <div className="timer-box" onClick={disabled ? undefined : onToggle}>
        <div className="timer-display">
          <span className="timer-time">{formatTime(remaining)}</span>
          <span className="timer-state">{getStateLabel()}</span>
        </div>
        <div className="timer-progress-track">
          <div
            className="timer-progress-bar"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
      <div className="timer-controls">
        <button
          className="timer-btn timer-btn-main"
          onClick={onToggle}
          disabled={disabled || state === 'completed'}
        >
          {state === 'running' ? 'Pause' : state === 'paused' ? 'Resume' : 'Start'}
        </button>
        {(state === 'paused' || state === 'completed') && (
          <button className="timer-btn timer-btn-reset" onClick={onReset}>
            Reset
          </button>
        )}
      </div>
      <div className="timer-hint">
        {state === 'idle' && !disabled && 'Press Space to start'}
        {state === 'running' && 'Press Space to pause'}
        {state === 'paused' && 'Press Space to resume'}
      </div>
    </div>
  );
};
