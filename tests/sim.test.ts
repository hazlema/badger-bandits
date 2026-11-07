import { describe, expect, it } from 'vitest';
import { BOB, BUZZ, DT, NIGHT, RACCOON } from '../src/config';
import { Game, gradeFor, multFor, NO_INPUT, type Input } from '../src/sim/game';

const run = (g: Game, input: Partial<Input>, seconds: number) => {
  const inp = { ...NO_INPUT, ...input };
  for (let i = 0; i < Math.round(seconds / DT); i++) g.step(inp);
};
const tap = (g: Game, key: keyof Input) => {
  g.step({ ...NO_INPUT, [key]: true });
  g.step(NO_INPUT);
};
const settle = (g: Game) => run(g, {}, 0.6);

describe('scoring rules', () => {
  it('Buzz goes x1 sober, +0.5 a step, x3.5 at the top', () => {
    expect([0, 1, 2, 3, 4, 5].map(multFor)).toEqual([1, 1.5, 2, 2.5, 3, 3.5]);
  });

  it('grades by score against par', () => {
    const par = NIGHT.par;
    expect(gradeFor(0.49 * par, par)).toBe('F');
    expect(gradeFor(0.5 * par, par)).toBe('D');
    expect(gradeFor(par, par)).toBe('C');
    expect(gradeFor(1.5 * par, par)).toBe('B');
    expect(gradeFor(2 * par, par)).toBe('A');
  });
});

describe('roof and crawlspace tutorial', () => {
  it('vent -> wires -> tile drops you on the back shelf with the clock started', () => {
    const g = new Game();
    expect(g.phase).toBe('roof');
    settle(g);
    // Teleport to the vent to test the handoff (movement is tested elsewhere).
    g.raccoon.x = 1200;
    g.raccoon.y = 260;
    settle(g);
    tap(g, 'grab');
    expect(g.phase).toBe('crawl');
    settle(g);
    run(g, { right: true }, 3); // walk into the wires: they block
    expect(g.raccoon.x).toBeLessThan(560);
    tap(g, 'grab');
    expect(g.powerOut).toBe(true);
    for (let i = 0; i < 300 && g.phase === 'crawl'; i++) g.step({ ...NO_INPUT, right: true });
    expect(g.phase).toBe('store');
    expect(g.mess).toBe(1); // the tile is the first smash
    settle(g);
    expect(g.raccoon.y).toBe(130); // on the hand-up board
  });
});

