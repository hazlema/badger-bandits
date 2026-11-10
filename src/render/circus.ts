// Night 4: the circus. The big top's canvas, bleachers, king poles and tightrope, the cannon, clowns, the animals.

import { CLOWN, CRITTER, NIGHT, SLICK } from '../config';
import type { Clown, Critter, Spit } from '../sim/game';
import type { Level, Rect } from '../sim/level';
import { C, ellipse, fillRR, glow, hash, mix, text, withAlpha, type Ctx } from './paint';

const RED = '#a8232f';
const CREAM = '#efe2c2';

/** The tent from inside: striped canvas sloping up to the rigging, spotlights, sawdust and the ring. */
export function bigTop(c: Ctx, L: Level, x0: number, x1: number, time: number, frac: number) {
  const dawn = Math.max(0, (frac - NIGHT.dawnLightFrom) / (1 - NIGHT.dawnLightFrom));
  const stripe = 90;
  for (let x = Math.floor(x0 / stripe) * stripe; x < x1; x += stripe) {
    const odd = Math.round(x / stripe) % 2 !== 0;
    c.fillStyle = mix(odd ? '#4a1018' : '#5c4a3a', odd ? '#8a3a40' : '#a08a6a', dawn * 0.6);
    c.fillRect(x, 0, stripe, L.floorY);
  }
  // Darker toward the top of the tent, where the lights don't reach.
  const shade = c.createLinearGradient(0, 0, 0, L.floorY);
  shade.addColorStop(0, 'rgba(10,4,10,0.75)');
  shade.addColorStop(0.55, 'rgba(10,4,10,0.25)');
  shade.addColorStop(1, 'rgba(10,4,10,0.45)');
  c.fillStyle = shade;
  c.fillRect(x0, 0, x1 - x0, L.floorY);

  // The rip at the top your cousin waits in, with the night sky through it.
  const h = L.hole!;
  c.fillStyle = mix('#0d1a38', '#7aa0d6', dawn);
  c.beginPath();
  c.moveTo(h.x - 8, 0);
  c.lineTo(h.x + h.w + 10, 0);
  c.lineTo(h.x + h.w - 6, L.ceilingY + 14);
  c.lineTo(h.x + h.w / 2, L.ceilingY + 24);
  c.lineTo(h.x + 4, L.ceilingY + 12);
  c.closePath();
  c.fill();

  // Rigging: ropes across the top and a bunting of pennants.
  c.strokeStyle = 'rgba(220,200,160,0.35)';
  c.lineWidth = 2;
  c.beginPath();
  for (let x = Math.floor(x0 / 300) * 300; x < x1; x += 300) {
    c.moveTo(x, 34);
    c.quadraticCurveTo(x + 150, 70, x + 300, 34);
  }
  c.stroke();
  for (let x = Math.floor(x0 / 30) * 30; x < x1; x += 30) {
    const k = ((x % 300) + 300) % 300;
    const y = 34 + Math.sin((k / 300) * Math.PI) * 18;
    c.fillStyle = ['#e6c25a', '#2f6a9a', '#c23a3a', '#3f8a4a'][Math.abs(Math.round(x / 30)) % 4];
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 14, y);
    c.lineTo(x + 7, y + 14 + Math.sin(time * 3 + x) * 1.5);
    c.closePath();
    c.fill();
  }

  // Sawdust floor and the painted ring curb around the cannon.
  c.fillStyle = mix('#7a5a32', '#a08055', dawn);
  c.fillRect(x0, L.floorY, x1 - x0, 44);
  c.fillStyle = 'rgba(255,230,180,0.18)';
  for (let x = Math.floor(x0 / 7) * 7; x < x1; x += 7) c.fillRect(x, L.floorY + 3 + hash(x) * 30, 2, 1.5);
  if (L.cannon) {
    const cx = L.cannon.x;
    fillRR(c, cx - 300, L.floorY - 10, 600, 14, 6, RED, C.ink, 2);
    for (let k = 0; k < 10; k++) c.fillRect(cx - 290 + k * 60, L.floorY - 8, 26, 3);
  }
}

