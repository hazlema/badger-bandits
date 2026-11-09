import { describe, expect, it } from 'vitest';
import { DT, RACCOON, TUTORIAL } from '../src/config';
import { Game, NO_INPUT, type Input } from '../src/sim/game';
import { LESSONS } from '../src/sim/training';

const run = (g: Game, input: Partial<Input>, seconds: number) => {
  const inp = { ...NO_INPUT, ...input };
  for (let i = 0; i < Math.round(seconds / DT); i++) g.step(inp);
};
const tap = (g: Game, key: keyof Input) => {
  g.step({ ...NO_INPUT, [key]: true });
  g.step(NO_INPUT);
};
const settle = (g: Game) => run(g, {}, 0.8);
const practice = () => {
  const g = new Game({ seed: 1, start: 'training' });
  settle(g);
  return g;
};
const spillAt = (g: Game, kind: 'rum' | 'curacao' | 'regular') => {
  g.spills.push({ id: 9000 + g.spills.length, x: g.raccoon.x, y: g.raccoon.y, kind, x0: g.raccoon.x, flow: 0 });
};

describe('start game or tutorial', () => {
  it('Start Game drops straight into the real store', () => {
    const g = new Game({ seed: 1, start: 'store' });
    expect(g.phase).toBe('store');
    expect(g.tutorial).toBe(false);
    expect(g.level.bottles.length).toBeGreaterThan(40);
  });

  it('the tutorial starts on the roof', () => {
    const g = new Game({ seed: 1, start: 'tutorial' });
    expect(g.phase).toBe('roof');
    expect(g.tutorial).toBe(true);
  });
});

describe('the practice store', () => {
  it('has no clock, no Bob and no scrubber, and you cannot run out of health', () => {
    const g = practice();
    g.raccoon.health = 5;
    run(g, {}, 150);
    expect(g.t).toBe(0);
    expect(g.bob.state).toBe('outside');
    expect(g.raccoon.health).toBe(RACCOON.health);
    expect(g.phase).toBe('store');
  });

  it('restocks a bottle after you take it', () => {
    const g = practice();
    const count = () => g.bottles.filter((b) => b.state === 'shelf').length;
    const full = count();
    g.bottles[0].state = 'gone';
    run(g, {}, 0.1);
    expect(count()).toBe(full - 1);
    run(g, {}, TUTORIAL.restock + 0.1);
    expect(count()).toBe(full);
  });

  it('turn-ins teach specials, plain bottles and bonus with Buzz', () => {
    const g = practice();
    g.raccoon.carry = ['rum'];
    tap(g, 'grab');
    expect(g.lessons.has('special')).toBe(true);
    expect(g.lessons.has('plain')).toBe(false);
    g.raccoon.carry = ['regular'];
    tap(g, 'grab');
    expect(g.lessons.has('plain')).toBe(true);
    expect(g.lessons.has('bonus')).toBe(false);
    g.raccoon.buzz = 1;
    g.raccoon.carry = ['regular'];
    tap(g, 'grab');
    expect(g.lessons.has('bonus')).toBe(true);
  });

  it('drinking teaches the sip, and a smashed special gives its buff', () => {
    const g = practice();
    spillAt(g, 'rum');
    tap(g, 'grab');
    expect(g.lessons.has('sip')).toBe(true);
    expect(g.lessons.has('rum')).toBe(true);
    expect(g.raccoon.seaLegs).toBeGreaterThan(0);
    settle(g);
    g.spills = [];
    g.raccoon.blueT = 0;
    g.raccoon.x += 30; // lapping range, just out of stepping-in range
    spillAt(g, 'curacao');
    g.spills[0].x -= 28;
    tap(g, 'grab');
    expect(g.lessons.has('curacao')).toBe(true);
    expect(g.raccoon.blueT).toBeGreaterThan(0);
  });

  it('lob, drop and roll are each their own lesson', () => {
    const g = practice();
    g.raccoon.carry = ['regular', 'regular', 'regular'];
    g.step({ ...NO_INPUT, throw: true });
    g.step(NO_INPUT);
    expect([...g.lessons]).toEqual(['lob']);
    settle(g);
    g.step({ ...NO_INPUT, throw: true });
    g.step({ ...NO_INPUT, throw: true, down: true });
    g.step(NO_INPUT);
    expect(g.lessons.has('drop')).toBe(true);
    settle(g);
    g.step({ ...NO_INPUT, throw: true });
    g.step({ ...NO_INPUT, throw: true, right: true });
    g.step(NO_INPUT);
    expect(g.lessons.has('roll')).toBe(true);
  });

  it('switching, hooting, playing dead and the tote are lessons too', () => {
    const g = practice();
    g.raccoon.carry = ['regular', 'mini'];
    tap(g, 'swap');
    expect(g.lessons.has('swap')).toBe(true);
    tap(g, 'hoot');
    expect(g.lessons.has('hoot')).toBe(true);
    settle(g);

    const p = g.level.plush!;
    g.raccoon.x = p.x + 60;
    g.raccoon.y = p.y;
    settle(g);
    tap(g, 'down');
    expect(g.lessons.has('playdead')).toBe(true);
    tap(g, 'jump');
    settle(g);

    const t = g.level.tote!;
    g.raccoon.x = t.x + t.w / 2;
    g.raccoon.y = g.level.floorY;
    settle(g);
    tap(g, 'grab');
    expect(g.lessons.has('tote')).toBe(true);
    expect(g.capacity).toBe(RACCOON.carry + RACCOON.toteExtra);
  });

  it('only lets you climb out once every lesson is done, and that ends it with no report card', () => {
    const g = practice();
    tap(g, 'up');
    expect(g.phase).toBe('store');
    for (const l of LESSONS) g.lessons.add(l.id);
    expect(g.lesson).toBeNull();
    tap(g, 'up');
    expect(g.phase).toBe('over');
    expect(g.result).toBeNull();
  });
});
