// The controls: a touch on the left half of the screen hops forward-left, on the right half
// forward-right. Optional side hops (v0.2, chosen in the menu) stay on the row:
// - 'off':    every touch hops at once, on touch down (fast alternating thumbs work);
// - 'double': two quick touches on the same side make a side hop; a single touch must wait
//             DOUBLE_MS to be sure no second one comes (a touch on the other side settles it at once);
// - 'hold':   a touch hops when released; one held for HOLD_MS makes a side hop instead.
// Keyboard for computers: ← / A and → / D; with side hops on, Shift + ← / → for a side hop.
//
// `game` supplies: step(dir, side) with dir -1 or +1, sideMode(), and onTouch() (every press, to unlock audio).
import { DOUBLE_MS, HOLD_MS } from './config.js';

export function bindInput(cvs, game) {
  let pending = null;        // 'double': { dir, timer } a tap waiting for a possible second one
  const holds = new Map();   // 'hold': pointerId -> { dir, timer, done }

  function flush() {
    if (!pending) return;
    clearTimeout(pending.timer);
    const { dir } = pending;
    pending = null;
    game.step(dir, false);
  }

  cvs.addEventListener('pointerdown', e => {
    e.preventDefault();
    game.onTouch();
    const rect = cvs.getBoundingClientRect();
    const dir = e.clientX - rect.left < rect.width / 2 ? -1 : 1;
    const mode = game.sideMode();
    if (mode === 'double') {
      if (pending && pending.dir === dir) {
        clearTimeout(pending.timer);
        pending = null;
        game.step(dir, true);
        return;
      }
      flush();
      pending = { dir, timer: setTimeout(flush, DOUBLE_MS) };
    } else if (mode === 'hold') {
      const h = { dir, done: false };
      h.timer = setTimeout(() => { h.done = true; game.step(dir, true); }, HOLD_MS);
      holds.set(e.pointerId, h);
      try { cvs.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    } else {
      game.step(dir, false);
    }
  });

  const release = cancel => e => {
    const h = holds.get(e.pointerId);
    if (!h) return;
    holds.delete(e.pointerId);
    clearTimeout(h.timer);
    if (!h.done && !cancel) game.step(h.dir, false);
  };
  cvs.addEventListener('pointerup', release(false));
  cvs.addEventListener('pointercancel', release(true));

  addEventListener('keydown', e => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    let dir = 0;
    if (k === 'arrowleft' || k === 'a') dir = -1;
    else if (k === 'arrowright' || k === 'd') dir = 1;
    else return;
    e.preventDefault();
    game.onTouch();
    game.step(dir, e.shiftKey && game.sideMode() !== 'off');
  });
}