/** Spotlights: soft cones down from the rigging. Drawn in the lighting pass's place, after everything else. */
export function spotlights(c: Ctx, L: Level, time: number) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const lx of L.lights ?? []) {
    const sway = Math.sin(time * 0.6 + lx) * 70;
    const g = c.createLinearGradient(0, 40, 0, L.floorY);
    g.addColorStop(0, 'rgba(255,240,200,0.16)');
    g.addColorStop(1, 'rgba(255,240,200,0.03)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(lx - 10, 40);
    c.lineTo(lx + 10, 40);
    c.lineTo(lx + sway + 90, L.floorY);
    c.lineTo(lx + sway - 90, L.floorY);
    c.closePath();
    c.fill();
    ellipse(c, lx + sway, L.floorY + 2, 90, 10, 'rgba(255,240,200,0.12)');
  }
  c.restore();
  for (const lx of L.lights ?? []) {
    fillRR(c, lx - 12, 30, 24, 16, 4, '#2a2a30', C.ink, 1.5);
    ellipse(c, lx, 46, 9, 4, '#fff2c8');
  }
}

/** Bleacher rows: a bench on each, with the riser below it, stepping up to the tent wall. */
export function bleachers(c: Ctx, L: Level, x0: number, x1: number) {
  L.units.forEach((u, i) => {
    if (u.w < 60 || u.x > x1 || u.x + u.w < x0) return;
    const b = L.boards.find((d) => d.unit === i)!;
    fillRR(c, u.x, b.y, u.w, L.floorY - b.y, 3, '#3a2418', C.ink, 2);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    for (let x = u.x + 30; x < u.x + u.w - 10; x += 60) c.fillRect(x, b.y + 12, 4, L.floorY - b.y - 12);
    fillRR(c, b.x1 - 2, b.y - 2, b.x2 - b.x1 + 4, 10, 2, '#b8863e', '#5a3a1a', 2);
    c.fillStyle = 'rgba(255,240,200,0.25)';
    c.fillRect(b.x1, b.y, b.x2 - b.x1, 2);
  });
}

/** The two king poles, striped, with their platforms, and the tightrope between them. */
export function poles(c: Ctx, L: Level, time: number) {
  L.units.forEach((u, i) => {
    if (u.w >= 60) return;
    const cx = u.x + u.w / 2;
    const top = L.ceilingY - 10;
    fillRR(c, u.x, top, u.w, L.floorY - top, 4, CREAM, C.ink, 2);
    c.save();
    c.beginPath();
    c.rect(u.x, top, u.w, L.floorY - top);
    c.clip();
    c.strokeStyle = RED;
    c.lineWidth = 8;
    for (let y = top - 20; y < L.floorY; y += 30) {
      c.beginPath();
      c.moveTo(u.x - 4, y);
      c.lineTo(u.x + u.w + 4, y + 14);
      c.stroke();
    }
    c.restore();
    for (const b of L.boards.filter((d) => d.unit === i)) {
      fillRR(c, b.x1, b.y, b.x2 - b.x1, 9, 3, '#6a6a74', C.ink, 2);
      c.strokeStyle = 'rgba(30,30,36,0.7)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(b.x1 + 6, b.y + 9);
      c.lineTo(cx - 4, b.y + 34);
      c.moveTo(b.x2 - 6, b.y + 9);
      c.lineTo(cx + 4, b.y + 34);
      c.stroke();
    }
  });
  const r = L.rope;
  if (r) {
    c.strokeStyle = '#e8dcbc';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(r.x1, r.y + 1);
    c.quadraticCurveTo((r.x1 + r.x2) / 2, r.y + 6 + Math.sin(time * 1.4) * 2, r.x2, r.y + 1);
    c.stroke();
  }
}

export function cannon(c: Ctx, k: NonNullable<Level['cannon']>, floor: number, time: number) {
  const a = -0.62;
  ellipse(c, k.x, floor - 1, 60, 6, 'rgba(0,0,0,0.35)');
  c.save();
  c.translate(k.x, floor - 34);
  c.scale(k.dir, 1);
  c.rotate(a);
  fillRR(c, -40, -22, 120, 44, 18, '#2c4a8a', C.ink, 3);
  for (const x of [-10, 30]) fillRR(c, x, -24, 10, 48, 3, '#e6c25a', C.ink, 1.5);
  fillRR(c, 74, -26, 16, 52, 6, '#e6c25a', C.ink, 2.5);
  ellipse(c, 82, 0, 4, 18, '#1a1418');
  for (let i = 0; i < 5; i++) text(c, '★', -26 + i * 22, 1, 12, CREAM, 'center', 700);
  c.restore();
  // Wheels and the lit fuse.
  for (const w of [-26, 26]) {
    ellipse(c, k.x + w, floor - 18, 18, 18, '#7a2f1a');
    ellipse(c, k.x + w, floor - 18, 6, 6, '#e6c25a');
  }
  glow(c, k.x - k.dir * 40, floor - 22, 10 + Math.sin(time * 20) * 3, '#ffb040', 0.8);
  text(c, 'HUMAN CANNONBALL', k.x, floor - 120, 13, CREAM, 'center', 700);
}

