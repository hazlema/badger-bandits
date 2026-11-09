// Night 3: the Renaissance faire in the woods. Moonlit sky, trees, tents, hay, archers and their arrows.

import { ARCHER, NIGHT, WORLD_VIEW_W } from '../config';
import type { Archer, Arrow, Floater, StuckArrow } from '../sim/game';
import type { CoverKind, Level, Rect } from '../sim/level';
import { C, ellipse, fillRR, glow, hash, mix, text, withAlpha, type Ctx } from './paint';

const TENTS = [
  { x: 40, w: 150, a: '#7a2f3a', b: '#e2cfa0' },
  { x: 860, w: 190, a: '#2f5a7a', b: '#e2cfa0' },
  { x: 1370, w: 160, a: '#5a3f7a', b: '#e6c25a' },
  { x: 2330, w: 200, a: '#7a2f3a', b: '#e6c25a' },
  { x: 2840, w: 170, a: '#2f6a4a', b: '#e2cfa0' },
  { x: 3260, w: 150, a: '#2f5a7a', b: '#e6c25a' },
];
const BANNERS = [
  { x: 1860, text: 'YE OLDE FAIRE' },
  { x: 3560, text: 'MEAD' },
];

export function faireBackdrop(c: Ctx, L: Level, x0: number, x1: number, camX: number, time: number, frac: number) {
  const dawn = Math.max(0, (frac - NIGHT.dawnLightFrom) / (1 - NIGHT.dawnLightFrom));
  const sky = c.createLinearGradient(0, 0, 0, L.floorY);
  sky.addColorStop(0, mix('#0d1a38', '#7aa0d6', dawn));
  sky.addColorStop(0.75, mix('#274a6a', '#f7c38a', dawn));
  sky.addColorStop(1, mix('#3a6a62', '#ffd9a0', dawn));
  c.fillStyle = sky;
  c.fillRect(x0, -40, x1 - x0, L.floorY + 40);

  // Stars and moon stay put in the sky as you run.
  const sx = camX - 40;
  for (let i = 0; i < 90; i++) {
    const a = (0.35 + 0.5 * Math.abs(Math.sin(time * 1.4 + i))) * (1 - dawn);
    ellipse(c, sx + hash(i) * (WORLD_VIEW_W + 80), 20 + hash(i + 200) * 260, 1.2, 1.2, withAlpha('#ffffff', a));
  }
  const mx = camX + 760;
  const my = 130 + dawn * 150;
  glow(c, mx, my, 150, '#dfeaff', 0.3 * (1 - dawn));
  ellipse(c, mx, my, 40, 40, withAlpha('#f3efd8', 1 - dawn * 0.9));
  ellipse(c, mx + 12, my - 8, 7, 7, withAlpha('#d8d3bc', 1 - dawn));
  ellipse(c, mx - 14, my + 12, 5, 5, withAlpha('#d8d3bc', 1 - dawn));

  // Distant hills and a treeline, moving slower than the world.
  layer(c, L, x0, x1, camX * 0.72, 340, 40, 0.006, mix('#1c3a46', '#a0a08e', dawn));
  treeline(c, L, x0, x1, camX * 0.5, mix('#16323a', '#6d7a60', dawn));

  // Striped pavilions at the back of the grounds.
  for (const t of TENTS) if (t.x + t.w > x0 && t.x < x1) tent(c, t, L.floorY, time);
  for (const b of BANNERS) if (b.x + 180 > x0 && b.x - 180 < x1) banner(c, b.x, b.text, time);

  // Grass.
  const ground = c.createLinearGradient(0, L.floorY, 0, L.floorY + 40);
  ground.addColorStop(0, mix('#2f5a35', '#5e8a48', dawn));
  ground.addColorStop(1, mix('#1a3423', '#37592f', dawn));
  c.fillStyle = ground;
  c.fillRect(x0, L.floorY, x1 - x0, 44);
  c.strokeStyle = mix('#3f7342', '#7aa85a', dawn);
  c.lineWidth = 2;
  c.beginPath();
  for (let x = Math.floor(x0 / 9) * 9; x < x1; x += 9) {
    const h = 4 + hash(x) * 7;
    const lean = Math.sin(time * 1.3 + x * 0.05) * 1.6;
    c.moveTo(x, L.floorY + 2);
    c.lineTo(x + lean, L.floorY - h);
  }
  c.stroke();
}

