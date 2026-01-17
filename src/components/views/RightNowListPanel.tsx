import { useState, useCallback, useRef, useEffect } from 'react';
import { Checkbox, Button } from '../common';
import { useRightNowList } from '../../hooks/useRightNowList';
import './RightNowListPanel.css';

interface RightNowListPanelProps {
  blockId: string | null;
  disabled?: boolean;
}

export const RightNowListPanel = ({ blockId, disabled }: RightNowListPanelProps) => {
  const [newItemText, setNewItemText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    currentList,
    createList,
    addItem,
    toggleItem,
    removeItem,
    removeList,
    getListForBlock,
    setCurrentList,
  } = useRightNowList();

  // Load or create list when block changes
  useEffect(() => {
    if (blockId) {
      const existingList = getListForBlock(blockId);
      if (existingList) {
        setCurrentList(existingList);
      } else if (!currentList || currentList.blockId !== blockId) {
        createList(blockId);
      }
    }
  }, [blockId, getListForBlock, currentList, setCurrentList, createList]);

  const handleAddItem = useCallback(() => {
    if (!newItemText.trim() || !currentList) return;
    addItem(currentList.id, newItemText.trim());
    setNewItemText('');
    inputRef.current?.focus();
  }, [newItemText, currentList, addItem]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  const handleClear = useCallback(() => {
    if (currentList) {
      removeList(currentList.id);
    }
  }, [currentList, removeList]);

  return (
    <section className="right-now-panel">
      <div className="right-now-header">
        <h3 className="section-title">Right Now List</h3>
        {currentList && currentList.items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>

      <p className="right-now-prompt">
        "What do I do in the first 30-120 seconds?"
      </p>

      {currentList && currentList.items.length > 0 && (
        <ul className="right-now-items">
          {currentList.items.map((item) => (
            <li key={item.id} className="right-now-item">
              <Checkbox
                checked={item.completed}
                onChange={() => toggleItem(currentList.id, item.id)}
                label={item.text}
              />
              <button
                className="item-remove"
                onClick={() => removeItem(currentList.id, item.id)}
                aria-label="Remove item"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="right-now-input-row">
        <input
          ref={inputRef}
          type="text"
          className="right-now-input"
          placeholder="Add next action..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={handleAddItem}
          disabled={disabled || !newItemText.trim()}
        >
          Add
        </Button>
      </div>
    </section>
  );
};
