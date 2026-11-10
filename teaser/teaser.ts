import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import { mountTeaser } from './film';

/* The teaser by itself, at /teaser/: it holds on the last frame, and leaving it goes to the game's menu (?menu, so
   the game doesn't play the film a second time). */
mountTeaser(document.getElementById('teaser')!, {
  hold: true,
  onDone: () => {
    location.href = '../?menu';
  },
});
