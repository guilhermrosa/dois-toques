// The stone golem, seen from behind. Ported from the user's character test artifact ("Teste de
// Personagem", the "Golem de ruína" option): weathered marble, broad shoulders, the head sunk between
// them, cracks, moss and a small flower on top, swinging arms.
// Drawn in metres with the origin at the feet and up = negative y; the caller translates and scales.
//
// pose: { air: 0..1 (how far into a hop), lean: radians (toward the hop), t: time for idling }

const C = {
  stone: '#c9c1b0', shade: '#a39b8a', crack: '#7d7566',
  moss: '#6f9a4a', mossL: '#93bd63', flower: '#f2a3c0',
};

function ell(ctx, x, y, rx, ry, col, rot = 0) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
}
function rrect(ctx, x, y, w, h, r, col) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}

export function drawGolem(ctx, pose) {
  const air = pose.air || 0;
  const tuck = Math.sin(air * Math.PI);          // legs tucked and arms up mid-hop
  const breathe = Math.sin((pose.t || 0) * 2.2) * 0.012;
  ctx.save();
  ctx.rotate(pose.lean || 0);
  // legs
  rrect(ctx, -0.27, -0.26 - tuck * 0.06, 0.2, 0.26, 0.05, C.shade);
  rrect(ctx, 0.07, -0.26 - tuck * 0.06, 0.2, 0.26, 0.05, C.shade);
  ctx.translate(0, breathe - tuck * 0.03);
  // arms from the shoulders: hanging at rest, swung up in the air
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * 0.4, -0.74); ctx.rotate(side * (0.08 + tuck * 0.55));
    rrect(ctx, -0.08, 0, 0.16, 0.42, 0.06, C.shade);
    ctx.restore();
  }
  // torso, wider at the shoulders
  ctx.fillStyle = C.stone; ctx.beginPath();
  ctx.moveTo(-0.28, -0.22); ctx.lineTo(0.28, -0.22); ctx.lineTo(0.4, -0.72);
  ctx.quadraticCurveTo(0.4, -0.84, 0.28, -0.84); ctx.lineTo(-0.28, -0.84);
  ctx.quadraticCurveTo(-0.4, -0.84, -0.4, -0.72); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = C.crack; ctx.lineWidth = 0.02; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-0.1, -0.8); ctx.lineTo(-0.04, -0.62); ctx.lineTo(-0.12, -0.5);
  ctx.moveTo(0.18, -0.4); ctx.lineTo(0.1, -0.32);
  ctx.stroke();
  rrect(ctx, -0.13, -0.98, 0.26, 0.17, 0.06, C.stone); // head
  for (const [x, y, r, col] of [[-0.3, -0.84, 0.07, C.moss], [-0.2, -0.87, 0.06, C.mossL], [0.27, -0.84, 0.07, C.moss],
    [0.17, -0.86, 0.05, C.mossL], [0, -0.99, 0.08, C.moss], [0.07, -1.01, 0.05, C.mossL]]) ell(ctx, x, y, r, r * 0.75, col);
  ell(ctx, 0.05, -1.06, 0.035, 0.035, C.flower);
  ctx.restore();
}
