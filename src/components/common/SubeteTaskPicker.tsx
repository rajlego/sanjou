import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useSubeteTasks, filterTasksByStatus, sortTasksByPriority, type SubeteTask } from '../../hooks/useSubeteTasks';
import { showToast } from '../../store/toastStore';
import './SubeteTaskPicker.css';

interface SubeteTaskPickerProps {
  onSelect: (task: SubeteTask) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef?: React.RefObject<HTMLElement>;
}

type StatusGroup = 'in_progress' | 'today' | 'sprint';

const STATUS_LABELS: Record<StatusGroup, string> = {
  in_progress: 'In Progress',
  today: 'Today',
  sprint: 'Sprint',
};

const STATUS_ORDER: StatusGroup[] = ['in_progress', 'today', 'sprint'];

export const SubeteTaskPicker = ({
  onSelect,
  isOpen,
  onOpenChange,
  triggerRef,
}: SubeteTaskPickerProps) => {
  const { tasks: allTasks, loading } = useSubeteTasks();
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Get actionable tasks (today, in_progress, sprint)
  const actionableTasks = useMemo(() => {
    const filtered = filterTasksByStatus(allTasks, ['today', 'in_progress', 'sprint']);
    return sortTasksByPriority(filtered);
  }, [allTasks]);

  // Filter tasks by search query (content and tags)
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return actionableTasks;

    const query = searchQuery.toLowerCase();
    return actionableTasks.filter((task) => {
      const contentMatch = task.content.toLowerCase().includes(query);
      // Check if task has tags property and search within tags
      const tagsMatch = (task as SubeteTask & { tags?: string[] }).tags?.some(
        (tag) => tag.toLowerCase().includes(query)
      );
      return contentMatch || tagsMatch;
    });
  }, [actionableTasks, searchQuery]);

  // Group tasks by status
  const groupedTasks = useMemo(() => {
    const groups: Record<StatusGroup, SubeteTask[]> = {
      in_progress: [],
      today: [],
      sprint: [],
    };

    filteredTasks.forEach((task) => {
      const status = task.status as StatusGroup;
      if (groups[status]) {
        groups[status].push(task);
      }
    });

    return groups;
  }, [filteredTasks]);

  // Flatten grouped tasks for keyboard navigation
  const flattenedTasks = useMemo(() => {
    const flat: SubeteTask[] = [];
    STATUS_ORDER.forEach((status) => {
      flat.push(...groupedTasks[status]);
    });
    return flat;
  }, [groupedTasks]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure dropdown is rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      setHighlightedIndex(0);
      setSearchQuery('');
    }
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    const item = itemRefs.current.get(highlightedIndex);
    if (item && dropdownRef.current) {
      const dropdown = dropdownRef.current;
      const itemTop = item.offsetTop;
      const itemBottom = itemTop + item.offsetHeight;
      const scrollTop = dropdown.scrollTop;
      const scrollBottom = scrollTop + dropdown.clientHeight;

      // Account for the sticky search header (approximately 48px)
      const headerOffset = 48;

      if (itemTop < scrollTop + headerOffset) {
        dropdown.scrollTop = itemTop - headerOffset;
      } else if (itemBottom > scrollBottom) {
        dropdown.scrollTop = itemBottom - dropdown.clientHeight;
      }
    }
  }, [highlightedIndex]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        (!triggerRef?.current || !triggerRef.current.contains(target))
      ) {
        onOpenChange(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onOpenChange, triggerRef]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < flattenedTasks.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (flattenedTasks[highlightedIndex]) {
            handleSelectTask(flattenedTasks[highlightedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    },
    [flattenedTasks, highlightedIndex, onOpenChange]
  );

  const handleSelectTask = useCallback(
    (task: SubeteTask) => {
      onSelect(task);
      onOpenChange(false);
      showToast.info(`Selected: ${task.content.slice(0, 40)}${task.content.length > 40 ? '...' : ''}`);
    },
    [onSelect, onOpenChange]
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return '>';
      case 'today':
        return 'T';
      case 'sprint':
        return 'S';
      default:
        return '?';
    }
  };

  if (!isOpen) return null;

  // Track current index for flattened list
  let currentFlatIndex = -1;

  return (
    <div
      className="subete-picker-dropdown"
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
    >
      {/* Search Input - Sticky at top */}
      <div className="subete-picker-search">
        <input
          ref={searchInputRef}
          type="text"
          className="subete-picker-search-input"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setHighlightedIndex(0);
          }}
        />
        {searchQuery && (
          <button
            className="subete-picker-search-clear"
            onClick={() => {
              setSearchQuery('');
              searchInputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            {'\u00d7'}
          </button>
        )}
      </div>

      {/* Task List */}
      <div className="subete-picker-list">
        {loading ? (
          <div className="subete-picker-loading">Loading tasks...</div>
        ) : flattenedTasks.length === 0 ? (
          <div className="subete-picker-empty">
            {searchQuery ? 'No tasks found' : 'No actionable tasks'}
          </div>
        ) : (
          STATUS_ORDER.map((status) => {
            const tasks = groupedTasks[status];
            if (tasks.length === 0) return null;

            return (
              <div key={status} className="subete-picker-group">
                <div className="subete-picker-group-header">
                  {STATUS_LABELS[status]}
                  <span className="subete-picker-group-count">
                    {tasks.length}
                  </span>
                </div>
                {tasks.map((task) => {
                  currentFlatIndex++;
                  const flatIndex = currentFlatIndex;
                  const isHighlighted = flatIndex === highlightedIndex;

                  return (
                    <div
                      key={task.id}
                      ref={(el) => {
                        if (el) {
                          itemRefs.current.set(flatIndex, el);
                        } else {
                          itemRefs.current.delete(flatIndex);
                        }
                      }}
                      className={`subete-picker-item status-${task.status} ${
                        isHighlighted ? 'highlighted' : ''
                      }`}
                      onClick={() => handleSelectTask(task)}
                      onMouseEnter={() => setHighlightedIndex(flatIndex)}
                    >
                      <span className="subete-picker-status">
                        {getStatusBadge(task.status)}
                      </span>
                      <div className="subete-picker-content">
                        <span className="subete-picker-text">{task.content}</span>
                        {/* Show tags if present */}
                        {(task as SubeteTask & { tags?: string[] }).tags &&
                          (task as SubeteTask & { tags?: string[] }).tags!.length > 0 && (
                            <div className="subete-picker-tags">
                              {(task as SubeteTask & { tags?: string[] }).tags!.slice(0, 3).map((tag) => (
                                <span key={tag} className="subete-picker-tag">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>
                      <div className="subete-picker-meta">
                        {task.value > 0 && task.time > 0 && (
                          <span className="subete-picker-ratio">
                            {task.value}/{task.time}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Footer with keyboard hints */}
      <div className="subete-picker-footer">
        <span className="subete-picker-hint">
          <kbd>{'\u2191'}</kbd><kbd>{'\u2193'}</kbd> navigate
        </span>
        <span className="subete-picker-hint">
          <kbd>Enter</kbd> select
        </span>
        <span className="subete-picker-hint">
          <kbd>Esc</kbd> close
        </span>
      </div>
    </div>
  );
};
