// The two controls: a touch on the left half of the screen steps forward-left, on the right half
// forward-right. Each finger counts on touch down (no waiting for release), so fast alternating
// thumbs work. Keyboard for computers: ← / A and → / D.
//
// `game` supplies: step(dir) with dir -1 or +1, and onTouch() (every press, e.g. to unlock audio).

export function bindInput(cvs, game) {
  cvs.addEventListener('pointerdown', e => {
    e.preventDefault();
    game.onTouch();
    const rect = cvs.getBoundingClientRect();
    game.step(e.clientX - rect.left < rect.width / 2 ? -1 : 1);
  });
  addEventListener('keydown', e => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') { game.onTouch(); game.step(-1); }
    else if (k === 'arrowright' || k === 'd') { game.onTouch(); game.step(1); }
    else return;
    e.preventDefault();
  });
}
