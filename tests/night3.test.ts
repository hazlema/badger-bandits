import { describe, expect, it } from 'vitest';
import { ARCHER, DT, HIT, KNOCKDOWN, NIGHTS, RACCOON, SHIELD } from '../src/config';
import { Game, NO_INPUT, type Archer, type SimEvent } from '../src/sim/game';
import { HANG, isSpecial, nightLevel } from '../src/sim/level';

const run = (g: Game, seconds: number, seen: SimEvent[] = []) => {
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    g.step(NO_INPUT);
    seen.push(...g.events);
  }
  return seen;
};
const stand = (g: Game, x: number) => {
  Object.assign(g.raccoon, { x, y: g.level.floorY, vx: 0, vy: 0, grounded: true, ground: 'solid', peakY: g.level.floorY, invuln: 0 });
};
/** Night 3 with every archer asleep, unless a test wakes one up. */
const faire = (powerups: ('shield' | 'tote')[] = []) => {
  const g = new Game({ start: 'store', night: 3, powerups });
  run(g, 0.4);
  for (const a of g.archers) a.cd = 999;
  stand(g, 3380);
  return g;
};
const wake = (g: Game, i: number) => {
  const a = g.archers[i];
  a.state = 'draw';
  a.t = ARCHER.draw;
  return a;
};
const shootFrom = (g: Game, a: Archer, x: number, y: number, vx: number, vy = 0) => g.arrows.push({ x, y, vx, vy, from: a, spent: false });

describe('the faire', () => {
  const L = nightLevel(3);

  it('is outdoors, with no store security', () => {
    expect(L.faire).toBe(true);
    expect(L.archers!.length).toBeGreaterThan(0);
    const g = faire();
    expect(g.scrub.tank).toBe(false);
    expect(g.scrub.x).toBeLessThan(0);
  });

  it('has the hand-up on the top branch of the cousin tree, and it starts empty', () => {
    const h = L.hole!;
    const top = L.boards.find((b) => b.y === h.y + h.h && b.x1 <= h.x && b.x2 >= h.x + h.w)!;
    expect(top).toBeTruthy();
    expect(L.bottles.filter((b) => L.boards[b.board] === top)).toHaveLength(0);
  });

  it('has the right number of specials, none in the trunks', () => {
    const want = Object.values(NIGHTS[2].specials).reduce((a, b) => a + b, 0);
    expect(L.bottles.filter((b) => isSpecial(b.kind))).toHaveLength(want);
    for (const b of L.bottles) {
      const u = L.units[L.boards[b.board].unit];
      expect(b.x < u.x - 8 || b.x > u.x + u.w + 8).toBe(true);
    }
  });

  it('gaps between trees can be jumped sober', () => {
    const low = L.units.map((_, i) => L.boards.filter((b) => b.unit === i).sort((a, b) => b.y - a.y)[0]);
    const air = (2 * RACCOON.jumpSpeed) / RACCOON.gravity;
    for (let i = 1; i < low.length; i++) expect(low[i].x1 - low[i - 1].x2).toBeLessThan(RACCOON.runSpeed * air);
  });

  it('every tier is one jump from the one below', () => {
    L.units.forEach((_, i) => {
      const ys = L.boards.filter((b) => b.unit === i).map((b) => b.y).sort((a, b) => b - a);
      for (let k = 1; k < ys.length; k++) expect(ys[k - 1] - ys[k]).toBeLessThanOrEqual(110);
    });
  });
});

