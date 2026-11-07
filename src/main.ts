import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './style.css';
import { Sound } from './audio';
import { DT, VIEW_H, VIEW_W } from './config';
import { Controls } from './input';
import { drawCard, drawHud, drawPause } from './render/hud';
import { WorldView, type Prompts } from './render/world';
import { Game } from './sim/game';

const canvas = document.getElementById('view') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const controls = new Controls();
const sound = new Sound(localStorageGet('plc.muted') === '1', localStorageGet('plc.music') !== '0');
// Start audio inside a real user gesture, which every browser accepts.
for (const ev of ['keydown', 'pointerdown', 'touchstart']) addEventListener(ev, () => sound.unlock(), { capture: true });
const params = new URLSearchParams(location.search);
const skipTutorial = params.has('store');

// The front door (index.html) is the loading screen, then the start screen. It holds long enough to be seen and
// ignores keys until everything is in.
const front = document.getElementById('front')!;
const frontPrompt = document.getElementById('front-prompt')!;
const frontImg = front.querySelector('img')!;
const muteBtn = document.getElementById('front-mute')!;
const musicBtn = document.getElementById('front-music')!;
let ready = false;
// A font that fails to load still lets the game start, in the fallback face.
const fonts = Promise.all([document.fonts.load('700 1em Fredoka'), document.fonts.load('600 1em Fredoka')]).catch(() => {});
fonts.then(() => front.classList.add('fonts'));
Promise.all([fonts, frontImg.decode().catch(() => {}), new Promise((r) => setTimeout(r, skipTutorial ? 0 : 1500))]).then(() => {
  ready = true;
  front.classList.add('ready');
});

let seed = Date.now() % 100000;
let game = newGame();
let view = new WorldView();
let mode: 'title' | 'play' | 'paused' | 'card' = skipTutorial ? 'play' : 'title';
front.classList.toggle('hidden', mode !== 'title');
let pauseChoice = 0; // 0 Resume, 1 Quit to title
let cardPage = 0; // 0 the report card, 1 the night log on its back
let scale = 1;
let offX = 0;
let offY = 0;

function newGame() {
  seed = (seed * 16807 + 7) % 2147483647;
  return new Game({ seed, start: skipTutorial ? 'store' : 'roof' });
}

function restart(to: typeof mode = 'play') {
  game = newGame();
  view = new WorldView();
  mode = to;
  front.classList.toggle('hidden', mode !== 'title');
  expose();
}

function start() {
  if (mode !== 'title' || !ready) return;
  mode = 'play';
  front.classList.add('hidden');
}

function toggleMute() {
  localStorageSet('plc.muted', sound.toggle() ? '1' : '0');
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
for (const [btn, act] of [[frontPrompt, start], [muteBtn, toggleMute], [musicBtn, toggleMusic]] as const) {
  btn.addEventListener('click', () => {
    act();
    btn.blur();
  });
}

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

function keys(): Prompts {
  return controls.usingPad
    ? { grab: 'X', up: 'Up', down: 'Down', jump: 'A', throw: 'B', swap: 'LB', hoot: 'Y' }
    : { grab: 'E', up: '↑', down: '↓', jump: 'Space', throw: 'F', swap: 'Q', hoot: 'R' };
}

let acc = 0;
let last = performance.now();
let time = 0;

function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  time += dt;
  const input = controls.read();

  // Title: Play. Pause: Resume / Quit to title (no restart). Card: Title (no retry).
  for (const m of controls.menu()) {
    sound.unlock();
    const confirm = m === 'Space' || m === 'Enter' || m === 'PadA';
    if (m === 'KeyM') toggleMute();
    else if (m === 'KeyN') toggleMusic();
    else if (mode === 'title' && ready && (confirm || m === 'PadStart')) start();
    else if (mode === 'card' && (m === 'KeyL' || m === 'PadSelect')) cardPage = 1 - cardPage;
    else if (mode === 'card' && (confirm || m === 'PadStart')) restart('title');
    else if (mode === 'play' && (m === 'Escape' || m === 'KeyP' || m === 'PadStart')) {
      mode = 'paused';
      pauseChoice = 0;
    } else if (mode === 'paused') {
      if (m === 'Escape' || m === 'KeyP' || m === 'PadStart') mode = 'play';
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
        mode = 'card';
        cardPage = 0;
        logNight();
        break;
      }
    }
  } else acc = 0;
  sound.update(mode === 'title' ? null : game, mode, dt);

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
  drawHud(ctx, game, time);
  if (mode === 'paused') drawPause(ctx, pauseChoice, controls.usingPad);
  if (mode === 'card') drawCard(ctx, game, time, controls.usingPad, cardPage);
  if (mode === 'title') {
    const input = controls.usingPad ? 'pad' : 'keys';
    if (front.dataset.input !== input) front.dataset.input = input;
    const say = `Press ${controls.usingPad ? 'A' : 'Space'} to begin`;
    if (ready && frontPrompt.textContent !== say) frontPrompt.textContent = say;
  }
  ctx.restore();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/** The night log in the console too, so a tester can copy it. */
function logNight() {
  const r = game.result!;
  console.log(`Badger Bandits night: ${r.escaped ? 'climbed out' : `caught (${r.reason})`}, score ${r.score.toFixed(1)} of ${r.target} = ${Math.round((r.score / r.target) * 100)}% ${r.grade}`);
  console.table(game.log.map((e) => ({ time: `${Math.floor(e.t / 60)}:${Math.floor(e.t % 60).toString().padStart(2, '0')}`, what: e.text, points: e.pts === undefined ? '' : +e.pts.toFixed(1) })));
}

function expose() {
  (window as unknown as { __plc: unknown }).__plc = { game, restart, sound };
}
expose();

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
