import { describe, expect, it } from 'vitest';
import { DT, NIGHTS, RACCOON, SAT, SPACE } from '../src/config';
import { Game, NO_INPUT, type Bottle, type Input, type SimEvent } from '../src/sim/game';
import { isSpecial, nightLevel, type Powerup } from '../src/sim/level';

const run = (g: Game, seconds: number, input: Partial<Input> = {}, seen: SimEvent[] = []) => {
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    g.step({ ...NO_INPUT, ...input });
    seen.push(...g.events);
  }
  return seen;
};
const stand = (g: Game, x: number, y = g.level.floorY, ground: number | 'solid' = 'solid') => {
  Object.assign(g.raccoon, { x, y, vx: 0, vy: 0, grounded: true, ground, peakY: y, invuln: 0 });
};
/** Night 5 with the satellites quiet, unless a test wakes one. */
const moon = (powerups: Powerup[] = []) => {
  const g = new Game({ start: 'store', night: 5, powerups });
  run(g, 0.4);
  for (const s of g.sats) s.cd = 999;
  return g;
};
/** An x on the floor with nothing floating overhead. */
const openSky = (g: Game, from: number, to: number) => {
  for (let x = from; x < to; x += 10) if (!g.level.units.some((u) => x > u.x - 30 && x < u.x + u.w + 30)) return x;
  throw new Error('no open sky');
};
const press = (g: Game, k: keyof Input) => {
  g.step(NO_INPUT);
  g.step({ ...NO_INPUT, [k]: true });
};

describe('the Moon', () => {
  const L = nightLevel(5);

  it('is the last night, with no store security', () => {
    expect(NIGHTS).toHaveLength(5);
    expect(L.space).toBe(true);
    const g = moon();
    expect(g.scrub.x).toBeLessThan(0);
    expect(g.sats.length).toBe(2);
  });

  it('has the hand-up at the airlock, empty, and the right specials', () => {
    const h = L.hole!;
    const top = L.boards.find((b) => b.y === h.y + h.h && b.x1 <= h.x && b.x2 >= h.x + h.w)!;
    expect(L.bottles.filter((b) => L.boards[b.board] === top)).toHaveLength(0);
    const want = Object.values(NIGHTS[4].specials).reduce((a, b) => a + b, 0);
    expect(L.bottles.filter((b) => isSpecial(b.kind))).toHaveLength(want);
  });

  it('every rock and girder can be reached from the floor in low-gravity hops', () => {
    const height = SPACE.jumpSpeed ** 2 / (2 * SPACE.gravity);
    const reach = new Set<number>();
    const floor = { x1: 0, x2: L.width, y: L.floorY };
    const todo = [floor];
    const boards = L.boards.map((b, i) => ({ ...b, i }));
    while (todo.length) {
      const a = todo.pop()!;
      for (const b of boards) {
        if (reach.has(b.i)) continue;
        const gap = Math.max(0, b.x1 - a.x2, a.x1 - b.x2);
        if (a.y - b.y <= height - 12 && gap <= 220) {
          reach.add(b.i);
          todo.push(b);
        }
      }
    }
    expect(reach.size).toBe(L.boards.length);
  });

  it('puts the drone a hop from where you start (host: the last night, or you would never use it)', () => {
    const p = L.powerup!;
    expect(p.kind).toBe('drone');
    expect(Math.abs(p.x - L.start.x)).toBeLessThan(250);
    expect(L.boards.some((b) => b.y === p.on && b.x1 <= p.x && b.x2 >= p.x + p.w)).toBe(true);
  });
});

describe('low gravity', () => {
  it('jumps go much higher than on Earth', () => {
    const g = moon();
    const x = openSky(g, 2000, 4000);
    stand(g, x);
    run(g, 0.05);
    let top = g.raccoon.y;
    g.step({ ...NO_INPUT, jump: true });
    for (let i = 0; i < 120; i++) {
      g.step(NO_INPUT);
      top = Math.min(top, g.raccoon.y);
    }
    expect(g.level.floorY - top).toBeGreaterThan(180);
  });

  it('a long fall never knocks you out', () => {
    const g = moon();
    const x = openSky(g, 2000, 4000);
    Object.assign(g.raccoon, { x, y: 80, vx: 0, vy: 0, grounded: false, peakY: 80 });
    run(g, 4);
    expect(g.raccoon.grounded).toBe(true);
    expect(g.raccoon.state).toBe('move');
    expect(g.raccoon.health).toBe(RACCOON.health);
  });
});