describe('archers', () => {
  it('stay hidden until you are in range and in the open, then shoot', () => {
    const g = new Game({ start: 'store', night: 3 });
    run(g, 0.4);
    stand(g, 3380);
    g.archers.forEach((a, i) => { if (i !== 6) a.cd = 999; });
    const a = g.archers[6];
    a.cd = 0;
    const far = new Game({ start: 'store', night: 3 });
    run(far, 0.4);
    stand(far, 3380);
    far.archers[0].cd = 0;
    far.step(NO_INPUT);
    expect(far.archers[0].state).toBe('hidden'); // nearly 3000 px away

    const seen = run(g, ARCHER.draw + 0.1);
    expect(seen.some((e) => e.type === 'creak')).toBe(true);
    expect(seen.some((e) => e.type === 'twang')).toBe(true);
  });

  it("don't shoot at someone playing dead", () => {
    const g = faire();
    Object.assign(g.raccoon, { state: 'playdead', stateT: 99, hiddenOk: true });
    g.archers[6].cd = 0;
    g.step(NO_INPUT);
    expect(g.archers[6].state).toBe('hidden');
  });

  it('an arrow hurts like any other hit', () => {
    const g = faire();
    const before = g.raccoon.health;
    shootFrom(g, g.archers[6], g.raccoon.x - 80, g.raccoon.y - 14, ARCHER.arrowSpeed);
    const seen = run(g, 0.3);
    expect(g.raccoon.health).toBe(before - HIT.damage);
    expect(seen.some((e) => e.type === 'yelp')).toBe(true);
    expect(g.floaters.some((f) => f.text === `-${HIT.damage}`)).toBe(true);
  });

  it('can be dodged: the aim locks before the arrow goes', () => {
    const g = faire();
    stand(g, 3380);
    const a = wake(g, 6);
    run(g, ARCHER.draw - ARCHER.lock + 0.02);
    const before = g.raccoon.health;
    stand(g, 3240);
    run(g, 0.6);
    expect(g.raccoon.health).toBe(before);
    expect(a.state === 'recover' || a.state === 'hidden').toBe(true);
  });

  it('a hidden archer cannot be hit, one standing up can', () => {
    const g = faire();
    const a = g.archers[6];
    const drop = () => g.bottles.push({ id: 9000 + g.tick, x: a.x, y: g.level.floorY - 130, kind: 'regular', board: -1, state: 'air', vx: 0, vy: 300, safeT: 0 });
    drop();
    run(g, 0.5);
    expect(a.state).toBe('hidden');
    wake(g, 6);
    drop();
    run(g, 0.3);
    expect(a.state).toBe('down');
    expect(KNOCKDOWN.archer).toBeGreaterThan(0);
  });

  it('a stray arrow knocks over another archer who is standing', () => {
    const g = faire();
    const victim = wake(g, 2);
    victim.t = 99;
    shootFrom(g, g.archers[6], victim.x - 60, g.level.floorY - 50, ARCHER.arrowSpeed);
    run(g, 0.2);
    expect(victim.state).toBe('down');
  });

  it('an arrow can flatten Bob', () => {
    const g = faire();
    Object.assign(g.bob, { state: 'search', x: 2520, t: 99 });
    shootFrom(g, g.archers[6], 2460, g.level.floorY - 50, ARCHER.arrowSpeed);
    run(g, 0.15);
    expect(g.bob.state).toBe('down');
  });

  it('stops at a trunk, so trees are cover', () => {
    const g = faire();
    const u = g.level.units[3];
    shootFrom(g, g.archers[6], u.x - 50, g.level.floorY - 40, ARCHER.arrowSpeed);
    run(g, 0.3);
    expect(g.arrows).toHaveLength(0);
    expect(g.stuck).toHaveLength(1);
    expect(g.stuck[0].x).toBeGreaterThanOrEqual(u.x - 2);
    expect(g.stuck[0].x).toBeLessThanOrEqual(u.x + 12);
  });
});

describe('bottle trees and hay', () => {
  it('bottles hang from branches but stand on hay', () => {
    const g = faire();
    const b = g.bottles.find((o) => o.state === 'shelf')!;
    expect(g.hanging(b)).toBe(true);
  });

  it('an arrow through the string drops the bottle, and it smashes on the grass', () => {
    const g = faire();
    const L = g.level;
    const noBale = g.bottles.filter((b) => b.state === 'shelf' && g.hanging(b) && !L.bales!.some((r) => b.x >= r.x - 10 && b.x <= r.x + r.w + 10) && L.boards[b.board].y > 380);
    const b = noBale[0];
    shootFrom(g, g.archers[6], b.x - 50, b.y + 24, ARCHER.arrowSpeed);
    const seen = run(g, 1.2);
    expect(seen.some((e) => e.type === 'knock')).toBe(true);
    expect(b.state).toBe('gone');
    expect(g.spills.some((s) => s.x === b.x)).toBe(true);
  });

  it('a bottle that falls on a hay bale sits there, unbroken, ready to take', () => {
    const g = faire();
    const r = g.level.bales![1];
    const b = g.bottles.find((o) => o.state === 'shelf')!;
    Object.assign(b, { x: r.x + 20, y: r.y - 150, state: 'air', vx: 0, vy: 200, safeT: 0 });
    run(g, 0.6);
    expect(b.state).toBe('shelf');
    expect(b.y).toBe(r.y);
    expect(g.hanging(b)).toBe(false);
    stand(g, r.x + 20);
    Object.assign(g.raccoon, { y: r.y, ground: g.level.boards.findIndex((d) => d.unit < 0 && d.y === r.y && d.x1 === r.x) });
    run(g, 0.05);
    expect(g.highlighted()).toBe(b);
  });
});

