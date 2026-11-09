import { describe, expect, it } from 'vitest';
import { DT, HIT, KNOCKDOWN, NIGHTS, RING, TANK } from '../src/config';
import { Game, NO_INPUT, type SimEvent } from '../src/sim/game';

const run = (g: Game, seconds: number, seen: SimEvent[] = []) => {
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    g.step(NO_INPUT);
    seen.push(...g.events);
  }
  return seen;
};
const stand = (g: Game, x: number) => {
  const R = g.raccoon;
  Object.assign(R, { x, y: g.level.floorY, vx: 0, vy: 0, grounded: true, ground: 'solid', peakY: g.level.floorY, invuln: 0 });
};
const night = (n: number) => {
  const g = new Game({ start: 'store', night: n });
  run(g, 0.8);
  g.possum = null;
  return g;
};
/** Night 2 with the tank switched off, for firing test shells by hand; the raccoon waits well out of the way. */
const range = () => {
  const g = night(2);
  g.scrub.state = 'down';
  g.scrub.t = 999;
  g.scrub.x = 2000;
  stand(g, 2650);
  return g;
};
const shoot = (g: Game, x: number, y: number, vx = TANK.shellSpeed, vy = 0) => g.shells.push({ x, y, vx, vy, spent: false });

describe('night colours and security', () => {
  it('leaves night 1 alone and gives night 2 a colour and a tank', () => {
    expect(NIGHTS[0].wash).toBeNull();
    expect(NIGHTS[1].wash).toBeTruthy();
    expect(night(1).scrub.tank).toBe(false);
    expect(night(2).scrub.tank).toBe(true);
    expect(new Game({ start: 'training' }).scrub.tank).toBe(false);
  });

  it('the night 1 scrubber never fires', () => {
    const g = night(1);
    g.scrub.x = 2000;
    g.scrub.dir = 1;
    stand(g, 2120);
    const seen = run(g, 4);
    expect(seen.some((e) => e.type === 'siren')).toBe(true);
    expect(seen.some((e) => e.type === 'shot' || e.type === 'aim')).toBe(false);
  });
});

describe('the tank', () => {
  it('spots you, sets off the siren, aims, then fires', () => {
    const g = night(2);
    g.scrub.x = 2620;
    g.scrub.dir = 1;
    stand(g, 2740);
    const seen = run(g, 4);
    const order = seen.map((e) => e.type);
    expect(order).toContain('siren');
    expect(order.indexOf('aim')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('shot')).toBeGreaterThan(order.indexOf('aim'));
    expect(order).toContain('blast');
  });

  it('turns around to shoot at you behind it', () => {
    const g = night(2);
    g.scrub.x = 2620;
    g.scrub.aimT = TANK.aim;
    g.scrub.state = 'alarm';
    g.scrub.t = 3;
    g.scrub.dir = 1;
    stand(g, 2500);
    run(g, 0.3);
    expect(g.scrub.gun).toBe(-1);
  });

  it('a shell that reaches you hurts like any other hit', () => {
    const g = night(2);
    g.scrub.x = 2620;
    g.scrub.state = 'alarm';
    g.scrub.t = 3;
    g.scrub.aimT = TANK.aim;
    stand(g, 2740);
    const before = g.raccoon.health;
    const seen = run(g, TANK.aim + 0.6);
    expect(seen.some((e) => e.type === 'blast')).toBe(true);
    expect(g.raccoon.health).toBe(before - HIT.damage);
  });

  it('can be dodged: the barrel stops following before it fires', () => {
    const g = night(2);
    g.scrub.x = 2620;
    g.scrub.state = 'alarm';
    g.scrub.t = 3;
    g.scrub.aimT = TANK.aim;
    stand(g, 2740);
    run(g, TANK.aim - TANK.lock + 0.05);
    const before = g.raccoon.health;
    stand(g, 2300); // gone, the other way
    run(g, 0.7);
    expect(g.raccoon.health).toBe(before);
  });

  it('waits to reload between shots', () => {
    const g = night(2);
    g.scrub.x = 2620;
    g.scrub.dir = 1;
    stand(g, 2740);
    g.raccoon.health = 100;
    const shots: number[] = [];
    for (let i = 0; i < Math.round(12 / DT); i++) {
      stand(g, 2740);
      g.raccoon.health = 100;
      g.step(NO_INPUT);
      if (g.events.some((e) => e.type === 'shot')) shots.push(i * DT);
    }
    expect(shots.length).toBeGreaterThan(0);
    for (let i = 1; i < shots.length; i++) expect(shots[i] - shots[i - 1]).toBeGreaterThanOrEqual(TANK.reload);
  });

  it('a bottle on it stops it for 4 s and spoils the shot', () => {
    const g = night(2);
    const S = g.scrub;
    S.x = 2000;
    stand(g, 2650);
    S.aimT = TANK.aim;
    g.bottles.push({ id: 9999, x: S.x, y: g.level.floorY - TANK.h - 30, kind: 'regular', board: -1, state: 'air', vx: 0, vy: 300, safeT: 0 });
    const seen = run(g, 1.5);
    expect(S.state).toBe('down');
    expect(KNOCKDOWN.scrubber).toBe(4);
    expect(seen.some((e) => e.type === 'shot')).toBe(false);
  });
});

