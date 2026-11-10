import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './style.css';
import { Sound } from './audio';
import { DT, NIGHTS, VIEW_H, VIEW_W } from './config';
import { ACTIONS, Controls, DEFAULT_KEYS, keyName, reservedKey, type Action, type Bindings } from './input';
import { drawCard, drawFinal, drawHud, drawPause, drawPowers, pauseButtons, type NightScore } from './render/hud';
import { WorldView, type Prompts } from './render/world';
import { Game } from './sim/game';
import { nightLevel, type Powerup } from './sim/level';
import { mountIntro } from '../teaser/intro';
import type { Teaser } from '../teaser/player';

const canvas = document.getElementById('view') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const BINDINGS_KEY = 'plc.keys'; // the player's key bindings, from Controls on the menu
let bindings = loadBindings();
const controls = new Controls(bindings);
const sound = new Sound(localStorageGet('plc.muted') === '1', localStorageGet('plc.music') !== '0');
// Start audio inside a real user gesture, which every browser accepts.
for (const ev of ['keydown', 'pointerdown', 'touchstart']) addEventListener(ev, () => sound.unlock(), { capture: true });
const params = new URLSearchParams(location.search);
// ?store, ?night=2 and ?training skip the menu, for testing.
const skipTo = params.has('training') ? 'training' : params.has('store') || params.has('night') ? 'store' : null;
const firstNight = NIGHTS[Number(params.get('night')) - 1] ? Number(params.get('night')) : 1;

// The front door (index.html) is the loading screen, then the start screen. It holds long enough to be seen and
// ignores keys until everything is in.
const front = document.getElementById('front')!;
// Three a side of the bandit's face: 0-2 down the left, 3-5 down the right.
const MENU = ['start', 'nights', 'tutorial', 'intro', 'controls', 'about'] as const;
const menu = MENU.map((id) => document.getElementById(`front-${id}`)!);
let menuChoice = 0;
const frontImg = front.querySelector('img')!;
const muteBtn = document.getElementById('front-mute')!;
const musicBtn = document.getElementById('front-music')!;
let ready = false;
// A font that fails to load still lets the game start, in the fallback face.
const fonts = Promise.all([document.fonts.load('700 1em Fredoka'), document.fonts.load('600 1em Fredoka')]).catch(() => {});
fonts.then(() => front.classList.add('fonts'));
Promise.all([fonts, frontImg.decode().catch(() => {}), new Promise((r) => setTimeout(r, skipTo ? 0 : 1500))]).then(() => {
  ready = true;
  front.classList.add('ready');
});

// The teaser film plays over the front door the first time the game is opened, and after that only from Watch Intro
// on the menu (host, 2026-11-09). The menu is waiting underneath when it ends or is skipped. While it is up it owns
// the keyboard, and the game's music holds off. ?store and friends go straight in, and ?menu opens on the menu.
const INTRO_SEEN = 'plc.introSeen';
let teaser: Teaser | null = null;

function playIntro() {
  if (teaser) return;
  let el = document.getElementById('teaser');
  if (!el) {
    el = document.createElement('div');
    el.id = 'teaser';
    document.body.append(el);
  }
  const root = el;
  teaser = mountIntro(root, {
    muted: sound.muted,
    onDone: () => {
      controls.menu(); // drop the key that skipped it, so it can't also press a menu button
      teaser = null;
      root.remove();
    },
  });
}

if (skipTo || params.has('menu') || localStorageGet(INTRO_SEEN) === '1') document.getElementById('teaser')?.remove();
else {
  localStorageSet(INTRO_SEEN, '1'); // seen once is enough, even if it was skipped
  playIntro();
}

let seed = Date.now() % 100000;
let night = firstNight;
let run: NightScore[] = []; // the nights finished so far this run
let powerups: Powerup[] = []; // kept from night to night, caught or not
let game = newGame();
let view = new WorldView();
let mode: 'title' | 'play' | 'paused' | 'powers' | 'card' | 'final' = skipTo ? 'play' : 'title';
front.classList.toggle('hidden', mode !== 'title');
let pauseChoice = 0; // 0 Resume, 1 Quit to title
let cardPage = 0; // 0 the report card, 1 the night log on its back
/** When the report card came up. Keys are ignored on it for CARD_LOCK seconds, so a jump or grab the player was
    still mashing as the night ended can't dismiss it before it's been read (host, 2026-11-10). */
