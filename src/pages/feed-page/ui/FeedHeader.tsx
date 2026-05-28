import { Slider } from '@/shared/ui/Slider/Slider';
import styles from './FeedHeader.module.css';

const STEPS = [2, 3, 4, 5, 6] as const;

interface FeedHeaderProps {
  targetItemsPerRow: number;
  onTargetItemsPerRowChange: (next: number) => void;
  onGenerateMore: () => void;
}

export function FeedHeader({
  targetItemsPerRow,
  onTargetItemsPerRowChange,
  onGenerateMore,
}: FeedHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.identity}>
        <h1 className={styles.title}>Justified Feed Demo</h1>
      </div>
      <div className={styles.controls}>
        <button className={styles.button} type="button" onClick={onGenerateMore}>
          Generate more
        </button>
        <label className={styles.density}>
          <span>Items per row</span>
          <Slider
            value={targetItemsPerRow}
            onValueChange={onTargetItemsPerRowChange}
            steps={STEPS}
            ariaLabel="Items per row"
          />
          <output>{targetItemsPerRow}</output>
        </label>
      </div>
    </header>
  );
}
