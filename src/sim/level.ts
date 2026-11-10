// Level geometry. y grows downward; every surface is the y of its top edge.
// The store runs left to right from the back (ceiling hole) to the front
// (counter, door, windows).

import { NIGHTS, SPECIALS } from '../config';
import { rng } from './rng';

export type ItemKind = 'mini' | 'regular' | 'golden' | 'rum' | 'curacao' | 'champagne' | 'can';

export const isSpecial = (kind: ItemKind): boolean => kind in SPECIALS;

export interface Rect { x: number; y: number; w: number; h: number }
/** One-way platform: stand on it, jump or climb up through it. */
export interface Board { x1: number; x2: number; y: number; unit: number }
/** A shelf unit: climbable from the floor to `top`; its end panels block Bob's beam. */
export interface Unit { x: number; w: number; top: number }
export interface BottleDef { x: number; y: number; kind: ItemKind; board: number }
/** A wooden sign, on a post down to the ground, or chained to the ceiling if `hang` is set. */
export interface Sign { x: number; y: number; text: string; hang?: boolean }
/** Scenery standing on the floor against the wall. Nothing collides with it. */
export interface Prop { kind: 'cases' | 'crate' | 'barrel' | 'dolly' | 'mop' | 'wetfloor' | 'plant'; x: number }
/** A chalkboard hung in the tutorial's store. x is its centre, y its top. */
export interface Poster { x: number; y: number; w: number; title: string; lines: string[] }

/** Powerups stay with you from night to night. */
export type Powerup = 'tote' | 'sneakers' | 'shield' | 'candy';
export type CritterKind = 'eagle' | 'owl' | 'snake';

/** How far below its branch a hanging bottle's base sits. */
export const HANG = 44;
export type CoverKind = 'bale' | 'barrel' | 'target' | 'cart';

export interface Level {
  id: 'roof' | 'crawl' | 'store';
  width: number;
  floorY: number;
  ceilingY: number;
  solids: Rect[];
  boards: Board[];
  climbables: Rect[];
  units: Unit[];
  bottles: BottleDef[];
  signs: Sign[];
  posters?: Poster[];
  props?: Prop[];
  start: { x: number; y: number };
  // Named spots. Only the ones a level uses are set.
  vent?: Rect;
  wires?: Rect;
  tile?: Rect;
  hole?: Rect; // standing zone on the back shelf's top board
  plush?: Rect;
  powerup?: Rect & { kind: Powerup }; // tonight's, on the rack near the counter
  rack?: Rect;
  counter?: Rect;
  door?: Rect;
  windows?: Rect;
  scrubberRoute?: [number, number];
  scrubberStart?: number;
  bobRoute?: [number, number]; // back, front
  possum?: { x1: number; x2: number; y: number }; // the top of its case stack; it sits in the middle
  belt?: { x1: number; x2: number; y: number }; // on the counter, running left to right
  register?: Rect; // only where it can be mashed; otherwise the counter's till is just scenery
  lights?: number[]; // x of each emergency light
  rugX?: number;
  faire?: boolean; // night 3: outdoors. Boards are branches, units are trunks, and bottles hang
  bales?: Rect[]; // hay: a bottle that lands on one doesn't break
  archers?: { x: number; cover: CoverKind }[];
  circus?: boolean; // night 4: the big top. Bleacher rows are boards, king poles are units
  clowns?: [number, number][]; // each clown's patrol, along the floor
  critters?: { kind: CritterKind; x: number; y: number }[]; // perches; snakes sit in baskets on the floor
  cannon?: { x: number; dir: 1 | -1; to: { x: number; y: number } };
  rope?: { x1: number; x2: number; y: number }; // the tightrope, also a board
}

export function roofLevel(): Level {
  return {
    id: 'roof',
    width: 1500,
    floorY: 440,
    ceilingY: 0,
    solids: [
      { x: 0, y: 440, w: 700, h: 100 },
      { x: 700, y: 260, w: 800, h: 280 },
      { x: 330, y: 386, w: 84, h: 54 }, // AC unit
    ],
    boards: [{ x1: 636, x2: 700, y: 260, unit: -1 }],
    climbables: [{ x: 640, y: 260, w: 56, h: 180 }], // ivy trellis
    units: [],
    bottles: [],
    signs: [
      { x: 150, y: 330, text: '← → run   ·   Space / A jump' },
      { x: 505, y: 300, text: 'Hold ↑ against the trellis to climb' },
      { x: 1080, y: 170, text: 'E / X pries up the roof vent' },
    ],
    start: { x: 80, y: 440 },
    vent: { x: 1170, y: 236, w: 70, h: 24 },
  };
}

