import { mountFilm, type Film, type Teaser, type TeaserOptions } from './player';

/* The game's intro (host, 2026-11-10): the teaser and the two news films that explain the name (Bob calls it a
   badger, the news runs with it), edited by the host into one 40 s clip with its own transitions. No overlay: the
   title and the news captions are in the picture where they are wanted. */
const INTRO: Film = {
  name: 'intro',
  label: 'the intro',
  next: 'Start the heist',
  poster: new URL('./badger-poster.jpg', import.meta.url).href,
  clips: [new URL('./badger.mp4', import.meta.url).href],
  segments: [{ clip: 0, from: 0, to: Infinity }],
};

/** Fills `root` (the page's #teaser element) with the intro and tries to start it. */
export function mountIntro(root: HTMLElement, options: TeaserOptions): Teaser {
  return mountFilm(root, INTRO, options);
}
