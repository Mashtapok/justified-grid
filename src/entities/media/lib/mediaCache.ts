import type { SizeBucket } from '@/entities/media/model/types';
import { WeightedLru } from '@/shared/lib/lru';
import { BUCKET_WIDTHS } from '@/entities/media/lib/pickBucket';

interface LoadedMedia {
  bucket: SizeBucket;
  element: HTMLImageElement;
}

const MAX_DECODED_BYTES = 150 * 1024 * 1024;
const MAX_LOADED_BUCKETS = 10_000;

// Decoded image elements are retained so cells can reattach them without another decode.
const decoded = new WeightedLru<string, LoadedMedia>(MAX_DECODED_BYTES);

// Loaded buckets are tracked separately for images and posters that do not retain DOM elements.
const loadedBuckets = new WeightedLru<string, SizeBucket>(MAX_LOADED_BUCKETS);

function pickLargestBucket(
  bucket: SizeBucket | undefined,
  fallback: SizeBucket | undefined,
): SizeBucket | undefined {
  if (bucket === undefined) {
    return fallback;
  }
  if (fallback === undefined) {
    return bucket;
  }
  return BUCKET_WIDTHS[bucket] >= BUCKET_WIDTHS[fallback] ? bucket : fallback;
}

/** keeps the largest loaded bucket so narrower re-renders do not downgrade cache state */
function markLoadedBucket(itemId: string, bucket: SizeBucket): boolean {
  const existingBucket = pickLargestBucket(loadedBuckets.get(itemId), decoded.peek(itemId)?.bucket);
  if (existingBucket !== undefined && BUCKET_WIDTHS[existingBucket] > BUCKET_WIDTHS[bucket]) {
    return false;
  }
  loadedBuckets.set(itemId, bucket, 1);
  return true;
}

export const mediaCache = {
  /** returns the largest bucket that has completed loading for an item */
  getLoadedBucket(itemId: string): SizeBucket | undefined {
    return pickLargestBucket(loadedBuckets.get(itemId), decoded.peek(itemId)?.bucket);
  },

  /** records a completed load without retaining the decoded element */
  rememberLoadedBucket(itemId: string, bucket: SizeBucket): void {
    markLoadedBucket(itemId, bucket);
  },

  /** returns a retained decoded image only when its bucket matches the request */
  takeDecodedElement(itemId: string, bucket: SizeBucket): HTMLImageElement | undefined {
    const retained = decoded.get(itemId);
    return retained?.bucket === bucket ? retained.element : undefined;
  },

  /** stores a decoded image element and charges the LRU by approximate RGBA bytes */
  remember(
    itemId: string,
    bucket: SizeBucket,
    element: HTMLImageElement,
    aspectRatio: number,
  ): void {
    if (!markLoadedBucket(itemId, bucket)) {
      return;
    }

    const width = BUCKET_WIDTHS[bucket];
    const decodedBytes = width * Math.round(width / aspectRatio) * 4;
    decoded.set(itemId, { bucket, element }, decodedBytes);
  },
};
