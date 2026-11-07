import assert from 'node:assert/strict';
import test from 'node:test';
import { orderDeckCards } from '../src/relationshipOrder.ts';

test('flexible relationship cards are shuffled without repetition', () => {
  const cards = Array.from({ length: 10 }, (_, index) => ({ id: index + 1 }));
  const ordered = orderDeckCards(cards, () => 0);
  assert.equal(ordered.length, 10);
  assert.equal(new Set(ordered.map((card) => card.id)).size, 10);
  assert.notDeepEqual(ordered.map((card) => card.id), cards.map((card) => card.id));
  assert.deepEqual(cards.map((card) => card.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('fixed ending cards remain last and in authored order', () => {
  const cards = Array.from({ length: 10 }, (_, index) => ({ id: index + 1, fixedAtEnd: index >= 8 }));
  const ordered = orderDeckCards(cards, () => 0.99);
  assert.deepEqual(ordered.slice(-2).map((card) => card.id), [9, 10]);
  assert.deepEqual(new Set(ordered.slice(0, 8).map((card) => card.id)), new Set([1, 2, 3, 4, 5, 6, 7, 8]));
});
