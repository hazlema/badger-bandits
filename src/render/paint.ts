// Shared palette and Canvas 2D helpers. Bandit-mask colours for the UI,
// warm storybook wood for the store.

export const C = {
  charcoal: '#2b2830',
  ink: '#1d1a20',
  grey: '#8f8b93',
  softGrey: '#b9b4ba',
  cream: '#f4e7cc',
  creamDim: '#d9c7a3',
  wood: '#6e4127',
  woodDark: '#4a2a1a',
  woodLight: '#a56b3e',
  wall: '#4f3326',
  warm: '#ffcf86',
  red: '#ff5a44',
  gold: '#f5c04a',
  green: '#7cc36a',
  sky: '#1d2340',
};

export type Ctx = CanvasRenderingContext2D;

export const FONT = '"Fredoka", "Nunito", "Trebuchet MS", system-ui, sans-serif';

export function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + k, y);
  c.arcTo(x + w, y, x + w, y + h, k);
  c.arcTo(x + w, y + h, x, y + h, k);
  c.arcTo(x, y + h, x, y, k);
  c.arcTo(x, y, x + w, y, k);
  c.closePath();
}

export function fillRR(c: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string, lw = 2) {
  rr(c, x, y, w, h, r);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.lineWidth = lw;
    c.strokeStyle = stroke;
    c.stroke();
  }
}

export function ellipse(c: Ctx, x: number, y: number, rx: number, ry: number, fill: string, rot = 0) {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
}

export function text(c: Ctx, s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left', weight = 600) {
  c.font = `${weight} ${size}px ${FONT}`;
  c.textAlign = align;
  c.textBaseline = 'middle';
  c.fillStyle = color;
  c.fillText(s, x, y);
}

/** Cheap deterministic hash for per-object variety. */
export function hash(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

export function glow(c: Ctx, x: number, y: number, r: number, color: string, a: number) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, withAlpha(color, a));
  g.addColorStop(1, withAlpha(color, 0));
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
}

export function withAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Speech bubble with a tail pointing at (tx, ty). */
export function bubble(c: Ctx, s: string, tx: number, ty: number, accent: string, minX = 8, maxX = 952) {
  c.font = `600 15px ${FONT}`;
  const w = Math.min(320, c.measureText(s).width + 22);
  const lines = wrap(c, s, w - 18);
  const h = lines.length * 18 + 12;
  let x = tx - w / 2;
  x = Math.max(minX, Math.min(maxX - w, x));
  const y = Math.max(6, ty - h - 12);
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.35)';
  c.shadowBlur = 6;
  fillRR(c, x, y, w, h, 10, C.cream, accent, 2.5);
  c.restore();
  c.beginPath();
  const bx = Math.max(x + 12, Math.min(x + w - 12, tx));
  c.moveTo(bx - 7, y + h - 1);
  c.lineTo(bx + 7, y + h - 1);
  c.lineTo(Math.max(x + 6, Math.min(x + w - 6, tx)), Math.min(ty, y + h + 10));
  c.closePath();
  c.fillStyle = C.cream;
  c.fill();
  lines.forEach((l, i) => text(c, l, x + w / 2, y + 15 + i * 18, 15, C.ink, 'center'));
}

function wrap(c: Ctx, s: string, max: number): string[] {
  const words = s.split(' ');
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (c.measureText(next).width > max && cur) {
      out.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

/** Grade colours (host): green for A and B, yellow for C and D, red for F. */
export const GRADE_COLOUR: Record<string, string> = { A: '#46b35e', B: '#46b35e', C: '#f2c230', D: '#f2c230', F: '#e0483a' };

/** Den wood paneling: vertical planks with seams, grain and the odd knot. Deterministic, so it doesn't shimmer. */
export function woodPanel(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const tones = ['#7a4a2b', '#6c4024', '#82502f', '#714527', '#7e4d2c'];
  c.save();
  rr(c, x, y, w, h, r);
  c.clip();
  const n = Math.round(w / 58);
  const pw = w / n;
  for (let i = 0; i < n; i++) {
    const px = x + i * pw;
    c.fillStyle = tones[(i * 3) % tones.length];
    c.fillRect(px, y, pw, h);
    c.strokeStyle = 'rgba(40, 20, 10, 0.18)';
    c.lineWidth = 1;
    for (let k = 0; k < 5; k++) {
      const gx = px + pw * (0.15 + 0.17 * k);
      c.beginPath();
      for (let gy = 0; gy <= h; gy += 12) {
        const wob = Math.sin(gy * 0.021 + i * 1.7 + k * 2.3) * 2.2 + Math.sin(gy * 0.07 + k) * 0.8;
        if (gy === 0) c.moveTo(gx + wob, y + gy);
        else c.lineTo(gx + wob, y + gy);
      }
      c.stroke();
    }
    if (i % 3 === 1) {
      const ky = y + h * (0.25 + 0.5 * ((i * 37) % 10) / 10);
      ellipse(c, px + pw * 0.6, ky, 4, 7, 'rgba(45, 22, 10, 0.45)');
      ellipse(c, px + pw * 0.6, ky, 8, 13, 'rgba(45, 22, 10, 0.12)');
    }
    c.fillStyle = 'rgba(25, 12, 6, 0.55)'; // seam
    c.fillRect(px - 1, y, 2, h);
    c.fillStyle = 'rgba(255, 220, 170, 0.08)'; // the plank's lit edge
    c.fillRect(px + 1, y, 2, h);
  }
  // Darken toward the edges so the middle, where the text is, stays even.
  const v = c.createRadialGradient(x + w / 2, y + h / 2, h * 0.3, x + w / 2, y + h / 2, w * 0.7);
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, 'rgba(10, 5, 2, 0.45)');
  c.fillStyle = v;
  c.fillRect(x, y, w, h);
  c.restore();
}

/** Colours for anything drawn on a popup. */
export const POPUP = {
  ink: C.cream,
  dim: C.creamDim,
  rule: 'rgba(244, 231, 204, 0.16)', // divider lines
  well: 'rgba(20, 10, 5, 0.45)', // sunken areas: bar tracks, buttons
  edge: '#2a170c', // outlines
} as const;

/** The one popup look: a wood-panelled board with a dark frame, tilted by `tilt` radians. */
export function popup(c: Ctx, x: number, y: number, w: number, h: number, tilt = 0) {
  c.save();
  c.translate(x + w / 2, y + h / 2);
  c.rotate(tilt);
  c.translate(-(x + w / 2), -(y + h / 2));
  c.shadowColor = 'rgba(0, 0, 0, 0.5)';
  c.shadowBlur = 20;
  fillRR(c, x, y, w, h, 14, '#6c4024');
  c.shadowColor = 'transparent';
  woodPanel(c, x, y, w, h, 14);
  rr(c, x + 6, y + 6, w - 12, h - 12, 9); // a lit inner bevel
  c.strokeStyle = 'rgba(255, 220, 170, 0.12)';
  c.lineWidth = 1.5;
  c.stroke();
  rr(c, x, y, w, h, 14);
  c.strokeStyle = POPUP.edge;
  c.lineWidth = 4;
  c.stroke();
  c.restore();
}
