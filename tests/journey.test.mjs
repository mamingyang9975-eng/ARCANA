import assert from 'node:assert/strict';
import test from 'node:test';
import { createDrawBag, initialJourney, journeyReducer, MOTION } from '../src/journeyState.ts';

const cards = Array.from({ length: 6 }, (_, i) => ({ id: `card-${i}`, title: `Title ${i}`, prompt: 'A short prompt.' }));
const reduce = journeyReducer;
const ready = () => ['CENTERED', 'START', 'TUNNEL', 'ENTERED'].reduce((state, type) => reduce(state, { type }), initialJourney);

test('the tunnel follows the phrase, blocks drawing, and can be skipped from either entrance step', () => {
  const ritual = ['CENTERED', 'START'].reduce((state, type) => reduce(state, { type }), initialJourney);
  assert.equal(ritual.phase, 'ritual');
  assert.equal(reduce(initialJourney, { type: 'TUNNEL' }), initialJourney);
  const tunnel = reduce(ritual, { type: 'TUNNEL' });
  assert.equal(tunnel.phase, 'tunnel');
  assert.equal(reduce(tunnel, { type: 'DRAW', card: cards[0], replace: false }), tunnel);
  for (const state of [ritual, tunnel]) {
    const skipped = reduce(state, { type: 'ENTERED' });
    assert.equal(skipped.phase, 'ready');
    assert.equal(skipped.turn, 0);
    assert.equal(reduce(skipped, { type: 'TUNNEL' }), skipped);
  }
});

test('entrance stops at a deliberate draw, and ignores out-of-order events', () => {
  assert.equal(reduce(initialJourney, { type: 'START' }), initialJourney);
  assert.equal(reduce(initialJourney, { type: 'DRAW', card: cards[0], replace: false }), initialJourney);
  const state = ready();
  assert.equal(state.phase, 'ready');
  assert.equal(state.card, null);
  assert.equal(state.turn, 0);
  assert.equal(reduce(state, { type: 'ENTERED' }), state);
});

test('rapid draw events cannot consume another turn before the first flip ends', () => {
  const drawing = reduce(ready(), { type: 'DRAW', card: cards[0], replace: false });
  assert.equal(drawing.phase, 'drawing');
  assert.equal(reduce(drawing, { type: 'DRAW', card: cards[1], replace: false }), drawing);
  assert.equal(reduce(drawing, { type: 'START' }), drawing);
  assert.equal(reduce(drawing, { type: 'REVEAL' }).phase, 'revealed');
});

test('replacement retains the slot and replays the animation; next advances one slot', () => {
  const first = reduce(reduce(ready(), { type: 'DRAW', card: cards[0], replace: false }), { type: 'REVEAL' });
  const replacement = reduce(first, { type: 'DRAW', card: cards[1], replace: true });
  assert.equal(replacement.turn, 1);
  assert.equal(replacement.drawKey, 2);
  assert.equal(replacement.card.id, cards[1].id);
  const next = reduce(reduce(replacement, { type: 'REVEAL' }), { type: 'DRAW', card: cards[2], replace: false });
  assert.equal(next.turn, 2);
});

test('each pool is exhausted before repeats, including replacements and cycle boundaries', () => {
  let seed = 7;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const draw = createDrawBag(cards, random);
  let previous;
  for (let cycle = 0; cycle < 40; cycle++) {
    const ids = [];
    for (let i = 0; i < cards.length; i++) {
      const id = draw().id;
      assert.notEqual(id, previous);
      ids.push(id);
      previous = id;
    }
    assert.equal(new Set(ids).size, cards.length);
  }
});

test('single-card pools can repeat safely and separate journeys have fresh pools', () => {
  const single = createDrawBag([cards[0]]);
  assert.equal(single(), cards[0]);
  assert.equal(single(), cards[0]);
  assert.throws(() => createDrawBag([]));
  assert.equal(createDrawBag(cards, () => 0)().id, cards[0].id);
  assert.equal(createDrawBag(cards, () => 0)().id, cards[0].id);
});

test('the ritual is three seconds and the full draw, including text, is under one second', () => {
  assert.equal(MOTION.ritual, 3000);
  assert.ok(MOTION.draw < 1000);
});
