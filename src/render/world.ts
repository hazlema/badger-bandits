// Draws the level and everyone in it, in world coordinates under a camera.

import { BOB, NIGHT, SCRUBBER, VIEW_H, WORLD_SCALE, WORLD_VIEW_W } from '../config';
import type { Game, Raccoon } from '../sim/game';
import type { ItemKind, Level } from '../sim/level';
import { bubble, C, ellipse, fillRR, glow, hash, text, withAlpha, type Ctx } from './paint';

const BOTTLE_GLASS = ['#a8562a', '#3f7d4a', '#9fc6d6', '#7a1f33', '#c9873a', '#5a3d78'];

export interface Prompts { grab: string; up: string; down: string; jump: string; throw: string; swap: string; hoot: string }

export class WorldView {
  camX = 0;
  private lastLevel = '';

  draw(c: Ctx, g: Game, time: number, keys: Prompts) {
    const L = g.level;
    const R = g.raccoon;
    if (L.id !== this.lastLevel) {
      this.lastLevel = L.id;
      this.camX = clampCam(R.x - WORLD_VIEW_W * 0.4, L);
    }
    const lead = R.facing * 90;
    const want = clampCam(R.x + lead - WORLD_VIEW_W / 2, L);
    this.camX += (want - this.camX) * 0.08;
    this.camX = clampCam(this.camX, L);

    c.save();
    c.beginPath();
    c.rect(0, 0, WORLD_VIEW_W * WORLD_SCALE, VIEW_H * WORLD_SCALE);
    c.clip();
    c.scale(WORLD_SCALE, WORLD_SCALE);
    // Buzz sway and smash shake.
    const sway = g.wobble * 2.2;
    const sx = Math.sin(time * 1.3) * sway + (Math.random() - 0.5) * g.shake * 8;
    const sy = Math.sin(time * 0.9) * sway * 0.6 + (Math.random() - 0.5) * g.shake * 6;
    c.translate(WORLD_VIEW_W / 2, VIEW_H / 2);
    c.rotate(Math.sin(time * 1.1) * 0.0045 * g.wobble);
    c.translate(-WORLD_VIEW_W / 2 + sx, -VIEW_H / 2 + sy);
    c.translate(-Math.round(this.camX), 0);

    if (L.id === 'roof') this.roof(c, g, time);
    else if (L.id === 'crawl') this.crawl(c, g, time);
    else this.store(c, g, time);

    this.raccoon(c, g, R, time);
    if (L.id === 'store') {
      for (const b of g.bottles) {
        if (b.state === 'air') drawBottle(c, b.x, b.y, b.kind, b.id, (time * 9 + b.id) % 6.28);
        // Rolling: lying on its side, spinning along the lane.
        else if (b.state === 'rolling') drawBottle(c, b.x, b.y + (b.kind === 'mini' || b.kind === 'golden' ? 4 : 7), b.kind, b.id, Math.PI / 2 + b.x / 9);
      }
      this.aimArc(c, g, time);
      this.bob(c, g, time);
      this.lighting(c, g, time);
      for (const r of g.rings) {
        const k = r.age / 0.9;
        c.beginPath();
        c.arc(r.x, r.y, r.r * (1 - (1 - k) ** 3), 0, Math.PI * 2);
        c.strokeStyle = withAlpha(C.cream, 0.55 * (1 - k));
        c.lineWidth = 3;
        c.stroke();
      }
    }
    this.prompts(c, g, keys);
    c.restore();
    this.bubbles(c, g);
  }

  /* ------------------------------------------------------------- roof */

  private roof(c: Ctx, g: Game, time: number) {
    const L = g.level;
    const x0 = this.camX;
    const sky = c.createLinearGradient(0, 0, 0, 540);
    sky.addColorStop(0, '#141a33');
    sky.addColorStop(1, '#3a3157');
    c.fillStyle = sky;
    c.fillRect(x0 - 20, 0, WORLD_VIEW_W + 40, 540);
    for (let i = 0; i < 90; i++) {
      const sx = x0 * 0.9 + hash(i) * 1700 - 100;
      const tw = 0.5 + 0.5 * Math.sin(time * 2 + i);
      ellipse(c, sx, hash(i + 99) * 260, 1.2, 1.2, withAlpha(C.cream, 0.3 + 0.5 * tw));
    }
    glow(c, x0 * 0.8 + 760, 90, 90, '#fff3c4', 0.25);
    ellipse(c, x0 * 0.8 + 760, 90, 30, 30, '#fbf1cf');
    // Ashland at night: houses and the church steeple, in parallax.
    c.fillStyle = '#2a2440';
    for (let i = 0; i < 14; i++) {
      const hx = x0 * 0.6 + i * 130 - 120;
      const hh = 70 + hash(i * 7) * 60;
      c.fillRect(hx, 440 - hh, 110, hh);
      c.beginPath();
      c.moveTo(hx - 6, 440 - hh);
      c.lineTo(hx + 55, 440 - hh - 36);
      c.lineTo(hx + 116, 440 - hh);
      c.fill();
      if (hash(i * 3) > 0.4) fillRR(c, hx + 30, 440 - hh + 22, 16, 18, 2, withAlpha(C.warm, 0.6));
    }
    const st = x0 * 0.6 + 640;
    c.fillRect(st, 190, 30, 250);
    c.beginPath();
    c.moveTo(st - 4, 190);
    c.lineTo(st + 15, 120);
    c.lineTo(st + 34, 190);
    c.fill();

    // Roofs
    for (const s of L.solids) {
      if (s.w < 100) continue;
      fillRR(c, s.x, s.y, s.w, s.h, 0, '#3a3340');
      c.fillStyle = '#4d4555';
      c.fillRect(s.x, s.y, s.w, 6);
    }
    // AC unit
    const ac = L.solids[2];
    fillRR(c, ac.x, ac.y, ac.w, ac.h, 5, '#9aa1a8', C.ink, 2);
    for (let i = 0; i < 5; i++) {
      c.fillStyle = '#6f777f';
      c.fillRect(ac.x + 10, ac.y + 10 + i * 8, ac.w - 20, 3);
    }
    // Trellis with ivy
    const t = L.climbables[0];
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
    for (let i = 0; i < 26; i++) ellipse(c, t.x + hash(i) * t.w, t.y + hash(i + 5) * t.h, 7, 4, i % 2 ? '#4f7d45' : '#3c6838', hash(i + 2) * 3);
    fillRR(c, t.x - 4, t.y - 4, t.w + 8, 8, 3, '#8c6a46');
    // Vent
    const v = L.vent!;
    fillRR(c, v.x, v.y, v.w, v.h, 4, '#a7adb4', C.ink, 2);
    for (let i = 0; i < 4; i++) {
      c.fillStyle = '#5f666d';
      c.fillRect(v.x + 8 + i * 15, v.y + 5, 9, v.h - 10);
    }
    this.signs(c, L);
  }

