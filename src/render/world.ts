// Draws the level and everyone in it, in world coordinates under a camera.

import { BOB, BOB_THROW, NIGHT, NIGHTS, POST_GRACE, SCRUBBER, VIEW_H, WORLD_SCALE, WORLD_VIEW_W } from '../config';
import type { Game, Raccoon } from '../sim/game';
import { isSpecial, type ItemKind, type Level } from '../sim/level';
import { bubble, C, ellipse, fillRR, glow, hash, text, withAlpha, type Ctx, mix } from './paint';
import { acUnit, building, chalkboard, crawlAttic, crawlBelow, crawlTunnel, floorProp, propHalfWidth, roofBackdrop, roofDressing, roofVent, trellis, wainscot, woodSign } from './scenery';
import { HANG } from '../sim/level';
import { caseStack, checkoutBelt, drawPossum, tillRegister } from './checkout';
import { drawBlasts, drawScorches, drawShells, drawTank } from './tank';
import { drawPowerup, POWERUP_INFO } from './powerups';
import { bigTop, bleachers, cannon, concessions, drawClown, drawCritter, drawPellet, drawPerch, drawSlicks, drawSpits, poles, spotlights } from './circus';
import { drawArcher, drawArrows, drawBale, drawCover, drawFloaters, drawStall, drawStuck, drawTrees, faireBackdrop, COVER_H, torches } from './faire';

const BOTTLE_GLASS = ['#a8562a', '#3f7d4a', '#9fc6d6', '#7a1f33', '#c9873a', '#5a3d78'];

export interface Prompts { grab: string; up: string; down: string; jump: string; throw: string; swap: string; hoot: string; powers: string }

