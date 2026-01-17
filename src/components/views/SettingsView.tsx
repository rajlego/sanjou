import { useState } from 'react';
import { Modal, Button } from '../common';
import { useSettingsStore } from '../../store/settingsStore';
import { useExport } from '../../hooks/useExport';
import { useAuth } from '../../hooks/useAuth';
import './SettingsView.css';

interface SettingsViewProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

export const SettingsView = ({ isOpen, onClose, onOpenAuth }: SettingsViewProps) => {
  const {
    blockDuration,
    breakDuration,
    longBreakDuration,
    blocksUntilLongBreak,
    soundEnabled,
    notificationsEnabled,
    theme,
    setBlockDuration,
    setBreakDuration,
    setLongBreakDuration,
    setBlocksUntilLongBreak,
    setSoundEnabled,
    setNotificationsEnabled,
    setTheme,
    resetToDefaults,
  } = useSettingsStore();

  const { exportData } = useExport();
  const { user, isAuthenticated, isAuthAvailable, signOut, isLoading } = useAuth();
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setExportStatus('Exporting...');
    const success = await exportData(format);
    if (success) {
      setExportStatus('Export complete!');
      setTimeout(() => setExportStatus(null), 2000);
    } else {
      setExportStatus(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" width="sm">
      <div className="settings">
        <section className="settings-section">
          <h4 className="settings-section-title">Timer</h4>

          <div className="setting-row">
            <label className="setting-label">Block duration</label>
            <div className="setting-input-group">
              <input
                type="number"
                className="setting-input"
                value={blockDuration}
                onChange={(e) => setBlockDuration(Math.max(1, parseInt(e.target.value) || 25))}
                min="1"
                max="120"
              />
              <span className="setting-unit">min</span>
            </div>
          </div>

          <div className="setting-row">
            <label className="setting-label">Short break</label>
            <div className="setting-input-group">
              <input
                type="number"
                className="setting-input"
                value={breakDuration}
                onChange={(e) => setBreakDuration(Math.max(1, parseInt(e.target.value) || 5))}
                min="1"
                max="60"
              />
              <span className="setting-unit">min</span>
            </div>
          </div>

          <div className="setting-row">
            <label className="setting-label">Long break</label>
            <div className="setting-input-group">
              <input
                type="number"
                className="setting-input"
                value={longBreakDuration}
                onChange={(e) => setLongBreakDuration(Math.max(1, parseInt(e.target.value) || 15))}
                min="1"
                max="60"
              />
              <span className="setting-unit">min</span>
            </div>
          </div>

          <div className="setting-row">
            <label className="setting-label">Long break after</label>
            <div className="setting-input-group">
              <input
                type="number"
                className="setting-input"
                value={blocksUntilLongBreak}
                onChange={(e) => setBlocksUntilLongBreak(Math.max(1, parseInt(e.target.value) || 4))}
                min="1"
                max="10"
              />
              <span className="setting-unit">blocks</span>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h4 className="settings-section-title">Appearance</h4>

          <div className="setting-row">
            <label className="setting-label">Theme</label>
            <select
              className="setting-select"
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'dark' | 'light' | 'system')}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>

          <div className="setting-row">
            <label className="setting-label">Sound effects</label>
            <button
              className={`setting-toggle ${soundEnabled ? 'setting-toggle-on' : ''}`}
              onClick={() => setSoundEnabled(!soundEnabled)}
              role="switch"
              aria-checked={soundEnabled}
            >
              <span className="toggle-track">
                <span className="toggle-thumb" />
              </span>
              <span className="toggle-label">{soundEnabled ? 'On' : 'Off'}</span>
            </button>
          </div>

          <div className="setting-row">
            <label className="setting-label">Notifications</label>
            <button
              className={`setting-toggle ${notificationsEnabled ? 'setting-toggle-on' : ''}`}
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              role="switch"
              aria-checked={notificationsEnabled}
            >
              <span className="toggle-track">
                <span className="toggle-thumb" />
              </span>
              <span className="toggle-label">{notificationsEnabled ? 'On' : 'Off'}</span>
            </button>
          </div>
        </section>

        <section className="settings-section">
          <h4 className="settings-section-title">Keyboard Shortcuts</h4>
          <div className="shortcuts-list">
            <div className="shortcut-row">
              <kbd>Space</kbd>
              <span>Start/Pause timer</span>
            </div>
            <div className="shortcut-row">
              <kbd>R</kbd>
              <span>Reset timer</span>
            </div>
            <div className="shortcut-row">
              <kbd>I</kbd>
              <span>Mark interrupted</span>
            </div>
            <div className="shortcut-row">
              <kbd>T</kbd>
              <span>Select task</span>
            </div>
            <div className="shortcut-row">
              <kbd>Esc</kbd>
              <span>Close modal</span>
            </div>
          </div>
        </section>

        {isAuthAvailable && (
          <section className="settings-section">
            <h4 className="settings-section-title">Account</h4>
            {isAuthenticated ? (
              <div className="account-info">
                <div className="account-user">
                  <span className="account-email">{user?.email}</span>
                  <span className="account-status">Signed in</span>
                </div>
                <Button
                  variant="secondary"
                  onClick={handleSignOut}
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing out...' : 'Sign Out'}
                </Button>
              </div>
            ) : (
              <div className="account-signin">
                <p className="account-description">
                  Sign in to sync your data across devices.
                </p>
                <Button variant="primary" onClick={onOpenAuth}>
                  Sign In
                </Button>
              </div>
            )}
          </section>
        )}

        <section className="settings-section">
          <h4 className="settings-section-title">Data</h4>
          <div className="export-options">
            <p className="export-description">Export your block data for backup or analysis.</p>
            <div className="export-buttons">
              <Button variant="secondary" onClick={() => handleExport('json')}>
                Export JSON
              </Button>
              <Button variant="secondary" onClick={() => handleExport('csv')}>
                Export CSV
              </Button>
            </div>
            {exportStatus && <span className="export-status">{exportStatus}</span>}
          </div>
        </section>

        <div className="settings-footer">
          <Button variant="ghost" onClick={resetToDefaults}>
            Reset to Defaults
          </Button>
        </div>
      </div>
    </Modal>
  );
};
