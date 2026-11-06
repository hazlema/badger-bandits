import { describe, expect, it } from 'vitest';
import { BUZZ, DT, FALL, FLOW, HIT, KNOCKDOWN, NAG_EVERY, NIGHT, RING } from '../src/config';
import { Game, NO_INPUT, type Input, type SimEvent } from '../src/sim/game';

const run = (g: Game, input: Partial<Input>, seconds: number, seen: SimEvent[] = []) => {
  const inp = { ...NO_INPUT, ...input };
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    g.step(inp);
    seen.push(...g.events);
  }
  return seen;
};
const press = (g: Game, input: Partial<Input>) => {
  g.step({ ...NO_INPUT, ...input });
  const e = [...g.events];
  g.step(NO_INPUT);
  return [...e, ...g.events];
};
const settle = (g: Game) => run(g, {}, 0.6);

/** A store with nobody about: Bob outside, the scrubber parked far away. */
const store = () => {
  const g = new Game({ start: 'store' });
  settle(g);
  g.scrub.x = 2550;
  g.scrub.dir = 1;
  return g;
};
const stand = (g: Game, x: number, y: number, facing: 1 | -1 = 1) => {
  g.raccoon.x = x;
  g.raccoon.y = g.raccoon.peakY = y;
  g.raccoon.facing = facing;
  settle(g);
};
const letBobIn = (g: Game) => {
  g.t = NIGHT.length * NIGHT.bobAt;
  g.step(NO_INPUT);
};

describe('targeting and grabbing', () => {
  it('on a shelf the nearest bottle in front highlights, and Grab takes that one', () => {
    const g = store();
    stand(g, 820, 320);
    const lit = g.highlighted()!;
    expect(lit).toBeTruthy();
    expect((lit.x - g.raccoon.x) * g.raccoon.facing).toBeGreaterThan(-6);
    press(g, { grab: true });
    expect(lit.state).toBe('gone');
    expect(g.raccoon.carry).toEqual([lit.kind]);
  });

  it('a bump only ever knocks off one bottle, even at the top of the Buzz meter', () => {
    const g = store();
    stand(g, 410, 320);
    g.raccoon.buzz = BUZZ.steps;
    for (let i = 0; i < 120; i++) {
      g.step({ ...NO_INPUT, right: true });
      const flying = g.bottles.filter((b) => b.state === 'air').length;
      if (flying) {
        expect(flying).toBe(1);
        return;
      }
    }
    throw new Error('never bumped a bottle');
  });

  it('Switch picks which carried item is ready, and Throw uses it when nothing is highlighted', () => {
    const g = store();
    stand(g, 1000, 500);
    g.raccoon.carry = ['mini', 'regular'];
    g.raccoon.ready = 1;
    press(g, { swap: true });
    expect(g.raccoon.ready).toBe(0);
    press(g, { throw: true, down: true });
    expect(g.raccoon.carry).toEqual(['regular']);
  });
});

