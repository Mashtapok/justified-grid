import type { SizeBucket } from '@/entities/media/model/types';
import { WeightedLru } from '@/shared/lib/lru';
import { BUCKET_WIDTHS } from '@/entities/media/lib/pickBucket';

const MAX_LOADED_BUCKETS = 10_000;

const loadedBuckets = new WeightedLru<string, SizeBucket>(MAX_LOADED_BUCKETS);

/** keeps the largest loaded bucket so narrower re-renders do not downgrade cache state */
function markLoadedBucket(itemId: string, bucket: SizeBucket): void {
  const existingBucket = loadedBuckets.get(itemId);
  if (existingBucket !== undefined && BUCKET_WIDTHS[existingBucket] > BUCKET_WIDTHS[bucket]) {
    return;
  }
  loadedBuckets.set(itemId, bucket, 1);
}

export const mediaCache = {
  /** returns the largest bucket that has completed loading for an item */
  getLoadedBucket(itemId: string): SizeBucket | undefined {
    return loadedBuckets.get(itemId);
  },

  /** records a completed load */
  rememberLoadedBucket(itemId: string, bucket: SizeBucket): void {
    markLoadedBucket(itemId, bucket);
  },
};
