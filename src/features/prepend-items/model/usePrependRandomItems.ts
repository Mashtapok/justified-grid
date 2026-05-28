import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import type { MediaItem } from '@/entities/media/model/types';
import { pickRandomItems } from '@/features/prepend-items/lib/pickRandom';
import { getRandomInt } from '@/shared/lib/getRandomInt';

const MAX_PREPEND_BATCH = 5;

function cloneWithId(item: MediaItem, id: string): MediaItem {
  return { ...item, id };
}

function prependRandomItems(
  current: ReadonlyArray<MediaItem>,
  prependedSequence: number,
): { prependedItems: ReadonlyArray<MediaItem>; nextPrependedSequence: number } {
  if (current.length === 0) {
    return { prependedItems: current, nextPrependedSequence: prependedSequence };
  }

  const count = getRandomInt(1, Math.min(MAX_PREPEND_BATCH, current.length));
  const picked = pickRandomItems(current, count);
  let sequence = prependedSequence;

  const prefix = picked.map((item) => {
    sequence += 1;
    return cloneWithId(item, `prepended-${sequence}-${item.id}`);
  });

  return {
    prependedItems: [...prefix, ...current],
    nextPrependedSequence: sequence,
  };
}

/** returns an action that prepends random mock clones (1-5 items) with stable generated ids */
// TODO: replace with the real API-backed prepend implementation.
export function usePrependRandomItems(
  setItems: Dispatch<SetStateAction<ReadonlyArray<MediaItem>>>,
): () => void {
  const prependedSequenceRef = useRef(0);

  return useCallback(() => {
    setItems((current) => {
      const result = prependRandomItems(current, prependedSequenceRef.current);
      prependedSequenceRef.current = result.nextPrependedSequence;
      return result.prependedItems;
    });
  }, [setItems]);
}
