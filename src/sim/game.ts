// Night 1 simulation. Fixed 60 Hz step, seeded randomness, no DOM: the render
// and audio layers read state and the per-step `events` list.

import {
  BOB, BUZZ, DT, FALL, FLOW, GRADES, HIT, KNOCKDOWN, LOOT, MESS_FACTOR, NAG_EVERY, NIGHT, PRINTS, RACCOON, RACK, RING, SCRUBBER,
  SEA_LEGS, THROW, TILE_MESS,
} from '../config';
import { crawlLevel, roofLevel, storeLevel, type ItemKind, type Level, type Rect } from './level';
import { rng } from './rng';

export interface Input {
  left: boolean; right: boolean; up: boolean; down: boolean;
  jump: boolean; grab: boolean; throw: boolean; swap: boolean; hoot: boolean;
}
export const NO_INPUT: Input = {
  left: false, right: false, up: false, down: false, jump: false, grab: false, throw: false, swap: false, hoot: false,
};

export type Phase = 'roof' | 'crawl' | 'store' | 'over';
export type Who = 'cousin' | 'bob' | 'raccoon' | 'scrubber';
export type EndReason = 'climbed' | 'bob' | 'dawn' | 'sore';

export type SimEvent =
  | { type: 'smash'; x: number; y: number; kind: ItemKind | 'tile'; mess: number }
  | { type: 'ring'; x: number; y: number; r: number }
  | { type: 'say'; who: Who; text: string }
  | { type: 'bank'; value: number }
  | { type: 'caught'; reason: EndReason }
  | {
      type:
        | 'jump' | 'land' | 'grab' | 'sip' | 'hiccupWarn' | 'hiccup' | 'slip' | 'hit' | 'vent' | 'wires'
        | 'door' | 'shout' | 'mutter' | 'lost' | 'beep' | 'slurp' | 'spin' | 'golden' | 'tote'
        | 'playDead' | 'escaped' | 'throw' | 'roll' | 'bonk' | 'hoot' | 'swap' | 'seaLegs' | 'bluePaws' | 'ko' | 'knock';
    };

export interface Raccoon {
  x: number; // centre
  y: number; // feet
  vx: number;
  vy: number;
  w: number;
  h: number;
  facing: 1 | -1;
  grounded: boolean;
  ground: 'solid' | number | null; // board index when standing on a board
  climbing: boolean;
  dropBoard: number; // the board you hopped down through, ignored until you're below it; -1 for none
  state: 'move' | 'sip' | 'spin' | 'playdead' | 'hoot' | 'ko';
  stateT: number;
  hiddenOk: boolean; // dove into the plush unseen
  health: number;
  buzz: number;
  buzzT: number;
  hiccupT: number;
  hiccups: number;
  cheeks: boolean;
  carry: ItemKind[];
  ready: number; // index into carry: the item Throw uses when no shelf bottle is highlighted
  cap: number;
  invuln: number;
  gripT: number; // can't grab a shelf again until this runs out (after a hiccup, slip or hit)
  aimT: number | null; // holding Throw for a lob: how long the arc has been charging
  seaLegs: number; // s left of the rum captain's sea legs
  blueT: number; // s left of leaving blue paw prints
  printDist: number;
  peakY: number; // highest point since you last stood or climbed, to measure a fall
}

/**
 * A bottle on a shelf, in the air (knocked, dropped, lobbed), or rolling along
 * a shelf or the floor. Airborne bottles pass through shelf boards.
 */
export interface Bottle {
  id: number; x: number; y: number; kind: ItemKind; board: number;
  state: 'shelf' | 'air' | 'rolling' | 'gone';
  vx: number; vy: number;
  safeT: number; // can't hit the raccoon yet (it just launched this one)
  lane?: { x1: number; x2: number; y: number; board: number }; // what a rolling bottle rolls on
}
export interface Spill { id: number; x: number; y: number; kind: ItemKind; x0: number; flow: number }
export interface Print { x: number; y: number; age: number; facing: 1 | -1 }
export interface Ring { x: number; y: number; r: number; age: number }
export interface Say { who: Who; text: string; ttl: number }

export interface Bob {
  state: 'outside' | 'search' | 'investigate' | 'look' | 'shout' | 'chase' | 'confused' | 'down';
  x: number;
  dir: 1 | -1;
  goal: 0 | 1; // 0 = heading to the back, 1 = heading to the front
  t: number;
  sweepT: number;
  beam: number; // radians above horizontal, in the direction he faces
  lostT: number;
  target: number;
  mutterCd: number;
  wasChasing: boolean; // knocked down mid-chase: he gets up still chasing
}

export interface Scrubber {
  x: number; dir: 1 | -1; state: 'patrol' | 'rush' | 'slurp' | 'down'; target: number; t: number; beepT: number;
  spill: number; // id of the spill it's chasing, or 0
}

export interface Result {
  escaped: boolean;
  reason: EndReason;
  banked: number;
  mess: number;
  paws: number;
  coins: number;
  score: number;
  par: number;
  share: number; // 0..1 of the store's stock you got away with
  grade: string;
  kept: { mess: number; items: number; coins: number } | null;
  time: number;
}

/** What an airborne bottle runs into, checked in this order. */
type AirHit =
  | { what: 'raccoon' }
  | { what: 'bob' }
  | { what: 'scrubber' }
  | { what: 'display'; y: number }
  | { what: 'solid'; y: number };

export function multFor(step: number): number {
  return 1 + BUZZ.perStep * step;
}

export function gradeFor(score: number, par: number): string {
  for (const g of GRADES) if (score >= g.at * par) return g.name;
  return GRADES[GRADES.length - 1].name;
}

const CHEERS = ['Chrr-chrr! Smash it!', 'Ha! Lovely crash!', 'Chrrrr! Again!', 'Ooh, that was a good one!'];
const SCOLDS = ['Chrr! Wasted!', 'Nooo, the good stuff!', 'Chrr… what a waste.'];
const NAGS = ["Pssst! Don't smash ALL the merchandise!", 'Pssst. Those go in the bag, not on the floor.', "Psst! We can't sell puddles, cuz!"];
const BIG: ItemKind[] = ['regular', 'golden', 'rum', 'curacao'];

export class Game {
  phase: Phase;
  level: Level;
  t = 0; // night clock, starts at the tile crash
  tick = 0;
  rand: () => number;
  raccoon: Raccoon;
  bottles: Bottle[] = [];
  spills: Spill[] = [];
  prints: Print[] = [];
  rings: Ring[] = [];
  says: Say[] = [];
  events: SimEvent[] = [];
  bob: Bob;
  scrub: Scrubber;
  mess = 0;
  banked = 0;
  stock = 0; // what everything on the shelves and the rack is worth at opening (no Buzz multiplier)
  taken = 0; // the same measure, for what you've handed up
  wiresChewed = false;
  powerOut = false;
  toteTaken = false;
  rack = { stock: RACK.stock, spin: 0 };
  plushGlow = 0;
  plushPuff = 0;
  shake = 0;
  result: Result | null = null;
  private prev: Input = NO_INPUT;
  private nextId = 1;
  private sayCd: Record<Who, number> = { cousin: 0, bob: 0, raccoon: 0, scrubber: 0 };
  private dawnWarned = false;
  private smashRun = 0; // bottles smashed since the last hand-up

