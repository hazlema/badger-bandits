// The tutorial's practice store: the real store's art and rules, with no Bob, no scrubber and no clock.
// Lessons can be done in any order; the sign up top shows the first one still open.
// {grab}, {throw} and friends in the text become the player's own keys when drawn.

import type { Board, BottleDef, ItemKind, Level, Unit } from './level';

export const LESSONS = [
  { id: 'special', title: 'Turn in a special', text: 'Smoking bottles are the job. {down} hops down a shelf, {jump} jumps up. {grab} grabs one, then {grab} at the hole hands it to your cousin. Hold {grab} on the run to scoop up anything you hit.' },
  { id: 'plain', title: 'Turn in a plain bottle', text: 'Every other bottle is 1 bonus point. Hand one up.' },
  { id: 'sip', title: 'Smash one and drink', text: 'Run into a bottle so it falls and smashes, then {grab} laps up the spill. Each sip raises your Buzz.' },
  { id: 'bonus', title: 'Turn one in with Buzz on', text: 'Hand up a plain bottle while you have Buzz, and watch the sum at the bottom. Buzz when you leave multiplies every bonus point.' },
  { id: 'rum', title: 'Drink a rum captain', text: 'Smash a smoking rum bottle and drink it: sea legs, no wobble for 30 s.' },
  { id: 'curacao', title: 'Drink a blue curaçao', text: 'Now the blue one: your paws glow and leave a trail.' },
  { id: 'playdead', title: 'Play dead', text: 'Hop on the plush display and press {down}. Officer Bob\'s flashlight passes right over you.' },
  { id: 'lob', title: 'Throw: lob', text: 'Hold {throw}. The dotted arc swings short to long. Let go to lob.' },
  { id: 'drop', title: 'Throw: drop', text: 'Hold {throw} and tap {down} to drop it straight down, onto whoever is below.' },
  { id: 'roll', title: 'Throw: roll', text: 'Hold {throw} and tap ← or → to bowl it along the shelf or floor.' },
  { id: 'swap', title: 'Switch bottles', text: 'Carry two or more. {swap} picks which one you\'ll throw: the gold ring in your slots.' },
  { id: 'hoot', title: 'Hoot', text: 'With a bottle in your paws, {hoot} blows across it. It pulls Bob and the scrubber to you.' },
  { id: 'tote', title: 'Find a powerup', text: 'Powerups change what you can do. {grab} at the rack by the counter: the tote bag adds 3 carry slots.' },
] as const;

export type LessonId = (typeof LESSONS)[number]['id'];

export const TUTORIAL_DONE = 'That\'s everything. Back to the hole and press {up} to finish.';

/** The level id stays 'store' so all the store's rules and art apply. Front-of-store spots match the real store. */
export function trainingLevel(): Level {
  const floorY = 500;
  const units: Unit[] = [];
  const boards: Board[] = [];
  const addUnit = (x: number, w: number, ys: number[]) => {
    const u = units.length;
    units.push({ x, w, top: Math.min(...ys) });
    for (const y of ys) boards.push({ x1: x, x2: x + w, y, unit: u });
  };
  addUnit(40, 260, [410, 320, 230, 130]); // turn-ins, top board under the hole
  addUnit(660, 240, [410, 320, 230]); // smash and drink
  addUnit(1260, 240, [410, 320, 230]); // special spills
  addUnit(2100, 260, [410, 320, 230]); // throws

  const bottles: BottleDef[] = [];
  const put = (unit: number, y: number, x: number, kind: ItemKind) => {
    bottles.push({ x, y, kind, board: boards.findIndex((b) => b.unit === unit && b.y === y) });
  };
  put(0, 230, 170, 'rum');
  put(0, 230, 250, 'regular');
  put(0, 320, 110, 'curacao');
  put(0, 320, 200, 'mini');
  put(0, 410, 120, 'regular');
  put(0, 410, 220, 'regular');

  put(1, 230, 720, 'regular');
  put(1, 230, 820, 'mini');
  put(1, 320, 740, 'regular');
  put(1, 320, 840, 'regular');
  put(1, 410, 710, 'mini');
  put(1, 410, 810, 'regular');

  put(2, 230, 1330, 'regular');
  put(2, 230, 1430, 'regular');
  put(2, 320, 1320, 'rum');
  put(2, 320, 1430, 'curacao');
  put(2, 410, 1320, 'curacao');
  put(2, 410, 1430, 'rum');

  for (const y of [230, 320, 410]) for (const x of [2160, 2230, 2300]) put(3, y, x, y === 320 ? 'mini' : 'regular');

  const counter = { x: 2600, y: 420, w: 220, h: 80 };
  const plush = { x: 1560, y: 450, w: 140, h: 50 };
  boards.push({ x1: plush.x, x2: plush.x + plush.w, y: plush.y, unit: -1 });

  return {
    id: 'store',
    width: 3000,
    floorY,
    ceilingY: 40,
    solids: [{ x: 0, y: floorY, w: 3000, h: 40 }, counter],
    boards,
    climbables: [],
    units,
    bottles,
    signs: [],
    posters: [
      {
        x: 480, y: 140, w: 330, title: 'The Job',
        lines: ['Special bottles smoke and when', 'turned in are added to your score,', "don't smash them!", 'Every other bottle: +1 bonus.'],
      },
      {
        x: 1080, y: 140, w: 330, title: 'Why Drink?',
        lines: ['Buzz when you leave multiplies your bonus.', '12 bottles at x1 = 12', '12 bottles at x2 = 24', '12 bottles at x3.5 = 42', 'The catch: wobbles, hiccups, drops.'],
      },
      {
        x: 1650, y: 140, w: 280, title: 'Special Spills',
        lines: ['Drink a smashed special for a buff.', 'Rum: 30 s of sea legs, no wobble.', 'Curaçao: glowing paw prints', 'the floor scrubber will follow.', 'It costs you that special!'],
      },
      {
        x: 1950, y: 140, w: 280, title: 'Throws',
        lines: ['Hold {throw}, then pick one:', 'Let go: lob along the dotted arc', '{down}: drop straight down', '← / →: roll along shelf or floor', '{swap} switches · {hoot} hoots'],
      },
      {
        x: 2490, y: 140, w: 240, title: 'Powerups',
        lines: ['Tote bag: 3 more slots.', 'Watch them appear', 'at the bottom left.', 'More on later nights.'],
      },
    ],
    start: { x: 170, y: 130 },
    hole: { x: 130, y: 60, w: 90, h: 70 },
    plush,
    tote: { x: 2530, y: 440, w: 34, h: 40 },
    rack: { x: 2650, y: 362, w: 44, h: 58 },
    counter,
    door: { x: 2900, y: 400, w: 70, h: 100 },
    windows: { x: 2830, y: 150, w: 160, h: 240 },
  };
}
