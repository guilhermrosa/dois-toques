// Draws the board from the sim's state; it never changes it. Top-down view, forward is up.
import { CFG, SHAPES, COLORS } from './config.js';
import { rowXs } from './sim.js';

const HERO_Y = 0.7; // the hero's height on screen (fraction from the top): most of the view is ahead

export function createRenderer(cvs) {
  const ctx = cvs.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  let camRow = 0; // smoothed camera, in rows

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    W = cvs.clientWidth; H = cvs.clientHeight;
    cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr);
  }

  // Outline of one cell centred at (cx, cy); dx is the half-column width, dy the row height.
  function path(shape, cx, cy, dx, dy, k) {
    ctx.beginPath();
    if (shape === 'losango') {
      const hx = dx * k, hy = dy * k;
      ctx.moveTo(cx, cy - hy); ctx.lineTo(cx + hx, cy); ctx.lineTo(cx, cy + hy); ctx.lineTo(cx - hx, cy);
    } else if (shape === 'hexagono') {
      const sz = (dx * 2 / Math.sqrt(3)) * k; // pointy-top hexagon, circumradius
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + i * Math.PI / 3 - Math.PI / 2;
        const px = cx + Math.cos(a) * sz, py = cy + Math.sin(a) * sz;
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
    } else { // tijolo
      const hx = dx * k, hy = dy * 0.5 * k, rr = Math.min(hx, hy) * 0.25;
      ctx.roundRect(cx - hx, cy - hy, hx * 2, hy * 2, rr);
    }
    ctx.closePath();
  }

  function draw(s, opts) {
    const shape = opts.shape in SHAPES ? opts.shape : 'losango';
    const dx = W / (2 * CFG.xMax + 2.6);
    const dy = dx * SHAPES[shape].rowRatio;
    const thick = Math.max(3, dx * 0.16);

    // hero position, eased through the hop
    const hopT = s.hopAt < 0 ? 1 : Math.min(1, (s.time - s.hopAt) / CFG.hopTime);
    const e = 1 - (1 - hopT) * (1 - hopT);
    const hr = s.from.r + (s.hero.r - s.from.r) * e;
    const hx = s.from.x + (s.hero.x - s.from.x) * e;

    camRow += (hr - camRow) * Math.min(1, opts.dt * 14);
    if (Math.abs(hr - camRow) > 6) camRow = hr;

    const ox = W / 2, oy = H * HERO_Y;
    const sx = x => ox + x * dx;
    const sy = r => oy - (r - camRow) * dy;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, COLORS.abyssTop); g.addColorStop(1, COLORS.abyssBottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    const rTop = Math.ceil(camRow + oy / dy) + 2;
    const rBot = Math.floor(camRow - (H - oy) / dy) - 2;
    const gap = 0.9; // cell size inside its slot, leaving a thin gap

    // far to near, so a nearer tile covers the side of the one behind it
    for (let r = rTop; r >= Math.max(0, rBot); r--) {
      const k = s.started ? s.crumble - r : -1; // > 0: this row has fallen
      if (k > 3) continue;
      let fall = 0, scale = 1, alpha = 1, shake = 0;
      if (k > 0) { fall = k * k * dy * 0.6; scale = 1 - k * 0.22; alpha = 1 - k / 3; }
      else if (k > -1) shake = (k + 1) * 1.6;
      const marked = r > 0 && r % 25 === 0;
      for (const x of rowXs(r)) {
        const kind = s.cell(r, x);
        let cx = sx(x), cy = sy(r) + fall;
        if (shake) { cx += Math.sin(s.time * 60 + x * 3 + r) * shake; cy += Math.cos(s.time * 53 + x) * shake; }
        if (kind === 'hole') {
          if (k > 0) continue;
          path(shape, cx, cy, dx, dy, gap);
          ctx.strokeStyle = COLORS.hole; ctx.lineWidth = 1.5; ctx.stroke();
          continue;
        }
        ctx.globalAlpha = Math.max(0, alpha);
        path(shape, cx, cy + thick * scale, dx, dy, gap * scale);
        ctx.fillStyle = COLORS.tileSide; ctx.fill();
        path(shape, cx, cy, dx, dy, gap * scale);
        ctx.fillStyle = marked ? COLORS.tileMark : COLORS.tile; ctx.fill();
        if (kind === 'gem') drawGem(cx, cy, dx * 0.32 * scale);
        ctx.globalAlpha = 1;
      }
    }

    // the two cells a tap leads to
    if (s.alive) {
      for (const d of [-1, 1]) {
        const kind = s.cell(s.hero.r + 1, s.hero.x + d);
        if (kind === undefined || kind === 'hole') continue;
        path(shape, sx(s.hero.x + d), sy(s.hero.r + 1), dx, dy, gap * 0.82);
        ctx.strokeStyle = COLORS.target; ctx.lineWidth = 2; ctx.stroke();
      }
    }

    drawHero(s, sx(hx), sy(hr), dx, hopT);

    // hints for the two halves of the screen, until the player has got it
    if (opts.hints > 0) {
      ctx.globalAlpha = Math.min(1, opts.hints);
      ctx.fillStyle = 'rgba(9,12,24,.6)';
      ctx.fillRect(0, H - 110, W, 80);
      ctx.fillStyle = '#fff';
      ctx.font = `600 ${Math.round(dx * 0.5)}px Inter, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('◤ esquerda', W * 0.25, H - 70);
      ctx.fillText('direita ◥', W * 0.75, H - 70);
      ctx.fillRect(W / 2 - 0.5, H - 110, 1, 80);
      ctx.globalAlpha = 1;
    }
  }

  function drawGem(cx, cy, r) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.7, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r * 0.7, cy);
    ctx.closePath();
    ctx.fillStyle = COLORS.gem; ctx.fill();
    ctx.strokeStyle = COLORS.gemDark; ctx.lineWidth = 1.5; ctx.stroke();
  }

  function drawHero(s, cx, cy, dx, hopT) {
    let rad = dx * 0.36;
    let lift = Math.sin(hopT * Math.PI) * 0.18; // a hop seen from above: it grows, then lands
    let alpha = 1;
    if (!s.alive) {
      const t = Math.min(1, (s.time - s.diedAt) / 0.6);
      if (s.cause === 'fall') { rad *= 1 - t * 0.85; alpha = 1 - t * 0.6; lift = 0; }
      else { cy += t * t * dx * 2; rad *= 1 - t * 0.5; alpha = 1 - t; }
    }
    ctx.globalAlpha = alpha;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(cx, cy + rad * 0.35, rad * 0.9, rad * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    const R = rad * (1 + lift);
    const y = cy - lift * rad * 1.2;
    ctx.fillStyle = COLORS.heroDark;
    ctx.beginPath(); ctx.arc(cx, y + R * 0.12, R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLORS.hero;
    ctx.beginPath(); ctx.arc(cx, y, R, 0, Math.PI * 2); ctx.fill();
    // eyes looking forward (up)
    ctx.fillStyle = COLORS.eye;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(cx + side * R * 0.36, y - R * 0.42, R * 0.13, R * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  resize();
  return { resize, draw };
}
