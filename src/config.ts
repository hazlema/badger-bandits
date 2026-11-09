// Every tuning number for night 1 lives here. Values marked (design) come from
// design.md; values marked (guess) are the builder's placeholders for things
// the design leaves open. Change freely and replay.

export const DT = 1 / 60;
export const VIEW_W = 960;
export const VIEW_H = 540;
// The world (540 px tall) is drawn into the top 480 px; the HUD band sits below.
export const WORLD_SCALE = 480 / 540;
export const WORLD_VIEW_W = VIEW_W / WORLD_SCALE;

export const RACCOON = {
  w: 34,
  h: 28,
  runSpeed: 230, // px/s, sober (guess)
  accel: 1900,
  decel: 2300,
  airControl: 0.75,
  jumpSpeed: 610, // ~124 px: clears a shelf board (90 px apart, 100 to the hole board) with room to spare (guess)
  dropHop: 200, // Down on a board: a little hop, then you fall through it to the one below (guess)
  gravity: 1500,
  maxFall: 900,
  climbSpeed: 150,
  bumpSpeed: 95, // must be moving at least this fast to knock a bottle off (guess)
  reach: 40, // Grab reach in front of the raccoon: grab from a step away without bumping it off
  carry: 5, // (design)
  toteExtra: 3, // (design)
  health: 100, // (design)
};

// Night 2's powerup (host, 2026-11-09): only works while you're spotted. Boost is a share of sober run speed, so it helps most when you're drunk. Guesses.
export const SNEAKERS = { boost: 0.2, fade: 2.5 }; // fade: s to wear off once you're out of danger

export const BUZZ = {
  steps: 5, // (design) sober x1, each step +0.5, top x3.5
  perStep: 0.5,
  wearOff: 60, // s per step after the last change (design: "about a minute")
  // Per-step movement penalties (guess)
  speedLoss: 0.08, // -8% run speed per step
  controlLoss: 0.14, // accel/decel -14% per step: overshoot and slide
  swayPx: 3, // screen sway per step
  hiccupFrom: 3, // (design)
  hiccupEvery: [3.5, 7] as const, // s between hiccups at step 3; shorter higher up (guess)
  hiccupWarn: 0.7, // cheeks puff this long before the hop (guess)
  hiccupHop: 330,
  slipFrom: 4, // "high up" read as Buzz step 4+ (guess)
  slipPerSec: 0.35, // chance per second of climbing to slip (guess)
  armSway: 0.06, // rad of aiming-arc sway per step (guess)
  hiccupLobEvery: 3, // every 3rd hiccup pops your top bottle out in a lob (guess; the board says every hiccup)
};

// Turning in every special is 100% of the night (host, 2026-11-08). Every other bottle is one bonus point.
export const SPECIALS = { rum: 10, curacao: 10 }; // how many replace regular bottles in the night-1 store (guess)
export const SEA_LEGS = 30; // s of no sway or wobble after lapping the rum captain's spill (guess)
export const PRINTS = { time: 12, every: 26, life: 40 }; // blue paws: s after stepping in, px apart, s each lasts (guess)

export const THROW = {
  lobAngle: 0.9, // rad above horizontal
  lobMin: 80, // px of flat-ground distance at the shortest
  lobMax: 620,
  chargePeriod: 1.4, // s for the arc to grow from shortest to longest and back while you hold Throw
  rollSpeed: 420,
  rollDecel: 150, // px/s² of friction; a roll stops and cracks after ~600 px
  rollPinSlow: 0.75, // speed kept after bowling over an enemy
  selfSafe: 0.4, // s a bottle you launched can't hit you
};

// Undecided on the board; the host took the builder's proposal: no health bars,
// a bottle knocks an enemy off its feet for a while. (guess)
// s knocked off their feet; Bob's raised from 1.5 so a bonk buys a real getaway (host, 2026-11-07)
export const KNOCKDOWN = { scrubber: 4, bob: 4.5 };

export const FLOW = { speed: 45, min: 140, max: 360 }; // big floor spills run toward the front (guess)
export const TUTORIAL = { restock: 3 }; // s until the practice store puts a missing bottle back (guess)
export const NAG_EVERY = 4; // smashed bottles in a row, without a hand-up, before the cousin hisses at you (host, 2026-11-06; count is a guess)

export const RING = { small: 170, big: 320, biggest: 520, hoot: 700, siren: 1000 }; // noise radii px (guess)

export const NIGHT = {
  length: 300, // s from the tile crash to dawn (design: ~5 min on night 1)
  bobAt: 1 / 3, // (design)
  dawnLightFrom: 0.55, // fraction of the night when the sunlight starts creeping (guess)
};

// damage (design); a bottle landing on you costs the same (guess)
export const HIT = { damage: 5, knockX: 260, knockY: 300, invuln: 1.6 };

// Fall from the high shelves and you're knocked out for a few seconds. (host, 2026-11-06)
// koHeight: falls of 250 px or more count, so the 230 board or higher down to the floor (guess).
export const FALL = { koHeight: 250, koTime: 3, damage: 5 };

