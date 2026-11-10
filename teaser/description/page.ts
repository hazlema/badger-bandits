import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import { mountDescription } from './film';

/* The film by itself, at /teaser/description/: it holds on the last frame, and leaving it goes to the game's menu. */
mountDescription(document.getElementById('teaser')!, {
  hold: true,
  onDone: () => {
    location.href = '../../?menu';
  },
});