let cardAt = 0;
const CARD_LOCK = 1;
let scale = 1;
let offX = 0;
let offY = 0;

function newGame(start: 'store' | 'training' | 'tutorial' = skipTo ?? 'store') {
  seed = (seed * 16807 + 7) % 2147483647;
  return new Game({ seed, start, night, powerups });
}

function restart(to: typeof mode = 'play') {
  night = firstNight;
  run = [];
  powerups = [];
  game = newGame();
  view = new WorldView();
  mode = to;
  front.classList.toggle('hidden', mode !== 'title');
  expose();
}

/** On from the report card. Caught, the run is over and it's back to the title (host, 2026-11-10); climbed out, on
    to the next night, or the run total after the last. */
function nextNight() {
  if (!game.result?.escaped) return restart('title');
  if (night >= NIGHTS.length) {
    mode = 'final';
    return;
  }
  night++;
  powerups = [...game.powerups];
  game = newGame('store');
  view = new WorldView();
  mode = 'play';
  expose();
}

/** Straight into a night, keeping the powerups you have (Pick a Night sets them first). */
function jumpToNight(n: number) {
  closePanel();
  night = n;
  run = [];
  game = newGame('store');
  view = new WorldView();
  mode = 'play';
  front.classList.add('hidden');
  expose();
}

function pick(choice: number) {
  menuChoice = choice;
  menu.forEach((b, i) => b.classList.toggle('picked', i === choice));
}

/** ↑↓ along a side of the face, ←→ across to the same row on the other side. */
function moveMenu(dir: 'up' | 'down' | 'across') {
  const col = menuChoice < 3 ? 0 : 3;
  const row = menuChoice % 3;
  pick(dir === 'across' ? (menuChoice + 3) % 6 : col + ((row + (dir === 'up' ? 2 : 1)) % 3));
}

function start(choice = menuChoice) {
  if (mode !== 'title' || !ready) return;
  const item = MENU[choice];
  if (item === 'intro') return playIntro();
  if (item === 'nights' || item === 'controls' || item === 'about') return openPanel(item);
  if (item === 'tutorial') {
    game = newGame('tutorial');
    view = new WorldView();
    expose();
  }
  mode = 'play';
  front.classList.add('hidden');
}

// The menu's panels (host, 2026-11-10): Pick a Night, Controls (rebind the keyboard) and About. One is up at a time,
// over the menu; arrows move, Space or Enter picks, Esc goes back.
type Panel = 'nights' | 'controls' | 'about';
let panel: Panel | null = null;
let panelItems: HTMLElement[] = [];
let panelPick = 0;
let panelCols = 1;
/** The key slot waiting for its new key, in Controls. */
let listening: { act: Action; slot: 0 | 1 } | null = null;
const ABOUT_URL = 'https://frostyscorner.info/';

function openPanel(p: Panel) {
  panel = p;
  front.classList.add('panel');
  document.getElementById(`panel-${p}`)!.hidden = false;
  if (p === 'nights') {
    panelItems = [...document.querySelectorAll<HTMLElement>('#panel-nights [data-night]')];
    panelCols = 5;
  } else if (p === 'controls') {
    renderBinds();
    panelCols = 2;
  } else {
    panelItems = [document.getElementById('about-link')!];
    panelCols = 1;
  }
  pickPanel(0);
}
function closePanel() {
  if (!panel) return;
  document.getElementById(`panel-${panel}`)!.hidden = true;
  front.classList.remove('panel');
  panel = null;
  listening = null;
}
function pickPanel(i: number) {
  panelPick = Math.max(0, Math.min(panelItems.length - 1, i));
  panelItems.forEach((b, n) => b.classList.toggle('picked', n === panelPick));
}
function movePanel(m: string) {
  const left = ['ArrowLeft', 'KeyA', 'PadLeft'].includes(m);
  const right = ['ArrowRight', 'KeyD', 'PadRight'].includes(m);
  const up = ['ArrowUp', 'KeyW', 'PadUp'].includes(m);
  const down = ['ArrowDown', 'KeyS', 'PadDown'].includes(m);
  // Controls' last button (Reset) sits alone on its row.
  if (left || right) pickPanel(panelPick + (left ? -1 : 1));
  else if (up) pickPanel(panelPick >= panelItems.length - 1 && panelCols > 1 && panelItems.length % panelCols ? panelPick - 1 : panelPick - panelCols);
  else if (down) pickPanel(panelPick + panelCols);
}

