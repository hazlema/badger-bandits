// The powerups' names, what they do, and their art: on the rack and in the P panel.

import type { Powerup } from '../sim/level';
import { C, ellipse, fillRR, type Ctx } from './paint';

export const POWERUP_INFO: Record<Powerup, { name: string; text: string }> = {
  tote: { name: 'Tote bag', text: 'Room for three more bottles.' },
  sneakers: { name: 'Sneakers', text: 'Run and climb faster while someone is onto you.' },
  shield: { name: 'Pot lid', text: 'Blocks one arrow, then needs 20 seconds.' },
};

export function drawPowerup(c: Ctx, kind: Powerup, x: number, y: number, s: number) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  if (kind === 'tote') tote(c);
  else if (kind === 'shield') {
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