/** Fill {grab}, {throw} and friends with the player's own keys. */
export function withKeys(s: string, k: Prompts): string {
  return s.replace(/\{(\w+)\}/g, (_, name: keyof Prompts) => k[name]);
}

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
    // The Buzz sign hangs over the middle of the screen. Up by a hole in mid-store, swing aside so your cousin isn't behind it.
    const h = L.id === 'store' ? L.hole : undefined;
    const byHole = h && R.y <= h.y + h.h + 1 && Math.abs(R.x - (h.x + h.w / 2)) < 200;
    const want = clampCam(byHole ? h.x + h.w / 2 - 190 / WORLD_SCALE : R.x + lead - WORLD_VIEW_W / 2, L);
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
    else if (L.faire) this.faire(c, g, time);
    else if (L.circus) this.circus(c, g, time);
    else this.store(c, g, time, keys);

    this.raccoon(c, g, R, time);
    if (L.id === 'store') {
      for (const b of g.bottles) {
        if (b.state === 'air' && b.owner === 'owl') drawPellet(c, b.x, b.y, time * 9);
        else if (b.state === 'air') drawBottle(c, b.x, b.y, b.kind, b.id, (time * 9 + b.id) % 6.28);
        // Rolling: lying on its side, spinning along the lane.
        else if (b.state === 'rolling') drawBottle(c, b.x, b.y + (b.kind === 'mini' || b.kind === 'golden' ? 4 : 7), b.kind, b.id, Math.PI / 2 + b.x / 9);
      }
      this.aimArc(c, g, time);
      this.bob(c, g, time);
      this.lighting(c, g, time);
      drawBlasts(c, g.blasts);
      drawFloaters(c, g.floaters);
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
    roofBackdrop(c, x0, WORLD_VIEW_W, time);
    for (const s of L.solids) if (s.w >= 100) building(c, s, x0 - 20, x0 + WORLD_VIEW_W + 20);
    roofDressing(c, time);
    acUnit(c, L.solids[2], time);
    trellis(c, L.climbables[0]);
    roofVent(c, L.vent!);
    for (const s of L.signs) woodSign(c, s, L);
  }

  /* ------------------------------------------------------------ crawl */

  private crawl(c: Ctx, g: Game, time: number) {
    const L = g.level;
    const w = L.wires!;
    crawlBelow(c, L, L.tile!, g.powerOut, time);
    crawlAttic(c, L);
    crawlTunnel(c, L, w, time);
    c.save();
    c.globalCompositeOperation = 'lighter';
    glow(c, g.raccoon.x, g.raccoon.y - 14, 110, C.cream, 0.07);
    c.restore();
    // Wires
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
    for (const s of L.signs) woodSign(c, s, L);
  }

  /* ------------------------------------------------------------ store */

  private store(c: Ctx, g: Game, time: number, keys: Prompts) {
    const L = g.level;
    const x0 = this.camX - 40;
    const x1 = this.camX + WORLD_VIEW_W + 40;
    const frac = g.t / g.nightLength;

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
      fillRR(c, win.x - 240, 70, 400, 56, 8, '#24304f', '#c9a96a', 3);
      text(c, 'ABC Store', win.x - 40, 92, 28, C.cream, 'center', 700);
      text(c, 'Virginia · Beer · Wine · Spirits', win.x - 40, 114, 12, C.creamDim, 'center', 500);
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

    if (L.props) wainscot(c, x0, x1, L.floorY);

    // Floor + rug
    c.fillStyle = '#6a4127';
    c.fillRect(x0, L.floorY, x1 - x0, 40);
    for (let x = Math.floor(x0 / 90) * 90; x < x1; x += 90) {
      c.fillStyle = '#5a361f';
      c.fillRect(x, L.floorY, 2, 40);
    }
    const rug = L.rugX ?? 900;
    fillRR(c, rug, L.floorY + 4, 520, 14, 4, '#7d2f37');
    c.fillStyle = withAlpha('#e2b56a', 0.5);
    c.fillRect(rug + 10, L.floorY + 9, 500, 3);

    // Tutorial chalkboards and whatever's stacked along the wall
    for (const p of L.posters ?? []) {
      if (p.x + p.w / 2 > x0 && p.x - p.w / 2 < x1) chalkboard(c, p, L.ceilingY, (s) => withKeys(s, keys));
    }
    for (const p of L.props ?? []) {
      if (p.x + propHalfWidth(p) > x0 && p.x - propHalfWidth(p) < x1) floorProp(c, p, L.floorY, time);
    }

    if (L.possum && L.possum.x2 > x0 && L.possum.x1 < x1) caseStack(c, L.possum, L.floorY);

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
    const shelfBottles = () => this.shelfBottles(c, g, time, x0, x1);
    const wash = NIGHTS[g.night - 1].wash;
    if (!wash) shelfBottles();
    L.units.forEach((u) => {
      if (u.x > x1 || u.x + u.w < x0) return;
      fillRR(c, u.x - 6, u.top - 14, 12, L.floorY - u.top + 14, 3, C.wood, C.woodDark, 2);
      fillRR(c, u.x + u.w - 6, u.top - 14, 12, L.floorY - u.top + 14, 3, C.wood, C.woodDark, 2);
    });

    this.plushDisplay(c, g, time, 'PLUSH PALS');

    // Tote rack
    const tt = L.powerup!;
    c.fillStyle = '#6d6a70';
    c.fillRect(tt.x + tt.w / 2 - 2, tt.y - 30, 4, L.floorY - tt.y + 30);
    c.fillRect(tt.x - 4, tt.y - 30, tt.w + 8, 4);

    // Counter, register, mini-bottle rack
    const k = L.counter!;
    fillRR(c, k.x, k.y, k.w, k.h, 4, C.wood, C.woodDark, 2.5);
    fillRR(c, k.x - 6, k.y - 6, k.w + 12, 10, 3, C.woodLight, C.woodDark, 2);
    if (L.register) tillRegister(c, L.register, g.till, time);
    else {
      fillRR(c, k.x + 140, k.y - 40, 56, 34, 5, '#55565c', C.ink, 2);
      fillRR(c, k.x + 146, k.y - 34, 30, 12, 2, '#2d4a3a');
    }
    if (L.belt) {
      checkoutBelt(c, L.belt, time);
      for (const b of g.bottles) if (b.state === 'belt') drawBottle(c, b.x, b.y - 7, b.kind, b.id, 0);
    }
    this.miniRack(c, g, time);

    // Tonight's colour goes over the store itself. The bottles and everyone in the store go on top, so they stand out against it.
    if (wash) {
      c.save();
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = wash;
      c.fillRect(x0 - 40, -40, x1 - x0 + 80, VIEW_H + 80);
      c.restore();
      shelfBottles();
    }
    if (!g.has(tt.kind)) drawPowerup(c, tt.kind, tt.x + tt.w / 2, tt.y + 14, 1); // on top of the wash, so it catches the eye
    drawScorches(c, g.blasts, x0, x1);

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

    this.floorMarks(c, g, time, x0, x1);

    if (g.possum) drawPossum(c, g.possum, time);
    if (!g.tutorial) this.scrubber(c, g, time);
    drawShells(c, g.shells);
  }

  private plushDisplay(c: Ctx, g: Game, time: number, label: string) {
    const p = g.level.plush!;
    const L = g.level;
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
    text(c, label, p.x + p.w / 2, p.y + 28, 12, C.cream, 'center', 700);
  }

  private miniRack(c: Ctx, g: Game, time: number) {
    const rk = g.level.rack!;
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
  }

  private floorMarks(c: Ctx, g: Game, time: number, x0: number, x1: number) {
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
  }

  /** Night 4: inside the big top. */
  private circus(c: Ctx, g: Game, time: number) {
    const L = g.level;
    const x0 = this.camX - 40;
    const x1 = this.camX + WORLD_VIEW_W + 40;
    bigTop(c, L, x0, x1, time, g.t / g.nightLength);
    const h = L.hole!;
    drawCousin(c, h.x + h.w / 2, L.ceilingY + 4, time, g);
    for (const k of g.critters) drawPerch(c, k, L.floorY);
    bleachers(c, L, x0, x1);
    poles(c, L, time);
    this.shelfBottles(c, g, time, x0, x1);
    this.plushDisplay(c, g, time, 'PRIZES');
    const pu = L.powerup!;
    c.fillStyle = '#e6c25a';
    c.fillRect(pu.x + pu.w / 2 - 2, pu.y - 30, 4, L.floorY - pu.y + 30);
    c.fillRect(pu.x - 4, pu.y - 30, pu.w + 8, 4);
    if (!g.has(pu.kind)) drawPowerup(c, pu.kind, pu.x + pu.w / 2, pu.y + 14, 1);
    concessions(c, L.counter!);
    this.miniRack(c, g, time);
    if (L.cannon) cannon(c, L.cannon, L.floorY, time);
    drawSlicks(c, g.slicks, L.floorY);
    this.floorMarks(c, g, time, x0, x1);
    for (const k of g.clowns) if (k.x > x0 - 60 && k.x < x1 + 60) drawClown(c, k, L.floorY, time);
    for (const k of g.critters) drawCritter(c, k, L.floorY, time);
    drawSpits(c, g.spits);
    spotlights(c, L, time);
  }

  /** Night 3: the faire in the woods. Same world as a store underneath: branches are boards and trunks are units. */
  private faire(c: Ctx, g: Game, time: number) {
    const L = g.level;
    const x0 = this.camX - 40;
    const x1 = this.camX + WORLD_VIEW_W + 40;
    faireBackdrop(c, L, x0, x1, this.camX, time, g.t / g.nightLength);
    torches(c, L, time);
    drawTrees(c, L, x0, x1, time);
    const h = L.hole!;
    drawCousin(c, h.x + h.w / 2, L.ceilingY + 4, time, g);
    for (const b of L.bales ?? []) if (b.x + b.w > x0 && b.x < x1) drawBale(c, b);
    this.shelfBottles(c, g, time, x0, x1);
    this.plushDisplay(c, g, time, 'PRIZES');
    const pu = L.powerup!;
    c.fillStyle = '#5f412b';
    c.fillRect(pu.x + pu.w / 2 - 2, pu.y - 30, 4, L.floorY - pu.y + 30);
    c.fillRect(pu.x - 4, pu.y - 30, pu.w + 8, 4);
    if (!g.has(pu.kind)) drawPowerup(c, pu.kind, pu.x + pu.w / 2, pu.y + 14, 1);
    drawStall(c, L.counter!);
    this.miniRack(c, g, time);
    this.floorMarks(c, g, time, x0, x1);
    L.archers?.forEach((a, i) => {
      if (a.x < x0 - 80 || a.x > x1 + 80) return;
      drawArcher(c, g.archers[i], L.floorY, COVER_H[a.cover], time);
      drawCover(c, a.cover, a.x, L.floorY);
    });
    drawStuck(c, g.stuck);
    drawArrows(c, g.arrows);
  }

  private shelfBottles(c: Ctx, g: Game, time: number, x0: number, x1: number) {
    const lit = g.highlighted();
    for (const b of g.bottles) {
      if (b.state !== 'shelf' || b.x < x0 || b.x > x1) continue;
      const hang = g.hanging(b);
      const y = hang ? b.y + HANG : b.y;
      if (hang) {
        c.strokeStyle = 'rgba(233,222,190,0.75)';
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(b.x, b.y + 8);
        c.lineTo(b.x, y - 26);
        c.stroke();
      }
      if (b === lit) {
        glow(c, b.x, y - 14, 26, C.gold, 0.55 + 0.2 * Math.sin(time * 8));
        c.beginPath();
        c.moveTo(b.x - 5, y - 40 + Math.sin(time * 6) * 2);
        c.lineTo(b.x + 5, y - 40 + Math.sin(time * 6) * 2);
        c.lineTo(b.x, y - 33 + Math.sin(time * 6) * 2);
        c.fillStyle = C.gold;
        c.fill();
      }
      // The rum captain turns his head and salutes when you get close.
      const near = Math.hypot(g.raccoon.x - b.x, g.raccoon.y - b.y) < 90;
      drawBottle(c, b.x, y, b.kind, b.id, 0, { salute: b.kind === 'rum' && near ? Math.min(1, (time * 4) % 6) : 0, face: Math.sign(g.raccoon.x - b.x) });
      if (isSpecial(b.kind)) drawSmoke(c, b.x, y - 27, b.kind, b.id, time);
    }
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
    if (S.tank && S.state === 'down') return drawTank(c, S, y, time, g.camOrigin());
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
    const watching = S.state === 'patrol' || S.state === 'peek';
    const o = g.camOrigin();
    if (watching) {
      // The snitch-cam's cone: cool cyan, cut by shelf panels and boards, same as the sim's sight check.
      const pts: { x: number; y: number }[] = [o];
      const hits: { x: number; y: number; t: number }[] = [];
      const n = 24;
      for (let i = 0; i <= n; i++) {
        const a = S.cam - SCRUBBER.camHalf + (2 * SCRUBBER.camHalf * i) / n;
        const dx = S.dir * Math.cos(a);
        const dy = -Math.sin(a);
        const { t, post } = castRay(g.level, o.x, o.y, dx, dy, SCRUBBER.camRange, true);
        pts.push({ x: o.x + dx * t, y: o.y + dy * t });
        if (post !== undefined) hits.push({ x: post, y: o.y + dy * t, t });
      }
      c.save();
      c.globalCompositeOperation = 'lighter';
      const gr = c.createRadialGradient(o.x, o.y, 3, o.x, o.y, SCRUBBER.camRange);
      gr.addColorStop(0, withAlpha('#22b8ff', 0.5));
      gr.addColorStop(1, withAlpha('#22b8ff', 0));
      c.fillStyle = gr;
      c.beginPath();
      pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
      c.closePath();
      c.fill();
      // Scan lines sliding along the cone.
      c.strokeStyle = withAlpha('#9fe4ff', 0.18);
      c.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        const r = ((time * 90 + k * 80) % SCRUBBER.camRange) + 10;
        c.beginPath();
        c.arc(o.x, o.y, r, S.dir === 1 ? -S.cam - SCRUBBER.camHalf : Math.PI + S.cam - SCRUBBER.camHalf, S.dir === 1 ? -S.cam + SCRUBBER.camHalf : Math.PI + S.cam + SCRUBBER.camHalf);
        c.stroke();
      }
      postSplash(c, g.level, hits, '#22b8ff', 0.5, SCRUBBER.camRange);
      c.restore();
    }
    if (S.tank) return drawTank(c, S, y, time, o);
    // The telescoping pole, when the eye is up.
    const raised = S.eye > SCRUBBER.h + 2;
    if (raised) {
      const px = S.x + S.dir * 4;
      const top = y - S.eye;
      const len = y - 26 - top;
      for (let k = 0; k < 3; k++) {
        const w0 = 7 - k * 2;
        const y0 = y - 26 - (len * k) / 3;
        fillRR(c, px - w0 / 2, y0 - len / 3 - 2, w0, len / 3 + 4, 1.5, k % 2 ? '#8f989f' : '#a9b2b8', C.ink, 1.2);
      }
    }
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
    const lens = rush ? (blink ? '#ff5a44' : '#7a2a20') : blink ? '#6fd3ff' : '#2a5a70';
    if (raised) {
      // Camera head up on the pole, lens toward where it's looking.
      fillRR(c, S.x + S.dir * 4 - 9, o.y - 7, 18, 14, 4, '#5f6670', C.ink, 2);
      ellipse(c, o.x, o.y, 4, 4, lens);
      glow(c, o.x, o.y, 10, '#6fd3ff', 0.35);
    } else ellipse(c, o.x, o.y, 4, 4, lens);
    for (let i = 0; i < 2; i++) {
      const bx = S.x + (i ? 1 : -1) * 14;
      ellipse(c, bx, y - 2, 7, 3, '#3a6fb0', (time * (rush ? 20 : 8)) % 3.14);
    }
    if (rush) text(c, '!', S.x, y - 46, 22, C.red, 'center', 700);
    if (S.state === 'alarm') {
      // The snitch: a spinning red and blue light and a WEE-OO.
      const red = Math.sin(time * 14) > 0;
      fillRR(c, S.x - 6, y - 34, 12, 8, 3, red ? '#ff3b30' : '#3a7bff', C.ink, 1.5);
      c.save();
      c.globalCompositeOperation = 'lighter';
      const gr = c.createRadialGradient(S.x, y - 30, 2, S.x, y - 30, 120);
      gr.addColorStop(0, withAlpha(red ? '#ff3b30' : '#3a7bff', 0.55));
      gr.addColorStop(1, withAlpha(red ? '#ff3b30' : '#3a7bff', 0));
      c.fillStyle = gr;
      c.fillRect(S.x - 120, y - 150, 240, 150);
      c.restore();
      text(c, red ? 'WEE-' : 'OOO!', S.x, y - 52, 16, red ? '#ff6a60' : '#7aa8ff', 'center', 700);
    }
    if (S.state === 'slurp') text(c, 'slurrrp', S.x, y - 44, 14, '#a8e0ff', 'center');
  }

  /* -------------------------------------------------------------- bob */

  private bob(c: Ctx, g: Game, time: number) {
    const B = g.bob;
    if (B.state === 'outside') return;
    const L = g.level;
    const fy = L.floorY;
    // On faire night he's in period garb: motley hose, a tunic, a feathered hat. At the circus he's the ringmaster:
    // white breeches, red tailcoat, top hat. He kept the flashlight both times.
    const garb = L.faire
      ? { legA: '#7a2f3a', legB: '#2f5a7a', body: '#a8843a', belt: '#4a2a1a', badge: '#f0d27a', cap: '#2f6a4a' }
      : L.circus
      ? { legA: '#ece4d2', legB: '#ded4c0', body: '#b5232f', belt: '#1d1a20', badge: '#e6c25a', cap: '#1d1a20' }
      : { legA: '#4b4a3a', legB: '#55543f', body: '#a89668', belt: '#3d3528', badge: '#cfa64a', cap: '#2c3a5c' };
    const o = g.beamOrigin();
    if (B.state === 'down') {
      // Flat on his back, flashlight rolling loose, stars overhead.
      const x = B.x;
      ellipse(c, x, fy - 1, 52, 6, withAlpha('#000', 0.35));
      fillRR(c, x - 44, fy - 14, 40, 12, 5, garb.legA, C.ink, 2);
      fillRR(c, x - 8, fy - 22, 42, 20, 9, garb.body, C.ink, 2.5);
      ellipse(c, x + 46, fy - 13, 12, 12, '#e6b48c');
      fillRR(c, x + 52, fy - 26, 10, 26, 4, garb.cap);
      ellipse(c, x + 46, fy - 16, 2, 2, C.ink);
      fillRR(c, x - 60, fy - 9, 10, 8, 2, '#33333a');
      for (let i = 0; i < 3; i++) text(c, '✶', x + 46 + Math.cos(time * 4 + i * 2.1) * 18, fy - 40 + Math.sin(time * 4 + i * 2.1) * 6, 13, C.gold, 'center', 700);
      return;
    }

    // Flashlight cone, cut by the same shelf panels and counter the sim uses.
    const chase = B.state === 'chase' || B.state === 'shout';
    const pts: { x: number; y: number }[] = [o];
    const hits: { x: number; y: number; t: number }[] = [];
    const n = 28;
    for (let i = 0; i <= n; i++) {
      const a = B.beam - BOB.beamHalf + (2 * BOB.beamHalf * i) / n;
      const dx = B.dir * Math.cos(a);
      const dy = -Math.sin(a);
      const { t, post } = castRay(L, o.x, o.y, dx, dy, BOB.beamRange);
      pts.push({ x: o.x + dx * t, y: o.y + dy * t });
      if (post !== undefined) hits.push({ x: post, y: o.y + dy * t, t });
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
    postSplash(c, L, hits, chase ? '#fff4c8' : '#ffe9a6', chase ? 0.75 : 0.6, BOB.beamRange);
    c.restore();

    const x = B.x;
    const d = B.dir;
    const moving = B.state === 'search' || B.state === 'investigate' || B.state === 'chase';
    const ph = moving ? Math.sin(time * (B.state === 'chase' ? 12 : 6)) : 0;
    ellipse(c, x, fy - 1, 26, 5, withAlpha('#000', 0.35));
    // legs
    fillRR(c, x - 12 + ph * 5, fy - 40, 11, 38, 4, garb.legA, C.ink, 2);
    fillRR(c, x + 1 - ph * 5, fy - 40, 11, 38, 4, garb.legB, C.ink, 2);
    fillRR(c, x - 14 + ph * 5, fy - 8, 15, 8, 3, '#2a2220');
    fillRR(c, x - 1 - ph * 5, fy - 8, 15, 8, 3, '#2a2220');
    // body
    fillRR(c, x - 17, fy - 78, 34, 42, 10, garb.body, C.ink, 2.5);
    c.fillStyle = garb.belt;
    c.fillRect(x - 17, fy - 42, 34, 5);
    fillRR(c, x - d * 4 - 5, fy - 72, 10, 10, 2, garb.badge);
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
    fillRR(c, x - 14 + d * 2, fy - 106, 28, 10, 4, garb.cap);
    fillRR(c, x + (d > 0 ? 6 : -22), fy - 99, 16, 4, 2, garb.cap);
    if (L.circus) {
      // The top hat, with a gold band.
      fillRR(c, x - 11 + d * 2, fy - 132, 22, 28, 3, garb.cap, C.ink, 1.5);
      fillRR(c, x - 11 + d * 2, fy - 112, 22, 4, 1, '#e6c25a');
    }
    if (L.faire) {
      // A very proud feather.
      c.strokeStyle = '#f4efe4';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x - d * 10, fy - 104);
      c.quadraticCurveTo(x - d * 30, fy - 128, x - d * 40, fy - 112);
      c.stroke();
    }
    ellipse(c, x + d * 8, fy - 91, 2, 2, C.ink);
    fillRR(c, x + d * 4 - 6, fy - 85, 12, 4, 2, '#6b4a30');
    if (B.state === 'look' || B.state === 'confused') text(c, '?', x, fy - 122, 20, C.cream, 'center', 700);
    if (B.state === 'shout') text(c, '!', x, fy - 124, 26, C.red, 'center', 700);
    // flashlight arm
    c.strokeStyle = garb.body;
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(x + d * 6, fy - 70);
    c.lineTo(o.x, o.y);
    c.stroke();
    fillRR(c, o.x - 5, o.y - 4, 10, 8, 2, '#33333a');
    if (B.holding) {
      // Winding up: the bottle raised high over his head, so you see it coming.
      const hx = x + d * 14;
      const hy = fy - 104 - 6 * Math.sin((B.windT / BOB_THROW.windup) * Math.PI);
      c.strokeStyle = garb.body;
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(x - d * 4, fy - 72);
      c.lineTo(hx, hy + 6);
      c.stroke();
      drawBottle(c, hx, hy + 4, B.holding, 0, -d * 0.5);
      text(c, '!', x - d * 10, fy - 124, 24, C.red, 'center', 700);
    }
  }

  /* ------------------------------------------------------------ light */

  private lighting(c: Ctx, g: Game, time: number) {
    const L = g.level;
    const x0 = this.camX - 40;
    c.fillStyle = 'rgba(20,10,26,0.28)';
    c.fillRect(x0, 0, WORLD_VIEW_W + 80, VIEW_H);
    c.save();
    c.globalCompositeOperation = 'lighter';
    const lights = L.lights ?? [330, 1000, 1500, 2150, 2760];
    const { lamp, bulb } = NIGHTS[g.night - 1];
    for (const lx of lights) {
      if (lx < x0 - 300 || lx > x0 + WORLD_VIEW_W + 380) continue;
      const pulse = 0.85 + 0.15 * Math.sin(time * 3 + lx);
      if (L.circus) continue; // the big top draws its own spotlights
      glow(c, lx, L.faire ? L.floorY - 118 : L.ceilingY + 10, 260, lamp, (L.faire ? 0.3 : 0.22) * pulse);
    }
    glow(c, g.raccoon.x, g.raccoon.y - 14, 120, C.warm, 0.08);
    c.restore();
    if (!L.faire && !L.circus) for (const lx of lights) {
      fillRR(c, lx - 16, L.ceilingY, 32, 12, 4, '#3a1c18', C.ink, 1.5);
      ellipse(c, lx, L.ceilingY + 8, 9, 5, bulb);
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
      sneakers: R.sprint,
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
    // Bubbles fizzing off the champagne: more of them, higher, the more it's shaken.
    for (let i = 0; i < Math.ceil(R.fizz * 8); i++) {
      const k = (time * 1.6 + i * 0.37) % 1;
      ellipse(c, R.x + R.facing * 14 + Math.sin(k * 9 + i) * 6, R.y - 22 - k * (20 + R.fizz * 34), 1.6 + hash(i) * 1.4, 1.6 + hash(i) * 1.4, withAlpha('#fff3c4', 0.85 * (1 - k)));
    }
    // The spray blasting out behind a popped cork.
    if (R.rocketT > 0) {
      for (let i = 0; i < 14; i++) {
        const k = hash(i + Math.floor(time * 30));
        ellipse(c, R.x - R.facing * (20 + k * 80), R.y - 16 + (hash(i * 3) - 0.5) * 26 * k, 3 - k * 2, 3 - k * 2, withAlpha('#fff3c4', 0.9 - k * 0.7));
      }
    }
  }

  /* ---------------------------------------------------------- prompts */

  private prompts(c: Ctx, g: Game, k: Prompts) {
    const R = g.raccoon;
    const L = g.level;
    if (R.state !== 'move' && R.state !== 'playdead') return;
    let s = '';
    if (L.id === 'store') {
      if (g.atHole() && g.tutorial) s = R.carry.length ? `${k.grab} hand up` : g.lesson ? '' : `${k.up} finish the tutorial`;
      else if (g.atHole()) s = R.carry.length ? `${k.grab} hand up · ${k.up} climb out` : `${k.up} climb out (ends the night)`;
      else if (R.state === 'playdead') s = 'playing dead…';
      else if (g.onPlush() && (g.bobInside || g.tutorial)) s = `${k.down} play dead`;
      else if (g.atBelt() && R.carry.length) s = `${k.grab} put on the belt`;
      else if (g.atTill()) s = `${k.grab} mash the till`;
      else if (g.spills.some((sp) => Math.abs(sp.y - R.y) < 1 && R.grounded && Math.abs(sp.x - R.x) < 32)) s = `${k.grab} lap it up`;
      else if (R.aimT !== null) s = `let go to lob · ${k.down} drop · ←/→ roll`;
      else if (g.highlighted()) s = `${k.grab} grab · hold ${k.throw} to throw`;
      else if (R.fizz > 0.2) s = `tap ${k.grab} to pop the cork`;
      else if (L.powerup && !g.has(L.powerup.kind) && R.grounded && R.y === L.floorY && Math.abs(R.x - (L.powerup.x + L.powerup.w / 2)) < 40) s = `${k.grab} take the ${POWERUP_INFO[L.powerup.kind].name.toLowerCase()}`;
      else if (R.grounded && R.y === L.counter!.y && Math.abs(R.x - (L.rack!.x + L.rack!.w / 2)) < 50 && g.rack.stock > 0) s = `${k.grab} spin the mini-bottle rack`;
      else if (R.carry.length && R.grounded && Math.abs(R.vx) < 20) s = `${k.throw} throw · ${k.hoot} hoot${R.carry.length > 1 ? ` · ${k.swap} switch` : ''}`;
    } else if (L.id === 'roof' && L.vent && g.reaches(L.vent)) s = `${k.grab} pry up the vent`;
    else if (L.id === 'crawl' && L.wires && !g.wiresChewed && g.reaches(L.wires, 20)) s = `${k.grab} chew the wires`;
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
      if (s.who === 'cousin' && L.hole) {
        x = L.hole.x + L.hole.w / 2 - this.camX;
        y = L.ceilingY + 40;
        y = Math.max(y, 120);
      } else if (s.who === 'bob') {
        x = g.bob.x - this.camX;
        y = L.floorY - 126;
      } else if (s.who === 'possum' && g.possum) {
        x = g.possum.x - this.camX;
        y = g.possum.y - 44;
      } else {
        x = g.raccoon.x - this.camX;
        y = g.raccoon.y - g.raccoon.h - 40;
      }
      x = Math.max(60, Math.min(WORLD_VIEW_W - 60, x)) * WORLD_SCALE;
      y *= WORLD_SCALE;
      c.globalAlpha = Math.min(1, s.ttl * 3);
      const label = s.who === 'cousin' ? `Cousin: ${s.text}` : s.who === 'bob' ? `${g.level.faire ? 'Sir Bob' : g.level.circus ? 'Ringmaster Bob' : 'Officer Bob'}: ${s.text}` : s.who === 'possum' ? `Possum: ${s.text}` : s.text;
      bubble(c, label, x, y);
      c.globalAlpha = 1;
    }
  }
}

