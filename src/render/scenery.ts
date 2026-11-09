// Set dressing: the tutorial's roof and crawlspace, wooden signs, chalkboards and floor props.
// Nothing here touches the sim. Variation comes from hash(), never random, so nothing shimmers.

import type { Level, Poster, Prop, Rect, Sign } from '../sim/level';
import { C, ellipse, fillRR, FONT, glow, hash, rr, text, withAlpha, woodBoards, type Ctx } from './paint';

/* -------------------------------------------------------------- signs */

function chain(c: Ctx, x: number, y1: number, y2: number) {
  c.strokeStyle = '#8d8574';
  c.lineWidth = 1.4;
  for (let y = y1, i = 0; y < y2; y += 8, i++) {
    c.beginPath();
    c.ellipse(x, y + 4, i % 2 ? 1.2 : 2.6, 4.4, 0, 0, Math.PI * 2);
    c.stroke();
  }
}

/** A wooden sign: on a post down to whatever is under it, or chained to the ceiling if `hang` is set. */
export function woodSign(c: Ctx, s: Sign, L: Level) {
  c.font = `600 15px ${FONT}`;
  const w = c.measureText(s.text).width + 30;
  const x = s.x - w / 2;
  const top = s.y - 16;
  const bottom = s.y + 18;
  if (s.hang) {
    for (const cx of [x + 16, x + w - 16]) chain(c, cx, L.ceilingY, top);
  } else {
    const ground = Math.min(...L.solids.filter((r) => s.x >= r.x && s.x <= r.x + r.w && r.y >= bottom).map((r) => r.y));
    ellipse(c, s.x + 5, ground, 22, 3.5, 'rgba(0,0,0,0.35)');
    fillRR(c, s.x - 4, bottom - 2, 8, ground - bottom + 2, 1, '#5a3b26', '#2a170c', 1.5);
    c.fillStyle = withAlpha('#c49a6c', 0.25);
    c.fillRect(s.x - 3, bottom, 2, ground - bottom - 4);
    fillRR(c, s.x - 13, ground - 5, 26, 5, 1.5, '#4a2f1e', '#2a170c', 1.5);
  }
  woodBoards(c, x, top, w, 34, 5, 17);
  rr(c, x, top, w, 34, 5);
  c.strokeStyle = '#2a170c';
  c.lineWidth = 2.5;
  c.stroke();
  for (const nx of [x + 7, x + w - 7]) ellipse(c, nx, s.y + 1, 1.8, 1.8, '#d9c7a3');
  c.font = `600 15px ${FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = 3.5;
  c.strokeStyle = 'rgba(30,15,8,0.8)';
  c.strokeText(s.text, s.x, s.y + 1);
  text(c, s.text, s.x, s.y + 1, 15, C.cream, 'center');
}

/** A chalkboard in a wood frame, hung from the ceiling on two chains. */
export function chalkboard(c: Ctx, p: Poster, ceilingY: number, line: (s: string) => string) {
  const h = 58 + p.lines.length * 24;
  const x = p.x - p.w / 2;
  for (const cx of [x + 36, x + p.w - 36]) {
    fillRR(c, cx - 7, ceilingY, 14, 4, 1, '#5c5648', '#2a2620', 1);
    chain(c, cx, ceilingY + 4, p.y);
  }
  fillRR(c, x + 5, p.y + 8, p.w, h, 8, 'rgba(10,5,2,0.3)');
  fillRR(c, x, p.y, p.w, h, 7, C.wood, '#2a170c', 2.5);
  rr(c, x + 3, p.y + 3, p.w - 6, h - 6, 5);
  c.strokeStyle = 'rgba(255,220,170,0.22)';
  c.lineWidth = 1.2;
  c.stroke();
  fillRR(c, x + 9, p.y + 9, p.w - 18, h - 18, 3, '#28322d', '#161d19', 2);
  // Old chalk that never quite wiped off.
  for (let i = 0; i < 9; i++) {
    const n = hash(i * 13 + p.x);
    ellipse(c, x + 26 + n * (p.w - 52), p.y + 16 + hash(i * 7 + p.x) * (h - 32), 26 + n * 34, 7 + n * 9, withAlpha(C.cream, 0.035), n * 0.7 - 0.35);
  }
  for (const [nx, ny] of [[x + 4.5, p.y + 4.5], [x + p.w - 4.5, p.y + 4.5], [x + 4.5, p.y + h - 4.5], [x + p.w - 4.5, p.y + h - 4.5]]) ellipse(c, nx, ny, 1.5, 1.5, '#d9c7a3');
  // The ledge, with a couple of sticks of chalk on it.
  fillRR(c, x + 14, p.y + h - 4, p.w - 28, 7, 2, C.woodLight, '#2a170c', 1.5);
  fillRR(c, x + p.w - 62, p.y + h - 7, 18, 4, 1.5, C.cream);
  fillRR(c, x + p.w - 38, p.y + h - 7, 12, 4, 1.5, '#e2b56a');

  text(c, p.title, p.x, p.y + 25, 21, C.gold, 'center', 700);
  c.strokeStyle = withAlpha(C.gold, 0.45);
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(p.x - 54, p.y + 40);
  c.quadraticCurveTo(p.x, p.y + 37, p.x + 54, p.y + 40);
  c.stroke();
  p.lines.forEach((s, i) => text(c, line(s), p.x, p.y + 54 + i * 24, 15, C.cream, 'center', 500));
}

/* --------------------------------------------------------- the roof */

/** Night sky, moon, the far treeline and the town, all behind the roof and moving slower than it. */
export function roofBackdrop(c: Ctx, x0: number, viewW: number, time: number) {
  const sky = c.createLinearGradient(0, 0, 0, 540);
  sky.addColorStop(0, '#141a33');
  sky.addColorStop(1, '#3a3157');
  c.fillStyle = sky;
  c.fillRect(x0 - 20, 0, viewW + 40, 540);
  for (let i = 0; i < 90; i++) {
    const sx = x0 * 0.9 + hash(i) * 1700 - 100;
    const tw = 0.5 + 0.5 * Math.sin(time * 2 + i);
    ellipse(c, sx, hash(i + 99) * 260, 1.2, 1.2, withAlpha(C.cream, 0.3 + 0.5 * tw));
  }
  const mx = x0 * 0.8 + 760;
  glow(c, mx, 90, 110, '#fff3c4', 0.28);
  ellipse(c, mx, 90, 30, 30, '#fbf1cf');
  for (const [dx, dy, r] of [[-9, -7, 6], [8, 4, 8], [-4, 13, 4], [13, -12, 3]]) ellipse(c, mx + dx, 90 + dy, r, r, 'rgba(190,175,140,0.35)');
  for (let i = 0; i < 4; i++) {
    const cx = x0 * 0.92 + ((hash(i + 40) * 1500 + time * (3 + i)) % 1500) - 200;
    const cy = 60 + hash(i + 50) * 130;
    for (const [dx, dy, rx, ry] of [[0, 0, 90, 12], [-46, 6, 60, 8], [50, 5, 66, 9]]) ellipse(c, cx + dx, cy + dy, rx, ry, 'rgba(138,134,184,0.1)');
  }

  c.fillStyle = '#1c1936';
  c.beginPath();
  c.moveTo(x0 - 40, 470);
  for (let i = -2; i < 46; i++) {
    const tx = x0 * 0.8 + i * 48 - 100;
    c.quadraticCurveTo(tx + 24, 356 - hash(i + 200) * 46, tx + 48, 392 - hash(i + 240) * 20);
  }
  c.lineTo(x0 + viewW + 40, 470);
  c.closePath();
  c.fill();

  // Ashland at night: houses and the church steeple.
  for (let i = 0; i < 14; i++) {
    const hx = x0 * 0.6 + i * 130 - 120;
    const hh = 70 + hash(i * 7) * 60;
    const wall = hash(i * 11) > 0.5 ? '#2a2440' : '#242039';
    c.fillStyle = wall;
    c.fillRect(hx, 440 - hh, 110, hh);
    if (hash(i * 17) > 0.45) {
      c.fillStyle = '#1e1a33';
      c.fillRect(hx + 78, 440 - hh - 38, 14, 34);
    }
    c.fillStyle = '#1e1a33';
    c.beginPath();
    c.moveTo(hx - 6, 440 - hh);
    c.lineTo(hx + 55, 440 - hh - 36);
    c.lineTo(hx + 116, 440 - hh);
    c.fill();
    c.strokeStyle = 'rgba(244,231,204,0.13)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(hx + 55, 440 - hh - 36);
    c.lineTo(hx + 116, 440 - hh);
    c.stroke();
    for (const wx of [hx + 18, hx + 66]) {
      if (hash(wx * 0 + i * 3 + (wx > hx + 30 ? 21 : 0)) <= 0.4) continue;
      fillRR(c, wx, 440 - hh + 18, 18, 22, 2, withAlpha(C.warm, 0.55));
      c.fillStyle = '#2a2440';
      c.fillRect(wx + 8, 440 - hh + 18, 2, 22);
      c.fillRect(wx, 440 - hh + 28, 18, 2);
    }
  }
  const st = x0 * 0.6 + 640;
  c.fillStyle = '#231f3a';
  c.fillRect(st, 190, 30, 250);
  c.beginPath();
  c.moveTo(st - 4, 190);
  c.lineTo(st + 15, 120);
  c.lineTo(st + 34, 190);
  c.fill();
  c.fillRect(st + 14, 100, 2.5, 22);
  c.fillRect(st + 9, 106, 12, 2.5);
  fillRR(c, st + 9, 214, 12, 24, 6, withAlpha(C.warm, 0.4));
  ellipse(c, st + 15, 262, 8, 8, withAlpha(C.cream, 0.32));

  // Power lines, nearer than the town.
  c.strokeStyle = '#15132a';
  const poleX = (i: number) => x0 * 0.3 + i * 430 - 80;
  for (let i = 0; i < 6; i++) {
    const px = poleX(i);
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(px, 460);
    c.lineTo(px, 208);
    c.moveTo(px - 26, 222);
    c.lineTo(px + 26, 222);
    c.stroke();
    if (i === 5) continue;
    c.lineWidth = 1.3;
    for (const dx of [-22, 22]) {
      c.beginPath();
      c.moveTo(px + dx, 222);
      c.quadraticCurveTo(px + 215 + dx, 262, poleX(i + 1) + dx, 222);
      c.stroke();
    }
  }
}

function brickWall(c: Ctx, x: number, y: number, w: number, h: number, v0: number, v1: number) {
  const sx = Math.max(x, v0);
  const ex = Math.min(x + w, v1);
  if (ex <= sx) return;
  const bw = 44;
  const bh = 16;
  c.save();
  c.beginPath();
  c.rect(sx, y, ex - sx, h);
  c.clip();
  c.fillStyle = '#241b26';
  c.fillRect(sx, y, ex - sx, h);
  for (let row = 0; row * bh < h; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let i = Math.floor((sx - x - off) / bw); x + off + i * bw < ex; i++) {
      const n = hash(i * 31 + row * 977);
      c.fillStyle = n < 0.3 ? '#47303a' : n < 0.75 ? '#3f2b35' : '#37262f';
      c.fillRect(x + off + i * bw + 1, y + row * bh + 1, bw - 2, bh - 2);
    }
  }
  c.restore();
}

/** One building seen from the side: a brick face with a stone cap along the top. */
export function building(c: Ctx, s: Rect, v0: number, v1: number) {
  brickWall(c, s.x, s.y + 8, s.w, s.h - 8, v0, v1);
  const under = c.createLinearGradient(0, s.y + 10, 0, s.y + 30);
  under.addColorStop(0, 'rgba(10,6,14,0.5)');
  under.addColorStop(1, 'rgba(10,6,14,0)');
  c.fillStyle = under;
  c.fillRect(s.x, s.y + 10, s.w, 20);
  c.fillStyle = '#5a5262';
  c.fillRect(s.x, s.y, s.w, 11);
  c.fillStyle = '#8b84a0';
  c.fillRect(s.x, s.y, s.w, 2.5);
  c.fillStyle = '#3b3442';
  c.fillRect(s.x, s.y + 9, s.w, 2);
  c.fillStyle = 'rgba(30,24,36,0.7)';
  for (let x = Math.ceil(Math.max(s.x, v0) / 72) * 72; x < Math.min(s.x + s.w, v1); x += 72) c.fillRect(x, s.y + 2, 1.5, 8);
}

/** Everything that sits on the two roofs. The raccoon can't touch any of it. */
export function roofDressing(c: Ctx, time: number) {
  // Where the low roof meets the taller building.
  const corner = c.createLinearGradient(640, 0, 700, 0);
  corner.addColorStop(0, 'rgba(10,6,14,0)');
  corner.addColorStop(1, 'rgba(10,6,14,0.55)');
  c.fillStyle = corner;
  c.fillRect(640, 451, 60, 89);
  c.fillStyle = 'rgba(10,6,14,0.7)';
  c.fillRect(698, 271, 3, 269);

  // A ghost sign painted on the brick, under a gooseneck lamp.
  glow(c, 1090, 350, 230, C.warm, 0.13);
  text(c, 'ASHLAND', 1090, 344, 54, withAlpha(C.cream, 0.16), 'center', 700);
  text(c, 'WINE & SPIRITS', 1090, 394, 26, withAlpha(C.cream, 0.13), 'center', 600);
  c.strokeStyle = withAlpha(C.cream, 0.08);
  c.lineWidth = 3;
  c.strokeRect(910, 306, 360, 112);
  c.strokeStyle = '#1c1820';
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(1090, 271);
  c.quadraticCurveTo(1090, 290, 1090, 296);
  c.stroke();
  c.fillStyle = '#2c2730';
  c.beginPath();
  c.moveTo(1076, 306);
  c.lineTo(1104, 306);
  c.lineTo(1095, 294);
  c.lineTo(1085, 294);
  c.closePath();
  c.fill();
  ellipse(c, 1090, 306, 8, 3, '#ffe9b0');

  // Skylight: the store's own light coming up.
  fillRR(c, 830, 248, 96, 13, 2, '#4d4656', '#26212c', 1.5);
  c.beginPath();
  c.moveTo(838, 248);
  c.quadraticCurveTo(878, 206, 918, 248);
  c.closePath();
  c.fillStyle = withAlpha(C.warm, 0.42);
  c.fill();
  c.strokeStyle = '#26212c';
  c.lineWidth = 2;
  c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.3)';
  c.beginPath();
  c.moveTo(852, 240);
  c.quadraticCurveTo(866, 224, 884, 221);
  c.stroke();
  glow(c, 878, 228, 70, C.warm, 0.16);

  // Mushroom vent, breathing.
  fillRR(c, 981, 232, 12, 29, 1, '#6c6776', '#26212c', 1.5);
  ellipse(c, 987, 231, 18, 8, '#7d7888');
  ellipse(c, 987, 228, 15, 4, '#99939f');
  for (let i = 0; i < 3; i++) {
    const k = (time * 0.35 + i / 3) % 1;
    ellipse(c, 987 + Math.sin(k * 5 + i) * 6, 224 - k * 44, 5 + k * 9, 4 + k * 7, withAlpha('#d6d3e2', 0.14 * (1 - k)));
  }

  // Pipes and the dish.
  for (const [px, ph] of [[1296, 40], [1314, 26]]) {
    fillRR(c, px, 260 - ph, 9, ph + 1, 1, '#67616f', '#26212c', 1.5);
    fillRR(c, px - 2, 260 - ph - 3, 13, 5, 1.5, '#8a8494', '#26212c', 1.2);
  }
  c.strokeStyle = '#26212c';
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(1410, 261);
  c.lineTo(1410, 226);
  c.stroke();
  c.beginPath();
  c.ellipse(1402, 212, 24, 12, -0.7, 0, Math.PI);
  c.closePath();
  c.fillStyle = '#a8a4b4';
  c.fill();
  c.lineWidth = 1.5;
  c.stroke();

  // Two pigeons asleep on the cap, more or less.
  for (const [px, off] of [[1346, 0], [1368, 2]]) {
    const nod = Math.max(0, Math.sin(time * 0.8 + off)) * 2.5;
    ellipse(c, px, 252, 10, 7, '#59586f');
    ellipse(c, px + 7, 245 + nod, 4.5, 4.5, '#6c6b84');
    ellipse(c, px + 8.5, 244.5 + nod, 0.9, 0.9, '#120d14');
    c.fillStyle = '#c9a96a';
    c.beginPath();
    c.moveTo(px + 11, 245 + nod);
    c.lineTo(px + 15, 246 + nod);
    c.lineTo(px + 11, 247 + nod);
    c.fill();
    ellipse(c, px - 9, 254, 6, 3, '#47465c', 0.3);
  }

  // The staff's smoke-break spot.
  c.strokeStyle = '#7b8088';
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(216, 439);
  c.lineTo(250, 412);
  c.moveTo(254, 439);
  c.lineTo(222, 412);
  c.moveTo(218, 412);
  c.lineTo(262, 412);
  c.moveTo(254, 412);
  c.lineTo(270, 376);
  c.stroke();
  c.strokeStyle = '#3f6b63';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(220, 411);
  c.lineTo(254, 411);
  for (let i = 0; i < 4; i++) {
    c.moveTo(256 + i * 3.4, 406 - i * 8);
    c.lineTo(268 + i * 3.4 - 12, 406 - i * 8 + 0);
  }
  c.stroke();
  fillRR(c, 276, 410, 38, 30, 2, '#39577a', '#1c2a3c', 1.5);
  c.fillStyle = '#1c2a3c';
  for (let i = 0; i < 4; i++) c.fillRect(281 + i * 8, 415, 4, 20);
  for (const [cx, tip] of [[202, 0], [296, 0], [318, 1]]) {
    if (tip) fillRR(c, cx - 6, 435, 13, 5, 1.5, '#9a3d3d', '#3a1418', 1);
    else if (cx === 296) fillRR(c, cx - 3, 400, 7, 11, 1, '#9a3d3d', '#3a1418', 1);
    else fillRR(c, cx - 3, 429, 7, 11, 1, '#b08a3c', '#3a2a10', 1);
  }

  // A low pipe by the trellis.
  c.strokeStyle = '#26212c';
  c.lineWidth = 11;
  c.beginPath();
  c.moveTo(574, 441);
  c.lineTo(574, 420);
  c.quadraticCurveTo(574, 410, 590, 410);
  c.stroke();
  c.strokeStyle = '#6c6776';
  c.lineWidth = 7.5;
  c.stroke();
}

export function acUnit(c: Ctx, r: Rect, time: number) {
  ellipse(c, r.x + r.w / 2, r.y + r.h + 1, r.w / 2 + 8, 4, 'rgba(0,0,0,0.4)');
  c.fillStyle = '#4a4f57';
  c.fillRect(r.x + 8, r.y + r.h - 4, 12, 5);
  c.fillRect(r.x + r.w - 20, r.y + r.h - 4, 12, 5);
  fillRR(c, r.x, r.y, r.w, r.h - 3, 4, '#9aa1a8', '#22202a', 2);
  fillRR(c, r.x - 2, r.y - 3, r.w + 4, 9, 2, '#b4bac1', '#22202a', 2);
  c.fillStyle = '#6f777f';
  for (let i = 0; i < 6; i++) c.fillRect(r.x + 8, r.y + 12 + i * 6, 28, 2.5);
  const fx = r.x + r.w - 25;
  const fy = r.y + r.h / 2 + 1;
  ellipse(c, fx, fy, 19, 19, '#22242c');
  c.fillStyle = '#7d858d';
  for (let i = 0; i < 3; i++) {
    const a = time * 16 + (i * Math.PI * 2) / 3;
    ellipse(c, fx + Math.cos(a) * 9, fy + Math.sin(a) * 9, 9, 3.5, '#7d858d', a);
  }
  ellipse(c, fx, fy, 3.5, 3.5, '#b4bac1');
  c.strokeStyle = 'rgba(200,205,215,0.4)';
  c.lineWidth = 1;
  for (const rr2 of [7, 13, 19]) {
    c.beginPath();
    c.arc(fx, fy, rr2, 0, Math.PI * 2);
    c.stroke();
  }
  c.fillStyle = 'rgba(120,70,40,0.35)';
  c.fillRect(r.x + 40, r.y + r.h - 16, 3, 13);
}

export function trellis(c: Ctx, t: Rect) {
  c.strokeStyle = '#8c6a46';
  c.lineWidth = 3;
  for (let i = 0; i <= 3; i++) {
    c.beginPath();
    c.moveTo(t.x + (i * t.w) / 3, t.y);
    c.lineTo(t.x + (i * t.w) / 3, t.y + t.h);
    c.stroke();
  }
  for (let y = t.y; y < t.y + t.h; y += 22) {
    c.beginPath();
    c.moveTo(t.x, y);
    c.lineTo(t.x + t.w, y + 11);
    c.stroke();
  }
  for (let i = 0; i < 58; i++) ellipse(c, t.x + hash(i) * t.w, t.y + t.h * 0.04 + hash(i + 5) * t.h * (0.3 + 0.55 * hash(i + 11)), 7, 4, ['#4f7d45', '#3c6838', '#5e8e50'][i % 3], hash(i + 2) * 3);
  fillRR(c, t.x - 4, t.y - 4, t.w + 8, 8, 3, '#8c6a46', '#3a2a1a', 1.5);
  fillRR(c, t.x - 8, t.y + t.h - 16, t.w + 16, 17, 2, '#6e4127', '#2a170c', 2);
  c.fillStyle = '#2b1a12';
  c.fillRect(t.x - 5, t.y + t.h - 14, t.w + 10, 3);
}

export function roofVent(c: Ctx, v: Rect) {
  fillRR(c, v.x - 7, v.y + v.h - 5, v.w + 14, 6, 1.5, '#6c6776', '#22202a', 1.5);
  fillRR(c, v.x, v.y, v.w, v.h - 3, 3, '#a7adb4', '#22202a', 2);
  for (let i = 0; i < 4; i++) {
    c.fillStyle = '#5f666d';
    c.fillRect(v.x + 8 + i * 15, v.y + 5, 9, v.h - 12);
    c.fillStyle = withAlpha(C.warm, 0.35);
    c.fillRect(v.x + 8 + i * 15, v.y + v.h - 10, 9, 3);
  }
  for (const [sx, sy] of [[v.x + 3.5, v.y + 3.5], [v.x + v.w - 3.5, v.y + 3.5]]) ellipse(c, sx, sy, 1.5, 1.5, '#3a3a44');
}

/* ------------------------------------------------------ the crawlspace */

/** The cutaway above the crawlspace: roof deck, trusses, ductwork, insulation. */
export function crawlAttic(c: Ctx, L: Level) {
  const w = L.width;
  c.fillStyle = '#17110f';
  c.fillRect(-20, 0, w + 40, L.ceilingY);
  // Insulation lying on the ceiling joists.
  for (let x = -10, i = 0; x < w + 20; x += 21, i++) ellipse(c, x + hash(i) * 8, 208 + hash(i + 3) * 12, 21, 19, ['#6a4750', '#5f3f48', '#745059'][i % 3]);
  // Trusses.
  c.lineCap = 'butt';
  for (let k = 0; k * 200 <= w + 200; k++) {
    const bx = k * 200;
    for (const [col, lw, nudge] of [['#35261e', 11, 0], ['#54402f', 2, -4]] as const) {
      c.strokeStyle = col;
      c.lineWidth = lw;
      c.beginPath();
      c.moveTo(bx + nudge, 30);
      c.lineTo(bx + nudge, 236);
      c.moveTo(bx + nudge, 236);
      c.lineTo(bx + (k % 2 ? 200 : -200) * 0.5 + nudge, 30);
      c.stroke();
    }
  }
  // The duct.
  fillRR(c, -20, 108, w + 40, 50, 2, '#565b65', '#23252c', 2);
  c.fillStyle = 'rgba(255,255,255,0.13)';
  c.fillRect(-20, 112, w + 40, 7);
  c.fillStyle = 'rgba(0,0,0,0.28)';
  c.fillRect(-20, 146, w + 40, 12);
  for (let x = 60; x < w; x += 140) {
    c.fillStyle = '#3c4048';
    c.fillRect(x, 108, 5, 50);
    c.fillStyle = '#2c2f36';
    c.fillRect(x + 1, 30, 2, 78);
    for (const y of [116, 150]) ellipse(c, x + 2.5, y, 1.4, 1.4, '#a8adb6');
  }
  // Roof deck.
  c.fillStyle = '#2b201c';
  c.fillRect(-20, 0, w + 40, 26);
  c.fillStyle = '#120d0c';
  c.fillRect(-20, 26, w + 40, 5);
  c.fillStyle = 'rgba(0,0,0,0.3)';
  for (let x = 0; x < w; x += 96) c.fillRect(x + (x % 192 ? 20 : 0), 0, 2, 26);
  // Recede, so the eye stays on the crawlspace.
  const fade = c.createLinearGradient(0, 0, 0, L.ceilingY);
  fade.addColorStop(0, 'rgba(12,8,10,0.62)');
  fade.addColorStop(1, 'rgba(12,8,10,0.34)');
  c.fillStyle = fade;
  c.fillRect(-20, 0, w + 40, L.ceilingY);
  // The vent you came in by, and the moonlight through it.
  c.fillStyle = '#2a3460';
  c.fillRect(36, 0, 76, 29);
  ellipse(c, 92, 12, 8, 8, withAlpha('#fbf1cf', 0.7));
  c.fillStyle = 'rgba(160,172,235,0.07)';
  c.beginPath();
  c.moveTo(36, 29);
  c.lineTo(112, 29);
  c.lineTo(170, L.floorY);
  c.lineTo(10, L.floorY);
  c.closePath();
  c.fill();
  // The beam the crawlspace hangs from.
  c.fillStyle = '#2b201c';
  c.fillRect(-20, L.ceilingY - 14, w + 40, 14);
  c.fillStyle = '#4a3830';
  c.fillRect(-20, L.ceilingY - 14, w + 40, 2);
}

/** The strip you actually crawl along. */
export function crawlTunnel(c: Ctx, L: Level, wires: Rect, time: number) {
  const top = L.ceilingY;
  const h = L.floorY - top;
  for (let x = 0, i = 0; x < L.width; x += 46, i++) {
    c.fillStyle = ['#3b2c26', '#35271f', '#40302a', '#382a23'][Math.floor(hash(i * 3) * 4)];
    c.fillRect(x, top, 46, h);
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.fillRect(x, top, 1.5, h);
    ellipse(c, x + 6, top + 12, 1.1, 1.1, '#8d8574');
    ellipse(c, x + 6, top + h - 12, 1.1, 1.1, '#8d8574');
  }
  const shade = c.createLinearGradient(0, top, 0, L.floorY);
  shade.addColorStop(0, 'rgba(10,6,6,0.55)');
  shade.addColorStop(0.5, 'rgba(10,6,6,0.05)');
  shade.addColorStop(1, 'rgba(10,6,6,0.28)');
  c.fillStyle = shade;
  c.fillRect(0, top, L.width, h);
  for (let x = 0, i = 0; x <= L.width; x += 160, i++) {
    if (i % 2 === 0 && x < L.width) {
      c.strokeStyle = 'rgba(20,12,8,0.5)';
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(x + 8, top);
      c.lineTo(x + 156, L.floorY);
      c.moveTo(x + 156, top);
      c.lineTo(x + 8, L.floorY);
      c.stroke();
    }
    c.fillStyle = '#4f3c32';
    c.fillRect(x - 6, top, 12, h);
    c.fillStyle = 'rgba(255,220,170,0.14)';
    c.fillRect(x - 6, top, 2, h);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(x + 4, top, 2, h);
    if (hash(i * 5) > 0.35) {
      // Cobweb in the corner.
      c.strokeStyle = 'rgba(232,225,215,0.2)';
      c.lineWidth = 0.8;
      for (let a = 0; a < 4; a++) {
        const ang = (a / 3) * (Math.PI / 2);
        c.beginPath();
        c.moveTo(x + 6, top);
        c.lineTo(x + 6 + Math.cos(ang) * 28, top + Math.sin(ang) * 28);
        c.stroke();
      }
      for (const r of [11, 20, 28]) {
        c.beginPath();
        c.arc(x + 6, top, r, 0, Math.PI / 2);
        c.stroke();
      }
    }
  }
  // Conduit to the junction box at the wires, and a box where they go into the floor.
  fillRR(c, -20, top + 3, wires.x + 30, 6, 2, '#7a7f89', '#23252c', 1);
  for (let x = 40; x < wires.x; x += 120) fillRR(c, x, top + 1, 5, 10, 1, '#55596a');
  fillRR(c, wires.x - 10, top, 38, 12, 1.5, '#6c7078', '#23252c', 1.5);
  c.fillStyle = C.gold;
  c.beginPath();
  c.moveTo(wires.x + 22, top + 2);
  c.lineTo(wires.x + 27, top + 10);
  c.lineTo(wires.x + 17, top + 10);
  c.closePath();
  c.fill();
  fillRR(c, wires.x - 6, L.floorY - 8, 30, 8, 1.5, '#55596a', '#23252c', 1.5);

  // Things that fell in over the years.
  fillRR(c, 244, L.floorY - 4, 13, 4, 1.5, '#9a3d3d', '#3a1418', 1);
  fillRR(c, 172, L.floorY - 3, 34, 3, 1, '#cfc4ab');
  fillRR(c, 178, L.floorY - 6, 24, 3, 1, '#b9ad94');
  fillRR(c, 716, L.floorY - 3, 26, 3, 1, '#a58152', '#3a2a1a', 1);
  c.strokeStyle = '#9fa4ad';
  c.lineWidth = 1.5;
  c.beginPath();
  c.arc(729, L.floorY - 3, 9, Math.PI, Math.PI * 1.9);
  c.stroke();
  c.fillStyle = C.gold;
  c.beginPath();
  c.moveTo(722, L.floorY - 3);
  c.lineTo(731, L.floorY - 3);
  c.lineTo(722, L.floorY - 8);
  c.closePath();
  c.fill();

  for (let i = 0; i < 20; i++) {
    const mx = hash(i) * L.width + Math.sin(time * 0.3 + i) * 22;
    const my = top + 8 + (hash(i + 9) * (h - 16) + Math.sin(time * 0.5 + i * 2) * 6);
    ellipse(c, mx, my, 1.2, 1.2, withAlpha(C.cream, 0.14 + 0.1 * Math.sin(time + i)));
  }
}

/** Below your feet: the drop ceiling cut away, and the store in the dark past it. */
export function crawlBelow(c: Ctx, L: Level, tile: Rect, powerOut: boolean, time: number) {
  const f = L.floorY;
  const w = L.width;
  const room = c.createLinearGradient(0, f + 26, 0, 540);
  room.addColorStop(0, powerOut ? '#2d1416' : '#4b2e20');
  room.addColorStop(1, powerOut ? '#150a0c' : '#20130f');
  c.fillStyle = room;
  c.fillRect(-20, f + 26, w + 40, 540 - f - 26);

  // Shelves down in the store.
  for (let k = 0; k * 215 < w + 40; k++) {
    const ux = 24 + k * 215;
    const uw = 172;
    c.fillStyle = 'rgba(18,10,8,0.75)';
    c.fillRect(ux - 5, f + 62, 10, 540 - f - 62);
    c.fillRect(ux + uw - 5, f + 62, 10, 540 - f - 62);
    for (const by of [f + 82, f + 156]) {
      c.fillStyle = 'rgba(70,42,26,0.9)';
      c.fillRect(ux, by, uw, 7);
      for (let j = 0; j < 7; j++) {
        if (hash(k * 19 + j + by) < 0.22) continue;
        const bx = ux + 14 + j * 24;
        const tall = hash(k * 7 + j * 3 + by) > 0.4;
        c.fillStyle = withAlpha(['#a8562a', '#3f7d4a', '#9fc6d6', '#7a1f33', '#c9873a', '#5a3d78'][Math.floor(hash(k + j * 11 + by) * 6)], 0.55);
        c.fillRect(bx - 4, by - (tall ? 24 : 15), 8, tall ? 24 : 15);
        c.fillRect(bx - 1.5, by - (tall ? 33 : 20), 3, tall ? 9 : 5);
      }
    }
  }
  const dim = c.createLinearGradient(0, f + 26, 0, 540);
  dim.addColorStop(0, 'rgba(14,7,8,0.22)');
  dim.addColorStop(1, 'rgba(14,7,8,0.62)');
  c.fillStyle = dim;
  c.fillRect(-20, f + 26, w + 40, 540 - f - 26);
  if (powerOut) {
    const pulse = 0.8 + 0.2 * Math.sin(time * 3);
    for (let k = 0; k * 330 < w; k++) glow(c, 150 + k * 330, f + 40, 170, '#ff5a44', 0.17 * pulse);
  }

  // The joist you walk on, then the drop-ceiling tiles.
  c.fillStyle = '#4a3830';
  c.fillRect(-20, f, w + 40, 14);
  c.fillStyle = '#6a5444';
  c.fillRect(-20, f, w + 40, 3);
  c.fillStyle = '#a89880';
  c.fillRect(-20, f + 14, w + 40, 12);
  c.fillStyle = '#7f715e';
  c.fillRect(-20, f + 24, w + 40, 2);
  for (let x = 0; x < w; x += 120) c.fillRect(x, f + 14, 3, 12);
  c.fillStyle = 'rgba(70,40,20,0.3)';
  for (let i = 0; i < 6; i++) ellipse(c, 80 + hash(i + 70) * (w - 160), f + 20, 14 + hash(i) * 20, 4, 'rgba(70,40,20,0.3)');

  // The loose tile: a gap, and the store's light coming up through it.
  const col = powerOut ? C.red : C.warm;
  c.fillStyle = withAlpha(col, 0.5);
  c.fillRect(tile.x + 4, f + 3, tile.w - 8, 23);
  c.beginPath();
  c.moveTo(tile.x + 4, f + 26);
  c.lineTo(tile.x + tile.w - 4, f + 26);
  c.lineTo(tile.x + tile.w + 60, 540);
  c.lineTo(tile.x - 60, 540);
  c.closePath();
  c.fillStyle = withAlpha(col, 0.08);
  c.fill();
}

/* ------------------------------------------------------- store props */

/** Wainscoting along the bottom of the wall, for a store that's dressed up. */
export function wainscot(c: Ctx, x0: number, x1: number, floorY: number) {
  c.fillStyle = 'rgba(30,16,10,0.34)';
  c.fillRect(x0, 386, x1 - x0, floorY - 386);
  for (let x = Math.floor(x0 / 120) * 120; x < x1; x += 120) {
    c.strokeStyle = 'rgba(20,10,6,0.45)';
    c.lineWidth = 2;
    c.strokeRect(x + 12, 398, 96, floorY - 398 - 30);
    c.strokeStyle = 'rgba(255,220,170,0.09)';
    c.lineWidth = 1;
    c.strokeRect(x + 14, 400, 92, floorY - 402 - 30);
  }
  c.fillStyle = '#3f2417';
  c.fillRect(x0, floorY - 18, x1 - x0, 18);
  c.fillStyle = 'rgba(255,220,170,0.14)';
  c.fillRect(x0, floorY - 18, x1 - x0, 2);
}

function carton(c: Ctx, x: number, y: number, w: number, h: number, n: number) {
  fillRR(c, x, y, w, h, 2, n % 2 ? '#9a7548' : '#8a6840', '#3f2c1a', 1.5);
  c.fillStyle = 'rgba(205,180,135,0.55)';
  c.fillRect(x + w / 2 - 4, y, 8, h);
  c.fillStyle = 'rgba(40,25,14,0.55)';
  for (const px of [x + 9, x + 15]) c.fillRect(px, y + h * 0.42, 3, h * 0.4);
  for (const px of [x + 9, x + 15]) c.fillRect(px + 1, y + h * 0.28, 1, h * 0.16);
}

const PROP_W: Record<Prop['kind'], number> = { cases: 60, crate: 34, barrel: 34, dolly: 30, mop: 30, wetfloor: 25, plant: 26 };

/** A floor prop against the wall. Scenery only: bottles and the raccoon pass in front. */
export function floorProp(c: Ctx, p: Prop, f: number, time: number) {
  const x = p.x;
  ellipse(c, x, f, PROP_W[p.kind] + 6, 5, 'rgba(0,0,0,0.3)');
  if (p.kind === 'cases') {
    carton(c, x - 58, f - 42, 58, 42, 0);
    carton(c, x + 1, f - 42, 58, 42, 1);
    carton(c, x - 34, f - 84, 58, 42, 3);
    if (hash(x) > 0.5) carton(c, x - 22, f - 122, 50, 38, 2);
  } else if (p.kind === 'crate') {
    for (const [dx, tall, col] of [[-16, 24, '#3f7d4a'], [0, 30, '#7a1f33'], [15, 22, '#c9873a']] as const) {
      fillRR(c, x + dx - 4, f - 54 - tall, 8, tall + 8, 2, col, '#1d1a20', 1);
      c.fillStyle = C.gold;
      c.fillRect(x + dx - 3, f - 54 - tall, 6, 5);
    }
    for (let i = 0; i < 14; i++) ellipse(c, x - 28 + hash(i + x) * 56, f - 53 - hash(i * 3) * 4, 8, 2, i % 2 ? '#c9a96a' : '#b0905a', hash(i) * 0.8 - 0.4);
    fillRR(c, x - 34, f - 54, 68, 54, 2, '#7a5230', '#2a170c', 2);
    c.fillStyle = '#2a170c';
    for (let i = 1; i < 4; i++) c.fillRect(x - 34, f - 54 + i * 13.5, 68, 2);
    c.fillStyle = '#8f6339';
    c.fillRect(x - 34, f - 54, 7, 54);
    c.fillRect(x + 27, f - 54, 7, 54);
    text(c, 'FRAGILE', x, f - 27, 11, 'rgba(30,16,8,0.7)', 'center', 700);
  } else if (p.kind === 'barrel') {
    const top = f - 82;
    c.save();
    c.beginPath();
    c.moveTo(x - 25, top);
    c.quadraticCurveTo(x - 40, f - 41, x - 25, f);
    c.lineTo(x + 25, f);
    c.quadraticCurveTo(x + 40, f - 41, x + 25, top);
    c.closePath();
    c.fillStyle = '#6e4427';
    c.fill();
    c.strokeStyle = '#2a170c';
    c.lineWidth = 2;
    c.stroke();
    c.clip();
    c.fillStyle = 'rgba(30,15,8,0.45)';
    for (let i = -4; i <= 4; i++) c.fillRect(x + i * 9.5, top, 1.5, 82);
    c.fillStyle = 'rgba(255,220,170,0.12)';
    c.fillRect(x - 16, top, 10, 82);
    c.fillStyle = '#4b4a50';
    for (const y of [top + 12, top + 26, f - 26, f - 12]) c.fillRect(x - 40, y, 80, 4);
    c.restore();
    text(c, 'XXX', x, f - 41, 15, 'rgba(30,16,8,0.7)', 'center', 700);
    fillRR(c, x - 4, f - 28, 8, 7, 1, C.gold, '#2a170c', 1);
  } else if (p.kind === 'dolly') {
    carton(c, x - 22, f - 44, 44, 38, 1);
    carton(c, x - 20, f - 80, 40, 36, 2);
    c.strokeStyle = '#3c3f48';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x + 27, f - 6);
    c.lineTo(x + 27, f - 104);
    c.quadraticCurveTo(x + 27, f - 116, x + 14, f - 112);
    c.moveTo(x - 26, f - 4);
    c.lineTo(x + 27, f - 4);
    c.stroke();
    ellipse(c, x + 27, f - 8, 9, 9, '#1d1a20');
    ellipse(c, x + 27, f - 8, 3.5, 3.5, '#8f8b93');
  } else if (p.kind === 'mop') {
    c.strokeStyle = '#a58152';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x + 2, f - 36);
    c.lineTo(x + 30, f - 138);
    c.stroke();
    for (let i = 0; i < 6; i++) ellipse(c, x - 8 + i * 4, f - 36, 4, 8, i % 2 ? '#c9c2b4' : '#ada698');
    c.beginPath();
    c.moveTo(x - 24, f - 42);
    c.lineTo(x + 24, f - 42);
    c.lineTo(x + 19, f - 6);
    c.lineTo(x - 19, f - 6);
    c.closePath();
    c.fillStyle = '#b89c3a';
    c.fill();
    c.strokeStyle = '#3a2f10';
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.15)';
    c.fillRect(x - 17, f - 40, 5, 32);
    for (const dx of [-16, 16]) ellipse(c, x + dx, f - 4, 4, 4, '#1d1a20');
  } else if (p.kind === 'wetfloor') {
    c.beginPath();
    c.moveTo(x - 13, f - 66);
    c.lineTo(x + 13, f - 66);
    c.lineTo(x + 25, f);
    c.lineTo(x - 25, f);
    c.closePath();
    c.fillStyle = '#d3a92e';
    c.fill();
    c.strokeStyle = '#3a2f10';
    c.lineWidth = 2;
    c.stroke();
    text(c, 'CAUTION', x, f - 47, 8, '#2a1f08', 'center', 700);
    text(c, 'WET', x, f - 30, 10, '#2a1f08', 'center', 700);
    text(c, 'FLOOR', x, f - 17, 10, '#2a1f08', 'center', 700);
  } else {
    const sway = Math.sin(time * 0.7 + x) * 1.5;
    c.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.3;
      const len = 50 + hash(i + x) * 22;
      c.strokeStyle = i % 2 ? '#4f7d45' : '#3c6838';
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(x, f - 40);
      c.quadraticCurveTo(x + Math.cos(a) * len * 0.5, f - 40 + Math.sin(a) * len, x + Math.cos(a) * len + sway, f - 40 + Math.sin(a) * len * 0.72);
      c.stroke();
    }
    c.lineCap = 'butt';
    c.beginPath();
    c.moveTo(x - 22, f - 42);
    c.lineTo(x + 22, f - 42);
    c.lineTo(x + 16, f);
    c.lineTo(x - 16, f);
    c.closePath();
    c.fillStyle = '#a85f3a';
    c.fill();
    c.strokeStyle = '#3f2012';
    c.lineWidth = 2;
    c.stroke();
    fillRR(c, x - 25, f - 46, 50, 8, 2, '#b86c44', '#3f2012', 2);
  }
}

export function propHalfWidth(p: Prop) {
  return PROP_W[p.kind] + 40;
}
