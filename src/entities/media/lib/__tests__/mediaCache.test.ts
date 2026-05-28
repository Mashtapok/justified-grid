// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { mediaCache } from '../mediaCache';

describe('mediaCache', () => {
  it('returns a retained decoded element for recent media', () => {
    const image = document.createElement('img');
    mediaCache.remember('recent-image', 'sm', image, 1);

    expect(mediaCache.getLoadedBucket('recent-image')).toBe('sm');
    expect(mediaCache.takeDecodedElement('recent-image', 'sm')).toBe(image);
  });

  it('retains loaded bucket metadata after decoded media is evicted', () => {
    const oversized = document.createElement('img');
    mediaCache.remember('evicted-image', 'lg', oversized, 0.01);

    expect(mediaCache.getLoadedBucket('evicted-image')).toBe('lg');
    expect(mediaCache.takeDecodedElement('evicted-image', 'lg')).toBeUndefined();
  });

  it('tracks a loaded poster without retaining a decoded node', () => {
    mediaCache.rememberLoadedBucket('video-poster', 'sm');

    expect(mediaCache.getLoadedBucket('video-poster')).toBe('sm');
    expect(mediaCache.takeDecodedElement('video-poster', 'sm')).toBeUndefined();
  });

  it('bounds loaded bucket metadata and falls back to retained decoded media', () => {
    const image = document.createElement('img');
    mediaCache.remember('retained-after-metadata-eviction', 'sm', image, 1000);

    for (let index = 0; index < 10_050; index += 1) {
      mediaCache.rememberLoadedBucket(`bounded-poster-${index}`, 'thumb');
    }

    expect(mediaCache.getLoadedBucket('bounded-poster-0')).toBeUndefined();
    expect(mediaCache.getLoadedBucket('bounded-poster-10049')).toBe('thumb');
    expect(mediaCache.getLoadedBucket('retained-after-metadata-eviction')).toBe('sm');
    expect(mediaCache.takeDecodedElement('retained-after-metadata-eviction', 'sm')).toBe(image);
  });
});
