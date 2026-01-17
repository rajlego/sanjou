import { useState, useEffect, useCallback } from 'react';
import type { RightNowList, RightNowItem } from '../models';
import { generateId } from '../models';
import {
  addRightNowList,
  updateRightNowList,
  deleteRightNowList,
  getRightNowListForBlock,
  subscribeToRightNowLists,
  rightNowListsMap,
} from '../sync/yjsProvider';

interface UseRightNowListReturn {
  lists: RightNowList[];
  currentList: RightNowList | null;
  createList: (blockId?: string) => RightNowList;
  addItem: (listId: string, text: string) => void;
  updateItem: (listId: string, itemId: string, updates: Partial<RightNowItem>) => void;
  toggleItem: (listId: string, itemId: string) => void;
  removeItem: (listId: string, itemId: string) => void;
  removeList: (listId: string) => void;
  getListForBlock: (blockId: string) => RightNowList | undefined;
  setCurrentList: (list: RightNowList | null) => void;
}

export const useRightNowList = (): UseRightNowListReturn => {
  const [lists, setLists] = useState<RightNowList[]>([]);
  const [currentList, setCurrentList] = useState<RightNowList | null>(null);

  useEffect(() => {
    setLists(Array.from(rightNowListsMap.values()));
    const unsubscribe = subscribeToRightNowLists((newLists) => {
      setLists(newLists);
      // Update current list if it changed
      if (currentList) {
        const updated = newLists.find((l) => l.id === currentList.id);
        if (updated) {
          setCurrentList(updated);
        }
      }
    });
    return unsubscribe;
  }, [currentList?.id]);

  const createList = useCallback((blockId?: string): RightNowList => {
    const list: RightNowList = {
      id: generateId(),
      blockId,
      items: [],
      createdAt: Date.now(),
    };
    addRightNowList(list);
    setCurrentList(list);
    return list;
  }, []);

  const addItem = useCallback((listId: string, text: string) => {
    const list = rightNowListsMap.get(listId);
    if (list) {
      const item: RightNowItem = {
        id: generateId(),
        text,
        completed: false,
      };
      updateRightNowList(listId, {
        items: [...list.items, item],
      });
    }
  }, []);

  const updateItem = useCallback(
    (listId: string, itemId: string, updates: Partial<RightNowItem>) => {
      const list = rightNowListsMap.get(listId);
      if (list) {
        updateRightNowList(listId, {
          items: list.items.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
        });
      }
    },
    []
  );

  const toggleItem = useCallback((listId: string, itemId: string) => {
    const list = rightNowListsMap.get(listId);
    if (list) {
      const item = list.items.find((i) => i.id === itemId);
      if (item) {
        updateItem(listId, itemId, { completed: !item.completed });
      }
    }
  }, [updateItem]);

  const removeItem = useCallback((listId: string, itemId: string) => {
    const list = rightNowListsMap.get(listId);
    if (list) {
      updateRightNowList(listId, {
        items: list.items.filter((item) => item.id !== itemId),
      });
    }
  }, []);

  const removeList = useCallback((listId: string) => {
    deleteRightNowList(listId);
    if (currentList?.id === listId) {
      setCurrentList(null);
    }
  }, [currentList?.id]);

  const getListForBlock = useCallback(
    (blockId: string) => getRightNowListForBlock(blockId),
    []
  );

  return {
    lists,
    currentList,
    createList,
    addItem,
    updateItem,
    toggleItem,
    removeItem,
    removeList,
    getListForBlock,
    setCurrentList,
  };
};