export function concessions(c: Ctx, k: Rect) {
  fillRR(c, k.x, k.y, k.w, k.h, 4, '#c23a3a', C.ink, 2.5);
  for (let x = k.x + 10; x < k.x + k.w - 10; x += 26) {
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.fillRect(x, k.y + 8, 12, k.h - 16);
  }
  fillRR(c, k.x - 6, k.y - 6, k.w + 12, 10, 3, '#e6c25a', '#7a5a1a', 2);
  for (const px of [k.x + 4, k.x + k.w - 10]) fillRR(c, px, k.y - 120, 6, 116, 2, '#e6c25a', C.ink, 1.2);
  fillRR(c, k.x - 10, k.y - 146, k.w + 20, 30, 4, '#2c4a8a', C.ink, 2);
  text(c, 'POPCORN · CANDY', k.x + k.w / 2, k.y - 131, 15, CREAM, 'center', 700);
}

export function drawClown(c: Ctx, k: Clown, floor: number, time: number) {
  const x = k.x;
  const d = k.dir;
  if (k.state === 'down') {
    ellipse(c, x, floor - 2, 36, 5, 'rgba(0,0,0,0.3)');
    fillRR(c, x - 30, floor - 16, 46, 14, 6, '#3a6ac2', C.ink, 2);
    ellipse(c, x + 26, floor - 12, 11, 11, '#f4efe4');
    ellipse(c, x + 30, floor - 11, 4, 4, '#e83a3a');
    // The unicycle, rolling off on its own.
    ellipse(c, x - 52, floor - 13, 13, 13, 'rgba(0,0,0,0)');
    c.strokeStyle = C.ink;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(x - 52, floor - 13, 13, 0, Math.PI * 2);
    c.stroke();
    for (let i = 0; i < 3; i++) text(c, '✶', x + 24 + Math.cos(time * 4 + i * 2.1) * 16, floor - 34 + Math.sin(time * 4 + i * 2.1) * 5, 13, C.gold, 'center', 700);
    return;
  }
  const bob = Math.sin(time * 9 + x) * 2;
  // Unicycle wheel, spinning as it goes.
  c.strokeStyle = C.ink;
  c.lineWidth = 2.5;
  c.beginPath();
  c.arc(x, floor - 14, 14, 0, Math.PI * 2);
  c.stroke();
  const spin = x / 14;
  c.beginPath();
  for (let i = 0; i < 3; i++) {
    c.moveTo(x, floor - 14);
    c.lineTo(x + Math.cos(spin + i * 2.09) * 13, floor - 14 + Math.sin(spin + i * 2.09) * 13);
  }
  c.stroke();
  fillRR(c, x - 2, floor - 40, 4, 26, 2, '#8a8a92');
  // Baggy suit with big buttons, ruff, white face, red nose, and a tiny hat.
  const by = floor - 76 + bob;
  fillRR(c, x - 15, by + 14, 30, 26, 9, '#3a6ac2', C.ink, 2);
  for (const [px, col] of [[-5, '#e6c25a'], [5, '#e83a3a']] as const) ellipse(c, x + px, by + 24, 3.2, 3.2, col);
  for (let i = 0; i < 6; i++) ellipse(c, x - 12 + i * 5, by + 13, 4, 3, i % 2 ? '#f4efe4' : '#e6c25a');
  ellipse(c, x + d * 2, by + 2, 11, 11, '#f4efe4');
  ellipse(c, x + d * 8, by + 3, 4, 4, '#e83a3a');
  ellipse(c, x + d * 5, by - 2, 1.6, 1.6, C.ink);
  ellipse(c, x - 8, by - 3, 6, 6, '#e8642a');
  ellipse(c, x + 9, by - 3, 6, 6, '#e8642a');
  fillRR(c, x - 6, by - 16, 12, 9, 2, '#2a2a30', C.ink, 1.5);
  // The horn, raised when it honks.
  const honk = k.state === 'honk';
  const hx = x + d * (honk ? 16 : 14);
  const hy = by + (honk ? -6 : 20);
  ellipse(c, hx, hy, 6, 6, '#e83a3a');
  fillRR(c, hx + (d > 0 ? 4 : -14), hy - 3, 10, 6, 2, '#e6c25a');
  if (honk) text(c, 'HONK!', x, by - 34 + Math.sin(time * 30) * 2, 20, C.gold, 'center', 800);
  // What it can see: a faint cone, so the clowns read as spotters.
  if (!honk) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    const o = { x: x + d * 8, y: floor - CLOWN.eye };
    c.fillStyle = 'rgba(255,220,240,0.06)';
    c.beginPath();
    c.moveTo(o.x, o.y);
    for (const a of [CLOWN.tilt - CLOWN.half, CLOWN.tilt + CLOWN.half]) c.lineTo(o.x + d * Math.cos(a) * CLOWN.range, o.y - Math.sin(a) * CLOWN.range);
    c.closePath();
    c.fill();
    c.restore();
  }
}

