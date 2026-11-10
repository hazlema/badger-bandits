// Night 5: the duty-free on the Moon. Space through the dome, Earth in the sky, floating rocks and girders, the drone's
// pad, the airlock, and the security satellites.

import { NIGHT, WORLD_VIEW_W } from '../config';
import type { Sat } from '../sim/game';
import type { Level, Rect } from '../sim/level';
import { C, ellipse, fillRR, glow, hash, mix, text, withAlpha, type Ctx } from './paint';

const METAL = '#5a6070';
const DECK = '#3f4250';

/** Deep space with parallax stars, the Earth, the dome's ribs, the rim with the airlock, and the deck. */
export function moonBackdrop(c: Ctx, L: Level, x0: number, x1: number, camX: number, time: number, frac: number) {
  const dawn = Math.max(0, (frac - NIGHT.dawnLightFrom) / (1 - NIGHT.dawnLightFrom));
  const sky = c.createLinearGradient(0, 0, 0, L.floorY);
  sky.addColorStop(0, mix('#04050c', '#1a2148', dawn * 0.6));
  sky.addColorStop(1, mix('#140f2c', '#3a2f5a', dawn * 0.6));
  c.fillStyle = sky;
  c.fillRect(x0, 0, x1 - x0, L.floorY);

  // Stars on a slow parallax layer.
  const tile = WORLD_VIEW_W + 120;
  for (let i = 0; i < 170; i++) {
    const sx = hash(i * 7.13) * tile;
    const px = x0 - 40 + ((((sx - camX * 0.2) % tile) + tile) % tile);
    const py = 46 + hash(i * 3.71) * (L.floorY - 80);
    const tw = 0.45 + 0.55 * Math.abs(Math.sin(time * (0.6 + hash(i) * 1.8) + i));
    const r = hash(i * 1.9) < 0.12 ? 1.8 : 1;
    c.fillStyle = withAlpha(hash(i * 5.3) < 0.2 ? '#ffd9b0' : '#e8ecff', tw * (1 - dawn * 0.6));
    c.fillRect(px, py, r, r);
  }

  // The Earth, hanging over the store and drifting across slowly as you go.
  const ex = camX + 700 - camX * 0.06;
  const ey = 170;
  glow(c, ex, ey, 90, '#6fb6ff', 0.25);
  ellipse(c, ex, ey, 46, 46, '#2f6fc0');
  for (const [dx, dy, rx, ry] of [[-14, -12, 16, 11], [12, 8, 13, 16], [-20, 16, 8, 6], [22, -18, 7, 5]]) ellipse(c, ex + dx, ey + dy, rx, ry, '#4f9a5a');
  for (const [dx, dy, rx] of [[-4, -26, 18], [10, 22, 14], [-26, 2, 9]]) ellipse(c, ex + dx, ey + dy, rx, 3.5, withAlpha('#ffffff', 0.7));
  c.save();
  c.beginPath();
  c.arc(ex, ey, 46, 0, Math.PI * 2);
  c.clip();
  ellipse(c, ex - 30, ey + 8, 44, 50, withAlpha('#04050c', 0.55)); // night side
  c.restore();

  // The sun coming up over the rim at dawn, from the front of the store.
  if (dawn > 0) glow(c, L.width - 60, L.floorY - 40, 700 * dawn + 100, '#fff2d0', 0.35 * dawn);

  // The dome: faint glass ribs.
  c.strokeStyle = 'rgba(190,200,255,0.07)';
  c.lineWidth = 3;
  for (let x = Math.floor(x0 / 420) * 420; x < x1; x += 420) {
    c.beginPath();
    c.moveTo(x, L.ceilingY);
    c.quadraticCurveTo(x + 60, L.floorY * 0.6, x + 20, L.floorY);
    c.stroke();
  }

  // The dome's rim along the top, with the airlock your cousin waits in.
  fillRR(c, x0 - 10, -10, x1 - x0 + 20, L.ceilingY + 10, 0, '#2a2d38');
  c.fillStyle = '#4a4f5e';
  c.fillRect(x0 - 10, L.ceilingY - 6, x1 - x0 + 20, 6);
  for (let x = Math.floor(x0 / 40) * 40; x < x1; x += 40) ellipse(c, x, L.ceilingY - 18, 2, 2, '#6a7080');
  const h = L.hole!;
  const hx = h.x + h.w / 2;
  ellipse(c, hx, L.ceilingY - 2, 52, 22, '#1d2030');
  ellipse(c, hx, L.ceilingY - 2, 42, 16, '#05060d');
  c.strokeStyle = '#8a92a2';
  c.lineWidth = 4;
  c.beginPath();
  c.ellipse(hx, L.ceilingY - 2, 46, 19, 0, 0, Math.PI * 2);
  c.stroke();
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    ellipse(c, hx + Math.cos(a) * 46, L.ceilingY - 2 + Math.sin(a) * 19, 2.2, 2.2, '#c8ccd4');
  }
  const blink = Math.sin(time * 3) > 0;
  ellipse(c, hx + 58, L.ceilingY - 14, 4, 4, blink ? '#7dff9a' : '#2f6a40');
  text(c, 'AIRLOCK A', hx, L.ceilingY - 26, 10, '#c8ccd4', 'center', 700);

  // The deck: metal plates over the regolith, hazard stripes at the far airlock.
  c.fillStyle = DECK;
  c.fillRect(x0, L.floorY, x1 - x0, 44);
  c.fillStyle = '#5a5e6e';
  c.fillRect(x0, L.floorY, x1 - x0, 3);
  c.fillStyle = 'rgba(0,0,0,0.3)';
  for (let x = Math.floor(x0 / 80) * 80; x < x1; x += 80) c.fillRect(x, L.floorY + 3, 2, 41);
  for (let x = Math.floor(x0 / 80) * 80 + 6; x < x1; x += 80) {
    ellipse(c, x, L.floorY + 9, 1.5, 1.5, '#7a8090');
    ellipse(c, x + 66, L.floorY + 9, 1.5, 1.5, '#7a8090');
  }
}