describe('floating bottles', () => {
  const loose = (g: Game) => {
    const b = g.bottles.find((b) => b.state === 'shelf' && g.level.boards[b.board].unit === 9)!;
    (g as unknown as { knock: (b: Bottle, dir: number) => void }).knock(b, 1);
    return b;
  };

  it('a bumped bottle drifts off in a straight line and floats into a blob when it breaks', () => {
    const g = moon();
    stand(g, 4400);
    const b = loose(g);
    expect(b.drift).toBe(true);
    const vy = b.vy;
    run(g, 0.5);
    expect(b.vy).toBe(vy);
    const seen = run(g, 30);
    expect(b.state).toBe('gone');
    const smash = seen.find((e) => e.type === 'smash')!;
    expect(smash).toBeTruthy();
    const s = g.spills.at(-1)!;
    expect(s.y).toBeLessThan(g.level.floorY - 10);
  });

  it('a drifting bottle never hurts you, and you can snatch it out of the air', () => {
    const g = moon();
    const b = loose(g);
    Object.assign(g.raccoon, { x: b.x + 20, y: b.y + 8, vx: 0, vy: 0, grounded: false, invuln: 0 });
    g.step(NO_INPUT);
    expect(g.raccoon.health).toBe(RACCOON.health);
    expect(g.looseBottle()).toBe(b);
    g.step({ ...NO_INPUT, grab: true });
    expect(g.raccoon.carry).toContain(b.kind);
    expect(b.state).toBe('gone');
  });

  it('a blob can be slurped midair', () => {
    const g = moon();
    const x = openSky(g, 2000, 4000);
    Object.assign(g.raccoon, { x, y: 300, vx: 0, vy: 0, grounded: false });
    g.spills.push({ id: 999, x: x + 10, y: 300 - 14, kind: 'rum', x0: x, flow: 0 });
    g.step({ ...NO_INPUT, grab: true });
    expect(g.raccoon.buzz).toBe(1);
    expect(g.raccoon.seaLegs).toBeGreaterThan(0);
    expect(g.spills.some((s) => s.id === 999)).toBe(false);
  });
});

describe('the drone', () => {
  it('is taken from its pad', () => {
    const g = moon();
    const p = g.level.powerup!;
    const pad = g.level.boards.findIndex((b) => b.y === p.on && b.unit < 0);
    stand(g, p.x + p.w / 2, p.on, pad);
    press(g, 'grab');
    expect(g.has('drone')).toBe(true);
    expect(g.drone?.state).toBe('dock');
  });

  it('flies a full load up to your cousin by itself, then comes back', () => {
    const g = moon(['drone']);
    stand(g, 3000);
    g.raccoon.carry = ['rum', 'curacao', 'regular', 'regular'];
    run(g, 0.2);
    expect(g.drone!.state).toBe('dock');
    g.raccoon.carry.push('mini');
    const seen = run(g, 0.1);
    expect(seen.some((e) => e.type === 'drone')).toBe(true);
    expect(g.raccoon.carry).toHaveLength(0);
    expect(g.drone!.state).toBe('out');
    run(g, 12);
    expect(g.specials).toBe(2);
    expect(g.bonus).toBe(3);
    run(g, 12);
    expect(g.drone!.state).toBe('dock');
  });

  it('a load still in the air counts if you climb out, and is lost if you are caught', () => {
    for (const escaped of [true, false]) {
      const g = moon(['drone']);
      g.drone!.state = 'out';
      g.drone!.cargo = ['rum'];
      g.end(escaped, escaped ? 'climbed' : 'bob');
      expect(g.result!.specials).toBe(escaped ? 1 : 0);
    }
  });
});

describe('the satellites', () => {
  it('see you in the open below and raise the alarm, calling Bob early', () => {
    const g = moon();
    const s = g.sats[0];
    const x = openSky(g, s.route[0], s.route[1]);
    Object.assign(s, { x, cd: 0, sweepT: 0, route: [x, x + 1] });
    stand(g, x);
    const seen = run(g, 0.1);
    expect(seen.some((e) => e.type === 'siren')).toBe(true);
    expect(s.state).toBe('alarm');
    run(g, 0.1);
    expect(g.bob.state).not.toBe('outside');
  });

  it('cannot see you under a rock', () => {
    const g = moon();
    const s = g.sats[0];
    const u = g.level.units[9];
    const x = u.x + u.w / 2;
    Object.assign(s, { x, cd: 0, sweepT: 0, route: [x, x + 1] });
    stand(g, x);
    run(g, 0.5);
    expect(s.state).toBe('scan');
  });

  it('a bottle knocks one out for a while', () => {
    const g = moon();
    const s = g.sats[0];
    g.bottles.push({ id: 900, x: s.x, y: s.y + 40, kind: 'regular', board: -1, state: 'air', vx: 0, vy: -200, safeT: 0 });
    run(g, 0.3);
    expect(s.state).toBe('down');
    run(g, 6);
    expect(s.state).toBe('scan');
    expect(SAT.alarm).toBeGreaterThan(0);
  });
});

describe('Commander Bob', () => {
  it('jetpacks up toward you in a chase, and drops when knocked down', () => {
    const g = moon();
    const u = g.level.units[10];
    const board = g.level.boards.findIndex((b) => b.unit === 10);
    stand(g, u.x + u.w / 2, u.top, board);
    Object.assign(g.bob, { state: 'chase', x: u.x + u.w / 2 - 200, dir: 1, lift: SPACE.bobHover, lostT: 0 });
    run(g, 1);
    expect(g.bob.lift).toBeGreaterThan(SPACE.bobHover + 50);
    (g as unknown as { knockBob: () => void }).knockBob();
    run(g, 2);
    expect(g.bob.lift).toBe(0);
  });

  it('talks like an astronaut', () => {
    const g = moon();
    g.say('bob', 'HEY! Badger!');
    expect(g.says.at(-1)!.text).toBe('Houston, we have a BADGER!');
  });
});