  private signs(c: Ctx, L: Level) {
    for (const s of L.signs) {
      c.font = `600 15px "Fredoka", sans-serif`;
      const w = c.measureText(s.text).width + 26;
      c.fillStyle = '#5a3b26';
      c.fillRect(s.x - 3, s.y + 16, 6, 40);
      fillRR(c, s.x - w / 2, s.y - 16, w, 34, 8, '#2f3a33', '#8c6a46', 4);
      text(c, s.text, s.x, s.y + 1, 15, C.cream, 'center');
    }
  }

  /* ------------------------------------------------------------ crawl */

  private crawl(c: Ctx, g: Game, time: number) {
    const L = g.level;
    c.fillStyle = '#1a1314';
    c.fillRect(this.camX - 20, 0, WORLD_VIEW_W + 40, 540);
    fillRR(c, 0, L.ceilingY, L.width, L.floorY - L.ceilingY, 0, '#3b2c26');
    for (let x = 0; x < L.width; x += 80) {
      c.fillStyle = '#4a3830';
      c.fillRect(x, L.ceilingY, 10, L.floorY - L.ceilingY);
    }
    c.fillStyle = '#5a463a';
    c.fillRect(0, L.floorY, L.width, 8);
    c.fillStyle = '#2b201c';
    c.fillRect(0, L.ceilingY - 8, L.width, 8);
    // Wires
    const w = L.wires!;
    const cols = ['#d8463a', '#e7c240', '#4a8fd8'];
    cols.forEach((col, i) => {
      c.strokeStyle = col;
      c.lineWidth = 4;
      c.beginPath();
      if (!g.wiresChewed) {
        c.moveTo(w.x + 4 + i * 5, w.y);
        c.bezierCurveTo(w.x - 6 + i * 8, w.y + 30, w.x + 20 - i * 6, w.y + 45, w.x + 4 + i * 5, w.y + w.h);
      } else {
        c.moveTo(w.x + 4 + i * 5, w.y);
        c.lineTo(w.x + 2 + i * 6, w.y + 22 + i * 3);
        c.moveTo(w.x + 4 + i * 5, w.y + w.h);
        c.lineTo(w.x + 8 + i * 4, w.y + w.h - 18 - i * 2);
      }
      c.stroke();
    });
    if (g.wiresChewed && Math.sin(time * 23) > 0.6) glow(c, w.x + 8, w.y + 25, 18, '#ffe9a0', 0.8);
    // Loose tile with light leaking from the store
    const t = L.tile!;
    glow(c, t.x + t.w / 2, t.y, 70, g.powerOut ? C.red : C.warm, 0.35);
    c.fillStyle = '#c9b89a';
    c.fillRect(t.x, t.y - 2, t.w, 6);
    c.strokeStyle = C.ink;
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(t.x + 10, t.y - 2);
    c.lineTo(t.x + 30, t.y + 4);
    c.lineTo(t.x + 48, t.y - 2);
    c.moveTo(t.x + 30, t.y + 4);
    c.lineTo(t.x + 64, t.y + 2);
    c.stroke();
    this.signs(c, L);
  }

  /* ------------------------------------------------------------ store */