describe('the three throws', () => {
  it('Lob: hold Throw to aim, let go, and it lands where the dotted arc said', () => {
    const g = store();
    stand(g, 1000, 500);
    g.raccoon.carry = ['regular'];
    run(g, { throw: true }, 0.5);
    const path = g.lobPath();
    expect(path.length).toBeGreaterThan(5);
    const end = path[path.length - 1];
    const events = run(g, {}, 3);
    const smash = events.find((e) => e.type === 'smash');
    expect(smash && smash.type === 'smash' && smash.x).toBeCloseTo(end.x, 5);
    expect(g.raccoon.carry).toEqual([]);
  });

  it('Drop: the highlighted shelf bottle falls straight onto whatever is below', () => {
    const g = store();
    stand(g, 820, 410);
    const lit = g.highlighted()!;
    g.scrub.x = lit.x;
    g.scrub.state = 'patrol';
    const events = press(g, { throw: true, down: true });
    events.push(...run(g, {}, 1));
    expect(g.scrub.state).toBe('down');
    // It hit something, so it damaged it instead of making a noise ring.
    expect(events.some((e) => e.type === 'ring')).toBe(false);
    expect(events.some((e) => e.type === 'smash')).toBe(true);
  });

  it('Roll: bowls the scrubber off its wheels, then cracks with a noise ring when it stops', () => {
    const g = store();
    stand(g, 1720, 500);
    g.raccoon.carry = ['regular'];
    g.scrub.x = 1900;
    g.scrub.state = 'patrol';
    const events = press(g, { throw: true, right: true });
    expect(g.bottles.some((b) => b.state === 'rolling')).toBe(true);
    events.push(...run(g, {}, 0.6));
    expect(g.scrub.state).toBe('down');
    expect(events.some((e) => e.type === 'smash')).toBe(false); // doesn't break while it rolls
    events.push(...run(g, {}, 4));
    expect(events.some((e) => e.type === 'smash')).toBe(true);
    expect(events.some((e) => e.type === 'ring')).toBe(true);
  });

  it('Roll on a shelf knocks off the first bottle it meets, then cracks', () => {
    const g = store();
    stand(g, 820, 320);
    const lit = g.highlighted()!;
    const next = g.bottles
      .filter((b) => b.state === 'shelf' && b.board === lit.board && b.x > lit.x)
      .sort((a, b) => a.x - b.x)[0];
    press(g, { throw: true, right: true });
    run(g, {}, 0.5);
    expect(lit.state).toBe('gone');
    expect(next.state).not.toBe('shelf');
    expect(g.spills.some((s) => s.y === 320)).toBe(true);
  });

  it('a throw that hits nothing makes a noise ring that pulls Bob to the spot', () => {
    const g = store();
    letBobIn(g);
    g.bob.x = 2000;
    g.bob.dir = 1;
    g.bob.goal = 1;
    stand(g, 1760, 500);
    g.raccoon.carry = ['regular'];
    press(g, { throw: true, down: true });
    run(g, {}, 0.2);
    expect(g.bob.state).toBe('investigate');
    expect(Math.abs(g.bob.target - 1770)).toBeLessThan(30);
  });

  it('a bottle on Bob knocks him off his feet; mid-chase, he gets up still chasing', () => {
    const g = store();
    letBobIn(g);
    const board = g.level.boards.findIndex((b) => b.unit === 2 && b.y === 230);
    for (const b of g.bottles) if (b.board === board) b.state = 'gone';
    stand(g, 900, 230);
    g.raccoon.carry = ['regular'];
    g.bob.x = 914;
    g.bob.state = 'chase';
    press(g, { throw: true, down: true });
    run(g, {}, 0.5);
    expect(g.bob.state).toBe('down');
    run(g, {}, KNOCKDOWN.bob);
    expect(g.bob.state).toBe('chase');
  });

  it('a bottle that falls on you is a hit', () => {
    const g = store();
    stand(g, 1000, 500);
    g.bottles.push({ id: 9999, x: 1000, y: 380, kind: 'regular', board: -1, state: 'air', vx: 0, vy: 0, safeT: 0 });
    run(g, {}, 0.5);
    expect(g.raccoon.health).toBe(100 - HIT.damage);
  });

  it('hitting a display makes the biggest noise ring', () => {
    const g = store();
    stand(g, 1630, 450);
    g.raccoon.carry = ['regular'];
    const events = press(g, { throw: true, down: true });
    events.push(...run(g, {}, 0.5));
    expect(g.raccoon.state).toBe('move'); // Throw + Down is a drop, not play dead
    expect(events.some((e) => e.type === 'ring' && e.r === RING.biggest)).toBe(true);
  });
});

