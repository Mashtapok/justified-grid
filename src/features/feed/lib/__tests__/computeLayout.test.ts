import { describe, expect, it } from 'vitest';
import type { MediaItem } from '@/entities/media/model/types';
import { computeLayout } from '../computeLayout';

function image(id: string, width: number, height: number): MediaItem {
  return {
    id,
    type: 'image',
    width,
    height,
    srcset: { xs: id, thumb: id, sm: id, md: id, lg: id },
  };
}

describe('computeLayout', () => {
  it('returns no height for an empty list', () => {
    expect(computeLayout([], 1000, 4, 4).totalHeight).toBe(0);
  });

  it('does not stretch a single tall final item across the row', () => {
    const result = computeLayout([image('portrait', 400, 1000)], 800, 4, 8);
    const position = result.positions.get('portrait');

    expect(position).toBeDefined();
    expect(position?.width).toBeLessThan(800);
  });

  it('justifies completed mixed-aspect rows to the container width', () => {
    const items = Array.from({ length: 18 }, (_, index) =>
      image(`item-${index}`, [1, 1.5, 1.77, 0.75][index % 4] ?? 1, 1),
    );
    const width = 1024;
    const gap = 6;
    const result = computeLayout(items, width, 4, gap);

    for (const row of result.rows.slice(0, -1)) {
      let cellsWidth = 0;
      for (let index = row.startIndex; index <= row.endIndex; index += 1) {
        cellsWidth += result.positions.get(items[index]?.id ?? '')?.width ?? 0;
      }
      const total = cellsWidth + gap * (row.endIndex - row.startIndex);
      expect(total).toBeCloseTo(width, 1);
    }
  });

  it('accounts for gaps within a four-cell row', () => {
    const result = computeLayout(
      [image('1', 1, 1), image('2', 1, 1), image('3', 1, 1), image('4', 1, 1)],
      404,
      4,
      4,
    );

    expect(result.positions.get('1')?.width).toBeCloseTo(98);
    expect(result.positions.get('4')?.x).toBeCloseTo(306);
  });

  it('left-aligns a sparse final row at target height', () => {
    const items = Array.from({ length: 6 }, (_, index) => image(`square-${index}`, 1, 1));
    const result = computeLayout(items, 404, 4, 4);
    const last = result.rows.at(-1);

    expect(last).toBeDefined();
    if (last === undefined) {
      throw new Error('Expected a final row');
    }
    expect(last.endIndex - last.startIndex + 1).toBe(2);
    expect(last.height).toBeCloseTo(98);
    expect(result.positions.get('square-5')?.x).toBeCloseTo(102);
  });

  it('computes a 2000-item layout without long synchronous work', () => {
    const items = Array.from({ length: 2000 }, (_, index) =>
      image(`bench-${index}`, [1, 1.5, 1.77, 0.67][index % 4] ?? 1, 1),
    );
    const start = performance.now();
    const result = computeLayout(items, 1280, 4, 4);
    const duration = performance.now() - start;

    expect(result.rows.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(20);
  });
});