/** A run from a chosen night, holding the powerups of the nights before it, as if you'd picked them all up. */
function startNight(n: number) {
  powerups = [];
  for (let k = 1; k < n; k++) {
    const kind = nightLevel(k).powerup?.kind;
    if (kind) powerups.push(kind);
  }
  jumpToNight(n);
}

/** Controls: a row per action, its two keys as buttons, and Reset under them. */
function renderBinds() {
  const grid = document.querySelector('#panel-controls .front-binds')!;
  grid.textContent = '';
  panelItems = [];
  for (const { act, label } of ACTIONS) {
    const name = document.createElement('span');
    name.textContent = label;
    grid.append(name);
    for (const slot of [0, 1] as const) {
      const b = document.createElement('button');
      b.type = 'button';
      const waiting = listening?.act === act && listening.slot === slot;
      b.textContent = waiting ? 'Press a key…' : keyName(bindings[act][slot]);
      b.classList.toggle('listening', waiting);
      b.addEventListener('click', () => {
        listening = { act, slot };
        b.blur();
        renderBinds();
      });
      grid.append(b);
      panelItems.push(b);
    }
  }
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'front-reset';
  reset.textContent = 'Reset to defaults';
  reset.addEventListener('click', () => {
    reset.blur();
    setBindings(structuredClone(DEFAULT_KEYS));
  });
  grid.append(reset);
  panelItems.push(reset);
  panelItems.forEach((b, i) => b.addEventListener('pointerenter', () => pickPanel(i)));
  pickPanel(panelPick);
}
/** A key belongs to one action at a time, so taking it clears it wherever else it was. */
function bindKey(code: string) {
  const at = listening!;
  listening = null;
  const next = structuredClone(bindings);
  for (const act of Object.keys(next) as Action[]) next[act] = next[act].map((c) => (c === code ? null : c)) as [string | null, string | null];
  next[at.act][at.slot] = code;
  setBindings(next);
}
function setBindings(b: Bindings) {
  bindings = b;
  localStorageSet(BINDINGS_KEY, JSON.stringify(b));
  controls.bind(b);
  showKeyTags();
  if (panel === 'controls') renderBinds();
}
/** The counter's key tags show each action's first key. */
function showKeyTags() {
  for (const kbd of document.querySelectorAll<HTMLElement>('.front-tags.keys kbd[data-act]')) {
    const name = boundKey(kbd.dataset.act as Action);
    kbd.textContent = name;
    kbd.classList.toggle('wide', name.length > 2);
  }
}
function boundKey(act: Action): string {
  return keyName(bindings[act][0] ?? bindings[act][1]);
}
showKeyTags();
document.querySelectorAll<HTMLElement>('#panel-nights [data-night]').forEach((b, i) => {
  b.addEventListener('click', () => startNight(Number(b.dataset.night)));
  b.addEventListener('pointerenter', () => pickPanel(i));
});
// The About link opens in the key's own event, not later in the frame, or the browser blocks the new tab.
addEventListener('keydown', (e) => {
  if (panel === 'about' && (e.code === 'Enter' || e.code === 'Space') && !e.repeat) window.open(ABOUT_URL, '_blank', 'noopener');
});
document.addEventListener('click', (e) => {
  // A click on the shade, off the panel, goes back. The path, not the target: a key button redraws as it's clicked.
  if (panel && !e.composedPath().some((el) => el instanceof HTMLElement && el.matches('.front-panel, #front-menu, .front-sound'))) closePanel();
});

