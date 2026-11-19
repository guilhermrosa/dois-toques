// Draws the lake from the sim's state; it never changes it (ripples are its own decoration).
// Top-down view, forward is up. v0.2: a frog hopping over stones (diamond grid) or lily pads (hex grid).
import { CFG, SHAPES, COLORS } from './config.js';
import { rowXs } from './sim.js';

const HERO_Y = 0.7; // the frog's height on screen (fraction from the top): most of the view is ahead

// A steady pseudo-random number for a cell, so decorations stay put from frame to frame.
const hash = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };

export function createRenderer(cvs) {
  const ctx = cvs.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  let camRow = 0;      // smoothed camera, in rows
  let facing = 0;      // the frog's heading (radians, 0 = up), eased toward the last hop
  let ripples = [];    // { r, x, t0, size } in board coordinates
  let seenHop = -1, seenSunk = -Infinity, seenDeath = false, lastSim = null;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    W = cvs.clientWidth; H = cvs.clientHeight;
    cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr);
  }

  function stonePath(cx, cy, hx, hy) { // a diamond with rounded corners
    const k = 0.22;
    ctx.beginPath();
    ctx.moveTo(cx - hx * k, cy - hy * (1 - k));
    ctx.quadraticCurveTo(cx, cy - hy, cx + hx * k, cy - hy * (1 - k));
    ctx.lineTo(cx + hx * (1 - k), cy - hy * k);
    ctx.quadraticCurveTo(cx + hx, cy, cx + hx * (1 - k), cy + hy * k);
    ctx.lineTo(cx + hx * k, cy + hy * (1 - k));
    ctx.quadraticCurveTo(cx, cy + hy, cx - hx * k, cy + hy * (1 - k));
    ctx.lineTo(cx - hx * (1 - k), cy + hy * k);
    ctx.quadraticCurveTo(cx - hx, cy, cx - hx * (1 - k), cy - hy * k);
    ctx.closePath();
  }

  function drawStone(cx, cy, dx, dy, scale, seed) {
    const hx = dx * 0.86 * scale, hy = dy * 0.86 * scale, th = Math.max(3, dx * 0.14) * scale;
    stonePath(cx, cy + th, hx, hy); ctx.fillStyle = COLORS.stoneSide; ctx.fill();
    stonePath(cx, cy, hx, hy); ctx.fillStyle = COLORS.stone; ctx.fill();
    // a patch of moss on some stones
    if (seed < 0.45) {
      ctx.fillStyle = COLORS.stoneMoss;
      ctx.beginPath();
      ctx.ellipse(cx + (seed - 0.22) * hx * 1.6, cy + hy * 0.35, hx * 0.28, hy * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPad(cx, cy, rad, seed) {
    const notch = seed * Math.PI * 2; // where the lily pad's slit points
    ctx.fillStyle = COLORS.padDark;
    ctx.beginPath(); ctx.arc(cx, cy + rad * 0.1, rad, notch + 0.35, notch - 0.35 + Math.PI * 2); ctx.lineTo(cx, cy + rad * 0.1); ctx.fill();
    ctx.fillStyle = COLORS.pad;
    ctx.beginPath(); ctx.arc(cx, cy, rad, notch + 0.35, notch - 0.35 + Math.PI * 2); ctx.lineTo(cx, cy); ctx.fill();
    ctx.strokeStyle = COLORS.padVein; ctx.lineWidth = Math.max(1, rad * 0.05);
    ctx.beginPath();
    for (let i = 1; i < 6; i++) {
      const a = notch + i * (Math.PI * 2 / 6);
      ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * rad * 0.8, cy + Math.sin(a) * rad * 0.8);
    }
    ctx.stroke();
    if (seed > 0.9) { // now and then a flower
      ctx.fillStyle = COLORS.flower;
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5;
        ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * rad * 0.2 - rad * 0.3, cy + Math.sin(a) * rad * 0.2 + rad * 0.25, rad * 0.14, rad * 0.08, a, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function drawCell(shape, cx, cy, dx, dy, scale, seed) {
    if (shape === 'hexagono') drawPad(cx, cy, dx * 0.92 * scale, seed);
    else drawStone(cx, cy, dx, dy, scale, seed);
  }

  function outline(shape, cx, cy, dx, dy) {
    if (shape === 'hexagono') { ctx.beginPath(); ctx.arc(cx, cy, dx * 0.98, 0, Math.PI * 2); }
    else stonePath(cx, cy, dx * 0.95, dy * 0.95);
  }

  function draw(s, opts) {
    const shape = opts.shape in SHAPES ? opts.shape : 'losango';
    const dx = W / (2 * CFG.xMax + 2.6);
    const dy = dx * SHAPES[shape].rowRatio;

    if (s !== lastSim) { // a new run: forget the old one's decorations
      lastSim = s; ripples = []; seenHop = s.hopAt; seenSunk = Math.floor(s.crumble); seenDeath = false; facing = 0;
    }

    // the frog's position, eased through the hop
    const hopT = s.hopAt < 0 ? 1 : Math.min(1, (s.time - s.hopAt) / CFG.hopTime);
    const e = 1 - (1 - hopT) * (1 - hopT);
    const hr = s.from.r + (s.hero.r - s.from.r) * e;
    const hx = s.from.x + (s.hero.x - s.from.x) * e;

    // ripples: where the frog lands, where it falls in, and under each pad that sinks
    if (s.hopAt !== seenHop && hopT >= 1) {
      seenHop = s.hopAt;
      ripples.push({ r: s.hero.r, x: s.hero.x, t0: s.time, size: 0.7 });
    }
    if (!s.alive && !seenDeath) { seenDeath = true; ripples.push({ r: s.hero.r, x: s.hero.x, t0: s.time, size: 1.4 }); }
    if (s.started) {
      while (seenSunk < Math.floor(s.crumble)) {
        seenSunk++;
        if (seenSunk >= 0) for (const x of rowXs(seenSunk)) {
          if (s.cell(seenSunk, x) !== 'hole') ripples.push({ r: seenSunk, x, t0: s.time, size: 1 });
        }
      }
    }
    ripples = ripples.filter(p => s.time - p.t0 < 1.2);

    // heading: toward the hop in progress, then back to forward
    const want = s.from.r === s.hero.r && s.from.x === s.hero.x ? 0
      : Math.atan2((s.hero.x - s.from.x) * dx, (s.hero.r - s.from.r) * dy);
    const target = hopT < 1 || s.lastSide ? want : want * 0.5;
    facing += (target - facing) * Math.min(1, opts.dt * 18);

    camRow += (hr - camRow) * Math.min(1, opts.dt * 14);
    if (Math.abs(hr - camRow) > 6) camRow = hr;

    const ox = W / 2, oy = H * HERO_Y;
    const sx = x => ox + x * dx;
    const sy = r => oy - (r - camRow) * dy;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, COLORS.waterTop); g.addColorStop(1, COLORS.waterBottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    const rTop = Math.ceil(camRow + oy / dy) + 2;
    const rBot = Math.floor(camRow - (H - oy) / dy) - 2;

    // glints on the water, fixed to the lake so they scroll with it
    ctx.strokeStyle = COLORS.glint; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let r = rBot; r <= rTop; r++) {
      for (let i = 0; i < 2; i++) {
        const gx = (hash(r, i) - 0.5) * W * 1.1, gy = sy(r) + (hash(i, r) - 0.5) * dy;
        const len = dx * (0.3 + hash(r + 7, i) * 0.4), wob = Math.sin(s.time * 1.5 + r + i) * dx * 0.08;
        ctx.beginPath(); ctx.moveTo(ox + gx - len / 2 + wob, gy); ctx.quadraticCurveTo(ox + gx + wob, gy - 4, ox + gx + len / 2 + wob, gy); ctx.stroke();
      }
    }

    for (const p of ripples) {
      const t = (s.time - p.t0) / 1.2;
      ctx.strokeStyle = COLORS.ripple; ctx.globalAlpha = (1 - t) * 0.8; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(sx(p.x), sy(p.r), dx * p.size * (0.5 + t * 0.9), dx * p.size * (0.32 + t * 0.6), 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // far to near, so a nearer stone covers the side of the one behind it
    for (let r = rTop; r >= Math.max(0, rBot); r--) {
      const k = s.started ? s.crumble - r : -1; // > 0: this row has sunk
      if (k > 1.5) continue;
      let scale = 1, alpha = 1, shake = 0;
      if (k > 0) { scale = 1 - k * 0.35; alpha = 1 - k / 1.5; }
      else if (k > -1) shake = (k + 1) * 1.4;
      for (const x of rowXs(r)) {
        const kind = s.cell(r, x);
        if (kind === 'hole') continue;
        let cx = sx(x), cy = sy(r);
        if (shake) { cx += Math.sin(s.time * 40 + x * 3 + r) * shake; cy += Math.cos(s.time * 33 + x) * shake; }
        ctx.globalAlpha = Math.max(0, alpha);
        drawCell(shape, cx, cy, dx, dy, scale, hash(r, x));
        if (kind === 'gem') drawFly(cx, cy, dx * 0.3 * scale, s.time + hash(x, r) * 9);
        ctx.globalAlpha = 1;
      }
    }

    // where a tap leads (and, dimmer, a side hop)
    if (s.alive) {
      const marks = [[1, -1, 1], [1, 1, 1]];
      if (opts.side) marks.push([0, -2, 0.45], [0, 2, 0.45]);
      for (const [dr, ddx, a] of marks) {
        const kind = s.cell(s.hero.r + dr, s.hero.x + ddx);
        if (kind === undefined || kind === 'hole') continue;
        if (dr === 0 && s.crumble > s.hero.r - 0.01) continue;
        outline(shape, sx(s.hero.x + ddx), sy(s.hero.r + dr), dx, dy);
        ctx.globalAlpha = a; ctx.strokeStyle = COLORS.target; ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
    }

    drawFrog(s, sx(hx), sy(hr), dx, hopT);

    // hints for the two halves of the screen, until the player has got it
    if (opts.hints > 0) {
      ctx.globalAlpha = Math.min(1, opts.hints);
      ctx.fillStyle = 'rgba(8,30,36,.6)';
      ctx.fillRect(0, H - 120, W, 90);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `600 ${Math.round(dx * 0.48)}px Inter, sans-serif`;
      ctx.fillText('◤ toque', W * 0.25, H - (opts.sideHint ? 88 : 75));
      ctx.fillText('toque ◥', W * 0.75, H - (opts.sideHint ? 88 : 75));
      if (opts.sideHint) {
        ctx.font = `500 ${Math.round(dx * 0.36)}px Inter, sans-serif`;
        ctx.fillText('← ' + opts.sideHint, W * 0.25, H - 56);
        ctx.fillText(opts.sideHint + ' →', W * 0.75, H - 56);
      }
      ctx.fillRect(W / 2 - 0.5, H - 115, 1, 80);
      ctx.globalAlpha = 1;
    }
  }

  function drawFly(cx, cy, r, t) {
    const hover = Math.sin(t * 5) * r * 0.25;
    const y = cy - r * 0.4 + hover;
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.3, r * 0.45, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    const flap = 0.6 + Math.abs(Math.sin(t * 40)) * 0.4;
    ctx.fillStyle = COLORS.wing;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(cx + side * r * 0.45, y - r * 0.1, r * 0.5 * flap, r * 0.28, side * -0.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = COLORS.fly;
    ctx.beginPath(); ctx.ellipse(cx, y, r * 0.24, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, y - r * 0.4, r * 0.17, 0, Math.PI * 2); ctx.fill();
  }

  // The frog seen from above: body, folded hind legs that stretch out mid-hop, bulging eyes.
  function drawFrog(s, cx, cy, dx, hopT) {
    let R = dx * 0.52;
    const stretch = Math.sin(hopT * Math.PI);
    let lift = stretch * 0.22;
    let alpha = 1;
    if (!s.alive) { // sinking into the water
      const t = Math.min(1, (s.time - s.diedAt) / 0.7);
      R *= 1 - t * 0.6; alpha = 1 - t; lift = 0;
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.beginPath(); ctx.ellipse(cx, cy + R * 0.3, R * 0.85, R * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(cx, cy - lift * R * 1.2);
    ctx.rotate(facing);
    ctx.scale(1 + lift, 1 + lift);
    ctx.lineWidth = Math.max(2, R * 0.09); ctx.strokeStyle = COLORS.frogDark;
    // hind legs: folded at rest, kicked back during the hop
    for (const side of [-1, 1]) {
      ctx.fillStyle = COLORS.frog;
      ctx.beginPath();
      ctx.ellipse(side * R * (0.55 - stretch * 0.15), R * (0.45 + stretch * 0.55), R * 0.2, R * (0.42 + stretch * 0.3), side * (0.5 - stretch * 0.4), 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); // front legs
      ctx.ellipse(side * R * 0.5, -R * 0.3, R * 0.13, R * 0.24, side * -0.4, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = COLORS.frog;
    ctx.beginPath(); ctx.ellipse(0, 0, R * 0.58, R * 0.72, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = COLORS.frogDark; ctx.globalAlpha = alpha * 0.5; // spots
    for (const [px, py, pr] of [[-0.2, 0.15, 0.12], [0.22, 0.3, 0.09], [0.05, 0.42, 0.07]]) {
      ctx.beginPath(); ctx.arc(px * R, py * R, pr * R, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = alpha;
    for (const side of [-1, 1]) {
      ctx.fillStyle = COLORS.eyeWhite;
      ctx.beginPath(); ctx.arc(side * R * 0.3, -R * 0.52, R * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = COLORS.pupil;
      ctx.beginPath(); ctx.arc(side * R * 0.3, -R * 0.57, R * 0.1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  resize();
  return { resize, draw };
}
