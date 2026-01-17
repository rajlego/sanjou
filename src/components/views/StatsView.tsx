import { useCallback } from 'react';
import { useStats, formatDate, getDayOfWeek } from '../../hooks/useStats';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useUIStore } from '../../store/uiStore';
import './StatsView.css';

export const StatsView = () => {
  const stats = useStats();
  const setCurrentView = useUIStore((s) => s.setCurrentView);

  const handleBack = useCallback(() => {
    setCurrentView('block');
  }, [setCurrentView]);

  useKeyboard({
    'esc': handleBack,
    'alt+t': handleBack,
  }, [handleBack]);

  const maxTrendCount = Math.max(...stats.weeklyTrend.map(d => d.validCount), 1);

  return (
    <div className="stats-view">
      <header className="stats-header">
        <button className="stats-back-btn" onClick={handleBack}>
          ← Back
        </button>
        <h1 className="stats-title">Statistics</h1>
      </header>

      <main className="stats-content">
        {/* Streak */}
        <section className="stats-card streak-card">
          <div className="streak-icon">🔥</div>
          <div className="streak-info">
            <span className="streak-count">{stats.currentStreak}</span>
            <span className="streak-label">day streak</span>
          </div>
          {stats.longestStreak > stats.currentStreak && (
            <div className="streak-best">
              Best: {stats.longestStreak} days
            </div>
          )}
        </section>

        {/* Summary Cards */}
        <div className="stats-summary">
          <div className="summary-card">
            <span className="summary-value">{stats.todayValidCount}</span>
            <span className="summary-label">Today</span>
          </div>
          <div className="summary-card">
            <span className="summary-value">{stats.weekValidCount}</span>
            <span className="summary-label">This Week</span>
          </div>
          <div className="summary-card">
            <span className="summary-value">{stats.monthValidCount}</span>
            <span className="summary-label">This Month</span>
          </div>
        </div>

        {/* Weekly Trend */}
        <section className="stats-card">
          <h3 className="card-title">Weekly Trend</h3>
          <div className="trend-chart">
            {stats.weeklyTrend.map((day) => (
              <div key={day.date} className="trend-day">
                <div className="trend-bar-container">
                  <div
                    className="trend-bar"
                    style={{
                      height: `${(day.validCount / maxTrendCount) * 100}%`,
                      minHeight: day.validCount > 0 ? '4px' : '0',
                    }}
                  />
                </div>
                <span className="trend-count">{day.validCount}</span>
                <span className="trend-label">{getDayOfWeek(day.date)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Detailed Stats */}
        <section className="stats-card">
          <h3 className="card-title">Details</h3>
          <div className="stats-details">
            <div className="detail-row">
              <span className="detail-label">Completion Rate</span>
              <span className="detail-value">
                {Math.round(stats.completionRate * 100)}%
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Daily Average</span>
              <span className="detail-value">
                {stats.dailyAverage.toFixed(1)} blocks
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Total Blocks</span>
              <span className="detail-value">{stats.totalValidBlocks}</span>
            </div>
            {stats.bestDay && (
              <div className="detail-row">
                <span className="detail-label">Best Day</span>
                <span className="detail-value">
                  {formatDate(stats.bestDay.date)} ({stats.bestDay.count})
                </span>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="stats-footer">
        <span className="hint"><kbd>Esc</kbd> back</span>
        <span className="hint"><kbd>Alt</kbd>+<kbd>T</kbd> close</span>
      </footer>
    </div>
  );
};
