import { describe, expect, it } from 'vitest';
import { pickBucket } from '../pickBucket';

describe('pickBucket', () => {
  it('chooses the smallest sufficient source', () => {
    expect(pickBucket(300, 2)).toBe('sm');
  });

  it('reuses an already-decoded larger source', () => {
    expect(pickBucket(200, 1, 'lg')).toBe('lg');
  });
});
