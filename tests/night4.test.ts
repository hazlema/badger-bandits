import { describe, expect, it } from 'vitest';
import { CLOWN, CRITTER, DT, FALL, HIT, NIGHTS, RING, SLICK } from '../src/config';
import { Game, NO_INPUT, type Input, type SimEvent } from '../src/sim/game';
import { isSpecial, nightLevel } from '../src/sim/level';

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
/** Night 4 with every clown and animal holding still, unless a test wakes one. */
const circus = (powerups: ('candy' | 'tote')[] = []) => {
  const g = new Game({ start: 'store', night: 4, powerups });
  run(g, 0.4);
  for (const c of g.clowns) Object.assign(c, { cd: 999, x: c.route[0] });
  for (const c of g.critters) c.cd = 999;
  stand(g, 3700);
  return g;
};
const critter = (g: Game, kind: string) => g.critters.find((c) => c.kind === kind)!;

describe('the big top', () => {
  const L = nightLevel(4);

  it('is a circus, with no store security', () => {
    expect(L.circus).toBe(true);
    const g = circus();
    expect(g.scrub.x).toBeLessThan(0);
    expect(g.clowns.length).toBeGreaterThan(0);
    expect(new Set(g.critters.map((c) => c.kind))).toEqual(new Set(['eagle', 'owl', 'snake']));
  });

  it('has the hand-up on the first king pole, empty, and the right specials', () => {
    const h = L.hole!;
    const top = L.boards.find((b) => b.y === h.y + h.h && b.x1 <= h.x && b.x2 >= h.x + h.w)!;
    expect(L.bottles.filter((b) => L.boards[b.board] === top)).toHaveLength(0);
    const want = Object.values(NIGHTS[3].specials).reduce((a, b) => a + b, 0);
    expect(L.bottles.filter((b) => isSpecial(b.kind))).toHaveLength(want);
  });

  it('every bleacher row and pole platform is one jump from the one below', () => {
    L.units.forEach((u, i) => {
      if (u.w >= 60) return; // bleacher rows are one board each; checked below
      const ys = L.boards.filter((b) => b.unit === i).map((b) => b.y).sort((a, b) => b - a);
      for (let k = 1; k < ys.length; k++) expect(ys[k - 1] - ys[k]).toBeLessThanOrEqual(110);
    });
    const rows = L.units.filter((u) => u.w >= 60).map((u) => u.top);
    for (const y of rows) expect(y === 420 || rows.includes(y + 80)).toBe(true);
  });
});

describe('the cannon', () => {
  it('fires you across the tent onto the far bleachers, without knocking you out', () => {
    const g = circus();
    const k = g.level.cannon!;
    stand(g, k.x);
    run(g, 0.05);
    const seen = run(g, 0.05, { grab: true });
    expect(seen.some((e) => e.type === 'cannon')).toBe(true);
    expect(seen.some((e) => e.type === 'ring' && e.r === RING.biggest)).toBe(true);
    run(g, 2);
    const R = g.raccoon;
    expect(R.grounded).toBe(true);
    expect(R.y).toBe(k.to.y);
    expect(Math.abs(R.x - k.to.x)).toBeLessThan(160);
    expect(R.state).not.toBe('ko');
    expect(k.to.y - 0).toBeLessThan(FALL.koHeight + 500);
  });
});

describe('clowns', () => {
  it('honk when they see you: a big noise, riled animals, and Bob called in early', () => {
    const g = circus();
    const c = g.clowns[2];
    Object.assign(c, { x: 3200, dir: 1, cd: 0 });
    stand(g, 3360);
    const seen = run(g, 0.2);
    expect(c.state).toBe('honk');
    expect(seen.some((e) => e.type === 'honk')).toBe(true);
    expect(seen.some((e) => e.type === 'ring' && e.r === RING.siren)).toBe(true);
    expect(g.alertT).toBeGreaterThan(0);
    expect(g.inDanger).toBe(true);
  });

  it("don't honk at someone playing dead", () => {
    const g = circus();
    const c = g.clowns[2];
    Object.assign(c, { x: 3200, dir: 1, cd: 0 });
    stand(g, 3360);
    Object.assign(g.raccoon, { state: 'playdead', stateT: 99 });
    run(g, 0.2);
    expect(c.state).toBe('patrol');
  });

  it('a bottle knocks one off its unicycle', () => {
    const g = circus();
    const c = g.clowns[1];
    g.bottles.push({ id: 9001, x: c.x, y: g.level.floorY - CLOWN.h - 30, kind: 'regular', board: -1, state: 'air', vx: 0, vy: 300, safeT: 0 });
    run(g, 0.3);
    expect(c.state).toBe('down');
  });
});

