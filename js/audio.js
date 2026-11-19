// Short synthesized sounds (Web Audio), no files. The context opens on the first touch.
let ac = null;
let on = true;

export function setSound(v) { on = v; }
export function unlock() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; } }
  if (ac.state === 'suspended') ac.resume().catch(() => {});
}

function blip(freq, dur, type = 'sine', vol = 0.12, slide = 0) {
  if (!on || !ac) return;
  const t = ac.currentTime;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

// Steps alternate two notes by direction, so a zigzag sounds like a little tune.
export function play(type, data = {}) {
  if (type === 'step') blip(data.dir < 0 ? 520 : 660, 0.06, 'triangle', 0.08);
  else if (type === 'gem') { blip(988, 0.08, 'sine', 0.1); setTimeout(() => blip(1319, 0.12, 'sine', 0.1), 60); }
  else if (type === 'milestone') blip(784, 0.25, 'sine', 0.08, 400);
  else if (type === 'die') blip(data.cause === 'fall' ? 300 : 180, 0.5, 'sawtooth', 0.08, -220);
}