function layer(c: Ctx, L: Level, x0: number, x1: number, shift: number, y: number, amp: number, freq: number, col: string) {
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(x0, L.floorY);
  for (let x = x0; x <= x1 + 20; x += 20) c.lineTo(x, y + Math.sin((x - shift) * freq) * amp + Math.sin((x - shift) * freq * 2.7) * amp * 0.3);
  c.lineTo(x1 + 20, L.floorY);
  c.closePath();
  c.fill();
}

function treeline(c: Ctx, L: Level, x0: number, x1: number, shift: number, col: string) {
  const step = 70;
  for (let k = Math.floor((x0 - shift) / step) - 1; k * step + shift < x1 + 100; k++) {
    const x = k * step + shift;
    const h = 90 + hash(k + 500) * 90;
    c.fillStyle = col;
    c.fillRect(x + 28, L.floorY - h, 10, h);
    ellipse(c, x + 33, L.floorY - h - 20, 44, 50 + hash(k) * 16, col);
  }
}

function tent(c: Ctx, t: (typeof TENTS)[number], floor: number, time: number) {
  const top = floor - 200;
  const eave = floor - 124;
  const cx = t.x + t.w / 2;
  const n = 8;
  for (let i = 0; i < n; i++) {
    const x = t.x + (i * t.w) / n;
    c.fillStyle = withAlpha(i % 2 ? t.a : t.b, 0.82);
    c.fillRect(x, eave, t.w / n + 0.5, floor - eave);
    c.beginPath();
    c.moveTo(cx, top);
    c.lineTo(x, eave);
    c.lineTo(x + t.w / n, eave);
    c.closePath();
    c.fill();
  }
  c.fillStyle = 'rgba(8,14,26,0.45)';
  c.fillRect(t.x, top, t.w, floor - top);
  c.fillStyle = 'rgba(10,8,14,0.72)';
  c.beginPath();
  c.moveTo(cx - 26, floor);
  c.lineTo(cx, eave + 6);
  c.lineTo(cx + 26, floor);
  c.closePath();
  c.fill();
  c.strokeStyle = C.woodDark;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(cx, top);
  c.lineTo(cx, top - 26);
  c.stroke();
  const wave = Math.sin(time * 4 + t.x) * 4;
  c.fillStyle = t.a;
  c.beginPath();
  c.moveTo(cx, top - 26);
  c.lineTo(cx + 26, top - 18 + wave);
  c.lineTo(cx, top - 12);
  c.closePath();
  c.fill();
}

function banner(c: Ctx, x: number, label: string, time: number) {
  const y = 190;
  const w = 220;
  const sag = Math.sin(time * 1.5 + x) * 2;
  fillRR(c, x - w / 2, y + sag, w, 42, 4, '#6a2732', '#e2c37a', 3);
  text(c, label, x, y + 21 + sag, 22, '#f6e7bf', 'center', 700);
}

/** Torches on poles between the trees. The glow itself is added in the lighting pass. */
export function torches(c: Ctx, L: Level, time: number) {
  for (const x of L.lights ?? []) {
    const top = L.floorY - 110;
    fillRR(c, x - 3, top, 6, L.floorY - top, 2, C.woodDark, C.ink, 1.2);
    const f = 1 + 0.18 * Math.sin(time * 13 + x);
    ellipse(c, x, top - 10 * f, 8, 14 * f, '#ff9a3a');
    ellipse(c, x, top - 7 * f, 4, 8 * f, '#ffe08a');
  }
}

