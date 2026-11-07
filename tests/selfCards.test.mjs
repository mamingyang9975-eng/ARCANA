import assert from 'node:assert/strict';
import test from 'node:test';
import { selfCards } from '../src/selfCards.ts';

test('the replacement self-exploration collection has the agreed cards and groups', () => {
  const assignments = {
    begin: [2, 6, 12, 24, 28, 30, 40, 52],
    balance: [3, 4, 9, 10, 13, 15, 16, 26, 27, 34, 37, 44, 46, 51, 54],
    courage: [1, 8, 14, 17, 18, 19, 20, 21, 22, 23, 25, 29, 31, 32, 33, 35, 42, 45, 49, 58, 59],
    insight: [5, 7, 11, 36, 38, 39, 41, 43, 47, 48, 50, 53, 56, 57],
  };
  assert.equal(selfCards.length, 58);
  assert.equal(new Set(selfCards.map((card) => card.number)).size, 58);
  for (const [group, numbers] of Object.entries(assignments)) {
    assert.deepEqual(selfCards.filter((card) => card.group === group).map((card) => card.number), numbers);
  }
  assert.ok(selfCards.every((card) => card.text.length > 0));
  assert.equal(selfCards.some((card) => card.number === 55 || card.number === 60), false);
});
