import './teaser.css';

/* The teaser film, as something a page can mount: the game plays it over its start screen, and teaser/index.html
   plays it by itself. It is two clips shown as one film, with the game's wordmark dropped over the last moments. */

const HEIST_URL = new URL('./teaser.mp4', import.meta.url).href;
const ENDING_URL = new URL('./ending.mp4', import.meta.url).href;
const POSTER_URL = new URL('./poster.jpg', import.meta.url).href;

/** The heist plays to here, then the ending takes over. Its own last cut is at about 12.55, and a background tab
    only checks four times a second, so this sits a full check early. The heist is silent from 11.75 until then,
    so the join can't be heard. */
const CUT_AT = 12.25;
/** Seconds into the ending when the wordmark comes up under the shelf: after the giggle and the sigh, on the low
    closing note. */
const TITLE_AT = 4.1;
/** The ending's sound fades over its last moments, so a laugh is never clipped by the clip running out. */
const FADE_OUT = 0.5;
/** When the film isn't held on its last frame, it rests there this long before handing over. */
const REST_MS = 1400;
/** How long the hand-over fade takes, after the film and after a skip. Matches the transitions in teaser.css. */
const LEAVE_MS = 600;
const SKIP_MS = 250;

/** waiting: poster up. heist: the first clip. ending: the second. ended: on the last frame. leaving: fading out. */
type State = 'waiting' | 'heist' | 'ending' | 'ended' | 'leaving';

export interface TeaserOptions {
  /** Called once, when the film has been skipped, or has finished and (unless `hold`) faded away. */
  onDone(): void;
  /** Stay on the last frame offering "watch again", rather than finishing. Only Esc skips while it plays. */
  hold?: boolean;
  /** Start silent, for a player who has the game muted. */
  muted?: boolean;
}

export interface Teaser {
  /** The player's go button, for input this module can't hear itself (a gamepad): play if waiting, else skip. */
  press(): void;
  /** Stop and hand over. */
  skip(): void;
  setMuted(muted: boolean): void;
}

const MARKUP = `
  <div class="tz-stage">
    <video class="tz-heist" preload="auto" playsinline></video>
    <video class="tz-ending" preload="auto" playsinline></video>
    <div class="tz-shade"></div>
    <h1 class="tz-title">
      <svg viewBox="0 0 1240 220" role="img" aria-label="Badger Bandits">
        <defs>
          <text id="tz-wm" x="620" y="150" text-anchor="middle">Badger Bandits</text>
          <linearGradient id="tz-wm-face" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.15" stop-color="#fff7e0" />
            <stop offset="0.75" stop-color="#f6cf7a" />
          </linearGradient>
          <linearGradient id="tz-wm-side" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.4" stop-color="#b8702a" />
            <stop offset="0.9" stop-color="#6e3a14" />
          </linearGradient>
        </defs>
        <g class="tz-wm-edge"><use href="#tz-wm" y="24" /><use href="#tz-wm" y="20" /><use href="#tz-wm" y="16" /><use href="#tz-wm" y="12" /><use href="#tz-wm" y="8" /><use href="#tz-wm" y="4" /></g>
        <g class="tz-wm-side"><use href="#tz-wm" y="24" /><use href="#tz-wm" y="20" /><use href="#tz-wm" y="16" /><use href="#tz-wm" y="12" /><use href="#tz-wm" y="8" /><use href="#tz-wm" y="4" /></g>
        <use class="tz-wm-face" href="#tz-wm" />
      </svg>
    </h1>
    <button type="button" class="tz-play" aria-label="Play the teaser">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
      Play
    </button>
    <p class="tz-hint tz-skip"><kbd>Esc</kbd> Skip</p>
    <p class="tz-hint tz-after"><kbd>Enter</kbd> Start the heist<span>·</span><kbd>R</kbd> Watch again</p>
  </div>`;

