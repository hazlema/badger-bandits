import './teaser.css';

/* Plays a film in a page's #teaser element. A film is a few clips cut together here, because there is no ffmpeg on
   this machine to join them into one file, with markup laid over the picture (a wordmark, a news caption) that the
   film switches on and off as it goes. */

/** One stretch of one clip. The film is its segments, played in order. */
export interface Segment {
  /** Which of the film's clips. */
  clip: number;
  /** Seconds into that clip to play from and to. `to` may be Infinity: to the end of the clip. */
  from: number;
  to: number;
  /** Classes for the overlay to style against, as [seconds into this segment, name]. A name starting with "-"
      takes that class off again. They build up over the film and clear when it is played again. */
  cues?: [number, string][];
  /** Seconds to stand still on this segment's last frame, in silence, before the next one: a beat. */
  rest?: number;
}

export interface Film {
  /** Goes on #teaser as `film-<name>`, for the film's own styles. */
  name: string;
  /** What the Play button and the last-frame hint call it. */
  label: string;
  poster: string;
  clips: string[];
  segments: Segment[];
  /** Markup laid over the clips, inside the frame. */
  overlay?: string;
  /** What Enter does on the held last frame, for its hint. */
  next?: string;
}

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

/** The last clip's sound fades over its final moments, so a laugh is never clipped by the clip running out. */
const FADE_OUT = 0.5;
/** When the film isn't held on its last frame, it rests there this long before handing over. */
const REST_MS = 1400;
/** How long the hand-over fade takes, after the film and after a skip. Matches the transitions in teaser.css. */
const LEAVE_MS = 600;
const SKIP_MS = 250;

/** starting: trying to roll, nothing shown yet (so a film that follows another doesn't flash its Play button).
    waiting: poster up. playing. ended: on the last frame. leaving: fading out. */
type State = 'starting' | 'waiting' | 'playing' | 'ended' | 'leaving';