/** Floating rocks (lumpy, cratered, a faint glow underneath where whatever holds them up hums) and girders. */
export function rocks(c: Ctx, L: Level, x0: number, x1: number, time: number) {
  L.units.forEach((u, i) => {
    if (u.bottom === undefined || u.x > x1 || u.x + u.w < x0) return;
    const cx = u.x + u.w / 2;
    if (L.struts?.includes(i)) {
      // A girder: a truss with a thruster at each end.
      for (const ex of [u.x - 4, u.x + u.w + 4]) {
        const f = 6 + Math.sin(time * 30 + ex) * 2;
        ellipse(c, ex, u.bottom + f / 2, 3, f, withAlpha('#8fd0ff', 0.7));
        glow(c, ex, u.bottom + 6, 16, '#8fd0ff', 0.25);
      }
      fillRR(c, u.x, u.top, u.w, u.bottom - u.top, 2, '#7d8592', C.ink, 2);
      c.strokeStyle = '#4a505c';
      c.lineWidth = 2;
      c.beginPath();
      for (let x = u.x + 4; x < u.x + u.w - 10; x += 16) {
        c.moveTo(x, u.bottom - 2);
        c.lineTo(x + 8, u.top + 3);
        c.lineTo(x + 16, u.bottom - 2);
      }
      c.stroke();
      fillRR(c, u.x - 2, u.top - 2, u.w + 4, 5, 2, '#b4bcc8', C.ink, 1.2);
      return;
    }
    glow(c, cx, u.bottom + 16, u.w * 0.55, '#9a7cff', 0.16 + 0.05 * Math.sin(time * 2 + i));
    c.beginPath();
    c.moveTo(u.x, u.top + 2);
    const n = 9;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const depth = (u.bottom - u.top + 12) * Math.sin(Math.PI * t) ** 0.7 * (0.7 + 0.4 * hash(k + i * 13));
      c.lineTo(u.x + u.w * t, u.top + 3 + depth);
    }
    c.lineTo(u.x + u.w, u.top + 2);
    c.closePath();
    c.fillStyle = '#5f5b6c';
    c.fill();
    c.strokeStyle = C.ink;
    c.lineWidth = 2;
    c.stroke();
    for (let k = 0; k < Math.floor(u.w / 50); k++) {
      const kx = u.x + 18 + hash(i * 5 + k) * (u.w - 36);
      ellipse(c, kx, u.top + 12 + hash(k * 3 + i) * 10, 6 + hash(k + i) * 4, 3, '#4a4656');
    }
    fillRR(c, u.x - 2, u.top - 2, u.w + 4, 7, 3, '#a19cb0', C.ink, 1.5);
  });
}