export function drawTrees(c: Ctx, L: Level, x0: number, x1: number, time: number) {
  const hole = L.hole;
  L.units.forEach((u, i) => {
    const cx = u.x + u.w / 2;
    const tiers = L.boards.filter((b) => b.unit === i);
    const half = Math.max(...tiers.map((b) => b.x2 - cx));
    if (cx + half + 60 < x0 || cx - half - 60 > x1) return;
    const cousin = !!hole && cx > hole.x && cx < hole.x + hole.w;

    // Foliage behind the branches, so the hanging bottles read against it.
    for (const b of tiers) {
      const hw = (b.x2 - b.x1) / 2 + 30;
      ellipse(c, cx, b.y - 34, hw, 58, withAlpha('#21503a', 0.92));
    }
    ellipse(c, cx, u.top - 58, half * 0.55, 56, '#2a6044');

    // The trunk, with your cousin's hollow up top on their tree.
    const top = cousin ? L.ceilingY - 8 : u.top - 20;
    c.fillStyle = '#4b3222';
    c.beginPath();
    c.moveTo(u.x - 12, L.floorY);
    c.lineTo(u.x, top);
    c.lineTo(u.x + u.w, top);
    c.lineTo(u.x + u.w + 12, L.floorY);
    c.closePath();
    c.fill();
    c.strokeStyle = C.ink;
    c.lineWidth = 2.5;
    c.stroke();
    c.strokeStyle = 'rgba(20,10,6,0.5)';
    c.lineWidth = 2;
    for (let k = 0; k < 6; k++) {
      const bx = u.x + 6 + hash(i * 17 + k) * (u.w - 12);
      const by = top + 30 + hash(k * 3 + i) * (L.floorY - top - 80);
      c.beginPath();
      c.moveTo(bx, by);
      c.lineTo(bx + 2, by + 30);
      c.stroke();
    }
    if (cousin) ellipse(c, cx, L.ceilingY + 6, 26, 30, '#120c0e');

    for (const b of tiers) {
      // Thick at the trunk, thin at the tips.
      c.fillStyle = '#5f412b';
      c.beginPath();
      c.moveTo(b.x1, b.y + 3);
      c.quadraticCurveTo(cx, b.y - 3, b.x2, b.y + 3);
      c.lineTo(b.x2, b.y + 6);
      c.quadraticCurveTo(cx, b.y + 16, b.x1, b.y + 6);
      c.closePath();
      c.fill();
      c.strokeStyle = C.ink;
      c.lineWidth = 2;
      c.stroke();
      for (const end of [b.x1, b.x2]) for (let k = 0; k < 4; k++) {
        const lx = end + (end === b.x1 ? 1 : -1) * k * 12 + Math.sin(time * 1.2 + k) * 1.5;
        ellipse(c, lx, b.y - 2 - (k % 2) * 3, 10, 6, k % 2 ? '#3f7c50' : '#346b45', 0.3);
      }
    }
  });
}

export function drawBale(c: Ctx, b: Rect) {
  fillRR(c, b.x, b.y, b.w, b.h, 6, '#c9a64e', '#6e5720', 2.5);
  c.strokeStyle = '#8f7430';
  c.lineWidth = 1.5;
  c.beginPath();
  for (let k = 0; k < 16; k++) {
    const x = b.x + 5 + hash(k + b.x) * (b.w - 10);
    const y = b.y + 5 + hash(k * 7 + b.x) * (b.h - 12);
    c.moveTo(x, y);
    c.lineTo(x + 7, y + 3);
  }
  c.stroke();
  c.fillStyle = '#6e3a14';
  for (const f of [0.28, 0.72]) c.fillRect(b.x + b.w * f, b.y, 3, b.h);
}

/** How tall each kind of cover is, for how much of a hiding archer still shows. */
export const COVER_H: Record<CoverKind, number> = { bale: 34, barrel: 52, target: 62, cart: 54 };

