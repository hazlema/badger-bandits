# racoon2

_Exported 2026-11-06 from idea board._

## Brief

### News Story

ASHLAND, Va. (WWBT/Gray News) – Animal control officers in Virginia responded to an unusual call this weekend after a raccoon broke into a liquor store, ransacked several shelves and passed out in the bathroom.

On Saturday, officers with the Hanover County Animal Protection and Shelter were called to the Ashland ABC store and found the raccoon unconscious in the store’s restroom.

EN ESPAÑOL | Hallan a mapache desmayado en el baño de una licorería; estaba “altamente intoxicado” tras saquear estantes

The raccoon had damaged merchandise on multiple shelves and got into the liquor before passing out in the restroom.

The officer safely secured the “very intoxicated raccoon” and took it to an animal shelter to recover, the shelter said.

After several hours of rest, the raccoon showed no signs of being hurt, “other than maybe a hangover and poor life choices,” the shelter said. It was released back into the wild.

Officials said the raccoon broke into the store through the ceiling and damaged the store’s security system in the process, triggering a power outage alert from the security company.

> pic
After several hours of rest, the raccoon did not show signs of injury and was released back into the wild. (Source: WWBT)

> pic
Animal control officers found the raccoon unconscious in the store’s restroom.(Hanover County Animal Protection and Shelter)

> pic
The raccoon had damaged merchandise on multiple shelves.(Hanover County Animal Protection and Shelter)

### Decisions

- The game is based on the News Story above: a raccoon breaks into a liquor store through the ceiling and wrecks the shelves.
- It is a 2D side scroller for PC, played with keyboard or gamepad. (Host, 2026-11-06)
- It is a raccoon heist: loot the store and get back out through the ceiling. (Host, 2026-11-06)
- No bathroom and no passing out. Drunk is funny; passed out on the floor is not. (Host, 2026-11-06)
- You carry up to 5 items, health starts at 100%, and Officer Bob is the animal control officer who can catch you. (Host, 2026-11-06)
- A bottle you knock off a shelf damages whatever it hits; if it hits nothing, it makes a noise. (Host, 2026-11-06)
- Most bottles are regular. Special bottles have their own effect and look different on the shelf, so you can see which is which. (Host, 2026-11-06)

### Pitch

Working title: Poor Life Choices.
A raccoon heist. Each night you drop through the ceiling of a liquor store, scramble along the shelves smashing, sipping, throwing and grabbing loot, and pass the good stuff up to your cousin at the ceiling hole. Get back out before dawn or before animal control catches you.

Core loop: target a bottle, then decide whether to drink it, throw it at whatever's in your way, or haul it to the ceiling hole, and dodge whatever your noise woke up.
Feeling: slapstick caper with a 'one more sip' gamble.

### Core mechanics

1. Move: run, jump and climb through one long side-on store. Shelves are stacked platforms, the ceiling hole is at the back, and the front door and windows are at the front. The old floor tilts toward the front, so big spills run downhill.
2. Smash, grab and throw: on a shelf, the bottle nearest in front of you highlights. Grab it to carry it (up to 5 items), or throw it one of three ways: Lob it across the aisle along a dotted aiming arc, Drop it straight onto whatever is below, or Roll it along the shelf or floor like a bowling ball. You can also throw an item you're carrying. Running into a bottle bumps it off, but a bump only ever knocks off one. A bottle that falls or is thrown damages whatever it hits: an enemy, a display, or you if you're underneath. If it hits nothing, it smashes and sends out a noise ring where it lands, and anyone inside the ring comes to look, so a throw can lure Bob or the scrubber away. Either way, the smash adds Mess. Every bottle you throw is one you don't bank, so each bottle is a choice between using it and hauling it.
3. Drink: lap up a spill to fill your Buzz meter. Buzz multiplies everything you score while it's high, and it tops out. The higher it is, the slower and wobblier you are: your aiming arc sways too, and high up a climb can slip and drop you back down a shelf. From the third Buzz step you also get hiccups; the raccoon puffs its cheeks just before each one. A sip lasts long enough to fill your paws and walk a full load to the hole. It never knocks you out.
4. Haul and leave: at the ceiling hole, press Grab to hand your whole load up to your cousin, which banks it at your current Buzz. Press Up at the hole to climb out and end the night, taking anything still in your paws. The hole is a long climb back from the front, so every trip costs time, and the tote bag lets you carry more per trip.