export const BOB = {
  w: 34,
  h: 92,
  searchSpeed: 32, // slow enough that late in the night he is at the back (guess)
  investigateSpeed: 70,
  chaseSpeed: 125, // a sober raccoon outruns him; a Buzz-5 one barely (guess)
  lookAround: 3, // s he stands at a crash before moving on
  beamRange: 400,
  beamHalf: 0.2, // rad, half width of the cone
  sweepLow: -0.35, // rad below horizontal
  sweepHigh: 1.05, // rad above horizontal
  sweepPeriod: 3.2,
  loseAfter: 2.2, // s out of sight before he gives up the chase (guess)
  poleReachX: 78,
  poleReachUp: 150, // how far above the floor the catch pole reaches
  shoutTime: 0.6, // he freezes and shouts before chasing
};

// A shelf end post this close to a light (Bob's flashlight, the snitch-cam) doesn't cut it off: the light is
// held past it. Without this, standing beside a post blanked his whole beam (guess).
export const POST_GRACE = 24;

// Bob throws (host, 2026-11-06): mid-chase, when you're up out of pole reach, he grabs a bottle off a shelf
// near him and lobs it at you. All guesses.
export const BOB_THROW = {
  windup: 0.5, // s he stands with the bottle raised, so you can see it coming
  every: 2.4, // s between throws
  grabRange: 140, // px either side of him he'll grab a bottle from
  grabHeight: 200, // px above the floor he can reach a shelf
  speed: 380, // px/s across; sets the flight time, within the limits below
  minFlight: 0.5,
  maxFlight: 1.0,
};

// The snitch (host, 2026-11-06): roll into the scrubber and it sets off a siren. All guesses.
export const SIREN = { time: 3, cooldown: 8 };

export const SCRUBBER = {
  w: 46,
  h: 26,
  patrolSpeed: 42,
  rushSpeed: 95,
  slurpTime: 1.2,
  // The snitch-cam (host, 2026-11-07): a camera eye on a telescoping pole, so the shelves aren't safe from it.
  // Eye heights are px above the floor. All guesses.
  eyeBase: 22, // tucked in its dome
  eyeTop: 360, // fully raised: level with the top boards
  eyeUp: 80, // px/s raising: slow, so you see it coming
  eyeDown: 220, // px/s tucking back down
  peekEvery: [7, 11], // s of patrol between periscope stops
  peekHold: 3, // s it scans at the top, turning around halfway
  camRange: 260,
  camHalf: 0.38, // rad, half width of the cone (Bob's is 0.2)
  camTilt: 0.15, // rad above level it looks while patrolling (the floor ahead); level while peeking
  camSweep: 0.35, // ± rad it pans
  camPeriod: 2.4, // s per pan
};

// Night 2's security (host, 2026-11-09): the store panicked and bought a tank. It does the scrubber's jobs and shoots. All guesses.
export const TANK = {
  w: 112,
  h: 60,
  eyeBase: 62, // the periscope, tucked down at the top of the turret
  pivot: 48, // px above the floor the barrel swings from
  barrel: 58,
  aim: 1, // s from spotting you to the shot
  lock: 0.3, // the barrel stops following you this long before it fires, so you can dodge
  swing: 3.2, // rad/s the barrel turns
  pitchMin: -0.3, // rad, how far down and up it can point
  pitchMax: 1.45,
  reload: 5, // s between shots
  shellSpeed: 640, // px/s
  blast: 58, // px radius
};

export const RACK = { stock: 8, goldenChance: 0.1, spinTime: 1.1 }; // (guess)

// What changes from night to night. Each night runs a minute longer (design); the counts are guesses.
export const NIGHTS = [
  { length: NIGHT.length, specials: SPECIALS, champagne: 0, tank: false, wash: null, lamp: '#ff6a4a', bulb: '#ff7a5a' },
  { length: 360, specials: { rum: 12, curacao: 12 }, champagne: 5, tank: true, wash: '#6288f2', lamp: '#3f8cff', bulb: '#a8d4ff' },
] as const;

// Champagne (design): run with it and it fizzes up, tap Grab to pop the cork and get rocketed. All guesses.
export const FIZZ = {
  full: 3, // s of running to shake it up all the way
  settle: 6, // s of standing still for it to go flat again
  minSpeed: 340, // px/s of the rocket with no fizz
  maxSpeed: 780, // px/s at full fizz
  time: 0.55, // s the rocket carries you: about 190 to 430 px
  lift: 260, // px/s upward as it goes off
  tap: 0.22, // s: a press shorter than this pops the cork, so holding Grab to scoop never does
};

// The checkout belt (design): bottles creep along it and smash off the end. All guesses.
export const BELT = { speed: 36, gap: 22, ring: 600 }; // px/s, px between bottles, noise radius of each crash

// The cash register (design): mash the keys until the drawer springs open. All guesses.
export const TILL = { mashes: 6, coins: 12, sprayTime: 1.3 };

// The turf-war possum (design). All guesses, apart from the can's damage, which is HIT.damage (design).
export const POSSUM = {
  range: 320, // px: how close counts as its patch
  windup: 0.55, // s it holds the can up, so you see it coming
  every: 2.2, // s between cans
  speed: 340, // px/s across; sets the flight time, within the limits below
  minFlight: 0.5,
  maxFlight: 1.0,
  woozy: 9, // s it stays woozy after a bottle soaks it
  wideBy: 520, // px its woozy throws can land to either side, in total
  loopyFlight: 1.5, // s a woozy throw stays up
};

// Letter grades on the school scale (host, 2026-11-06): the percentage of the night's specials you turned in.
export const GRADES = [
  { at: 90, name: 'A' },
  { at: 80, name: 'B' },
  { at: 70, name: 'C' },
  { at: 60, name: 'D' },
  { at: 0, name: 'F' },
] as const;
