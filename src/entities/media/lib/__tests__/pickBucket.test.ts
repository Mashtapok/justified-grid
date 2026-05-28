import { describe, expect, it } from 'vitest';
import { pickBucket } from '../pickBucket';

describe('pickBucket', () => {
  it('chooses the smallest sufficient source', () => {
    expect(pickBucket(158)).toBe('xs');
    expect(pickBucket(161)).toBe('thumb');
    expect(pickBucket(321)).toBe('sm');
    expect(pickBucket(641)).toBe('md');
    expect(pickBucket(961)).toBe('lg');
  });

  it('reuses an already-decoded larger source', () => {
    expect(pickBucket(200, 'lg')).toBe('lg');
  });
});