/** Perches hang from the rigging, or stand on a post if they're low. A snake has its basket. */
export function drawPerch(c: Ctx, k: Critter, floor: number) {
  const { x, y } = k.home;
  if (k.kind === 'snake') {
    fillRR(c, x - 20, floor - 30, 40, 30, 8, '#b89a5a', C.ink, 2);
    c.strokeStyle = 'rgba(60,40,10,0.6)';
    c.lineWidth = 1.5;
    for (let r = 0; r < 4; r++) {
      c.beginPath();
      c.moveTo(x - 20, floor - 26 + r * 7);
      c.lineTo(x + 20, floor - 26 + r * 7);
      c.stroke();
    }
    return;
  }
  c.strokeStyle = 'rgba(220,200,160,0.6)';
  c.lineWidth = 2;
  if (y < 250) {
    c.beginPath();
    c.moveTo(x - 22, 30);
    c.lineTo(x - 22, y + 4);
    c.moveTo(x + 22, 30);
    c.lineTo(x + 22, y + 4);
    c.stroke();
  } else fillRR(c, x - 4, y + 4, 8, floor - y - 4, 2, '#5a3a1a', C.ink, 1.5);
  fillRR(c, x - 26, y, 52, 6, 3, '#8a6a3a', C.ink, 1.5);
}

