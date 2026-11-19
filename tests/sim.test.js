import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, rowXs } from '../js/sim.js';
import { CFG } from '../js/config.js';

const ok = k => k === 'floor' || k === 'gem';

test('rows alternate 5 and 4 cells, with x + r even', () => {
  assert.deepEqual(rowXs(0), [-4, -2, 0, 2, 4]);
  assert.deepEqual(rowXs(1), [-3, -1, 1, 3]);
});

test('the safe rows have no holes', () => {
  const s = createSim({ seed: 1 });
  for (let r = 0; r < CFG.safeRows; r++) for (const x of rowXs(r)) assert.ok(ok(s.cell(r, x)), `${r},${x}`);
});

test('there is always a way forward, deep into the board', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const s = createSim({ seed });
    let reach = new Set([0]); // reachable x on row r
    for (let r = 1; r <= 600; r++) {
      const next = new Set();
      for (const x of reach) for (const d of [-1, 1]) if (ok(s.cell(r, x + d))) next.add(x + d);
      assert.ok(next.size > 0, `seed ${seed} stuck at row ${r}`);
      reach = next;
    }
  }
});

test('same seed, same board', () => {
  const a = createSim({ seed: 42 }), b = createSim({ seed: 42 });
  for (let r = 0; r < 200; r++) for (const x of rowXs(r)) assert.equal(a.cell(r, x), b.cell(r, x));
});

test('a step goes forward-left or forward-right', () => {
  const s = createSim({ seed: 3 });
  s.move(-1);
  assert.deepEqual(s.hero, { r: 1, x: -1 });
  s.move(1);
  assert.deepEqual(s.hero, { r: 2, x: 0 });
  assert.equal(s.score, 2);
  assert.ok(s.alive);
});

test('stepping off the board or into a hole is a fall', () => {
  const s = createSim({ seed: 3 });
  const events = [];
  const t = createSim({ seed: 3, emit: e => events.push(e) });
  for (let i = 0; i < 4; i++) t.move(1);    // x = 4, the edge
  assert.ok(t.alive);
  t.move(1);                                // x = 5: nothing there
  assert.equal(t.alive, false);
  assert.equal(t.cause, 'fall');
  assert.ok(events.includes('die'));
  // into a hole
  let r = CFG.safeRows, hole = null;
  while (!hole) { for (const x of rowXs(r)) if (s.cell(r, x) === 'hole') hole = { r, x }; r++; }
  const u = createSim({ seed: 3 });
  u.hero = { r: hole.r - 1, x: hole.x - 1 };
  u.move(1);
  assert.equal(u.cause, 'fall');
});

test('moves after dying do nothing', () => {
  const s = createSim({ seed: 3 });
  for (let i = 0; i < 5; i++) s.move(1);
  assert.equal(s.move(-1), false);
  assert.equal(s.score, 5);
});

test('the floor does not crumble before the first move, then catches a hero who stands still', () => {
  const s = createSim({ seed: 5 });
  for (let i = 0; i < 300; i++) s.update(0.05);
  assert.ok(s.alive);
  s.move(-1);
  for (let i = 0; i < 300 && s.alive; i++) s.update(0.05);
  assert.equal(s.alive, false);
  assert.equal(s.cause, 'crumble');
});

test('the crumbling front never lags more than maxGap rows', () => {
  const s = createSim({ seed: 7 });
  // walk the guaranteed path quickly: pick a floor cell each row
  for (let i = 0; i < 40; i++) {
    const d = ok(s.cell(s.hero.r + 1, s.hero.x - 1)) ? -1 : 1;
    s.move(d);
    s.update(0.001);
    if (!s.alive) break;
    assert.ok(s.crumble >= s.hero.r - CFG.maxGap - 1e-9);
  }
});

test('a side hop stays on the row and scores nothing', () => {
  const s = createSim({ seed: 3 });
  s.move(1, true);
  assert.deepEqual(s.hero, { r: 0, x: 2 });
  assert.equal(s.score, 0);
  s.move(-1, true);
  assert.deepEqual(s.hero, { r: 0, x: 0 });
  assert.ok(s.alive);
});

test('a side hop off the edge is a fall', () => {
  const s = createSim({ seed: 3 });
  s.move(1, true); s.move(1, true);
  assert.deepEqual(s.hero, { r: 0, x: 4 });
  assert.ok(s.alive);
  s.move(1, true);
  assert.equal(s.cause, 'fall');
});
