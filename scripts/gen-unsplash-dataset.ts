import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDataset } from '../src/entities/media/model/parseDataset';
import type {
  ImageItem,
  MediaItem,
  SizeBucket,
  VideoItem,
} from '../src/entities/media/model/types';

const ITEM_COUNT = 2000;
const IMAGE_COUNT = 1700;
const VIDEO_COUNT = ITEM_COUNT - IMAGE_COUNT;
const UNSPLASH_PAGE_SIZE = 30;
const UNSPLASH_API_ROOT = 'https://api.unsplash.com';
const BUCKET_WIDTHS: Record<SizeBucket, number> = {
  xs: 160,
  thumb: 320,
  sm: 640,
  md: 960,
  lg: 1280,
};
const COVERR_VIDEO_ROOT = 'https://cdn.coverr.co/videos';
const VIDEO_POOL = [
  {
    baseFilename: 'coverr-panoramic-view-of-serene-beach-landscape',
    durationMs: 16100,
    width: 640,
    height: 360,
  },
  {
    baseFilename: 'coverr-soaring-above-the-clouds-and-mountains',
    durationMs: 12833,
    width: 640,
    height: 360,
  },
  {
    baseFilename: 'coverr-walking-to-the-mountain-top-8360',
    durationMs: 15240,
    width: 640,
    height: 360,
  },
  {
    baseFilename: 'coverr-busy-highway-overpass-in-daylight',
    durationMs: 18018,
    width: 640,
    height: 360,
  },
  {
    baseFilename: 'coverr-active-morning-jog-on-cobblestone',
    durationMs: 18120,
    width: 640,
    height: 360,
  },
  {
    baseFilename: 'coverr-jumping-jacks-5469',
    durationMs: 17500,
    width: 640,
    height: 360,
  },
] as const;

interface CachedPhoto {
  id: string;
  width: number;
  height: number;
  urls: {
    raw: string;
  };
  blur_hash?: string;
}

interface UnsplashCache {
  nextPage: number;
  photos: CachedPhoto[];
}

interface FetchPageResult {
  photos: CachedPhoto[];
  remaining: number | undefined;
  rateLimited: boolean;
}

interface WriteDatasetOptions {
  allowPartialImages: boolean;
}

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const cachePath = resolve(root, '.cache/unsplash-photos.json');
const outputPath = resolve(root, 'public/dataset.json');

function mulberry32(seed: number): () => number {
  return () => {
    let state = (seed += 0x6d2b79f5);
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(0x48494747);

function pick<T>(values: readonly T[]): T {
  const index = Math.floor(random() * values.length);
  const value = values[index];
  if (value === undefined) {
    throw new Error('Cannot pick from an empty array');
  }
  return value;
}

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

function readOptionalString(
  record: Record<string, unknown>,
  key: string,
  label: string,
): string | undefined {
  const value = record[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label}.${key} must be a non-empty string when present`);
  }
  return value;
}

function readPositiveInteger(record: Record<string, unknown>, key: string, label: string): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${label}.${key} must be a positive integer`);
  }
  return value;
}

function readCachePhoto(input: unknown, label: string): CachedPhoto {
  assertRecord(input, label);
  const urls = input.urls;
  assertRecord(urls, `${label}.urls`);
  const blurHash = readOptionalString(input, 'blur_hash', label);
  const photo = {
    id: readString(input, 'id', label),
    width: readPositiveInteger(input, 'width', label),
    height: readPositiveInteger(input, 'height', label),
    urls: {
      raw: readString(urls, 'raw', `${label}.urls`),
    },
  };

  return blurHash === undefined ? photo : { ...photo, blur_hash: blurHash };
}

function parseCache(input: unknown): UnsplashCache {
  assertRecord(input, 'cache');
  const inputPhotos = input.photos;
  if (!Array.isArray(inputPhotos)) {
    throw new Error('cache.photos must be an array');
  }

  const byId = new Map<string, CachedPhoto>();
  for (const [index, photo] of inputPhotos.entries()) {
    const parsed = readCachePhoto(photo, `cache.photos[${index}]`);
    if (!byId.has(parsed.id)) {
      byId.set(parsed.id, parsed);
    }
  }

  return {
    nextPage: readPositiveInteger(input, 'nextPage', 'cache'),
    photos: [...byId.values()],
  };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

async function readCache(): Promise<UnsplashCache> {
  try {
    return parseCache(JSON.parse(await readFile(cachePath, 'utf8')));
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return { nextPage: 1, photos: [] };
    }
    throw error;
  }
}

async function writeCache(cache: UnsplashCache): Promise<void> {
  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
}

function readRateLimitRemaining(headers: Headers): number | undefined {
  const value = headers.get('x-ratelimit-remaining');
  if (value === null) {
    return undefined;
  }
  const remaining = Number.parseInt(value, 10);
  return Number.isFinite(remaining) ? remaining : undefined;
}

function compactErrorBody(body: string): string {
  return body.replace(/\s+/g, ' ').trim().slice(0, 300);
}

async function fetchPhotoPage(page: number, accessKey: string): Promise<FetchPageResult> {
  const url = new URL(`${UNSPLASH_API_ROOT}/photos`);
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', String(UNSPLASH_PAGE_SIZE));

  const response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
    },
  });
  const remaining = readRateLimitRemaining(response.headers);

  if (!response.ok) {
    const body = compactErrorBody(await response.text());
    if (response.status === 429 || remaining === 0 || /rate limit/i.test(body)) {
      return { photos: [], remaining: remaining ?? 0, rateLimited: true };
    }
    throw new Error(
      `Unsplash request failed for page ${page}: ${response.status} ${response.statusText}${
        body.length === 0 ? '' : `: ${body}`
      }`,
    );
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error(`Unsplash page ${page} response must be an array`);
  }

  return {
    photos: payload.map((photo, index) => readCachePhoto(photo, `page ${page}[${index}]`)),
    remaining,
    rateLimited: false,
  };
}

