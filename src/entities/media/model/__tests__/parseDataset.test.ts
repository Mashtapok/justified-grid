import { describe, expect, it } from 'vitest';
import { parseDataset } from '../parseDataset';

describe('parseDataset', () => {
  it('narrows valid mixed media data', () => {
    const result = parseDataset([
      {
        id: 'img-1',
        type: 'image',
        width: 640,
        height: 480,
        srcset: {
          thumb: '/thumb',
          sm: '/sm',
          lg: '/lg',
          xl: '/xl',
        },
      },
      {
        id: 'video-1',
        type: 'video',
        width: 1920,
        height: 1080,
        poster: '/poster',
        src: '/video',
        durationMs: 1000,
      },
    ]);

    expect(result).toHaveLength(2);
  });

  it('reports duplicate IDs at the boundary', () => {
    expect(() =>
      parseDataset([
        {
          id: 'duplicate',
          type: 'video',
          width: 1,
          height: 1,
          poster: '/poster',
          src: '/video',
          durationMs: 1,
        },
        {
          id: 'duplicate',
          type: 'video',
          width: 1,
          height: 1,
          poster: '/poster',
          src: '/video',
          durationMs: 1,
        },
      ]),
    ).toThrow('duplicated');
  });
});
