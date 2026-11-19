// Wires the sim, renderer, input, audio and the menus together.
import { createSim } from './sim.js';
import { createRenderer } from './render.js';
import { createRenderer3d } from './render3d.js';
import { bindInput } from './input.js';
import { play, unlock, setSound } from './audio.js';
import { store } from './store.js';
import { SHAPES, SIDE_MODES } from './config.js';

const $ = id => document.getElementById(id);
const cvs = $('game');
// Two views of the same board (v0.3): 'golem', third person in the forest (the original vision),
// and 'sapo', the top-down frog of v0.2, kept as an option.
const VIEWS = { golem: createRenderer3d(cvs), sapo: createRenderer(cvs) };
const NAMES = {
  golem: { gem: ['vaga-lume', 'vaga-lumes'], fall: 'Caiu no lago.', sank: () => 'A pedra afundou.' },
  sapo: { gem: ['mosca', 'moscas'], fall: 'Caiu na água.', sank: sh => sh === 'hexagono' ? 'A folha afundou.' : 'A pedra afundou.' },
};

let state = 'menu'; // 'menu' | 'play' | 'pause' | 'over'
let sim = null;
let shape = store.get('shape', 'losango');
if (!(shape in SHAPES)) shape = 'losango';
let view = store.get('view', 'golem');
if (!(view in VIEWS)) view = 'golem';
let sideMode = store.get('side', 'off');
if (!(sideMode in SIDE_MODES)) sideMode = 'off';
let sound = store.get('sound', true);
let best = store.get('best', 0);
let runs = store.get('runs', 0);
let hintedSide = 'off'; // the side-hop mode the last hints showed
let hints = 0; // seconds left of the left/right hints (first runs only)
setSound(sound);

$('verLabel').textContent = 'Protótipo · v' + self.APP_VERSION;

function newSim() {
  return createSim({ seed: (Math.random() * 2 ** 32) >>> 0, emit: (type, data) => onEvent(type, data) });
}
sim = newSim(); // a board behind the menu

function onEvent(type, data) {
  play(type, data);
  if (type === 'gem') $('gems').textContent = NAMES[view].gem[1] + ' ' + data.gems;
  if (type === 'step' && hints > 0 && sim.score >= 6) hints = Math.min(hints, 0.6);
  if (type === 'die') {
    if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) { /* ignore */ }
  }
}

function show(id, v) { $(id).hidden = !v; }

function start() {
  sim = newSim();
  state = 'play';
  runs++; store.set('runs', runs);
  hints = runs <= 3 || sideMode !== hintedSide ? 4 : 0;
  hintedSide = sideMode;
  $('score').textContent = '0';
  $('gems').textContent = NAMES[view].gem[1] + ' 0';
  $('bestHud').textContent = 'recorde ' + best;
  show('menu', false); show('over', false); show('paused', false); show('hud', true);
  cvs.focus();
}

function gameOver() {
  state = 'over';
  const score = sim.score;
  const isBest = score > best;
  if (isBest) { best = score; store.set('best', best); }
  $('overScore').textContent = score;
  $('overCause').textContent = sim.cause === 'fall' ? NAMES[view].fall : NAMES[view].sank(shape);
  $('overBest').textContent = isBest ? 'Novo recorde!' : 'Recorde: ' + best;
  $('overGems').textContent = sim.gems ? `· ${sim.gems} ${NAMES[view].gem[sim.gems > 1 ? 1 : 0]}` : '';
  show('hud', false); show('over', true);
}

function toMenu() {
  state = 'menu';
  show('over', false); show('paused', false); show('hud', false); show('menu', true);
  updateMenu();
}

function pause() {
  if (state !== 'play') return;
  state = 'pause';
  show('paused', true);
}
function resume() {
  if (state !== 'pause') return;
  state = 'play';
  show('paused', false);
}

function updateMenu() {
  $('menuBest').textContent = best ? 'Recorde: ' + best : 'Toque à esquerda ou à direita para pular.';
  for (const b of document.querySelectorAll('[data-shape]')) b.setAttribute('aria-pressed', String(b.dataset.shape === shape));
  for (const b of document.querySelectorAll('[data-view]')) b.setAttribute('aria-pressed', String(b.dataset.view === view));
  for (const b of document.querySelectorAll('[data-side]')) b.setAttribute('aria-pressed', String(b.dataset.side === sideMode));
  $('btnSound').textContent = 'Som: ' + (sound ? 'ligado' : 'desligado');
}

for (const b of document.querySelectorAll('[data-shape]')) {
  b.addEventListener('click', () => { shape = b.dataset.shape; store.set('shape', shape); updateMenu(); });
}
for (const b of document.querySelectorAll('[data-view]')) {
  b.addEventListener('click', () => { view = b.dataset.view; store.set('view', view); updateMenu(); });
}
for (const b of document.querySelectorAll('[data-side]')) {
  b.addEventListener('click', () => { sideMode = b.dataset.side; store.set('side', sideMode); updateMenu(); });
}
$('btnPlay').addEventListener('click', () => { unlock(); start(); });
$('btnAgain').addEventListener('click', () => { unlock(); start(); });
$('btnMenu').addEventListener('click', toMenu);
$('btnPause').addEventListener('click', pause);
$('btnResume').addEventListener('click', resume);
$('btnQuit').addEventListener('click', toMenu);
$('btnSound').addEventListener('click', () => { sound = !sound; store.set('sound', sound); setSound(sound); updateMenu(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

bindInput(cvs, {
  onTouch: unlock,
  sideMode: () => sideMode,
  step(dir, side) {
    if (state !== 'play') return;
    if (sim.move(dir, side)) $('score').textContent = sim.score;
  },
});

addEventListener('resize', () => { for (const r of Object.values(VIEWS)) r.resize(); });

let last = performance.now();
let overTimer = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state === 'play') {
    sim.update(dt);
    if (hints > 0) hints -= dt;
    if (!sim.alive) {
      overTimer += dt;
      if (overTimer > 0.8) { overTimer = 0; gameOver(); }
    }
  } else if (state === 'over' || state === 'menu') {
    sim.time += dt; // keeps the death animation and the crumble shake moving
  }
  VIEWS[view].draw(sim, {
    shape, dt, side: sideMode !== 'off',
    hints: state === 'play' ? hints : 0,
    sideHint: { off: '', double: 'toque duplo', hold: 'segurar' }[sideMode],
  });
  requestAnimationFrame(frame);
}
updateMenu();
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded && state !== 'play') { reloaded = true; location.reload(); }
  });
  addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    }).catch(() => {});
  });
}