Officer Bob: he comes in the front door about a third of the way to dawn and searches his way to the back and front again. When his flashlight beam lands on you, he shouts and gives chase. Get out of his sight (climb out of the beam or duck behind a shelf) and he loses you and goes back to searching. If his catch pole reaches you, you're caught. Because he works toward the back, late in the night the hole is where he is.

Getting hurt: a hit knocks you back, costs health, costs a step of Buzz and makes you drop one item you're carrying, which smashes. At 0% health the raccoon is too sore to run and the night ends as caught, even if Bob hasn't come in yet. You're also caught if Bob grabs you or you're still inside at dawn.

The key tradeoff: drink first and every point is worth more, but you have to reach the hole, and dodge everything your noise woke up, while you wobble. Drink too early and a hit takes the multiplier before you bank it.

### Scoring and progression

- Each smash scores its Mess times your Buzz at that moment. Each load you hand up scores its loot value times your Buzz at that moment. Whatever is in your paws or fur when you climb out scores at your Buzz as you leave.
- Banked loot is safe with your cousin. Mess, the items in your paws and the coins in your fur only count if you climb out. Get caught and you lose all of them, so the longer you stay, the more you're risking.
- A par bar in the night HUD fills as you score, so you can tell whether it's worth risking a bigger pile or leaving now. The report card shows the same bar.
- The night's grade depends on how your score compares with par: under half of par is Clean getaway, half is Tipsy bandit, par is Hot mess, one and a half times par is Party animal, and double par is Poor life choices. If you were caught, the card comes from the shelter with a caught stamp and a line for what animal control kept.
- A run is 5 nights, each in a bigger store that adds new trouble. Caught or not, you're released back into the wild and go on to the next night. Only your total score carries over.

### Controls

- Move left and right, Jump, and climb by holding up against a shelf.
- Run into a bottle to bump it off the shelf.
- On a shelf, the nearest bottle in front of you highlights. Grab picks it up, and Throw throws it: Throw + Up lobs it (hold to aim along the dotted arc), Throw + Down drops it straight down, Throw + forward rolls it.
- With no bottle highlighted, Throw uses the ready item you're carrying. Switch picks which carried item is ready; it's highlighted in your carry slots.
- Grab also drinks a spill, hands your load up at the hole, loads the checkout belt, or uses a machine. With champagne in your paws and nothing in front of you, Grab pops the cork.
- Hoot blows across a carried bottle.
- Press Up at the ceiling hole to climb out and end the night.
- Press Down at the plush display to play dead.
- The engine is up to the builder.

### Art direction

- Cozy: soft, rounded, hand-drawn cartoon with warm storybook lighting, even during the power outage. See the cozy store background.
- The UI is raccoon-themed: paw-print icons and slots, the bandit-mask colours (charcoal, soft grey and cream), and ringtail stripes on the frames. See the HUD comp.
- The store is the Ashland ABC store from the story.
- The raccoon's hands are empty by default; the sack in the sprite test becomes the tote bag power-up.

## Brainstorm

### 1. Rooftop and ceiling (tutorial on night 1)

- [x] **Pry up a roof vent and crawl through the ceiling:** On night 1 this teaches run, jump and climb with nothing to break yet. On later nights it's a short climb with no teaching.
- [x] **Chew through the security wires:** Required, because the wires block the way in. The power goes out, red emergency lights come on as in the story, and the outage alert calls Officer Bob. In the dark, Bob's flashlight shows you where he is from far away.
- [x] **Crash through a ceiling tile onto the top shelf:** The first smash, and the start of the night.

