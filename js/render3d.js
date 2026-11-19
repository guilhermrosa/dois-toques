// Third-person view (v0.3, the user's original vision): a camera behind and above the stone golem,
// looking forward over stepping stones in a misty forest lake. Same board and controls as the
// top-down view; this only draws, with a hand-rolled perspective on Canvas 2D (no 3D library).
// Reads the sim's state and never changes it (ripples and camera easing are its own).
//
// World units are metres: a cell (r, x) sits at X = x * SX, Z = r * SZ, on the water at Y = 0.
import { CFG, SHAPES } from './config.js';
import { rowXs } from './sim.js';
import { drawGolem } from './golem.js';

const SX = 0.9;                 // half the distance between two stones of a row
const ROW = { losango: 1.2, hexagono: Math.sqrt(3) }; // row depth / SX, per grid
const CAM_BACK = 5, CAM_UP = 2.6, PITCH = 0.48; // a long lens: what is near is not blown up // camera behind and above the golem, tilted down
const FOG_NEAR = 6, FOG_FAR = 34;
const HOP_H = 0.45;             // height of a hop (m)
const HOP_T = 0.13;             // s, a little slower than top-down: the golem is heavy

const K = {
  skyTop: [176, 208, 190], skyLow: [226, 236, 222], fog: [214, 228, 216],
  waterNear: [52, 102, 98], waterFar: [150, 186, 176],
  stone: [168, 176, 160], stoneTop: [196, 200, 182], stoneSide: [92, 104, 92], moss: [104, 150, 72], mossL: [140, 182, 96],
  trunk: [74, 62, 54], leaf: [58, 104, 70], leafL: [86, 136, 84], shore: [78, 118, 68],
  glow: [255, 236, 150], ripple: [236, 248, 240],
  cap: [216, 92, 84], capDot: [250, 240, 228], stem: [236, 228, 208],
};

