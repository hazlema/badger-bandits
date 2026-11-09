// The things night 2 adds: the checkout belt, the till you can mash, and the possum on its case stack.

import { BELT, POSSUM, TILL } from '../config';
import type { Possum } from '../sim/game';
import type { Level, Rect } from '../sim/level';
import { C, ellipse, fillRR, glow, hash, text, withAlpha, type Ctx } from './paint';

const BELT_H = 7;

export function checkoutBelt(c: Ctx, b: NonNullable<Level['belt']>, time: number) {
  const top = b.y - BELT_H;
  fillRR(c, b.x1 - 6, top - 1, b.x2 - b.x1 + 12, BELT_H + 3, 3, '#5f6670', C.ink, 2);
  fillRR(c, b.x1, top + 1, b.x2 - b.x1, BELT_H - 2, 2, '#26262c');
  // Ridges creeping along with the bottles.
  c.fillStyle = 'rgba(255,255,255,0.13)';
  for (let x = b.x1 + ((time * BELT.speed) % 24); x < b.x2 - 2; x += 24) c.fillRect(x, top + 1, 3, BELT_H - 2);
  // End rollers, and the backup battery's little green light.
  for (const x of [b.x1 - 2, b.x2 + 2]) ellipse(c, x, b.y - BELT_H / 2, 4, 4, '#8f989f');
  glow(c, b.x1 + 2, top - 6, 8, '#46e070', 0.5 + 0.25 * Math.sin(time * 5));
  ellipse(c, b.x1 + 2, top - 6, 2, 2, '#7cf09a');
}

export function tillRegister(c: Ctx, r: Rect, till: { mashes: number; open: boolean; sprayT: number }, time: number) {
  const cx = r.x + r.w / 2;
  // The drawer slides out low on the front once it's sprung.
  if (till.open) {
    fillRR(c, r.x - 12, r.y + r.h - 12, r.w + 24, 12, 2, '#3b3c42', C.ink, 2);
    for (let i = 0; i < 5; i++) ellipse(c, r.x - 4 + i * 14, r.y + r.h - 11, 4, 2, i % 2 ? C.gold : '#b98a2e');
  }
  fillRR(c, r.x, r.y + 14, r.w, r.h - (till.open ? 26 : 14), 5, '#55565c', C.ink, 2);
  fillRR(c, r.x + 8, r.y, r.w - 16, 18, 3, '#3b3c42', C.ink, 2);
  fillRR(c, r.x + 12, r.y + 4, r.w - 24, 10, 2, '#2d4a3a');
  const shown = till.open ? 'NO SALE' : '$ 0.00';
  text(c, shown, cx, r.y + 9.5, 7.5, '#8fe0a6', 'center', 600);
  // Keys, which light up as you get through them.
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 4; i++) {
      const k = row * 4 + i;
      const lit = !till.open && k < till.mashes;
      fillRR(c, r.x + 8 + i * 11, r.y + 21 + row * 8, 8, 6, 1.5, lit ? C.gold : '#cfcdd2', C.ink, 1);
    }
  }
  // The spray: coins up and out, tumbling down onto the counter.
  if (till.sprayT > 0) {
    const t = (TILL.sprayTime - till.sprayT) * 1.1;
    for (let i = 0; i < 26; i++) {
      const vx = (hash(i) - 0.5) * 300;
      const vy = -180 - hash(i + 40) * 220;
      const y = Math.min(r.y + r.h, r.y + 8 + vy * t + 520 * t * t);
      const spin = Math.abs(Math.sin(time * 16 + i));
      ellipse(c, cx + vx * t, y, 1 + 3.5 * spin, 4, i % 3 ? C.gold : '#ffe9a8');
    }
  }
}