export function crawlLevel(): Level {
  return {
    id: 'crawl',
    width: 1100,
    floorY: 320,
    ceilingY: 250,
    solids: [
      { x: 0, y: 320, w: 1100, h: 220 },
      { x: 0, y: 0, w: 1100, h: 250 },
    ],
    boards: [],
    climbables: [],
    units: [],
    bottles: [],
    signs: [
      { x: 380, y: 274, text: 'E / X chews through the security wires', hang: true },
      { x: 800, y: 274, text: 'That tile looks loose…', hang: true },
    ],
    start: { x: 60, y: 320 },
    wires: { x: 560, y: 250, w: 18, h: 70 },
    tile: { x: 900, y: 316, w: 80, h: 4 },
  };
}

/** Shelf units as [x, width, board heights]. */
function shelving(defs: [number, number, number[]][]): { units: Unit[]; boards: Board[] } {
  const units: Unit[] = [];
  const boards: Board[] = [];
  for (const [x, w, ys] of defs) {
    const u = units.length;
    units.push({ x, w, top: Math.min(...ys) });
    for (const y of ys) boards.push({ x1: x, x2: x + w, y, unit: u });
  }
  return { units, boards };
}

/** Fill the shelves, then swap regular bottles for the night's specials and champagne, anywhere but the shelf under the hole. */
function stockShelves(r: () => number, boards: Board[], hole: { unit: number; y: number }, night: number, skip?: (x: number, b: Board) => boolean): BottleDef[] {
  const bottles: BottleDef[] = [];
  boards.forEach((b, i) => {
    if (b.unit === hole.unit && b.y === hole.y) return; // the hand-up board stays clear
    for (let x = b.x1 + 24; x < b.x2 - 16; x += 30) {
      if (skip?.(x, b)) continue;
      if (r() < 0.3) continue;
      bottles.push({ x, y: b.y, kind: r() < 0.3 ? 'mini' : 'regular', board: i });
    }
  });
  const swapIn = (kind: ItemKind, n: number) => {
    for (let k = 0; k < n; k++) {
      const pool = bottles.filter((b) => b.kind === 'regular' && boards[b.board].unit !== hole.unit);
      pool[Math.floor(r() * pool.length)].kind = kind;
    }
  };
  for (const [kind, n] of Object.entries(NIGHTS[night - 1].specials) as [ItemKind, number][]) swapIn(kind, n);
  swapIn('champagne', NIGHTS[night - 1].champagne);
  return bottles;
}

/** The store for a night (1-based). */
export function nightLevel(night: number): Level {
  return night === 4 ? circusLevel() : night === 3 ? faireLevel() : night === 2 ? checkoutLevel() : storeLevel(1);
}

/**
 * Night 2: the hole is in the middle, so every load is a trip inward from one end or the other. The back half is the
 * possum's, the front half ends in a long checkout lane. The offset shelves (110 px apart) break up night 1's rhythm.
 */
function checkoutLevel(): Level {
  const r = rng(2);
  const floorY = 500;
  const { units, boards } = shelving([
    [50, 260, [410, 320, 230]],
    [470, 280, [410, 320, 230, 150]],
    [860, 240, [390, 280, 170]],
    [1240, 360, [410, 320, 230, 130]], // the top board is under the hole
    [1880, 280, [390, 280, 170]],
    [2260, 280, [410, 320, 230, 150]],
  ]);
  const bottles = stockShelves(r, boards, { unit: 3, y: 130 }, 2);

  const counter = { x: 2780, y: 420, w: 620, h: 80 };
  const plush = { x: 1690, y: 450, w: 140, h: 50 };
  boards.push({ x1: plush.x, x2: plush.x + plush.w, y: plush.y, unit: -1 });
  const possum = { x1: 350, x2: 450, y: 300 }; // reached from the first shelf's second board
  boards.push({ ...possum, unit: -1 });

  return {
    id: 'store',
    width: 3600,
    floorY,
    ceilingY: 40,
    solids: [{ x: 0, y: floorY, w: 3600, h: 40 }, counter],
    boards,
    climbables: [],
    units,
    bottles,
    signs: [],
    props: [
      { kind: 'plant', x: 805 },
      { kind: 'crate', x: 1170 },
      { kind: 'barrel', x: 1645 },
      { kind: 'dolly', x: 2210 },
      { kind: 'cases', x: 2700 },
    ],
    start: { x: 1415, y: 130 },
    hole: { x: 1370, y: 60, w: 90, h: 70 },
    plush,
    powerup: { kind: 'sneakers', x: 2590, y: 440, w: 34, h: 40 },
    rack: { x: 3240, y: 362, w: 44, h: 58 },
    counter,
    belt: { x1: 2810, x2: 3200, y: counter.y },
    register: { x: 3330, y: 372, w: 58, h: 48 },
    door: { x: 3500, y: 400, w: 70, h: 100 },
    windows: { x: 3430, y: 150, w: 160, h: 240 },
    scrubberRoute: [120, 2750],
    scrubberStart: 2100,
    bobRoute: [90, 3480],
    possum,
    lights: [300, 880, 1600, 2200, 2750, 3300],
    rugX: 1640,
  };
}

