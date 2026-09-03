import { test, expect } from '@playwright/test';
import { learnings } from '../src/content/learnings';
import { work } from '../src/content/work';

test('learnings is exactly 25', () => {
  expect(learnings).toHaveLength(25);
});

test('at most one work row is current', () => {
  expect(work.filter((w) => w.isCurrent).length).toBeLessThanOrEqual(1);
});