  private store(c: Ctx, g: Game, time: number) {
    const L = g.level;
    const x0 = this.camX - 40;
    const x1 = this.camX + WORLD_VIEW_W + 40;
    const frac = g.t / NIGHT.length;

    // Wall: warm wood panels
    c.fillStyle = C.wall;
    c.fillRect(x0, 0, x1 - x0, L.floorY);
    for (let x = Math.floor(x0 / 60) * 60; x < x1; x += 60) {
      c.fillStyle = withAlpha('#2c1a12', 0.25);
      c.fillRect(x, L.ceilingY, 3, L.floorY - L.ceilingY);
    }
    c.fillStyle = '#5e3e2d';
    c.fillRect(x0, 380, x1 - x0, 6);
    // Ceiling tiles
    c.fillStyle = '#b5a48b';
    c.fillRect(x0, 0, x1 - x0, L.ceilingY);
    c.strokeStyle = '#8f7f68';
    c.lineWidth = 2;
    for (let x = Math.floor(x0 / 70) * 70; x < x1; x += 70) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, L.ceilingY);
      c.stroke();
    }
    c.fillStyle = '#6e5b44';
    c.fillRect(x0, L.ceilingY - 4, x1 - x0, 4);
    // The hole and your cousin
    const h = L.hole!;
    c.fillStyle = '#120c0e';
    c.beginPath();
    c.moveTo(h.x + 4, 0);
    c.lineTo(h.x + h.w - 2, 0);
    c.lineTo(h.x + h.w + 6, L.ceilingY - 2);
    c.lineTo(h.x + h.w - 18, L.ceilingY + 2);
    c.lineTo(h.x + 30, L.ceilingY - 1);
    c.lineTo(h.x - 6, L.ceilingY + 3);
    c.closePath();
    c.fill();
    drawCousin(c, h.x + h.w / 2, L.ceilingY + 4, time, g);

    // Front: sign, windows, door
    const win = L.windows!;
    if (win.x < x1 && win.x + win.w + 200 > x0) {
      fillRR(c, 2590, 70, 400, 56, 8, '#24304f', '#c9a96a', 3);
      text(c, 'ABC Store', 2790, 92, 28, C.cream, 'center', 700);
      text(c, 'Virginia · Beer · Wine · Spirits', 2790, 114, 12, C.creamDim, 'center', 500);
      const sky = c.createLinearGradient(0, win.y, 0, win.y + win.h);
      const dawn = Math.max(0, (frac - NIGHT.dawnLightFrom) / (1 - NIGHT.dawnLightFrom));
      sky.addColorStop(0, mix('#151b38', '#7aa0d6', dawn));
      sky.addColorStop(1, mix('#2c2a52', '#f7c38a', dawn));
      fillRR(c, win.x, win.y, win.w, win.h, 4, '#000');
      c.fillStyle = sky;
      c.fillRect(win.x + 4, win.y + 4, win.w - 8, win.h - 8);
      if (dawn < 0.7) ellipse(c, win.x + 50, win.y + 50 + dawn * 80, 16, 16, withAlpha('#fbf1cf', 1 - dawn));
      c.strokeStyle = C.woodDark;
      c.lineWidth = 6;
      c.strokeRect(win.x, win.y, win.w, win.h);
      c.beginPath();
      c.moveTo(win.x + win.w / 2, win.y);
      c.lineTo(win.x + win.w / 2, win.y + win.h);
      c.stroke();
      const d = L.door!;
      fillRR(c, d.x, d.y, d.w, d.h, 3, withAlpha('#1c2440', 0.9), C.woodDark, 5);
      fillRR(c, d.x + d.w - 16, d.y + 46, 6, 14, 2, C.gold);
    }

    // Floor + rug
    c.fillStyle = '#6a4127';
    c.fillRect(x0, L.floorY, x1 - x0, 40);
    for (let x = Math.floor(x0 / 90) * 90; x < x1; x += 90) {
      c.fillStyle = '#5a361f';
      c.fillRect(x, L.floorY, 2, 40);
    }
    fillRR(c, 900, L.floorY + 4, 520, 14, 4, '#7d2f37');
    c.fillStyle = withAlpha('#e2b56a', 0.5);
    c.fillRect(910, L.floorY + 9, 500, 3);

    // Shelf units
    L.units.forEach((u, i) => {
      if (u.x > x1 || u.x + u.w < x0) return;
      fillRR(c, u.x, u.top - 14, u.w, L.floorY - u.top + 14, 4, '#3f2417');
      for (let k = 0; k < 6; k++) {
        c.fillStyle = withAlpha('#2a160d', 0.4);
        c.fillRect(u.x + 14 + k * (u.w / 6), u.top, 2, L.floorY - u.top);
      }
      fillRR(c, u.x - 4, u.top - 22, u.w + 8, 12, 3, C.woodLight, C.woodDark, 2);
      if (i === 1 || i === 4) for (let k = 0; k < 7; k++) ellipse(c, u.x + 20 + hash(k + i * 9) * (u.w - 40), u.top - 26 + hash(k) * 8, 8, 4, k % 2 ? '#4f7d45' : '#3c6838', hash(k + 3) * 3);
    });
    for (const b of L.boards) {
      if (b.x1 > x1 || b.x2 < x0 || b.unit < 0) continue;
      fillRR(c, b.x1 - 2, b.y, b.x2 - b.x1 + 4, 10, 2, C.woodLight, C.woodDark, 2);
    }
    const lit = g.highlighted();
    for (const b of g.bottles) {
      if (b.state !== 'shelf' || b.x < x0 || b.x > x1) continue;
      if (b === lit) {
        glow(c, b.x, b.y - 14, 26, C.gold, 0.55 + 0.2 * Math.sin(time * 8));
        c.beginPath();
        c.moveTo(b.x - 5, b.y - 40 + Math.sin(time * 6) * 2);
        c.lineTo(b.x + 5, b.y - 40 + Math.sin(time * 6) * 2);
        c.lineTo(b.x, b.y - 33 + Math.sin(time * 6) * 2);
        c.fillStyle = C.gold;
        c.fill();
      }
      // The rum captain turns his head and salutes when you get close.
      const near = Math.hypot(g.raccoon.x - b.x, g.raccoon.y - b.y) < 90;
      drawBottle(c, b.x, b.y, b.kind, b.id, 0, { salute: b.kind === 'rum' && near ? Math.min(1, (time * 4) % 6) : 0, face: Math.sign(g.raccoon.x - b.x) });
    }
    L.units.forEach((u) => {
      if (u.x > x1 || u.x + u.w < x0) return;
      fillRR(c, u.x - 6, u.top - 14, 12, L.floorY - u.top + 14, 3, C.wood, C.woodDark, 2);
      fillRR(c, u.x + u.w - 6, u.top - 14, 12, L.floorY - u.top + 14, 3, C.wood, C.woodDark, 2);
    });

    // Plush display
    const p = L.plush!;
    if (g.plushGlow > 0) glow(c, p.x + p.w / 2, p.y, 140, C.warm, 0.35 + 0.25 * Math.sin(time * 6));
    const plushCols = ['#8f8b93', '#a8673a', '#d97a3a', '#cfc7c0', '#6b8f4e', '#c24a4a'];
    for (let k = 0; k < 9; k++) {
      const px = p.x + 12 + k * 15;
      const py = p.y + 4 + (k % 2) * 6 - Math.abs(Math.sin(g.plushPuff * 12 + k)) * g.plushPuff * 14;
      ellipse(c, px, py, 11, 10, plushCols[k % plushCols.length]);
      ellipse(c, px - 6, py - 8, 4, 4, plushCols[k % plushCols.length]);
      ellipse(c, px + 6, py - 8, 4, 4, plushCols[k % plushCols.length]);
      ellipse(c, px - 3, py - 1, 1.5, 1.5, C.ink);
      ellipse(c, px + 3, py - 1, 1.5, 1.5, C.ink);
    }
    fillRR(c, p.x - 6, p.y + 6, p.w + 12, L.floorY - p.y - 6, 6, '#8a5b8c', '#4a2a4a', 2.5);
    text(c, 'PLUSH PALS', p.x + p.w / 2, p.y + 28, 12, C.cream, 'center', 700);

    // Tote rack
    const tt = L.tote!;
    c.fillStyle = '#6d6a70';
    c.fillRect(tt.x + tt.w / 2 - 2, tt.y - 30, 4, L.floorY - tt.y + 30);
    c.fillRect(tt.x - 4, tt.y - 30, tt.w + 8, 4);
    if (!g.toteTaken) drawTote(c, tt.x + tt.w / 2, tt.y + 14, 1);

    // Counter, register, mini-bottle rack
    const k = L.counter!;
    fillRR(c, k.x, k.y, k.w, k.h, 4, C.wood, C.woodDark, 2.5);
    fillRR(c, k.x - 6, k.y - 6, k.w + 12, 10, 3, C.woodLight, C.woodDark, 2);
    fillRR(c, k.x + 140, k.y - 40, 56, 34, 5, '#55565c', C.ink, 2);
    fillRR(c, k.x + 146, k.y - 34, 30, 12, 2, '#2d4a3a');
    const rk = L.rack!;
    const spin = g.rack.spin;
    c.fillStyle = '#8f8b93';
    c.fillRect(rk.x + rk.w / 2 - 2, rk.y + 8, 4, rk.h - 8);
    for (let tier = 0; tier < 3; tier++) {
      const ty = rk.y + 10 + tier * 16;
      fillRR(c, rk.x, ty + 10, rk.w, 4, 2, '#b9b4ba');
      for (let i = 0; i < 4; i++) {
        const a = time * (spin > 0 ? 14 : 0.3) + i * 1.57 + tier;
        const bx = rk.x + rk.w / 2 + Math.cos(a) * 18;
        if (Math.sin(a) < -0.2 || g.rack.stock <= tier * 3 + i) continue;
        drawBottle(c, bx, ty + 10, tier === 1 && i === 2 ? 'golden' : 'mini', tier * 4 + i, 0);
      }
    }

    // Dawn light creeping in from the front windows toward the counter
    if (frac > NIGHT.dawnLightFrom) {
      const k2 = (frac - NIGHT.dawnLightFrom) / (1 - NIGHT.dawnLightFrom);
      const edge = win.x + win.w - k2 * (win.x + win.w - (k.x + k.w));
      const gr = c.createLinearGradient(edge, 0, win.x + win.w, 0);
      gr.addColorStop(0, withAlpha('#ffe2a8', 0));
      gr.addColorStop(0.3, withAlpha('#ffe2a8', 0.35));
      gr.addColorStop(1, withAlpha('#ffe2a8', 0.5));
      c.fillStyle = gr;
      c.beginPath();
      c.moveTo(win.x + win.w, win.y);
      c.lineTo(win.x + win.w, L.floorY + 40);
      c.lineTo(edge - 80, L.floorY + 40);
      c.lineTo(win.x, win.y + win.h);
      c.closePath();
      c.fill();
    }

    // Spills. A big one on the floor runs downhill toward the front as a shining stream.
    for (const s of g.spills) {
      if (Math.max(s.x, s.x0) < x0 || Math.min(s.x, s.x0) > x1) continue;
      const col = spillColour(s.kind, s.id);
      if (s.x - s.x0 > 4) {
        c.strokeStyle = withAlpha(col, 0.55);
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(s.x0, s.y + 2);
        for (let x = s.x0; x < s.x; x += 12) c.lineTo(x, s.y + 2 + Math.sin(x * 0.2) * 0.8);
        c.lineTo(s.x, s.y + 2);
        c.stroke();
        for (let i = 0; i < 3; i++) {
          const gx = s.x0 + ((time * 60 + i * 37 + s.id * 13) % Math.max(1, s.x - s.x0));
          ellipse(c, gx, s.y + 1.5, 3, 1, withAlpha('#ffffff', 0.5));
        }
      }
      if (s.kind === 'curacao') glow(c, s.x, s.y, 34, '#4fc3ff', 0.35);
      ellipse(c, s.x, s.y + 2, s.kind === 'mini' ? 13 : 20, 4, withAlpha(col, 0.75));
      ellipse(c, s.x - 4, s.y + 1, 5, 1.5, withAlpha('#ffffff', 0.35));
      for (let i = 0; i < 3; i++) {
        c.fillStyle = withAlpha('#d9eef2', 0.7);
        c.fillRect(s.x - 14 + hash(s.id + i) * 28, s.y - 2, 4, 2);
      }
    }

    // Blue paw prints
    for (const pr of g.prints) {
      if (pr.x < x0 || pr.x > x1) continue;
      const a = Math.min(1, (40 - pr.age) / 8) * (0.6 + 0.25 * Math.sin(time * 4 + pr.x));
      glow(c, pr.x, pr.y - 1, 12, '#4fc3ff', 0.3 * a);
      ellipse(c, pr.x, pr.y - 1, 4, 1.6, withAlpha('#7fd8ff', a));
      for (const dx of [-3, 0, 3]) ellipse(c, pr.x + pr.facing * 4 + dx * 0.6, pr.y - 2.5 + Math.abs(dx) * 0.2, 1, 0.8, withAlpha('#7fd8ff', a));
    }

    this.scrubber(c, g, time);
  }

  /** The dotted arc while you hold Throw: exactly where the lob will fly. */
  private aimArc(c: Ctx, g: Game, time: number) {
    const pts = g.lobPath();
    if (!pts.length) return;
    pts.forEach((p, i) => {
      if (i === pts.length - 1) return;
      ellipse(c, p.x, p.y, 2.6, 2.6, withAlpha(C.cream, 0.85 - (i / pts.length) * 0.4));
    });
    const end = pts[pts.length - 1];
    c.strokeStyle = withAlpha(C.gold, 0.8 + 0.2 * Math.sin(time * 10));
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(end.x, end.y, 14, 4, 0, 0, Math.PI * 2);
    c.stroke();
  }

  private scrubber(c: Ctx, g: Game, time: number) {
    const S = g.scrub;
    const y = g.level.floorY;
    const w = SCRUBBER.w;
    if (S.state === 'down') {
      // Bowled over: upside down, wheels spinning.
      ellipse(c, S.x, y - 2, w / 2 + 4, 4, withAlpha('#000', 0.3));
      c.beginPath();
      c.ellipse(S.x, y - 2, w / 2 - 3, 14, 0, 0, Math.PI);
      c.fillStyle = '#c8d0d6';
      c.fill();
      c.strokeStyle = C.ink;
      c.lineWidth = 2;
      c.stroke();
      fillRR(c, S.x - w / 2, y - 14, w, 12, 5, '#5f6670', C.ink, 2);
      for (const i of [-1, 1]) ellipse(c, S.x + i * 14, y - 16, 7, 3, '#3a6fb0', time * 25);
      text(c, '✶', S.x + Math.sin(time * 5) * 10, y - 30, 14, C.gold, 'center', 700);
      return;
    }
    const rush = S.state === 'rush';
    ellipse(c, S.x, y - 2, w / 2 + 4, 4, withAlpha('#000', 0.3));
    fillRR(c, S.x - w / 2, y - 14, w, 12, 5, '#5f6670', C.ink, 2);
    c.beginPath();
    c.ellipse(S.x, y - 14, w / 2 - 3, 14, 0, Math.PI, 0);
    c.fillStyle = '#c8d0d6';
    c.fill();
    c.strokeStyle = C.ink;
    c.lineWidth = 2;
    c.stroke();
    const blink = Math.sin(time * (rush ? 18 : 4)) > 0;
    ellipse(c, S.x + S.dir * 8, y - 22, 4, 4, rush ? (blink ? '#ff5a44' : '#7a2a20') : blink ? '#6fd3ff' : '#2a5a70');
    for (let i = 0; i < 2; i++) {
      const bx = S.x + (i ? 1 : -1) * 14;
      ellipse(c, bx, y - 2, 7, 3, '#3a6fb0', (time * (rush ? 20 : 8)) % 3.14);
    }
    if (rush) text(c, '!', S.x, y - 46, 22, C.red, 'center', 700);
    if (S.state === 'slurp') text(c, 'slurrrp', S.x, y - 44, 14, '#a8e0ff', 'center');
  }

  /* -------------------------------------------------------------- bob */

  private bob(c: Ctx, g: Game, time: number) {
    const B = g.bob;
    if (B.state === 'outside') return;
    const L = g.level;
    const fy = L.floorY;
    const o = g.beamOrigin();
    if (B.state === 'down') {
      // Flat on his back, flashlight rolling loose, stars overhead.
      const x = B.x;
      ellipse(c, x, fy - 1, 52, 6, withAlpha('#000', 0.35));
      fillRR(c, x - 44, fy - 14, 40, 12, 5, '#4b4a3a', C.ink, 2);
      fillRR(c, x - 8, fy - 22, 42, 20, 9, '#a89668', C.ink, 2.5);
      ellipse(c, x + 46, fy - 13, 12, 12, '#e6b48c');
      fillRR(c, x + 52, fy - 26, 10, 26, 4, '#2c3a5c');
      ellipse(c, x + 46, fy - 16, 2, 2, C.ink);
      fillRR(c, x - 60, fy - 9, 10, 8, 2, '#33333a');
      for (let i = 0; i < 3; i++) text(c, '✶', x + 46 + Math.cos(time * 4 + i * 2.1) * 18, fy - 40 + Math.sin(time * 4 + i * 2.1) * 6, 13, C.gold, 'center', 700);
      return;
    }

    // Flashlight cone, cut by the same shelf panels and counter the sim uses.
    const chase = B.state === 'chase' || B.state === 'shout';
    const pts: { x: number; y: number }[] = [o];
    const n = 28;
    for (let i = 0; i <= n; i++) {
      const a = B.beam - BOB.beamHalf + (2 * BOB.beamHalf * i) / n;
      const dx = B.dir * Math.cos(a);
      const dy = -Math.sin(a);
      const t = castRay(L, o.x, o.y, dx, dy, BOB.beamRange);
      pts.push({ x: o.x + dx * t, y: o.y + dy * t });
    }
    c.save();
    c.globalCompositeOperation = 'lighter';
    const gr = c.createRadialGradient(o.x, o.y, 4, o.x, o.y, BOB.beamRange);
    gr.addColorStop(0, withAlpha(chase ? '#fff4c8' : '#ffe9a6', chase ? 0.55 : 0.42));
    gr.addColorStop(1, withAlpha('#ffe9a6', 0));
    c.fillStyle = gr;
    c.beginPath();
    pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.closePath();
    c.fill();
    c.restore();

    const x = B.x;
    const d = B.dir;
    const moving = B.state === 'search' || B.state === 'investigate' || B.state === 'chase';
    const ph = moving ? Math.sin(time * (B.state === 'chase' ? 12 : 6)) : 0;
    ellipse(c, x, fy - 1, 26, 5, withAlpha('#000', 0.35));
    // legs
    fillRR(c, x - 12 + ph * 5, fy - 40, 11, 38, 4, '#4b4a3a', C.ink, 2);
    fillRR(c, x + 1 - ph * 5, fy - 40, 11, 38, 4, '#55543f', C.ink, 2);
    fillRR(c, x - 14 + ph * 5, fy - 8, 15, 8, 3, '#2a2220');
    fillRR(c, x - 1 - ph * 5, fy - 8, 15, 8, 3, '#2a2220');
    // body
    fillRR(c, x - 17, fy - 78, 34, 42, 10, '#a89668', C.ink, 2.5);
    c.fillStyle = '#3d3528';
    c.fillRect(x - 17, fy - 42, 34, 5);
    fillRR(c, x - d * 4 - 5, fy - 72, 10, 10, 2, '#cfa64a');
    // pole arm (back) and the catch pole
    const reach = chase ? 1 : 0.55;
    c.strokeStyle = '#6b5a3a';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x - d * 10, fy - 60);
    c.lineTo(x + d * (20 + 50 * reach), fy - 60 - 50 * (1 - reach) - 20);
    c.stroke();
    c.beginPath();
    c.ellipse(x + d * (26 + 50 * reach), fy - 62 - 50 * (1 - reach) - 22, 8, 6, 0, 0, Math.PI * 2);
    c.strokeStyle = '#d8c7a0';
    c.lineWidth = 2;
    c.stroke();
    // head
    ellipse(c, x + d * 2, fy - 90, 13, 13, '#e6b48c');
    c.strokeStyle = C.ink;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(x + d * 2, fy - 90, 13, 0, Math.PI * 2);
    c.stroke();
    fillRR(c, x - 14 + d * 2, fy - 106, 28, 10, 4, '#2c3a5c');
    fillRR(c, x + (d > 0 ? 6 : -22), fy - 99, 16, 4, 2, '#2c3a5c');
    ellipse(c, x + d * 8, fy - 91, 2, 2, C.ink);
    fillRR(c, x + d * 4 - 6, fy - 85, 12, 4, 2, '#6b4a30');
    if (B.state === 'look' || B.state === 'confused') text(c, '?', x, fy - 122, 20, C.cream, 'center', 700);
    if (B.state === 'shout') text(c, '!', x, fy - 124, 26, C.red, 'center', 700);
    // flashlight arm
    c.strokeStyle = '#a89668';
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(x + d * 6, fy - 70);
    c.lineTo(o.x, o.y);
    c.stroke();
    fillRR(c, o.x - 5, o.y - 4, 10, 8, 2, '#33333a');
  }

  /* ------------------------------------------------------------ light */

  private lighting(c: Ctx, g: Game, time: number) {
    const L = g.level;
    const x0 = this.camX - 40;
    c.fillStyle = 'rgba(20,10,26,0.28)';
    c.fillRect(x0, 0, WORLD_VIEW_W + 80, VIEW_H);
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const lx of [330, 1000, 1500, 2150, 2760]) {
      if (lx < x0 - 300 || lx > x0 + WORLD_VIEW_W + 380) continue;
      const pulse = 0.85 + 0.15 * Math.sin(time * 3 + lx);
      glow(c, lx, L.ceilingY + 10, 260, '#ff6a4a', 0.22 * pulse);
    }
    glow(c, g.raccoon.x, g.raccoon.y - 14, 120, C.warm, 0.08);
    c.restore();
    for (const lx of [330, 1000, 1500, 2150, 2760]) {
      fillRR(c, lx - 16, L.ceilingY, 32, 12, 4, '#3a1c18', C.ink, 1.5);
      ellipse(c, lx, L.ceilingY + 8, 9, 5, '#ff7a5a');
    }
  }

  /* ---------------------------------------------------------- raccoon */

  private raccoon(c: Ctx, g: Game, R: Raccoon, time: number) {
    if (g.phase === 'over' && g.result?.escaped) return;
    if (R.invuln > 0 && Math.floor(time * 14) % 2 === 0) return;
    const pose = R.state === 'ko' ? 'ko' : R.state === 'playdead' ? 'dead' : R.state === 'sip' ? 'sip' : R.climbing ? 'climb' : !R.grounded ? 'air' : Math.abs(R.vx) > 20 ? 'run' : 'idle';
    drawRaccoon(c, R.x, R.y, R.facing, pose, time, {
      buzz: R.buzz,
      cheeks: R.cheeks,
      carry: R.carry,
      tote: g.toteTaken,
    });
    if (R.state === 'ko') {
      // Seeing stars, cartoon-style: dazed, not passed out.
      for (let i = 0; i < 3; i++) {
        const a = time * 5 + (i * Math.PI * 2) / 3;
        text(c, '✶', R.x + R.facing * 10 + Math.cos(a) * 16, R.y - 24 + Math.sin(a) * 5, 13, C.gold, 'center', 700);
      }
    }
    if (R.state === 'hoot') {
      const k = 1 - R.stateT / 0.8;
      text(c, 'HOOOO', R.x + R.facing * (30 + k * 30), R.y - 40 - k * 16, 14 + k * 6, withAlpha(C.cream, 1 - k), 'center', 700);
    }
    if (R.seaLegs > 0) text(c, '⚓', R.x - R.facing * 18, R.y - R.h - 8, 13, '#e8c27a', 'center', 700);
  }

  /* ---------------------------------------------------------- prompts */

  private prompts(c: Ctx, g: Game, k: Prompts) {
    const R = g.raccoon;
    const L = g.level;
    if (R.state !== 'move' && R.state !== 'playdead') return;
    let s = '';
    if (L.id === 'store') {
      if (g.atHole()) s = R.carry.length ? `${k.grab} hand up · ${k.up} climb out` : `${k.up} climb out (ends the night)`;
      else if (R.state === 'playdead') s = 'playing dead…';
      else if (g.onPlush() && g.bobInside) s = `${k.down} play dead`;
      else if (g.spills.some((sp) => Math.abs(sp.y - R.y) < 1 && R.grounded && Math.abs(sp.x - R.x) < 32)) s = `${k.grab} lap it up`;
      else if (R.aimT !== null) s = `let go of ${k.throw} to throw`;
      else if (g.highlighted()) s = `${k.grab} grab · ${k.throw} throw (+${k.up} lob, +${k.down} drop, +→ roll)`;
      else if (!g.toteTaken && R.grounded && R.y === L.floorY && Math.abs(R.x - (L.tote!.x + L.tote!.w / 2)) < 40) s = `${k.grab} take the tote bag`;
      else if (R.grounded && R.y === L.counter!.y && Math.abs(R.x - (L.rack!.x + L.rack!.w / 2)) < 50 && g.rack.stock > 0) s = `${k.grab} spin the mini-bottle rack`;
      else if (R.carry.length && R.grounded && Math.abs(R.vx) < 20) s = `${k.throw} throw · ${k.hoot} hoot${R.carry.length > 1 ? ` · ${k.swap} switch` : ''}`;
    } else if (L.id === 'roof' && L.vent && Math.abs(R.x - (L.vent.x + L.vent.w / 2)) < 70 && R.y === 260) s = `${k.grab} pry up the vent`;
    else if (L.id === 'crawl' && !g.wiresChewed && Math.abs(R.x - L.wires!.x) < 50) s = `${k.grab} chew the wires`;
    if (!s) return;
    c.font = `600 13px "Fredoka", sans-serif`;
    const w = c.measureText(s).width + 16;
    fillRR(c, R.x - w / 2, R.y - R.h - 34, w, 22, 11, withAlpha(C.charcoal, 0.85), C.softGrey, 1.5);
    text(c, s, R.x, R.y - R.h - 23, 13, C.cream, 'center');
  }

  private bubbles(c: Ctx, g: Game) {
    const L = g.level;
    for (const s of g.says) {
      let x: number;
      let y: number;
      let accent: string = C.charcoal;
      if (s.who === 'cousin' && L.hole) {
        x = L.hole.x + L.hole.w / 2 - this.camX;
        y = L.ceilingY + 40;
        accent = '#6a6670';
        y = Math.max(y, 120);
      } else if (s.who === 'bob') {
        x = g.bob.x - this.camX;
        y = L.floorY - 126;
        accent = '#2c3a5c';
      } else {
        x = g.raccoon.x - this.camX;
        y = g.raccoon.y - g.raccoon.h - 40;
      }
      x = Math.max(60, Math.min(WORLD_VIEW_W - 60, x)) * WORLD_SCALE;
      y *= WORLD_SCALE;
      c.globalAlpha = Math.min(1, s.ttl * 3);
      const label = s.who === 'cousin' ? `Cousin: ${s.text}` : s.who === 'bob' ? `Officer Bob: ${s.text}` : s.text;
      bubble(c, label, x, y, accent);
      c.globalAlpha = 1;
    }
  }
}