  constructor(opts: { seed?: number; start?: 'roof' | 'store' } = {}) {
    this.rand = rng(opts.seed ?? 1);
    this.raccoon = {
      x: 0, y: 0, vx: 0, vy: 0, w: RACCOON.w, h: RACCOON.h, facing: 1, grounded: false, ground: null,
      climbing: false, dropBoard: -1, state: 'move', stateT: 0, hiddenOk: false, health: RACCOON.health,
      buzz: 0, buzzT: 0, hiccupT: 0, hiccups: 0, cheeks: false, carry: [], ready: 0, cap: RACCOON.carry, invuln: 0,
      gripT: 0, aimT: null, seaLegs: 0, blueT: 0, printDist: 0, peakY: 0,
    };
    this.bob = {
      state: 'outside', x: 0, dir: -1, goal: 0, t: 0, sweepT: 0, beam: 0, lostT: 0, target: 0, mutterCd: 0,
      wasChasing: false,
    };
    this.scrub = { x: 0, dir: 1, state: 'patrol', target: 0, t: 0, beepT: 4, spill: 0 };
    this.phase = 'roof';
    this.level = roofLevel();
    if (opts.start === 'store') {
      this.wiresChewed = true;
      this.powerOut = true;
      this.enterStore();
    } else {
      this.place(this.level.start.x, this.level.start.y);
    }
  }

  get mult(): number {
    return multFor(this.raccoon.buzz);
  }
  get capacity(): number {
    return this.raccoon.cap;
  }
  /** Points you'd lose if caught right now: Mess plus what's in your paws at today's Buzz. */
  get atRisk(): number {
    return this.mess + this.carryValue() * this.mult;
  }
  get over(): boolean {
    return this.phase === 'over';
  }
  get bobInside(): boolean {
    return this.phase === 'store' && this.bob.state !== 'outside';
  }
  /** Buzz steps that still make you wobble: none while you have sea legs. */
  get wobble(): number {
    return this.raccoon.seaLegs > 0 ? 0 : this.raccoon.buzz;
  }

  carryValue(): number {
    return this.raccoon.carry.reduce((s, k) => s + LOOT[k], 0);
  }

  step(input: Input): void {
    this.events = [];
    if (this.phase === 'over') return;
    const pressed = (k: keyof Input) => input[k] && !this.prev[k];
    const edge: Edges = {
      jump: pressed('jump'), grab: pressed('grab'), up: pressed('up'), down: pressed('down'),
      throw: pressed('throw'), swap: pressed('swap'), hoot: pressed('hoot'),
    };
    this.prev = { ...input };
    this.tick++;
    const dt = DT;

    if (this.phase === 'store') this.t += dt;
    this.updateRaccoon(input, edge, dt);
    if (this.over) return;
    if (this.phase === 'store') {
      this.updateBottles(dt);
      if (this.over) return;
      this.updateSpills(dt);
      this.updateScrubber(dt);
      this.updateBob(dt);
      if (this.over) return;
      if (!this.dawnWarned && this.t >= NIGHT.length - 30) {
        this.dawnWarned = true;
        this.say('cousin', "Sky's getting light! Get up here!", 3.5);
      }
      if (this.t >= NIGHT.length) {
        this.end(false, 'dawn');
        return;
      }
    }
    for (const r of this.rings) r.age += dt;
    this.rings = this.rings.filter((r) => r.age < 0.9);
    for (const p of this.prints) p.age += dt;
    this.prints = this.prints.filter((p) => p.age < PRINTS.life);
    for (const s of this.says) s.ttl -= dt;
    this.says = this.says.filter((s) => s.ttl > 0);
    for (const k of Object.keys(this.sayCd) as Who[]) this.sayCd[k] -= dt;
    this.plushGlow = Math.max(0, this.plushGlow - dt);
    this.plushPuff = Math.max(0, this.plushPuff - dt);
    this.shake = Math.max(0, this.shake - dt * 3);
  }

  /* ------------------------------------------------------------ raccoon */

  private updateRaccoon(input: Input, edge: Edges, dt: number) {
    const R = this.raccoon;
    const L = this.level;
    R.invuln = Math.max(0, R.invuln - dt);
    R.gripT = Math.max(0, R.gripT - dt);
    R.seaLegs = Math.max(0, R.seaLegs - dt);
    R.blueT = Math.max(0, R.blueT - dt);
    this.updateBuzz(dt);

    if (R.state === 'sip' || R.state === 'spin' || R.state === 'hoot' || R.state === 'ko') {
      R.stateT -= dt;
      if (R.state === 'spin') this.rack.spin = Math.max(0, R.stateT);
      if (R.stateT <= 0) {
        if (R.state === 'spin') this.finishSpin();
        if (R.state === 'ko') this.say('raccoon', '…ow.', 1.2);
        R.state = 'move';
      }
    } else if (R.state === 'playdead') {
      if (input.left || input.right || edge.jump || edge.up) {
        R.state = 'move';
        R.hiddenOk = false;
      }
    }

    // Holding Throw charges a lob; letting go throws it.
    if (R.aimT !== null) {
      if (input.throw && R.state === 'move') R.aimT += dt;
      else {
        if (R.state === 'move') this.lob();
        R.aimT = null;
      }
    }

    const step = R.buzz;
    const wob = this.wobble;
    const speed = RACCOON.runSpeed * (1 - BUZZ.speedLoss * step);
    const control = Math.max(0.2, 1 - BUZZ.controlLoss * wob);
    const free = R.state === 'move' && R.aimT === null;
    const dir = free ? (input.right ? 1 : 0) - (input.left ? 1 : 0) : 0;
    if (dir) R.facing = dir as 1 | -1;

    // Interactions first, so Grab/Throw/Up/Down act on what you're standing at.
    if (free && edge.grab) this.grab();
    if (free && edge.throw) this.startThrow(input);
    if (free && edge.swap) this.swap();
    if (free && edge.hoot) this.hoot();
    if (free && edge.up && !input.throw && this.atHole()) {
      this.end(true, 'climbed');
      return;
    }
    const onPlush = this.onPlush();
    if (free && edge.down && !input.throw && onPlush) this.playDead();
    // Down on a shelf board hops you down through it to the board (or floor) below.
    else if (free && edge.down && !input.throw && R.grounded && typeof R.ground === 'number' && !this.climbableAt()) {
      R.dropBoard = R.ground;
      R.vy = -RACCOON.dropHop;
      R.grounded = false;
      R.ground = null;
      this.emit({ type: 'jump' });
    }

    // Climbing: hold Up against a shelf (or the trellis). Down climbs down.
    const climb = this.climbableAt();
    if (R.state === 'move' && R.aimT === null && !input.throw && R.gripT <= 0) {
      if (climb && input.up && R.y > climb.y + 0.5) R.climbing = true;
      else if (climb && input.down && !onPlush && (R.grounded ? R.ground !== 'solid' : true) && R.y < climb.y + climb.h - 1) R.climbing = true;
      if (R.climbing && (!climb || (!input.up && !input.down))) R.climbing = false;
    } else R.climbing = false;

    if (R.climbing && climb) {
      R.vy = input.up ? -RACCOON.climbSpeed * (1 - 0.06 * step) : RACCOON.climbSpeed * 1.3;
      R.vx = dir * speed * 0.45;
      R.grounded = false;
      if (input.up && wob >= BUZZ.slipFrom && this.rand() < BUZZ.slipPerSec * dt) {
        R.climbing = false;
        R.vy = 80;
        R.gripT = 0.5;
        this.emit({ type: 'slip' });
        this.say('raccoon', 'Whoops—', 1.2);
      }
    } else {
      const target = dir * speed;
      const a = (dir !== 0 ? RACCOON.accel : RACCOON.decel) * control * (R.grounded ? 1 : RACCOON.airControl);
      if (R.vx < target) R.vx = Math.min(target, R.vx + a * dt);
      else if (R.vx > target) R.vx = Math.max(target, R.vx - a * dt);
      R.vy = Math.min(RACCOON.maxFall, R.vy + RACCOON.gravity * dt);
      if (free && edge.jump && R.grounded) {
        R.vy = -RACCOON.jumpSpeed;
        R.vx *= 1 + 0.1 * wob; // drunk jumps overshoot
        R.grounded = false;
        this.emit({ type: 'jump' });
      }
    }
    if (R.state !== 'move') R.vx *= 0.8;

    this.hiccups(dt);
    const x0 = R.x;
    this.integrate(dt);
    if (L.id === 'store') {
      this.bumpBottles();
      this.pawPrints(Math.abs(R.x - x0));
    }
    if (L.id === 'crawl' && this.wiresChewed && L.tile && R.grounded && R.x > L.tile.x && R.x < L.tile.x + L.tile.w) {
      this.enterStore();
    }
  }

