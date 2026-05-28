import type { MediaItem } from '@/entities/media/model/types';
import type { CellPosition, LayoutResult, RowSpec } from './layoutTypes';

/** caches layouts by item array identity and normalized layout inputs */
const layoutCache = new WeakMap<ReadonlyArray<MediaItem>, Map<string, LayoutResult>>();

function aspect(item: MediaItem): number {
  return item.width / item.height;
}

/** estimates the next row height from a small local aspect-ratio sample */
function targetHeight(
  items: ReadonlyArray<MediaItem>,
  startIndex: number,
  containerWidth: number,
  targetItemsPerRow: number,
  gap: number,
): number {
  const sampleSize = Math.max(1, Math.ceil(targetItemsPerRow * 1.5));
  const sampleEnd = Math.min(items.length, startIndex + sampleSize);
  let ratioTotal = 0;

  for (let index = startIndex; index < sampleEnd; index += 1) {
    const item = items[index];
    if (item !== undefined) {
      ratioTotal += aspect(item);
    }
  }

  const averageAspect = ratioTotal / Math.max(1, sampleEnd - startIndex);
  const slotWidth = (containerWidth - gap * (targetItemsPerRow - 1)) / targetItemsPerRow;
  return slotWidth / Math.max(averageAspect, 0.1);
}

function rowHeight(containerWidth: number, gap: number, count: number, aspectSum: number): number {
  return (containerWidth - gap * (count - 1)) / aspectSum;
}

/** computes justified row metadata and absolute cell positions for the feed */
export function computeLayout(
  items: ReadonlyArray<MediaItem>,
  containerWidth: number,
  targetItemsPerRow: number,
  gap: number,
): LayoutResult {
  if (items.length === 0 || containerWidth <= 0) {
    return { rows: [], positions: new Map(), totalHeight: 0 };
  }

  const normalizedWidth = Math.max(1, containerWidth);
  const normalizedTarget = Math.max(1, Math.round(targetItemsPerRow));
  const normalizedGap = Math.max(0, gap);
  let itemLayouts = layoutCache.get(items);
  const cacheKey = `${normalizedWidth}:${normalizedTarget}:${normalizedGap}`;

  if (itemLayouts?.has(cacheKey)) {
    return itemLayouts.get(cacheKey) as LayoutResult;
  }

  const rows: RowSpec[] = [];
  const positions = new Map<string, CellPosition>();
  let top = 0;
  let startIndex = 0;

  while (startIndex < items.length) {
    const idealHeight = targetHeight(
      items,
      startIndex,
      normalizedWidth,
      normalizedTarget,
      normalizedGap,
    );
    let endIndex = startIndex;
    let aspectSum = 0;

    // Grow the row until it is close to target height or the next item would over-compress it.
    while (endIndex < items.length) {
      const item = items[endIndex];
      if (item === undefined) {
        break;
      }
      aspectSum += aspect(item);
      const count = endIndex - startIndex + 1;
      const height = rowHeight(normalizedWidth, normalizedGap, count, aspectSum);
      const next = items[endIndex + 1];
      const nextHeight =
        next === undefined
          ? height
          : rowHeight(normalizedWidth, normalizedGap, count + 1, aspectSum + aspect(next));
      const withinTarget = height >= idealHeight * 0.85 && height <= idealHeight * 1.15;
      const nextWouldBeTooShort = next !== undefined && nextHeight < idealHeight * 0.85;

      if (withinTarget || nextWouldBeTooShort || next === undefined) {
        break;
      }
      endIndex += 1;
    }

    const count = endIndex - startIndex + 1;
    const justifiedHeight = rowHeight(normalizedWidth, normalizedGap, count, aspectSum);
    const isLastRow = endIndex === items.length - 1;
    // Keep sparse last rows near target height instead of stretching them across the full width.
    const height = isLastRow && justifiedHeight > idealHeight * 1.2 ? idealHeight : justifiedHeight;
    let left = 0;

    for (let index = startIndex; index <= endIndex; index += 1) {
      const item = items[index];
      if (item === undefined) {
        continue;
      }
      const width = aspect(item) * height;
      positions.set(item.id, { x: left, y: top, width, height });
      left += width + normalizedGap;
    }

    rows.push({ startIndex, endIndex, top, height });
    top += height + normalizedGap;
    startIndex = endIndex + 1;
  }

  const result: LayoutResult = {
    rows,
    positions,
    totalHeight: Math.max(0, top - normalizedGap),
  };

  if (itemLayouts === undefined) {
    itemLayouts = new Map();
    layoutCache.set(items, itemLayouts);
  }
  itemLayouts.set(cacheKey, result);

  return result;
}
