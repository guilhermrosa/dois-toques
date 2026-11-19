// Tuning and look. The board is a lattice: a cell is (r, x), r the row (forward = up) and x the
// column in half steps, with x + r even. A move goes to (r + 1, x - 1) or (r + 1, x + 1), so every
// shape below (diamond, hex, brick) is the same board drawn differently.

export const CFG = {
  xMax: 4,            // columns run from -xMax to xMax: 5 cells on even rows, 4 on odd rows
  lookahead: 40,      // rows generated ahead of the hero
  safeRows: 6,        // first rows with no holes
  holeStart: 0.16,    // hole chance right after the safe rows…
  holeRamp: 0.0016,   // …growing per row…
  holeMax: 0.42,      // …up to this
  gemChance: 0.06,
  // the floor crumbling behind the hero (rows per second); it starts on the first move
  crumbleStart: -2.5, // crumble front at the first move (rows): a little room behind the hero
  crumbleV0: 0.9,
  crumbleAccel: 0.006, // extra speed per row reached
  crumbleVMax: 3.2,
  maxGap: 7,          // the front never lags more than this many rows behind the hero
  hopTime: 0.09,      // s, the hop animation (the move itself is instant)
};

// Row height / half-column width for each shape, so neighbours touch.
export const SHAPES = {
  losango: { name: 'Losango', rowRatio: 0.82 },
  hexagono: { name: 'Hexágono', rowRatio: Math.sqrt(3) },
  tijolo: { name: 'Tijolo', rowRatio: 0.9 },
};

export const COLORS = {
  abyssTop: '#1b2240', abyssBottom: '#090c18',
  tile: '#efe6d2', tileSide: '#a8957a', tileMark: '#e4d6b8',
  hole: 'rgba(255,255,255,.07)',
  target: 'rgba(255,255,255,.55)',
  gem: '#55dcc9', gemDark: '#1f8f84',
  hero: '#ff6b5a', heroDark: '#8a2a33', eye: '#1b1420',
};