  private updateBuzz(dt: number) {
    const R = this.raccoon;
    if (R.buzz <= 0) return;
    R.buzzT += dt;
    if (R.buzzT >= BUZZ.wearOff) {
      R.buzz--;
      R.buzzT = 0;
    }
  }

  private setBuzz(n: number) {
    const R = this.raccoon;
    const before = R.buzz;
    R.buzz = Math.max(0, Math.min(BUZZ.steps, n));
    R.buzzT = 0;
    if (before < BUZZ.hiccupFrom && R.buzz >= BUZZ.hiccupFrom) R.hiccupT = this.hiccupGap();
  }

  private hiccupGap(): number {
    const [lo, hi] = BUZZ.hiccupEvery;
    const shrink = 1 - 0.15 * Math.max(0, this.raccoon.buzz - BUZZ.hiccupFrom);
    return (lo + this.rand() * (hi - lo)) * shrink;
  }

  private hiccups(dt: number) {
    const R = this.raccoon;
    if (R.buzz < BUZZ.hiccupFrom) {
      R.cheeks = false;
      return;
    }
    const wasCheeks = R.cheeks;
    R.hiccupT -= dt;
    R.cheeks = R.hiccupT <= BUZZ.hiccupWarn;
    if (R.cheeks && !wasCheeks) this.emit({ type: 'hiccupWarn' });
    if (R.hiccupT > 0) return;
    R.hiccupT = this.hiccupGap();
    R.cheeks = false;
    R.hiccups++;
    this.emit({ type: 'hiccup' });
    if (R.state === 'playdead') {
      // A hiccup gives you away if his beam is on you.
      if (R.hiddenOk && this.bobInside && this.bob.state !== 'chase' && this.seen(true)) {
        R.hiddenOk = false;
        this.spot();
      }
      return;
    }
    if (R.state !== 'move') return;
    R.climbing = false;
    R.gripT = 0.45;
    R.vy = -BUZZ.hiccupHop;
    R.grounded = false;
    // Hiccup lob: now and then the hop pops your top bottle out in a high, wobbly arc.
    if (this.phase === 'store' && R.carry.length && R.hiccups % BUZZ.hiccupLobEvery === 0) {
      const kind = R.carry.pop()!;
      this.fixReady();
      const v = this.lobSpeed(150 + this.rand() * 200, 1.2);
      this.launch(kind, R.x + R.facing * 8, R.y - R.h, R.facing * v * Math.cos(1.2), -v * Math.sin(1.2) - BUZZ.hiccupHop * 0.5);
      this.say('cousin', 'Chrr! Butterpaws!', 1.6);
    }
  }

  private solids(): Rect[] {
    const L = this.level;
    return L.wires && !this.wiresChewed ? [...L.solids, L.wires] : L.solids;
  }

  private integrate(dt: number) {
    const R = this.raccoon;
    const L = this.level;
    const solids = this.solids();
    const wasGrounded = R.grounded;
    const climbBefore = this.climbableAt();
    if (R.grounded || R.climbing) R.peakY = R.y;

    R.x += R.vx * dt;
    for (const s of solids) {
      if (R.y - R.h < s.y + s.h && R.y > s.y + 0.5 && R.x + R.w / 2 > s.x && R.x - R.w / 2 < s.x + s.w) {
        if (R.x < s.x + s.w / 2) R.x = s.x - R.w / 2;
        else R.x = s.x + s.w + R.w / 2;
        R.vx = 0;
      }
    }
    R.x = Math.max(R.w / 2, Math.min(L.width - R.w / 2, R.x));

    const prevFeet = R.y;
    const prevHead = R.y - R.h;
    R.y += R.vy * dt;
    R.grounded = false;
    R.ground = null;
    for (const s of solids) {
      if (R.x + R.w / 2 <= s.x || R.x - R.w / 2 >= s.x + s.w) continue;
      if (R.y > s.y && prevFeet <= s.y + 0.5 && R.vy >= 0) {
        R.y = s.y;
        R.vy = 0;
        R.grounded = true;
        R.ground = 'solid';
      } else if (R.y - R.h < s.y + s.h && prevHead >= s.y + s.h - 0.5 && R.vy < 0) {
        R.y = s.y + s.h + R.h;
        R.vy = 0;
      }
    }
    if (R.dropBoard >= 0 && prevFeet > L.boards[R.dropBoard].y + 2) R.dropBoard = -1; // already below it
    if (!R.climbing && R.vy >= 0) {
      L.boards.forEach((b, i) => {
        if (i === R.dropBoard || R.x < b.x1 || R.x > b.x2) return;
        if (prevFeet <= b.y + 0.5 && R.y >= b.y) {
          R.y = b.y;
          R.vy = 0;
          R.grounded = true;
          R.ground = i;
        }
      });
    }
    // Reaching the top of what you're climbing puts you on its top board.
    const climb = climbBefore;
    if (R.climbing && climb && R.vy < 0 && R.y <= climb.y) {
      R.y = climb.y;
      R.vy = 0;
      R.climbing = false;
      R.grounded = true;
      R.ground = L.boards.findIndex((b) => b.y === climb.y && R.x >= b.x1 && R.x <= b.x2);
    }
    if (L.ceilingY > 0 && R.y - R.h < L.ceilingY) {
      R.y = L.ceilingY + R.h;
      if (R.vy < 0) R.vy = 0;
    }
    if (R.climbing && R.vy > 0 && R.ground === 'solid') R.climbing = false;
    if (R.grounded) R.dropBoard = -1;
    if (!R.grounded) R.peakY = Math.min(R.peakY, R.y);
    if (R.grounded && !wasGrounded) {
      this.emit({ type: 'land' });
      if (R.y - R.peakY >= FALL.koHeight) this.knockOut();
    }
  }