const hash = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createRenderer3d(cvs) {
  const ctx = cvs.getContext('2d');
  let W = 0, H = 0, dpr = 1, F = 1;
  let camZ = 0, camX = 0;
  let ripples = [];
  let seenHop = -1, seenSunk = -Infinity, seenDeath = false, lastSim = null;
  const cosP = Math.cos(PITCH), sinP = Math.sin(PITCH);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    W = cvs.clientWidth; H = cvs.clientHeight;
    cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr);
    F = Math.min(W * 1.4, H * 0.6);
  }

  // world -> screen; null when behind the camera
  let cx0 = 0, cy0 = 0, camY = CAM_UP;
  function P(X, Y, Z) {
    const dx = X - camX, dy = Y - camY, dz = Z - (camZ - CAM_BACK);
    const depth = dz * cosP - dy * sinP;
    if (depth < 0.4) return null;
    const up = dy * cosP + dz * sinP;
    return [cx0 + dx * F / depth, cy0 - up * F / depth, depth];
  }
  const fogOf = depth => Math.pow(clamp((depth - FOG_NEAR) / (FOG_FAR - FOG_NEAR), 0, 1), 0.8);

  function poly(pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }

  // the outline of a stone in world coordinates (X, Z pairs)
  function stoneShape(shape, X, Z, sz, k) {
    const out = [];
    if (shape === 'hexagono') {
      const r = SX * 0.8 * k;
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; out.push([X + Math.cos(a) * r, Z + Math.sin(a) * r]); }
    } else { // a diamond with its corners cut
      const hx = SX * 0.82 * k, hz = sz * 0.82 * k;
      const v = [[X, Z + hz], [X + hx, Z], [X, Z - hz], [X - hx, Z]];
      for (let i = 0; i < 4; i++) {
        const a = v[i], b = v[(i + 1) % 4];
        out.push([a[0] + (b[0] - a[0]) * 0.1, a[1] + (b[1] - a[1]) * 0.1]);
        out.push([a[0] + (b[0] - a[0]) * 0.9, a[1] + (b[1] - a[1]) * 0.9]);
      }
    }
    return out;
  }
  function project(shapePts, Y) {
    const pts = [];
    for (const [X, Z] of shapePts) { const p = P(X, Y, Z); if (!p) return null; pts.push(p); }
    return pts;
  }

  function drawStone(shape, X, Z, sz, sink, scale, seed, fog) {
    const pts = stoneShape(shape, X, Z, sz, scale);
    const top = 0.18 - sink, bottom = -0.35 - sink;
    const lo = project(pts, bottom), hi = project(pts, top);
    if (!lo || !hi) return;
    poly(lo); ctx.fillStyle = rgb(mix(K.stoneSide, K.fog, fog)); ctx.fill();
    // the side wall: each edge from top to bottom
    ctx.fillStyle = rgb(mix(K.stoneSide, K.fog, fog));
    for (let i = 0; i < hi.length; i++) {
      const j = (i + 1) % hi.length;
      poly([hi[i], hi[j], lo[j], lo[i]]); ctx.fill();
    }
    poly(hi); ctx.fillStyle = rgb(mix(K.stoneTop, K.fog, fog)); ctx.fill();
    // moss over part of the top
    if (seed > 0.65) return; // bare stone
    const m = stoneShape('hexagono', X + (seed - 0.3) * SX * 0.7, Z - sz * 0.2 + seed * sz * 0.3, sz, scale * (0.25 + seed * 0.35));
    const mp = project(m, top + 0.001);
    if (mp) { poly(mp); ctx.fillStyle = rgb(mix(seed > 0.5 ? K.moss : K.mossL, K.fog, fog)); ctx.fill(); }
  }

  function drawTree(X, Z, seed, fog) {
    const base = P(X, 0, Z); if (!base) return;
    const u = F / base[2]; // pixels per metre there
    const h = 3.2 + seed * 2.6;
    // mossy mound at the foot
    ctx.fillStyle = rgb(mix(K.shore, K.fog, fog));
    ctx.beginPath(); ctx.ellipse(base[0], base[1], u * 0.9, u * 0.35, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgb(mix(K.trunk, K.fog, fog));
    ctx.beginPath();
    ctx.moveTo(base[0] - u * 0.22, base[1]); ctx.lineTo(base[0] - u * 0.13, base[1] - u * h * 0.7);
    ctx.lineTo(base[0] + u * 0.13, base[1] - u * h * 0.7); ctx.lineTo(base[0] + u * 0.22, base[1]); ctx.fill();
    // round, soft canopy in three blobs
    for (const [ox, oy, r, light] of [[-0.55, 0.72, 0.85, 0], [0.5, 0.78, 0.8, 0], [0, 0.95, 1.0, 1]]) {
      ctx.fillStyle = rgb(mix(light ? K.leafL : K.leaf, K.fog, fog));
      ctx.beginPath(); ctx.arc(base[0] + ox * u, base[1] - oy * h * u, r * u * (1 + seed * 0.3), 0, Math.PI * 2); ctx.fill();
    }
    // a red mushroom at the foot, now and then
    if (seed > 0.7) {
      const mx = base[0] + u * 0.55, my = base[1] - u * 0.05;
      ctx.fillStyle = rgb(mix(K.stem, K.fog, fog)); ctx.fillRect(mx - u * 0.05, my - u * 0.22, u * 0.1, u * 0.22);
      ctx.fillStyle = rgb(mix(K.cap, K.fog, fog));
      ctx.beginPath(); ctx.ellipse(mx, my - u * 0.22, u * 0.2, u * 0.13, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = rgb(mix(K.capDot, K.fog, fog));
      ctx.beginPath(); ctx.arc(mx - u * 0.06, my - u * 0.28, u * 0.03, 0, Math.PI * 2); ctx.arc(mx + u * 0.08, my - u * 0.26, u * 0.025, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawGlow(x, y, r, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgb(K.glow, a)); g.addColorStop(0.25, rgb(K.glow, a * 0.6)); g.addColorStop(1, rgb(K.glow, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  function draw(s, opts) {
    const shape = opts.shape in SHAPES ? opts.shape : 'losango';
    const SZ = SX * ROW[shape];

    if (s !== lastSim) {
      lastSim = s; ripples = []; seenHop = s.hopAt; seenSunk = Math.floor(s.crumble); seenDeath = false;
      camZ = s.hero.r * SZ; camX = s.hero.x * SX * 0.75;
    }

    // the golem's position through the hop
    const hopT = s.hopAt < 0 ? 1 : Math.min(1, (s.time - s.hopAt) / HOP_T);
    const e = hopT < 1 ? (1 - Math.cos(hopT * Math.PI)) / 2 : 1;
    const hr = s.from.r + (s.hero.r - s.from.r) * e;
    const hx = s.from.x + (s.hero.x - s.from.x) * e;
    let hy = Math.sin(hopT * Math.PI) * HOP_H;

    if (s.hopAt !== seenHop && hopT >= 1) { seenHop = s.hopAt; ripples.push({ r: s.hero.r, x: s.hero.x, t0: s.time, size: 0.9 }); }
    if (!s.alive && !seenDeath) { seenDeath = true; ripples.push({ r: s.hero.r, x: s.hero.x, t0: s.time, size: 1.5 }); }
    if (s.started) {
      while (seenSunk < Math.floor(s.crumble)) {
        seenSunk++;
        if (seenSunk >= 0) for (const x of rowXs(seenSunk)) if (s.cell(seenSunk, x) !== 'hole') ripples.push({ r: seenSunk, x, t0: s.time, size: 1.1 });
      }
    }
    ripples = ripples.filter(p => s.time - p.t0 < 1.4);

    camZ += (hr * SZ - camZ) * Math.min(1, opts.dt * 9);
    camX += (hx * SX * 0.75 - camX) * Math.min(1, opts.dt * 6);
    if (Math.abs(hr * SZ - camZ) > 8) camZ = hr * SZ;
    cx0 = W / 2; cy0 = H * 0.6; camY = CAM_UP;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // sky down to the horizon, then the lake
    const horizon = cy0 - F * Math.tan(PITCH);
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, rgb(K.skyTop)); sky.addColorStop(1, rgb(K.skyLow));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, Math.max(0, horizon) + 1);
    const lake = ctx.createLinearGradient(0, horizon, 0, H);
    lake.addColorStop(0, rgb(K.fog)); lake.addColorStop(0.35, rgb(K.waterFar)); lake.addColorStop(1, rgb(K.waterNear));
    ctx.fillStyle = lake; ctx.fillRect(0, horizon, W, H - horizon);
    // a far treeline in the mist
    ctx.fillStyle = rgb(mix(K.leaf, K.fog, 0.75));
    ctx.fillRect(0, horizon - H * 0.02, W, H * 0.02 + 2);
    for (let i = -1; i <= 14; i++) { // soft round crowns
      const x = (i + 0.5) / 13 * W - camX * 4, rr = H * (0.025 + hash(i, 3) * 0.025);
      ctx.beginPath(); ctx.arc(x, horizon - H * 0.02, rr, Math.PI, 0); ctx.fill();
    }

    const rNear = Math.max(Math.floor((camZ - CAM_BACK) / SZ), s.hero.r - 2);
    const rFar = Math.ceil((camZ + FOG_FAR + 4) / SZ);

    // ripples on the water first: everything else stands on it
    for (const p of ripples) {
      const t = (s.time - p.t0) / 1.4, rr = SX * p.size * (0.5 + t * 1.1);
      const pts = [];
      for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; const q = P(p.x * SX + Math.cos(a) * rr, 0, p.r * SZ + Math.sin(a) * rr); if (q) pts.push(q); }
      if (pts.length < 20) continue;
      poly(pts); ctx.strokeStyle = rgb(K.ripple, (1 - t) * 0.7); ctx.lineWidth = 1.5; ctx.stroke();
    }

    const golemRow = Math.round(hr);
    let golemDrawn = false;
    const drawHero = () => {
      golemDrawn = true;
      let alpha = 1, sinkY = 0;
      if (!s.alive) {
        const t = Math.min(1, (s.time - s.diedAt) / 0.8);
        sinkY = t * 1.1; alpha = 1 - t * 0.9; hy = 0;
      }
      const feet = P(hx * SX, hy + 0.18 - sinkY, hr * SZ);
      const ground = P(hx * SX, 0.18, hr * SZ);
      if (!feet || !ground) return;
      const u = F / feet[2];
      if (s.alive) { // shadow on the stone
        ctx.fillStyle = `rgba(20,40,30,${0.3 - hy * 0.3})`;
        ctx.beginPath(); ctx.ellipse(ground[0], ground[1], u * 0.42, u * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(feet[0], feet[1]);
      ctx.scale(u * 1.05, u * 1.05);
      const lean = hopT < 1 ? (s.hero.x - s.from.x) * 0.12 * Math.sin(hopT * Math.PI) : 0;
      drawGolem(ctx, { air: hopT < 1 ? hopT : 0, lean, t: s.time });
      ctx.restore();
    };

    // far to near
    for (let r = rFar; r >= Math.max(0, rNear); r--) {
      const Z = r * SZ;
      const k = s.started ? s.crumble - r : -1; // > 0: sunk
      let sink = 0, shake = 0;
      if (k > 0) sink = k * 0.7;
      else if (k > -1) shake = (k + 1) * 0.05;
      const near = P(0, 0, Z);
      const fog = near ? fogOf(near[2]) : 0;

      // trees and banks beyond the edges of the board
      for (const side of [-1, 1]) {
        const sd = hash(r, side * 5);
        if (sd < 0.55) drawTree(side * (CFG.xMax * SX + 2.2 + sd * 2.4), Z + (sd - 0.5) * SZ, sd / 0.55, fog);
      }

      if (k < 1.6) {
        for (const x of rowXs(r)) {
          const kind = s.cell(r, x);
          if (kind === 'hole') continue;
          const jx = shake ? Math.sin(s.time * 40 + x * 3 + r) * shake : 0;
          drawStone(shape, x * SX + jx, Z, SZ, sink, 1, hash(r, x), fog);
          if (kind === 'gem' && k <= 0) { // a firefly hovering over the stone
            const q = P(x * SX + Math.sin(s.time * 2 + x) * 0.12, 0.85 + Math.sin(s.time * 3 + r) * 0.1, Z);
            if (q) {
              const u = F / q[2];
              drawGlow(q[0], q[1], u * 0.55, 0.9 * (1 - fog * 0.6));
              ctx.fillStyle = rgb([255, 252, 220]); ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(1.5, u * 0.06), 0, Math.PI * 2); ctx.fill();
            }
          }
        }
      }

      // where a tap leads (and, dimmer, a side hop)
      if (s.alive && (r === s.hero.r + 1 || (opts.side && r === s.hero.r))) {
        const marks = r === s.hero.r + 1 ? [[-1, 1], [1, 1]] : [[-2, 0.45], [2, 0.45]];
        for (const [ddx, a] of marks) {
          const kind = s.cell(r, s.hero.x + ddx);
          if (kind === undefined || kind === 'hole') continue;
          if (r === s.hero.r && s.crumble > s.hero.r - 0.01) continue;
          const pts = project(stoneShape(shape, (s.hero.x + ddx) * SX, Z, SZ, 0.8), 0.19);
          if (!pts) continue;
          poly(pts); ctx.globalAlpha = a; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
          ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        }
      }

      if (r === golemRow) drawHero();
    }
    if (!golemDrawn) drawHero();

    // drifting fireflies in the air, and mist low over the far water
    for (let i = 0; i < 14; i++) {
      const fz = camZ + 2 + hash(i, 1) * 20, fx = (hash(i, 2) - 0.5) * 12 + Math.sin(s.time * 0.5 + i) * 0.6;
      const q = P(fx, 1.2 + hash(i, 4) * 2 + Math.sin(s.time * 0.9 + i * 2) * 0.3, fz);
      if (!q) continue;
      drawGlow(q[0], q[1], (F / q[2]) * 0.25, 0.5 * (0.6 + 0.4 * Math.sin(s.time * 3 + i)));
    }
    const mist = ctx.createLinearGradient(0, horizon - H * 0.06, 0, horizon + H * 0.2);
    mist.addColorStop(0, rgb(K.fog, 0)); mist.addColorStop(0.4, rgb(K.fog, 0.55)); mist.addColorStop(1, rgb(K.fog, 0));
    ctx.fillStyle = mist; ctx.fillRect(0, horizon - H * 0.06, W, H * 0.26);

    if (opts.hints > 0) drawHints(opts);
  }

  function drawHints(opts) {
    const fs = Math.round(Math.min(W, 420) * 0.045);
    ctx.globalAlpha = Math.min(1, opts.hints);
    ctx.fillStyle = 'rgba(20,40,32,.55)';
    ctx.fillRect(0, H - 120, W, 90);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `600 ${fs}px Inter, sans-serif`;
    ctx.fillText('◤ toque', W * 0.25, H - (opts.sideHint ? 88 : 75));
    ctx.fillText('toque ◥', W * 0.75, H - (opts.sideHint ? 88 : 75));
    if (opts.sideHint) {
      ctx.font = `500 ${Math.round(fs * 0.78)}px Inter, sans-serif`;
      ctx.fillText('← ' + opts.sideHint, W * 0.25, H - 56);
      ctx.fillText(opts.sideHint + ' →', W * 0.75, H - 56);
    }
    ctx.fillRect(W / 2 - 0.5, H - 115, 1, 80);
    ctx.globalAlpha = 1;
  }

  resize();
  return { resize, draw };
}
