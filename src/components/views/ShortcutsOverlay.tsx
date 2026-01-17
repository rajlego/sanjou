import { Modal } from '../common';
import './ShortcutsOverlay.css';

interface ShortcutsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  action: string;
}

interface ShortcutCategory {
  name: string;
  items: ShortcutItem[];
}

const shortcuts: ShortcutCategory[] = [
  {
    name: 'Timer',
    items: [
      { keys: ['Alt', 'Space'], action: 'Start / Pause / Resume' },
      { keys: ['Alt', 'Enter'], action: 'Start block (when ready)' },
      { keys: ['Alt', 'I'], action: 'Mark interrupted' },
      { keys: ['Alt', 'R'], action: 'Reset (when paused)' },
      { keys: ['Alt', 'B'], action: 'Start break (after block)' },
    ],
  },
  {
    name: 'Meta Checklist',
    items: [
      { keys: ['Alt', '1'], action: 'Toggle "Finish line"' },
      { keys: ['Alt', '2'], action: 'Toggle "Uninterrupted"' },
      { keys: ['Alt', '3'], action: 'Toggle "No distractions"' },
      { keys: ['Alt', '4'], action: 'Toggle "Phone away"' },
      { keys: ['Alt', '5'], action: 'Toggle "Celebrate"' },
    ],
  },
  {
    name: 'Navigation',
    items: [
      { keys: ['Alt', 'H'], action: 'Toggle history view' },
      { keys: ['Alt', 'T'], action: 'Toggle statistics view' },
      { keys: ['Alt', 'N'], action: 'Open task notes' },
      { keys: ['Alt', 'S'], action: 'Open settings' },
      { keys: ['Alt', '?'], action: 'Show this help' },
      { keys: ['Esc'], action: 'Close modal / Go back' },
    ],
  },
];

export const ShortcutsOverlay = ({ isOpen, onClose }: ShortcutsOverlayProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" width="md">
      <div className="shortcuts-content">
        {shortcuts.map((category) => (
          <section key={category.name} className="shortcuts-section">
            <h3 className="shortcuts-category">{category.name}</h3>
            <div className="shortcuts-list">
              {category.items.map((item, index) => (
                <div key={index} className="shortcut-row">
                  <div className="shortcut-keys">
                    {item.keys.map((key, keyIndex) => (
                      <span key={keyIndex}>
                        <kbd className="shortcut-key">{key}</kbd>
                        {keyIndex < item.keys.length - 1 && (
                          <span className="key-separator">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                  <span className="shortcut-action">{item.action}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
        <footer className="shortcuts-footer">
          <p className="shortcuts-hint">
            Hold <kbd>Alt</kbd> to see shortcut badges on buttons
          </p>
        </footer>
      </div>
    </Modal>
  );
};