  /** A fall from the high shelves knocks you out for a few seconds and costs health. */
  private knockOut() {
    const R = this.raccoon;
    if (this.phase !== 'store') return;
    R.health = Math.max(0, R.health - FALL.damage);
    R.state = 'ko';
    R.stateT = FALL.koTime;
    R.aimT = null;
    R.climbing = false;
    R.hiddenOk = false;
    this.shake = Math.max(this.shake, 0.6);
    this.emit({ type: 'ko' });
    this.say('cousin', 'Chrr! You okay down there?', 2);
    if (R.health <= 0) this.end(false, 'sore');
  }

  private climbableAt(): Rect | null {
    const R = this.raccoon;
    for (const c of this.level.climbables) {
      if (R.x >= c.x && R.x <= c.x + c.w && R.y >= c.y - 0.5 && R.y <= c.y + c.h + 0.5) return c;
    }
    return null;
  }

  atHole(): boolean {
    const R = this.raccoon;
    const h = this.level.hole;
    if (!h || !R.grounded || typeof R.ground !== 'number') return false;
    const b = this.level.boards[R.ground];
    return b.unit === 0 && b.y === h.y + h.h && R.x >= h.x && R.x <= h.x + h.w;
  }

  onPlush(): boolean {
    const R = this.raccoon;
    const p = this.level.plush;
    if (!p || !R.grounded || typeof R.ground !== 'number') return false;
    const b = this.level.boards[R.ground];
    return b.y === p.y && b.x1 === p.x;
  }

  private onFloorLevel(y: number): boolean {
    return this.raccoon.grounded && Math.abs(this.raccoon.y - y) < 1;
  }

  /** Blue curaçao: step in its spill and you leave glowing paw prints for a while. */
  private pawPrints(moved: number) {
    const R = this.raccoon;
    if (!R.grounded) return;
    if (this.spills.some((s) => s.kind === 'curacao' && Math.abs(s.y - R.y) < 1 && Math.abs(s.x - R.x) < 22)) {
      if (R.blueT <= 0) {
        this.emit({ type: 'bluePaws' });
        this.say('raccoon', 'Ooh, glowy feet.', 1.6);
      }
      R.blueT = PRINTS.time;
    }
    if (R.blueT <= 0) return;
    R.printDist += moved;
    if (R.printDist >= PRINTS.every) {
      R.printDist = 0;
      this.prints.push({ x: R.x, y: R.y, age: 0, facing: R.facing });
    }
  }

  /* --------------------------------------------------------------- grab */

  /** On a shelf, the nearest bottle in front of you. Grab takes it, Throw throws it. */
  highlighted(): Bottle | null {
    const R = this.raccoon;
    if (R.state !== 'move' || !R.grounded || typeof R.ground !== 'number') return null;
    return (
      this.bottles
        .filter((b) => b.state === 'shelf' && b.board === R.ground)
        .map((b) => ({ b, d: (b.x - R.x) * R.facing }))
        .filter(({ d }) => d > -6 && d < RACCOON.reach + 12)
        .sort((p, q) => p.d - q.d)[0]?.b ?? null
    );
  }

  private grab() {
    const R = this.raccoon;
    const L = this.level;
    const front = R.x + R.facing * RACCOON.reach;

    if (L.vent && this.near(L.vent, front)) {
      this.emit({ type: 'vent' });
      this.level = crawlLevel();
      this.phase = 'crawl';
      this.place(this.level.start.x, this.level.start.y);
      return;
    }
    if (L.wires && !this.wiresChewed && this.near(L.wires, front, 20)) {
      this.wiresChewed = true;
      this.powerOut = true;
      this.emit({ type: 'wires' });
      this.say('raccoon', '*crunch* …lights out.', 2.4);
      return;
    }
    if (this.atHole() && R.carry.length) {
      const value = this.carryValue() * this.mult;
      this.banked += value;
      this.taken += this.carryValue();
      this.smashRun = 0;
      R.carry = [];
      this.fixReady();
      this.emit({ type: 'bank', value });
      this.say('cousin', value >= 15 ? 'Chrrr! Jackpot!' : 'Got it! Go get more!', 2);
      return;
    }
    if (L.rack && this.rack.stock > 0 && L.counter && this.onFloorLevel(L.counter.y) && this.near(L.rack, R.x, 26)) {
      if (R.carry.length >= R.cap) return this.say('raccoon', 'Paws full.', 1.2);
      R.state = 'spin';
      R.stateT = RACK.spinTime;
      this.rack.spin = RACK.spinTime;
      this.emit({ type: 'spin' });
      return;
    }
    if (L.tote && !this.toteTaken && this.onFloorLevel(L.floorY) && this.near(L.tote, R.x, 22)) {
      this.toteTaken = true;
      R.cap += RACCOON.toteExtra;
      this.emit({ type: 'tote' });
      this.say('raccoon', 'Tote bag! Room for three more.', 2.2);
      return;
    }
    const spill = this.spills
      .filter((s) => this.onFloorLevel(s.y) && Math.abs(s.x - R.x) < 32)
      .sort((a, b) => Math.abs(a.x - R.x) - Math.abs(b.x - R.x))[0];
    if (spill) {
      this.spills = this.spills.filter((s) => s !== spill);
      this.setBuzz(R.buzz + 1);
      R.state = 'sip';
      R.stateT = 0.55;
      this.emit({ type: 'sip' });
      if (spill.kind === 'rum') {
        R.seaLegs = SEA_LEGS;
        this.emit({ type: 'seaLegs' });
        this.say('raccoon', 'Aye aye, Captain! Sea legs!', 2);
      }
      return;
    }
    const b = this.highlighted();
    if (b) {
      if (R.carry.length >= R.cap) return this.say('raccoon', 'Paws full.', 1.2);
      b.state = 'gone';
      R.carry.push(b.kind);
      R.ready = R.carry.length - 1;
      this.emit({ type: 'grab' });
    }
  }

  private near(r: Rect, x: number, pad = 12): boolean {
    const R = this.raccoon;
    return x >= r.x - pad && x <= r.x + r.w + pad && R.y >= r.y - 4 && R.y - R.h <= r.y + r.h + 4;
  }

  private finishSpin() {
    const kind: ItemKind = this.rand() < RACK.goldenChance ? 'golden' : 'mini';
    this.rack.stock--;
    this.raccoon.carry.push(kind);
    this.raccoon.ready = this.raccoon.carry.length - 1;
    this.emit({ type: kind === 'golden' ? 'golden' : 'grab' });
    if (kind === 'golden') this.say('cousin', 'CHRRR! The golden one!', 2.4);
  }

  private playDead() {
    const R = this.raccoon;
    R.state = 'playdead';
    R.vx = 0;
    R.climbing = false;
    this.emit({ type: 'playDead' });
    // If he's looking right at you as you dive in, it doesn't work.
    R.hiddenOk = !(this.bobInside && this.seen(true));
    if (!R.hiddenOk && this.bob.state !== 'chase' && this.bob.state !== 'shout') this.spot();
  }

  private swap() {
    const R = this.raccoon;
    if (R.carry.length < 2) return;
    R.ready = (R.ready + 1) % R.carry.length;
    this.emit({ type: 'swap' });
  }

