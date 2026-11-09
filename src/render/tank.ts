// Night 2's security: the tank, its shells, the explosions and the scorch marks they leave.

import { TANK } from '../config';
import type { Blast, Scrubber, Shell } from '../sim/game';
import { C, ellipse, fillRR, glow, hash, text, withAlpha, type Ctx } from './paint';

const GREEN = '#5b7040';
const GREEN_DARK = '#3f5030';
const TAN = '#8a8455';
const STEEL = '#2c2f29';

export function drawTank(c: Ctx, S: Scrubber, y: number, time: number, eye: { x: number; y: number }) {
  const down = S.state === 'down';
  const rush = S.state === 'rush';
  const raised = S.eye > TANK.h + 2;
  const half = TANK.w / 2;
  ellipse(c, S.x, y - 1, half + 8, 5, withAlpha('#000', 0.35));

  // The periscope goes up through the hatch, in world coordinates so it lines up with the sight check.
  if (raised) {
    const px = eye.x - S.dir * 4;
    const top = eye.y;
    const len = y - TANK.h - top;
    for (let k = 0; k < 3; k++) {
      const w0 = 8 - k * 2;
      const y0 = y - TANK.h - (len * k) / 3;
      fillRR(c, px - w0 / 2, y0 - len / 3 - 2, w0, len / 3 + 4, 1.5, k % 2 ? GREEN_DARK : GREEN, C.ink, 1.2);
    }
  }

  c.save();
  c.translate(S.x, y);
  c.scale(S.gun, 1);

  // The barrel, behind the turret, swinging from the pivot and kicking back when it fires.
  const droop = down ? -0.25 : S.aim;
  const kick = (S.kick / 0.25) * 12;
  c.save();
  c.translate(0, -TANK.pivot);
  c.rotate(-droop);
  fillRR(c, 10 - kick, -3.5, TANK.barrel - 10, 7, 2, GREEN_DARK, C.ink, 2);
  fillRR(c, TANK.barrel - 8 - kick, -5.5, 12, 11, 2, STEEL, C.ink, 2);
  c.restore();

  // Turret and hatch.
  fillRR(c, -14, -TANK.h - 6, 18, 6, 2, GREEN_DARK, C.ink, 2);
  fillRR(c, -32, -TANK.h, 66, 24, 10, GREEN, C.ink, 2.5);
  ellipse(c, -16, -TANK.h + 9, 7, 5, GREEN_DARK);
  ellipse(c, 12, -TANK.h + 14, 8, 4, TAN);

  // Hull, sloped at the nose.
  c.beginPath();
  c.moveTo(-half + 2, -18);
  c.lineTo(-half + 6, -37);
  c.lineTo(half - 18, -37);
  c.lineTo(half, -18);
  c.closePath();
  c.fillStyle = GREEN;
  c.fill();
  c.strokeStyle = C.ink;
  c.lineWidth = 2.5;
  c.stroke();
  ellipse(c, -30, -27, 12, 5, GREEN_DARK);
  ellipse(c, 26, -29, 10, 4, TAN);
  ellipse(c, -6, -24, 7, 3, TAN);
  text(c, '★', 2, -27, 16, C.cream, 'center', 700);

  // Tracks: a moving belt of teeth around the road wheels.
  fillRR(c, -half, -18, TANK.w, 18, 9, STEEL, C.ink, 2.5);
  c.fillStyle = 'rgba(255,255,255,0.14)';
  const roll = ((S.x % 12) + 12) % 12;
  for (let x = -half + 8 + roll; x < half - 6; x += 12) {
    c.fillRect(x, -18, 4, 2);
    c.fillRect(x, -2, 4, 2);
  }
  for (let i = 0; i < 6; i++) {
    const wx = -half + 14 + (i * (TANK.w - 28)) / 5;
    ellipse(c, wx, -9, 7, 7, '#6d7367');
    ellipse(c, wx, -9, 2.5, 2.5, STEEL);
  }
  c.restore();

  // The periscope's head, or just its lens at the top of the turret.
  const blink = Math.sin(time * (rush ? 18 : 4)) > 0;
  const lens = rush ? (blink ? '#ff5a44' : '#7a2a20') : blink ? '#6fd3ff' : '#2a5a70';
  if (!down) {
    if (raised) fillRR(c, eye.x - S.dir * 4 - 9, eye.y - 7, 18, 14, 4, GREEN_DARK, C.ink, 2);
    ellipse(c, eye.x, eye.y, 4, 4, lens);
    glow(c, eye.x, eye.y, 10, '#6fd3ff', 0.35);
  }

  // Aiming: a red sight line and the muzzle heating up. It stops tracking you at TANK.lock, so the line shows the shot.
  if (S.aimT > 0 && !down) {
    const dx = S.gun * Math.cos(S.aim);
    const dy = -Math.sin(S.aim);
    const mx = S.x + dx * TANK.barrel;
    const my = y - TANK.pivot + dy * TANK.barrel;
    const heat = 1 - S.aimT / TANK.aim;
    const locked = S.aimT <= TANK.lock;
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = withAlpha('#ff3b30', locked ? 0.85 : 0.35 + heat * 0.3);
    c.lineWidth = locked ? 3 : 1.5;
    c.setLineDash(locked ? [] : [8, 8]);
    c.beginPath();
    c.moveTo(mx, my);
    c.lineTo(mx + dx * 700, my + dy * 700);
    c.stroke();
    glow(c, mx, my, 12 + heat * 26, '#ff7a3a', 0.4 + heat * 0.5);
    c.restore();
  }

  if (down) {
    // A bottle can't flip a tank. It sits there rattled and smoking, with the barrel hanging.
    for (let i = 0; i < 5; i++) {
      const k = (time * 0.7 + i / 5) % 1;
      ellipse(c, S.x - 16 + Math.sin(k * 7 + i) * 8, y - TANK.h - 6 - k * 50, 6 + k * 9, 6 + k * 9, withAlpha('#3a3a3a', 0.55 * (1 - k)));
    }
    for (let i = 0; i < 3; i++) text(c, '✶', S.x + Math.cos(time * 4 + i * 2.1) * 24, y - TANK.h - 18 + Math.sin(time * 4 + i * 2.1) * 6, 14, C.gold, 'center', 700);
    return;
  }
  if (rush) text(c, '!', S.x, y - TANK.h - 24, 24, C.red, 'center', 700);
  if (S.state === 'alarm') {
    const red = Math.sin(time * 14) > 0;
    const colour = red ? '#ff3b30' : '#3a7bff';
    const ly = y - TANK.h - 10;
    fillRR(c, S.x - 8 * S.gun - 6, ly - 4, 12, 8, 3, colour, C.ink, 1.5);
    c.save();
    c.globalCompositeOperation = 'lighter';
    glow(c, S.x, ly, 130, colour, 0.5);
    c.restore();
    text(c, red ? 'WEE-' : 'OOO!', S.x, ly - 24, 16, red ? '#ff6a60' : '#7aa8ff', 'center', 700);
  }
  if (S.state === 'slurp') text(c, 'CRUNCH', S.x, y - TANK.h - 22, 15, C.cream, 'center', 700);
}

