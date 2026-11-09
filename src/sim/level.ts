// Level geometry. y grows downward; every surface is the y of its top edge.
// The store runs left to right from the back (ceiling hole) to the front
// (counter, door, windows).

import { SPECIALS } from '../config';
import { rng } from './rng';

export type ItemKind = 'mini' | 'regular' | 'golden' | 'rum' | 'curacao';

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
  tote?: Rect;
  rack?: Rect;
  counter?: Rect;
  door?: Rect;
  windows?: Rect;
  scrubberRoute?: [number, number];
  bobRoute?: [number, number]; // back, front
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

/** Night 1: a small store. Board heights are 90 px apart, about one jump. */
export function storeLevel(seed = 1): Level {
  const r = rng(seed);
  const floorY = 500;
  const units: Unit[] = [];
  const boards: Board[] = [];
  const addUnit = (x: number, w: number, ys: number[]) => {
    const u = units.length;
    units.push({ x, w, top: Math.min(...ys) });
    for (const y of ys) boards.push({ x1: x, x2: x + w, y, unit: u });
  };
  addUnit(40, 260, [410, 320, 230, 130]); // back shelf, top board under the hole
  addUnit(400, 280, [410, 320, 230, 150]);
  addUnit(790, 280, [410, 320, 230]);
  addUnit(1180, 260, [410, 320, 230, 150]);
  addUnit(1820, 280, [410, 320, 230, 150]);
  addUnit(2210, 260, [410, 320, 230]);

  const bottles: BottleDef[] = [];
  boards.forEach((b, i) => {
    if (b.unit === 0 && b.y === 130) return; // the hand-up board stays clear
    for (let x = b.x1 + 24; x < b.x2 - 16; x += 30) {
      if (r() < 0.3) continue;
      bottles.push({ x, y: b.y, kind: r() < 0.3 ? 'mini' : 'regular', board: i });
    }
  });
  // A few special bottles, swapped in for regular ones anywhere but the back shelf.
  for (const [kind, n] of Object.entries(SPECIALS) as [ItemKind, number][]) {
    for (let k = 0; k < n; k++) {
      const pool = bottles.filter((b) => b.kind === 'regular' && boards[b.board].unit > 0);
      pool[Math.floor(r() * pool.length)].kind = kind;
    }
  }

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
    tote: { x: 2530, y: 440, w: 34, h: 40 },
    rack: { x: 2650, y: 362, w: 44, h: 58 },
    counter,
    door: { x: 2900, y: 400, w: 70, h: 100 },
    windows: { x: 2830, y: 150, w: 160, h: 240 },
    scrubberRoute: [360, 2560],
    bobRoute: [90, 2880],
  };
}