  private fixReady() {
    const R = this.raccoon;
    R.ready = Math.max(0, Math.min(R.carry.length - 1, R.ready));
  }

  /** Hoot: blow across a carried bottle. Costs nothing, and pulls everyone to you. */
  private hoot() {
    const R = this.raccoon;
    if (!R.carry.length || this.phase !== 'store') return;
    R.state = 'hoot';
    R.stateT = 0.8;
    R.climbing = false;
    this.emit({ type: 'hoot' });
    this.ring(R.x, R.y - R.h / 2, RING.hoot);
  }

  /* ------------------------------------------------------------- throws */

  /**
   * Throw uses the highlighted shelf bottle, or else your ready item.
   * Throw + Down drops it, Throw + forward rolls it, and Throw (+ Up) starts a
   * lob that flies when you let go.
   */
  private startThrow(input: Input) {
    const R = this.raccoon;
    if (this.phase !== 'store' || !R.grounded || R.climbing) return;
    if (!this.highlighted() && !R.carry.length) return;
    if (input.down) this.drop();
    else if (input.left || input.right) this.roll();
    else R.aimT = 0;
  }

  /** Take the bottle a throw will use. Shelf bottles are reused; carried ones become new bottles. */
  private takeForThrow(): Bottle | null {
    const R = this.raccoon;
    const shelf = this.highlighted();
    if (shelf) return shelf;
    if (!R.carry.length) return null;
    this.fixReady();
    const kind = R.carry.splice(R.ready, 1)[0];
    this.fixReady();
    const b: Bottle = { id: this.nextId++, x: R.x + R.facing * 12, y: R.y - 18, kind, board: -1, state: 'gone', vx: 0, vy: 0, safeT: 0 };
    this.bottles.push(b);
    return b;
  }

  private drop() {
    const b = this.takeForThrow();
    if (!b) return;
    b.state = 'air';
    b.vx = 0;
    b.vy = 0;
    b.safeT = THROW.selfSafe;
    this.emit({ type: 'throw' });
  }

  private roll() {
    const R = this.raccoon;
    const b = this.takeForThrow();
    if (!b) return;
    const L = this.level;
    if (b.board >= 0) {
      const bd = L.boards[b.board];
      b.lane = { x1: bd.x1, x2: bd.x2, y: bd.y, board: b.board };
    } else if (typeof R.ground === 'number') {
      const bd = L.boards[R.ground];
      b.lane = { x1: bd.x1, x2: bd.x2, y: bd.y, board: R.ground };
    } else {
      const s = this.solids().find((s) => s.y === R.y && R.x >= s.x && R.x <= s.x + s.w)!;
      b.lane = { x1: s.x, x2: s.x + s.w, y: s.y, board: -1 };
    }
    b.y = b.lane.y;
    b.state = 'rolling';
    b.vx = R.facing * THROW.rollSpeed;
    b.vy = 0;
    this.emit({ type: 'roll' });
  }

  private lob() {
    const L = this.lobLaunch();
    if (!L) return;
    const b = this.takeForThrow();
    if (!b) return;
    Object.assign(b, { x: L.x, y: L.y, vx: L.vx, vy: L.vy, state: 'air', safeT: THROW.selfSafe });
    this.emit({ type: 'throw' });
  }

  private lobSpeed(dist: number, angle = THROW.lobAngle): number {
    return Math.sqrt((dist * RACCOON.gravity) / Math.sin(2 * angle));
  }

  /** Where a lob would leave your paws, and how fast, if you let go now. */
  lobLaunch(): { x: number; y: number; vx: number; vy: number } | null {
    const R = this.raccoon;
    if (R.aimT === null) return null;
    const k = (R.aimT / THROW.chargePeriod) % 2;
    const charge = k < 1 ? k : 2 - k;
    const dist = THROW.lobMin + (THROW.lobMax - THROW.lobMin) * charge;
    const v = this.lobSpeed(dist);
    const angle = THROW.lobAngle + Math.sin(this.tick * DT * 2.3) * BUZZ.armSway * this.wobble;
    return { x: R.x + R.facing * 12, y: R.y - 20, vx: R.facing * v * Math.cos(angle), vy: -v * Math.sin(angle) };
  }

  /** The dotted aiming arc: the same flight the sim will fly, to where it lands. */
  lobPath(): { x: number; y: number }[] {
    const l = this.lobLaunch();
    if (!l) return [];
    let { x, y, vx, vy } = l;
    const pts = [{ x, y }];
    for (let i = 1; i < 240; i++) {
      const py = y;
      vy = Math.min(RACCOON.maxFall, vy + RACCOON.gravity * DT);
      x += vx * DT;
      y += vy * DT;
      if (y < this.level.ceilingY) vy = Math.abs(vy) * 0.3;
      if (i % 3 === 0) pts.push({ x, y });
      const hit = this.airHit(x, py, y, 1);
      if (hit || x < 0 || x > this.level.width) {
        pts.push({ x, y: hit && 'y' in hit ? hit.y : y });
        break;
      }
    }
    return pts;
  }

  private launch(kind: ItemKind, x: number, y: number, vx: number, vy: number) {
    this.bottles.push({ id: this.nextId++, x, y, kind, board: -1, state: 'air', vx, vy, safeT: THROW.selfSafe });
  }

  /* ------------------------------------------------------------ bottles */

  private bumpBottles() {
    const R = this.raccoon;
    if (R.state !== 'move' || Math.abs(R.vx) < RACCOON.bumpSpeed) return;
    const dir = Math.sign(R.vx);
    for (const b of this.bottles) {
      if (b.state !== 'shelf') continue;
      const tall = b.kind === 'regular' || b.kind === 'rum' || b.kind === 'curacao';
      const bw = tall ? 7 : 5;
      const bh = tall ? 26 : 16;
      if (R.x + R.w / 2 < b.x - bw || R.x - R.w / 2 > b.x + bw) continue;
      if (R.y - R.h > b.y || R.y < b.y - bh) continue;
      if ((b.x - R.x) * dir < -4) continue;
      this.knock(b, dir);
      return; // a bump only ever knocks off one
    }
  }

  private knock(b: Bottle, dir: number) {
    b.state = 'air';
    b.safeT = THROW.selfSafe;
    b.vx = dir * (50 + this.rand() * 90);
    b.vy = -120 - this.rand() * 80;
    this.emit({ type: 'knock' });
  }

  private updateBottles(dt: number) {
    for (const b of this.bottles) {
      if (b.state === 'air') this.fly(b, dt);
      else if (b.state === 'rolling') this.rollOn(b, dt);
      if (this.over) return;
    }
    this.bottles = this.bottles.filter((b) => b.state !== 'gone');
  }

