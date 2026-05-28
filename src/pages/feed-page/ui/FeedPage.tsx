import { useEffect } from 'react';
import { Feed } from '@/features/feed/ui/Feed';
import { usePrependRandomItems } from '@/features/prepend-items/model/usePrependRandomItems';
import { useFeedDataset } from '@/pages/feed-page/model/useFeedDataset';
import { useLayoutDensity } from '@/pages/feed-page/model/useLayoutDensity';
import { FeedHeader } from '@/pages/feed-page/ui/FeedHeader';
import styles from './FeedPage.module.css';

export function FeedPage() {
  const { items, setItems, error, isLoading } = useFeedDataset();
  const { targetItemsPerRow, animateLayout, updateDensity, animationTimerRef } = useLayoutDensity();
  const prependItems = usePrependRandomItems(setItems);

  useEffect(
    () => () => {
      window.clearTimeout(animationTimerRef.current);
    },
    [animationTimerRef],
  );

  if (error !== undefined) {
    return <div className={styles.message}>Failed to load feed: {error}</div>;
  }

  return (
    <main className={styles.app}>
      <FeedHeader
        targetItemsPerRow={targetItemsPerRow}
        onTargetItemsPerRowChange={updateDensity}
        onGenerateMore={prependItems}
      />
      {isLoading ? (
        <div className={styles.message}>Loading media...</div>
      ) : (
        <Feed items={items} targetItemsPerRow={targetItemsPerRow} animateLayout={animateLayout} />
      )}
    </main>
  );
}
