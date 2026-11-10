import '../news.css';
import { mountFilm, type Film, type Teaser, type TeaserOptions } from '../player';

/* "The Description": the morning after. A reporter asks Officer Bob what he saw; he remembers a masked, stripy
   thing in the red emergency lights, and writes BADGER on his report. It is the interview clip with the flashback
   cut into the middle of it, and a still of the clipboard cut in over the moment he writes. Behind him at the end,
   a raccoon looks out of the bin. */

/* Times in the interview clip, in seconds. */
/** Bob is looking up, finger on his chin, trying to remember: the flashback takes over. He stays like that, and
    quiet, until 5.5, so a background tab that only checks four times a second still cuts in time. */
const RECALL_AT = 5.3;
/** Where the interview picks up after the flashback: his eyes are shut, and three frames later they pop open.
    His "aha!" starts sounding at 5.83. */
const AHA_AT = 5.8;
/** The clipboard cuts in as the pencil comes down, over the rest of the close-up while he writes. */
const REPORT_AT = 7.0;
/** The clip's own cut back to the two of them. The film stops just short of it and stands on the clipboard in
    silence for a beat, so BADGER can be read. */
const TWO_SHOT_AT = 7.965;
const BEAT = 0.9;
/** The clip's first cut, from the two of them to Bob's face. The caption is only up over the two-shots: over a
    close-up it would sit across his chin. */
const CLOSE_UP_AT = 2.875;

export const DESCRIPTION: Film = {
  name: 'description',
  label: 'The Description',
  next: 'Back to the game',
  poster: new URL('./poster.jpg', import.meta.url).href,
  clips: [new URL('./interview.mp4', import.meta.url).href, new URL('./flashback.mp4', import.meta.url).href],
  segments: [
    { clip: 0, from: 0, to: RECALL_AT, cues: [[0.5, 'news'], [CLOSE_UP_AT, '-news']] },
    { clip: 1, from: 0, to: Infinity },
    // the caption changes its line while it is out of sight, and comes back with the verdict
    { clip: 0, from: AHA_AT, to: TWO_SHOT_AT - 0.06, cues: [[0, 'verdict'], [REPORT_AT - AHA_AT, 'insert']], rest: BEAT },
    { clip: 0, from: TWO_SHOT_AT, to: Infinity, cues: [[0, '-insert'], [0.2, 'news']] },
  ],
  overlay: `
    <div class="nz-lower">
      <span class="nz-tag">Breaking news</span>
      <span class="nz-live">LIVE</span>
      <div class="nz-bar">
        <p class="nz-line nz-line-a">Break-in at Ashland ABC store</p>
        <p class="nz-line nz-line-b">Animal control: “It was a badger”</p>
      </div>
    </div>
    <img class="nz-insert" src="${new URL('./clipboard.jpg', import.meta.url).href}" alt="Officer Bob's incident report. Suspect: BADGER. His sketch is plainly a raccoon." />`,
};

/** Fills `root` (the page's #teaser element) with the film and tries to start it. */
export function mountDescription(root: HTMLElement, options: TeaserOptions): Teaser {
  return mountFilm(root, DESCRIPTION, options);
}