describe('picking up from the hay', () => {
  const onBale = () => {
    const g = faire();
    const r = g.level.bales![1];
    const b = g.bottles.find((o) => o.state === 'shelf')!;
    Object.assign(b, { x: r.x + 40, y: r.y - 150, state: 'air', vx: 0, vy: 200, safeT: 0 });
    run(g, 0.6);
    return { g, r, b };
  };

  it('can be done from the grass, standing next to the bale', () => {
    const { g, r, b } = onBale();
    stand(g, r.x + 20);
    g.raccoon.facing = 1;
    run(g, 0.05);
    expect(g.highlighted()).toBe(b);
    g.step({ ...NO_INPUT, grab: true });
    expect(b.state).toBe('gone');
    expect(g.raccoon.carry).toHaveLength(1);
  });

  it("doesn't reach bottles up in the trees from the ground", () => {
    const g = faire();
    const b = g.bottles.find((o) => o.state === 'shelf' && g.hanging(o) && g.level.boards[o.board].y >= 400)!;
    stand(g, b.x - 12);
    g.raccoon.facing = 1;
    run(g, 0.05);
    expect(g.highlighted()).toBeNull();
  });

  it('standing inside a bale is still cover from arrows', () => {
    const g = faire();
    const r = g.level.bales![1];
    stand(g, r.x + r.w / 2);
    const h = g.raccoon.health;
    shootFrom(g, g.archers[6], r.x - 60, g.level.floorY - 12, ARCHER.arrowSpeed);
    run(g, 0.3);
    expect(g.raccoon.health).toBe(h);
    expect(g.stuck).toHaveLength(1);
  });
});

describe('pot lid', () => {
  it('blocks one arrow, then has to recover', () => {
    const g = faire(['shield']);
    const h = g.raccoon.health;
    shootFrom(g, g.archers[6], g.raccoon.x - 60, g.raccoon.y - 14, ARCHER.arrowSpeed);
    const seen = run(g, 0.2);
    expect(g.raccoon.health).toBe(h);
    expect(seen.some((e) => e.type === 'clank')).toBe(true);
    expect(g.raccoon.shieldT).toBeGreaterThan(SHIELD.recharge - 1);
    shootFrom(g, g.archers[6], g.raccoon.x - 60, g.raccoon.y - 14, ARCHER.arrowSpeed);
    run(g, 0.2);
    expect(g.raccoon.health).toBe(h - HIT.damage);
  });

  it('comes back after 20 seconds and says so', () => {
    const g = faire(['shield']);
    g.raccoon.shieldT = 0.05;
    const seen = run(g, 0.2);
    expect(g.raccoon.shieldT).toBe(0);
    expect(seen.some((e) => e.type === 'lidReady')).toBe(true);
  });

  it('is on the rack and joins what you brought', () => {
    const g = faire(['tote']);
    const p = g.level.powerup!;
    expect(p.kind).toBe('shield');
    stand(g, p.x + p.w / 2);
    run(g, 0.05);
    g.step({ ...NO_INPUT, grab: true });
    expect(g.powerups).toEqual(['tote', 'shield']);
  });
});

describe('Sir Bob', () => {
  it('speaks the part', () => {
    const g = faire();
    g.say('bob', 'HEY! Badger!', 1);
    expect(g.says.some((s) => s.who === 'bob' && s.text === 'HALT, badger!')).toBe(true);
  });

  it("doesn't on the other nights", () => {
    const g = new Game({ start: 'store', night: 2 });
    g.say('bob', 'HEY! Badger!', 1);
    expect(g.says.some((s) => s.who === 'bob' && s.text === 'HEY! Badger!')).toBe(true);
  });

  it('counts as danger for the sneakers when an archer draws', () => {
    const g = faire();
    expect(g.inDanger).toBe(false);
    wake(g, 6);
    expect(g.inDanger).toBe(true);
  });
});

it('hanging bottles sit far enough down to be seen under the branch', () => {
  expect(HANG).toBeGreaterThan(30);
});
