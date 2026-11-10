import { mountFilm, type Film, type Teaser, type TeaserOptions } from './player';

export type { Teaser, TeaserOptions };

/* The teaser film: the game plays it over its start screen, and teaser/index.html plays it by itself. It is two
   clips shown as one film (player.ts does the join), with the game's wordmark dropped over the last moments. */

/** The heist plays to here, then the ending takes over. Its own last cut is at about 12.55, and a background tab
    only checks four times a second, so this sits a full check early. The heist is silent from 11.75 until then,
    so the join can't be heard. */
const CUT_AT = 12.25;
/** Seconds into the ending when the wordmark comes up under the shelf: after the giggle and the sigh, on the low
    closing note. */
const TITLE_AT = 4.1;

export const TEASER: Film = {
  name: 'teaser',
  label: 'the teaser',
  next: 'Start the heist',
  poster: new URL('./poster.jpg', import.meta.url).href,
  clips: [new URL('./teaser.mp4', import.meta.url).href, new URL('./ending.mp4', import.meta.url).href],
  segments: [
    { clip: 0, from: 0, to: CUT_AT },
    { clip: 1, from: 0, to: Infinity, cues: [[TITLE_AT, 'titled']] },
  ],
  overlay: `
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
    </h1>`,
};

/** Fills `root` (the page's #teaser element) with the teaser and tries to start it. */
export function mountTeaser(root: HTMLElement, options: TeaserOptions): Teaser {
  return mountFilm(root, TEASER, options);
}