describe('spills, hoots and special bottles', () => {
  it('a big floor spill runs downhill toward the front, and the scrubber chases it', () => {
    const g = store();
    stand(g, 1000, 500);
    g.raccoon.carry = ['regular'];
    g.scrub.x = 1250;
    g.scrub.state = 'patrol';
    press(g, { throw: true, down: true });
    run(g, {}, 0.3);
    const spill = g.spills.find((s) => s.y === 500)!;
    expect(spill.flow).toBeGreaterThanOrEqual(FLOW.min);
    expect(g.scrub.state).toBe('rush');
    expect(g.scrub.spill).toBe(spill.id);
    run(g, {}, 1);
    expect(spill.x).toBeGreaterThan(spill.x0);
    run(g, {}, 8);
    expect(g.spills.includes(spill)).toBe(false); // slurped
  });

  it('Hoot costs nothing and pulls everyone to where you are', () => {
    const g = store();
    letBobIn(g);
    g.bob.x = 1750;
    g.bob.dir = 1;
    g.bob.goal = 1;
    stand(g, 1200, 500);
    g.raccoon.carry = ['mini'];
    const events = press(g, { hoot: true });
    expect(events.some((e) => e.type === 'hoot')).toBe(true);
    expect(g.raccoon.carry).toEqual(['mini']);
    expect(g.bob.state).toBe('investigate');
    expect(Math.abs(g.bob.target - 1200)).toBeLessThan(5);
  });

  it('no bottle, no hoot', () => {
    const g = store();
    stand(g, 1200, 500);
    expect(press(g, { hoot: true }).some((e) => e.type === 'hoot')).toBe(false);
  });

  it("the rum captain's spill gives sea legs: no wobble even with Buzz", () => {
    const g = store();
    stand(g, 1000, 500);
    g.spills.push({ id: 999, x: 1000, y: 500, kind: 'rum', x0: 1000, flow: 0 });
    press(g, { grab: true });
    expect(g.raccoon.buzz).toBe(1);
    expect(g.raccoon.seaLegs).toBeGreaterThan(0);
    expect(g.wobble).toBe(0);
  });

  it('blue curaçao paws leave prints the scrubber follows', () => {
    const g = store();
    stand(g, 1000, 500);
    g.spills.push({ id: 999, x: 1000, y: 500, kind: 'curacao', x0: 1000, flow: 0 });
    g.scrub.x = 1500;
    g.scrub.dir = 1;
    g.scrub.state = 'patrol';
    run(g, { right: true }, 1);
    expect(g.raccoon.blueT).toBeGreaterThan(0);
    expect(g.prints.length).toBeGreaterThan(3);
    const x = g.scrub.x;
    run(g, {}, 1);
    expect(g.scrub.x).toBeLessThan(x); // turned round to follow the trail
  });

  it('every third hiccup pops your top bottle out in a lob', () => {
    const g = store();
    stand(g, 1000, 500);
    g.scrub.state = 'down';
    g.scrub.t = 999;
    g.raccoon.buzz = 3;
    g.raccoon.carry = ['mini', 'mini', 'mini', 'mini'];
    let hiccups = 0;
    for (let i = 0; i < 50 / DT && hiccups < 6; i++) {
      g.step(NO_INPUT);
      hiccups += g.events.filter((e) => e.type === 'hiccup').length;
    }
    expect(hiccups).toBe(6);
    expect(g.raccoon.carry.length).toBe(4 - 6 / BUZZ.hiccupLobEvery);
  });
});

describe('falling from the high shelves', () => {
  const walkOff = (g: Game, y: number) => {
    // Unit 2 runs 790-1070: walk off its right end onto the floor.
    for (const b of g.bottles) if (g.level.boards[b.board]?.unit === 2) b.state = 'gone';
    stand(g, 1050, y);
    for (let i = 0; i < 120 && !(g.raccoon.grounded && g.raccoon.y === 500); i++) g.step({ ...NO_INPUT, right: i < 20 });
  };

  it('knocks you out for a few seconds and costs 5% health', () => {
    const g = store();
    walkOff(g, 230);
    expect(g.raccoon.state).toBe('ko');
    expect(g.raccoon.health).toBe(100 - FALL.damage);
    const x = g.raccoon.x;
    run(g, { left: true }, FALL.koTime - 0.2);
    expect(Math.abs(g.raccoon.x - x)).toBeLessThan(5); // can't move while dazed
    run(g, {}, 0.4);
    expect(g.raccoon.state).toBe('move');
  });

  it('a low shelf or a climb down is fine', () => {
    const low = store();
    walkOff(low, 320);
    expect(low.raccoon.state).toBe('move');
    expect(low.raccoon.health).toBe(100);

    const climb = store();
    stand(climb, 900, 150);
    for (let i = 0; i < 400 && climb.raccoon.y < 500; i++) climb.step({ ...NO_INPUT, down: true });
    run(climb, {}, 0.2);
    expect(climb.raccoon.state).toBe('move');
    expect(climb.raccoon.health).toBe(100);
  });
});

describe('the cousin minds the merchandise', () => {
  it('after a run of smashes with nothing handed up, the cousin hisses at you; a hand-up starts the count over', () => {
    const g = store(); // at the hole
    const nags = (events: SimEvent[]) =>
      events.filter((e) => e.type === 'say' && e.who === 'cousin' && e.text.startsWith('Ps')).length;
    const smashOne = () => [...run(g, { throw: true }, 0.3), ...run(g, {}, 3)];
    g.raccoon.carry = Array(NAG_EVERY + 1).fill('regular');
    for (let i = 1; i < NAG_EVERY; i++) expect(nags(smashOne())).toBe(0);
    expect(nags(smashOne())).toBe(1);
    expect(nags(smashOne())).toBe(0);
    g.raccoon.carry = ['regular'];
    press(g, { grab: true });
    expect(g.banked).toBeGreaterThan(0);
    g.raccoon.carry = Array(NAG_EVERY - 1).fill('regular');
    for (let i = 1; i < NAG_EVERY; i++) expect(nags(smashOne())).toBe(0);
  });
});