/**
 * Night 3: a Renaissance faire in the woods out back. Separate trees instead of long shelves, so getting around means
 * hopping branch to branch or crossing open ground in front of the archers. Trees as [trunk centre, [branch y, half width]].
 */
function faireLevel(): Level {
  const r = rng(3);
  const floorY = 500;
  const width = 3900;
  const trees: [number, [number, number][]][] = [
    [230, [[410, 165], [320, 145], [230, 105]]],
    [690, [[400, 175], [310, 150], [220, 115], [140, 70]]],
    [1170, [[410, 170], [320, 150], [230, 120], [130, 75]]], // your cousin's: the top branch is the hand-up
    [1660, [[405, 170], [310, 140], [215, 100]]],
    [2160, [[410, 175], [320, 150], [230, 120], [150, 70]]],
    [2640, [[400, 170], [300, 140], [210, 95]]],
    [3100, [[410, 165], [320, 140], [230, 100]]],
  ];
  const TRUNK = 36;
  const units: Unit[] = [];
  const boards: Board[] = [];
  trees.forEach(([cx, tiers], u) => {
    units.push({ x: cx - TRUNK / 2, w: TRUNK, top: Math.min(...tiers.map((t) => t[0])) });
    for (const [y, half] of tiers) boards.push({ x1: cx - half, x2: cx + half, y, unit: u });
  });
  const bottles = stockShelves(r, boards, { unit: 2, y: 130 }, 3, (x, b) => Math.abs(x - (units[b.unit].x + TRUNK / 2)) < 28);

  const archers: { x: number; cover: CoverKind }[] = [
    { x: 455, cover: 'bale' },
    { x: 930, cover: 'barrel' },
    { x: 1415, cover: 'target' },
    { x: 2060, cover: 'barrel' },
    { x: 2400, cover: 'cart' },
    { x: 2870, cover: 'bale' },
    { x: 3300, cover: 'target' },
  ];
  const BALE = { w: 72, h: 34 };
  const bales: Rect[] = [150, 620, 1650, 2700, 3090, ...archers.filter((a) => a.cover === 'bale').map((a) => a.x - BALE.w / 2)].map((x) => ({ x, y: floorY - BALE.h, ...BALE }));
  for (const b of bales) boards.push({ x1: b.x, x2: b.x + b.w, y: b.y, unit: -1 });

  const counter = { x: 3440, y: 420, w: 300, h: 80 }; // the mead stall
  const plush = { x: 1840, y: 450, w: 140, h: 50 }; // the prize booth
  boards.push({ x1: plush.x, x2: plush.x + plush.w, y: plush.y, unit: -1 });

  return {
    id: 'store',
    faire: true,
    width,
    floorY,
    ceilingY: 40,
    solids: [{ x: 0, y: floorY, w: width, h: 40 }, counter],
    boards,
    climbables: [],
    units,
    bottles,
    signs: [],
    start: { x: 1170, y: 130 },
    hole: { x: 1125, y: 60, w: 90, h: 70 },
    plush,
    powerup: { kind: 'shield', x: 3350, y: 440, w: 34, h: 40 },
    rack: { x: 3660, y: 362, w: 44, h: 58 },
    counter,
    door: { x: 3800, y: 400, w: 70, h: 100 },
    bobRoute: [90, 3790],
    lights: [440, 945, 1400, 1930, 2415, 2885, 3280],
    bales,
    archers,
  };
}

/**
 * Night 4: the circus, inside the big top. Bleachers rise toward the tent wall at both ends, two king poles stand in
 * between with a tightrope across their tops, and a cannon in the ring fires you to the far bleachers.
 */
