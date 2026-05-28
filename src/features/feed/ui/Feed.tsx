import { useDeferredValue, useMemo } from 'react';
import type { MediaItem } from '@/entities/media/model/types';
import { MediaCard } from '@/entities/media/ui/MediaCard';
import { checkVisibility } from '@/features/feed/lib/checkVisibility';
import { computeLayout } from '@/features/feed/lib/computeLayout';
import { useFastScroll } from '@/features/feed/model/useFastScroll';
import { useFeedViewport } from '@/features/feed/model/useFeedViewport';
import { useScrollAnchor } from '@/features/feed/model/useScrollAnchor';
import { useVirtualFeed } from '@/features/feed/model/useVirtualFeed';
import { measureSync } from '@/shared/lib/perfMarks';
import styles from './Feed.module.css';

const GAP = 4;

interface FeedProps {
  items: ReadonlyArray<MediaItem>;
  targetItemsPerRow: number;
  animateLayout: boolean;
}

export function Feed({ items, targetItemsPerRow, animateLayout }: FeedProps) {
  const { scrollRef, containerWidth, viewport } = useFeedViewport();
  const deferredTarget = useDeferredValue(targetItemsPerRow);

  const layout = useMemo(
    () =>
      measureSync('feed:layout', () => computeLayout(items, containerWidth, deferredTarget, GAP)),
    [items, containerWidth, deferredTarget],
  );

  useScrollAnchor(items, layout, scrollRef);
  const { virtualRows, totalSize } = useVirtualFeed(layout, GAP, scrollRef);

  const virtualItems = useMemo(() => {
    const result: Array<{
      item: MediaItem;
      position: { x: number; y: number; width: number; height: number };
    }> = [];
    for (const virtualRow of virtualRows) {
      const row = layout.rows[virtualRow.index];
      if (row === undefined) {
        continue;
      }
      for (let index = row.startIndex; index <= row.endIndex; index += 1) {
        const item = items[index];
        const position = item === undefined ? undefined : layout.positions.get(item.id);
        if (item !== undefined && position !== undefined) {
          result.push({ item, position });
        }
      }
    }
    return result;
  }, [virtualRows, layout, items]);

  const visibleItemIds = useMemo(() => virtualItems.map(({ item }) => item.id), [virtualItems]);
  const { shouldRenderPlainPlaceholder } = useFastScroll({ scrollRef, visibleItemIds });

  const cells = virtualItems.map(({ item, position }) => (
    <MediaCard
      key={item.id}
      item={item}
      position={position}
      visibility={checkVisibility(position, viewport)}
      deferMedia={shouldRenderPlainPlaceholder(item.id)}
    />
  ));

  return (
    <div
      ref={scrollRef}
      className={styles.scroller}
      data-testid="feed-scroller"
      data-total-items={items.length}
    >
      <div
        className={`${styles.stage} ${animateLayout ? styles.transitioning : ''}`}
        style={{ height: totalSize }}
      >
        {cells}
      </div>
    </div>
  );
}
