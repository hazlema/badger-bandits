import { describe, expect, it } from 'vitest';
import { BUZZ, DT, RACCOON, SNEAKERS } from '../src/config';
import { Game, NO_INPUT, type Input } from '../src/sim/game';
import { nightLevel, storeLevel } from '../src/sim/level';

const run = (g: Game, seconds: number, input: Partial<Input> = {}) => {
  for (let i = 0; i < Math.round(seconds / DT); i++) g.step({ ...NO_INPUT, ...input });
};
const night2 = (powerups: ('tote' | 'sneakers')[] = ['sneakers']) => {
  const g = new Game({ start: 'store', night: 2, powerups });
  run(g, 0.8);
  g.possum = null;
  Object.assign(g.scrub, { state: 'down', t: 999, x: 200 });
  const R = g.raccoon;
  Object.assign(R, { x: 2200, y: g.level.floorY, vx: 0, vy: 0, grounded: true, ground: 'solid', peakY: g.level.floorY });
  return g;
};
/** Run right for long enough to reach top speed. */
const topSpeed = (g: Game) => {
  run(g, 0.5, { right: true });
  return g.raccoon.vx;
};
const chased = (g: Game) => Object.assign(g.bob, { state: 'chase', x: 300, t: 99 });

describe('powerups carry over', () => {
  it('each night has its own: tote on night 1, sneakers on night 2', () => {
    expect(storeLevel(1).powerup!.kind).toBe('tote');
    expect(nightLevel(2).powerup!.kind).toBe('sneakers');
  });

  it('a tote from night 1 is still there on night 2', () => {
    const g = new Game({ start: 'store', night: 2, powerups: ['tote'] });
    expect(g.has('tote')).toBe(true);
    expect(g.capacity).toBe(RACCOON.carry + RACCOON.toteExtra);
  });

  it('without it, night 2 has the normal capacity', () => {
    const g = new Game({ start: 'store', night: 2 });
    expect(g.capacity).toBe(RACCOON.carry);
  });

  it("taking tonight's powerup adds to what you came in with", () => {
    const g = night2(['tote']);
    const p = g.level.powerup!;
    Object.assign(g.raccoon, { x: p.x + p.w / 2 });
    run(g, 0.1);
    g.step({ ...NO_INPUT, grab: true });
    expect(g.powerups).toEqual(['tote', 'sneakers']);
    expect(g.capacity).toBe(RACCOON.carry + RACCOON.toteExtra);
  });
});

describe('sneakers', () => {
  it('do nothing while nobody is onto you', () => {
    const g = night2();
    expect(topSpeed(g)).toBeCloseTo(RACCOON.runSpeed, 0);
    expect(g.raccoon.sprint).toBe(0);
  });

  it('add speed when Bob is after you', () => {
    const g = night2();
    chased(g);
    expect(topSpeed(g)).toBeCloseTo(RACCOON.runSpeed * (1 + SNEAKERS.boost), 0);
    expect(g.raccoon.sprint).toBe(1);
  });

  it('do nothing if you never picked them up', () => {
    const g = night2([]);
    chased(g);
    expect(topSpeed(g)).toBeCloseTo(RACCOON.runSpeed, 0);
  });

  it('switch on for the siren and the tank too', () => {
    const g = night2();
    Object.assign(g.scrub, { state: 'alarm', t: 2 });
    run(g, 0.1);
    expect(g.raccoon.sprint).toBe(1);
    const h = night2();
    h.scrub.state = 'patrol';
    h.scrub.aimT = 0.8;
    h.step(NO_INPUT);
    expect(h.raccoon.sprint).toBe(1);
  });

  it('give back a bigger share of your speed when you are drunk', () => {
    const g = night2();
    g.raccoon.buzz = 5;
    chased(g);
    const v = topSpeed(g);
    expect(v).toBeCloseTo(RACCOON.runSpeed * (1 - BUZZ.speedLoss * 5 + SNEAKERS.boost), 0);
    expect(v / (RACCOON.runSpeed * (1 - BUZZ.speedLoss * 5))).toBeGreaterThan(1 + SNEAKERS.boost);
  });

  it('fade out once you are safe, and the speed goes with them', () => {
    const g = night2();
    chased(g);
    run(g, 0.2);
    g.bob.state = 'outside';
    run(g, SNEAKERS.fade / 2);
    expect(g.raccoon.sprint).toBeGreaterThan(0.3);
    expect(g.raccoon.sprint).toBeLessThan(0.7);
    run(g, SNEAKERS.fade);
    expect(g.raccoon.sprint).toBe(0);
    expect(topSpeed(g)).toBeCloseTo(RACCOON.runSpeed, 0);
  });
});
