# Dois Toques

Mobile top-down game (working title), shipped as a PWA on GitHub Pages from `main` (root). Same architecture as `guilhermrosa/corredor-invertido` and `guilhermrosa/lira-de-bolso`: no build step, no dependencies, static files and native ES modules.

## The game

Two controls only: a touch on the left half of the screen steps forward-left, on the right half forward-right (keyboard: ←/A, →/D). The board is a lattice of cells (r, x) with x + r even; a step goes to (r + 1, x ± 1). Holes and the board's edge are falls; the floor crumbles from behind (starting on the first move, faster as you go, never more than `maxGap` rows behind), so standing still loses. Score = rows climbed; gems are counted apart. The generator keeps one guaranteed zigzag path, so a way forward always exists (tests check 600 rows).

Original vision (user, 2026-11-19): the hero is a stone golem, from the early main-character concepts of `corredor-invertido` (there "the golem of the ruin" was the runner-up to the axolotl; no art of it exists in that repository). World (user, 2026-11-19): a whimsical forest, with lakes, moss and mist.
v0.3 builds it as the default view: `js/render3d.js`, a third-person camera behind and above the golem (hand-rolled perspective on Canvas 2D, a long lens so near stones are not blown up), stepping stones on a misty forest lake, round trees with red mushrooms on the banks, a far treeline, drifting fireflies. Gems are fireflies hovering over stones ("vaga-lumes"); the crumbling floor is the stones sinking under the heavy golem. The golem sprite (`js/golem.js`) is ported from the user's character test artifact ("Teste de Personagem", claude.ai, option "Golem de ruína"); it tucks its legs and swings its arms up mid-hop and leans toward the hop.

Theme in v0.2 (an exploration that came up in chat, not the original vision): a frog hopping over a lake, top-down (`js/render.js`). Flies are the "gems"; the crumbling floor is stones / lily pads sinking. Kept as an option in the menu (user, 2026-11-19).

Both views draw the same sim; `main.js` picks the renderer (`VIEWS`, stored as `view`) and the words for gems and deaths (`NAMES`). The icon still shows the frog (to redo with the golem).

Still being tried on a phone, chosen in the menu (the user's goals and challenges are still open):
- View: golem in the forest (third person, default) or frog (top-down).
- Grid: diamond (`losango`; the user's favourite in v0.1) or hex (`hexagono`, round stones or lily pads, every neighbour at the same distance). Offset bricks were dropped in v0.2.
- Side hop (user's idea, v0.2): a hop to (r, x ± 2), staying on the row and scoring nothing. Off by default; made by a double tap or by holding (`js/input.js`). Both cost latency on plain taps (double: waits `DOUBLE_MS`; hold: hops on release), which is why it is optional. Shift + arrow on a keyboard.

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
