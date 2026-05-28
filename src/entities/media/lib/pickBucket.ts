import type { SizeBucket } from '@/entities/media/model/types';

export const BUCKET_WIDTHS: Record<SizeBucket, number> = {
  thumb: 320,
  sm: 640,
  lg: 1280,
  xl: 1920,
};

const ORDER = Object.keys(BUCKET_WIDTHS) as SizeBucket[];

export function pickBucket(
  cssWidth: number,
  dpr: number,
  alreadyLoadedLarger?: SizeBucket,
): SizeBucket {
  const requiredWidth = cssWidth * Math.max(1, dpr);
  const selected = ORDER.find((bucket) => BUCKET_WIDTHS[bucket] >= requiredWidth) ?? 'xl';

  if (
    alreadyLoadedLarger !== undefined &&
    BUCKET_WIDTHS[alreadyLoadedLarger] > BUCKET_WIDTHS[selected]
  ) {
    return alreadyLoadedLarger;
  }
  return selected;
}
