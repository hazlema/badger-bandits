import { describe, expect, it } from 'vitest';
import { BELT, DT, FIZZ, HIT, NIGHTS, POSSUM, RACCOON, TILL } from '../src/config';
import { Game, NO_INPUT, type Input, type SimEvent } from '../src/sim/game';
import { isSpecial, nightLevel, storeLevel } from '../src/sim/level';

const run = (g: Game, input: Partial<Input>, seconds: number, seen: SimEvent[] = []) => {
  const inp = { ...NO_INPUT, ...input };
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    g.step(inp);
    seen.push(...g.events);
  }
  return seen;
};
const press = (g: Game, key: keyof Input) => {
  g.step({ ...NO_INPUT, [key]: true });
  const e = [...g.events];
  g.step(NO_INPUT);
  return [...e, ...g.events];
};

/** Night 2 with nobody about: possum out of the way unless a test wants it. */
const night2 = (keepPossum = false) => {
  const g = new Game({ start: 'store', night: 2 });
  run(g, {}, 0.8);
  if (!keepPossum) g.possum = null;
  return g;
};
const stand = (g: Game, x: number, y: number, facing: 1 | -1 = 1) => {
  const R = g.raccoon;
  Object.assign(R, { x, y, vx: 0, vy: 0, facing, grounded: true, ground: 'solid', peakY: y });
};

describe('night 2 layout', () => {
  const L = nightLevel(2);

  it('is a different, bigger store with the hole in the middle', () => {
    const one = storeLevel(1);
    expect(L.width).toBeGreaterThan(one.width);
    const h = L.hole!;
    expect(h.x).toBeGreaterThan(L.width / 3);
    expect(h.x).toBeLessThan((L.width * 2) / 3);
    expect(L.units.map((u) => u.x)).not.toEqual(one.units.map((u) => u.x));
  });

  it('you land on the hand-up board, and there are shelves on both sides of it', () => {
    const g = new Game({ start: 'store', night: 2 });
    run(g, {}, 1.5);
    expect(g.raccoon.y).toBe(130);
    expect(g.atHole()).toBe(true);
    const h = L.hole!;
    expect(L.units.some((u) => u.x + u.w < h.x)).toBe(true);
    expect(L.units.some((u) => u.x > h.x + h.w)).toBe(true);
  });

  it('every board on a shelf is one jump from the board below it', () => {
    const jump = RACCOON.jumpSpeed ** 2 / (2 * RACCOON.gravity);
    for (let u = 0; u < L.units.length; u++) {
      const ys = L.boards.filter((b) => b.unit === u).map((b) => b.y).sort((a, b) => b - a);
      [L.floorY, ...ys].forEach((y, i, all) => {
        if (i) expect(all[i - 1] - y).toBeLessThanOrEqual(jump);
      });
    }
  });

  it("has the night's specials and champagne, none on the shelf under the hole", () => {
    const { specials, champagne } = NIGHTS[1];
    const count = (k: string) => L.bottles.filter((b) => b.kind === k).length;
    expect(count('rum')).toBe(specials.rum);
    expect(count('curacao')).toBe(specials.curacao);
    expect(count('champagne')).toBe(champagne);
    const holeUnit = L.boards[L.boards.findIndex((b) => b.y === L.hole!.y + L.hole!.h)].unit;
    expect(L.bottles.filter((b) => (isSpecial(b.kind) || b.kind === 'champagne') && L.boards[b.board].unit === holeUnit)).toEqual([]);
  });

  it('runs a minute longer than night 1, with Bob a third of the way through', () => {
    const g = new Game({ start: 'store', night: 2 });
    expect(g.nightLength).toBe(360);
    expect(g.bobDue).toBe(120);
  });
});

