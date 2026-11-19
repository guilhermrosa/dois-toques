// The game's rules, free of drawing and audio. Reports events through emit(type, data).
import { CFG } from './config.js';

// Seeded random numbers (mulberry32), so a run can be replayed in tests.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The columns of row r (x + r even, |x| <= xMax).
export function rowXs(r, xMax = CFG.xMax) {
  const xs = [];
  for (let x = -xMax; x <= xMax; x++) if (((x + r) % 2 + 2) % 2 === 0) xs.push(x);
  return xs;
}

export function createSim({ seed = Date.now(), emit = () => {}, cfg = CFG } = {}) {
  const rand = rng(seed);
  const rows = new Map(); // r -> { [x]: 'floor' | 'hole' | 'gem' }
  let pathX = 0;          // a guaranteed way forward: one floor cell per row, a random zigzag
  let genTo = -1;

  function holeChance(r) {
    if (r < cfg.safeRows) return 0;
    return Math.min(cfg.holeMax, cfg.holeStart + (r - cfg.safeRows) * cfg.holeRamp);
  }

  function genRow(r) {
    if (r > 0) {
      let nx = pathX + (rand() < 0.5 ? -1 : 1);
      if (Math.abs(nx) > cfg.xMax) nx = pathX - Math.sign(nx);
      pathX = nx;
    }
    const row = {};
    for (const x of rowXs(r, cfg.xMax)) {
      let kind = 'floor';
      if (x !== pathX && rand() < holeChance(r)) kind = 'hole';
      else if (r >= cfg.safeRows && rand() < cfg.gemChance) kind = 'gem';
      row[x] = kind;
    }
    rows.set(r, row);
  }

  function ensure(r) { while (genTo < r) genRow(++genTo); }

  const s = {
    hero: { r: 0, x: 0 },
    from: { r: 0, x: 0 }, // where the last hop started, for the animation
    hopAt: -1,            // time of the last hop
    time: 0,
    started: false,       // the crumbling starts on the first move
    crumble: cfg.crumbleStart,
    alive: true,
    cause: null,          // 'fall' | 'crumble'
    diedAt: 0,
    gems: 0,
    get score() { return s.hero.r; },
    cell(r, x) {
      if (Math.abs(x) > cfg.xMax) return undefined;
      ensure(r);
      const row = rows.get(r);
      return row ? row[x] : undefined;
    },
    move(dir) { // -1 left, +1 right
      if (!s.alive) return false;
      if (!s.started) { s.started = true; emit('start'); }
      s.from = { ...s.hero };
      s.hero = { r: s.hero.r + 1, x: s.hero.x + dir };
      s.hopAt = s.time;
      ensure(s.hero.r + cfg.lookahead);
      const kind = s.cell(s.hero.r, s.hero.x);
      emit('step', { dir, r: s.hero.r });
      if (kind === undefined || kind === 'hole') { die('fall'); return true; }
      if (kind === 'gem') {
        rows.get(s.hero.r)[s.hero.x] = 'floor';
        s.gems++;
        emit('gem', { gems: s.gems });
      }
      if (s.hero.r % 25 === 0) emit('milestone', { r: s.hero.r });
      return true;
    },
    update(dt) {
      s.time += dt;
      if (!s.alive || !s.started) return;
      const v = Math.min(cfg.crumbleVMax, cfg.crumbleV0 + s.hero.r * cfg.crumbleAccel);
      s.crumble = Math.max(s.crumble + v * dt, s.hero.r - cfg.maxGap);
      if (s.crumble > s.hero.r) die('crumble');
    },
  };

  function die(cause) {
    s.alive = false;
    s.cause = cause;
    s.diedAt = s.time;
    emit('die', { cause, score: s.score });
  }

  ensure(cfg.lookahead);
  return s;
}
