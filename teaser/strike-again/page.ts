import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import { mountStrikeAgain } from './film';

/* The film by itself, at /teaser/strike-again/: it holds on the last frame, and leaving it goes to the game's menu. */
mountStrikeAgain(document.getElementById('teaser')!, {
  hold: true,
  onDone: () => {
    location.href = '../../?menu';
  },
});
