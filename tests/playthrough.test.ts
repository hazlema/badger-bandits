import { expect, it } from 'vitest';
import { DT } from '../src/config';
import { Game, NO_INPUT, type Input } from '../src/sim/game';

/** Hold `input` until `done` or the time runs out; returns whether it got there. */
function until(g: Game, input: Partial<Input>, done: () => boolean, seconds = 10) {
  for (let i = 0; i < seconds / DT; i++) {
    if (done()) return true;
    g.step({ ...NO_INPUT, ...input });
  }
  return done();
}
const tap = (g: Game, key: keyof Input) => {
  g.step({ ...NO_INPUT, [key]: true });
  g.step(NO_INPUT);
};

it('the tutorial path is playable from the roof to the practice store with real inputs only', () => {
  const g = new Game({ seed: 7 });
  const R = g.raccoon;

  // Roof: run, jump the AC unit, climb the trellis, pry the vent.
  expect(until(g, { right: true }, () => R.x > 290)).toBe(true);
  g.step({ ...NO_INPUT, right: true, jump: true });
  expect(until(g, { right: true }, () => R.x > 660)).toBe(true);
  expect(until(g, { up: true }, () => R.y === 260 && R.grounded)).toBe(true);
  expect(until(g, { right: true }, () => R.x > 1190)).toBe(true);
  until(g, {}, () => Math.abs(R.vx) < 1, 1);
  tap(g, 'grab');
  expect(g.phase).toBe('crawl');

  // Crawlspace: chew the wires, step on the tile.
  expect(until(g, { right: true }, () => R.x > 520 && Math.abs(R.vx) < 1, 5)).toBe(true);
  tap(g, 'grab');
  expect(g.powerOut).toBe(true);
  expect(until(g, { right: true }, () => g.phase === 'store')).toBe(true);
  until(g, {}, () => R.grounded, 2);
  expect(R.y).toBe(130);

  // Hop down, grab a bottle from the back shelf's second board.
  until(g, { left: true }, () => R.x < 120, 2);
  until(g, {}, () => Math.abs(R.vx) < 1, 1);
  tap(g, 'down'); // hops down through the board to the one below
  expect(until(g, {}, () => R.grounded, 3)).toBe(true);
  expect(R.y).toBe(230);
  const target = g.bottles.find((b) => b.state === 'shelf' && g.level.boards[b.board].y === 230 && g.level.boards[b.board].unit === 0 && b.x > R.x)!;
  expect(target).toBeTruthy();
  // Creep up to it (taps, so we don't knock it off), then grab.
  for (let i = 0; i < 400 && target.x - R.x > 20; i++) {
    g.step({ ...NO_INPUT, right: i % 8 === 0 });
  }
  until(g, {}, () => Math.abs(R.vx) < 1, 1);
  R.facing = 1;
  tap(g, 'grab');
  expect(R.carry.length).toBe(1);

  // Jump back up to the hole and hand it up.
  const hx = g.level.hole!.x + 40;
  until(g, { left: R.x > hx, right: R.x < hx }, () => Math.abs(R.x - hx) < 30, 3);
  until(g, {}, () => Math.abs(R.vx) < 1, 1);
  tap(g, 'jump');
  expect(until(g, {}, () => R.y === 130 && R.grounded, 2)).toBe(true);
  until(g, {}, () => false, 0.2);
  expect(g.atHole()).toBe(true);
  tap(g, 'grab');
  expect(g.specials + g.bonus).toBeGreaterThan(0);
  expect(g.lessons.size).toBeGreaterThan(0);
});
