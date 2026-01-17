import { useState, useCallback, FormEvent } from 'react';
import { Modal, Button } from '../common';
import { useAuth } from '../../hooks/useAuth';
import './AuthView.css';

interface AuthViewProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'signin' | 'signup';

export const AuthView = ({ isOpen, onClose }: AuthViewProps) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { signIn, signUp, isLoading } = useAuth();

  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
  }, []);

  const switchMode = useCallback((newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      const result = await signUp(email.trim(), password);
      if (result.success) {
        resetForm();
        onClose();
      } else {
        setError(result.error || 'Sign up failed');
      }
    } else {
      const result = await signIn(email.trim(), password);
      if (result.success) {
        resetForm();
        onClose();
      } else {
        setError(result.error || 'Sign in failed');
      }
    }
  }, [mode, email, password, confirmPassword, signIn, signUp, resetForm, onClose]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'signin' ? 'Sign In' : 'Create Account'}
      width="sm"
    >
      <div className="auth-view">
        <p className="auth-description">
          {mode === 'signin'
            ? 'Sign in to sync your data across devices.'
            : 'Create an account to sync your data across devices.'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>

          {mode === 'signup' && (
            <div className="auth-field">
              <label className="auth-label" htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                className="auth-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
              />
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
            className="auth-submit"
          >
            {isLoading
              ? 'Please wait...'
              : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
          </Button>
        </form>

        <div className="auth-switch">
          {mode === 'signin' ? (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                className="auth-link"
                onClick={() => switchMode('signup')}
              >
                Create one
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                className="auth-link"
                onClick={() => switchMode('signin')}
              >
                Sign in
              </button>
            </p>
          )}
        </div>

        <p className="auth-note">
          Your data is stored locally and works offline.
          Sign in is only needed for cloud sync.
        </p>
      </div>
    </Modal>
  );
};
