// The powerups' names, what they do, and their art: on the rack and in the P panel.

import type { Powerup } from '../sim/level';
import { C, ellipse, fillRR, type Ctx } from './paint';

export const POWERUP_INFO: Record<Powerup, { name: string; text: string }> = {
  tote: { name: 'Tote bag', text: 'Room for three more bottles.' },
  sneakers: { name: 'Sneakers', text: 'Run and climb faster while someone is onto you.' },
  shield: { name: 'Pot lid', text: 'Blocks one arrow, then needs 20 seconds.' },
  candy: { name: 'Cotton candy', text: 'Sticky paws: hiccups and hits never make you drop a bottle.' },
  drone: { name: 'Drone', text: 'When your paws are full, it flies the lot up to your cousin by itself.' },
};

export function drawPowerup(c: Ctx, kind: Powerup, x: number, y: number, s: number) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  if (kind === 'tote') tote(c);
  else if (kind === 'drone') drawDrone(c, 0, 0, 0, false);
  else if (kind === 'candy') {
    c.fillStyle = '#e8d6b0';
    c.beginPath();
    c.moveTo(-5, 2);
    c.lineTo(5, 2);
    c.lineTo(0, 18);
    c.closePath();
    c.fill();
    c.strokeStyle = C.ink;
    c.lineWidth = 1.5;
    c.stroke();
    for (const [x, y, r] of [[-7, -4, 8], [6, -5, 8], [0, -11, 9], [0, -2, 9]] as const) ellipse(c, x, y, r, r, '#ff9ccf');
    ellipse(c, -3, -10, 4, 3, '#ffd3ea');
  } else if (kind === 'shield') {
    ellipse(c, 0, 0, 16, 16, '#aeb6bc');
    ellipse(c, -3, -4, 9, 8, '#d4dade');
    c.strokeStyle = C.ink;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, 0, 16, 0, Math.PI * 2);
    c.stroke();
    fillRR(c, -7, -3, 14, 6, 3, '#4a2a1a', C.ink, 1.5);
  } else {
    // Tied together by the laces, hanging as a pair.
    c.strokeStyle = '#f4efe4';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(-9, -6);
    c.quadraticCurveTo(0, -20, 9, -4);
    c.stroke();
    shoe(c, -9, 3, 0.75);
    shoe(c, 8, 7, 0.75);
  }
  c.restore();
}

function tote(c: Ctx) {
  c.strokeStyle = '#c8b68e';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(0, -10, 8, Math.PI, 0);
  c.stroke();
  fillRR(c, -13, -10, 26, 24, 4, '#e8dcbc', '#8a7a58', 2);
  ellipse(c, 0, 3, 4, 3.5, '#6a6670');
  for (const [a, b] of [[-4, -3], [0, -5], [4, -3]]) ellipse(c, a, b, 1.6, 1.6, '#6a6670');
}

function shoe(c: Ctx, x: number, y: number, s: number) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  fillRR(c, -11, -9, 13, 14, 4, '#e8463a', C.ink, 1.6);
  fillRR(c, -4, -3, 16, 8, 4, '#e8463a', C.ink, 1.6);
  fillRR(c, -12, 4, 25, 4.5, 2, '#f4efe4', C.ink, 1.4);
  c.fillStyle = '#f4efe4';
  for (let i = 0; i < 3; i++) c.fillRect(-3 + i * 4, -3, 2, 3);
  c.restore();
}

/** A little quadcopter with a basket slung under it. `spin` turns the rotors; `lit` blinks its light while it flies. */
export function drawDrone(c: Ctx, x: number, y: number, spin: number, lit: boolean) {
  c.save();
  c.translate(x, y);
  c.strokeStyle = C.ink;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-14, -6);
  c.lineTo(14, -6);
  c.stroke();
  for (const sx of [-14, 14]) {
    fillRR(c, sx - 2, -10, 4, 5, 1, '#5a6070');
    const w = 9 * Math.abs(Math.cos(spin + sx));
    ellipse(c, sx, -11, Math.max(2, w), 1.6, 'rgba(220,230,240,0.85)');
  }
  fillRR(c, -9, -9, 18, 9, 4, '#e8eaee', C.ink, 1.5);
  ellipse(c, 0, -5, 3, 2.4, lit ? '#7dff9a' : '#2f6a40');
  // the basket
  c.strokeStyle = '#8a7a58';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(-6, 0);
  c.lineTo(-8, 6);
  c.moveTo(6, 0);
  c.lineTo(8, 6);
  c.stroke();
  fillRR(c, -10, 6, 20, 9, 3, '#c8b68e', '#6a5a38', 1.5);
  c.restore();
}
