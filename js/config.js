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

// Side hops (optional, v0.2): which gesture makes one. A plain tap is instant only with 'off':
// 'double' must wait DOUBLE_MS after each tap to know there is no second one, and 'hold' hops on
// release (a hold of HOLD_MS is a side hop).
export const SIDE_MODES = { off: 'Desligado', double: 'Toque duplo', hold: 'Segurar' };
export const DOUBLE_MS = 220;
export const HOLD_MS = 240;

// Row height / half-column width for each grid, so neighbours sit evenly. v0.2 (lake theme):
// 'losango' is the diamond grid drawn as flat stones, 'hexagono' the hex grid (every neighbour at the
// same distance, the side hop included) drawn as round lily pads.
export const SHAPES = {
  losango: { name: 'Losango', rowRatio: 0.82 },
  hexagono: { name: 'Hexágono', rowRatio: Math.sqrt(3) },
};

export const COLORS = {
  waterTop: '#2d8a8f', waterBottom: '#16505e', glint: 'rgba(255,255,255,.10)',
  ripple: 'rgba(230,255,250,.55)',
  stone: '#d6d0bd', stoneSide: '#7f7a68', stoneMoss: '#9fb27a',
  pad: '#3f9a52', padDark: '#2a6a3a', padVein: 'rgba(30,70,25,.35)', flower: '#f6c6d6',
  target: 'rgba(255,255,255,.7)',
  frog: '#c6e85a', frogDark: '#2c4a14', frogBelly: '#eef7b0', eyeWhite: '#f5f7e8', pupil: '#16200f',
  fly: '#1d1d22', wing: 'rgba(225,240,255,.75)',
};
