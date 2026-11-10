# Teaser and films

Three short cinematics. They are generated films, not game footage, so they don't use the game's art.

| | | |
|---|---|---|
| **The teaser** | 17 s | A masked raccoon on a liquor store shelf, knocking bottles off and enjoying it. Plays at the front of the game. |
| **The Description** | 16 s | The morning after. A reporter asks Officer Bob what he saw; he remembers a masked, stripy thing in the red emergency lights and writes BADGER on his report. |
| **Strike Again** | 13 s | The raccoons watch the news call them badgers and fall about laughing, while Bob sets a badger trap and they stroll past behind him. |

The two news films explain the game's name: Bob gets the animal wrong, the news runs with it, and nobody is looking
for raccoons. The game doesn't play these pieces any more. The host edited the teaser and both news films into one 40 s clip with
transitions and a scene moved for the story, `badger.mp4` (13.5 MB, poster `badger-poster.jpg`), and that is the
game's intro (2026-11-10, `intro.ts`). It has no title or caption overlay. The pieces below are its source, and still
play by themselves:

```
npm run dev
# http://localhost:5173/teaser/description/
# http://localhost:5173/teaser/strike-again/
```

## Watching the teaser

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
| `player.ts`, `teaser.css` | the film player, shared by all three: `mountFilm(element, film, options)` |
| `news.css` | the TV news dressing the two news films share: the caption and the broadcast card |
| `teaser.mp4` | the heist: 1080p, 14 s, with its own sound. Only the first 12.25 s are shown |
| `ending.mp4` | the last shot: 1080p, 5 s. The raccoon laughs, sighs and smiles |
| `poster.jpg` | the first frame, shown before it plays |
| `film.ts` | the teaser as something a page can mount: `mountTeaser(element, options)` |
| `index.html`, `teaser.ts` | the page that plays it by itself |
| `description/` | The Description: `interview.mp4` (10 s), `flashback.mp4` (5 s), `clipboard.jpg`, `poster.jpg`, `film.ts` (`mountDescription`) and its page |
| `strike-again/` | Strike Again: `den.mp4` (8 s), `trap.mp4` (5 s), `cctv.jpg`, `poster.jpg`, `film.ts` (`mountStrikeAgain`) and its page |

The game mounts the teaser from `src/main.ts` into the `#teaser` element in the root `index.html`. The news films
mount the same way, with the same options, when they are wired in.

## How a film is put together

Each film is a few clips cut together in the page by `player.ts`, not one file. A film is a list of **segments**
(this clip, from here to there), and only one clip is ever seen: the others sit loaded underneath on the frame they
will start from, so a cut to them is instant. A segment can carry **cues**, which put a class on `#teaser` at a
given second for the film's CSS to style against, and a **rest**, which stands on its last frame in silence for a
beat.

- **The teaser** is two clips because the first take cut the raccoon off mid-laugh. The ending takes over at
  `CUT_AT`, during a second of silence on the settled floor shot, and a cue brings the game's wordmark up under the
  shelf at `TITLE_AT`, after the laugh and the sigh. Both are at the top of `film.ts`.
- **The Description** is the interview with the flashback cut into the middle: out at `RECALL_AT` while Bob is
  looking up, back at `AHA_AT` as his eyes pop open. The clipboard is a still (`clipboard.jpg`) that a cue lays over
  the picture while he writes, and the film rests on it for most of a second so BADGER can be read.
- **Strike Again** shows what is on the raccoons' television as a card drawn in the page over the den clip, which
  keeps playing and sounding underneath.

Generated video garbles lettering, so every word a viewer has to read is real text or a still: the caption, the
headline, the ticker and the BADGER label are HTML in `news.css`, and the clipboard and the trap's sign were
generated as stills first.

GStreamer is on this machine (`gst-launch-1.0`, with x264 and AAC), so the clips of each film could be joined and
re-encoded into one smaller file. That hasn't been done.

## How the teaser was made

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

## How the news films were made

Ten generations on OpenArt, 1,360 credits in total: six stills on Nano Banana Pro at 40 each, and four clips on
Kling 3.0 at "pro" with sound, 40 a second. The stills that needed the raccoon used the teaser's opening frame as
their reference, and the trap still used the interview and den stills for Bob and the cousin.

**The Description**

| | | Credits |
|---|---|---|
| Still | Dawn outside the store: a reporter holds a microphone up to Officer Bob, who has his clipboard and catch pole. | 40 |
| Still | The same store with the power out, in red emergency light: a small masked shape with a ringed tail mid-dash down the aisle. | 40 |
| Still | Close on the clipboard: "ANIMAL CONTROL INCIDENT REPORT", "SUSPECT: BADGER", and a sketch that is plainly a raccoon. | 40 |
| Clip, 10 s | From the first still, four shots: the question (3 s), Bob thinking (2 s), "aha" and writing (3 s), and Bob pleased with himself while a raccoon looks out of the bin behind him (2 s). | 400 |
| Clip, 5 s | From the second still, one shot: it tears down the aisle at the camera, bottles smashing behind it, and leaps over the lens. | 200 |

**Strike Again**

| | | Credits |
|---|---|---|
| Still | The den in a hollow tree: the masked raccoon and its bigger cousin on a patched sofa among the loot, lit by a television out of frame. | 40 |
| Still | Bob beside his cage trap and a hand-painted "BADGER TRAP" sign, the two raccoons tiptoeing past behind him. | 40 |
| Still | The same again, to put the felt mask back on the smaller raccoon, which the first try left off. | 40 |
| Clip, 8 s | From the den still, two shots: staring at the television (4 s), then looking at each other and laughing until it winds down (4 s). | 320 |
| Clip, 5 s | From the trap still, one locked-off shot: Bob pats his trap while the raccoons creep out of frame. | 200 |

The prompts all ask for "a high-end 3D animated feature film, plush and toy-like", no dialogue and no text, and
wordless mumbles in place of speech.

## Known flaws

The teaser:

- **Shot 5 doesn't finish the job.** The first couple of bottles burst, but the shot settles on four whole bottles
  lying on the floor. A retake should say that every bottle shatters on impact and none survive.
- **The sound has gaps.** It is mostly effects rather than a music bed, and it drops to near silence for about a
  second after the first smash (around 4 to 5 s) and before the ending.
- **The files are 29 MB together**, and the build ships them. That is heavy for something that plays before the
  menu. They want joining into one file and re-encoding before this goes anywhere public.

The news films:

- **A neon sign behind Bob has made-up letters on it** in the interview's close-ups and its last shot. It is out of
  focus and off to the side, but it is there.
- **The interview's sound comes and goes.** It is mumbles and effects with quiet between them, not a music bed, and
  the beat on the clipboard is silent on purpose.
- **In the den's first shot the raccoons look delighted, not stunned.** The prompt asked for mouths hanging open.
- **The raccoon isn't quite the same animal from film to film.** It is rounder and more of a baby in the teaser.
- **Bob's trousers are navy.** In the game they are olive.
- **Each film is about 22 MB.** Only `badger.mp4` is in the build.

To redo a clip, change its prompt and generate again from the same still; a new take costs the same as the first.