export function drawCover(c: Ctx, kind: CoverKind, x: number, floor: number) {
  if (kind === 'bale') return drawBale(c, { x: x - 36, y: floor - COVER_H.bale, w: 72, h: COVER_H.bale }); // over the archer behind it
  if (kind === 'barrel') {
    fillRR(c, x - 24, floor - 52, 48, 52, 12, '#6e4127', C.ink, 2.5);
    for (const f of [12, 38]) fillRR(c, x - 25, floor - f - 3, 50, 5, 2, '#3f464e');
  } else if (kind === 'target') {
    fillRR(c, x - 3, floor - 30, 6, 30, 2, C.woodDark);
    for (const [r, col] of [[34, '#f4efe4'], [26, '#b53a32'], [18, '#f4efe4'], [10, '#b53a32'], [4, '#e6c25a']] as const) {
      ellipse(c, x, floor - 34, r * 0.88, r, col);
    }
    c.strokeStyle = C.ink;
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(x, floor - 34, 30, 34, 0, 0, Math.PI * 2);
    c.stroke();
  } else {
    fillRR(c, x - 46, floor - 54, 92, 36, 4, '#7a5532', C.ink, 2.5);
    c.strokeStyle = 'rgba(30,16,8,0.55)';
    c.lineWidth = 2;
    for (let k = 1; k < 5; k++) {
      c.beginPath();
      c.moveTo(x - 46 + k * 18.4, floor - 54);
      c.lineTo(x - 46 + k * 18.4, floor - 18);
      c.stroke();
    }
    for (const w of [-28, 28]) {
      ellipse(c, x + w, floor - 15, 15, 15, '#4a2a1a');
      ellipse(c, x + w, floor - 15, 9, 9, '#6e4127');
    }
  }
}

export function drawArcher(c: Ctx, a: Archer, floor: number, coverH: number, time: number) {
  if (a.state === 'down') {
    ellipse(c, a.x, floor - 2, 34, 5, withAlpha('#000', 0.3));
    fillRR(c, a.x - 28, floor - 16, 48, 14, 6, '#3f6b3a', C.ink, 2);
    ellipse(c, a.x + 28, floor - 11, 10, 10, '#e6b48c');
    for (let i = 0; i < 3; i++) text(c, '✶', a.x + 26 + Math.cos(time * 4 + i * 2.1) * 16, floor - 34 + Math.sin(time * 4 + i * 2.1) * 5, 13, C.gold, 'center', 700);
    return;
  }
  // Hiding: sunk behind the cover with just the top of the hood showing.
  const sink = a.state === 'hidden' ? ARCHER.height + 12 - coverH - 6 + Math.sin(time * 1.6 + a.x) * 2 : 0;
  const up = floor + sink;
  const d = a.dir;
  c.save();
  c.beginPath();
  c.rect(a.x - 60, 0, 120, floor); // sunk or not, nothing shows below the grass
  c.clip();
  fillRR(c, a.x - 10, up - 34, 8, 34, 3, '#4a3a2a', C.ink, 1.5);
  fillRR(c, a.x + 2, up - 34, 8, 34, 3, '#4a3a2a', C.ink, 1.5);
  fillRR(c, a.x - 14, up - 62, 28, 32, 7, '#3f6b3a', C.ink, 2);
  c.fillStyle = '#6e3a14';
  c.fillRect(a.x - 14, up - 37, 28, 4);
  ellipse(c, a.x + d * 2, up - 72, 10, 10, '#e6b48c');
  ellipse(c, a.x + d * 6, up - 73, 1.6, 1.6, C.ink);
  // The hood, pointed, with a feather.
  c.fillStyle = '#2f5a2e';
  c.beginPath();
  c.moveTo(a.x - d * 12, up - 72);
  c.quadraticCurveTo(a.x - d * 16, up - 92, a.x - d * 22, up - 92);
  c.quadraticCurveTo(a.x + d * 8, up - 90, a.x + d * 11, up - 76);
  c.closePath();
  c.fill();
  c.strokeStyle = C.ink;
  c.lineWidth = 1.6;
  c.stroke();
  c.restore();
  if (a.state === 'hidden') return;

  // The bow, turned to the aim, with the string coming back as it draws.
  const pull = a.state === 'draw' ? Math.min(1, 1 - a.t / ARCHER.draw) : 0;
  c.save();
  c.translate(a.x, floor - ARCHER.eye);
  c.scale(d, 1);
  c.rotate(-a.aim);
  c.strokeStyle = '#7a5532';
  c.lineWidth = 3.5;
  c.beginPath();
  c.arc(4, 0, 26, -1.15, 1.15);
  c.stroke();
  c.strokeStyle = '#efe6d0';
  c.lineWidth = 1.2;
  const tipX = 4 + 26 * Math.cos(1.15);
  const tipY = 26 * Math.sin(1.15);
  const back = tipX - pull * 22;
  c.beginPath();
  c.moveTo(tipX, -tipY);
  c.lineTo(back, 0);
  c.lineTo(tipX, tipY);
  c.stroke();
  if (a.state === 'draw') {
    c.strokeStyle = '#d9c7a3';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(back, 0);
    c.lineTo(back + 40, 0);
    c.stroke();
    c.fillStyle = '#cfd6da';
    c.fillRect(back + 38, -2, 7, 4);
    // Where it's going. Dotted while it follows you, solid once it's locked.
    const locked = a.t <= ARCHER.lock;
    c.strokeStyle = withAlpha(locked ? '#ffd76a' : '#fff0c0', locked ? 0.8 : 0.4);
    c.lineWidth = locked ? 2 : 1.3;
    c.setLineDash(locked ? [] : [6, 8]);
    c.beginPath();
    c.moveTo(back + 46, 0);
    c.lineTo(back + 170, 0);
    c.stroke();
    c.setLineDash([]);
  }
  c.restore();
  if (a.state === 'draw') text(c, '!', a.x, up - 108, 22, C.gold, 'center', 700);
}