function clampCam(x: number, L: Level) {
  return Math.max(0, Math.min(L.width - WORLD_VIEW_W, x));
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/** Distance along a ray to the first shelf end panel, the counter, floor or ceiling. */
function castRay(L: Level, ox: number, oy: number, dx: number, dy: number, max: number): number {
  let best = max;
  for (const u of L.units) {
    for (const px of [u.x, u.x + u.w]) {
      if (Math.abs(dx) < 1e-6) continue;
      const t = (px - ox) / dx;
      if (t <= 0.5 || t >= best) continue;
      const y = oy + dy * t;
      if (y > u.top && y < L.floorY) best = t;
    }
  }
  if (dy > 0) best = Math.min(best, (L.floorY - oy) / dy);
  if (dy < 0) best = Math.min(best, (L.ceilingY - oy) / dy);
  const k = L.counter;
  if (k) {
    for (const ex of [k.x, k.x + k.w]) {
      const t = (ex - ox) / dx;
      if (t > 0 && t < best) {
        const y = oy + dy * t;
        if (y >= k.y && y <= k.y + k.h) best = t;
      }
    }
    if (dy > 0) {
      const t = (k.y - oy) / dy;
      const x = ox + dx * t;
      if (t > 0 && t < best && x >= k.x && x <= k.x + k.w) best = t;
    }
  }
  return best;
}

function spillColour(kind: ItemKind, id: number): string {
  if (kind === 'golden') return C.gold;
  if (kind === 'rum') return '#8a4a1c';
  if (kind === 'curacao') return '#2fa8ff';
  return BOTTLE_GLASS[id % BOTTLE_GLASS.length];
}

export function drawBottle(
  c: Ctx, x: number, y: number, kind: ItemKind, id: number, rot: number,
  opts: { salute?: number; face?: number } = {},
) {
  const mini = kind === 'mini' || kind === 'golden';
  const bw = mini ? 8 : 13;
  const bh = mini ? 11 : 18;
  const nh = mini ? 5 : 9;
  const col = spillColour(kind, id);
  c.save();
  c.translate(x, y);
  if (rot) {
    c.translate(0, -(bh + nh) / 2);
    c.rotate(rot);
    c.translate(0, (bh + nh) / 2);
  }
  fillRR(c, -bw / 2, -bh, bw, bh, 3, col, C.ink, 1.5);
  fillRR(c, -bw / 5, -bh - nh, (bw * 2) / 5, nh + 2, 1.5, col, C.ink, 1.5);
  if (kind === 'curacao') {
    glow(c, 0, -bh / 2, 20, '#4fc3ff', 0.55);
    fillRR(c, -bw / 2 + 1.5, -bh * 0.65, bw - 3, bh * 0.35, 1, '#e6f6ff');
    ellipse(c, 0, -bh * 0.48, 2, 1.4, '#2fa8ff');
  } else if (kind === 'rum') {
    // The little captain on the label: tricorn hat, and a salute when you're near.
    fillRR(c, -bw / 2 + 1, -bh * 0.75, bw - 2, bh * 0.5, 1.5, '#f0dcae');
    const fx = (opts.face ?? 0) * 1.2;
    ellipse(c, fx, -bh * 0.48, 2.6, 2.6, '#e6b48c');
    c.fillStyle = C.ink;
    c.beginPath();
    c.moveTo(fx - 4, -bh * 0.56);
    c.lineTo(fx, -bh * 0.74);
    c.lineTo(fx + 4, -bh * 0.56);
    c.fill();
    if (opts.salute) {
      c.strokeStyle = '#c23a2a';
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(fx + 1.5, -bh * 0.36);
      c.lineTo(fx + 4, -bh * 0.36 - opts.salute * 4);
      c.lineTo(fx + 2.5, -bh * 0.6);
      c.stroke();
    }
  } else fillRR(c, -bw / 2 + 1.5, -bh * 0.65, bw - 3, bh * 0.35, 1, kind === 'golden' ? '#fff1b8' : C.cream);
  c.fillStyle = withAlpha('#ffffff', 0.35);
  c.fillRect(-bw / 2 + 2, -bh + 2, 2, bh - 5);
  if (kind === 'golden') glow(c, 0, -bh / 2, 16, '#fff1b8', 0.5);
  c.restore();
}

function drawTote(c: Ctx, x: number, y: number, s: number) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.strokeStyle = '#c8b68e';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(0, -10, 8, Math.PI, 0);
  c.stroke();
  fillRR(c, -13, -10, 26, 24, 4, '#e8dcbc', '#8a7a58', 2);
  ellipse(c, 0, 3, 4, 3.5, '#6a6670');
  for (const [a, b] of [[-4, -3], [0, -5], [4, -3]]) ellipse(c, a, b, 1.6, 1.6, '#6a6670');
  c.restore();
}