describe('the animals', () => {
  it('an owl guards the stands: it lobs a pellet that hurts but leaves no puddle', () => {
    const g = circus();
    const o = critter(g, 'owl');
    const top = g.level.boards.findIndex((b) => b.y === 180 && b.x1 === 40);
    stand(g, o.x - 130, 180, top);
    g.bottles = g.bottles.filter((b) => b.board !== top); // so the knockback can't bump one off the bench
    o.cd = 0;
    const spills = g.spills.length;
    const before = g.raccoon.health;
    const seen = run(g, CRITTER.owl.wind + 1.4);
    expect(seen.some((e) => e.type === 'whoo')).toBe(true);
    expect(g.raccoon.health).toBe(before - HIT.damage);
    expect(g.spills.length).toBe(spills);
  });

  it('a snake spits along the floor and leaves a slick', () => {
    const g = circus();
    const s = g.critters.filter((c) => c.kind === 'snake')[1];
    stand(g, s.x + 180);
    s.cd = 0;
    const before = g.raccoon.health;
    const seen = run(g, CRITTER.snake.wind + 0.8);
    expect(seen.some((e) => e.type === 'spit')).toBe(true);
    expect(g.raccoon.health).toBe(before - HIT.damage);
    expect(g.slicks.length).toBe(1);
  });

  it("a snake can't spit up at you on a platform", () => {
    const g = circus();
    const s = g.critters.filter((c) => c.kind === 'snake')[1];
    stand(g, s.x + 120, 330, 0);
    s.cd = 0;
    run(g, 0.1);
    expect(s.state).toBe('idle');
  });

  it('a slick makes you slide', () => {
    const slide = (slick: boolean) => {
      const g = circus();
      stand(g, 1900);
      if (slick) g.slicks.push({ x: 1900, age: 0 });
      g.raccoon.vx = 230;
      run(g, 0.15);
      return g.raccoon.vx;
    };
    expect(slide(true)).toBeGreaterThan(slide(false) + 100);
    expect(SLICK.grip).toBeLessThan(0.5);
  });

  it('an eagle dives at you', () => {
    const g = circus();
    const e = critter(g, 'eagle');
    stand(g, e.x + 200);
    e.cd = 0;
    const before = g.raccoon.health;
    const seen = run(g, CRITTER.eagle.wind + 1.2);
    expect(seen.some((s) => s.type === 'screech')).toBe(true);
    expect(g.raccoon.health).toBe(before - HIT.damage);
  });

  it('dodge once it locks, and the eagle flattens whoever is standing there instead', () => {
    const g = circus();
    const e = critter(g, 'eagle');
    stand(g, e.x + 200);
    e.cd = 0;
    run(g, CRITTER.eagle.wind - CRITTER.eagle.lock + 0.05);
    stand(g, 2600);
    Object.assign(g.bob, { state: 'search', x: e.x + 200, t: 99 });
    run(g, 1.2);
    expect(g.bob.state).toBe('down');
    expect(g.raccoon.health).toBe(100);
  });

  it('a riled animal shoots twice as often', () => {
    const calm = circus();
    const riled = circus();
    riled.alertT = 99;
    for (const g of [calm, riled]) {
      const o = critter(g, 'owl');
      o.cd = 1;
      stand(g, 3700);
      run(g, 0.6);
    }
    expect(critter(riled, 'owl').cd).toBeLessThan(critter(calm, 'owl').cd - 0.5);
  });
});

describe('the tightrope', () => {
  const onRope = (buzz: number) => {
    const g = circus();
    const r = g.level.rope!;
    const i = g.level.boards.findIndex((b) => b.y === r.y && b.x1 === r.x1);
    stand(g, (r.x1 + r.x2) / 2, r.y, i);
    g.raccoon.buzz = buzz;
    g.raccoon.seaLegs = 0;
    let fell = false;
    for (let k = 0; k < Math.round(20 / DT) && !fell; k++) {
      g.raccoon.buzzT = 0;
      g.raccoon.hiccupT = 99;
      g.step(NO_INPUT);
      fell = g.raccoon.y > r.y + 5;
    }
    return fell;
  };
  it('holds you sober', () => expect(onRope(0)).toBe(false));
  it('wobbles you off drunk', () => expect(onRope(5)).toBe(true));
});

describe('cotton candy', () => {
  it('is on the rack', () => {
    const g = circus();
    const p = g.level.powerup!;
    expect(p.kind).toBe('candy');
    stand(g, p.x + p.w / 2);
    run(g, 0.05);
    g.step({ ...NO_INPUT, grab: true });
    expect(g.has('candy')).toBe(true);
  });

  it('keeps your bottle when you are hit', () => {
    const sticky = circus(['candy']);
    sticky.raccoon.carry = ['rum', 'regular'];
    sticky.hit(1, 'a test');
    expect(sticky.raccoon.carry).toEqual(['rum', 'regular']);
    const plain = circus();
    plain.raccoon.carry = ['rum', 'regular'];
    plain.hit(1, 'a test');
    expect(plain.raccoon.carry).toEqual(['rum']);
  });

  it('keeps your bottles through every hiccup', () => {
    const count = (powerups: ('candy' | 'tote')[]) => {
      const g = circus(powerups);
      stand(g, 1900);
      g.raccoon.carry = ['regular', 'regular', 'regular', 'regular'];
      g.raccoon.buzz = 5;
      for (let k = 0; k < Math.round(30 / DT); k++) {
        g.raccoon.buzzT = 0;
        g.step(NO_INPUT);
      }
      return g.raccoon.carry.length;
    };
    expect(count(['candy'])).toBe(4);
    expect(count([])).toBeLessThan(4);
  });
});

describe('Ringmaster Bob', () => {
  it('works the crowd', () => {
    const g = circus();
    g.say('bob', 'HEY! Badger!', 1);
    expect(g.says.some((s) => s.who === 'bob' && s.text === 'Ladies and gentlemen… a BADGER!')).toBe(true);
  });
});
