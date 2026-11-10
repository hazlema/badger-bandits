# Teaser

A 17 second cinematic for the front of the game: a masked raccoon on a liquor store shelf, knocking bottles off and
enjoying it. It is a generated film, not game footage, so it doesn't use the game's art.

## Watching it

```
npm run dev       # then open http://localhost:5173
```

The game plays it over the start screen the first time it's opened, and after that from Watch Intro on the menu, with
the menu waiting underneath. Esc, Enter, Space, or A or
Start on a gamepad skip it, M mutes it along with the game, and the game's own music holds off until it is gone.
`?store`, `?night=` and `?training` don't play it, and `?menu` opens on the menu without it.

Most browsers won't play sound without a click or a key, so on a fresh visit it usually waits on the poster with a Play
button rather than starting by itself.

It also plays by itself at http://localhost:5173/teaser/, where it holds on the last frame: **Enter** goes to the
game's menu and **R** plays it again. That page is for looking at the film and isn't part of `npm run build`.

## Files

| | |
|---|---|
| `teaser.mp4` | the heist: 1080p, 14 s, with its own sound. Only the first 12.25 s are shown |
| `ending.mp4` | the last shot: 1080p, 5 s. The raccoon laughs, sighs and smiles |
| `poster.jpg` | the first frame, shown before it plays |
| `film.ts`, `teaser.css` | the film as something a page can mount: `mountTeaser(element, options)` |
| `index.html`, `teaser.ts` | the page that plays it by itself |

The film is two clips because the first take cut the raccoon off mid-laugh, and there is no ffmpeg here to join
them into one file. `film.ts` does the join instead: the ending sits loaded over the heist, unseen, and takes over at
`CUT_AT`, during a second of silence on the settled floor shot. The game's wordmark comes up under the shelf at
`TITLE_AT`, after the laugh and the sigh, on the low closing note. Both are at the top of `film.ts`.

The game mounts it from `src/main.ts` into the `#teaser` element in the root `index.html`.

## How it was made

Four generations on OpenArt, 840 credits in total.

**1. The opening frame**, Nano Banana Pro, text to image, 16:9 at 2K (40 credits):

> A still frame from a high-end 3D animated feature film, plush and adorable. A small, round, very fluffy baby raccoon
> sits on the top wooden shelf of a cozy small-town liquor store at night, in the right half of the frame, facing the
> camera. It wears a black felt domino bandit mask with neat stitched edges and a thin strap around its head. […] One
> small paw rests flat against the side of a tall amber glass bottle that stands right at the open left end of the
> shelf, teetering close to the edge, with empty air beside it. […] A single cool moonbeam falls diagonally through a
> hole in the ceiling […] No text, no letters, no logos, no watermark.

**2. The heist**, Kling 3.0, image to video from that frame, multi-shot, 14 s at "pro" (1080p) with sound (560 credits).
The overall direction:

> A cute, cozy, mischievous short from a high-end 3D animated feature film. A small fluffy raccoon in a black felt
> bandit mask gleefully knocks glass bottles off a shelf in a moonlit liquor store at night. […] Playful sneaky
> pizzicato heist music, crisp glass smashes, tiny raccoon chitters and giggles. No dialogue, no text, no captions.

and the six shots:

| # | Seconds | Shot |
|---|---|---|
| 1 | 2 | Innocent eye contact while one paw pushes the amber bottle off the end of the shelf, like a cat. |
| 2 | 3 | Floor level, slow motion: the bottle shatters on the checkered tile, glass and gold in the moonbeam. |
| 3 | 2 | Close-up: eyes go huge with delight, a tiny happy squeak. |
| 4 | 2 | It scampers along the shelf sweeping the whole row off with both arms. |
| 5 | 3 | Wide, slow motion: green, blue and red bottles rain down and burst one after another. |
| 6 | 2 | It peeks over the empty shelf, paws over its mouth, giggling. Not used: the ending replaces it. |

**3. The ending's first frame**, Nano Banana Pro, image to image with the opening frame as the reference (40 credits):
the same raccoon and store a few seconds later, the shelf bare, paws lifting to its mouth.

**4. The ending**, Kling 3.0, image to video from that frame, one shot, 5 s at "pro" with sound (200 credits):

> One continuous shot, no cuts, the camera almost still with a very slow gentle push-in. The fluffy masked raccoon
> sitting on the empty shelf bursts into a fit of tiny squeaky giggles behind its paws […] After about three seconds
> the giggle winds down completely, it lets out a small contented sigh, lowers its paws into its lap and gives the
> camera a warm, satisfied little smile, then sits still and quiet for the final second. […]

## Known flaws in this take

- **Shot 5 doesn't finish the job.** The first couple of bottles burst, but the shot settles on four whole bottles
  lying on the floor. A retake should say that every bottle shatters on impact and none survive.
- **The sound has gaps.** It is mostly effects rather than a music bed, and it drops to near silence for about a
  second after the first smash (around 4 to 5 s) and before the ending.
- **The files are 29 MB together**, and the build now ships them. That is heavy for something that plays before the
  menu. They want joining into one file and re-encoding before this goes anywhere public.

To redo the heist, change a shot's line and generate again with the same opening frame; a new take costs the same 560.