function drawCousin(c: Ctx, x: number, y: number, time: number, g: Game) {
  const bob = Math.sin(time * 3) * 2;
  const excited = g.says.some((s) => s.who === 'cousin');
  const yy = y + bob + (excited ? 4 : 0);
  ellipse(c, x - 16, yy - 4, 6, 4, C.grey);
  ellipse(c, x + 16, yy - 4, 6, 4, C.grey);
  ellipse(c, x, yy, 17, 14, C.grey);
  c.fillStyle = C.grey;
  c.beginPath();
  c.moveTo(x - 15, yy - 6);
  c.lineTo(x - 11, yy - 20);
  c.lineTo(x - 4, yy - 10);
  c.moveTo(x + 15, yy - 6);
  c.lineTo(x + 11, yy - 20);
  c.lineTo(x + 4, yy - 10);
  c.fill();
  ellipse(c, x, yy + 3, 15, 5.5, C.charcoal);
  ellipse(c, x - 6, yy + 3, 2.6, 2.6, C.cream);
  ellipse(c, x + 6, yy + 3, 2.6, 2.6, C.cream);
  ellipse(c, x, yy + 9, 6, 4.5, C.cream);
  ellipse(c, x, yy + 8, 2.3, 1.8, C.ink);
}

export interface RaccoonLook { buzz: number; cheeks: boolean; carry: ItemKind[]; tote: boolean }

