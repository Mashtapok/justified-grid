import { SIZE_BUCKETS, type ImageItem, type MediaItem, type VideoItem } from './types';

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function readString(record: Record<string, unknown>, key: string, label: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label}.${key} must be a non-empty string`);
  }
  return value;
}

function readPositiveNumber(record: Record<string, unknown>, key: string, label: string): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label}.${key} must be a positive finite number`);
  }
  return value;
}

function parseImage(item: Record<string, unknown>, base: BaseFields, label: string): ImageItem {
  const inputSrcset = item.srcset;
  assertRecord(inputSrcset, `${label}.srcset`);

  const srcset = Object.fromEntries(
    SIZE_BUCKETS.map((bucket) => [bucket, readString(inputSrcset, bucket, `${label}.srcset`)]),
  ) as ImageItem['srcset'];
  const blurhash = item.blurhash;

  if (blurhash !== undefined && typeof blurhash !== 'string') {
    throw new Error(`${label}.blurhash must be a string when present`);
  }

  return blurhash === undefined
    ? { ...base, type: 'image', srcset }
    : { ...base, type: 'image', srcset, blurhash };
}

function parseVideo(item: Record<string, unknown>, base: BaseFields, label: string): VideoItem {
  return {
    ...base,
    type: 'video',
    poster: readString(item, 'poster', label),
    src: readString(item, 'src', label),
    durationMs: readPositiveNumber(item, 'durationMs', label),
  };
}

type BaseFields = Pick<MediaItem, 'id' | 'width' | 'height'>;

export function parseDataset(input: unknown): MediaItem[] {
  if (!Array.isArray(input)) {
    throw new Error('dataset must be an array');
  }

  const ids = new Set<string>();

  return input.map((unknownItem, index) => {
    const label = `dataset[${index}]`;
    assertRecord(unknownItem, label);

    const base = {
      id: readString(unknownItem, 'id', label),
      width: readPositiveNumber(unknownItem, 'width', label),
      height: readPositiveNumber(unknownItem, 'height', label),
    };

    if (ids.has(base.id)) {
      throw new Error(`${label}.id is duplicated: ${base.id}`);
    }
    ids.add(base.id);

    if (unknownItem.type === 'image') {
      return parseImage(unknownItem, base, label);
    }
    if (unknownItem.type === 'video') {
      return parseVideo(unknownItem, base, label);
    }
    throw new Error(`${label}.type must be "image" or "video"`);
  });
}