/** The drone's charging pad by the airlock. */
export function dronePad(c: Ctx, L: Level, time: number, taken: boolean) {
  const pu = L.powerup;
  if (!pu?.on) return;
  const b = L.boards.find((d) => d.unit < 0 && d.y === pu.on);
  if (!b) return;
  const f = 5 + Math.sin(time * 28) * 2;
  for (const ex of [b.x1 + 8, b.x2 - 8]) ellipse(c, ex, b.y + 14 + f / 2, 3, f, withAlpha('#8fd0ff', 0.7));
  fillRR(c, b.x1, b.y, b.x2 - b.x1, 12, 4, '#7d8592', C.ink, 2);
  fillRR(c, b.x1 + 8, b.y - 2, b.x2 - b.x1 - 16, 4, 2, taken ? '#3a4050' : '#7dff9a');
  if (!taken) glow(c, (b.x1 + b.x2) / 2, b.y - 4, 40, '#7dff9a', 0.25 + 0.1 * Math.sin(time * 4));
  text(c, 'DRONE', (b.x1 + b.x2) / 2, b.y + 22, 9, '#c8ccd4', 'center', 700);
}

/** The duty-free till, with a neon sign. The far door is the visitors' airlock. */
export function dutyFree(c: Ctx, k: Rect, door: Rect | undefined, time: number) {
  fillRR(c, k.x, k.y, k.w, k.h, 6, '#2d2f3d', C.ink, 2.5);
  fillRR(c, k.x - 6, k.y - 6, k.w + 12, 10, 3, '#4a4f5e', C.ink, 2);
  const on = Math.sin(time * 1.3) > -0.9;
  fillRR(c, k.x + 10, k.y + 20, k.w - 20, 4, 2, on ? '#c58bff' : '#5a3a7a');
  text(c, 'DUTY FREE · LUNA', k.x + k.w / 2, k.y + 48, 15, on ? '#e2c8ff' : '#7a6a8a', 'center', 700);
  if (on) glow(c, k.x + k.w / 2, k.y + 44, 120, '#c58bff', 0.15);
  if (!door) return;
  fillRR(c, door.x - 6, door.y - 8, door.w + 12, door.h + 8, 14, '#4a4f5e', C.ink, 2);
  fillRR(c, door.x, door.y, door.w, door.h, 10, '#2a2d38', C.ink, 2);
  for (let y = door.y + 14; y < door.y + door.h - 8; y += 16) {
    c.fillStyle = 'rgba(255,214,90,0.6)';
    c.fillRect(door.x + 6, y, door.w - 12, 5);
  }
  text(c, 'AIRLOCK B', door.x + door.w / 2, door.y - 16, 10, '#c8ccd4', 'center', 700);
}

/** A security satellite: solar panels, a dish, and the searchlight housing underneath. */
export function drawSat(c: Ctx, s: Sat, time: number) {
  c.save();
  c.translate(s.x, s.y);
  if (s.state === 'down') c.rotate(Math.sin(time * 3) * 0.6);
  for (const sx of [-1, 1]) {
    fillRR(c, sx * 18 - (sx < 0 ? 22 : 0), -8, 22, 14, 2, s.state === 'down' ? '#1d2840' : '#2f4a8a', C.ink, 1.5);
    c.strokeStyle = 'rgba(160,200,255,0.4)';
    c.lineWidth = 1;
    c.beginPath();
    for (let k = 1; k < 3; k++) {
      c.moveTo(sx * 18 - (sx < 0 ? 22 : 0) + k * 7, -8);
      c.lineTo(sx * 18 - (sx < 0 ? 22 : 0) + k * 7, 6);
    }
    c.stroke();
  }
  fillRR(c, -12, -11, 24, 20, 5, '#d8dce4', C.ink, 2);
  c.strokeStyle = C.ink;
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(4, -11);
  c.lineTo(9, -20);
  c.stroke();
  ellipse(c, 10, -21, 5, 2.5, '#c8ccd4', -0.4);
  fillRR(c, -6, 8, 12, 6, 2, METAL, C.ink, 1.2);
  const alarm = s.state === 'alarm';
  const red = Math.sin(time * 14) > 0;
  ellipse(c, 0, -1, 3.5, 3.5, alarm ? (red ? '#ff3b30' : '#3a7bff') : s.state === 'down' ? '#3a2a2a' : '#ffd25a');
  c.restore();
  if (alarm) text(c, red ? 'WEE-' : 'OOO!', s.x, s.y - 30, 15, red ? '#ff6a60' : '#7aa8ff', 'center', 700);
  if (s.state === 'down') for (let i = 0; i < 3; i++) text(c, '✶', s.x + Math.cos(time * 4 + i * 2.1) * 20, s.y - 20 + Math.sin(time * 4 + i * 2.1) * 6, 12, C.gold, 'center', 700);
}
