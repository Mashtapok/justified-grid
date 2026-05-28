import { useLayoutEffect, type RefObject } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { LayoutResult } from '@/features/feed/lib/layoutTypes';

/** maps layout rows to TanStack Virtual items and remeasures after layout changes */
export function useVirtualFeed(
  layout: LayoutResult,
  gap: number,
  scrollRef: RefObject<HTMLDivElement | null>,
) {
  // TanStack Virtual owns mutable measurement state; keep this hook outside compiler memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: layout.rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const isLast = index === layout.rows.length - 1;
      const row = layout.rows[index];
      return row === undefined ? 0 : row.height + (isLast ? 0 : gap);
    },
    overscan: 4,
    useFlushSync: false,
  });

  useLayoutEffect(() => {
    virtualizer.measure();
  }, [layout, virtualizer]);

  return {
    totalSize: layout.totalHeight,
    virtualRows: virtualizer.getVirtualItems(),
  };
}