export function drawRaccoon(c: Ctx, x: number, y: number, facing: 1 | -1, pose: string, time: number, look: RaccoonLook) {
  c.save();
  c.translate(x, y);
  c.scale(facing, 1);
  const run = pose === 'run' ? Math.sin(time * 18) : 0;
  const bounce = pose === 'run' ? Math.abs(run) * 2 : pose === 'idle' ? Math.sin(time * 3) * 0.6 : 0;

  if (pose === 'dead') {
    // Belly-up in the plush, paws in the air.
    ellipse(c, 0, -10, 17, 10, C.grey);
    ellipse(c, 0, -13, 11, 6, C.cream);
    for (const lx of [-10, -3, 5, 11]) fillRR(c, lx - 2.5, -26, 5, 12, 2.5, C.charcoal);
    ellipse(c, 18, -8, 10, 9, C.grey);
    ellipse(c, 19, -6, 9, 3.4, C.charcoal);
    c.strokeStyle = C.cream;
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(15, -7);
    c.lineTo(18, -5);
    c.moveTo(21, -7);
    c.lineTo(24, -5);
    c.stroke();
    ellipse(c, 26, -2, 2.4, 3.5, '#e07a8a');
    tail(c, -16, -8, time, 0.4);
    c.restore();
    return;
  }

  const tilt = pose === 'climb' ? -1.25 : pose === 'air' ? -0.15 : pose === 'ko' ? 0.35 + Math.sin(time * 3) * 0.08 : 0;
  if (pose === 'ko') c.scale(1.1, 0.8); // sprawled flat from the landing
  c.translate(0, -bounce);
  c.rotate(tilt);
  if (look.tote) drawTote(c, -9, -18, 0.75);
  tail(c, -14, -14, time, pose === 'run' ? 1.6 : 0.6);
  // legs
  const legs = pose === 'climb' ? [[-9, 3], [9, -3]] : [[-10, run], [-4, -run], [6, run], [11, -run]];
  for (const [lx, ph] of legs) fillRR(c, lx - 2.8 + ph * 3, -9, 5.6, 9 + (pose === 'air' ? -2 : 0), 2.8, C.charcoal);
  // body
  ellipse(c, 0, -14, 16, 10.5, C.grey);
  ellipse(c, 3, -11, 10, 5.5, C.softGrey);
  // carried bottles hugged to the chest
  const show = look.carry.slice(-3);
  show.forEach((k, i) => drawBottle(c, 10 + i * 4, -6 - i * 2, k, i * 7 + 3, -0.3));
  // head
  const hx = 14;
  const hy = pose === 'sip' ? -10 : -22;
  ellipse(c, hx - 5, hy - 9, 4.5, 6, C.grey, -0.3);
  ellipse(c, hx - 5, hy - 9, 2.2, 3.2, C.charcoal, -0.3);
  ellipse(c, hx, hy, 10.5, 9.5, C.grey);
  ellipse(c, hx + 8, hy + 3, 6.5, 4.5, C.cream);
  ellipse(c, hx + 13.5, hy + 2, 2.6, 2.2, C.ink);
  ellipse(c, hx + 2, hy - 1, 9.5, 3.8, C.charcoal);
  const lid = look.buzz >= 3 ? 1.3 : 2.4;
  if (pose === 'ko') {
    // Dizzy swirl eyes.
    ellipse(c, hx + 4, hy - 1.5, 2.6, 2.6, C.cream);
    c.strokeStyle = C.ink;
    c.lineWidth = 0.9;
    c.beginPath();
    for (let a = 0; a < 9; a += 0.4) c.lineTo(hx + 4 + Math.cos(a + time * 8) * a * 0.24, hy - 1.5 + Math.sin(a + time * 8) * a * 0.24);
    c.stroke();
  } else {
    ellipse(c, hx + 4, hy - 1.5, 2.4, lid, C.cream);
    ellipse(c, hx + 4.8, hy - 1.2, 1.1, Math.min(lid, 1.2), C.ink);
  }
  if (look.buzz >= 2) ellipse(c, hx + 4, hy + 5, 3, 2, withAlpha('#ff8aa0', 0.55 + 0.08 * look.buzz));
  if (look.cheeks) {
    ellipse(c, hx + 6, hy + 4, 6, 5, '#d9d2d8');
    ellipse(c, hx + 6, hy + 4, 3.5, 2.5, withAlpha('#ff8aa0', 0.7));
  }
  if (pose === 'sip') ellipse(c, hx + 14, hy + 6, 2.5, 3.5, '#e07a8a');
  c.restore();
  if (look.buzz >= 3 && pose !== 'sip') {
    for (let i = 0; i < 2; i++) {
      const t = (time * 0.8 + i * 0.5) % 1;
      ellipse(c, x + facing * (12 + i * 6), y - 36 - t * 18, 2 + t * 2, 2 + t * 2, withAlpha('#f4f0ff', 0.6 * (1 - t)));
    }
  }
}

function tail(c: Ctx, x: number, y: number, time: number, wag: number) {
  const segs = 6;
  for (let i = segs - 1; i >= 0; i--) {
    const k = i / segs;
    const a = -0.5 - k * 1.1 + Math.sin(time * 4 + k * 2) * 0.12 * wag;
    const tx = x - Math.cos(a) * k * 22;
    const ty = y + Math.sin(a) * k * 22;
    ellipse(c, tx, ty, 6.5 - k * 1.5, 5.5 - k * 1.2, i % 2 ? C.charcoal : C.softGrey);
  }
}