describe('champagne', () => {
  const carrying = () => {
    const g = night2();
    g.bottles = [];
    g.raccoon.carry = ['champagne'];
    stand(g, 2000, 500);
    return g;
  };

  it('running shakes it up, standing still lets it settle', () => {
    const g = carrying();
    stand(g, 100, 500);
    run(g, { right: true }, 1.5);
    const shaken = g.raccoon.fizz;
    expect(shaken).toBeGreaterThan(0.3);
    run(g, {}, 1.5);
    expect(g.raccoon.fizz).toBeLessThan(shaken);
  });

  it('a tap pops the cork: the bottle is gone, you rocket forward, and it makes noise and a puddle', () => {
    const g = carrying();
    const seen = press(g, 'grab');
    expect(seen.some((e) => e.type === 'pop')).toBe(true);
    expect(g.raccoon.carry).toEqual([]);
    expect(g.raccoon.vx).toBeGreaterThanOrEqual(FIZZ.minSpeed - 1);
    expect(g.spills.some((s) => s.kind === 'champagne')).toBe(true);
    expect(g.rings.length).toBeGreaterThan(0);
    run(g, {}, FIZZ.time);
    expect(g.raccoon.x).toBeGreaterThan(2000 + 150);
  });

  it('a shaken bottle sends you further than a flat one', () => {
    const dist = (fizz: number) => {
      const g = carrying();
      g.raccoon.fizz = fizz;
      press(g, 'grab');
      run(g, {}, 1);
      return g.raccoon.x - 2000;
    };
    expect(dist(1)).toBeGreaterThan(dist(0) + 150);
  });

  it('holding Grab to scoop never pops the cork', () => {
    const g = night2();
    const R = g.raccoon;
    R.carry = ['champagne'];
    stand(g, 2000, 500);
    const seen = run(g, { grab: true }, 0.6);
    run(g, {}, 0.1, seen);
    expect(seen.some((e) => e.type === 'pop')).toBe(false);
    expect(R.carry).toEqual(['champagne']);
  });

  it('a scoop that starts on a press keeps the bottle, even on a quick release', () => {
    const g = night2();
    const R = g.raccoon;
    const b = g.bottles.find((x) => x.state === 'shelf' && x.board >= 0)!;
    g.bottles = [b];
    R.carry = ['champagne'];
    Object.assign(R, { x: b.x - 10, y: b.y, vx: 0, vy: 0, facing: 1, grounded: true, ground: b.board, peakY: b.y });
    press(g, 'grab');
    expect(R.carry).toEqual(['champagne', b.kind]);
  });
});

describe('the checkout belt', () => {
  const atBelt = (carry: Parameters<typeof Array.prototype.push>) => {
    const g = night2();
    g.raccoon.carry = carry as never;
    stand(g, 3000, 420);
    return g;
  };

  it('Grab puts your ready bottle on the belt, and it rides off the end and smashes with a big noise', () => {
    const g = atBelt(['regular']);
    press(g, 'grab');
    expect(g.raccoon.carry).toEqual([]);
    const b = g.bottles.find((x) => x.state === 'belt')!;
    expect(b).toBeTruthy();
    const start = b.x;
    run(g, {}, 1);
    expect(b.x).toBeCloseTo(start + BELT.speed, 0);
    g.raccoon.x = 2820; // ride along less
    const seen = run(g, {}, (g.level.belt!.x2 - b.x) / BELT.speed + 0.2);
    expect(seen.some((e) => e.type === 'ring' && e.r === BELT.ring)).toBe(true);
    expect(g.spills.length).toBe(1);
  });

  it('bottles queue up without touching', () => {
    const g = atBelt(['regular', 'mini', 'regular']);
    press(g, 'grab');
    press(g, 'grab');
    press(g, 'grab');
    const xs = g.bottles.filter((b) => b.state === 'belt').map((b) => b.x).sort((a, b) => a - b);
    expect(xs.length).toBe(3);
    expect(xs[1] - xs[0]).toBeGreaterThanOrEqual(BELT.gap - 1);
    expect(xs[2] - xs[1]).toBeGreaterThanOrEqual(BELT.gap - 1);
  });

  it('carries you along if you stand on it', () => {
    const g = atBelt([]);
    const x = g.raccoon.x;
    run(g, {}, 1);
    expect(g.raccoon.x).toBeCloseTo(x + BELT.speed, 0);
  });

  it('a special sent down the belt is lost like any other smash', () => {
    const g = atBelt(['rum']);
    press(g, 'grab');
    run(g, {}, (g.level.belt!.x2 - 3000) / BELT.speed + 1);
    expect(g.specialsBroken).toBe(1);
  });
});