/** Fills `root` (the page's #teaser element) with the film and tries to start it. */
export function mountTeaser(root: HTMLElement, options: TeaserOptions): Teaser {
  const hold = options.hold ?? false;
  root.innerHTML = MARKUP;
  const heist = root.querySelector('.tz-heist') as HTMLVideoElement;
  const ending = root.querySelector('.tz-ending') as HTMLVideoElement;
  const playButton = root.querySelector('.tz-play') as HTMLButtonElement;
  heist.poster = POSTER_URL;
  heist.src = HEIST_URL;
  ending.src = ENDING_URL;
  heist.muted = ending.muted = options.muted ?? false;

  let state: State = 'waiting';
  /** Which clip is on screen: it outlives the state, so a fade-out keeps showing the clip it started on. */
  let cut = false;
  let restTimer = 0;

  function show(next: State, titled = false): void {
    state = next;
    const playing = next === 'heist' || next === 'ending' ? ' playing' : '';
    root.className = `${next}${playing}${cut ? ' cut' : ''}${titled ? ' titled' : ''}${hold ? ' hold' : ''}`;
  }

  /** From the top. `asked` is a real request from the player: if the browser still refuses, give up and hand over
      rather than leave them stuck on a Play button that doesn't work. */
  async function play(asked: boolean): Promise<void> {
    clearTimeout(restTimer);
    ending.pause();
    heist.currentTime = 0;
    try {
      await heist.play();
      if (state === 'leaving') return void heist.pause(); // skipped while the browser was still deciding
      cut = false;
      show('heist');
      // Rewound only now it is out of sight, so a replay doesn't flash the ending's first frame.
      ending.currentTime = 0;
      ending.volume = 1;
      requestAnimationFrame(tick);
    } catch {
      // The browser wants a click or a key before it will play sound: leave the poster and the Play button up.
      if (asked) leave(SKIP_MS);
      else if (state !== 'leaving') show('waiting');
    }
  }

  /** Swaps to the ending, which has been sitting loaded on its first frame over the heist, unseen. */
  function cutToEnding(): void {
    cut = true;
    show('ending');
    heist.pause();
    ending.play().catch(finish);
  }

  /** The last frame: stay there if held, otherwise rest a moment and hand over. */
  function finish(): void {
    show('ended', true);
    if (!hold) restTimer = window.setTimeout(() => leave(LEAVE_MS), REST_MS);
  }

  /** Moves the film along: the cut, then the wordmark, then the fade. */
  function step(): void {
    if (state === 'heist' && heist.currentTime >= CUT_AT) {
      cutToEnding();
    } else if (state === 'ending') {
      if (ending.currentTime >= TITLE_AT) root.classList.add('titled');
      const left = ending.duration - ending.currentTime;
      if (left < FADE_OUT) ending.volume = Math.max(0, left / FADE_OUT);
    }
  }
  /** Every frame rather than on timeupdate, which only fires a few times a second and would smear the cut. */
  function tick(): void {
    step();
    if (state === 'heist' || state === 'ending') requestAnimationFrame(tick);
  }

  /** Fades out, then hands over. Everything that ends the teaser comes through here, once. */
  function leave(ms: number): void {
    if (state === 'leaving') return;
    clearTimeout(restTimer);
    const titled = root.classList.contains('titled');
    show('leaving', titled);
    root.style.transitionDuration = `${ms}ms`;
    heist.pause();
    ending.pause();
    removeEventListener('keydown', onKey);
    window.setTimeout(options.onDone, ms);
  }

  function onKey(event: KeyboardEvent): void {
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    const go = event.key === 'Enter' || event.key === ' ';
    if (event.key === 'Escape') {
      leave(SKIP_MS);
    } else if (state === 'waiting' && go) {
      event.preventDefault();
      void play(true);
    } else if ((state === 'heist' || state === 'ending') && go && !hold) {
      leave(SKIP_MS);
    } else if (state === 'ended' && hold) {
      if (event.key === 'r' || event.key === 'R') void play(true);
      else if (go) leave(SKIP_MS);
    }
  }

  // Frames stop while the tab is in the background; these keep the film moving if it plays on there.
  heist.addEventListener('timeupdate', step);
  ending.addEventListener('timeupdate', step);
  heist.addEventListener('ended', () => {
    if (state === 'heist') cutToEnding();
  });
  ending.addEventListener('ended', () => {
    if (state === 'ending') finish();
  });
  playButton.addEventListener('click', () => void play(true));
  root.addEventListener('click', (event) => {
    if (playButton.contains(event.target as Node)) return;
    if (state === 'waiting') void play(true);
    else if (state === 'ended' && hold) leave(SKIP_MS);
  });
  addEventListener('keydown', onKey);

  show('waiting');
  // Try to roll straight away; most browsers refuse sound without a click, and play() falls back to the poster.
  void play(false);

  return {
    press() {
      if (state === 'waiting') void play(true);
      else if (state === 'heist' || state === 'ending') leave(SKIP_MS);
    },
    skip: () => leave(SKIP_MS),
    setMuted(muted) {
      heist.muted = ending.muted = muted;
    },
  };
}
