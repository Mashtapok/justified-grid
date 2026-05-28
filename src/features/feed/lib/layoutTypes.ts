export interface CellPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RowSpec {
  startIndex: number;
  endIndex: number;
  top: number;
  height: number;
}

export interface LayoutResult {
  rows: ReadonlyArray<RowSpec>;
  positions: ReadonlyMap<string, CellPosition>;
  totalHeight: number;
}