export function drawShells(c: Ctx, shells: Shell[]) {
  for (const s of shells) {
    const a = Math.atan2(s.vy, s.vx);
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = withAlpha('#ffb45a', 0.7);
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(s.x, s.y);
    c.lineTo(s.x - s.vx * 0.06, s.y - s.vy * 0.06);
    c.stroke();
    c.restore();
    c.save();
    c.translate(s.x, s.y);
    c.rotate(a);
    fillRR(c, -7, -3.5, 13, 7, 3, '#d8c27a', C.ink, 1.5);
    c.restore();
  }
}

const FIREBALL = 0.55; // s

/** Fireballs go on top of everything, lighting included. */
export function drawBlasts(c: Ctx, blasts: Blast[]) {
  for (const b of blasts) {
    if (b.age >= FIREBALL) continue;
    const k = b.age / FIREBALL;
    const r = TANK.blast * (0.45 + 0.75 * (1 - (1 - k) ** 3));
    c.save();
    c.globalCompositeOperation = 'lighter';
    glow(c, b.x, b.y, r * 3, '#ff8a3a', 0.7 * (1 - k));
    c.restore();
    ellipse(c, b.x, b.y, r, r, withAlpha('#ff7a2a', 0.85 * (1 - k)));
    ellipse(c, b.x, b.y, r * 0.62, r * 0.62, withAlpha('#ffd76a', 0.95 * (1 - k)));
    for (let i = 0; i < 12; i++) {
      const a = hash(i + b.x) * 6.28;
      const d = r * (0.8 + 1.1 * k);
      ellipse(c, b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, 3, 3, withAlpha('#ffe9a8', 1 - k));
    }
    if (k < 0.7) text(c, 'BOOM!', b.x, b.y - r - 12, 22 + k * 8, C.gold, 'center', 800);
  }
}

export function drawScorches(c: Ctx, blasts: Blast[], x0: number, x1: number) {
  for (const b of blasts) {
    if (b.x < x0 - 60 || b.x > x1 + 60) continue;
    ellipse(c, b.x, b.y, 34, 22, 'rgba(10,8,8,0.28)');
    ellipse(c, b.x, b.y, 18, 12, 'rgba(10,8,8,0.35)');
  }
}