function clampCam(x: number, L: Level) {
  return Math.max(0, Math.min(L.width - WORLD_VIEW_W, x));
}

/** Distance along a ray to the first shelf end panel, the counter, floor or ceiling. */
/** How far a ray goes before something stops it. `post` is the x of the shelf end post that stopped it, if one did. */
function castRay(L: Level, ox: number, oy: number, dx: number, dy: number, max: number, boards = false): { t: number; post?: number } {
  let best = max;
  let post: number | undefined;
  // The scrubber's camera can't see through a shelf board either.
  if (boards && Math.abs(dy) > 1e-6) {
    for (const bd of L.boards) {
      if (bd.unit < 0) continue;
      const t = (bd.y - oy) / dy;
      if (t <= 0.5 || t >= best) continue;
      const x = ox + dx * t;
      if (x > bd.x1 && x < bd.x2) best = t;
    }
  }
  for (const u of L.units) {
    for (const px of [u.x, u.x + u.w]) {
      if (Math.abs(dx) < 1e-6 || Math.abs(px - ox) < POST_GRACE) continue;
      const t = (px - ox) / dx;
      if (t <= 0.5 || t >= best) continue;
      const y = oy + dy * t;
      if (y > u.top && y < L.floorY) {
        best = t;
        post = px;
      }
    }
  }
  const flat = dy > 0 ? (L.floorY - oy) / dy : dy < 0 ? (L.ceilingY - oy) / dy : Infinity;
  if (flat < best) {
    best = flat;
    post = undefined;
  }
  const k = L.counter;
  if (k) {
    for (const ex of [k.x, k.x + k.w]) {
      const t = (ex - ox) / dx;
      if (t > 0 && t < best) {
        const y = oy + dy * t;
        if (y >= k.y && y <= k.y + k.h) {
          best = t;
          post = undefined;
        }
      }
    }
    if (dy > 0) {
      const t = (k.y - oy) / dy;
      const x = ox + dx * t;
      if (t > 0 && t < best && x >= k.x && x <= k.x + k.w) {
        best = t;
        post = undefined;
      }
    }
  }
  return { t: best, post };
}

