import { useLayoutEffect, useRef, type RefObject } from 'react';
import type { MediaItem } from '@/entities/media/model/types';
import type { LayoutResult } from '@/features/feed/lib/layoutTypes';

interface Anchor {
  id: string;
  viewportOffset: number;
}

interface PreviousLayout {
  items: ReadonlyArray<MediaItem>;
  layout: LayoutResult;
}

/** picks the most visible item as the scroll anchor for the next layout */
function findAnchor(
  items: ReadonlyArray<MediaItem>,
  layout: LayoutResult,
  scrollTop: number,
  viewportHeight: number,
): Anchor | undefined {
  const viewportBottom = scrollTop + viewportHeight;
  let best: { area: number; anchor: Anchor } | undefined;

  for (const item of items) {
    const position = layout.positions.get(item.id);

    if (position === undefined) {
      continue;
    }

    const overlap = Math.max(
      0,
      Math.min(position.y + position.height, viewportBottom) - Math.max(position.y, scrollTop),
    );

    const area = overlap * position.width;

    if (area > (best?.area ?? 0)) {
      best = {
        area,
        anchor: { id: item.id, viewportOffset: position.y - scrollTop },
      };
    }
  }

  return best?.anchor;
}

/** preserves scroll position across layout changes by keeping the same anchor offset */
export function useScrollAnchor(
  items: ReadonlyArray<MediaItem>,
  layout: LayoutResult,
  scrollRef: RefObject<HTMLDivElement | null>,
): void {
  const previousRef = useRef<PreviousLayout | undefined>(undefined);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    const previous = previousRef.current;

    if (element !== null && previous !== undefined && previous.layout !== layout) {
      // Find the anchor in the old layout before restoring its offset in the new layout.
      const anchor = findAnchor(
        previous.items,
        previous.layout,
        element.scrollTop,
        element.clientHeight,
      );
      const nextPosition = anchor === undefined ? undefined : layout.positions.get(anchor.id);

      if (anchor !== undefined && nextPosition !== undefined) {
        element.scrollTop = nextPosition.y - anchor.viewportOffset;
      }
    }

    previousRef.current = { items, layout };
  }, [items, layout, scrollRef]);
}
