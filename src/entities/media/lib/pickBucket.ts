import type { SizeBucket } from '@/entities/media/model/types';

export const BUCKET_WIDTHS: Record<SizeBucket, number> = {
  xs: 160,
  thumb: 320,
  sm: 640,
  md: 960,
  lg: 1280,
};

const ORDER = Object.keys(BUCKET_WIDTHS) as SizeBucket[];

export function pickBucket(cssWidth: number, alreadyLoadedLarger?: SizeBucket): SizeBucket {
  const selected = ORDER.find((bucket) => BUCKET_WIDTHS[bucket] >= cssWidth) ?? 'lg';

  if (
    alreadyLoadedLarger !== undefined &&
    BUCKET_WIDTHS[alreadyLoadedLarger] > BUCKET_WIDTHS[selected]
  ) {
    return alreadyLoadedLarger;
  }
  return selected;
}
