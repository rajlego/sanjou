import { useEffect, useCallback } from 'react';

type KeyHandler = (e: KeyboardEvent) => void;

interface KeyBindings {
  [key: string]: KeyHandler;
}

const isEditing = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    target.isContentEditable
  );
};

export const useKeyboard = (bindings: KeyBindings, deps: unknown[] = []) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isEditing(e.target)) return;

      // Build key string (e.g., "ctrl+s", "shift+?")
      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push('ctrl');
      if (e.altKey) parts.push('alt');
      if (e.shiftKey) parts.push('shift');

      // Normalize key
      let key = e.key.toLowerCase();
      if (key === ' ') key = 'space';
      if (key === 'escape') key = 'esc';

      parts.push(key);
      const combo = parts.join('+');

      // Check for exact match first
      if (bindings[combo]) {
        e.preventDefault();
        bindings[combo](e);
        return;
      }

      // Check for key without modifiers (for simple bindings)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && bindings[key]) {
        e.preventDefault();
        bindings[key](e);
        return;
      }

      // Special case: shift+key for symbols
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (bindings[`shift+${key}`]) {
          e.preventDefault();
          bindings[`shift+${key}`](e);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bindings, ...deps]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

export const useGlobalShortcuts = (handlers: {
  onToggleTimer?: () => void;
  onReset?: () => void;
  onOpenSettings?: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onSelect?: () => void;
  onBack?: () => void;
}) => {
  const bindings: KeyBindings = {};

  if (handlers.onToggleTimer) bindings['space'] = handlers.onToggleTimer;
  if (handlers.onReset) bindings['r'] = handlers.onReset;
  if (handlers.onOpenSettings) bindings['ctrl+,'] = handlers.onOpenSettings;
  if (handlers.onNavigateUp) {
    bindings['k'] = handlers.onNavigateUp;
    bindings['arrowup'] = handlers.onNavigateUp;
  }
  if (handlers.onNavigateDown) {
    bindings['j'] = handlers.onNavigateDown;
    bindings['arrowdown'] = handlers.onNavigateDown;
  }
  if (handlers.onSelect) bindings['enter'] = handlers.onSelect;
  if (handlers.onBack) {
    bindings['esc'] = handlers.onBack;
    bindings['h'] = handlers.onBack;
  }

  useKeyboard(bindings, [handlers]);
};
