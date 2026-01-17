import { useEffect, useCallback, useState } from 'react';
import { BlockView, SettingsView, HistoryView, ShortcutsOverlay, BreakView, StatsView, AuthView } from './components/views';
import { ToastContainer } from './components/common';
import { useSync } from './hooks/useSync';
import { useSettingsStore } from './store/settingsStore';
import { useUIStore } from './store/uiStore';
import { useKeyboard } from './hooks/useKeyboard';
import './App.css';

export const App = () => {
  const theme = useSettingsStore((s) => s.theme);
  const { showSettings, setShowSettings, showShortcuts, setShowShortcuts, syncState, dataLoaded, currentView, setCurrentView, timerState, isOnBreak } = useUIStore();
  const [showAuth, setShowAuth] = useState(false);

  // Initialize sync
  useSync();

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const toggleHistory = useCallback(() => {
    // Only allow history toggle when timer is idle
    if (timerState === 'idle') {
      setCurrentView(currentView === 'history' ? 'block' : 'history');
    }
  }, [currentView, setCurrentView, timerState]);

  const toggleStats = useCallback(() => {
    // Only allow stats toggle when timer is idle
    if (timerState === 'idle') {
      setCurrentView(currentView === 'stats' ? 'block' : 'stats');
    }
  }, [currentView, setCurrentView, timerState]);

  // Global keyboard shortcuts (Alt+key)
  useKeyboard({
    'ctrl+,': () => setShowSettings(true),
    'alt+s': () => setShowSettings(true),
    'alt+h': toggleHistory,
    'alt+t': toggleStats,
    'alt+?': () => setShowShortcuts(true),
    'alt+/': () => setShowShortcuts(true),
  }, [setShowSettings, setShowShortcuts, toggleHistory, toggleStats]);

  if (!dataLoaded) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  // Determine which view to render
  const renderMainView = () => {
    if (isOnBreak) return <BreakView />;
    if (currentView === 'history') return <HistoryView />;
    if (currentView === 'stats') return <StatsView />;
    return <BlockView />;
  };

  return (
    <div className="app">
      {renderMainView()}

      {currentView !== 'history' && currentView !== 'stats' && !isOnBreak && (
        <footer className="app-footer">
          <div className="footer-left">
            <span className="sync-status">
              <span className={`sync-dot sync-dot-${syncState}`} />
              {syncState === 'synced' && 'Synced'}
              {syncState === 'syncing' && 'Syncing...'}
              {syncState === 'offline' && 'Offline'}
              {syncState === 'error' && 'Sync error'}
            </span>
          </div>
          <div className="footer-center">
            <span className="app-name">Sanjou</span>
          </div>
          <div className="footer-right">
            <button className="footer-btn" onClick={() => setShowSettings(true)}>
              Settings
            </button>
          </div>
        </footer>
      )}

      <SettingsView
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onOpenAuth={() => {
          setShowSettings(false);
          setShowAuth(true);
        }}
      />
      <AuthView isOpen={showAuth} onClose={() => setShowAuth(false)} />
      <ShortcutsOverlay isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <ToastContainer />
    </div>
  );
};