export function drawCritter(c: Ctx, k: Critter, floor: number, time: number) {
  const d = k.dir;
  const down = k.state === 'down';
  if (k.kind === 'snake') {
    if (k.state !== 'wind') {
      // Peeking out of the basket.
      ellipse(c, k.x + Math.sin(time * 2 + k.x) * 3, floor - 34, 6, 5, '#5a8a3a');
      if (down) for (let i = 0; i < 3; i++) text(c, '✶', k.x + Math.cos(time * 4 + i * 2.1) * 14, floor - 46, 11, C.gold, 'center', 700);
      return;
    }
    // Reared up and swaying, hood spread, ready to spit.
    const sway = Math.sin(time * 6) * 4;
    c.strokeStyle = '#5a8a3a';
    c.lineWidth = 8;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(k.x, floor - 28);
    c.quadraticCurveTo(k.x - d * 10 + sway, floor - 50, k.x + d * 4 + sway, floor - 66);
    c.stroke();
    c.lineCap = 'butt';
    ellipse(c, k.x + d * 4 + sway, floor - 70, 12, 9, '#6a9a44');
    ellipse(c, k.x + d * 9 + sway, floor - 71, 1.8, 1.8, C.ink);
    text(c, '!', k.x, floor - 96, 20, C.gold, 'center', 700);
    return;
  }
  if (k.kind === 'owl') {
    const y = k.y;
    const puff = k.state === 'wind' ? 1.12 : 1;
    ellipse(c, k.x, y - 14, 14 * puff, 17 * puff, '#8a6a4a');
    ellipse(c, k.x, y - 10, 9, 11, '#c8a87a');
    for (const s of [-1, 1]) {
      ellipse(c, k.x + s * 6, y - 22, 6, 6, down ? '#c8a87a' : '#f4efe4');
      if (!down) ellipse(c, k.x + s * 6 + d, y - 22, 2.6, 2.6, C.ink);
      c.fillStyle = '#5a3a2a';
      c.beginPath();
      c.moveTo(k.x + s * 6, y - 34);
      c.lineTo(k.x + s * 12, y - 40);
      c.lineTo(k.x + s * 12, y - 30);
      c.closePath();
      c.fill();
    }
    ellipse(c, k.x, y - 16, 2, 3, '#e6a23a');
    if (k.state === 'wind') text(c, '!', k.x, y - 50, 20, C.gold, 'center', 700);
    if (down) for (let i = 0; i < 3; i++) text(c, '✶', k.x + Math.cos(time * 4 + i * 2.1) * 16, y - 46, 11, C.gold, 'center', 700);
    return;
  }
  // Eagle: perched upright, or flying with wings out.
  const flying = k.state === 'dive' || k.state === 'back';
  const flap = flying ? Math.sin(time * (k.state === 'dive' ? 6 : 16)) * 10 : 0;
  c.save();
  c.translate(k.x, k.y);
  c.scale(d, 1);
  if (flying) {
    c.fillStyle = '#5a3a22';
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(-4, -10);
      c.quadraticCurveTo(-18, -10 + s * (20 + flap), -36, -8 + s * (14 + flap));
      c.lineTo(-6, -4);
      c.closePath();
      c.fill();
    }
  } else {
    fillRR(c, -10, -30, 20, 30, 8, '#5a3a22', C.ink, 2);
  }
  ellipse(c, flying ? 8 : 2, flying ? -12 : -34, 9, 8, '#f4efe4');
  ellipse(c, flying ? 11 : 5, flying ? -13 : -35, 1.8, 1.8, C.ink);
  c.fillStyle = '#e6b23a';
  c.beginPath();
  c.moveTo(flying ? 16 : 10, flying ? -13 : -35);
  c.lineTo(flying ? 23 : 17, flying ? -10 : -31);
  c.lineTo(flying ? 15 : 9, flying ? -8 : -30);
  c.closePath();
  c.fill();
  if (flying) ellipse(c, -2, -8, 14, 7, '#5a3a22');
  c.restore();
  if (k.state === 'wind') {
    text(c, '!', k.x, k.y - 54, 22, C.gold, 'center', 700);
    // Where it's about to dive: a dotted line, solid once it's locked.
    const locked = k.t <= CRITTER.eagle.lock;
    c.strokeStyle = withAlpha(locked ? '#ffd76a' : '#fff0c0', locked ? 0.8 : 0.4);
    c.lineWidth = locked ? 2 : 1.3;
    c.setLineDash(locked ? [] : [6, 8]);
    c.beginPath();
    c.moveTo(k.x, k.y - 14);
    c.lineTo(k.to.x, k.to.y);
    c.stroke();
    c.setLineDash([]);
  }
  if (down) for (let i = 0; i < 3; i++) text(c, '✶', k.x + Math.cos(time * 4 + i * 2.1) * 16, k.y - 50, 11, C.gold, 'center', 700);
}

export function drawPellet(c: Ctx, x: number, y: number, rot: number) {
  ellipse(c, x, y - 4, 6, 4.5, '#6a5a4a', rot);
  ellipse(c, x - 1, y - 5, 2, 1.5, '#a8987a', rot);
}

export function drawSpits(c: Ctx, spits: Spit[]) {
  for (const s of spits) {
    ellipse(c, s.x, s.y, 7, 4, '#9ae05a');
    ellipse(c, s.x - Math.sign(s.vx) * 10, s.y, 5, 2.5, 'rgba(154,224,90,0.5)');
  }
}

export function drawSlicks(c: Ctx, slicks: { x: number; age: number }[], floor: number) {
  for (const s of slicks) {
    const a = Math.min(1, (SLICK.life - s.age) / 2);
    ellipse(c, s.x, floor + 2, SLICK.w / 2, 4, withAlpha('#9ae05a', 0.55 * a));
    ellipse(c, s.x - 6, floor + 1, 6, 1.5, withAlpha('#ffffff', 0.4 * a));
  }
}
