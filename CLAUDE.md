# Dois Toques

Mobile top-down game (working title), shipped as a PWA on GitHub Pages from `main` (root). Same architecture as `guilhermrosa/corredor-invertido` and `guilhermrosa/lira-de-bolso`: no build step, no dependencies, static files and native ES modules.

## The game

Two controls only: a touch on the left half of the screen steps forward-left, on the right half forward-right (keyboard: ←/A, →/D). The board is a lattice of cells (r, x) with x + r even; a step goes to (r + 1, x ± 1). Holes and the board's edge are falls; the floor crumbles from behind (starting on the first move, faster as you go, never more than `maxGap` rows behind), so standing still loses. Score = rows climbed; gems are counted apart. The generator keeps one guaranteed zigzag path, so a way forward always exists (tests check 600 rows).

The cell shape is open (v0.1 prototype): diamond (losango), pointy-top hexagon and offset brick draw the same lattice, chosen in the menu, to be tried on a phone.

## Conventions

- Keep `js/sim.js` free of drawing and audio. It reports events through `emit(type, data)`; `main.js` routes them to `audio.js`. The renderer (`js/render.js`) only reads state.
- Tuning and colours live in `js/config.js`.
- When adding or renaming a file the game loads, add it to `SHELL` in `sw.js`.
- On every release, bump `APP_VERSION` in `js/version.js`, the only copy of the version (menu label and service worker cache name both read it).
- Privacy: nothing leaves the device; fonts are served from `fonts/`. `privacidade.html` explains it in pt-BR; keep it true.
- Saved data goes through `js/store.js` (localStorage, `dt-` keys).
- Icons: `python3 tools/make_icons.py` (Pillow).
- Tests: `npm test` (node --test).
- Commits: author and committer are the user, `guilhermrosa <57267848+guilhermrosa@users.noreply.github.com>`; no `Co-Authored-By` or `Claude-Session` lines.
- UI text in pt-BR; code and comments in English.
