// The night simulation. Fixed 60 Hz step, seeded randomness, no DOM: the render
// and audio layers read state and the per-step `events` list.

import {
  ARCHER, BELT, BOB, CANNON, CLOWN, CRITTER, BOB_THROW, BUZZ, DRONE, DT, FALL, FIZZ, FLOW, GRADES, HIT, KNOCKDOWN, NAG_EVERY, NIGHT, NIGHTS, POSSUM, PRINTS, RACCOON, RACK, RING, ROPE, SAT, SCRUBBER, SHIELD, SIREN, SLICK, SNEAKERS, SPACE, TANK,
  POST_GRACE, SEA_LEGS, THROW, TILL, TUTORIAL,
} from '../config';
import { HANG, type CritterKind, type Powerup, crawlLevel, isSpecial, nightLevel, roofLevel, type ItemKind, type Level, type Rect } from './level';
import { LESSONS, trainingLevel, type LessonId } from './training';
import { rng } from './rng';

export interface Input {
  left: boolean; right: boolean; up: boolean; down: boolean;
  jump: boolean; grab: boolean; throw: boolean; swap: boolean; hoot: boolean;
}
export const NO_INPUT: Input = {
  left: false, right: false, up: false, down: false, jump: false, grab: false, throw: false, swap: false, hoot: false,
};

export type Phase = 'roof' | 'crawl' | 'store' | 'over';
export type Who = 'cousin' | 'bob' | 'raccoon' | 'scrubber' | 'possum';
export type EndReason = 'climbed' | 'bob' | 'dawn' | 'sore';

export type SimEvent =
  | { type: 'smash'; x: number; y: number; kind: ItemKind | 'tile' }
  | { type: 'ring'; x: number; y: number; r: number }
  | { type: 'blast'; x: number }
  | { type: 'creak' | 'twang' | 'thunk' | 'honk' | 'screech' | 'spit' | 'cannon' | 'whoo'; x: number }
  | { type: 'say'; who: Who; text: string }
  | { type: 'bank' }
  | { type: 'caught'; reason: EndReason }
  | {
      type:
        | 'jump' | 'land' | 'grab' | 'sip' | 'hiccupWarn' | 'hiccup' | 'slip' | 'hit' | 'vent' | 'wires'
        | 'door' | 'shout' | 'mutter' | 'lost' | 'beep' | 'slurp' | 'spin' | 'golden' | 'tote'
        | 'playDead' | 'escaped' | 'throw' | 'roll' | 'bonk' | 'hoot' | 'swap' | 'seaLegs' | 'bluePaws' | 'ko' | 'knock'
        | 'bobWindup' | 'bobThrow' | 'siren' | 'lesson' | 'pop' | 'mash' | 'till' | 'hiss' | 'clank' | 'aim' | 'shot' | 'sneakers' | 'yelp' | 'fanfare' | 'lidReady' | 'splat' | 'drone';
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
  fizz: number; // 0 to 1: how shaken up the champagne in your paws is
  rocketT: number; // s left of being carried by a popped cork
  sprint: number; // 0 to 1: how much of the sneakers' boost is on
  shieldT: number; // s until the pot lid can block again
}

/**
 * A bottle on a shelf, in the air (knocked, dropped, lobbed), or rolling along
 * a shelf or the floor. Airborne bottles pass through shelf boards.
 */
export interface Bottle {
  id: number; x: number; y: number; kind: ItemKind; board: number;
  state: 'shelf' | 'air' | 'rolling' | 'belt' | 'gone';
  vx: number; vy: number;
  safeT: number; // can't hit the raccoon yet (it just launched this one)
  owner?: 'bob' | 'possum' | 'owl'; // who threw it; it can't hit them
  lane?: { x1: number; x2: number; y: number; board: number }; // what a rolling bottle rolls on
  spot?: number; // which of the level's shelf spots it came from
  drift?: boolean; // on the Moon: bumped loose, it floats off in a straight line until it hits something
}
export interface Spill { id: number; x: number; y: number; kind: ItemKind; x0: number; flow: number }
export interface Print { x: number; y: number; age: number; facing: 1 | -1 }
export interface Ring { x: number; y: number; r: number; age: number }
export interface Say { who: Who; text: string; ttl: number }
/** One line of the night log on the back of the report card: what happened, and the points if it scored. */
export interface LogEntry { t: number; text: string; pts?: number }

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
  holding: ItemKind | null; // the bottle he's about to throw
  windT: number; // s left of the wind-up
  throwCd: number; // s until he can throw again
  lift: number; // px his jetpack has him off the floor (the Moon only)
}

export interface Scrubber {
  x: number; dir: 1 | -1; state: 'patrol' | 'peek' | 'rush' | 'slurp' | 'down' | 'alarm'; target: number; t: number; beepT: number;
  alarmCd: number; // s before it can set off the siren again
  spill: number; // id of the spill it's chasing, or 0
  eye: number; // camera height above the floor, px: it rises on its pole to peek at the shelves
  cam: number; // camera angle above level, rad
  panT: number;
  peekCd: number; // s of patrol before its next periscope stop
  tank: boolean; // night 2 on: same job, bigger, and it shoots
  aimT: number; // s left until it fires; 0 when it isn't aiming
  reload: number; // s until it can aim again
  aim: number; // barrel angle above level, rad
  gun: 1 | -1; // the way the barrel points
  kick: number; // s left of recoil, for the art
}

export interface Archer {
  x: number;
  dir: 1 | -1;
  state: 'hidden' | 'draw' | 'recover' | 'down';
  t: number; // s left in this state
  cd: number; // s hidden before it can stand up again
  aim: number; // angle above level, rad
}
export interface Arrow { x: number; y: number; vx: number; vy: number; from: Archer; spent: boolean }
export interface StuckArrow { x: number; y: number; angle: number; age: number }
/** Text that drifts up and fades: damage numbers, shouts. */
export interface Floater { x: number; y: number; text: string; colour: string; age: number }

export interface Clown { x: number; dir: 1 | -1; route: [number, number]; state: 'patrol' | 'honk' | 'down'; t: number; cd: number }
export interface Critter {
  kind: CritterKind;
  home: { x: number; y: number }; // perch, or basket
  x: number;
  y: number;
  dir: 1 | -1;
  state: 'idle' | 'wind' | 'dive' | 'back' | 'down';
  t: number;
  cd: number;
  to: { x: number; y: number }; // where an eagle dives
}
/** Snake spit, flying low along the floor. */
export interface Sat {
  x: number;
  y: number;
  dir: 1 | -1;
  route: [number, number];
  state: 'scan' | 'alarm' | 'down';
  t: number;
  cd: number; // s before it can raise the alarm again
  sweepT: number;
}
/** Night 5's powerup. Docked, it follows you; when your paws are full it flies the lot up to your cousin. */
export interface Drone { x: number; y: number; state: 'dock' | 'out' | 'back'; cargo: ItemKind[] }

export interface Spit { x: number; y: number; vx: number; left: number; spent: boolean }

export interface Shell { x: number; y: number; vx: number; vy: number; spent: boolean }
/** Where a shell went off. Kept for the night: the fireball fades, the scorch mark stays. */
export interface Blast { x: number; y: number; age: number }

export interface Possum {
  x: number;
  y: number; // feet, on top of its case stack
  dir: 1 | -1;
  windT: number; // s left of holding a can up; 0 when it isn't
  cd: number; // s until it can throw again
  woozy: number; // s left of being soaked and throwing wide
}

export interface Result {
  night: number;
  coins: number; // from the till, counted in bonus; 0 if you were caught
  escaped: boolean;
  reason: EndReason;
  specials: number; // turned in
  specialsTotal: number;
  specialsBroken: number;
  percent: number; // of the specials turned in; the letter grade comes from this
  bonus: number; // other bottles turned in, a point each
  mult: number; // Buzz at the end of the night
  score: number; // percent + bonus × mult (host)
  grade: string;
  kept: number; // bottles animal control took off you
  time: number;
}

/** What an airborne bottle runs into, checked in this order. */
type AirHit =
  | { what: 'raccoon' }
  | { what: 'bob' }
  | { what: 'scrubber' }
  | { what: 'possum' }
  | { what: 'archer'; archer: Archer }
  | { what: 'clown'; clown: Clown }
  | { what: 'critter'; critter: Critter }
  | { what: 'sat'; sat: Sat }
  | { what: 'bale'; y: number }
  | { what: 'display'; y: number }
  | { what: 'solid'; y: number };

export function multFor(step: number): number {
  return 1 + BUZZ.perStep * step;
}

/** The share of the night's specials turned in, in whole percent. Rounds down, so only all of them is 100% (host). */
export function percentFor(specials: number, total: number): number {
  return total ? Math.floor((specials * 100) / total) : 0;
}

export function gradeFor(percent: number): string {
  for (const g of GRADES) if (percent >= g.at) return g.name;
  return GRADES[GRADES.length - 1].name;
}

