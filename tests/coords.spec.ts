import { test, expect } from '@playwright/test';
import { cellToCoord, coordToCell } from '../src/lib/coords';

test('cell 0 is a1 and cell 399 is j40', () => {
  expect(cellToCoord(0)).toBe('a1');
  expect(cellToCoord(399)).toBe('j40');
  expect(cellToCoord(40)).toBe('b1');
});

test('coordToCell round-trips every cell', () => {
  for (let c = 0; c < 400; c++) expect(coordToCell(cellToCoord(c))).toBe(c);
});