/** Beer cases stacked to the possum's perch. */
export function caseStack(c: Ctx, s: NonNullable<Level['possum']>, floorY: number) {
  const w = s.x2 - s.x1;
  ellipse(c, s.x1 + w / 2, floorY, w / 2 + 8, 5, 'rgba(0,0,0,0.3)');
  const rows = 4;
  const h = (floorY - s.y) / rows;
  for (let r = 0; r < rows; r++) {
    const y = floorY - (r + 1) * h;
    const shift = r % 2 ? 6 : -4;
    const col = ['#a4743f', '#94652f', '#b0814a'][r % 3];
    fillRR(c, s.x1 + shift, y, w - 2, h, 3, col, '#2a170c', 2);
    c.fillStyle = 'rgba(42,23,12,0.5)';
    c.fillRect(s.x1 + shift + w / 2 - 6, y + 1, 10, h - 2);
    text(c, r % 2 ? 'LAGER' : 'THIS WAY UP', s.x1 + shift + (w - 2) / 2, y + h / 2, 10, 'rgba(30,16,8,0.65)', 'center', 700);
  }
}

export function drawPossum(c: Ctx, P: Possum, time: number) {
  const woozy = P.woozy > 0;
  const winding = P.windT > 0;
  const sway = woozy ? Math.sin(time * 3.2) * 0.2 : 0;
  c.save();
  c.translate(P.x, P.y);
  c.scale(P.dir, 1);
  c.rotate(sway);
  // Long bare tail
  c.strokeStyle = '#d9a1a8';
  c.lineWidth = 3.5;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-14, -6);
  c.bezierCurveTo(-30, -2, -38, -14 + Math.sin(time * 2) * 3, -26, -18);
  c.stroke();
  c.lineCap = 'butt';
  // Scruffy body
  ellipse(c, 0, -13, 17, 13, '#a7a2a0');
  for (let i = 0; i < 9; i++) ellipse(c, -13 + i * 3.2, -24 + hash(i) * 3, 2.2, 3.4, i % 2 ? '#8b8684' : '#c8c3c0', -0.5 + hash(i + 3));
  ellipse(c, 3, -9, 10, 7, '#d6d0ca');
  fillRR(c, -11, -5, 7, 5, 2.5, '#d9a1a8');
  fillRR(c, 5, -5, 7, 5, 2.5, '#d9a1a8');
  // Pale pointed face, black ears, pink nose
  ellipse(c, 13, -27, 4.5, 5.5, '#26222a', -0.3);
  ellipse(c, 21, -29, 4, 5, '#26222a', 0.3);
  ellipse(c, 18, -21, 10, 8.5, '#efe8df');
  c.fillStyle = '#efe8df';
  c.beginPath();
  c.moveTo(22, -26);
  c.lineTo(36, -18);
  c.lineTo(22, -14);
  c.fill();
  ellipse(c, 36, -18, 2.6, 2.2, '#e07a8a');
  if (woozy) {
    c.strokeStyle = C.ink;
    c.lineWidth = 1.4;
    for (const ex of [16, 25]) {
      c.beginPath();
      c.moveTo(ex - 2.5, -24);
      c.lineTo(ex + 2.5, -21);
      c.moveTo(ex + 2.5, -24);
      c.lineTo(ex - 2.5, -21);
      c.stroke();
    }
    // Still dripping.
    ellipse(c, -8 + Math.sin(time * 4) * 4, -3 + ((time * 40) % 8), 1.5, 2.5, '#9fd4e8');
  } else {
    ellipse(c, 18, -23, 1.8, 2, C.ink);
    ellipse(c, 25, -23, 1.8, 2, C.ink);
  }
  if (winding) {
    const lift = 1 - P.windT / POSSUM.windup;
    c.strokeStyle = '#d9a1a8';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(6, -20);
    c.lineTo(10, -34 - lift * 6);
    c.stroke();
    fillRR(c, 5, -52 - lift * 6, 10, 15, 2, '#c8cdd2', C.ink, 1.5);
    c.fillStyle = '#c23a2a';
    c.fillRect(7, -48 - lift * 6, 6, 6);
  }
  c.restore();
  if (woozy) {
    for (let i = 0; i < 3; i++) {
      const a = time * 4 + (i * Math.PI * 2) / 3;
      text(c, '~', P.x + Math.cos(a) * 18, P.y - 42 + Math.sin(a) * 4, 13, withAlpha('#bfe6f2', 0.9), 'center', 700);
    }
  } else if (winding) text(c, '!', P.x, P.y - 66, 22, C.red, 'center', 700);
}