/**
 * Where a cone is stopped by a shelf end post, light up that post, so the cut reads as the light
 * hitting the end of the shelf rather than slipping behind it.
 */
function postSplash(c: Ctx, L: Level, hits: { x: number; y: number; t: number }[], col: string, alpha: number, range: number) {
  const byPost = new Map<number, { y0: number; y1: number; t: number }>();
  for (const h of hits) {
    const s = byPost.get(h.x);
    if (!s) byPost.set(h.x, { y0: h.y, y1: h.y, t: h.t });
    else {
      s.y0 = Math.min(s.y0, h.y);
      s.y1 = Math.max(s.y1, h.y);
      s.t = Math.min(s.t, h.t);
    }
  }
  for (const [x, s] of byPost) {
    const a = alpha * (1 - s.t / range);
    const y0 = Math.max(s.y0 - 6, 0);
    const y1 = Math.min(s.y1 + 6, L.floorY);
    const gr = c.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, withAlpha(col, 0));
    gr.addColorStop(0.5, withAlpha(col, a));
    gr.addColorStop(1, withAlpha(col, 0));
    c.fillStyle = gr;
    c.fillRect(x - 6, y0, 12, y1 - y0);
    glow(c, x, (y0 + y1) / 2, Math.max(14, (y1 - y0) / 2), col, a * 0.5);
  }
}