/** Fills `root` (the page's #teaser element) with the film and tries to start it. */
export function mountFilm(root: HTMLElement, film: Film, options: TeaserOptions): Teaser {
  const hold = options.hold ?? false;
  const segments = film.segments;
  root.innerHTML = `
    <div class="tz-stage">
      ${film.clips.map(() => '<video class="tz-clip" preload="auto" playsinline></video>').join('')}
      ${film.overlay ?? ''}
      <button type="button" class="tz-play" aria-label="Play ${film.label}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
        Play
      </button>
      <p class="tz-hint tz-skip"><kbd>Esc</kbd> Skip</p>
      <p class="tz-hint tz-after"><kbd>Enter</kbd> ${film.next ?? 'Continue'}<span>·</span><kbd>R</kbd> Watch again</p>
    </div>`;
  const clips = [...root.querySelectorAll<HTMLVideoElement>('.tz-clip')];
  const playButton = root.querySelector('.tz-play') as HTMLButtonElement;
  clips.forEach((clip, n) => {
    clip.src = film.clips[n];
    clip.muted = options.muted ?? false;
  });
  clips[segments[0].clip].poster = film.poster;

  let state: State = 'starting';
  /** The segment on screen. It outlives the state, so a fade-out keeps showing what it started on. */
  let index = 0;
  /** How many of that segment's cues have gone by. */
  let fired = 0;
  const marks = new Set<string>();
  /** Standing on a segment's last frame for its `rest`. */
  let resting = false;
  let beatTimer = 0;
  let restTimer = 0;

  function paint(): void {
    root.className = [`film-${film.name}`, state, `seg-${index}`, ...marks, hold ? 'hold' : ''].filter(Boolean).join(' ');
  }
  /** Only one clip is ever seen. The rest sit loaded underneath on the frame they will start from, so a cut to
      them is instant. */
  function showClip(n: number): void {
    clips.forEach((clip, i) => clip.classList.toggle('on', i === n));
  }
  /** Parks a clip, now out of sight, where its next segment after `after` starts. */
  function park(n: number, after: number): void {
    const next = segments.find((segment, i) => i > after && segment.clip === n);
    if (next) clips[n].currentTime = next.from;
  }
  function mark(name: string): void {
    if (name.startsWith('-')) marks.delete(name.slice(1));
    else marks.add(name);
  }

  /** From the top. `asked` is a real request from the player: if the browser still refuses, give up and hand over
      rather than leave them stuck on a Play button that doesn't work. */
  async function play(asked: boolean): Promise<void> {
    clearTimeout(restTimer);
    clearTimeout(beatTimer);
    resting = false;
    const first = clips[segments[0].clip];
    for (const clip of clips) clip.pause();
    first.currentTime = segments[0].from;
    try {
      await first.play();
      if (state === 'leaving') return void first.pause(); // skipped while the browser was still deciding
      state = 'playing';
      index = 0;
      fired = 0;
      marks.clear();
      showClip(segments[0].clip);
      paint();
      // Rewound only now they are out of sight, so a replay doesn't flash another clip's first frame.
      clips.forEach((clip, n) => {
        clip.volume = 1;
        if (clip !== first) park(n, -1);
      });
      requestAnimationFrame(tick);
    } catch {
      // The browser wants a click or a key before it will play sound: leave the poster and the Play button up.
      if (asked) leave(SKIP_MS);
      else if (state !== 'leaving') {
        state = 'waiting';
        showClip(segments[0].clip);
        paint();
      }
    }
  }

  /** A segment has run out: take its beat if it has one, then go on. */
  function end(): void {
    const segment = segments[index];
    const next = segments[index + 1];
    if (!segment.rest) return advance();
    const clip = clips[segment.clip];
    resting = true;
    clip.pause();
    // If the same clip carries on, line it up now, while whatever covers the beat is still up.
    if (next && next.clip === segment.clip && !near(clip, next.from)) clip.currentTime = next.from;
    beatTimer = window.setTimeout(advance, segment.rest * 1000);
  }

  /** On to the next segment, or the end. */
  function advance(): void {
    resting = false;
    const next = segments[index + 1];
    if (!next) return finish();
    const was = segments[index].clip;
    index++;
    fired = 0;
    if (next.clip !== was) {
      clips[was].pause();
      showClip(next.clip);
      park(was, index);
    } else if (!near(clips[was], next.from)) {
      clips[was].currentTime = next.from; // a jump within one clip
    }
    paint();
    clips[next.clip].play().catch(finish);
  }
  /** Whether a clip that ran up to a cut is already where the next segment starts, give or take the frames it
      takes to notice the cut. */
  function near(clip: HTMLVideoElement, from: number): boolean {
    return clip.currentTime >= from && clip.currentTime - from < 0.3;
  }

  /** The last frame: stay there if held, otherwise rest a moment and hand over. */
  function finish(): void {
    state = 'ended';
    // Anything the film was still due to switch on is on by its last frame, however it got here.
    for (const [, name] of (segments[index].cues ?? []).slice(fired)) mark(name);
    paint();
    if (!hold) restTimer = window.setTimeout(() => leave(LEAVE_MS), REST_MS);
  }

  /** Moves the film along: this segment's cues, the closing fade, then the cut to the next segment. */
  function step(): void {
    if (state !== 'playing' || resting) return;
    const segment = segments[index];
    const clip = clips[segment.clip];
    const cues = segment.cues ?? [];
    let changed = false;
    while (fired < cues.length && clip.currentTime - segment.from >= cues[fired][0]) {
      mark(cues[fired++][1]);
      changed = true;
    }
    if (changed) paint();
    if (index === segments.length - 1) {
      const left = Math.min(segment.to, clip.duration || Infinity) - clip.currentTime;
      if (left < FADE_OUT) clip.volume = Math.max(0, left / FADE_OUT);
    }
    if (clip.currentTime >= segment.to) end();
  }
  /** Every frame rather than on timeupdate, which only fires a few times a second and would smear the cuts. */
  function tick(): void {
    step();
    if (state === 'playing') requestAnimationFrame(tick);
  }

  /** Fades out, then hands over. Everything that ends the film comes through here, once. */
  function leave(ms: number): void {
    if (state === 'leaving') return;
    clearTimeout(restTimer);
    clearTimeout(beatTimer);
    state = 'leaving';
    paint();
    root.style.transitionDuration = `${ms}ms`;
    for (const clip of clips) clip.pause();
    removeEventListener('keydown', onKey);
    window.setTimeout(options.onDone, ms);
  }

  function onKey(event: KeyboardEvent): void {
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    const go = event.key === 'Enter' || event.key === ' ';
    if (event.key === 'Escape') {
      leave(SKIP_MS);
    } else if ((state === 'waiting' || state === 'starting') && go) {
      event.preventDefault();
      void play(true);
    } else if (state === 'playing' && go && !hold) {
      leave(SKIP_MS);
    } else if (state === 'ended' && hold) {
      if (event.key === 'r' || event.key === 'R') void play(true);
      else if (go) leave(SKIP_MS);
    }
  }

  clips.forEach((clip, n) => {
    // Frames stop while the tab is in the background; this keeps the film moving if it plays on there.
    clip.addEventListener('timeupdate', step);
    clip.addEventListener('ended', () => {
      if (state === 'playing' && !resting && segments[index].clip === n) end();
    });
  });
  playButton.addEventListener('click', () => void play(true));
  root.addEventListener('click', (event) => {
    if (playButton.contains(event.target as Node)) return;
    if (state === 'waiting' || state === 'starting') void play(true);
    else if (state === 'ended' && hold) leave(SKIP_MS);
  });
  addEventListener('keydown', onKey);

  showClip(segments[0].clip);
  paint();
  // Try to roll straight away; most browsers refuse sound without a click, and play() falls back to the poster.
  void play(false);

  return {
    press() {
      if (state === 'waiting' || state === 'starting') void play(true);
      else if (state === 'playing') leave(SKIP_MS);
    },
    skip: () => leave(SKIP_MS),
    setMuted(muted) {
      for (const clip of clips) clip.muted = muted;
    },
  };
}