describe('what a shell sets off', () => {
  it('stops at a shelf post, so shelves are cover', () => {
    const g = range();
    const u = g.level.units[3];
    shoot(g, u.x - 60, g.level.floorY - 40);
    run(g, 0.4);
    expect(g.blasts).toHaveLength(1);
    expect(g.blasts[0].x).toBeGreaterThanOrEqual(u.x - 2);
    expect(g.blasts[0].x).toBeLessThanOrEqual(u.x + 14);
  });

  it('stops at a shelf board', () => {
    const g = range();
    const b = g.level.boards.find((d) => d.unit === 1)!;
    shoot(g, (b.x1 + b.x2) / 2, b.y + 40, 0, -TANK.shellSpeed);
    run(g, 0.3);
    expect(g.blasts[0].y).toBeLessThanOrEqual(b.y + 12);
    expect(g.blasts[0].y).toBeGreaterThanOrEqual(b.y - 12);
  });

  it('blows up the bottles around it and leaves the rest', () => {
    const g = range();
    const shelf = g.bottles.filter((b) => b.state === 'shelf');
    const target = shelf[Math.floor(shelf.length / 2)];
    const spills = g.spills.length;
    shoot(g, target.x - 30, target.y - 14);
    const seen = run(g, 0.3);
    expect(target.state).toBe('gone');
    const near = shelf.filter((b) => Math.hypot(b.x - g.blasts[0].x, b.y - 14 - g.blasts[0].y) <= TANK.blast);
    expect(near.every((b) => b.state === 'gone')).toBe(true);
    expect(shelf.filter((b) => b.state === 'shelf').length).toBe(shelf.length - near.length);
    expect(g.spills.length).toBe(spills + near.length);
    // One big noise, not one per bottle.
    expect(seen.filter((e) => e.type === 'ring' && e.r === RING.biggest)).toHaveLength(1);
  });

  it("doesn't get you nagged for the tank's smashing", () => {
    const g = range();
    for (const b of g.bottles.filter((o) => o.state === 'shelf').slice(0, 30)) {
      if (g.over) break;
      if (b.state === 'shelf') shoot(g, b.x - 20, b.y - 14);
    }
    const seen = run(g, 0.3);
    expect(seen.filter((e) => e.type === 'say' && /merchandise|in the bag|puddles/.test(e.text))).toHaveLength(0);
  });

  it('flattens Bob, and the bang brings him over if he is near', () => {
    const g = range();
    const B = g.bob;
    Object.assign(B, { state: 'search', x: 900 });
    shoot(g, 800, g.level.floorY - 50);
    run(g, 0.3);
    expect(B.state).toBe('down');

    const far = range();
    Object.assign(far.bob, { state: 'search', x: 1200 });
    shoot(far, 800, far.level.floorY - 50);
    run(far, 0.8);
    expect(far.blasts.length).toBeGreaterThan(0);
    expect(far.bob.state).toBe('investigate');
  });

  it("takes out the possum's stack, and the possum with it", () => {
    const g = new Game({ start: 'store', night: 2 });
    run(g, 0.5);
    Object.assign(g.scrub, { state: 'down', t: 999, x: 2000 });
    stand(g, 2650);
    const st = g.level.possum!;
    const top = g.level.boards.find((b) => b.unit < 0 && b.y === st.y)!;
    shoot(g, st.x1 - 30, g.level.floorY - 60);
    run(g, 0.3);
    expect(g.possum).toBeNull();
    expect(g.level.possum).toBeUndefined();
    expect(top.x2).toBe(top.x1);
  });
});