describe('the till', () => {
  const atTill = () => {
    const g = night2();
    const r = g.level.register!;
    stand(g, r.x + 4, 420);
    return g;
  };
  const mash = (g: Game) => {
    for (let i = 0; i < TILL.mashes; i++) press(g, 'grab');
  };

  it('takes a few slaps to spring, then fills your fur, once', () => {
    const g = atTill();
    press(g, 'grab');
    expect(g.coins).toBe(0);
    for (let i = 1; i < TILL.mashes; i++) press(g, 'grab');
    expect(g.till.open).toBe(true);
    expect(g.coins).toBe(TILL.coins);
    press(g, 'grab');
    expect(g.coins).toBe(TILL.coins);
  });

  it("doesn't take a carry slot", () => {
    const g = atTill();
    mash(g);
    expect(g.raccoon.carry).toEqual([]);
  });

  it('coins are bonus points if you climb out', () => {
    const g = atTill();
    mash(g);
    g.end(true, 'climbed');
    expect(g.result!.bonus).toBe(TILL.coins);
    expect(g.result!.coins).toBe(TILL.coins);
    expect(g.result!.score).toBe(TILL.coins);
  });

  it('and lost if you are caught', () => {
    const g = atTill();
    mash(g);
    g.end(false, 'bob');
    expect(g.result!.bonus).toBe(0);
    expect(g.result!.coins).toBe(0);
  });
});

describe('the possum', () => {
  const inPatch = (dx = 150) => {
    const g = night2(true);
    g.bottles = [];
    const P = g.possum!;
    P.cd = 0;
    stand(g, P.x + dx, 500);
    return g;
  };

  it('leaves you alone away from its patch', () => {
    const g = inPatch(POSSUM.range + 400);
    const seen = run(g, {}, 3);
    expect(seen.some((e) => e.type === 'hiss')).toBe(false);
  });

  it('winds up, then lobs a can that hurts where you stand', () => {
    const g = inPatch();
    const before = g.raccoon.health;
    const seen = run(g, {}, POSSUM.windup + POSSUM.maxFlight + 0.2);
    expect(seen.some((e) => e.type === 'hiss')).toBe(true);
    expect(g.raccoon.health).toBe(before - HIT.damage);
  });

  it('moving after the wind-up dodges the can', () => {
    const g = inPatch();
    run(g, {}, POSSUM.windup + 0.05);
    const before = g.raccoon.health;
    g.possum!.cd = 99; // just the one can
    run(g, { right: true }, POSSUM.maxFlight + 0.4);
    expect(g.raccoon.health).toBe(before);
  });

  it('a can clanks: no puddle, and nothing counts as smashed', () => {
    const g = inPatch();
    g.raccoon.x = g.possum!.x + 150;
    run(g, {}, POSSUM.windup + 0.05);
    g.possum!.cd = 99;
    g.raccoon.x += 60;
    const seen = run(g, {}, POSSUM.maxFlight + 0.4);
    expect(seen.some((e) => e.type === 'clank')).toBe(true);
    expect(g.spills).toEqual([]);
    expect(g.specialsBroken).toBe(0);
  });

  it('a bottle soaks it woozy, and its throws go up in a big loop', () => {
    const g = inPatch();
    const P = g.possum!;
    g.bottles.push({ id: 900, x: P.x, y: P.y - 60, kind: 'mini', board: -1, state: 'air', vx: 0, vy: 200, safeT: 0 });
    run(g, {}, 0.3);
    expect(P.woozy).toBeGreaterThan(POSSUM.woozy - 1);
    P.cd = 0;
    run(g, {}, POSSUM.windup + 0.05);
    const can = g.bottles.find((b) => b.kind === 'can');
    expect(can).toBeTruthy();
    expect(can!.vy).toBeLessThan(-500); // straight up and over; an aimed throw from here is nearly flat
  });

  it("a can that lands on Bob knocks him over: its aim isn't on his side", () => {
    const g = night2(true);
    const P = g.possum!;
    g.t = g.bobDue + 1;
    run(g, {}, 0.1);
    g.bob.x = P.x + 150;
    g.bob.state = 'look';
    g.bob.t = 9;
    g.bottles = [{ id: 901, x: g.bob.x, y: g.level.floorY - 70, kind: 'can', board: -1, state: 'air', vx: 0, vy: 100, safeT: 0, owner: 'possum' }];
    run(g, {}, 0.2);
    expect(g.bob.state).toBe('down');
  });

  it('is only in night 2 so far', () => {
    expect(new Game({ start: 'store' }).possum).toBeNull();
    expect(new Game({ start: 'store', night: 2 }).possum).not.toBeNull();
  });
});
