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
  jumpSpeed: 520, // ~110 px jump (guess)
  gravity: 1500,
  maxFall: 900,
  climbSpeed: 150,
  bumpSpeed: 95, // must be moving at least this fast to knock a bottle off (guess)
  reach: 40, // Grab reach in front of the raccoon: grab from a step away without bumping it off
  carry: 5, // (design)
  toteExtra: 3, // (design)
  health: 100, // (design)
};

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

// Special bottles are worth 5x a regular one (host, 2026-11-06), so smashing one is also 5x the Mess.
export const LOOT = { mini: 1, regular: 3, golden: 5, rum: 15, curacao: 15 } as const; // (design)
export const SPECIALS = { rum: 4, curacao: 4 }; // how many replace regular bottles in the night-1 store (guess)
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
export const KNOCKDOWN = { scrubber: 4, bob: 1.5 };

export const FLOW = { speed: 45, min: 140, max: 360 }; // big floor spills run toward the front (guess)
export const MESS_FACTOR = 0.5; // Mess = half loot value (design)
export const TILE_MESS = 1; // (design)
export const NAG_EVERY = 4; // smashed bottles in a row, without a hand-up, before the cousin hisses at you (host, 2026-11-06; count is a guess)

export const RING = { small: 170, big: 320, biggest: 520, hoot: 700 }; // noise radii px (guess)

export const NIGHT = {
  length: 300, // s from the tile crash to dawn (design: ~5 min on night 1)
  bobAt: 1 / 3, // (design)
  par: 80, // (design)
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

export const SCRUBBER = {
  w: 46,
  h: 26,
  patrolSpeed: 42,
  rushSpeed: 95,
  slurpTime: 1.2,
};

export const RACK = { stock: 8, goldenChance: 0.1, spinTime: 1.1 }; // (guess)

// Letter grades (host, 2026-11-06), on the board's cut points: half the target, the target, 1.5x, 2x.
export const GRADES = [
  { at: 2, name: 'A' },
  { at: 1.5, name: 'B' },
  { at: 1, name: 'C' },
  { at: 0.5, name: 'D' },
  { at: 0, name: 'F' },
] as const;