  private fly(b: Bottle, dt: number) {
    b.safeT = Math.max(0, b.safeT - dt);
    b.vy = Math.min(RACCOON.maxFall, b.vy + RACCOON.gravity * dt);
    const prev = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y < this.level.ceilingY) b.vy = Math.abs(b.vy) * 0.3;
    if (b.x < 0 || b.x > this.level.width) b.vx = -b.vx * 0.4;
    const hit = this.airHit(b.x, prev, b.y, b.safeT);
    if (!hit) return;
    // A bottle that hits someone or something damages it; one that hits nothing makes noise.
    switch (hit.what) {
      case 'raccoon':
        this.smash(b, this.surfaceBelow(b.x, b.y), 0);
        this.hit(b.vx >= 0 ? 1 : -1);
        break;
      case 'bob':
        this.smash(b, this.surfaceBelow(b.x, b.y), 0);
        this.knockBob();
        break;
      case 'scrubber':
        this.smash(b, this.surfaceBelow(b.x, b.y), 0);
        this.knockScrubber();
        break;
      case 'display':
        this.plushPuff = 0.8;
        this.smash(b, this.surfaceBelow(b.x, b.y), RING.biggest, hit.y);
        this.say('cousin', 'Chrrr! Right in the display!', 2);
        break;
      case 'solid':
        this.smash(b, hit.y);
        break;
    }
  }

  /** What an airborne bottle moving from y0 to y1 at x runs into, if anything. */
  private airHit(x: number, y0: number, y1: number, safeT: number): AirHit | null {
    const L = this.level;
    const R = this.raccoon;
    const inside = (rx: number, ry: number, rw: number, rh: number) => x >= rx && x <= rx + rw && y1 - 8 >= ry && y1 - 8 <= ry + rh;
    if (L.id === 'store') {
      if (safeT <= 0 && R.state !== 'playdead' && inside(R.x - R.w / 2, R.y - R.h, R.w, R.h)) return { what: 'raccoon' };
      const B = this.bob;
      if (this.bobInside && B.state !== 'down' && inside(B.x - BOB.w / 2, L.floorY - BOB.h, BOB.w, BOB.h)) return { what: 'bob' };
      const S = this.scrub;
      if (S.state !== 'down' && inside(S.x - SCRUBBER.w / 2, L.floorY - SCRUBBER.h, SCRUBBER.w, SCRUBBER.h)) return { what: 'scrubber' };
      for (const d of [L.plush, L.rack]) if (d && inside(d.x, d.y, d.w, d.h)) return { what: 'display', y: y1 };
    }
    for (const s of this.solids()) {
      if (x >= s.x && x <= s.x + s.w && y0 <= s.y && y1 >= s.y) return { what: 'solid', y: s.y };
    }
    return null;
  }

  /** The solid surface under x (the floor, or the counter top). */
  private surfaceBelow(x: number, y: number): number {
    let best = this.level.floorY;
    for (const s of this.solids()) if (x >= s.x && x <= s.x + s.w && s.y >= y - 10 && s.y < best) best = s.y;
    return best;
  }

  /**
   * Bottle bowling: a rolled bottle doesn't break while it rolls. It bowls
   * over anyone on its lane, knocks off the first shelf bottle it meets, and
   * cracks when it stops or hits a wall. Off the end of a shelf, it falls.
   */
  private rollOn(b: Bottle, dt: number) {
    const lane = b.lane!;
    const L = this.level;
    const dir = Math.sign(b.vx);
    b.vx = dir * Math.max(0, Math.abs(b.vx) - THROW.rollDecel * dt);
    b.x += b.vx * dt;
    if (Math.abs(b.vx) < 30) return this.smash(b, lane.y);
    if (b.x < lane.x1 || b.x > lane.x2) {
      if (b.x <= 4 || b.x >= L.width - 4) return this.smash(b, lane.y); // the store's end walls
      b.state = 'air';
      b.vy = 0;
      b.safeT = 0;
      return;
    }
    for (const s of this.solids()) {
      if (s.y < lane.y - 2 && s.y + s.h > lane.y - 8 && b.x >= s.x && b.x <= s.x + s.w) {
        b.x = dir > 0 ? s.x - 2 : s.x + s.w + 2;
        return this.smash(b, lane.y);
      }
    }
    if (lane.board >= 0) {
      const pin = this.bottles.find((o) => o.state === 'shelf' && o.board === lane.board && Math.abs(o.x - b.x) < 8);
      if (pin) {
        this.knock(pin, dir);
        return this.smash(b, lane.y);
      }
    } else if (lane.y === L.floorY) {
      const S = this.scrub;
      if (S.state !== 'down' && Math.abs(b.x - S.x) < SCRUBBER.w / 2) {
        this.knockScrubber();
        b.vx *= THROW.rollPinSlow;
      }
      const B = this.bob;
      if (this.bobInside && B.state !== 'down' && Math.abs(b.x - B.x) < BOB.w / 2) {
        this.knockBob();
        b.vx *= THROW.rollPinSlow;
      }
    }
  }

  /** Smash a bottle at surface y. `ring` 0 means it hit someone, so it makes no noise ring. */
  private smash(b: Bottle, y: number, ring?: number, ringY = y) {
    b.state = 'gone';
    b.board = -1;
    b.y = y;
    const mess = LOOT[b.kind] * MESS_FACTOR * this.mult;
    this.mess += mess;
    const flows = y === this.level.floorY && BIG.includes(b.kind);
    const flow = flows ? FLOW.min + this.rand() * (FLOW.max - FLOW.min) : 0;
    this.spills.push({ id: this.nextId++, x: b.x, y, kind: b.kind, x0: b.x, flow });
    this.emit({ type: 'smash', x: b.x, y, kind: b.kind, mess });
    this.shake = Math.max(this.shake, b.kind === 'mini' ? 0.25 : 0.45);
    const nag = ++this.smashRun % NAG_EVERY === 0;
    if (nag) {
      this.sayCd.cousin = 0;
      this.say('cousin', NAGS[Math.floor(this.rand() * NAGS.length)], 2.6);
    }
    const r = ring ?? (b.kind === 'mini' ? RING.small : RING.big);
    if (!r) return;
    this.ring(b.x, ringY, r);
    if (!nag && r >= RING.big && this.rand() < 0.35) this.say('cousin', CHEERS[Math.floor(this.rand() * CHEERS.length)], 1.8);
  }

  /** The old floor tilts toward the front, so big floor spills run downhill and pool. */
  private updateSpills(dt: number) {
    const k = this.level.counter;
    for (const s of this.spills) {
      if (s.flow <= 0) continue;
      const d = Math.min(s.flow, FLOW.speed * dt);
      s.x += d;
      s.flow -= d;
      if (k && s.x >= k.x - 8 && s.x0 < k.x) {
        s.x = k.x - 8;
        s.flow = 0;
      }
      if (s.x >= this.level.width - 10) s.flow = 0;
    }
  }

  private ring(x: number, y: number, r: number) {
    this.rings.push({ x, y, r, age: 0 });
    this.emit({ type: 'ring', x, y, r });
    const S = this.scrub;
    const floor = this.level.floorY;
    if (S.state !== 'slurp' && S.state !== 'down' && Math.hypot(S.x - x, floor - 13 - y) <= r) {
      const [a, b] = this.level.scrubberRoute!;
      S.state = 'rush';
      S.target = Math.max(a, Math.min(b, x));
      // It chases the spill this crash made, even as it runs downhill.
      S.spill = this.spills.find((s) => s.y === floor && Math.abs(s.x0 - x) < 2)?.id ?? 0;
      this.emit({ type: 'beep' });
    }
    const B = this.bob;
    if (['search', 'look', 'confused', 'investigate'].includes(B.state) && Math.hypot(B.x - x, floor - 60 - y) <= r) {
      const [a, b] = this.level.bobRoute!;
      B.state = 'investigate';
      B.target = Math.max(a, Math.min(b, x));
      if (this.sayCd.bob <= 0) this.say('bob', 'What was that?', 1.6);
    }
  }

  /* ----------------------------------------------------------- scrubber */

  private updateScrubber(dt: number) {
    const S = this.scrub;
    const R = this.raccoon;
    const floor = this.level.floorY;
    const [a, b] = this.level.scrubberRoute!;
    const clamp = (x: number) => Math.max(a, Math.min(b, x));
    if (S.state === 'down') {
      S.t -= dt;
      if (S.t <= 0) S.state = 'patrol';
    } else if (S.state === 'patrol') {
      // Blue paw prints on the floor: it follows them, mopping as it goes.
      const print = this.prints
        .filter((p) => p.y === floor && p.x >= a && p.x <= b)
        .sort((p, q) => Math.abs(p.x - S.x) - Math.abs(q.x - S.x))[0];
      if (print) {
        const d = print.x - S.x;
        S.dir = d >= 0 ? 1 : -1;
        S.x += S.dir * Math.min(Math.abs(d), SCRUBBER.patrolSpeed * 1.4 * dt);
        this.prints = this.prints.filter((p) => !(p.y === floor && Math.abs(p.x - S.x) < 14));
      } else {
        S.x += S.dir * SCRUBBER.patrolSpeed * dt;
        if (S.x <= a) S.dir = 1;
        if (S.x >= b) S.dir = -1;
      }
      S.beepT -= dt;
      if (S.beepT <= 0) {
        S.beepT = 6 + this.rand() * 4;
        this.emit({ type: 'beep' });
      }
    } else if (S.state === 'rush') {
      const chased = S.spill ? this.spills.find((s) => s.id === S.spill) : undefined;
      if (chased) S.target = clamp(chased.x);
      const d = S.target - S.x;
      S.dir = d >= 0 ? 1 : -1;
      S.x += S.dir * Math.min(Math.abs(d), SCRUBBER.rushSpeed * dt);
      this.slurpAt(S.x, 16);
      if (Math.abs(d) < 3) {
        S.state = 'slurp';
        S.t = SCRUBBER.slurpTime;
      }
      // It bumps you off your feet if you're in its way on the floor.
      if (Math.abs(R.y - floor) < 2 && Math.abs(R.x - S.x) < (SCRUBBER.w + R.w) / 2 - 4) this.hit(R.x >= S.x ? 1 : -1);
    } else {
      S.t -= dt;
      this.slurpAt(S.x, 40);
      if (S.t <= 0) S.state = 'patrol';
    }
  }

  private slurpAt(x: number, r: number) {
    const floor = this.level.floorY;
    const gone = this.spills.filter((s) => Math.abs(s.y - floor) < 1 && Math.abs(s.x - x) < r);
    if (!gone.length) return;
    this.spills = this.spills.filter((s) => !gone.includes(s));
    this.emit({ type: 'slurp' });
    this.say('cousin', SCOLDS[Math.floor(this.rand() * SCOLDS.length)], 1.8);
  }

  private knockScrubber() {
    const S = this.scrub;
    S.state = 'down';
    S.t = KNOCKDOWN.scrubber;
    this.emit({ type: 'bonk' });
    this.say('cousin', 'Chrr-chrr! STRIKE!', 1.8);
  }

  /* ---------------------------------------------------------------- hit */

  hit(dir: number) {
    const R = this.raccoon;
    if (R.invuln > 0 || this.phase !== 'store') return;
    R.health = Math.max(0, R.health - HIT.damage);
    const dropped = R.carry.pop();
    this.fixReady();
    if (dropped) {
      this.launch(dropped, R.x, R.y - R.h, -dir * 40, -160);
      this.say('cousin', SCOLDS[Math.floor(this.rand() * SCOLDS.length)], 1.8);
    }
    if (R.buzz > 0) this.setBuzz(R.buzz - 1);
    R.state = 'move';
    R.aimT = null;
    R.hiddenOk = false;
    R.climbing = false;
    R.vx = dir * HIT.knockX;
    R.vy = -HIT.knockY;
    R.grounded = false;
    R.invuln = HIT.invuln;
    R.gripT = 0.5;
    this.shake = 0.6;
    this.emit({ type: 'hit' });
    if (R.health <= 0) this.end(false, 'sore');
  }

  /* ---------------------------------------------------------------- bob */

  private updateBob(dt: number) {
    const B = this.bob;
    const R = this.raccoon;
    const [back, front] = this.level.bobRoute!;
    B.mutterCd = Math.max(0, B.mutterCd - dt);

    if (B.state === 'outside') {
      if (this.t < NIGHT.length * NIGHT.bobAt) return;
      B.state = 'search';
      B.x = this.level.door!.x + this.level.door!.w / 2;
      B.dir = -1;
      B.goal = 0;
      this.emit({ type: 'door' });
      this.say('bob', 'Animal control! Anybody in here?', 2.6);
      // Night 1 teaches play dead on his first entrance.
      this.say('cousin', 'Chrr-chrr! Animal control! Dive in the plush and play dead (↓)!', 6);
      this.plushGlow = 14;
      return;
    }

    const walk = (to: number, speed: number) => {
      const d = to - B.x;
      if (Math.abs(d) > 1) B.dir = d > 0 ? 1 : -1;
      B.x += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
      return Math.abs(d) < 2;
    };
    const sweep = (rate = 1) => {
      B.sweepT += dt * rate;
      const k = 0.5 - 0.5 * Math.cos((2 * Math.PI * B.sweepT) / BOB.sweepPeriod);
      B.beam = BOB.sweepLow + (BOB.sweepHigh - BOB.sweepLow) * k;
    };

    switch (B.state) {
      case 'down':
        B.t -= dt;
        if (B.t <= 0) {
          if (B.wasChasing) B.state = 'chase';
          else {
            B.state = 'look';
            B.t = BOB.lookAround;
            this.say('bob', 'Ow! Who threw that?!', 1.8);
          }
        }
        break;
      case 'search':
        sweep();
        if (walk(B.goal === 0 ? back : front, BOB.searchSpeed)) B.goal = B.goal === 0 ? 1 : 0;
        break;
      case 'investigate':
        sweep(1.4);
        if (walk(B.target, BOB.investigateSpeed)) {
          B.state = 'look';
          B.t = BOB.lookAround;
        }
        break;
      case 'look':
      case 'confused': {
        sweep(1.6);
        const half = B.state === 'look' ? BOB.lookAround / 2 : 0.8;
        const before = B.t;
        B.t -= dt;
        if (before > half && B.t <= half) B.dir = B.dir === 1 ? -1 : 1;
        if (B.t <= 0) B.state = 'search';
        break;
      }
      case 'shout':
        this.aimAt();
        B.t -= dt;
        if (B.t <= 0) {
          B.state = 'chase';
          B.lostT = 0;
        }
        break;
      case 'chase': {
        B.dir = R.x >= B.x ? 1 : -1;
        if (Math.abs(R.x - B.x) > BOB.poleReachX * 0.6) walk(R.x, BOB.chaseSpeed);
        this.aimAt();
        if (this.seen()) B.lostT = 0;
        else B.lostT += dt;
        if (this.canPole()) {
          this.end(false, 'bob');
          return;
        }
        if (B.lostT >= BOB.loseAfter) {
          B.state = 'confused';
          B.t = 1.6;
          this.emit({ type: 'lost' });
          this.say('bob', "Huh. Where'd it go…", 2);
        }
        break;
      }
    }

    if (['search', 'investigate', 'look', 'confused'].includes(B.state)) {
      if (this.seen()) this.spot();
      else if (R.state === 'playdead' && R.hiddenOk && B.mutterCd <= 0 && this.seen(true)) {
        B.mutterCd = 6;
        this.emit({ type: 'mutter' });
        this.say('bob', '…just a stuffed one. Ugly little thing.', 2.4);
      }
    }
  }

  /** A bottle knocks him off his feet for a moment. Mid-chase, he gets up still chasing. */
  private knockBob() {
    const B = this.bob;
    B.wasChasing = B.state === 'chase' || B.state === 'shout';
    B.state = 'down';
    B.t = KNOCKDOWN.bob;
    this.emit({ type: 'bonk' });
    this.say('bob', 'OOF!', 1.2);
  }

  private spot() {
    const B = this.bob;
    B.state = 'shout';
    B.t = BOB.shoutTime;
    this.emit({ type: 'shout' });
    this.say('bob', 'HEY! Raccoon!', 1.8);
  }

  /** In a chase he points the beam at you, but it can't tilt past straight-ish up. */
  private aimAt() {
    const B = this.bob;
    const R = this.raccoon;
    const o = this.beamOrigin();
    const ang = Math.atan2(o.y - (R.y - R.h / 2), Math.max(1, Math.abs(R.x - o.x)));
    B.beam = Math.max(BOB.sweepLow - 0.2, Math.min(BOB.sweepHigh + 0.15, ang));
  }

  beamOrigin() {
    return { x: this.bob.x + this.bob.dir * 12, y: this.level.floorY - 64 };
  }

  /**
   * Is the raccoon in Bob's flashlight? It must be inside the cone and in
   * range, and the line can't cross a shelf unit's end panel or the counter.
   * So a shelf hides you from a distance, and close up you hide by jumping up
   * above where his beam can tilt.
   */
  seen(ignoreHidden = false): boolean {
    const R = this.raccoon;
    const B = this.bob;
    if (!this.bobInside || B.state === 'down') return false;
    if (!ignoreHidden && R.state === 'playdead' && R.hiddenOk) return false;
    const o = this.beamOrigin();
    const dx = B.dir * Math.cos(B.beam);
    const dy = -Math.sin(B.beam);
    const cosHalf = Math.cos(BOB.beamHalf);
    for (const p of [
      { x: R.x, y: R.y - R.h / 2 },
      { x: R.x, y: R.y - R.h + 3 },
    ]) {
      const vx = p.x - o.x;
      const vy = p.y - o.y;
      const d = Math.hypot(vx, vy);
      if (d > BOB.beamRange || d < 1) continue;
      if ((vx * dx + vy * dy) / d < cosHalf) continue;
      if (this.lineOfSight(o, p)) return true;
    }
    return false;
  }

  lineOfSight(o: { x: number; y: number }, p: { x: number; y: number }): boolean {
    const L = this.level;
    for (const u of L.units) {
      for (const px of [u.x, u.x + u.w]) {
        if ((o.x - px) * (p.x - px) >= 0) continue;
        const y = o.y + ((px - o.x) / (p.x - o.x)) * (p.y - o.y);
        if (y > u.top && y < L.floorY) return false;
      }
    }
    if (L.counter && segmentHitsRect(o, p, L.counter)) return false;
    return true;
  }

  private canPole(): boolean {
    const R = this.raccoon;
    const B = this.bob;
    if (R.state === 'playdead' && R.hiddenOk) return false;
    if (Math.abs(R.x - B.x) > BOB.poleReachX) return false;
    if (R.y < this.level.floorY - BOB.poleReachUp) return false;
    return this.lineOfSight(this.beamOrigin(), { x: R.x, y: R.y - R.h / 2 });
  }

  /* -------------------------------------------------------------- flow */

  private place(x: number, y: number) {
    this.raccoon.dropBoard = -1;
    const R = this.raccoon;
    R.x = x;
    R.y = y;
    R.peakY = y;
    R.vx = R.vy = 0;
    R.climbing = false;
    R.grounded = false;
  }

  private enterStore() {
    this.level = storeLevel(1);
    this.phase = 'store';
    this.t = 0;
    this.bottles = this.level.bottles.map((b) => ({ ...b, id: this.nextId++, state: 'shelf', vx: 0, vy: 0, safeT: 0 }));
    this.stock = this.bottles.reduce((s, b) => s + LOOT[b.kind], 0) + this.rack.stock * LOOT.mini;
    this.scrub.x = 1300;
    this.scrub.dir = -1;
    this.place(this.level.start.x, this.level.ceilingY + this.raccoon.h + 2);
    this.raccoon.vy = 200;
    // The tile is the first smash of the night.
    const mess = TILE_MESS * this.mult;
    this.mess += mess;
    this.emit({ type: 'smash', x: this.raccoon.x, y: this.level.ceilingY, kind: 'tile', mess });
    this.ring(this.raccoon.x, this.level.ceilingY, RING.small);
    this.shake = 0.7;
    this.say('cousin', 'Chrr! Pass the good stuff up to me here!', 3.5);
  }

  end(escaped: boolean, reason: EndReason) {
    const R = this.raccoon;
    const paws = escaped ? this.carryValue() * this.mult : 0;
    const mess = escaped ? this.mess : 0;
    const score = this.banked + mess + paws;
    const taken = this.taken + (escaped ? this.carryValue() : 0);
    this.result = {
      escaped,
      reason,
      banked: this.banked,
      mess,
      paws,
      coins: 0,
      score,
      par: NIGHT.par,
      share: this.stock ? Math.min(1, taken / this.stock) : 0,
      grade: gradeFor(score, NIGHT.par),
      kept: escaped ? null : { mess: this.mess, items: R.carry.length, coins: 0 },
      time: this.t,
    };
    this.phase = 'over';
    this.emit(escaped ? { type: 'escaped' } : { type: 'caught', reason });
  }

  say(who: Who, text: string, ttl = 2) {
    if (this.sayCd[who] > 0 && who !== 'bob') return;
    this.sayCd[who] = who === 'cousin' ? 2.5 : 0.8;
    this.says = this.says.filter((s) => s.who !== who);
    this.says.push({ who, text, ttl });
    this.emit({ type: 'say', who, text });
  }

  private emit(e: SimEvent) {
    this.events.push(e);
  }
}

type Edges = { jump: boolean; grab: boolean; up: boolean; down: boolean; throw: boolean; swap: boolean; hoot: boolean };

function segmentHitsRect(a: { x: number; y: number }, b: { x: number; y: number }, r: Rect): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const clip = (p: number, q: number) => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
    return true;
  };
  return clip(-dx, a.x - r.x) && clip(dx, r.x + r.w - a.x) && clip(-dy, a.y - r.y) && clip(dy, r.y + r.h - a.y) && t0 < t1;
}
