export const COLS = 40;
export const ROWS = 10;
export const CELLS = COLS * ROWS;

export const PALETTE = ['#e8b04b', '#53d08a', '#7dd3fc', '#f472b6', '#a78bfa', '#fb923c'] as const;
export type Color = (typeof PALETTE)[number];

export function cellToCoord(cell: number): string {
  const row = Math.floor(cell / COLS);
  return `${String.fromCharCode(97 + row)}${(cell % COLS) + 1}`;
}

export function coordToCell(coord: string): number {
  const row = coord.charCodeAt(0) - 97;
  const col = Number(coord.slice(1)) - 1;
  return row * COLS + col;
}
