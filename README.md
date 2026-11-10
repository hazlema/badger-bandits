# Badger Bandits

A raccoon heist. You and your cousin are robbing the Ashland ABC store: you go in through the ceiling, pass
the good bottles up to your cousin, and climb out before dawn or before Officer Bob from animal control nabs you.

All 5 nights are built. Caught or not, the report card moves you on to the next night, and the
run ends on a total of all your nights.

## Running it

You need Node 20.19 or newer (22+ is fine).

```
npm install
npm run dev       # then open http://localhost:5173
```

The first time the game is opened it plays a 17 second teaser film (see `teaser/`); after that it only plays from
**Watch Intro** on the menu. Esc, Enter or Space skips it. If the browser won't play sound without a click, it waits on
a poster with a Play button. Clearing the site's storage (`plc.introSeen`) makes it play on start again.

Add `?store` to the URL (http://localhost:5173/?store) to skip the menu and start the night, `?night=2` to `?night=5` to start
on a later night, or `?training` to skip to the tutorial's practice store. None of those play the teaser, and `?menu` opens
on the menu without it.
`npm run dev` also prints a network address, so you can play from another machine on the same Wi-Fi.

## How to play

### The job

Get in, grab bottles, and **hand them up to your cousin at the ceiling hole**. Handing up is the only way loot
is safe. Then **climb out through the hole** before the night ends. The clock in the top right counts down to
dawn (about 5 minutes on night 1, 6 on night 2). Get caught, or still be inside at dawn, and you lose everything you hadn't handed up.

### Start Game or Tutorial

The menu offers both. **Start Game** drops you straight into the store. **Tutorial** runs:

1. **Roof:** run, jump the AC unit, climb the ivy trellis (hold ↑), and press **E** at the vent to pry it up.
2. **Crawlspace:** press **E** at the wires to chew through them. That kills the store's power.
3. **Practice store:** walk on and you drop through a ceiling tile into a practice copy of the store, with no Bob,
   no scrubber, no clock, and shelves that restock. A sign up top walks through 13 lessons in `src/sim/training.ts`:
   turning in specials and plain bottles, smashing and drinking, Buzz multiplying your bonus (a live sum runs along
   the bottom), the rum and curaçao buffs, playing dead, lob, drop, roll, switching, hooting and the tote bag.
   Chalkboards on the wall explain the why. Finish them all and press ↑ at the hole to return to the menu.

### Controls

| | Keyboard | Gamepad |
|---|---|---|
| Move | ← → or A D | stick or d-pad |
| Jump (up to the next shelf board) | Space or Z | A |
| Hop down through the board you're on | ↓ or S | Down |
| Grab: take the highlighted bottle, drink a spill, hand up at the hole, use things | E or X | X |
| Scoop: hold Grab on the run and bottles you hit go in the bag (a full bag smashes them as usual) | hold E or X | hold X |
| Throw (see below) | F or C | B |
| Switch which carried bottle you'll throw | Q or V | LB / RB |
| Hoot across a carried bottle | R or B | Y |
| Climb out (at the hole) | ↑ or W | Up |
| Play dead (on the plush display) | ↓ or S | Down |
| Pause, mute everything, music on/off | Esc, M, N | Start |
| Show your powerups (pauses the game) | P | Select |

**Throwing:** press and hold **F**, then pick. Let go with nothing else and it's a **lob**: while you hold, a
dotted arc swings between short and long, so let go when it's where you want it. Still holding F, press **↓** to
**drop** the bottle straight down off the shelf you're on, which is great when someone is underneath, or **← / →**
to **roll** it that way along the shelf or floor like a bowling ball. An arrow you were already holding when you
pressed F doesn't count, so you can throw on the run. On a gamepad it's the same with B and the stick. If a shelf bottle is
highlighted in front of you, Throw uses that one; otherwise it throws the bottle with the gold ring in your HUD
slots (Q picks which).

### Scoring

- **Specials:** the **rum captain** (there are 10) and the glowing **blue curaçao** (10) smoke on the shelf. Turn them
  all in and the night is 100%. Smash or throw one and it's gone, so 100% is gone too.
- **Other bottles:** each one you turn in is 1 bonus point.
- **Buzz:** smash a bottle on the floor and you can lap up the spill (E). Each sip is a Buzz step, up to 5, and
  your Buzz **at the end of the night multiplies your bonus points** (x1.5, x2 … up to x3.5). The catch: you get slower and wobblier, your
  aim sways, and from step 3 you get hiccups. Every third hiccup pops a bottle out of your paws. Getting hit
  costs a Buzz step and makes you drop a bottle.
- **Your night score** is the percentage of specials you turned in, plus bonus points × Buzz. Climbing out turns in
  whatever's in your paws. If you're caught, what's in your paws is lost. The letter comes from the specials
  percentage alone: **A** from 90%, B 80%, C 70%, D 60%, F below.

### Who's after you

- **The floor scrubber** patrols the floor. It races to any crash and slurps up spills before you can drink them.
  **Don't touch it:** bump into it and it sets off a siren that calls Bob over, and brings him in early if he
  isn't there yet. **Don't let it see you either:** its camera throws a blue cone along the floor ahead, and every
  so often it stops and slowly cranks its eye up a telescoping pole (you'll hear the servo whine) to scan each board
  as it rises past, then holds at the top boards. Its camera can't see through a shelf board or an end panel, and
  playing dead in the plush hides you. Knock it over with a bottle and it's out for 4 seconds; the camera head up
  on its pole is a target too, so drop one on it from the board above.
- **Officer Bob** comes in the front door about a third of the way through the night and searches with his
  flashlight. If the beam lands on you, he shouts and chases. If his catch pole reaches you, you're caught.
  - **Hide:** shelf ends and the counter block his beam. Up close, get up high, above where he can point it. Or
    dive onto the plush display and press **↓** to play dead (only works if he didn't see you dive).
  - **He throws back:** if you're up a shelf where his pole can't reach, he grabs a bottle and lobs it at you.
    Watch for the raised bottle and move.
  - **Fight back:** a bottle on his head knocks him down for a moment. Throw one, drop one on him, or just run
    along a shelf above him and knock one off onto him.
- **Your health** is the green bar. A hit costs 5%. A fall from the high shelves to the floor knocks you out for
  a few seconds and costs 5%. At 0 you're too sore to run and Bob scoops you up.

### Things to try

- **Hoot (R)** across a carried bottle: a foghorn noise that pulls Bob and the scrubber to you. Use it as a lure
  while you're somewhere safe.
- **Rum captain spill:** drink it for 30 s of sea legs, no wobble.
- **Blue curaçao spill:** step in it and you leave glowing paw prints that the scrubber follows.
- **The counter:** spin the mini-bottle rack for minis (sometimes a golden one), and take the tote bag to carry 8
  instead of 5.
- The cousin will tell you off if you smash too much without handing anything up.

### Night 3

A Renaissance faire in the woods out back. Separate bottle trees instead of shelves, so you hop branch to branch or
cross open grass. Your cousin waits in the hollow at the top of the third tree.

- **Archers** replace the floor security. Seven of them stay behind hay, barrels, targets and a cart, and can't be hit
  while hidden. When you're in range and in the open, one stands up, follows you with its bow, locks for a moment
  (the dotted line goes solid), and shoots. An arrow is 5% and a dropped bottle like any hit. Playing dead stops them
  aiming at you. Trunks and branches stop arrows. A bottle that hits a standing archer knocks them out for 4 s.
- **Arrows set things off:** one through a string drops that bottle, one that hits a standing archer knocks them over,
  and one that hits Bob flattens him.
- **Hay bales:** a bottle that lands on one doesn't break, and you can pick it up from the grass beside the bale. Stand
  in the middle of a bale and arrows can't reach you.
- **Pot lid:** on the rack near the mead stall. Blocks one arrow, then needs 20 s.
- **Sir Bob** is in period garb and talks the part. He kept the flashlight. Numbers are in `ARCHER` and `SHIELD` in
  `src/config.ts`.

### Night 4

The circus, inside the big top. Bleachers rise toward the tent wall at both ends, and two striped king poles stand
between them with a tightrope across their tops. Your cousin is up through a rip in the canvas above the first pole.

- **Clowns** ride unicycles along the floor. One that sees you (or that you bump into) honks: a noise as big as the
  siren, Bob called in early if he's not here yet, and every animal riled for 8 s, shooting twice as often. A bottle
  knocks a clown off for 4 s.
- **The animals:** an **eagle** on the rigging dives in a straight line at where you were when it locked on (the dotted
  line goes solid), flattening Bob, clowns and bottles on any bleacher row it passes through. An **owl** on its perch
  lobs pellets that hurt but leave no puddle; the owls watch the stands. A **snake** rears out of its basket and spits
  along the floor only, leaving a green slick that makes you slide. Stunned animals can be hit with bottles; a snake only
  while it's out.
- **The cannon** in the ring: press E at it and it fires you across the tent onto the far bleachers. You can't steer,
  and you knock bottles off whatever you fly past (hold E to scoop them). The bang is the second-biggest noise there is.
- **The tightrope:** at Buzz 2 and up you can wobble off it, and it's a long way down.
- **Cotton candy** on the stand by the concessions: sticky paws for the rest of the run. Hiccups and hits never make you
  drop a bottle.
- **Ringmaster Bob:** top hat, red tailcoat. "Ladies and gentlemen… a RACCOON!" Numbers are in `CLOWN`, `CRITTER`,
  `CANNON`, `ROPE` and `SLICK` in `src/config.ts`.

### Night 5

The duty-free on the Moon. No shelves: bottles hover over floating rocks and girders under a glass dome, and your
cousin waits at the airlock in the dome's rim at the far back.

- **Low gravity:** you jump about 60% higher and hang in the air twice as long, and no fall knocks you out.
- **Floating bottles:** a bottle you bump doesn't fall, it drifts off in a straight line until it hits a rock, the
  dome or someone (Bob included). It never hurts you, and you can snatch it out of the air with Grab. A broken bottle
  becomes a floating blob you can slurp midair with your straw.
- **Security satellites** drift along under the dome, swinging a searchlight below them. One that sees you sets off
  the alarm (calls Bob early, or pulls him over). Rocks block the light, so get under one. A bottle knocks a
  satellite out for 5 s.
- **Commander Bob** has a jetpack. He hovers while he searches, and in a chase he flies up toward you, slowly, so
  a high rock only buys you a moment. Knock him down and he drops to the deck.
- **The drone** is docked on its pad a hop from the airlock, since it's the last night (host). Once you have it, it
  rides behind you, and the moment your paws are full it flies the whole load to your cousin by itself and comes back.
  A load still in the air when the night ends counts if you climb out, and is lost if you're caught. Numbers are in
  `SPACE`, `SAT` and `DRONE` in `src/config.ts`.

### Powerups

Each night has one powerup, on the rack by the counter (night 5's is on a pad by the airlock), and you keep what you pick up for the rest of the run, whether you
climb out or get caught. Press **P** (Select on a pad) to see them all. Starting a new run clears them.

### Night 2

The hole is in the middle of a bigger store, with shelves both ways and a long checkout lane at the front.

- **Sneakers** hang on the rack where night 1 had the tote. They only work while someone is onto you: Bob shouting or
  chasing, the siren going, or the tank aiming at you. You run and climb 20% of your sober speed faster, so they help
  most when you're drunk. Red sneakers show on your feet while they work, and fade with the boost over 2.5 s once
  you're safe. Numbers are in `SNEAKERS` in `src/config.ts`.
- **The tank** replaces the scrubber: the store panicked after night 1. It patrols, follows paw prints, races to
  crashes and flattens spills like the scrubber did, and its periscope spots you the same way. When it does, the siren
  goes off and it stops to shoot. The turret follows you for most of a second behind a dotted red line. The line goes
  solid when the barrel locks, so move then. Shells fly straight and stop at the first thing they meet, shelf posts
  and boards included. A blast costs 5% and a dropped bottle like any hit, and destroys every bottle around it, specials
  too. It also flattens Bob, takes out the possum and its stack, and makes the biggest noise short of the hoot and
  siren. Playing dead dodges it. A bottle on the tank stops it for 4 s. It reloads for 5 s. Numbers are in `TANK` in
  `src/config.ts`.
- **The colour:** each night can have its own wash and lamp colour in `NIGHTS`. Night 2 is cold blue; bottles and
  characters are drawn over the wash so they stand out.
- **The possum** sits on the case stack at the back and lobs cans (5% and a dropped bottle) when you get near. Watch
  for the raised can and move. It can't be chased off, but a bottle soaks it, and for 9 seconds its throws go wide
  in big loops. A can that lands on Bob or the tank knocks them over.
- **Champagne** (dark green, gold foil) is a bonus bottle you can also ride. Run with it and it fizzes up; **tap E**
  with nothing in front of you to pop the cork and rocket forward, further the more it's shaken. It costs the
  bottle, makes a bang and leaves a puddle. Holding E to scoop never pops it.
- **The checkout belt:** stand on the counter and press E to put your ready bottle on the belt. It creeps along
  and smashes off the end, loud enough to bring anyone nearby to the till while you work elsewhere.
- **The till:** slap it 6 times with E until the drawer springs. The 12 coins take no carry slot and count as
  bonus points if you climb out; get caught and they're gone. Each slap makes noise, and the drawer makes more.

### Testing notes

**The night log:** on the report card, press **L** (Select on a gamepad) to flip it over. It lists everything that
scored or cost you, with times: each hand-up, smashed specials, drinks, hits and what caused them, falls,
sirens, Bob's arrival, what being caught cost you, and the final sum. The same log is printed to the browser
console (F12), so you can copy it and send it over.

The shelves are the same every run, so you can learn the store. When something feels off, note what you were doing,
roughly when in the night, and what you expected. Most useful of all: what was confusing, what felt unfair,
and what was the most fun.

## For developers

```
npm test          # Vitest: rules, Bob's beam, bottles and throws, and a full playthrough on real inputs
npm run build     # dist/
```

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
  the scrubber for 4 s and Bob for 4.5 s (host, 2026-11-07: was 1.5). Knocked down mid-chase, Bob gets up
  and shouts for 0.6 s before he comes at you again, so he can never catch you the instant he stands. A bottle that lands
  on you is an ordinary 5% hit. Hitting a display (the plush, the mini-bottle rack) makes the biggest noise ring.
- **Hiccup lob** fires on every third hiccup, not every one, so hauling a load at high Buzz is still possible
  (`BUZZ.hiccupLobEvery`; set it to 1 for the board's version).
- **Special bottles on night 1:** the rum captain (sea legs) and blue curaçao (paw prints), 4 of each. Ship in a
  bottle needs the rainy night's thunder, gold flakes need coins, and spin the bottle and the ceiling fan wait for later nights.

- **Falling from the high shelves** (host, after the throwing playtest): you're knocked out for 3 s and lose 5%
  health. A fall of 250 px or more counts, so walking or getting knocked off the 230 board or higher onto the floor;
  hopping down one board at a time is fine. It's drawn as a cartoon daze (sprawled, stars circling, swirly eyes),
  not passed out, because the board rules out passing out. Bob can still nab you while you're dazed.
- **The cousin minds the merchandise** (host): every 4th bottle you smash without handing anything up, the cousin
  hisses "Pssst! Don't smash ALL the merchandise!" (or one of two others). A hand-up starts the count over. That
  line replaces the usual "Smash it!" cheer on that crash. The count is `NAG_EVERY`.

- **Scoring is specials plus bonus** (host, 2026-11-08): turning in every special in the level is 100%, and the
  night score is that percentage + (other bottles turned in × Buzz at the end of the night). It replaces loot
  values, Mess and par. A smashed or thrown special can't be turned in, so 100% is out of reach; that includes
  specials Bob grabs and throws. Builder's calls: only bottles turned in earn bonus (smashing earns a spill to drink
  instead), the letter comes from the specials percentage alone, so bonus points can't buy a grade, and climbing
  out turns in what's in your paws. A and B are green, C and D yellow, F red. `SPECIALS` in `src/config.ts` sets
  how many a level has; the HUD bar runs 0 to 100% with the letters at their marks.
- **Specials smoke on the shelf** (host, 2026-11-08): wisps rise from the neck, cream for rum and pale blue for
  curaçao. They stop once the bottle leaves the shelf.
- **Every popup is wood paneling** (host). The report card, the shelter slip and the pause menu all draw through
  `popup()` in `src/render/paint.ts`, and their text and line colours come from `POPUP` next to it, so restyling
  popups is one change. The shelter slip keeps its form-style header and the red CAUGHT stamp. The HUD panels and
  speech bubbles aren't popups and keep their charcoal style.

- **No shelf climbing** (host): Up and Down no longer climb an invisible ladder on the shelves. You jump up the
  boards (the jump went from about 90 px to about 124 px so it reliably reaches the next board, including the 100 px
  step up to the hole board), and ↓ on a board is a little hop that drops you through it to the board below. The roof
  trellis is a real ladder you can see, so it still climbs, and a climb there can still slip at high Buzz.
- **Bob throws back** (host, 2026-11-06): mid-chase, if you're up a shelf out of pole reach and in his beam, he
  grabs the nearest bottle he can reach off a shelf (within 140 px, no higher than 200 px), holds it over his head
  for 0.5 s, then lobs it at where you are at that moment. Moving after the wind-up dodges it. A hit is the usual
  5% and knockback, which can throw you off a high board into a fall knockout. A miss smashes. His bottles can't hit him. He throws at most every 2.4 s, and if he's
  knocked down or gives up mid wind-up, he drops it. With nothing on a shelf near him, he doesn't throw.
- **The scrubber snitches** (host, 2026-11-06): roll into it (or let it rush into you) on the floor and it sets
  off a 3 s siren, the biggest noise ring there is (1000 px). Bob comes to it if he's inside, and if he isn't due
  yet, the siren brings him in early and he heads straight for it. It can only go off once every 8 s. Knocking
  it over with a bottle still buys 4 s of quiet. All the numbers are in `BOB_THROW` and `SIREN` in
  `src/config.ts`.
- **The snitch-cam** (host, 2026-11-07): the scrubber's camera spots you and sets off the same siren, so the high
  shelves aren't safe from it. Guesses: a 260 px cone, about twice as wide as Bob's, panning while it patrols; a
  periscope stop every 7-11 s on patrol; the eye rises 80 px/s to 360 px (about 4 s), scans 3 s at the top
  turning round halfway, then tucks back down. It only watches while patrolling or peeking (rushing to a crash or
  mopping, it's busy). Shelf boards block its view as well as end panels, so it sees along a board only while its
  eye is level with it. Numbers are in `SCRUBBER` in `src/config.ts`.
- **Bob sees you at his feet** (host, 2026-11-07): his flashlight can't tilt down to the floor right in front of
  him, so anywhere in front of him inside his catch-pole reach counts as seen.

Smaller calls:

- **Out of Bob's sight:** his flashlight is a cone that sweeps up and down. Shelf units' end panels and the counter
  block it. A shelf hides you from a distance; up close, you hide by jumping up above where his beam can tilt.
  A post within 24 px of a light (his flashlight or the snitch-cam) doesn't block it: the light is held past it.
  Without that, standing beside a post blanked his whole beam. Where a post does stop a light, the post lights up,
  so the cone reads as hitting the end of the shelf, not slipping behind it.
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
- The scrubber only bumps you while it's rushing to a crash, as written. On patrol it rolls past.
- The title has no Quit, since it's a browser tab. The coins counter stays at 0 on night 1: only night 2's till gives coins.
