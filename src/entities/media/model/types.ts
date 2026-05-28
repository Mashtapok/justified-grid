export const SIZE_BUCKETS = ['xs', 'thumb', 'sm', 'md', 'lg'] as const;

export type SizeBucket = (typeof SIZE_BUCKETS)[number];

export interface BaseItem {
  id: string;
  width: number;
  height: number;
}

export interface ImageItem extends BaseItem {
  type: 'image';
  srcset: Record<SizeBucket, string>;
  blurhash?: string;
}

export interface VideoItem extends BaseItem {
  type: 'video';
  poster: string;
  src: string;
  durationMs: number;
}

export type MediaItem = ImageItem | VideoItem;