function toggleMute() {
  localStorageSet('plc.muted', sound.toggle() ? '1' : '0');
  teaser?.setMuted(sound.muted);
  showSound();
}
function toggleMusic() {
  localStorageSet('plc.music', sound.toggleMusic() ? '1' : '0');
  showSound();
}
function showSound() {
  muteBtn.setAttribute('aria-pressed', String(sound.muted));
  musicBtn.setAttribute('aria-pressed', String(sound.musicOn));
}
showSound();
// Blur after a click, so a later Space plays rather than pressing the button again.
for (const [btn, act] of [...menu.map((b, i) => [b, () => start(i)] as const), [muteBtn, toggleMute] as const, [musicBtn, toggleMusic] as const]) {
  btn.addEventListener('click', () => {
    act();
    btn.blur();
  });
}
menu.forEach((b, i) => b.addEventListener('pointerenter', () => pick(i)));

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  scale = Math.min(innerWidth / VIEW_W, innerHeight / VIEW_H);
  offX = (innerWidth - VIEW_W * scale) / 2;
  offY = (innerHeight - VIEW_H * scale) / 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
}
addEventListener('resize', resize);
resize();

// The pause menu with the mouse: pointing at a button picks it, clicking it chooses it.
function pauseButtonAt(e: PointerEvent | MouseEvent): number {
  const x = (e.clientX - offX) / scale;
  const y = (e.clientY - offY) / scale;
  return pauseButtons().findIndex((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
}
canvas.addEventListener('pointermove', (e) => {
  const i = mode === 'paused' ? pauseButtonAt(e) : -1;
  if (i >= 0) pauseChoice = i;
  canvas.style.cursor = i >= 0 ? 'pointer' : '';
});
canvas.addEventListener('click', (e) => {
  if (mode !== 'paused') return;
  const i = pauseButtonAt(e);
  canvas.style.cursor = '';
  if (i === 0) mode = 'play';
  else if (i === 1) restart('title');
});

function keys(): Prompts {
  return controls.usingPad
    ? { grab: 'X', up: 'Up', down: 'Down', jump: 'A', throw: 'B', swap: 'LB', hoot: 'Y', powers: 'Select' }
    : { grab: boundKey('grab'), up: boundKey('up'), down: boundKey('down'), jump: boundKey('jump'), throw: boundKey('throw'), swap: boundKey('swap'), hoot: boundKey('hoot'), powers: 'P' };
}

let acc = 0;
let last = performance.now();
let time = 0;

function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  time += dt;
  const input = controls.read();

  // Title: Start Game / Tutorial. Pause: Resume / Quit to title (no restart). Card: next night or title (no retry).
  for (const m of controls.menu()) {
    sound.unlock();
    if (mode === 'card' && time - cardAt < CARD_LOCK) continue; // still being read: see cardAt
    const confirm = m === 'Space' || m === 'Enter' || m === 'PadA';
    if (listening) {
      // Controls is waiting for a key: this is it (Esc lets it be).
      if (m === 'Escape' || m === 'PadStart') {
        listening = null;
        renderBinds();
      } else if (!m.startsWith('Pad') && !reservedKey(m)) bindKey(m);
      continue;
    }
    if (m === 'KeyM') toggleMute();
    else if (m === 'KeyN') toggleMusic();
    else if (teaser) {
      // The film hears the keyboard itself; only the gamepad has to be passed on.
      if (m === 'PadA' || m === 'PadStart') teaser.press();
    } else if (mode === 'title' && panel) {
      if (m === 'Escape' || m === 'PadStart' || m === 'PadSelect') closePanel();
      else if (confirm && panel !== 'about') panelItems[panelPick]?.click(); // About's link opens in its keydown, above
      else movePanel(m);
    } else if (mode === 'title' && ready && (confirm || m === 'PadStart')) start();
    else if (mode === 'title' && ready && ['ArrowUp', 'KeyW', 'PadUp'].includes(m)) moveMenu('up');
    else if (mode === 'title' && ready && ['ArrowDown', 'KeyS', 'PadDown'].includes(m)) moveMenu('down');
    else if (mode === 'title' && ready && ['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'PadLeft', 'PadRight'].includes(m)) moveMenu('across');
    else if (mode === 'card' && (m === 'KeyL' || m === 'PadSelect')) cardPage = 1 - cardPage;
    else if ((mode === 'card' || mode === 'final') && (m === 'Escape' || m === 'PadStart')) restart('title');
    else if (mode === 'card' && confirm) nextNight();
    else if (mode === 'final' && confirm) restart('play');
    else if (mode === 'play' && (m === 'KeyP' || m === 'PadSelect')) mode = 'powers';
    else if (mode === 'powers' && (m === 'KeyP' || m === 'PadSelect' || m === 'Escape' || m === 'PadStart')) mode = 'play';
    else if (mode === 'play' && (m === 'Escape' || m === 'PadStart')) {
      mode = 'paused';
      pauseChoice = 0;
    } else if (mode === 'paused') {
      if (m === 'Escape' || m === 'PadStart') mode = 'play';
      else if (['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS', 'PadUp', 'PadDown'].includes(m)) pauseChoice = 1 - pauseChoice;
      else if (confirm) {
        if (pauseChoice === 0) mode = 'play';
        else restart('title');
      }
    }
  }
  if (mode === 'play') {
    acc += dt;
    while (acc >= DT) {
      game.step(input);
      controls.consumed();
      for (const e of game.events) sound.play(e, game);
      acc -= DT;
      if (game.phase === 'over') {
        if (!game.result) {
          restart('title'); // finished the tutorial
          break;
        }
        mode = 'card';
        cardPage = 0;
        cardAt = time;
        const r = game.result;
        run.push({ night: r.night, score: r.score, grade: r.grade, escaped: r.escaped });
        logNight();
        break;
      }
    }
  } else acc = 0;
  if (!teaser) sound.update(mode === 'title' ? null : game, mode === 'final' ? 'card' : mode === 'powers' ? 'paused' : mode, dt);

  ctx.save();
  ctx.fillStyle = '#120d14';
  ctx.fillRect(0, 0, innerWidth, innerHeight);
  ctx.translate(offX, offY);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.rect(0, 0, VIEW_W, VIEW_H);
  ctx.clip();
  // On the title the front door covers this, and fades to reveal the night's first frame.
  view.draw(ctx, game, time, keys());
  drawHud(ctx, game, time, keys());
  if (mode === 'paused') drawPause(ctx, pauseChoice, controls.usingPad);
  if (mode === 'powers') drawPowers(ctx, game, controls.usingPad);
  if (mode === 'card') drawCard(ctx, game, time, controls.usingPad, cardPage);
  if (mode === 'final') drawFinal(ctx, run, time, controls.usingPad);
  if (mode === 'title') {
    const input = controls.usingPad ? 'pad' : 'keys';
    if (front.dataset.input !== input) front.dataset.input = input;
  }
  ctx.restore();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/** The night log in the console too, so a tester can copy it. */
function logNight() {
  const r = game.result!;
  console.log(`Badger Bandits night: ${r.escaped ? 'climbed out' : `caught (${r.reason})`}, specials ${r.specials}/${r.specialsTotal} = ${r.percent}% ${r.grade}, bonus ${r.bonus} x${r.mult}, score ${r.score.toFixed(1)}`);
  console.table(game.log.map((e) => ({ time: `${Math.floor(e.t / 60)}:${Math.floor(e.t % 60).toString().padStart(2, '0')}`, what: e.text, points: e.pts === undefined ? '' : +e.pts.toFixed(1) })));
}

function expose() {
  (window as unknown as { __plc: unknown }).__plc = { game, restart, sound };
}
expose();

/** The saved key bindings, or the defaults for anything missing or broken. */
function loadBindings(): Bindings {
  const b = structuredClone(DEFAULT_KEYS);
  try {
    const saved = JSON.parse(localStorageGet(BINDINGS_KEY) ?? '{}');
    for (const act of Object.keys(b) as Action[]) {
      const v = saved[act];
      if (Array.isArray(v) && v.length === 2 && v.every((c) => c === null || typeof c === 'string')) b[act] = [v[0], v[1]];
    }
  } catch {
    /* defaults */
  }
  return b;
}

function localStorageGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function localStorageSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode */
  }
}
