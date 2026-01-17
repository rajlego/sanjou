import { useState, useEffect, useCallback } from 'react';
import type { Block, BlockMeta } from '../models';
import { generateId, getToday } from '../models';
import {
  blocksArray,
  addBlock,
  updateBlock,
  subscribeToBlocks,
} from '../sync/yjsProvider';

interface UseBlocksReturn {
  blocks: Block[];
  todayBlocks: Block[];
  todayValidCount: number;
  createBlock: (taskId?: string, meta?: BlockMeta) => Block;
  completeBlock: (id: string, celebrated?: boolean) => void;
  invalidateBlock: (id: string) => void;
  updateBlockNotes: (id: string, notes: string) => void;
  getBlock: (id: string) => Block | undefined;
}

export const useBlocks = (): UseBlocksReturn => {
  const [blocks, setBlocks] = useState<Block[]>([]);

  useEffect(() => {
    // Initial load
    setBlocks(blocksArray.toArray());

    // Subscribe to changes
    const unsubscribe = subscribeToBlocks(setBlocks);
    return unsubscribe;
  }, []);

  const todayBlocks = blocks.filter((b) => b.date === getToday());
  const todayValidCount = todayBlocks.filter((b) => b.isValid && b.completedAt).length;

  const createBlock = useCallback((taskId?: string, meta?: BlockMeta): Block => {
    const block: Block = {
      id: generateId(),
      date: getToday(),
      startedAt: Date.now(),
      taskId,
      meta: meta || {
        finishLinePictured: false,
        notInterrupted: false,
        committedToFocus: false,
        phoneSeparate: false,
        celebrated: false,
      },
      isValid: true,
    };
    addBlock(block);
    return block;
  }, []);

  const completeBlock = useCallback((id: string, celebrated = false) => {
    updateBlock(id, {
      completedAt: Date.now(),
      meta: {
        ...blocks.find((b) => b.id === id)?.meta,
        celebrated,
      } as BlockMeta,
    });
  }, [blocks]);

  const invalidateBlock = useCallback((id: string) => {
    updateBlock(id, { isValid: false });
  }, []);

  const updateBlockNotes = useCallback((id: string, notes: string) => {
    updateBlock(id, { notes });
  }, []);

  const getBlock = useCallback(
    (id: string) => blocks.find((b) => b.id === id),
    [blocks]
  );

  return {
    blocks,
    todayBlocks,
    todayValidCount,
    createBlock,
    completeBlock,
    invalidateBlock,
    updateBlockNotes,
    getBlock,
  };
};