function spillColour(kind: ItemKind, id: number): string {
  if (kind === 'golden') return C.gold;
  if (kind === 'champagne') return '#e9d98a';
  if (kind === 'can') return '#b8c0c8';
  if (kind === 'rum') return '#8a4a1c';
  if (kind === 'curacao') return '#2fa8ff';
  return BOTTLE_GLASS[id % BOTTLE_GLASS.length];
}

/** Specials smoke while they sit on the shelf, so you can pick them out from across the store (host). */
function drawSmoke(c: Ctx, x: number, y: number, kind: ItemKind, id: number, time: number) {
  const col = kind === 'curacao' ? '#a8e0ff' : '#efe2cc';
  for (let i = 0; i < 6; i++) {
    const p = (time * 0.5 + id * 0.37 + i / 6) % 1; // 0 at the neck, 1 gone
    const sway = Math.sin(p * 6 + time * 1.4 + id) * (1 + p * 8);
    ellipse(c, x + sway, y - p * 50, 2.5 + p * 6, 2 + p * 5, withAlpha(col, 0.75 * (1 - p) * Math.min(1, p * 8)));
  }
}

export function drawBottle(
  c: Ctx, x: number, y: number, kind: ItemKind, id: number, rot: number,
  opts: { salute?: number; face?: number } = {},
) {
  if (kind === 'can') return drawCan(c, x, y, rot);
  if (kind === 'champagne') return drawChampagne(c, x, y, rot);
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

/** A dented soda can, for the possum to throw. */
function drawCan(c: Ctx, x: number, y: number, rot: number) {
  c.save();
  c.translate(x, y - 8);
  c.rotate(rot);
  fillRR(c, -5, -8, 10, 16, 2, '#c8cdd2', C.ink, 1.5);
  c.fillStyle = '#c23a2a';
  c.fillRect(-3.5, -4, 7, 7);
  c.restore();
}

/** Dark green with gold foil on the neck and a cream label, so it reads as bubbly from across the store. */
function drawChampagne(c: Ctx, x: number, y: number, rot: number) {
  c.save();
  c.translate(x, y);
  if (rot) {
    c.translate(0, -15);
    c.rotate(rot);
    c.translate(0, 15);
  }
  fillRR(c, -7, -20, 14, 20, 4, '#1f4a33', C.ink, 1.5);
  fillRR(c, -3, -31, 6, 13, 2, '#1f4a33', C.ink, 1.5);
  fillRR(c, -3.5, -34, 7, 11, 2, C.gold, C.ink, 1.2);
  fillRR(c, -5, -14, 10, 8, 1, C.cream);
  c.fillStyle = C.gold;
  c.fillRect(-5, -11, 10, 1.5);
  c.fillStyle = withAlpha('#ffffff', 0.3);
  c.fillRect(-5, -18, 2, 14);
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

export interface RaccoonLook { buzz: number; cheeks: boolean; carry: ItemKind[]; sneakers: number }

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
  tail(c, -14, -14, time, pose === 'run' ? 1.6 : 0.6);
  // legs
  const legs = pose === 'climb' ? [[-9, 3], [9, -3]] : [[-10, run], [-4, -run], [6, run], [11, -run]];
  for (const [lx, ph] of legs) fillRR(c, lx - 2.8 + ph * 3, -9, 5.6, 9 + (pose === 'air' ? -2 : 0), 2.8, C.charcoal);
  // The sneakers show only while they're working, and fade out with the boost.
  if (look.sneakers > 0) {
    c.save();
    c.globalAlpha = look.sneakers;
    const foot = pose === 'air' ? -2 : 0;
    for (const [lx, ph] of legs) {
      fillRR(c, lx - 3.4 + ph * 3, foot - 4.6, 9, 4.6, 2, '#e8463a', C.ink, 0.8);
      fillRR(c, lx - 3.4 + ph * 3, foot - 1.5, 9, 1.5, 0.7, '#f4efe4');
    }
    c.restore();
  }
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