### 2. The store aisles (main level)

- [x] **Bump a bottle to knock it off the shelf:** It falls and damages whatever it hits below: an enemy, a display, or you. If it hits nothing, it smashes on the floor with a loud crash and sends out a noise ring, and anyone inside the ring reacts. Either way it adds Mess.
- [x] **Target a bottle and throw it:** On a shelf, the bottle nearest in front of the raccoon highlights. Throw it one of three ways: Lob (Throw + Up) arcs it across the aisle, with a dotted arc while you hold to aim; Drop (Throw + Down) lets it fall straight onto whatever is below; Roll (Throw + forward) bowls it along the shelf or floor. With no bottle highlighted, Throw uses the ready item you're carrying instead. A thrown bottle damages whatever it hits, or smashes with a noise ring that pulls Bob and the scrubber to that spot. Special bottles keep their effect when thrown.
- [x] **Bottle bowling:** A rolled bottle doesn't break while it rolls. It knocks the night stocker or the floor scrubber off their feet like a bowling pin, then cracks when it stops or hits a wall.
- [x] **Lap up a spill to fill your Buzz meter:** Smashed bottles leave the spills you drink. Each sip raises the score multiplier, up to a top. It wears off slowly, so one sip lasts long enough to fill your paws and carry a full load to the hole. What it does to your movement is in the next entry.
- [x] **Running spills:** The old floor tilts toward the front, so a big spill trickles downhill between the aisles as a shining stream and pools somewhere else. You chase it to drink it, and so does the scrubber.
- [x] **Drinking makes you slower and wobblier:** Each sip makes the raccoon move a little slower and gives you a little less control. The screen sways and the raccoon overshoots jumps. High up, a climb can slip and drop you a shelf. A bump still only ever knocks off one bottle.
- [x] **Hiccup hops:** From the third Buzz step the raccoon gets the hiccups. It puffs its cheeks just before each one, then pops into the air, often in the middle of a careful climb or right at the edge of a shelf.

### 4. Report card (results)

- [x] **Show banked loot, Mess, what you climbed out with, and the night's score against par:** If you were caught, it's the shelter's bill instead: a line for the Mess and items animal control kept.
- [x] **Grade the night by score: Clean getaway, Tipsy bandit, Hot mess, Party animal, Poor life choices:** The top grade comes from the shelter's quote in the story. Caught nights get a shelter stamp.

### Raccoon Skills

- [x] **Play dead among the plush toys : hiding from Officer Bob:** Every store has one novelty plush display, about halfway along. Flop belly-up in it and play dead while Bob isn't looking at you, and his beam passes over you: he squints, mutters and moves on. If you hiccup while he's looking, or he saw you dive in, he spots you and gives chase.
- [x] **Paw-mash the cash register : the checkout till:** The raccoon's clever little hands slap the register keys until the drawer springs open and coins spray everywhere, shiny things it can't help stuffing into its fur. Coins don't take a carry slot. They count when you climb out and are lost if you're caught.
- [x] **Spin the mini-bottle rack : the rotating checkout display:** The raccoon gives the spinner rack of airplane bottles a hard swat. It whirls like a prize wheel, and whatever bottle stops facing it is the one it grabs. Usually it's a mini-bottle; now and then it's the golden one, worth as much as champagne.
- [x] **Hand bottles up to your cousin : the raccoon peering through the ceiling hole:** A second raccoon pokes its masked face through the hole you came in by and chitters at you all night, cheering a big smash and scolding a wasted bottle. Stand on the top shelf under the hole and press Grab to hand up your whole load at once.
- [x] **Jimmy the latch : the walk-in beer cooler door:** The raccoon's nimble fingers twiddle the cooler's latch the way real raccoons pick bin locks. The heavy door swings open and cold fog rolls out over a frosty wall of six-packs. A six-pack takes one carry slot but is worth more than a full bottle.
- [x] **Bottle conveyor : the checkout belt:** Line bottles up on the checkout belt, which creeps along on the backup battery during the outage. One by one they ride off the end and smash, a slow clink-clink-crash of noise rings at the till that keeps Bob and the scrubber busy while you work somewhere else. _(Claude added, not reviewed)_
- [x] **Bottle-top hoot : blowing across a bottle you're carrying:** Puff across the mouth of a carried bottle and it hoots like a foghorn. Unlike a throw, it costs no loot, and it pulls everyone to where you are, not to a spot you choose. Use it to drag Bob away from the hole before you slip around him. _(Claude added, not reviewed)_