function arrowArt(c: Ctx, x: number, y: number, angle: number, alpha = 1) {
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);
  c.rotate(angle);
  c.strokeStyle = '#d9c7a3';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-30, 0);
  c.lineTo(0, 0);
  c.stroke();
  c.fillStyle = '#cfd6da';
  c.beginPath();
  c.moveTo(6, 0);
  c.lineTo(-3, -3.5);
  c.lineTo(-3, 3.5);
  c.closePath();
  c.fill();
  c.fillStyle = '#b53a32';
  c.fillRect(-31, -3, 7, 2);
  c.fillRect(-31, 1, 7, 2);
  c.restore();
}

export function drawArrows(c: Ctx, arrows: Arrow[]) {
  for (const a of arrows) arrowArt(c, a.x, a.y, Math.atan2(a.vy, a.vx));
}

export function drawStuck(c: Ctx, stuck: StuckArrow[]) {
  for (const a of stuck) arrowArt(c, a.x, a.y, a.angle, Math.min(1, (8 - a.age) / 2));
}

export function drawFloaters(c: Ctx, floaters: Floater[]) {
  for (const f of floaters) {
    const k = f.age / 1.2;
    c.save();
    c.globalAlpha = 1 - k * k;
    c.shadowColor = 'rgba(0,0,0,0.8)';
    c.shadowBlur = 5;
    text(c, f.text, f.x, f.y - k * 34, 20, f.colour, 'center', 700);
    c.restore();
  }
}

/** The mead stall: the counter, under a striped awning. */
export function drawStall(c: Ctx, k: Rect) {
  fillRR(c, k.x, k.y, k.w, k.h, 4, C.wood, C.woodDark, 2.5);
  fillRR(c, k.x - 6, k.y - 6, k.w + 12, 10, 3, C.woodLight, C.woodDark, 2);
  for (const px of [k.x + 4, k.x + k.w - 10]) fillRR(c, px, k.y - 120, 6, 116, 2, C.woodDark, C.ink, 1.2);
  const n = 10;
  for (let i = 0; i < n; i++) {
    c.fillStyle = i % 2 ? '#7a2f3a' : '#e2cfa0';
    c.fillRect(k.x - 10 + (i * (k.w + 20)) / n, k.y - 138, (k.w + 20) / n + 0.5, 24);
  }
  c.strokeStyle = C.ink;
  c.lineWidth = 2;
  c.strokeRect(k.x - 10, k.y - 138, k.w + 20, 24);
}