async function fillCache(cache: UnsplashCache, accessKey: string): Promise<void> {
  const ids = new Set(cache.photos.map((photo) => photo.id));

  while (cache.photos.length < IMAGE_COUNT) {
    const page = cache.nextPage;
    const result = await fetchPhotoPage(page, accessKey);

    if (result.rateLimited) {
      process.stdout.write(
        `Unsplash rate limit reached. Cached ${cache.photos.length}/${IMAGE_COUNT} photos.\n`,
      );
      return;
    }

    let added = 0;
    for (const photo of result.photos) {
      if (!ids.has(photo.id)) {
        ids.add(photo.id);
        cache.photos.push(photo);
        added += 1;
      }
    }
    cache.nextPage = page + 1;
    await writeCache(cache);

    process.stdout.write(
      `Fetched Unsplash page ${page}: +${added}, cached ${cache.photos.length}/${IMAGE_COUNT}, remaining ${
        result.remaining ?? 'unknown'
      }.\n`,
    );

    if (result.photos.length === 0) {
      process.stdout.write(`Unsplash page ${page} returned no photos.\n`);
      return;
    }
    if (result.remaining !== undefined && result.remaining <= 1) {
      process.stdout.write(
        `Stopping before the rate limit is exhausted. Cached ${cache.photos.length}/${IMAGE_COUNT} photos.\n`,
      );
      return;
    }
  }
}

function imageUrl(rawUrl: string, width: number): string {
  const url = new URL(rawUrl);
  url.searchParams.set('w', String(width));
  url.searchParams.set('fit', 'max');
  url.searchParams.delete('auto');
  url.searchParams.set('fm', 'webp');
  url.searchParams.set('q', '80');
  return url.toString();
}

function makeImage(photo: CachedPhoto, index: number): ImageItem {
  const id = `image-${String(index + 1).padStart(4, '0')}`;
  const srcset = Object.fromEntries(
    Object.entries(BUCKET_WIDTHS).map(([bucket, bucketWidth]) => [
      bucket,
      imageUrl(photo.urls.raw, bucketWidth),
    ]),
  ) as Record<SizeBucket, string>;
  const image = {
    id,
    type: 'image' as const,
    width: photo.width,
    height: photo.height,
    srcset,
  };

  return photo.blur_hash === undefined ? image : { ...image, blurhash: photo.blur_hash };
}

function makeVideo(index: number): VideoItem {
  const id = `video-${String(index + 1).padStart(4, '0')}`;
  const asset = pick(VIDEO_POOL);
  const assetRoot = `${COVERR_VIDEO_ROOT}/${asset.baseFilename}`;

  return {
    id,
    type: 'video',
    width: asset.width,
    height: asset.height,
    poster: `${assetRoot}/thumbnail`,
    src: `${assetRoot}/360p.mp4`,
    durationMs: asset.durationMs,
  };
}

function shuffle(items: MediaItem[]): MediaItem[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const replacement = Math.floor(random() * (index + 1));
    const value = items[index];
    const other = items[replacement];
    if (value === undefined || other === undefined) {
      throw new Error('Unexpected sparse media list');
    }
    items[index] = other;
    items[replacement] = value;
  }
  return items;
}

async function writeDataset(
  cache: UnsplashCache,
  { allowPartialImages }: WriteDatasetOptions,
): Promise<void> {
  const imageCount = allowPartialImages ? Math.min(cache.photos.length, IMAGE_COUNT) : IMAGE_COUNT;
  if (
    cache.photos.length < imageCount ||
    (!allowPartialImages && cache.photos.length < IMAGE_COUNT)
  ) {
    throw new Error(`Expected ${IMAGE_COUNT} cached photos, found ${cache.photos.length}`);
  }
  if (imageCount === 0) {
    throw new Error('Cannot generate a dataset without cached Unsplash photos');
  }

  const imagePhotos = cache.photos.slice(0, imageCount);
  const videoCount = allowPartialImages ? ITEM_COUNT - imagePhotos.length : VIDEO_COUNT;
  const items = shuffle([
    ...imagePhotos.map((photo, index) => makeImage(photo, index)),
    ...Array.from({ length: videoCount }, (_, index) => makeVideo(index)),
  ]);
  const parsed = parseDataset(items);

  if (parsed.length !== ITEM_COUNT) {
    throw new Error(`Expected ${ITEM_COUNT} items, generated ${parsed.length}`);
  }

  await writeFile(outputPath, `${JSON.stringify(parsed)}\n`, 'utf8');
  process.stdout.write(
    `Generated ${parsed.length} items at ${outputPath} (${imagePhotos.length} images, ${videoCount} videos)\n`,
  );
}

function readAccessKey(): string {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (accessKey === undefined || accessKey.trim().length === 0) {
    throw new Error('UNSPLASH_ACCESS_KEY is required to generate the Unsplash dataset');
  }
  return accessKey.trim();
}

async function main(): Promise<void> {
  const fromCache = process.argv.includes('--from-cache');
  if (fromCache) {
    await writeDataset(await readCache(), { allowPartialImages: true });
    return;
  }

  const accessKey = readAccessKey();
  const cache = await readCache();
  await fillCache(cache, accessKey);

  if (cache.photos.length < IMAGE_COUNT) {
    process.stdout.write(
      `Cached ${cache.photos.length}/${IMAGE_COUNT} photos. Re-run after the Unsplash rate limit resets.\n`,
    );
    return;
  }

  await writeDataset(cache, { allowPartialImages: false });
}

await main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
