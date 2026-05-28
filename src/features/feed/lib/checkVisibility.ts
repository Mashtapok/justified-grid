import type { CellPosition } from './layoutTypes';

interface ViewportMetrics {
  top: number;
  height: number;
}

/** classifies a cell into media request priority bands with one viewport of lookahead */
export function checkVisibility(
  position: CellPosition,
  viewport: ViewportMetrics,
): 'visible' | 'near' | 'far' {
  const bottom = position.y + position.height;
  const viewportBottom = viewport.top + viewport.height;

  if (bottom >= viewport.top && position.y <= viewportBottom) {
    return 'visible';
  }
  if (bottom >= viewport.top - viewport.height && position.y <= viewportBottom + viewport.height) {
    return 'near';
  }
  return 'far';
}