describe('the store', () => {
  const store = () => {
    const g = new Game({ start: 'store' });
    settle(g);
    return g;
  };

  it('running into a bottle knocks it to the floor, scoring Mess and leaving a spill', () => {
    const g = store();
    const b = g.bottles.find((b) => b.state === 'shelf' && g.level.boards[b.board].y === 230 && b.x > 480 && b.x < 680)!;
    g.raccoon.x = b.x - 60;
    g.raccoon.y = 230;
    settle(g);
    const before = g.mess;
    run(g, { right: true }, 0.6);
    run(g, {}, 1.5);
    expect(b.state).toBe('gone');
    expect(g.mess).toBeGreaterThan(before);
    expect(g.spills.some((s) => s.y === g.level.floorY)).toBe(true);
  });

  it('lapping a spill adds a Buzz step that wears off after a minute', () => {
    const g = store();
    g.spills.push({ id: 999, x: 1000, y: 500, kind: 'regular', x0: 1000, flow: 0 });
    g.raccoon.x = 1000;
    g.raccoon.y = 500;
    g.scrub.x = 2500;
    settle(g);
    tap(g, 'grab');
    expect(g.raccoon.buzz).toBe(1);
    run(g, {}, BUZZ.wearOff + 0.5);
    expect(g.raccoon.buzz).toBe(0);
  });

  it('handing up at the hole banks the load at the current Buzz', () => {
    const g = store();
    g.raccoon.carry = ['regular', 'regular', 'mini'];
    g.raccoon.buzz = 2;
    tap(g, 'grab');
    expect(g.banked).toBe((3 + 3 + 1) * 2);
    expect(g.raccoon.carry).toEqual([]);
  });

  it("the report card shows what share of the store's stock you got away with", () => {
    const g = store();
    expect(g.stock).toBeGreaterThan(0);
    g.raccoon.carry = ['rum', 'curacao'];
    g.raccoon.buzz = 3; // Buzz multiplies the score, not the share
    tap(g, 'grab');
    g.raccoon.carry = ['regular'];
    g.end(true, 'climbed');
    expect(g.result!.share).toBeCloseTo(33 / g.stock, 6);
    const caught = store();
    caught.raccoon.carry = ['rum'];
    caught.end(false, 'bob');
    expect(caught.result!.share).toBe(0); // animal control keeps what's in your paws
  });

  it('special bottles are worth 5x a regular one when you hand them up', () => {
    const g = store();
    g.raccoon.carry = ['rum', 'curacao', 'regular'];
    tap(g, 'grab');
    expect(g.banked).toBe(15 + 15 + 3);
  });

  it('carry limit is 5, 8 with the tote', () => {
    const g = store();
    expect(g.capacity).toBe(RACCOON.carry);
    g.raccoon.x = 2547;
    g.raccoon.y = 500;
    g.scrub.x = 400;
    settle(g);
    tap(g, 'grab');
    expect(g.capacity).toBe(RACCOON.carry + RACCOON.toteExtra);
  });

  it('climbing out keeps Mess and paws; getting caught keeps only the banked loot', () => {
    const a = store();
    a.banked = 20;
    a.raccoon.carry = ['regular'];
    tap(a, 'up');
    expect(a.result!.escaped).toBe(true);
    expect(a.result!.score).toBe(20 + a.mess + 3);

    const b = store();
    b.banked = 20;
    b.raccoon.carry = ['regular'];
    b.end(false, 'bob');
    expect(b.result!.score).toBe(20);
    expect(b.result!.kept!.items).toBe(1);
  });

  it('a hit costs health, a Buzz step and one carried item, which smashes', () => {
    const g = store();
    g.raccoon.carry = ['regular', 'mini'];
    g.raccoon.buzz = 3;
    g.raccoon.x = 1000;
    g.raccoon.y = g.raccoon.peakY = 500;
    settle(g);
    const mess = g.mess;
    g.hit(1);
    expect(g.raccoon.health).toBe(95);
    expect(g.raccoon.buzz).toBe(2);
    expect(g.raccoon.carry).toEqual(['regular']);
    g.scrub.x = 2500;
    run(g, {}, 1);
    expect(g.mess).toBeGreaterThan(mess);
  });

  it('still inside at dawn is caught', () => {
    const g = store();
    g.raccoon.x = 1000;
    g.raccoon.y = 150;
    run(g, {}, NIGHT.length + 1);
    expect(g.phase).toBe('over');
    expect(g.result!.escaped).toBe(false);
  });

  it('Bob comes in a third of the way to dawn', () => {
    const g = store();
    run(g, {}, NIGHT.length * NIGHT.bobAt - 1);
    expect(g.bob.state).toBe('outside');
    run(g, {}, 2);
    expect(g.bob.state).not.toBe('outside');
  });
});

describe("Bob's flashlight", () => {
  const withBob = () => {
    const g = new Game({ start: 'store' });
    settle(g);
    g.t = NIGHT.length * NIGHT.bobAt;
    g.step(NO_INPUT);
    expect(g.bobInside).toBe(true);
    return g;
  };

  it('sees you on the open floor in front of him', () => {
    const g = withBob();
    g.bob.x = 1700;
    g.bob.dir = -1;
    g.bob.beam = -0.25;
    g.raccoon.x = 1500;
    g.raccoon.y = 500;
    expect(g.seen()).toBe(true);
  });

  it("doesn't see through a shelf unit's end panel", () => {
    const g = withBob();
    // Raccoon tucked on a low board inside unit 3 (1180-1440), Bob outside it.
    g.bob.x = 1650;
    g.bob.dir = -1;
    g.raccoon.x = 1300;
    g.raccoon.y = 410;
    for (const beam of [-0.3, 0, 0.2, 0.4, 0.6, 0.8, 1.0]) {
      g.bob.beam = beam;
      expect(g.seen()).toBe(false);
    }
  });

  it('close up, you get out of the beam by getting up above it', () => {
    const g = withBob();
    g.bob.x = 1300;
    g.bob.dir = 1;
    g.raccoon.x = 1330;
    g.raccoon.y = 150;
    for (let b = BOB.sweepLow; b <= BOB.sweepHigh + 0.15; b += 0.05) {
      g.bob.beam = b;
      expect(g.seen()).toBe(false);
    }
  });

  it('play dead in the plush hides you if he did not see you dive', () => {
    const g = withBob();
    g.bob.x = 2400;
    g.bob.dir = 1; // facing away
    g.raccoon.x = 1630;
    g.raccoon.y = 450;
    settle(g);
    tap(g, 'down');
    expect(g.raccoon.state).toBe('playdead');
    expect(g.raccoon.hiddenOk).toBe(true);
    g.bob.dir = -1;
    g.bob.x = 1760;
    g.bob.beam = 0.1;
    expect(g.seen(true)).toBe(true);
    expect(g.seen()).toBe(false);
  });
});
