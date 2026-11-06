# Badger Bandits: night 1

A raccoon heist, built from `design.md` (a copy of the idea-board export, 2026-11-06).
This is a vertical slice: night 1 only, from the roof tutorial to the report card.

```
npm run dev       # play at http://localhost:5173 (add ?store to skip the roof and crawlspace)
npm test          # Vitest: rules, Bob's beam, bottles and throws, and a full playthrough on real inputs
npm run build     # dist/
```

| | Keyboard | Gamepad |
|---|---|---|
| Move / climb | arrows or WASD (hold ↑ against a shelf to climb; tap ↓ to drop a shelf, hold to climb down) | stick or d-pad |
| Jump | Space or Z | A |
| Grab (take the highlighted bottle, drink, hand up, use) | E or X | X |
| Throw: hold +↑ (or nothing) to lob, +↓ drop, +forward roll | F or C | B |
| Switch the ready item | Q or V | LB / RB |
| Hoot across a carried bottle | R or B | Y |
| Climb out (at the hole) / play dead (in the plush) | ↑ / ↓ | Up / Down |
| Pause (Resume or Quit to title), mute all, music on/off | Esc, M, N | Start |

- `src/config.ts` holds every tuning number. `(design)` values come from the board and `(guess)` values are the builder's placeholders.
- `src/sim/` is a deterministic 60 Hz simulation with no DOM. `src/render/` is Canvas 2D and `src/audio.ts` is a Web Audio
  synth with no sound files. It plays one-shots for sim events, panned by where they happened. It also runs loops read
  from the game each frame (your footsteps, Bob's boots, the scrubber's motor, the aiming whistle, rolling bottles,
  running spills, dawn birds) and a walking-bass music loop. The music gets busier when Bob is in and when he chases
  you, and drifts out of tune with your Buzz.
- `window.__plc.game` exposes the live sim for poking at in the console.
- **The front door** is plain HTML in `index.html`, styled in `src/style.css`. It's the loading screen and then the
  start screen: the Badger Bandits wordmark (an SVG in `index.html`) above the host's raccoon render, then a flashing "Press Space to begin" (A on
  a pad). It shows before the game script arrives, stays up for at least 1.5 s, and ignores keys until it's ready.
  Quit to title brings it back. The canvas title screen and its controls list are gone, because the roof level's
  signposts teach the controls.
- `art/bandit-raccoon-raw.png` is the host's render. `bandit-raccoon.webp` is what the page loads: a full-size copy
  with the almost-solid pixels (alpha 248 and up) made fully solid. The older OpenArt attempts are in `art/` too, along
  with `keyout.py`, which removes a painted-in checkerboard background.

## What the builder decided (not on the board)

Agreed with the host before this pass:

- **Bottle damage and enemy health** (open on the board): no health bars. A bottle knocks an enemy off its feet,
  the scrubber for 4 s and Bob for 1.5 s. Knocked down mid-chase, Bob gets up still chasing. A bottle that lands
  on you is an ordinary 5% hit. Hitting a display (the plush, the mini-bottle rack) makes the biggest noise ring.
- **Hiccup lob** fires on every third hiccup, not every one, so hauling a load at high Buzz is still possible
  (`BUZZ.hiccupLobEvery`; set it to 1 for the board's version).
- **Special bottles on night 1:** the rum captain (sea legs) and blue curaçao (paw prints), 4 of each. Ship in a
  bottle needs the rainy night's thunder, gold flakes need coins, and spin the bottle and the ceiling fan wait for later nights.

- **Falling from the high shelves** (host, after the throwing playtest): you're knocked out for 3 s and lose 5%
  health. A fall of 250 px or more counts, so walking or getting knocked off the 230 board or higher onto the floor;
  dropping one shelf or climbing down is fine. It's drawn as a cartoon daze (sprawled, stars circling, swirly eyes),
  not passed out, because the board rules out passing out. Bob can still nab you while you're dazed.
- **The cousin minds the merchandise** (host): every 4th bottle you smash without handing anything up, the cousin
  hisses "Pssst! Don't smash ALL the merchandise!" (or one of two others). A hand-up starts the count over. That
  line replaces the usual "Smash it!" cheer on that crash. The count is `NAG_EVERY`.

- **Letter grades** (host): F, D, C, B and A on the board's cut points (half the target score, the target, 1.5x, 2x),
  in place of Clean getaway through Poor life choices. A and B are green, C and D yellow, F red. The card shows the
  letter in a badge next to how much of the store you got away with ("29% of the store"). That's the base value of
  what you handed up, plus your paws if you escaped, over what the shelves and the mini rack held at opening (356 on
  night 1). Buzz doesn't inflate it. The word "par" no longer appears on screen.
- **Every popup is wood paneling** (host). The report card, the shelter slip and the pause menu all draw through
  `popup()` in `src/render/paint.ts`, and their text and line colours come from `POPUP` next to it, so restyling
  popups is one change. The shelter slip keeps its form-style header and the red CAUGHT stamp. The HUD panels and
  speech bubbles aren't popups and keep their charcoal style.

Smaller calls:

- **Out of Bob's sight:** his flashlight is a cone that sweeps up and down. Shelf units' end panels and the counter
  block it. A shelf hides you from a distance; up close, you hide by climbing above where his beam can tilt.
- **Bottles in the air pass through shelf boards.** Knocked bottles fall to the floor, so drinking means coming down
  to where the scrubber is, and a lob lands on the floor (or whoever is standing there), not on a shelf.
- A bottle that hits someone damages them and makes no noise ring. Only a bottle that hits nothing rings.
- **Throw with no direction lobs**, same as Throw + Up. Holding Throw makes the arc grow and shrink between short and
  long, and you let go when it's where you want it. The arc sways with Buzz. You have to be standing on something to throw.
- **Roll:** on a shelf it knocks off the first bottle it meets, then cracks there. On the floor it bowls over the
  scrubber and Bob and keeps going, slower. It cracks with a noise ring when it stops or hits the counter or an end
  wall, and rolling off the end of a shelf makes it fall.
- **Running spills:** a full bottle (not a mini) that smashes on the floor runs 140 to 360 px toward the front and
  stops at the counter. The scrubber chases the spill its crash made.
- **Hoot** works with any carried bottle, rings 700 px around you, and has no cooldown beyond the 0.8 s it takes.
- **Sea legs** last 30 s. They cancel the sway, the control loss, jump overshoot, climb slips and arc sway; you're
  still slower. **Blue paws** last 12 s after you step out of the spill. On patrol, the scrubber follows floor
  prints; a crash still comes first.
- The random stumbles are gone; the board no longer lists them.
- "High up, a climb can slip" is read as Buzz step 4+.
- Mini-bottle rack: 8 bottles, 10% golden, can be spun until empty. The tote is free and can be taken once.
- Holding ↓ climbs down a shelf (the board only gives ↓ to play dead).
- The scrubber only bumps you while it's rushing to a crash, as written. On patrol it rolls past.
- With one night built, the report card's only button is Title (no Next night yet), and the title has no Quit,
  since it's a browser tab. The coins counter is there but stays at 0: nothing on night 1 gives coins.