const CHEERS = ['Chrr-chrr! Smash it!', 'Ha! Lovely crash!', 'Chrrrr! Again!', 'Ooh, that was a good one!'];
const ENDINGS: Record<string, string> = { bob: "Bob's catch pole", dawn: 'still inside at dawn', sore: 'too sore to run' };
const THROW_LINES = ['Get down from there!', 'Come down here, you!', 'Take THAT, trash panda!'];
const SCOLDS = ['Chrr! Wasted!', 'Nooo, the good stuff!', 'Chrr… what a waste.'];
const NAGS = ["Pssst! Don't smash ALL the merchandise!", 'Pssst. Those go in the bag, not on the floor.', "Psst! We can't sell puddles, cuz!"];
const BIG: ItemKind[] = ['regular', 'golden', 'rum', 'curacao', 'champagne'];
/** Everything Bob says, as he'd say it in tights. */
const BOB_FAIRE: Record<string, string> = {
  'HEY! Raccoon!': 'HALT, varlet!',
  'What was that?': 'What ho? A noise!',
  'Animal control! Anybody in here?': 'Hear ye! Animal control!',
  'Alarm! Animal control, coming through!': 'Make way! Animal control!',
  'Ow! Get back here!': 'Zounds! Return, knave!',
  'Ow! Who threw that?!': 'Who hurleth that?!',
  "Huh. Where'd it go…": 'Forsooth. It hath vanished…',
  '…just a stuffed one. Ugly little thing.': '…a stuffed one. Foul beastie.',
  'OOF!': 'Oof, forsooth!',
  'Get down from there!': 'Descend, thou rogue!',
  'Come down here, you!': 'Come hither, scoundrel!',
  'Take THAT, trash panda!': 'Have at thee, trash panda!',
};
/** And as the ringmaster. */
const BOB_CIRCUS: Record<string, string> = {
  'HEY! Raccoon!': 'Ladies and gentlemen… a RACCOON!',
  'What was that?': 'What was that? Is the show starting?',
  'Animal control! Anybody in here?': 'Animal control! Is the show over?',
  'Alarm! Animal control, coming through!': 'Make way! Animal control!',
  'Ow! Get back here!': 'Ow! Come back for your encore!',
  'Ow! Who threw that?!': 'Who threw that?! Tough crowd.',
  "Huh. Where'd it go…": 'And for my next trick… it vanished.',
  '…just a stuffed one. Ugly little thing.': '…just a prize. Ugly little thing.',
  'OOF!': 'OOF! Tough crowd!',
  'Get down from there!': 'Get down off the bleachers!',
  'Come down here, you!': "Show's over, come down!",
  'Take THAT, trash panda!': 'Take a bow, trash panda!',
};
/** And in a space suit. */
const BOB_SPACE: Record<string, string> = {
  'HEY! Raccoon!': 'Houston, we have a RACCOON!',
  'What was that?': 'Control, I heard something.',
  'Animal control! Anybody in here?': 'Lunar Animal Control! Anybody up here?',
  'Alarm! Animal control, coming through!': 'Alarm! Lunar Animal Control, inbound!',
  'Ow! Get back here!': 'Ow! Come back here, space bandit!',
  'Ow! Who threw that?!': 'Who threw that?! In SPACE?!',
  "Huh. Where'd it go…": 'Lost visual. Where did it go…',
  '…just a stuffed one. Ugly little thing.': '…just a plush alien. Ugly little thing.',
  'OOF!': 'OOF! Mayday!',
  'Get down from there!': 'Get off that rock!',
  'Come down here, you!': 'Return to base, you!',
  'Take THAT, trash panda!': 'Take THAT, space panda!',
};
const POWERUP_LINES: Record<Powerup, string> = {
  tote: 'Tote bag! Room for three more.',
  sneakers: 'Sneakers! For when things get hairy.',
  shield: 'A pot lid! Fit for a knight.',
  candy: 'Cotton candy! …now everything sticks to me.',
  drone: 'A drone! Fill my paws and it does the climbing.',
};
const QUESTS = [
  'Well fought, noble cuz! Another quest awaits!',
  'Huzzah! The hollow grows fat with plunder!',
  'Thy deeds shall be sung! Mostly by me! Chrr!',
  'By mine whiskers! Fetch yet more!',
];
const ARCHER_SHOUTS = ['For the Faire!', 'Have at thee!', 'Verily!', 'Stand and deliver!'];
const POSSUM_LINES = ['Hsss! My patch!', 'Hsss! Beat it, stripes!', 'HSSSS!'];
const WOOZY_LINES = ['hsss… *hic*', 'wheee… canss…', '…mine. all mine. hsss.'];

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
  log: LogEntry[] = [];
  events: SimEvent[] = [];
  bob: Bob;
  scrub: Scrubber;
  shells: Shell[] = [];
  blasts: Blast[] = [];
  archers: Archer[] = [];
  arrows: Arrow[] = [];
  stuck: StuckArrow[] = [];
  floaters: Floater[] = [];
  clowns: Clown[] = [];
  critters: Critter[] = [];
  spits: Spit[] = [];
  slicks: { x: number; age: number }[] = [];
  sats: Sat[] = [];
  drone: Drone | null = null;
  alertT = 0; // s the circus animals stay riled after a honk
  private cannonFlight = false;
  private quests = 0; // quest speeches given
  specials = 0; // turned in so far
  specialsBroken = 0;
  specialsTotal = 0; // counted from the store when you drop in; all of them is 100% (host)
  bonus = 0; // other bottles turned in, a point each
  wiresChewed = false;
  powerOut = false;
  powerups: Powerup[]; // kept from night to night
  rack = { stock: RACK.stock, spin: 0 };
  readonly night: number;
  possum: Possum | null = null;
  till = { mashes: 0, open: false, sprayT: 0 };
  coins = 0; // in your fur: bonus points if you climb out, lost if you're caught
  private popArm: number | null = null; // s Grab has been held since a press that could pop the cork
  plushGlow = 0;
  plushPuff = 0;
  shake = 0;
  result: Result | null = null;
  private prev: Input = NO_INPUT;
  private nextId = 1;
  private alarmAt: number | null = null; // where the siren went off before Bob came in, so he heads there
  private sayCd: Record<Who, number> = { cousin: 0, bob: 0, raccoon: 0, scrubber: 0, possum: 0 };
  private dawnWarned = false;
  private smashRun = 0; // bottles smashed since the last hand-up
  readonly tutorial: boolean;
  lessons = new Set<LessonId>();
  private restockT: number[] = []; // per shelf spot, s it has stood empty in the practice store

  /** Start Game is 'store'. The tutorial runs roof, crawlspace, practice store; 'training' skips to the practice store. */
  constructor(opts: { seed?: number; start?: 'tutorial' | 'training' | 'store'; night?: number; powerups?: Powerup[] } = {}) {
    this.tutorial = opts.start !== 'store';
    this.night = opts.night ?? 1;
    this.rand = rng(opts.seed ?? 1);
    this.raccoon = {
      x: 0, y: 0, vx: 0, vy: 0, w: RACCOON.w, h: RACCOON.h, facing: 1, grounded: false, ground: null,
      climbing: false, dropBoard: -1, state: 'move', stateT: 0, hiddenOk: false, health: RACCOON.health,
      buzz: 0, buzzT: 0, hiccupT: 0, hiccups: 0, cheeks: false, carry: [], ready: 0, cap: RACCOON.carry, invuln: 0,
      gripT: 0, aimT: null, seaLegs: 0, blueT: 0, printDist: 0, peakY: 0, fizz: 0, rocketT: 0, sprint: 0, shieldT: 0,
    };
    this.powerups = [...(opts.powerups ?? [])];
    if (this.has('tote')) this.raccoon.cap += RACCOON.toteExtra;
    this.bob = {
      state: 'outside', x: 0, dir: -1, goal: 0, t: 0, sweepT: 0, beam: 0, lostT: 0, target: 0, mutterCd: 0,
      wasChasing: false, holding: null, windT: 0, throwCd: 0, lift: 0,
    };
    this.scrub = {
      x: 0, dir: 1, state: 'patrol', target: 0, t: 0, beepT: 4, spill: 0, alarmCd: 0,
      eye: SCRUBBER.eyeBase, cam: SCRUBBER.camTilt, panT: 0, peekCd: SCRUBBER.peekEvery[0],
      tank: NIGHTS[this.night - 1].tank, aimT: 0, reload: 0, aim: 0, gun: 1, kick: 0,
    };
    if (this.scrub.tank) this.scrub.eye = TANK.eyeBase;
    this.phase = 'roof';
    this.level = roofLevel();
    if (opts.start === 'store' || opts.start === 'training') {
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
  /** Seconds from the tile crash to dawn, tonight. */
  get nightLength(): number {
    return NIGHTS[this.night - 1].length;
  }
  /** When Bob is due in, tonight. */
  get bobDue(): number {
    return this.nightLength * NIGHT.bobAt;
  }
  /** Moon gravity on night 5. */
  get gravity(): number {
    return this.level.space ? SPACE.gravity : RACCOON.gravity;
  }
  get maxFall(): number {
    return this.level.space ? SPACE.maxFall : RACCOON.maxFall;
  }
  /** Where Bob's boots are: the floor, or up on his jetpack. */
  get bobFeet(): number {
    return this.level.floorY - this.bob.lift;
  }
  has(p: Powerup): boolean {
    return this.powerups.includes(p);
  }
  /** Someone is onto you right now: Bob shouting or chasing, the siren going, or the tank's gun on you. */
  get inDanger(): boolean {
    const S = this.scrub;
    return this.bob.state === 'chase' || this.bob.state === 'shout' || S.state === 'alarm' || S.aimT > 0 || this.archers.some((a) => a.state === 'draw')
      || this.clowns.some((c) => c.state === 'honk') || this.critters.some((c) => c.state === 'wind' || c.state === 'dive') || this.sats.some((s) => s.state === 'alarm');
  }
  get capacity(): number {
    return this.raccoon.cap;
  }
  get over(): boolean {
    return this.phase === 'over';
  }
  /** The first tutorial lesson still open, or null once they're all done. */
  get lesson() {
    return LESSONS.find((l) => !this.lessons.has(l.id)) ?? null;
  }

  private learn(id: LessonId) {
    if (!this.tutorial || this.lessons.has(id)) return;
    this.lessons.add(id);
    this.emit({ type: 'lesson' });
  }

  /** The practice store: bottles come back so no lesson can run out, and nothing can end the run but finishing. */
  private practice(dt: number) {
    this.raccoon.health = RACCOON.health;
    this.level.bottles.forEach((d, spot) => {
      if (this.bottles.some((b) => b.spot === spot)) {
        this.restockT[spot] = 0;
        return;
      }
      this.restockT[spot] = (this.restockT[spot] ?? 0) + dt;
      if (this.restockT[spot] < TUTORIAL.restock) return;
      this.restockT[spot] = 0;
      this.bottles.push({ ...d, spot, id: this.nextId++, state: 'shelf', vx: 0, vy: 0, safeT: 0 });
    });
  }
  get bobInside(): boolean {
    return this.phase === 'store' && this.bob.state !== 'outside';
  }
  /** Buzz steps that still make you wobble: none while you have sea legs. */
  get wobble(): number {
    return this.raccoon.seaLegs > 0 ? 0 : this.raccoon.buzz;
  }

  /** Your paws reach safety: specials count toward 100%, anything else is a bonus point. Returns the specials. */
  private turnIn(carry: ItemKind[] = this.raccoon.carry): number {
    const specials = carry.filter(isSpecial).length;
    this.specials += specials;
    this.bonus += carry.length - specials;
    if (specials) this.learn('special');
    if (carry.length > specials) {
      this.learn('plain');
      if (this.raccoon.buzz > 0) this.learn('bonus');
    }
    return specials;
  }

  step(input: Input): void {
    this.events = [];
    if (this.phase === 'over') return;
    const pressed = (k: keyof Input) => input[k] && !this.prev[k];
    const edge: Edges = {
      jump: pressed('jump'), grab: pressed('grab'), up: pressed('up'), down: pressed('down'),
      left: pressed('left'), right: pressed('right'),
      throw: pressed('throw'), swap: pressed('swap'), hoot: pressed('hoot'),
    };
    this.prev = { ...input };
    this.tick++;
    const dt = DT;

    if (this.phase === 'store' && !this.tutorial) this.t += dt;
    this.updateRaccoon(input, edge, dt);
    if (this.over) return;
    if (this.phase === 'store') {
      this.updateBottles(dt);
      if (this.over) return;
      this.updateSpills(dt);
      if (this.tutorial) this.practice(dt);
      else {
        if (this.level.archers) this.updateArchers(dt);
        else if (this.level.circus) this.updateCircus(dt);
        else if (this.level.space) this.updateSats(dt);
        else {
          this.updateScrubber(dt);
          this.updateShells(dt);
        }
        this.updateBob(dt);
        this.updatePossum(dt);
        this.updateDrone(dt);
      }
      if (this.over) return;
      if (!this.dawnWarned && this.t >= this.nightLength - 30) {
        this.dawnWarned = true;
        this.say('cousin', "Sky's getting light! Get up here!", 3.5);
      }
      if (this.t >= this.nightLength) {
        this.end(false, 'dawn');
        return;
      }
    }
    for (const r of this.rings) r.age += dt;
    for (const b of this.blasts) b.age += dt;
    for (const a of this.stuck) a.age += dt;
    this.stuck = this.stuck.filter((a) => a.age < 8);
    for (const f of this.floaters) f.age += dt;
    for (const sl of this.slicks) sl.age += dt;
    this.slicks = this.slicks.filter((sl) => sl.age < SLICK.life);
    this.floaters = this.floaters.filter((f) => f.age < 1.2);
    this.rings = this.rings.filter((r) => r.age < 0.9);
    for (const p of this.prints) p.age += dt;
    this.prints = this.prints.filter((p) => p.age < PRINTS.life);
    for (const s of this.says) s.ttl -= dt;
    this.says = this.says.filter((s) => s.ttl > 0);
    for (const k of Object.keys(this.sayCd) as Who[]) this.sayCd[k] -= dt;
    this.plushGlow = Math.max(0, this.plushGlow - dt);
    this.plushPuff = Math.max(0, this.plushPuff - dt);
    this.till.sprayT = Math.max(0, this.till.sprayT - dt);
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
    R.rocketT = Math.max(0, R.rocketT - dt);
    this.updateBuzz(dt);
    this.updateFizz(dt);

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

    // Holding Throw charges a lob; letting go throws it. ↓ or ←/→ while holding picks a drop or a roll instead.
    if (R.aimT !== null) {
      if (input.throw && R.state === 'move') {
        R.aimT += dt;
        this.pickThrow(edge);
      } else {
        if (R.state === 'move') this.lob();
        R.aimT = null;
      }
    }

    const step = R.buzz;
    const wob = this.wobble;
    if (this.has('sneakers')) {
      if (this.inDanger && R.sprint < 1) {
        if (R.sprint === 0) this.emit({ type: 'sneakers' });
        R.sprint = 1;
      } else if (!this.inDanger) R.sprint = Math.max(0, R.sprint - dt / SNEAKERS.fade);
    }
    if (R.shieldT > 0) {
      R.shieldT = Math.max(0, R.shieldT - dt);
      if (R.shieldT === 0) {
        this.floater(R.x, R.y - 46, 'Lid ready!', '#ffe9a8');
        this.emit({ type: 'lidReady' });
      }
    }
    const boost = SNEAKERS.boost * R.sprint;
    const speed = RACCOON.runSpeed * (1 - BUZZ.speedLoss * step + boost);
    const slick = !!L.circus && R.grounded && R.y === L.floorY && this.slicks.some((sl) => Math.abs(sl.x - R.x) < SLICK.w / 2);
    const control = Math.max(0.2, 1 - BUZZ.controlLoss * wob) * (slick ? SLICK.grip : 1);
    const free = R.state === 'move' && R.aimT === null;
    const dir = free ? (input.right ? 1 : 0) - (input.left ? 1 : 0) : 0;
    if (dir) R.facing = dir as 1 | -1;

    // Interactions first, so Grab/Throw/Up/Down act on what you're standing at.
    if (free && edge.grab) this.grab();
    // A tap pops the cork when the press did nothing else. Holding Grab is for scooping, so it never does.
    if (this.popArm !== null) {
      if (input.grab) this.popArm += dt;
      else {
        if (free && this.popArm <= FIZZ.tap) this.popCork();
        this.popArm = null;
      }
    }
    if (free && edge.throw) this.startThrow(edge);
    if (free && edge.swap) this.swap();
    if (free && edge.hoot) this.hoot();
    if (free && edge.up && !input.throw && this.atHole()) {
      if (this.tutorial && this.lesson) this.say('cousin', 'Not yet! Finish your lessons.', 2);
      else this.end(true, 'climbed');
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
      R.vy = input.up ? -RACCOON.climbSpeed * (1 - 0.06 * step + boost) : RACCOON.climbSpeed * 1.3;
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
      if (R.rocketT <= 0) {
        const target = dir * speed;
        const a = (dir !== 0 ? RACCOON.accel : RACCOON.decel) * control * (R.grounded ? 1 : RACCOON.airControl);
        if (R.vx < target) R.vx = Math.min(target, R.vx + a * dt);
        else if (R.vx > target) R.vx = Math.max(target, R.vx - a * dt);
      }
      R.vy = Math.min(this.maxFall, R.vy + this.gravity * dt);
      if (free && edge.jump && R.grounded) {
        R.vy = -(L.space ? SPACE.jumpSpeed : RACCOON.jumpSpeed);
        R.vx *= 1 + 0.1 * wob; // drunk jumps overshoot
        R.grounded = false;
        this.emit({ type: 'jump' });
      }
    }
    if (R.state !== 'move') R.vx *= 0.8;

    this.hiccups(dt);
    const x0 = R.x;
    this.integrate(dt);
    if (L.rope && R.grounded && typeof R.ground === 'number') {
      // The tightrope: the drunker you are, the likelier you are to wobble off it.
      const b = L.boards[R.ground];
      if (b.y === L.rope.y && b.x1 === L.rope.x1 && wob >= ROPE.slipFrom && this.rand() < ROPE.slipPerSec * (wob - ROPE.slipFrom + 1) * dt) {
        R.dropBoard = R.ground;
        R.grounded = false;
        R.ground = null;
        R.vy = 60;
        this.emit({ type: 'slip' });
        this.say('raccoon', 'Whoa— whoa—!', 1.4);
      }
    }
    if (L.id === 'store') {
      if (L.belt && this.onBelt()) R.x += BELT.speed * dt;
      this.bumpBottles(input.grab);
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
    if (this.level.faire && R.buzz > before) this.emit({ type: 'fanfare' });
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
    if (this.phase === 'store' && R.carry.length && R.hiccups % BUZZ.hiccupLobEvery === 0 && !this.has('candy')) {
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
      if (this.cannonFlight) {
        this.cannonFlight = false;
        R.rocketT = 0;
        R.vx *= 0.3;
      }
      this.emit({ type: 'land' });
      if (R.y - R.peakY >= FALL.koHeight && !L.space) this.knockOut(); // Moon falls are soft
    }
  }

  /** A fall from the high shelves knocks you out for a few seconds and costs health. */
  private knockOut() {
    const R = this.raccoon;
    if (this.phase !== 'store') return;
    R.health = Math.max(0, R.health - FALL.damage);
    this.note(`Fell off a high shelf: knocked out, −${FALL.damage}% health`);
    R.rocketT = 0;
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
    return b.y === h.y + h.h && R.x >= h.x && R.x <= h.x + h.w;
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

  private glowPaws() {
    const R = this.raccoon;
    if (R.blueT <= 0) {
      this.emit({ type: 'bluePaws' });
      this.say('raccoon', 'Ooh, glowy feet.', 1.6);
    }
    R.blueT = PRINTS.time;
    this.learn('curacao');
  }

  /** Blue curaçao: step in its spill or drink it and you leave glowing paw prints for a while. */
  private pawPrints(moved: number) {
    const R = this.raccoon;
    if (!R.grounded) return;
    if (this.spills.some((s) => s.kind === 'curacao' && Math.abs(s.y - R.y) < 1 && Math.abs(s.x - R.x) < 22)) this.glowPaws();
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
    // A jump from the grass overshoots a bale and lands you on the branch above, so hay can be reached from the ground.
    const onGrass = R.ground === 'solid' && R.y === this.level.floorY;
    if (R.state !== 'move' || !R.grounded || (typeof R.ground !== 'number' && !onGrass)) return null;
    return (
      this.bottles
        .filter((b) => b.state === 'shelf' && (b.board === R.ground || (onGrass && this.onHay(b))))
        .map((b) => ({ b, d: (b.x - R.x) * R.facing }))
        .filter(({ d }) => d > -6 && d < RACCOON.reach + 12)
        .sort((p, q) => p.d - q.d)[0]?.b ?? null
    );
  }

  private onHay(b: Bottle): boolean {
    const d = this.level.boards[b.board];
    return !!d && d.unit < 0 && !!this.level.bales?.some((r) => r.y === d.y && r.x === d.x1);
  }

  private grab() {
    const R = this.raccoon;
    const L = this.level;
    if (L.vent && this.reaches(L.vent)) {
      this.emit({ type: 'vent' });
      this.level = crawlLevel();
      this.phase = 'crawl';
      this.place(this.level.start.x, this.level.start.y);
      return;
    }
    if (L.wires && !this.wiresChewed && this.reaches(L.wires, 20)) {
      this.wiresChewed = true;
      this.powerOut = true;
      this.emit({ type: 'wires' });
      this.say('raccoon', '*crunch* …lights out.', 2.4);
      return;
    }
    if (this.atHole() && R.carry.length) {
      const n = R.carry.length;
      const specials = this.turnIn();
      this.note(`Handed up ${n} bottle${n === 1 ? '' : 's'}${specials ? ` (${specials} special)` : ''}`);
      this.smashRun = 0;
      R.carry = [];
      this.fixReady();
      this.emit({ type: 'bank' });
      if (L.faire) this.say('cousin', QUESTS[this.quests++ % QUESTS.length], 2.6);
      else this.say('cousin', specials ? 'Chrrr! Jackpot!' : 'Got it! Go get more!', 2);
      return;
    }
    if (this.atBelt() && R.carry.length) return this.loadBelt();
    if (this.atTill()) return this.mashTill();
    if (L.rack && this.rack.stock > 0 && L.counter && this.onFloorLevel(L.counter.y) && this.near(L.rack, R.x, 26)) {
      if (R.carry.length >= R.cap) return this.say('raccoon', 'Paws full.', 1.2);
      R.state = 'spin';
      R.stateT = RACK.spinTime;
      this.rack.spin = RACK.spinTime;
      this.emit({ type: 'spin' });
      return;
    }
    if (L.cannon && this.onFloorLevel(L.floorY) && Math.abs(R.x - L.cannon.x) < CANNON.reach) return this.fireCannon();
    const prize = L.powerup;
    if (prize && !this.has(prize.kind) && this.onFloorLevel(prize.on ?? L.floorY) && this.near(prize, R.x, 22)) {
      this.powerups.push(prize.kind);
      if (prize.kind === 'drone') this.drone = { x: prize.x + prize.w / 2, y: prize.y + 12, state: 'dock', cargo: [] };
      this.emit({ type: 'tote' });
      if (prize.kind === 'tote') {
        R.cap += RACCOON.toteExtra;
        this.learn('tote');
        this.say('raccoon', 'Tote bag! Room for three more.', 2.2);
      } else this.say('raccoon', POWERUP_LINES[prize.kind], 2.2);
      return;
    }
    const loose = this.looseBottle();
    if (loose) {
      if (R.carry.length >= R.cap) return this.say('raccoon', 'Paws full.', 1.2);
      this.take(loose);
      return;
    }
    const spill = this.spillHere();
    if (spill) {
      this.spills = this.spills.filter((s) => s !== spill);
      this.setBuzz(R.buzz + 1);
      this.note(`Drank a spill: Buzz now ×${this.mult}`);
      R.state = 'sip';
      R.stateT = 0.55;
      this.emit({ type: 'sip' });
      this.learn('sip');
      if (spill.kind === 'rum') {
        R.seaLegs = SEA_LEGS;
        this.emit({ type: 'seaLegs' });
        this.say('raccoon', 'Aye aye, Captain! Sea legs!', 2);
        this.learn('rum');
      } else if (spill.kind === 'curacao') this.glowPaws();
      return;
    }
    const b = this.highlighted();
    if (b) {
      if (R.carry.length >= R.cap) return this.say('raccoon', 'Paws full.', 1.2);
      this.take(b);
      return;
    }
    if (R.carry.includes('champagne')) this.popArm = 0;
  }

  /** The spill you can lap up from where you are: a puddle at your feet, or on the Moon a blob floating by your head. */
  spillHere(): Spill | undefined {
    const R = this.raccoon;
    const space = this.level.space;
    const d = (s: Spill) => (space ? Math.hypot(s.x - R.x, s.y - (R.y - R.h / 2)) : Math.abs(s.x - R.x));
    return this.spills
      .filter((s) => (space ? d(s) < SPACE.blobReach : this.onFloorLevel(s.y) && d(s) < 32))
      .sort((a, b) => d(a) - d(b))[0];
  }

  /** On the Moon: a bottle drifting past within reach, to snatch out of the air. */
  looseBottle(): Bottle | null {
    const R = this.raccoon;
    if (!this.level.space || R.state !== 'move') return null;
    const d = (b: Bottle) => Math.hypot(b.x - R.x, b.y - 12 - (R.y - R.h / 2));
    return this.bottles.filter((b) => b.state === 'air' && b.drift && d(b) < RACCOON.reach + 4).sort((p, q) => d(p) - d(q))[0] ?? null;
  }

  private take(b: Bottle) {
    const R = this.raccoon;
    this.popArm = null; // a scoop, not a cork
    if (b.kind === 'champagne' && !R.carry.includes('champagne')) this.say('raccoon', 'Ooh, bubbly. Better not shake it…', 2);
    b.state = 'gone';
    R.carry.push(b.kind);
    R.ready = R.carry.length - 1;
    this.emit({ type: 'grab' });
  }

  /**
   * Can the raccoon get its paws on r? Its body plus its reach in front has to
   * overlap r (padded) side to side, and be level with it. Standing on top of
   * the thing counts, whichever way you face. The prompts use this too, so
   * what the prompt offers is what Grab does.
   */
  reaches(r: Rect, pad = 12): boolean {
    const R = this.raccoon;
    const front = R.x + R.facing * RACCOON.reach;
    const x1 = Math.min(R.x - R.w / 2, front);
    const x2 = Math.max(R.x + R.w / 2, front);
    return x2 >= r.x - pad && x1 <= r.x + r.w + pad && R.y >= r.y - 4 && R.y - R.h <= r.y + r.h + 4;
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
    this.learn('playdead');
    // If he's looking right at you as you dive in, it doesn't work.
    R.hiddenOk = !(this.bobInside && this.seen(true));
    if (!R.hiddenOk && this.bob.state !== 'chase' && this.bob.state !== 'shout') this.spot();
  }

  private swap() {
    const R = this.raccoon;
    if (R.carry.length < 2) return;
    R.ready = (R.ready + 1) % R.carry.length;
    this.emit({ type: 'swap' });
    this.learn('swap');
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
    this.learn('hoot');
    this.ring(R.x, R.y - R.h / 2, RING.hoot);
  }

  /* ------------------------------------------------------------- throws */

  /**
   * Throw uses the highlighted shelf bottle, or else your ready item.
   * Pressing Throw starts a lob that flies when you let go. While you hold it,
   * pressing Down drops the bottle instead and Left/Right rolls it that way.
   * An arrow already held when Throw goes down picks nothing: it was for running.
   */
  private startThrow(edge: Edges) {
    const R = this.raccoon;
    if (this.phase !== 'store' || !R.grounded || R.climbing) return;
    if (!this.highlighted() && !R.carry.length) return;
    R.aimT = 0;
    this.pickThrow(edge); // Throw and a direction in the same frame count too
  }

  private pickThrow(edge: Edges) {
    const R = this.raccoon;
    if (edge.down) {
      R.aimT = null;
      this.drop();
    } else if (edge.left !== edge.right) {
      R.aimT = null;
      this.roll(edge.right ? 1 : -1);
    }
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
    this.learn('drop');
  }

  private roll(dir: 1 | -1) {
    const R = this.raccoon;
    const b = this.takeForThrow(); // the bottle you were aiming at, before you turn
    if (!b) return;
    R.facing = dir;
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
    b.vx = dir * THROW.rollSpeed;
    b.vy = 0;
    this.emit({ type: 'roll' });
    this.learn('roll');
  }

  private lob() {
    const L = this.lobLaunch();
    if (!L) return;
    const b = this.takeForThrow();
    if (!b) return;
    Object.assign(b, { x: L.x, y: L.y, vx: L.vx, vy: L.vy, state: 'air', safeT: THROW.selfSafe });
    this.emit({ type: 'throw' });
    this.learn('lob');
  }

  private lobSpeed(dist: number, angle = THROW.lobAngle): number {
    return Math.sqrt((dist * this.gravity) / Math.sin(2 * angle));
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
      vy = Math.min(this.maxFall, vy + this.gravity * DT);
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

  /** Running into a bottle knocks it off; holding Grab scoops it up instead, if there's room. */
  private bumpBottles(scoop: boolean) {
    const R = this.raccoon;
    if (R.state !== 'move' || Math.abs(R.vx) < RACCOON.bumpSpeed) return;
    const dir = Math.sign(R.vx);
    for (const b of this.bottles) {
      if (b.state !== 'shelf') continue;
      const tall = b.kind === 'regular' || b.kind === 'rum' || b.kind === 'curacao' || b.kind === 'champagne';
      const bw = tall ? 7 : 5;
      const bh = tall ? 26 : 16;
      if (R.x + R.w / 2 < b.x - bw || R.x - R.w / 2 > b.x + bw) continue;
      if (R.y - R.h > b.y || R.y < b.y - bh) continue;
      if ((b.x - R.x) * dir < -4) continue;
      if (scoop && R.carry.length < R.cap) this.take(b);
      else this.knock(b, dir);
      return; // a bump only ever moves one
    }
  }

  /** Is this bottle hanging under a branch, rather than standing on something? */
  hanging(b: Bottle): boolean {
    const d = this.level.boards[b.board];
    return !!this.level.faire && b.state === 'shelf' && !!d && d.unit >= 0;
  }

  private knock(b: Bottle, dir: number) {
    if (this.hanging(b)) b.y += HANG;
    b.state = 'air';
    b.safeT = THROW.selfSafe;
    if (this.level.space) {
      // No gravity to speak of: off it floats in a straight line.
      const [lo, hi] = SPACE.drift;
      b.drift = true;
      b.vx = dir * (lo + this.rand() * (hi - lo));
      b.vy = -10 - this.rand() * 30;
      this.emit({ type: 'knock' });
      return;
    }
    b.vx = dir * (50 + this.rand() * 90);
    b.vy = -120 - this.rand() * 80;
    this.emit({ type: 'knock' });
  }

  private updateBottles(dt: number) {
    for (const b of this.bottles) {
      if (b.state === 'air') this.fly(b, dt);
      else if (b.state === 'rolling') this.rollOn(b, dt);
      else if (b.state === 'belt') this.ride(b, dt);
      if (this.over) return;
    }
    this.bottles = this.bottles.filter((b) => b.state !== 'gone');
  }

  private fly(b: Bottle, dt: number) {
    const L = this.level;
    b.safeT = Math.max(0, b.safeT - dt);
    if (!b.drift) b.vy = Math.min(this.maxFall, b.vy + this.gravity * dt);
    const prev = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.drift) {
      // A drifting bottle goes until it meets the dome, the floor, a rock or someone. It never hurts you: grab it.
      const mid = b.y - 12;
      const rock = L.units.some((u) => u.bottom !== undefined && b.x > u.x && b.x < u.x + u.w && mid > u.top && mid < u.bottom);
      if (rock || b.x < 4 || b.x > L.width - 4 || b.y - 24 < L.ceilingY) return this.smash(b, b.y);
    } else {
      if (b.y < L.ceilingY) b.vy = Math.abs(b.vy) * 0.3;
      if (b.x < 0 || b.x > L.width) b.vx = -b.vx * 0.4;
    }
    const hit = this.airHit(b.x, prev, b.y, b.drift ? 1 : b.safeT, b.owner);
    if (!hit) return;
    // A bottle that hits someone or something damages it; one that hits nothing makes noise.
    switch (hit.what) {
      case 'raccoon':
        this.smash(b, this.brokeAt(b), 0);
        this.hit(b.vx >= 0 ? 1 : -1, b.owner === 'bob' ? "Bob's bottle" : b.owner === 'possum' ? "the possum's can" : b.owner === 'owl' ? 'an owl pellet' : 'a falling bottle');
        break;
      case 'possum':
        this.smash(b, this.brokeAt(b), 0);
        this.soakPossum();
        break;
      case 'bob':
        this.smash(b, this.brokeAt(b), 0);
        this.knockBob();
        break;
      case 'clown':
        this.smash(b, this.brokeAt(b), 0);
        this.knockClown(hit.clown);
        break;
      case 'critter':
        this.smash(b, this.brokeAt(b), 0);
        this.knockCritter(hit.critter);
        break;
      case 'sat':
        this.smash(b, this.brokeAt(b), 0);
        this.knockSat(hit.sat);
        break;
      case 'archer':
        this.smash(b, this.brokeAt(b), 0);
        this.knockArcher(hit.archer);
        this.say('cousin', 'Chrr-chrr! Bullseye!', 1.8);
        break;
      case 'bale': {
        // Soft landing: it sits on the hay, ready to pick up.
        const L = this.level;
        b.y = hit.y;
        b.vx = 0;
        b.vy = 0;
        b.board = L.boards.findIndex((d) => d.unit < 0 && d.y === hit.y && b.x >= d.x1 && b.x <= d.x2);
        b.state = 'shelf';
        this.emit({ type: 'land' });
        this.say('cousin', 'Chrr! Saved by the hay!', 1.8);
        break;
      }
      case 'scrubber':
        this.smash(b, this.brokeAt(b), 0);
        this.knockScrubber();
        break;
      case 'display':
        this.plushPuff = 0.8;
        this.smash(b, this.brokeAt(b), RING.biggest, hit.y);
        this.say('cousin', 'Chrrr! Right in the display!', 2);
        break;
      case 'solid':
        this.smash(b, hit.y);
        break;
    }
  }

  /** What an airborne bottle moving from y0 to y1 at x runs into, if anything. */
  private airHit(x: number, y0: number, y1: number, safeT: number, owner?: Bottle['owner']): AirHit | null {
    const L = this.level;
    const R = this.raccoon;
    const inside = (rx: number, ry: number, rw: number, rh: number) => x >= rx && x <= rx + rw && y1 - 8 >= ry && y1 - 8 <= ry + rh;
    if (L.id === 'store') {
      if (safeT <= 0 && R.state !== 'playdead' && inside(R.x - R.w / 2, R.y - R.h, R.w, R.h)) return { what: 'raccoon' };
      const B = this.bob;
      if (owner !== 'bob' && this.bobInside && B.state !== 'down' && inside(B.x - BOB.w / 2, this.bobFeet - BOB.h, BOB.w, BOB.h)) return { what: 'bob' };
      for (const s of this.sats) if (s.state !== 'down' && inside(s.x - 24, s.y - 14, 48, 30)) return { what: 'sat', sat: s };
      const S = this.scrub;
      const box = this.scrubBox;
      if (S.state !== 'down' && inside(S.x - box.w / 2, L.floorY - box.h, box.w, box.h)) return { what: 'scrubber' };
      // Its camera head up on the pole: drop a bottle on it from the board above.
      if (S.state !== 'down' && S.eye > box.h && inside(S.x - 12, L.floorY - S.eye - 10, 24, 20)) return { what: 'scrubber' };
      for (const c of this.clowns) if (c.state !== 'down' && inside(c.x - CLOWN.w / 2, L.floorY - CLOWN.h, CLOWN.w, CLOWN.h)) return { what: 'clown', clown: c };
      if (owner !== 'owl') for (const c of this.critters) if (this.critterUp(c) && inside(c.x - 16, c.y - 26, 32, 30)) return { what: 'critter', critter: c };
      for (const a of this.archers) if ((a.state === 'draw' || a.state === 'recover') && inside(a.x - 14, L.floorY - ARCHER.height, 28, ARCHER.height)) return { what: 'archer', archer: a };
      const P = this.possum;
      if (P && owner !== 'possum' && inside(P.x - 18, P.y - 28, 36, 28)) return { what: 'possum' };
      if (owner !== 'possum' && owner !== 'owl') for (const d of [L.plush, L.rack]) if (d && inside(d.x, d.y, d.w, d.h)) return { what: 'display', y: y1 };
    }
    for (const s of L.bales ?? []) if (x >= s.x && x <= s.x + s.w && y0 <= s.y && y1 >= s.y) return { what: 'bale', y: s.y };
    for (const s of this.solids()) {
      if (x >= s.x && x <= s.x + s.w && y0 <= s.y && y1 >= s.y) return { what: 'solid', y: s.y };
    }
    return null;
  }

  /** Where a bottle that hit someone ends up: on the floor below, or on the Moon right there in the air. */
  private brokeAt(b: Bottle): number {
    return this.level.space ? b.y : this.surfaceBelow(b.x, b.y);
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
      if (S.state !== 'down' && Math.abs(b.x - S.x) < this.scrubBox.w / 2) {
        this.knockScrubber();
        b.vx *= THROW.rollPinSlow;
      }
      const B = this.bob;
      if (this.bobInside && B.state !== 'down' && B.lift < 8 && Math.abs(b.x - B.x) < BOB.w / 2) {
        this.knockBob();
        b.vx *= THROW.rollPinSlow;
      }
      for (const c of this.clowns) {
        if (c.state !== 'down' && Math.abs(b.x - c.x) < CLOWN.w / 2) {
          this.knockClown(c);
          b.vx *= THROW.rollPinSlow;
        }
      }
      for (const a of this.archers) {
        if ((a.state === 'draw' || a.state === 'recover') && Math.abs(b.x - a.x) < 16) {
          this.knockArcher(a);
          b.vx *= THROW.rollPinSlow;
        }
      }
    }
  }

  /** Smash a bottle at surface y. `ring` 0 means it hit someone, so it makes no noise ring. */
  private smash(b: Bottle, y: number, ring?: number, ringY = y) {
    b.state = 'gone';
    b.board = -1;
    b.y = y;
    if (b.kind === 'can') {
      // A can just clanks (an owl pellet splats): no glass, no puddle, not much noise.
      this.emit({ type: b.owner === 'owl' ? 'splat' : 'clank' });
      if (ring !== 0) this.ring(b.x, y, RING.small);
      return;
    }
    if (isSpecial(b.kind)) {
      this.specialsBroken++;
      this.note('A special smashed: no 100% tonight');
    }
    const space = !!this.level.space; // on the Moon a spill is a floating blob, there to be drunk midair
    const flows = !space && y === this.level.floorY && BIG.includes(b.kind);
    const flow = flows ? FLOW.min + this.rand() * (FLOW.max - FLOW.min) : 0;
    this.spills.push({ id: this.nextId++, x: b.x, y: space ? y - SPACE.blobUp : y, kind: b.kind, x0: b.x, flow });
    this.emit({ type: 'smash', x: b.x, y, kind: b.kind });
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
    if ((S.state === 'patrol' || S.state === 'peek' || S.state === 'rush') && Math.hypot(S.x - x, floor - 13 - y) <= r) {
      const [a, b] = this.level.scrubberRoute!;
      S.state = 'rush';
      S.target = Math.max(a, Math.min(b, x));
      // It chases the spill this crash made, even as it runs downhill.
      S.spill = this.spills.find((s) => s.y === floor && Math.abs(s.x0 - x) < 2)?.id ?? 0;
      this.emit({ type: 'beep' });
    }
    const B = this.bob;
    if (['search', 'look', 'confused', 'investigate'].includes(B.state) && Math.hypot(B.x - x, this.bobFeet - 60 - y) <= r) {
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
    S.alarmCd = Math.max(0, S.alarmCd - dt);
    const touching = Math.abs(R.y - floor) < 2 && Math.abs(R.x - S.x) < (this.scrubBox.w + R.w) / 2 - 4;
    if (S.tank) this.updateTurret(dt);
    if (S.state === 'down') {
      S.t -= dt;
      if (S.t <= 0) S.state = 'patrol';
    } else if (S.state === 'alarm') {
      S.t -= dt;
      if (S.t <= 0) S.state = 'patrol';
    } else if (S.state === 'peek') {
      // Stopped, eye going up the pole. At the top it scans, turns around halfway, then goes back to patrol.
      if (touching && S.alarmCd <= 0) return this.siren('bumped');
      if (S.eye >= SCRUBBER.eyeTop) {
        const before = S.t;
        S.t -= dt;
        if (before > SCRUBBER.peekHold / 2 && S.t <= SCRUBBER.peekHold / 2) S.dir = S.dir === 1 ? -1 : 1;
        if (S.t <= 0) {
          S.state = 'patrol';
          S.peekCd = SCRUBBER.peekEvery[0] + this.rand() * (SCRUBBER.peekEvery[1] - SCRUBBER.peekEvery[0]);
        }
      }
    } else if (S.state === 'patrol') {
      if (touching && S.alarmCd <= 0) return this.siren('bumped');
      S.peekCd -= dt;
      if (S.peekCd <= 0) {
        S.state = 'peek';
        S.t = SCRUBBER.peekHold;
        this.emit({ type: 'beep' });
      }
      // Blue paw prints on the floor: it follows them, mopping as it goes.
      const print = this.prints
        .filter((p) => p.y === floor && p.x >= a && p.x <= b)
        .sort((p, q) => Math.abs(p.x - S.x) - Math.abs(q.x - S.x))[0];
      if (S.aimT > 0) {
        // Stopped to shoot.
      } else if (print) {
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
      // It bumps you off your feet if you're in its way on the floor, and tells on you.
      if (touching) {
        this.hit(R.x >= S.x ? 1 : -1, S.tank ? 'the tank' : 'the scrubber');
        if (S.alarmCd <= 0) return this.siren('bumped');
      }
    } else {
      S.t -= dt;
      this.slurpAt(S.x, 40);
      if (S.t <= 0) S.state = 'patrol';
    }

    // The camera: up the pole while it peeks, tucked away otherwise (and at once if it's knocked over).
    const eyeBase = S.tank ? TANK.eyeBase : SCRUBBER.eyeBase;
    if (S.state === 'down') S.eye = eyeBase;
    else if (S.state === 'peek') S.eye = Math.min(SCRUBBER.eyeTop, S.eye + SCRUBBER.eyeUp * dt);
    else S.eye = Math.max(eyeBase, S.eye - SCRUBBER.eyeDown * dt);
    S.panT += dt;
    const tilt = S.state === 'peek' ? 0 : SCRUBBER.camTilt;
    S.cam = tilt + SCRUBBER.camSweep * Math.sin((2 * Math.PI * S.panT) / SCRUBBER.camPeriod);
    // Patrolling or peeking, it snitches on anything its camera sees. Rushing or mopping, it's busy.
    if ((S.state === 'patrol' || S.state === 'peek') && (S.tank || S.alarmCd <= 0) && this.camSees()) {
      if (S.tank && S.aimT <= 0 && S.reload <= 0) {
        S.aimT = TANK.aim;
        this.emit({ type: 'aim' });
      }
      if (S.alarmCd <= 0) this.siren('spotted');
    }
  }

  /* ------------------------------------------------------------ archers */

  private floater(x: number, y: number, text: string, colour: string) {
    this.floaters.push({ x, y, text, colour, age: 0 });
  }

  /** They stay behind their cover until you're in range and in plain sight, then stand up to shoot. */
  private updateArchers(dt: number) {
    const R = this.raccoon;
    const floor = this.level.floorY;
    for (const a of this.archers) {
      if (a.state === 'hidden') {
        a.cd -= dt;
        if (a.cd > 0 || !this.archerSees(a)) continue;
        a.state = 'draw';
        a.t = ARCHER.draw;
        this.emit({ type: 'creak', x: a.x });
        if (this.rand() < 0.4) this.floater(a.x, floor - ARCHER.height - 26, ARCHER_SHOUTS[Math.floor(this.rand() * ARCHER_SHOUTS.length)], '#f4e7cc');
      } else if (a.state === 'draw') {
        a.t -= dt;
        if (a.t > ARCHER.lock) {
          a.dir = R.x >= a.x ? 1 : -1;
          const pitch = Math.atan2(floor - ARCHER.eye - (R.y - R.h / 2), Math.abs(R.x - a.x));
          a.aim = Math.max(ARCHER.pitchMin, Math.min(ARCHER.pitchMax, pitch));
        }
        if (a.t <= 0) this.loose(a);
      } else {
        a.t -= dt;
        if (a.t <= 0) {
          a.state = 'hidden';
          a.cd = ARCHER.every[0] + this.rand() * (ARCHER.every[1] - ARCHER.every[0]);
        }
      }
    }
    for (const s of this.arrows) {
      const x0 = s.x;
      const y0 = s.y;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.spent = this.arrowLands(s, x0, y0);
      if (this.over) return;
    }
    this.arrows = this.arrows.filter((s) => !s.spent);
  }

  private archerSees(a: Archer): boolean {
    const R = this.raccoon;
    if (R.state === 'playdead') return false;
    const o = { x: a.x, y: this.level.floorY - ARCHER.eye };
    const p = { x: R.x, y: R.y - R.h / 2 };
    return Math.hypot(p.x - o.x, p.y - o.y) <= ARCHER.range && this.lineOfSight(o, p) && !this.throughBoard(o, p);
  }

  private loose(a: Archer) {
    const dx = a.dir * Math.cos(a.aim);
    const dy = -Math.sin(a.aim);
    this.arrows.push({ x: a.x + dx * 22, y: this.level.floorY - ARCHER.eye + dy * 22, vx: dx * ARCHER.arrowSpeed, vy: dy * ARCHER.arrowSpeed, from: a, spent: false });
    a.state = 'recover';
    a.t = ARCHER.recover;
    this.emit({ type: 'twang', x: a.x });
  }

  private knockArcher(a: Archer) {
    a.state = 'down';
    a.t = KNOCKDOWN.archer;
    this.note('Knocked out an archer');
    this.emit({ type: 'bonk' });
  }

  /** Does this arrow stop here? It sets off whatever it hit, and sticks in anything that isn't a person. */
  private arrowLands(s: Arrow, x0: number, y0: number): boolean {
    const L = this.level;
    const R = this.raccoon;
    const B = this.bob;
    const { x, y } = s;
    const inBox = (rx: number, ry: number, rw: number, rh: number) => x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
    if (x <= 0 || x >= L.width || y <= 0) return true;
    if (R.state !== 'playdead' && R.invuln <= 0 && inBox(R.x - R.w / 2, R.y - R.h, R.w, R.h)) {
      if (this.has('shield') && R.shieldT <= 0) {
        R.shieldT = SHIELD.recharge;
        this.floater(R.x, R.y - 46, 'CLANG!', '#ffe9a8');
        this.emit({ type: 'clank' });
        this.note('The pot lid blocked an arrow');
        return true;
      }
      this.hit(s.vx >= 0 ? 1 : -1, 'an arrow');
      this.emit({ type: 'yelp' });
      return true;
    }
    if (this.bobInside && B.state !== 'down' && inBox(B.x - BOB.w / 2, L.floorY - BOB.h, BOB.w, BOB.h)) {
      this.knockBob();
      this.sayCd.cousin = 0;
      this.say('cousin', 'Chrr-chrr! Right in the tights!', 2.2);
      return true;
    }
    for (const a of this.archers) {
      if (a === s.from || (a.state !== 'draw' && a.state !== 'recover')) continue;
      if (inBox(a.x - 14, L.floorY - ARCHER.height, 28, ARCHER.height)) {
        this.knockArcher(a);
        this.sayCd.cousin = 0;
        this.say('cousin', 'Chrr! They shot their own!', 2);
        return true;
      }
    }
    // An arrow through the string brings the bottle down.
    const cut = this.bottles.find((b) => this.hanging(b) && Math.abs(b.x - x) < 9 && y >= b.y + 8 && y <= b.y + HANG);
    if (cut) {
      cut.y += HANG;
      cut.state = 'air';
      cut.vx = 0;
      cut.vy = 0;
      cut.safeT = 0;
      this.emit({ type: 'knock' });
      this.floater(cut.x, cut.y - 40, 'snip!', '#f4e7cc');
      return true;
    }
    let stuck = y >= L.floorY;
    for (const r of [...this.solids(), ...(L.bales ?? [])]) stuck ||= inBox(r.x, r.y, r.w, r.h);
    for (const u of L.units) if (y >= u.top - 14) for (const post of [u.x, u.x + u.w]) stuck ||= (x0 - post) * (x - post) <= 0;
    for (const b of L.boards) if (b.unit >= 0) stuck ||= (y0 - b.y) * (y - b.y) <= 0 && x >= b.x1 && x <= b.x2;
    if (!stuck) return false;
    this.stuck.push({ x, y: Math.min(y, L.floorY), angle: Math.atan2(s.vy, s.vx), age: 0 });
    this.emit({ type: 'thunk', x });
    return true;
  }

  /* ------------------------------------------------------------- circus */

  private updateCircus(dt: number) {
    const R = this.raccoon;
    const L = this.level;
    const floor = L.floorY;
    this.alertT = Math.max(0, this.alertT - dt);
    for (const c of this.clowns) {
      c.cd = Math.max(0, c.cd - dt);
      if (c.state !== 'patrol') {
        c.t -= dt;
        if (c.t <= 0) c.state = 'patrol';
        continue;
      }
      const [a, b] = c.route;
      c.x += c.dir * CLOWN.speed * dt;
      if (c.x <= a) c.dir = 1;
      if (c.x >= b) c.dir = -1;
      const touching = Math.abs(R.y - floor) < 2 && Math.abs(R.x - c.x) < (CLOWN.w + R.w) / 2 - 4;
      if (c.cd <= 0 && (touching || this.clownSees(c))) this.honk(c);
    }
    const rate = this.alertT > 0 ? 2 : 1;
    for (const c of this.critters) {
      if (c.state === 'down') {
        c.t -= dt;
        if (c.t <= 0) c.state = 'idle';
      } else if (c.state === 'idle') {
        c.cd -= dt * rate;
        if (c.cd <= 0 && this.critterSees(c)) {
          c.state = 'wind';
          c.t = CRITTER[c.kind].wind;
          c.dir = R.x >= c.x ? 1 : -1;
          if (c.kind === 'snake') this.emit({ type: 'hiss' });
          else this.emit({ type: c.kind === 'eagle' ? 'screech' : 'whoo', x: c.x });
        }
      } else if (c.state === 'wind') {
        c.t -= dt;
        c.dir = R.x >= c.x ? 1 : -1;
        if (c.kind === 'eagle' && c.t > CRITTER.eagle.lock) c.to = { x: R.x, y: R.y - R.h / 2 };
        if (c.t <= 0) this.critterAttack(c);
      } else if (c.state === 'dive') this.eagleDive(c, dt);
      else {
        // An eagle flying home after a dive.
        const dx = c.home.x - c.x;
        const dy = c.home.y - c.y;
        const d = Math.hypot(dx, dy);
        const step = CRITTER.eagle.back * dt;
        if (d <= step) {
          Object.assign(c, { x: c.home.x, y: c.home.y, state: 'idle', cd: this.critterGap(c) });
        } else {
          c.x += (dx / d) * step;
          c.y += (dy / d) * step;
        }
      }
    }
    for (const sp of this.spits) {
      const x0 = sp.x;
      sp.x += sp.vx * dt;
      sp.left -= Math.abs(sp.vx) * dt;
      sp.spent = this.spitLands(sp, x0);
      if (this.over) return;
    }
    this.spits = this.spits.filter((sp) => !sp.spent);
  }

  private critterGap(c: Critter): number {
    const [lo, hi] = CRITTER[c.kind].every;
    return lo + this.rand() * (hi - lo);
  }

  /** Up and hittable: perched birds always, a snake only while it's out of its basket. */
  private critterUp(c: Critter): boolean {
    return c.state !== 'down' && (c.kind !== 'snake' || c.state === 'wind');
  }

  private clownSees(c: Clown): boolean {
    if (this.raccoon.state === 'playdead') return false;
    return this.coneSees({ x: c.x + c.dir * 8, y: this.level.floorY - CLOWN.eye }, c.dir, CLOWN.tilt, CLOWN.half, CLOWN.range, true);
  }

  private critterSees(c: Critter): boolean {
    const R = this.raccoon;
    if (R.state === 'playdead') return false;
    const L = this.level;
    // Snakes only spit along the floor.
    if (c.kind === 'snake' && R.y < L.floorY - CRITTER.snake.reachUp) return false;
    const o = { x: c.x, y: c.kind === 'snake' ? L.floorY - 16 : c.y - 10 };
    const p = { x: R.x, y: R.y - R.h / 2 };
    return Math.hypot(p.x - o.x, p.y - o.y) <= CRITTER[c.kind].range && this.lineOfSight(o, p) && !this.throughBoard(o, p);
  }

  /** The horn: a big noise, the animals get riled, and before Bob's due it calls him in, like the scrubber's siren. */
  private honk(c: Clown) {
    c.state = 'honk';
    c.t = CLOWN.honk;
    c.cd = CLOWN.cooldown;
    this.alertT = CRITTER.alertTime;
    this.emit({ type: 'honk', x: c.x });
    this.ring(c.x, this.level.floorY - 60, RING.siren);
    if (this.bob.state === 'outside') this.alarmAt = c.x;
    this.note(this.bob.state === 'outside' ? 'A clown honked: it called Bob in early' : 'A clown honked');
    this.say('cousin', 'Chrr! The clown honked! The animals are riled!', 2.2);
  }

  private critterAttack(c: Critter) {
    const R = this.raccoon;
    const L = this.level;
    if (c.kind === 'eagle') {
      // Overshoot a little past where it locked, so a dodge sends it into whatever is behind you.
      const dx = c.to.x - c.x;
      const dy = c.to.y - c.y;
      const d = Math.hypot(dx, dy) || 1;
      c.to = { x: c.to.x + (dx / d) * 60, y: Math.min(L.floorY - 10, c.to.y + (dy / d) * 60) };
      c.state = 'dive';
      return;
    }
    c.state = 'idle';
    c.cd = this.critterGap(c);
    if (c.kind === 'owl') {
      const hx = c.x + c.dir * 10;
      const hy = c.y - 8;
      const dx = R.x - hx;
      const dy = R.y - R.h / 2 - hy;
      const O = CRITTER.owl;
      const T = Math.max(O.minFlight, Math.min(O.maxFlight, Math.abs(dx) / O.speed));
      const vy = (dy - 0.5 * this.gravity * T * T) / T;
      this.bottles.push({ id: this.nextId++, x: hx, y: hy, kind: 'can', board: -1, state: 'air', vx: dx / T, vy, safeT: 0, owner: 'owl' });
      this.emit({ type: 'throw' });
    } else {
      this.spits.push({ x: c.x + c.dir * 18, y: L.floorY - 14, vx: c.dir * CRITTER.snake.speed, left: CRITTER.snake.range, spent: false });
      this.emit({ type: 'spit', x: c.x });
    }
  }

  /** Straight at where it locked on. It takes out what it flies through: you, Bob, a clown, bottles off a bleacher row. */
  private eagleDive(c: Critter, dt: number) {
    const R = this.raccoon;
    const B = this.bob;
    const L = this.level;
    const dx = c.to.x - c.x;
    const dy = c.to.y - c.y;
    const d = Math.hypot(dx, dy);
    const step = CRITTER.eagle.speed * dt;
    const done = d <= step;
    c.x = done ? c.to.x : c.x + (dx / d) * step;
    c.y = done ? c.to.y : c.y + (dy / d) * step;
    c.dir = dx >= 0 ? 1 : -1;
    const back = () => (c.state = 'back');
    if (R.state !== 'playdead' && R.invuln <= 0 && Math.abs(R.x - c.x) < R.w / 2 + 8 && c.y > R.y - R.h - 8 && c.y < R.y + 4) {
      this.hit(c.dir, 'an eagle');
      return back();
    }
    if (this.bobInside && B.state !== 'down' && Math.abs(B.x - c.x) < BOB.w / 2 && c.y > L.floorY - BOB.h) {
      this.knockBob();
      this.say('cousin', 'Chrr-chrr! The eagle got Bob!', 2);
      return back();
    }
    for (const k of this.clowns) if (k.state !== 'down' && Math.abs(k.x - c.x) < CLOWN.w / 2 && c.y > L.floorY - CLOWN.h) this.knockClown(k);
    for (const b of this.bottles) if (b.state === 'shelf' && Math.abs(b.x - c.x) < 10 && c.y > b.y - 30 && c.y < b.y) this.knock(b, c.dir);
    if (done) back();
  }

  private spitLands(sp: Spit, x0: number): boolean {
    const L = this.level;
    const R = this.raccoon;
    const B = this.bob;
    const { x, y } = sp;
    const leave = (at: number) => {
      this.slicks.push({ x: at, age: 0 });
      return true;
    };
    if (x <= 0 || x >= L.width) return true;
    if (R.state !== 'playdead' && R.invuln <= 0 && Math.abs(R.x - x) < R.w / 2 && y > R.y - R.h && y < R.y + 2) {
      this.hit(sp.vx >= 0 ? 1 : -1, 'snake spit');
      return leave(R.x);
    }
    if (this.bobInside && B.state !== 'down' && Math.abs(B.x - x) < BOB.w / 2) {
      this.knockBob();
      return leave(B.x);
    }
    for (const k of this.clowns) if (k.state !== 'down' && Math.abs(k.x - x) < CLOWN.w / 2) {
      this.knockClown(k);
      return leave(k.x);
    }
    for (const s of this.solids()) if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return leave(x0);
    for (const u of L.units) for (const post of [u.x, u.x + u.w]) if ((x0 - post) * (x - post) <= 0) return leave(x0);
    return sp.left <= 0 ? leave(x) : false;
  }

  private knockClown(c: Clown) {
    c.state = 'down';
    c.t = KNOCKDOWN.clown;
    this.emit({ type: 'bonk' });
    this.note('Knocked a clown off their unicycle');
    this.say('cousin', 'Chrr! Clown down!', 1.6);
  }

  private knockCritter(c: Critter) {
    Object.assign(c, { state: 'down', t: KNOCKDOWN.critter, x: c.home.x, y: c.home.y, cd: this.critterGap(c) });
    this.emit({ type: 'bonk' });
    this.note(`Bonked the ${c.kind}`);
  }

  /** Climb in and it fires you across the tent in a high arc to the far bleachers. You can't steer, and you knock bottles off as you go. */
  private fireCannon() {
    const R = this.raccoon;
    const L = this.level;
    const k = L.cannon!;
    const T = CANNON.flight;
    R.x = k.x;
    R.vx = (k.to.x - k.x) / T;
    R.vy = (k.to.y - L.floorY - 0.5 * this.gravity * T * T) / T;
    R.grounded = false;
    R.ground = null;
    R.rocketT = T + 0.4;
    this.cannonFlight = true;
    this.shake = Math.max(this.shake, 0.8);
    this.emit({ type: 'cannon', x: k.x });
    this.ring(k.x, L.floorY - 30, RING.biggest);
    this.note('Fired out of the cannon');
    this.say('raccoon', 'WHEEEEEEE!', 1.4);
  }

  /* --------------------------------------------------------------- moon */

  private updateSats(dt: number) {
    for (const s of this.sats) {
      s.cd = Math.max(0, s.cd - dt);
      if (s.state !== 'scan') {
        s.t -= dt;
        if (s.t <= 0) s.state = 'scan';
        continue;
      }
      s.sweepT += dt;
      const [a, b] = s.route;
      s.x += s.dir * SAT.speed * dt;
      if (s.x <= a) [s.x, s.dir] = [a, 1];
      else if (s.x >= b) [s.x, s.dir] = [b, -1];
      if (s.cd <= 0 && this.satSees(s)) this.satAlarm(s);
    }
  }

  /** Its searchlight's angle above level: straight down, swinging side to side. */
  satBeam(s: Sat): number {
    return -Math.PI / 2 + SAT.sweep * Math.sin((2 * Math.PI * s.sweepT) / SAT.period);
  }

  satEye(s: Sat) {
    return { x: s.x, y: s.y + 12 };
  }

  /** The searchlight looks down, so a rock over your head hides you. */
  private satSees(s: Sat): boolean {
    const R = this.raccoon;
    if (R.state === 'playdead' && R.hiddenOk) return false;
    return this.coneSees(this.satEye(s), 1, this.satBeam(s), SAT.half, SAT.range, true);
  }

  private satAlarm(s: Sat) {
    s.state = 'alarm';
    s.t = SAT.alarm;
    s.cd = SAT.cooldown;
    this.emit({ type: 'siren' });
    this.ring(s.x, s.y, RING.siren);
    if (this.bob.state === 'outside') this.alarmAt = s.x;
    this.note(this.bob.state === 'outside' ? 'A satellite spotted you: alarm, and it called Bob in early' : 'A satellite spotted you: alarm');
    this.say('cousin', 'Chrr! The satellite saw you! Get under a rock!', 2.2);
  }

  private knockSat(s: Sat) {
    s.state = 'down';
    s.t = KNOCKDOWN.sat;
    this.emit({ type: 'bonk' });
    this.say('cousin', 'Chrr-chrr! Satellite down!', 1.8);
  }

  /** The drone rides at your shoulder. Fill your paws and it takes the lot to the airlock, then comes back for more. */
  private updateDrone(dt: number) {
    const D = this.drone;
    if (!D) return;
    const R = this.raccoon;
    const home = { x: R.x - R.facing * 34, y: R.y - 26 }; // behind you, by the tail, clear of the prompts
    const flyTo = (x: number, y: number) => {
      const dx = x - D.x;
      const dy = y - D.y;
      const d = Math.hypot(dx, dy);
      const step = DRONE.speed * dt;
      if (d <= step) {
        D.x = x;
        D.y = y;
        return true;
      }
      D.x += (dx / d) * step;
      D.y += (dy / d) * step;
      return false;
    };
    if (D.state === 'dock') {
      const k = Math.min(1, DRONE.follow * dt);
      D.x += (home.x - D.x) * k;
      D.y += (home.y - D.y) * k;
      if (R.carry.length >= R.cap && this.level.hole) {
        D.cargo = R.carry;
        R.carry = [];
        this.fixReady();
        D.state = 'out';
        this.emit({ type: 'drone' });
        this.note(`The drone took ${D.cargo.length} up to your cousin`);
        this.say('raccoon', 'Fly, little buddy!', 1.4);
      }
    } else if (D.state === 'out') {
      const h = this.level.hole!;
      if (flyTo(h.x + h.w / 2, h.y + h.h / 2)) {
        const n = D.cargo.length;
        const specials = this.turnIn(D.cargo);
        this.note(`The drone handed up ${n}${specials ? ` (${specials} special)` : ''}`);
        D.cargo = [];
        D.state = 'back';
        this.smashRun = 0;
        this.emit({ type: 'bank' });
        this.say('cousin', specials ? 'Chrrr! Air mail! Jackpot!' : 'Chrr! Air mail!', 2);
      }
    } else if (flyTo(home.x, home.y)) D.state = 'dock';
  }

  /* --------------------------------------------------------------- tank */

  /** The size of whatever is patrolling tonight. */
  get scrubBox() {
    return this.scrub.tank ? TANK : SCRUBBER;
  }

  /** The turret follows you until just before it fires, so a shot can be dodged by moving at the last moment. */
  private updateTurret(dt: number) {
    const S = this.scrub;
    const R = this.raccoon;
    S.reload = Math.max(0, S.reload - dt);
    S.kick = Math.max(0, S.kick - dt);
    let want = 0;
    let firing = false;
    if (S.state === 'down') S.aimT = 0;
    if (S.aimT > 0) {
      S.aimT = Math.max(0, S.aimT - dt);
      firing = S.aimT === 0;
      want = S.aim;
      if (S.aimT > TANK.lock) {
        S.gun = R.x >= S.x ? 1 : -1;
        const pitch = Math.atan2(this.level.floorY - TANK.pivot - (R.y - R.h / 2), Math.abs(R.x - S.x));
        want = Math.max(TANK.pitchMin, Math.min(TANK.pitchMax, pitch));
      }
    } else if (S.state !== 'down') S.gun = S.dir;
    const turn = TANK.swing * dt;
    S.aim += Math.max(-turn, Math.min(turn, want - S.aim));
    if (firing) this.fire();
  }

  private fire() {
    const S = this.scrub;
    const dx = S.gun * Math.cos(S.aim);
    const dy = -Math.sin(S.aim);
    this.shells.push({
      x: S.x + dx * TANK.barrel,
      y: this.level.floorY - TANK.pivot + dy * TANK.barrel,
      vx: dx * TANK.shellSpeed,
      vy: dy * TANK.shellSpeed,
      spent: false,
    });
    S.reload = TANK.reload;
    S.kick = 0.25;
    this.shake = Math.max(this.shake, 0.5);
    this.emit({ type: 'shot' });
  }

  private updateShells(dt: number) {
    for (const s of this.shells) {
      const x0 = s.x;
      const y0 = s.y;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (!this.shellStops(x0, y0, s.x, s.y)) continue;
      s.spent = true;
      this.blast(s.x, Math.min(s.y, this.level.floorY));
    }
    this.shells = this.shells.filter((s) => !s.spent);
  }

  /** A shell flies dead straight and stops at the first thing in its way. Shelf posts and boards count, so shelves are cover. */
  private shellStops(x0: number, y0: number, x: number, y: number): boolean {
    const L = this.level;
    const R = this.raccoon;
    const B = this.bob;
    const P = this.possum;
    if (x <= 0 || x >= L.width || y <= L.ceilingY || y >= L.floorY) return true;
    const inBox = (rx: number, ry: number, rw: number, rh: number) => x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
    if (R.state !== 'playdead' && inBox(R.x - R.w / 2, R.y - R.h, R.w, R.h)) return true;
    if (this.bobInside && B.state !== 'down' && inBox(B.x - BOB.w / 2, L.floorY - BOB.h, BOB.w, BOB.h)) return true;
    if (P && inBox(P.x - 18, P.y - 28, 36, 28)) return true;
    if (L.possum && inBox(L.possum.x1, L.possum.y, L.possum.x2 - L.possum.x1, L.floorY - L.possum.y)) return true;
    for (const d of [L.plush, L.rack]) if (d && inBox(d.x, d.y, d.w, d.h)) return true;
    for (const s of this.solids()) if (inBox(s.x, s.y, s.w, s.h)) return true;
    for (const u of L.units) {
      if (y < u.top - 14) continue;
      for (const post of [u.x, u.x + u.w]) if ((x0 - post) * (x - post) <= 0) return true;
    }
    for (const b of L.boards) if ((y0 - b.y) * (y - b.y) <= 0 && x >= b.x1 && x <= b.x2) return true;
    return this.bottles.some((b) => b.state === 'shelf' && Math.abs(b.x - x) < 9 && y <= b.y && y >= b.y - 30);
  }

  /** Everything near a shell goes: bottles, and anyone standing there, Bob and the possum included. One big bang brings Bob running. */
  private blast(x: number, y: number) {
    const L = this.level;
    const R = this.raccoon;
    const B = this.bob;
    const P = this.possum;
    this.blasts.push({ x, y, age: 0 });
    this.emit({ type: 'blast', x });
    this.shake = Math.max(this.shake, 0.9);
    const near = (px: number, py: number) => Math.hypot(px - x, py - y) <= TANK.blast;
    // The tank broke these, so the cousin doesn't nag you about them.
    const run = this.smashRun;
    for (const b of this.bottles) {
      if (b.state === 'gone' || !near(b.x, b.y - 14)) continue;
      this.smashRun = 0;
      this.smash(b, b.state === 'air' ? this.surfaceBelow(b.x, b.y) : b.y, 0);
    }
    this.smashRun = run;
    if (R.state !== 'playdead' && near(R.x, R.y - R.h / 2)) this.hit(R.x >= x ? 1 : -1, 'a tank shell');
    if (this.bobInside && B.state !== 'down' && near(B.x, L.floorY - BOB.h / 2)) {
      this.knockBob();
      this.sayCd.cousin = 0;
      this.say('cousin', 'Chrr-chrr! The tank got Bob!', 2.2);
    }
    const st = L.possum;
    if (P && st && (near(P.x, P.y - 14) || (x >= st.x1 - 4 && x <= st.x2 + 4 && y >= st.y - 4))) this.blowPossum();
    this.ring(x, y, RING.biggest);
  }

  /** The cases go up, and the possum leaves for the night. */
  private blowPossum() {
    const L = this.level;
    const st = L.possum!;
    const top = L.boards.find((b) => b.unit < 0 && b.y === st.y && b.x1 <= st.x2 && b.x2 >= st.x1);
    if (top) top.x2 = top.x1; // nothing left to stand on
    L.possum = undefined;
    this.possum = null;
    this.note('The tank blew up the possum\'s stack');
    this.sayCd.cousin = 0;
    this.say('cousin', 'Chrr! No more possum!', 2.2);
  }

  camOrigin() {
    const S = this.scrub;
    return { x: S.x + S.dir * 8, y: this.level.floorY - S.eye };
  }

  /**
   * Is the raccoon in the scrubber's camera cone? Shelf panels block it like
   * Bob's flashlight, and so do the boards: it can't see through a shelf, so it
   * sees along a board only while its eye is up level with it.
   */
  camSees(): boolean {
    const R = this.raccoon;
    if (R.state === 'playdead' && R.hiddenOk) return false;
    const S = this.scrub;
    return this.coneSees(this.camOrigin(), S.dir, S.cam, SCRUBBER.camHalf, SCRUBBER.camRange, true);
  }

  /** Does the line from o to p pass through a shelf board? */
  private throughBoard(o: { x: number; y: number }, p: { x: number; y: number }): boolean {
    for (const bd of this.level.boards) {
      if (bd.unit < 0 || (o.y - bd.y) * (p.y - bd.y) >= 0) continue;
      const x = o.x + ((bd.y - o.y) / (p.y - o.y)) * (p.x - o.x);
      if (x > bd.x1 && x < bd.x2) return true;
    }
    return false;
  }

  private slurpAt(x: number, r: number) {
    const floor = this.level.floorY;
    const gone = this.spills.filter((s) => Math.abs(s.y - floor) < 1 && Math.abs(s.x - x) < r);
    if (!gone.length) return;
    this.spills = this.spills.filter((s) => !gone.includes(s));
    this.emit({ type: this.scrub.tank ? 'clank' : 'slurp' });
    this.say('cousin', SCOLDS[Math.floor(this.rand() * SCOLDS.length)], 1.8);
  }

  /** The snitch: a siren and the biggest noise ring there is. Before Bob's due, it brings him in. */
  private siren(how: 'bumped' | 'spotted') {
    const S = this.scrub;
    S.state = 'alarm';
    S.t = SIREN.time;
    S.alarmCd = SIREN.cooldown;
    const floor = this.level.floorY;
    this.emit({ type: 'siren' });
    this.ring(S.x, floor - 13, RING.siren);
    if (this.bob.state === 'outside') this.alarmAt = S.x;
    const name = S.tank ? 'tank' : 'scrubber';
    const what = how === 'bumped' ? `You bumped the ${name}` : `The ${name}'s camera spotted you`;
    this.note(this.bob.state === 'outside' ? `${what}: siren, and it called Bob in early` : `${what}: siren`);
    if (S.tank) this.say('cousin', how === 'bumped' ? "Chrr! Don't poke the tank!" : 'Chrr! The tank saw you! MOVE!', 2.2);
    else this.say('cousin', how === 'bumped' ? 'Chrr! The roomba is snitching!' : 'Chrr! The roomba saw you! It is snitching!', 2.2);
  }

  private knockScrubber() {
    const S = this.scrub;
    S.state = 'down';
    S.t = KNOCKDOWN.scrubber;
    S.aimT = 0;
    this.emit({ type: 'bonk' });
    this.say('cousin', S.tank ? 'Chrr-chrr! Right on the hatch!' : 'Chrr-chrr! STRIKE!', 1.8);
  }

  /* ---------------------------------------------------------------- hit */

  hit(dir: number, cause = 'something') {
    const R = this.raccoon;
    if (R.invuln > 0 || this.phase !== 'store') return;
    R.health = Math.max(0, R.health - HIT.damage);
    const dropped = this.has('candy') ? undefined : R.carry.pop(); // cotton candy: sticky paws hold on to everything
    if (this.level.faire) this.floater(R.x, R.y - 40, `-${HIT.damage}`, '#ff6a5a');
    this.note(`Hit by ${cause}: −${HIT.damage}% health${dropped ? ', dropped a bottle' : ''}${R.buzz > 0 ? ', lost a Buzz step' : ''}`);
    this.fixReady();
    if (dropped) {
      this.launch(dropped, R.x, R.y - R.h, -dir * 40, -160);
      this.say('cousin', SCOLDS[Math.floor(this.rand() * SCOLDS.length)], 1.8);
    }
    if (R.buzz > 0) this.setBuzz(R.buzz - 1);
    R.state = 'move';
    R.aimT = null;
    R.rocketT = 0;
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
      if (this.t < this.bobDue && this.alarmAt === null) return;
      B.state = 'search';
      B.x = this.level.door!.x + this.level.door!.w / 2;
      B.dir = -1;
      B.goal = 0;
      this.emit({ type: 'door' });
      this.note('Officer Bob came in');
      if (this.alarmAt !== null) {
        // The siren called him in early, and he heads straight for it.
        B.state = 'investigate';
        B.target = Math.max(back, Math.min(front, this.alarmAt));
        this.alarmAt = null;
        this.say('bob', 'Alarm! Animal control, coming through!', 2.6);
      } else this.say('bob', 'Animal control! Anybody in here?', 2.6);
      // Night 1 teaches play dead on his first entrance.
      if (this.night === 1) {
        this.say('cousin', 'Chrr-chrr! Animal control! Dive in the plush and play dead (↓)!', 6);
        this.plushGlow = 14;
      } else this.say('cousin', 'Chrr-chrr! Bob again!', 2.4);
      return;
    }

    if (this.level.space) this.jetpack(dt);
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
          if (B.wasChasing) {
            // Back on his feet, he shouts before he lunges: never a catch the instant he stands.
            B.state = 'shout';
            B.t = BOB.shoutTime;
            this.say('bob', 'Ow! Get back here!', 1.6);
          } else {
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
        B.throwCd = Math.max(0, B.throwCd - dt);
        if (B.windT > 0) {
          // Winding up: he stands still with the bottle raised, then lets fly.
          B.windT -= dt;
          if (B.windT <= 0) this.bobThrow();
        } else if (Math.abs(R.x - B.x) > BOB.poleReachX * 0.6) walk(R.x, BOB.chaseSpeed);
        this.aimAt();
        const high = this.bobFeet - R.y > BOB.poleReachUp; // up on a shelf, out of pole reach
        if (high && B.windT <= 0 && B.throwCd <= 0 && this.seen()) this.bobWindUp();
        if (this.seen()) B.lostT = 0;
        else B.lostT += dt;
        if (this.canPole()) {
          this.end(false, 'bob');
          return;
        }
        if (B.lostT >= BOB.loseAfter) {
          this.bobDrop();
          B.state = 'confused';
          B.t = 1.6;
          this.emit({ type: 'lost' });
          this.note('Bob lost you');
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

  /**
   * On the Moon his jetpack keeps him hovering, and in a chase it takes him up toward you, slowly, so a rock is no
   * longer out of reach for long. Knocked down, he drops.
   */
  private jetpack(dt: number) {
    const B = this.bob;
    if (B.state === 'down') {
      B.lift = Math.max(0, B.lift - SPACE.bobFall * dt);
      return;
    }
    const chase = B.state === 'chase' || B.state === 'shout';
    const want = chase
      ? Math.max(SPACE.bobHover, Math.min(SPACE.bobMaxLift, this.level.floorY - this.raccoon.y - 20))
      : SPACE.bobHover + Math.sin(this.t * 2) * 6;
    const d = want - B.lift;
    B.lift += Math.sign(d) * Math.min(Math.abs(d), (chase ? SPACE.bobClimb : 40) * dt);
  }

  /** He grabs the nearest bottle he can reach off a shelf and raises it to throw. */
  private bobWindUp() {
    const B = this.bob;
    const floor = this.bobFeet;
    const b = this.bottles
      .filter((b) => b.state === 'shelf' && Math.abs(b.x - B.x) <= BOB_THROW.grabRange && floor - b.y <= BOB_THROW.grabHeight && b.y <= floor + 30)
      .sort((p, q) => Math.abs(p.x - B.x) - Math.abs(q.x - B.x))[0];
    if (!b) {
      B.throwCd = 0.5; // nothing to hand: he looks again in a moment
      return;
    }
    b.state = 'gone';
    B.holding = b.kind;
    B.windT = BOB_THROW.windup;
    this.emit({ type: 'bobWindup' });
    this.say('bob', THROW_LINES[Math.floor(this.rand() * THROW_LINES.length)], 1.6);
  }

  /** He lobs it at where you are now, so moving after the wind-up dodges it. */
  private bobThrow() {
    const B = this.bob;
    const R = this.raccoon;
    if (!B.holding) return;
    const hx = B.x + B.dir * 14;
    const hy = this.bobFeet - 104;
    const dx = R.x - hx;
    const dy = R.y - R.h / 2 - hy;
    const T = Math.max(BOB_THROW.minFlight, Math.min(BOB_THROW.maxFlight, Math.abs(dx) / BOB_THROW.speed));
    const vy = (dy - 0.5 * this.gravity * T * T) / T;
    this.bottles.push({ id: this.nextId++, x: hx, y: hy, kind: B.holding, board: -1, state: 'air', vx: dx / T, vy, safeT: 0, owner: 'bob' });
    B.holding = null;
    B.throwCd = BOB_THROW.every;
    this.emit({ type: 'bobThrow' });
  }

  /** Knocked down or giving up with a bottle in his hand: it falls and smashes. */
  private bobDrop() {
    const B = this.bob;
    if (B.holding) {
      this.bottles.push({ id: this.nextId++, x: B.x + B.dir * 14, y: this.bobFeet - 104, kind: B.holding, board: -1, state: 'air', vx: 0, vy: 0, safeT: 0, owner: 'bob' });
    }
    B.holding = null;
    B.windT = 0;
  }

  /** A bottle knocks him off his feet for a moment. Mid-chase, he gets up still chasing. */
  private knockBob() {
    const B = this.bob;
    this.bobDrop();
    B.wasChasing = B.state === 'chase' || B.state === 'shout';
    B.state = 'down';
    B.t = KNOCKDOWN.bob;
    this.emit({ type: 'bonk' });
    this.say('bob', 'OOF!', 1.2);
  }

  private spot() {
    const B = this.bob;
    this.note('Bob spotted you');
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
    return { x: this.bob.x + this.bob.dir * 12, y: this.bobFeet - 64 };
  }

  /**
   * Is the raccoon in Bob's flashlight? It must be inside the cone and in
   * range, and the line can't cross a shelf unit's end panel or the counter.
   * So a shelf hides you from a distance, and close up you hide by jumping up
   * above where his beam can tilt. Below it there's no hiding: anywhere in front
   * of him his catch pole reaches, he sees you, even under the beam at his feet.
   */
  seen(ignoreHidden = false): boolean {
    const R = this.raccoon;
    const B = this.bob;
    if (!this.bobInside || B.state === 'down') return false;
    if (!ignoreHidden && R.state === 'playdead' && R.hiddenOk) return false;
    if (this.coneSees(this.beamOrigin(), B.dir, B.beam, BOB.beamHalf, BOB.beamRange)) return true;
    return (R.x - B.x) * B.dir >= 0 && this.inPoleReach();
  }

  /** Is the raccoon's body or head inside a light cone from o, with nothing in between? */
  private coneSees(o: { x: number; y: number }, dir: 1 | -1, ang: number, half: number, range: number, boards = false): boolean {
    const R = this.raccoon;
    const dx = dir * Math.cos(ang);
    const dy = -Math.sin(ang);
    const cosHalf = Math.cos(half);
    for (const p of [
      { x: R.x, y: R.y - R.h / 2 },
      { x: R.x, y: R.y - R.h + 3 },
    ]) {
      const vx = p.x - o.x;
      const vy = p.y - o.y;
      const d = Math.hypot(vx, vy);
      if (d > range || d < 1) continue;
      if ((vx * dx + vy * dy) / d < cosHalf) continue;
      if (this.lineOfSight(o, p) && !(boards && this.throughBoard(o, p))) return true;
    }
    return false;
  }

  lineOfSight(o: { x: number; y: number }, p: { x: number; y: number }): boolean {
    const L = this.level;
    for (const u of L.units) {
      for (const px of [u.x, u.x + u.w]) {
        if ((o.x - px) * (p.x - px) >= 0 || Math.abs(px - o.x) < POST_GRACE) continue;
        const y = o.y + ((px - o.x) / (p.x - o.x)) * (p.y - o.y);
        if (y > u.top && y < (u.bottom ?? L.floorY)) return false;
      }
    }
    if (L.counter && segmentHitsRect(o, p, L.counter)) return false;
    return true;
  }

  private canPole(): boolean {
    const R = this.raccoon;
    if (R.state === 'playdead' && R.hiddenOk) return false;
    return this.inPoleReach();
  }

  private inPoleReach(): boolean {
    const R = this.raccoon;
    const B = this.bob;
    if (Math.abs(R.x - B.x) > BOB.poleReachX) return false;
    if (R.y < this.bobFeet - BOB.poleReachUp) return false;
    if (R.y - R.h > this.bobFeet + 10) return false; // below his boots: the pole doesn't reach down
    return this.lineOfSight(this.beamOrigin(), { x: R.x, y: R.y - R.h / 2 });
  }

  /* ------------------------------------------------------------ checkout */

  private onCounter(): boolean {
    const k = this.level.counter;
    return !!k && this.onFloorLevel(k.y) && this.raccoon.x >= k.x && this.raccoon.x <= k.x + k.w;
  }

  /** Standing on the moving part of the belt. */
  onBelt(): boolean {
    const b = this.level.belt;
    return !!b && this.onCounter() && this.raccoon.x >= b.x1 && this.raccoon.x <= b.x2;
  }

  /** Close enough to the belt to load it. The prompts use this too. */
  atBelt(): boolean {
    const b = this.level.belt;
    return !!b && this.onCounter() && this.raccoon.x >= b.x1 - 10 && this.raccoon.x <= b.x2 - 10;
  }

  atTill(): boolean {
    const r = this.level.register;
    return !!r && !this.till.open && this.onCounter() && this.near(r, this.raccoon.x, 26);
  }

  /** Your ready bottle goes on the belt, as far along as it can without touching another. */
  private loadBelt() {
    const R = this.raccoon;
    const belt = this.level.belt!;
    const riding = this.bottles.filter((b) => b.state === 'belt');
    let x = Math.max(belt.x1 + 6, Math.min(belt.x2 - 40, R.x));
    while (x >= belt.x1 && riding.some((b) => Math.abs(b.x - x) < BELT.gap)) x -= BELT.gap;
    if (x < belt.x1) return this.say('raccoon', 'Belt is full.', 1.2);
    this.fixReady();
    const kind = R.carry.splice(R.ready, 1)[0];
    this.fixReady();
    this.bottles.push({ id: this.nextId++, x, y: belt.y, kind, board: -1, state: 'belt', vx: 0, vy: 0, safeT: 0 });
    this.emit({ type: 'knock' });
  }

  /** Off the end of the belt it smashes, loud enough to bring anyone within earshot to the till. */
  private ride(b: Bottle, dt: number) {
    const belt = this.level.belt!;
    b.x += BELT.speed * dt;
    if (b.x >= belt.x2) this.smash(b, belt.y, BELT.ring);
  }

  /** Each slap is a small noise. The last springs the drawer: coins in your fur, and a ka-ching you can hear down the aisle. */
  private mashTill() {
    const T = this.till;
    const r = this.level.register!;
    T.mashes++;
    this.emit({ type: 'mash' });
    this.ring(r.x + r.w / 2, r.y, RING.small);
    if (T.mashes < TILL.mashes) return;
    T.open = true;
    T.sprayT = TILL.sprayTime;
    this.coins += TILL.coins;
    this.emit({ type: 'till' });
    this.ring(r.x + r.w / 2, r.y, RING.big);
    this.note(`Sprung the till: ${TILL.coins} coins in your fur`);
    this.say('raccoon', 'Shiny! Shiny shiny shiny!', 2);
  }

  /* ----------------------------------------------------------- champagne */

  /** Running with bubbly shakes it up; standing still lets it settle. */
  private updateFizz(dt: number) {
    const R = this.raccoon;
    if (!R.carry.includes('champagne')) R.fizz = 0;
    else if (Math.abs(R.vx) > RACCOON.bumpSpeed) R.fizz = Math.min(1, R.fizz + dt / FIZZ.full);
    else R.fizz = Math.max(0, R.fizz - dt / FIZZ.settle);
  }

  /** The bottle is used up, the spray rockets you the way you're facing, and it leaves a puddle and a bang behind. */
  private popCork() {
    const R = this.raccoon;
    if (!R.carry.includes('champagne')) return;
    const at = R.carry[R.ready] === 'champagne' ? R.ready : R.carry.indexOf('champagne');
    R.carry.splice(at, 1);
    this.fixReady();
    if (R.grounded) this.spills.push({ id: this.nextId++, x: R.x, y: R.y - (this.level.space ? SPACE.blobUp : 0), kind: 'champagne', x0: R.x, flow: 0 });
    this.ring(R.x, R.y - R.h / 2, RING.big);
    R.vx = R.facing * (FIZZ.minSpeed + (FIZZ.maxSpeed - FIZZ.minSpeed) * R.fizz);
    R.vy = -FIZZ.lift;
    R.grounded = false;
    R.ground = null;
    R.climbing = false;
    R.rocketT = FIZZ.time;
    R.fizz = 0;
    this.emit({ type: 'pop' });
    this.note('Popped a champagne cork');
    this.say('raccoon', 'WAAAHOOO!', 1.2);
  }

  /* -------------------------------------------------------------- possum */

  /** Get near its patch and it lobs cans at you. It can't be chased off, only soaked into throwing wide. */
  private updatePossum(dt: number) {
    const P = this.possum;
    if (!P) return;
    const R = this.raccoon;
    P.woozy = Math.max(0, P.woozy - dt);
    P.cd = Math.max(0, P.cd - dt);
    P.dir = R.x >= P.x ? 1 : -1;
    if (P.windT > 0) {
      P.windT -= dt;
      if (P.windT <= 0) this.possumThrow();
      return;
    }
    if (P.cd > 0 || (R.state === 'playdead' && R.hiddenOk)) return;
    if (Math.hypot(R.x - P.x, R.y - P.y) > POSSUM.range) return;
    P.windT = POSSUM.windup;
    this.emit({ type: 'hiss' });
    const lines = P.woozy > 0 ? WOOZY_LINES : POSSUM_LINES;
    this.say('possum', lines[Math.floor(this.rand() * lines.length)], 1.4);
  }

  /** At where you are now, so moving after the wind-up dodges it. A woozy throw goes up in a big loop and lands wide. */
  private possumThrow() {
    const P = this.possum!;
    const R = this.raccoon;
    const hx = P.x + P.dir * 12;
    const hy = P.y - 30;
    const woozy = P.woozy > 0;
    const dx = R.x - hx + (woozy ? (this.rand() - 0.5) * POSSUM.wideBy : 0);
    const dy = R.y - R.h / 2 - hy;
    const T = woozy ? POSSUM.loopyFlight : Math.max(POSSUM.minFlight, Math.min(POSSUM.maxFlight, Math.abs(dx) / POSSUM.speed));
    const vy = (dy - 0.5 * this.gravity * T * T) / T;
    this.bottles.push({ id: this.nextId++, x: hx, y: hy, kind: 'can', board: -1, state: 'air', vx: dx / T, vy, safeT: 0, owner: 'possum' });
    P.cd = POSSUM.every;
    this.emit({ type: 'throw' });
  }

  private soakPossum() {
    const P = this.possum!;
    if (P.woozy <= 0) this.note('Soaked the possum');
    P.woozy = POSSUM.woozy;
    P.windT = 0;
    P.cd = POSSUM.every; // it licks its fur before it goes back to throwing
    this.emit({ type: 'bonk' });
    this.say('cousin', 'Chrr! Soaked the possum!', 2);
    this.say('possum', 'pfff— hsss… *lick*', 1.8);
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
    this.level = this.tutorial ? trainingLevel() : nightLevel(this.night);
    const pp = this.level.possum;
    this.possum = pp ? { x: (pp.x1 + pp.x2) / 2, y: pp.y, dir: 1, windT: 0, cd: 1, woozy: 0 } : null;
    this.phase = 'store';
    this.t = 0;
    this.bottles = this.level.bottles.map((b, spot) => ({ ...b, spot, id: this.nextId++, state: 'shelf', vx: 0, vy: 0, safeT: 0 }));
    this.archers = (this.level.archers ?? []).map((a) => ({ x: a.x, dir: 1, state: 'hidden', t: 0, cd: 1 + this.rand() * 4, aim: 0 }));
    this.clowns = (this.level.clowns ?? []).map(([a, b], i) => ({ x: (a + b) / 2, dir: i % 2 ? -1 : 1, route: [a, b], state: 'patrol', t: 0, cd: 2 }));
    this.critters = (this.level.critters ?? []).map((c) => ({ kind: c.kind, home: { x: c.x, y: c.y }, x: c.x, y: c.y, dir: -1, state: 'idle', t: 0, cd: 1.5 + this.rand() * 3, to: { x: c.x, y: c.y } }));
    this.sats = (this.level.sats ?? []).map((s, i) => ({ x: (s.route[0] + s.route[1]) / 2, y: s.y, dir: i % 2 ? -1 : 1, route: s.route, state: 'scan', t: 0, cd: 3, sweepT: i * 1.3 }));
    this.drone = this.has('drone') ? { x: this.level.start.x, y: this.level.ceilingY + 40, state: 'dock', cargo: [] } : null;
    this.scrub.x = this.tutorial || this.level.archers || this.level.circus || this.level.space ? -9999 : this.level.scrubberStart!; // off the map in the practice store, so bottles can't hit it
    this.scrub.dir = -1;
    this.place(this.level.start.x, this.level.ceilingY + this.raccoon.h + 2);
    this.raccoon.vy = 200;
    // The tile is the first smash of the night.
    const outdoors = this.level.faire || this.level.circus || this.level.space; // no ceiling tile to smash
    if (!outdoors) this.emit({ type: 'smash', x: this.raccoon.x, y: this.level.ceilingY, kind: 'tile' });
    this.specialsTotal = this.level.bottles.filter((b) => isSpecial(b.kind)).length;
    this.ring(this.raccoon.x, this.level.ceilingY, RING.small);
    this.shake = outdoors ? 0 : 0.7;
    if (this.level.space) this.say('cousin', 'Chrr! One small step, cuz! Grab the drone on the pad: fill your paws and it flies them up to me!', 4);
    else if (this.level.circus) this.say('cousin', "Chrr! Step right up, cuz! The good stuff's in the stands. The cannon goes to the far side!", 3.5);
    else if (this.level.faire) this.say('cousin', 'Chrr! Hark, cuz! Bottles on yon trees! Bring them to the hollow!', 3.5);
    else this.say('cousin', this.tutorial ? 'Chrr! Practice first. Follow the sign up top!' : this.night === 1 ? 'Chrr! Pass the good stuff up to me here!' : "Chrr! They bought a TANK! I'm up in the middle tonight!", 3.5);
  }

  end(escaped: boolean, reason: EndReason) {
    if (this.tutorial) {
      this.phase = 'over'; // no report card: main goes back to the menu when there's no result
      return;
    }
    const R = this.raccoon;
    const cargo = this.drone?.cargo ?? [];
    if (cargo.length) {
      if (escaped) this.turnIn(cargo);
      this.note(escaped ? `The drone made it up with ${cargo.length} more` : `Lost: ${cargo.length} on the drone`);
    }
    if (escaped) {
      if (R.carry.length) {
        this.turnIn();
        this.note(`Climbed out with ${R.carry.length} in your paws`);
      }
      this.bonus += this.coins;
      this.note('Climbed out');
    } else {
      this.note(`Caught: ${ENDINGS[reason] ?? reason}`);
      if (R.carry.length) this.note(`Lost: ${R.carry.length} in your paws`);
      if (this.coins) this.note(`Lost: ${this.coins} coins from your fur`);
    }
    const percent = percentFor(this.specials, this.specialsTotal);
    const bonus = this.bonus * this.mult;
    this.note(`Specials turned in: ${this.specials} of ${this.specialsTotal}`, percent);
    this.note(`Bonus: ${this.bonus} at ×${this.mult} Buzz`, bonus);
    this.result = {
      night: this.night,
      coins: escaped ? this.coins : 0,
      escaped,
      reason,
      specials: this.specials,
      specialsTotal: this.specialsTotal,
      specialsBroken: this.specialsBroken,
      percent,
      bonus: this.bonus,
      mult: this.mult,
      score: percent + bonus,
      grade: gradeFor(percent),
      kept: escaped ? 0 : R.carry.length,
      time: this.t,
    };
    this.phase = 'over';
    this.emit(escaped ? { type: 'escaped' } : { type: 'caught', reason });
  }

  /** Add a line to the night log (store only; the roof and crawlspace don't score). */
  private note(text: string, pts?: number) {
    if (this.phase !== 'store') return;
    this.log.push({ t: this.t, text, pts });
  }

  say(who: Who, text: string, ttl = 2) {
    const L = this.level;
    if (who === 'bob' && (L.faire || L.circus || L.space)) text = (L.faire ? BOB_FAIRE : L.circus ? BOB_CIRCUS : BOB_SPACE)[text] ?? text;
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

type Edges = {
  jump: boolean; grab: boolean; up: boolean; down: boolean; left: boolean; right: boolean;
  throw: boolean; swap: boolean; hoot: boolean;
};

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