### Raccoon Powerups

- [x] **"Chug! Chug!" chant : the drunk guy pressed against the front glass:** A late-night barfly spots the raccoon through the locked front door and starts pounding the glass and chanting. While he chants, every sip counts as two Buzz steps and the raccoon puffs up like a champ. His pounding also makes a noise ring by the front door.
- [x] **Slap the pour buttons : the self-serve wine tasting machine:** The tasting-station dispenser has glowing buttons for Taste, Half and Full pour. The raccoon smacks one and gets exactly that much Buzz: one step, two steps, or straight to the top. Each button works once a night, so it's a dose you chose on purpose for once.
- [x] **Tumble the drinking dice : the novelty gift set by the till:** The raccoon knocks over a boxed set of party drinking dice and the big one clatters across the counter. Whatever face lands up is what you get for a short while: Double Smash (smashes score double), Sticky Paws (hits don't make you drop anything), Quiet Paws (no noise rings), Bonus Sip (one Buzz step now), Hiccup Fit (a burst of hiccups right away) or Bust (nothing).
- [x] **Stand under the cold drip : the rainstorm leaking through your ceiling hole:** Rain starts dripping through the hole the raccoon came in by, plinking into a puddle. Sit under it and the cold splash sobers you up one Buzz step at once: your score multiplier drops, but you get your feet back for a hard climb. The safe way to spend Buzz you can't risk carrying.
- [x] **Shake-and-pop the champagne : the bottle the raccoon runs with:** Carry a bottle of bubbly while you scramble and it shakes up, fizzing harder the longer you run. Press Grab with nothing in front of you to pop the cork: the spray rockets the raccoon across the aisle, and the bottle is used up. So you spend 5 points of loot to get somewhere fast.
- [x] **Carry Capacity : a reusable tote bag from the checkout:** The raccoon grabs a shopping tote from the rack by the till and slings it over its shoulder. It gives you 3 more carry slots.

### Enemies

- [x] **Broom swats from the night stocker : the clerk dozing in the stockroom:** A night-shift stocker is snoring on a pallet in the back. When a smash's noise ring reaches the stockroom he wakes up, shuffles out half-asleep and swings a push broom blindly down the aisle at whatever is moving.
- [x] **Turf-war possum : the opossum squatting behind the stockroom boxes:** Another trash bandit got here first. A scruffy possum hisses from the top of the case stacks and lobs cans at the raccoon whenever it gets near its patch. Hit it with a bottle and it gets soaked, licks its fur and goes woozy for a while, swaying and warbling and lobbing its cans wide in big loopy arcs.
- [x] **The robot floor scrubber : the store's overnight cleaning bot:** A squat cleaning robot trundles up and down the aisles on its night schedule, beeping politely. When a smash's noise ring reaches it, it leaves its route and trundles to the crash: it slurps the spill before you can drink it, and bumps you off your feet if you're in the way. So you smash and sip away from it, or you lose the drink to it. This is the one thing that hunts you before Bob arrives.
- [x] **Dawn light creeping up the aisle : the front windows at sunrise:** Pale morning sun slides across the floor from the front windows, inch by inch toward the shelves. When it reaches the counter, the morning staff's car pulls into the lot and anyone still inside is caught.
- [x] **Officer Bob : the animal control officer the outage alert calls in:** The outage alert from the chewed wires calls him out every night. About a third of the way to dawn he lets himself in through the front door and works his way slowly to the back of the store and then forward again, sweeping his flashlight ahead of him. A noise ring makes him head for the crash. When the beam lands on you, he shouts and gives chase until you get out of his sight. If his catch pole reaches you, you're caught, and he keeps every point of Mess you made: the shelter's bill for the damage.

### 3. The getaway (finale)

- [x] **Climb back out through the ceiling hole to end the night:** Press Up at the hole. You keep your banked loot, plus your Mess, what's in your paws and the coins in your fur. Late in the night Bob's search reaches the back, so the last climb out is often a dash past his beam.
- [x] **Get grabbed by Bob, drop to 0% health, or still be inside at dawn, and you're caught:** You lose your Mess, carried items and coins; only the loot you banked with your cousin still counts. At 0% health this happens even before Bob has come in. The report card comes from the shelter.

### Default Values (raccoon, enemies, loot)

- [x] **Carry capacity: 5:** The raccoon can hold up to 5 items at once.
- [x] **Health: starts at 100%:** Enemy hits take away a percentage of health.
- [x] **Night stocker's broom swat: 5% damage:** Placeholder, to be tweaked.
- [x] **Possum's thrown can: 5% damage:** Placeholder, to be tweaked.
- [x] **Robot floor scrubber bump: 5% damage:** Placeholder, to be tweaked.
- **Officer Bob, Dawn light and Hiccup hops: no damage:** Bob's grab and dawn end the night as caught; hiccups only bounce you.
- [x] **Getting hit: drop 1 carried item:** It smashes, so it still adds Mess.
- [x] **Loot values: mini-bottle or can 1, regular bottle 3, six-pack 4, champagne 5, golden mini-bottle 5, handful of coins 1:** Placeholders, to be tweaked. Every item takes one carry slot except coins. A six-pack is one slot.
- [x] **Mess per smash: half the item's loot value:** Placeholder, to be tweaked. The ceiling tile counts as 1. Half, so hauling a bottle is always worth more than smashing it.
- [x] **Buzz meter: sober x1, then each of 5 steps adds x0.5, up to x3.5:** Placeholder, to be tweaked. One spill is one step, and a step wears off after about a minute.
- [x] **Night length: about 5 minutes on night 1, a minute longer each night:** Placeholder. The dawn clock starts when you crash through the ceiling tile. Bob comes in a third of the way through.
- [x] **Par: 80 on night 1, 40 more each night:** Placeholder. Raised after the last playtest, where a hit-free night 1 scored 102 against a par of 40.
- [x] **Hiccups start at Buzz step 3:** Placeholder.
- [x] **Power-ups: chant sips are 2 Buzz steps; wine pours are 1, 2 or straight to the top:** Placeholders. The chant lasts while the barfly is at the glass. Each wine button works once per night.
- [ ] **Bottle damage (falling or thrown), and enemy health:** Undecided: how much a falling or thrown bottle hurts, how much health each enemy has, and what an enemy does when it runs out.

### 5. Nights (a run of 5 stores)

- [x] **Night 1: a small store with the full rooftop tutorial:** Officer Bob, the robot floor scrubber, the mini-bottle rack, the tote bag, and the plush display you play dead in. Targeting, the three throws, bottle bowling, running spills and the hoot all work from night 1. Bob's first entrance teaches play dead: your cousin chitters a warning, the plush display lights up, and Bob's beam passes over you.
- [x] **Night 2: adds the turf-war possum:** The champagne, the cash register and the checkout belt.
- [x] **Night 3: adds the night stocker:** The wine tasting machine and the walk-in cooler.
- [x] **Night 4: a rainy night:** The cold drip from the ceiling hole and the drinking dice.
- [x] **Night 5: the biggest store, with everything:** Adds the drunk guy's "Chug! Chug!" chant at the front glass.

### Bottle Visual Effects and Powerup

- [x] **The saluting rum captain : the pirate on the spiced-rum label:** When the raccoon gets close, the little captain on the label turns his head and snaps a salute. Lap up his spill and the raccoon gets sea legs: for a while the screen sway and wobble cancel out, even at high Buzz.
- [x] **Gold flakes in a snow globe : the swirl you watch settle:** A gold-flake liqueur swirls like a snow globe when you bump it. When it smashes, the flakes drift down and you see how many stick in the raccoon's fur; each one is a coin.
- [x] **Magic 8-ball liqueur : the floating answer in its window:** A round black bottle has a little window. Bump it and a triangle floats up reading DRINK, HAUL or RUN, and whatever it says scores double for a short while.
- [x] **Ship in a bottle rocking to thunder : the storm outside:** A dark rum has a tiny ship inside that rocks on a little wave every time thunder cracks. Smash it on a thunderclap and the thunder swallows the crash, so it makes no noise ring.
- [x] **Glowing blue paw prints : the raccoon walking through the spill:** Step in a blue curaçao spill and the raccoon leaves glowing blue paw prints wherever it goes. The robot scrubber follows the prints to mop them up, so you can lead it away from the spill you want.

### Ways to throw a bottle

- [x] **Spin the bottle : the bottle on the floor:** The raccoon spins a bottle on the floor like the party game. Everyone watches the neck sweep past Bob, the scrubber and the possum, and when it stops it skids off in whichever direction it's pointing.
- [x] **The ceiling fan kicks back on : the store's power stuttering back:** The backup power hiccups and the big ceiling fan starts turning again. Set a bottle on a blade and it's carried around and slung off, flying wherever the blade was pointing when it let go.
- [x] **Hiccup lob : the raccoon's own hiccups:** From the third Buzz step, each hiccup pops the top bottle out of the raccoon's paws in a high, wobbly arc. The cheek puff warns you just before, so you can turn to face where you want it to land.

### Notes

> Host played the night-1 build: the ideas are interesting, but it isn't really a game yet. The bottles need more to do; a pitch on bottles is next.

### Pictures

**Raccoon sprite test: older clean style; redo in the cozy style. Drop the default sack (it's the tote power-up).** · Claude · Foreman

![Raccoon sprite test: older clean style; redo in the cozy style. Drop the default sack (it's the tote power-up).](<idea-board.assets/76e18a9b655afe3598fe6e2754013319.png>)

**Cozy store background (Ashland ABC store)** · Claude · Foreman

![Cozy store background (Ashland ABC store)](<idea-board.assets/0563a41ed10437c8c6bbca0e396e810e.png>)

**HUD comp, cozy raccoon style. Fixes needed: use our five grades (Clean getaway to Poor life choices) on the par bar instead of C to A, the sign should read ABC Store, and there's no raccoon shopkeeper.** · Claude · Foreman

![HUD comp, cozy raccoon style. Fixes needed: use our five grades (Clean getaway to Poor life choices) on the par bar instead of C to A, the sign should read ABC Store, and there's no raccoon shopkeeper.](<idea-board.assets/39c51d5d8adc87bd914d1a5c4adc660e.png>)

### Links

- Bottles → Bottle Visual Effects and Powerup
- Bottles → Ways to throw a bottle
- Game Play → 1. Rooftop and ceiling (tutorial on night 1)
- Game Play → 2. The store aisles (main level)
- Game Play → 3. The getaway (finale)
- Game Play → 5. Nights (a run of 5 stores)
- Game Play → 4. Report card (results)
- Racoon → Enemies
- Racoon → Raccoon Powerups
- Racoon → Raccoon Skills
- Game Play → Default Values (raccoon, enemies, loot)

## Flowchart

### Accepted cards

- **Title screen**: Buttons: Play, Quit.
- **Night (side-scrolling level)**: Ceiling entry, store aisles, getaway. HUD shows health, items carried against your capacity (5, or 8 with the tote) with the ready-to-throw item highlighted, coins in your fur, the Buzz meter, banked loot, time to dawn, and the par bar for the night. Mess shows as at-risk until you climb out, so it looks different from banked loot. While you hold Throw, a dotted arc shows where the bottle will land. Button: Pause.
- **Pause**: Buttons: Resume, Quit to title. No restart, so a night about to go wrong can't be undone.
- **Report card**: Score and grade for the night, with a bar showing the par score so you can see how close the next grade was. If you escaped, it's set in the raccoons' den; if you were caught, it comes from the shelter with a caught stamp. Buttons: Next night (or Final total after night 5), Title. No retry here: a caught night still moves the run on.
- **Final total**: Total score for all 5 nights and the best grade earned. Buttons: Play again, Title.

### Connections

- Title screen → Night (side-scrolling level) (Play)
- Night (side-scrolling level) → Pause (Pause)
- Night (side-scrolling level) → Report card (Escape / caught)
- Pause → Night (side-scrolling level) (Resume)
- Pause → Title screen (Quit to title)
- Report card → Night (side-scrolling level) (Next night)
- Report card → Title screen (Title)
- Report card → Final total (Final total (after night 5))
- Final total → Title screen (Title)
- Final total → Night (side-scrolling level) (Play again)

## Ruled out

- **Claw-scratch the lottery tickets : the scratch-off case by the till: The raccoon rips a strip of scratch-offs from the case and scrapes them with its claws, foi** (You, 2026-11-06, from Pitches)
- **Eyeshine in the dark : the store's flickering emergency lights: When the red emergency lights stutter out, the store goes black except for the raccoon's two glo** (You, 2026-11-06, from Pitches)
- **Dangle by your back feet : the player's own climbing: Raccoons can turn their hind feet backwards, so the raccoon can hook a shelf edge or ceiling grid and swin** (You, 2026-11-06, from Pitches)
- **"Howdy, partner!" : the motion-sensor cardboard cowboy promo: A life-size cardboard whiskey cowboy at the end of an aisle has a motion sensor. When the raccoon** (You, 2026-11-06, from Pitches)
- **Mini-bottle advent calendar : the holiday gift tower by the door: A tower of boozy advent calendars has little numbered doors. The raccoon can pick one and paw** (You, 2026-11-06, from Pitches)
- **Keg spinning on its rim : a tapped keg knocked off its stand: A bumped keg hops off its stand and spins on its edge like a coin, wobbling one way and then the o** (You, 2026-11-06, from Pitches)
- **The freight train rumbles past : the tracks through downtown Ashland: Ashland's freight trains really do run straight through town. When the horn blows and the** (You, 2026-11-06, from Pitches)
- **3. The bathroom (finale)** (You, 2026-11-06, from 3. The bathroom (finale))
- **Passing out / blacking out (as a fail state or ending)**: "Drunk is funny, passed out on a floor is not." (Claude · Foreman, 2026-11-06, from chat)
- **Hits hurt more while you're drunk: each Buzz step adds 5% damage: A hit costs its damage plus 5% for every Buzz step you're carrying. Placeholder, to be tweaked**: "Foreman: a hit already costs health, a Buzz step and a dropped item. Adding more damage per Buzz step stacks a third drunk penalty and would make staying sober the obvious choice, which is the opposite problem." (Claude · Foreman, 2026-11-06, from Raccoon Default Values)
- **At high Buzz, one bump knocks over a whole shelf row**: "Host: all the bottles knocking over at once is real life, but not for a game." (Claude · Foreman, 2026-11-06, from chat)
- **Bottle Effects**: "try again. vissual effects" (You, 2026-11-06, from Bottle Effects)
