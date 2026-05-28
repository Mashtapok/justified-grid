import { describe, expect, it } from 'vitest';
import { mediaCache } from '../mediaCache';

describe('mediaCache', () => {
  it('tracks a loaded bucket', () => {
    mediaCache.rememberLoadedBucket('recent-image', 'sm');

    expect(mediaCache.getLoadedBucket('recent-image')).toBe('sm');
  });

  it('upgrades to a larger loaded bucket', () => {
    mediaCache.rememberLoadedBucket('upgraded-image', 'sm');
    mediaCache.rememberLoadedBucket('upgraded-image', 'lg');

    expect(mediaCache.getLoadedBucket('upgraded-image')).toBe('lg');
  });

  it('keeps a larger loaded bucket when a smaller bucket finishes later', () => {
    mediaCache.rememberLoadedBucket('stable-image', 'md');
    mediaCache.rememberLoadedBucket('stable-image', 'thumb');

    expect(mediaCache.getLoadedBucket('stable-image')).toBe('md');
  });

  it('bounds loaded bucket metadata', () => {
    for (let index = 0; index < 10_050; index += 1) {
      mediaCache.rememberLoadedBucket(`bounded-poster-${index}`, 'thumb');
    }

    expect(mediaCache.getLoadedBucket('bounded-poster-0')).toBeUndefined();
    expect(mediaCache.getLoadedBucket('bounded-poster-10049')).toBe('thumb');
  });
});
