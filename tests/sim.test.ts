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

  it('grades on the school scale: your score as a percentage of the night target', () => {
    const t = NIGHT.target;
    expect(gradeFor(0.59 * t, t)).toBe('F');
    expect(gradeFor(0.6 * t, t)).toBe('D');
    expect(gradeFor(0.7 * t, t)).toBe('C');
    expect(gradeFor(0.8 * t, t)).toBe('B');
    expect(gradeFor(0.9 * t, t)).toBe('A');
    expect(gradeFor(0.33 * t, t)).toBe('F'); // 33% is an F (host)
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

  it('the night log adds up to the night score, and says what being caught cost you', () => {
    const g = store();
    g.raccoon.buzz = 2;
    g.raccoon.carry = ['rum', 'regular'];
    tap(g, 'grab');
    g.raccoon.carry = ['mini'];
    g.end(true, 'climbed');
    const sum = g.log.reduce((s, e) => s + (e.pts ?? 0), 0);
    expect(sum).toBeCloseTo(g.result!.score, 6);
    expect(g.log.some((e) => e.text.startsWith('Handed up 2 bottles (1 special): 18 at ×2 Buzz') && e.pts === 36)).toBe(true);

    const caught = store();
    caught.raccoon.carry = ['rum'];
    tap(caught, 'grab');
    caught.raccoon.carry = ['regular'];
    caught.end(false, 'bob');
    expect(caught.log.reduce((s, e) => s + (e.pts ?? 0), 0)).toBeCloseTo(caught.result!.score, 6);
    expect(caught.log.some((e) => e.text.startsWith('Lost:'))).toBe(true);
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

describe('tutorial interactions', () => {
  const at = (g: Game, x: number, facing: 1 | -1) => {
    g.raccoon.x = x;
    g.raccoon.facing = facing;
    g.raccoon.vx = 0;
    run(g, {}, 0.3);
  };

  it('E pries up the vent from anywhere over or beside it, facing either way', () => {
    const vent = new Game().level.vent!;
    for (let x = vent.x - 10; x <= vent.x + vent.w + 10; x += 5) {
      for (const facing of [1, -1] as const) {
        const g = new Game();
        g.raccoon.y = 260;
        at(g, x, facing);
        expect(g.reaches(vent), `x ${x} facing ${facing}`).toBe(true); // so the prompt shows
        tap(g, 'grab');
        expect(g.phase, `x ${x} facing ${facing}`).toBe('crawl');
      }
    }
  });

  it('too far from the vent, no prompt and E does nothing', () => {
    const g = new Game();
    g.raccoon.y = 260;
    at(g, 1050, 1);
    expect(g.reaches(g.level.vent!)).toBe(false);
    tap(g, 'grab');
    expect(g.phase).toBe('roof');
  });

  it('E chews the wires from right up against them, facing either way', () => {
    const start = new Game();
    start.raccoon.y = 260;
    at(start, 1200, 1);
    tap(start, 'grab');
    settle(start);
    const wires = start.level.wires!;
    for (let x = wires.x - 60; x <= wires.x - RACCOON.w / 2; x += 5) {
      for (const facing of [1, -1] as const) {
        const g = new Game();
        g.raccoon.y = 260;
        at(g, 1200, 1);
        tap(g, 'grab');
        settle(g);
        if (facing === -1 && x < wires.x - RACCOON.w / 2 - 20) continue; // back turned and a step away: fair to miss
        at(g, x, facing);
        expect(g.reaches(wires, 20), `x ${x} facing ${facing}`).toBe(true);
        tap(g, 'grab');
        expect(g.wiresChewed, `x ${x} facing ${facing}`).toBe(true);
      }
    }
  });
});
