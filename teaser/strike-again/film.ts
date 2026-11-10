import '../news.css';
import { mountFilm, type Film, type Teaser, type TeaserOptions } from '../player';

/* "Strike Again": the raccoons watch the news call them badgers and fall about laughing, while Officer Bob sets a
   badger trap and they stroll past behind him. The broadcast they are watching is a card drawn in the page over
   the den clip, which keeps playing (and sounding) underneath it. */

/** Seconds into the den clip when the film cuts to what is on their television, and when it cuts back to them:
    the clip's own cut to the laughing shot. */
const BROADCAST_AT = 1.3;
const LAUGH_AT = 3.96;

export const STRIKE_AGAIN: Film = {
  name: 'strike-again',
  label: 'Strike Again',
  next: 'Back to the game',
  poster: new URL('./poster.jpg', import.meta.url).href,
  clips: [new URL('./den.mp4', import.meta.url).href, new URL('./trap.mp4', import.meta.url).href],
  segments: [
    { clip: 0, from: 0, to: Infinity, cues: [[BROADCAST_AT, 'card'], [LAUGH_AT, '-card']] },
    { clip: 1, from: 0, to: Infinity },
  ],
  overlay: `
    <div class="nz-card">
      <img class="nz-cctv" src="${new URL('./cctv.jpg', import.meta.url).href}" alt="Security footage: a raccoon in a mask running down the liquor aisle." />
      <div class="nz-suspect"><span>BADGER</span></div>
      <div class="nz-scan"></div>
      <span class="nz-cam">CAM 03 · 02:47 AM</span>
      <div class="nz-lower">
        <span class="nz-tag">Breaking news</span>
        <span class="nz-live">LIVE</span>
        <div class="nz-bar"><p class="nz-line">Badger Bandits strike again</p></div>
      </div>
      <div class="nz-ticker"><p>Animal control: do not approach the badgers · Badger traps set across Ashland · Store owner: “they only took the good stuff” · Experts baffled: “badgers don't usually climb”</p></div>
    </div>`,
};

/** Fills `root` (the page's #teaser element) with the film and tries to start it. */
export function mountStrikeAgain(root: HTMLElement, options: TeaserOptions): Teaser {
  return mountFilm(root, STRIKE_AGAIN, options);
}