function circusLevel(): Level {
  const r = rng(4);
  const floorY = 500;
  const width = 4200;
  const units: Unit[] = [];
  const boards: Board[] = [];
  // Each bleacher row is its own unit, so its front edge is a step you can hide behind.
  const rows: [number, number, number][] = [
    [40, 640, 420], [40, 550, 340], [40, 460, 260], [40, 370, 180],
    [2900, 3500, 420], [2990, 3500, 340], [3080, 3500, 260], [3170, 3500, 180],
  ];
  for (const [x1, x2, y] of rows) {
    boards.push({ x1, x2, y, unit: units.length });
    units.push({ x: x1, w: x2 - x1, top: y });
  }
  const POLE = 20;
  const poles: [number, [number, number][]][] = [
    [1000, [[410, 70], [320, 65], [230, 65], [130, 80]]], // your cousin is up through the rip above this one
    [2150, [[420, 70], [330, 65], [240, 65], [150, 75]]],
  ];
  const poleUnits: number[] = [];
  for (const [cx, tiers] of poles) {
    poleUnits.push(units.length);
    for (const [y, half] of tiers) boards.push({ x1: cx - half, x2: cx + half, y, unit: units.length });
    units.push({ x: cx - POLE / 2, w: POLE, top: Math.min(...tiers.map((t) => t[0])) });
  }
  const bottles = stockShelves(r, boards, { unit: poleUnits[0], y: 130 }, 4, (x, b) => poleUnits.includes(b.unit) && Math.abs(x - (units[b.unit].x + POLE / 2)) < 22);

  const rope = { x1: 1080, x2: 2075, y: 150 };
  boards.push({ ...rope, unit: -1 });
  const counter = { x: 3640, y: 420, w: 300, h: 80 }; // concessions
  const plush = { x: 2400, y: 450, w: 140, h: 50 }; // a heap of prize animals
  boards.push({ x1: plush.x, x2: plush.x + plush.w, y: plush.y, unit: -1 });

  return {
    id: 'store',
    circus: true,
    width,
    floorY,
    ceilingY: 40,
    solids: [{ x: 0, y: floorY, w: width, h: 40 }, counter],
    boards,
    climbables: [],
    units,
    bottles,
    signs: [],
    start: { x: 1000, y: 130 },
    hole: { x: 955, y: 60, w: 90, h: 70 },
    plush,
    powerup: { kind: 'candy', x: 3570, y: 440, w: 34, h: 40 },
    rack: { x: 3860, y: 362, w: 44, h: 58 },
    counter,
    door: { x: 4090, y: 400, w: 70, h: 100 },
    bobRoute: [90, 4080],
    lights: [330, 1000, 1580, 2150, 2700, 3300, 3800],
    clowns: [[680, 1500], [1650, 2800], [2860, 3600]],
    critters: [
      { kind: 'owl', x: 330, y: 118 },
      { kind: 'snake', x: 800, y: floorY },
      { kind: 'snake', x: 1300, y: floorY },
      { kind: 'eagle', x: 1600, y: 72 },
      { kind: 'owl', x: 2620, y: 300 },
      { kind: 'snake', x: 2760, y: floorY },
      { kind: 'eagle', x: 3420, y: 80 },
    ],
    cannon: { x: 1580, dir: 1, to: { x: 3290, y: 260 } },
    rope,
  };
}

/** Night 1: a small store. Board heights are 90 px apart, about one jump. */
export function storeLevel(seed = 1): Level {
  const r = rng(seed);
  const floorY = 500;
  const { units, boards } = shelving([
    [40, 260, [410, 320, 230, 130]], // back shelf, top board under the hole
    [400, 280, [410, 320, 230, 150]],
    [790, 280, [410, 320, 230]],
    [1180, 260, [410, 320, 230, 150]],
    [1820, 280, [410, 320, 230, 150]],
    [2210, 260, [410, 320, 230]],
  ]);
  const bottles = stockShelves(r, boards, { unit: 0, y: 130 }, 1);

  const counter = { x: 2600, y: 420, w: 220, h: 80 };
  const plush = { x: 1560, y: 450, w: 140, h: 50 };
  boards.push({ x1: plush.x, x2: plush.x + plush.w, y: plush.y, unit: -1 });

  return {
    id: 'store',
    width: 3000,
    floorY,
    ceilingY: 40,
    solids: [
      { x: 0, y: floorY, w: 3000, h: 40 },
      counter,
    ],
    boards,
    climbables: [], // no shelf climbing: you jump up the boards and hop down through them (host, 2026-11-06)
    units,
    bottles,
    signs: [],
    // Scenery in the gaps between shelf units.
    props: [
      { kind: 'barrel', x: 350 },
      { kind: 'plant', x: 735 },
      { kind: 'dolly', x: 1125 },
      { kind: 'cases', x: 1500 },
      { kind: 'mop', x: 1735 },
      { kind: 'wetfloor', x: 1790 },
      { kind: 'crate', x: 2155 },
      { kind: 'plant', x: 2498 },
    ],
    start: { x: 170, y: 130 },
    hole: { x: 130, y: 60, w: 90, h: 70 },
    plush,
    powerup: { kind: 'tote', x: 2530, y: 440, w: 34, h: 40 },
    rack: { x: 2650, y: 362, w: 44, h: 58 },
    counter,
    door: { x: 2900, y: 400, w: 70, h: 100 },
    windows: { x: 2830, y: 150, w: 160, h: 240 },
    scrubberRoute: [360, 2560],
    scrubberStart: 1300,
    bobRoute: [90, 2880],
  };
}
