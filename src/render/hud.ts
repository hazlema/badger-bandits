// HUD after the comp: paw-print slots, bandit-mask colours, ringtail ends.

import { BUZZ, GRADES, NIGHT, PRINTS, SEA_LEGS, VIEW_H, VIEW_W } from '../config';
import { multFor, type Game } from '../sim/game';
import { C, ellipse, FONT, fillRR, GRADE_COLOUR, popup, POPUP, rr, text, withAlpha, type Ctx } from './paint';
import { drawBottle } from './world';

function panel(c: Ctx, x: number, y: number, w: number, h: number, tailSide: 'l' | 'r' | 'both' | 'none' = 'none') {
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.4)';
  c.shadowBlur = 8;
  fillRR(c, x, y, w, h, h / 2, withAlpha(C.charcoal, 0.92), C.cream, 3);
  c.restore();
  const ring = (cx: number, dir: number) => {
    for (let i = 0; i < 4; i++) ellipse(c, cx + dir * i * 7, y + h / 2 + i * 2, 7 - i * 0.6, h / 2 - 4 - i, i % 2 ? C.charcoal : C.softGrey);
  };
  if (tailSide === 'r' || tailSide === 'both') ring(x + w - 4, 1);
  if (tailSide === 'l' || tailSide === 'both') ring(x + 4, -1);
}

function paw(c: Ctx, x: number, y: number, s: number, col: string) {
  ellipse(c, x, y + 2 * s, 5 * s, 4.2 * s, col);
  for (const [dx, dy] of [[-5, -4], [-1.8, -6.5], [1.8, -6.5], [5, -4]]) ellipse(c, x + dx * s, y + dy * s, 1.8 * s, 2.2 * s, col);
}

export function drawHud(c: Ctx, g: Game, time: number) {
  const R = g.raccoon;
  band(c);
  if (g.level.id !== 'store') {
    text(c, g.level.id === 'roof' ? 'Night 1 · The roof' : 'Night 1 · The crawlspace', VIEW_W / 2, BAND + 30, 20, C.cream, 'center', 600);
    return;
  }

  // Bottom band, left: health over the carry slots.
  paw(c, 26, BAND + 15, 1.1, C.cream);
  fillRR(c, 42, BAND + 8, 150, 14, 7, '#1a181d');
  fillRR(c, 42, BAND + 8, 150 * (R.health / 100), 14, 7, R.health > 35 ? C.green : C.red);
  text(c, `${Math.round(R.health)}%`, 117, BAND + 15.5, 11, C.ink, 'center', 700);
  const slots = R.cap;
  for (let i = 0; i < slots; i++) {
    const sx = 26 + i * 26;
    const k = R.carry[i];
    // The ready item (what Throw uses with nothing highlighted) gets a gold ring.
    ellipse(c, sx, BAND + 42, 11, 11, k && i === R.ready ? C.gold : '#1a181d');
    ellipse(c, sx, BAND + 42, 9, 9, '#1a181d');
    if (k) drawBottle(c, sx, BAND + 52, k, i * 5 + 1, 0);
    else paw(c, sx, BAND + 42, 0.85, withAlpha(C.grey, 0.5));
  }
  let ex = 26 + slots * 26 - 6;
  if (g.toteTaken) {
    text(c, 'tote', ex, BAND + 42, 11, C.creamDim, 'left');
    ex += 30;
  }
  // Coins in your fur (none to be had on night 1, but the slot is there).
  ellipse(c, ex + 8, BAND + 42, 6, 6, C.gold);
  text(c, '0', ex + 18, BAND + 42, 12, C.cream, 'left', 700);

  // Buzz, top centre
  const bx = VIEW_W / 2 - 160;
  panel(c, bx, 6, 320, 52);
  text(c, 'Buzz', bx + 22, 32, 16, C.cream, 'left', 700);
  text(c, `x${multFor(R.buzz)}`, bx + 302, 32, 18, R.buzz ? C.gold : C.creamDim, 'right', 700);
  for (let i = 1; i <= BUZZ.steps; i++) {
    const px = bx + 84 + (i - 1) * 40;
    const on = R.buzz >= i;
    const wear = on && R.buzz === i ? 1 - R.buzzT / BUZZ.wearOff : 1;
    ellipse(c, px, 26, 9, 9, '#1a181d');
    if (on) {
      c.beginPath();
      c.moveTo(px, 26);
      c.arc(px, 26, 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * wear);
      c.closePath();
      c.fillStyle = C.gold;
      c.fill();
    }
    text(c, `x${multFor(i)}`, px, 46, 10, on ? C.cream : C.grey, 'center', 600);
  }
  if (R.cheeks) text(c, 'hic…', bx + 160, 70, 15, C.cream, 'center', 700);
  // Special-bottle effects under the Buzz panel.
  const fx: [string, number, string][] = [];
  if (R.seaLegs > 0) fx.push(['⚓ Sea legs', R.seaLegs / SEA_LEGS, '#e8c27a']);
  if (R.blueT > 0) fx.push(['Blue paws', R.blueT / PRINTS.time, '#7fd8ff']);
  fx.forEach(([label, k, col], i) => {
    const fx0 = bx + 20 + i * 150;
    panel(c, fx0, 62, 130, 22);
    text(c, label, fx0 + 12, 73, 12, col, 'left', 700);
    fillRR(c, fx0 + 84, 69, 36, 8, 4, '#1a181d');
    fillRR(c, fx0 + 84, 69, 36 * k, 8, 4, col);
  });

  // Time to dawn, top right
  const left = Math.max(0, NIGHT.length - g.t);
  const mm = Math.floor(left / 60);
  const ss = Math.floor(left % 60);
  panel(c, VIEW_W - 190, 6, 176, 44, 'r');
  ellipse(c, VIEW_W - 166, 34, 11, 8, C.gold);
  c.fillStyle = C.charcoal;
  c.fillRect(VIEW_W - 180, 34, 28, 10);
  c.strokeStyle = C.gold;
  c.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + (i * Math.PI) / 4;
    c.beginPath();
    c.moveTo(VIEW_W - 166 + Math.cos(a) * 14, 34 + Math.sin(a) * 14);
    c.lineTo(VIEW_W - 166 + Math.cos(a) * 18, 34 + Math.sin(a) * 18);
    c.stroke();
  }
  text(c, 'Time to dawn', VIEW_W - 90, 19, 11, C.creamDim, 'center');
  const urgent = left < 30 && Math.floor(time * 2) % 2 === 0;
  text(c, `${mm}:${String(ss).padStart(2, '0')}`, VIEW_W - 90, 36, 21, urgent ? C.red : C.cream, 'center', 700);

  if (!g.bobInside) {
    const until = NIGHT.length * NIGHT.bobAt - g.t;
    if (until < 20) text(c, 'Headlights in the lot…', VIEW_W - 100, 64, 13, C.warm, 'center', 600);
  } else if (g.bob.state === 'chase' || g.bob.state === 'shout') {
    panel(c, VIEW_W - 190, 54, 176, 28);
    text(c, 'Bob is after you!', VIEW_W - 102, 68, 14, C.red, 'center', 700);
  }

  parBar(c, g);
}

const BAND = 480;

/** The HUD band under the world, with ringtail ends. */
function band(c: Ctx) {
  c.fillStyle = C.charcoal;
  c.fillRect(0, BAND, VIEW_W, VIEW_H - BAND);
  c.fillStyle = C.cream;
  c.fillRect(0, BAND, VIEW_W, 3);
  for (const [x0, dir] of [[0, 1], [VIEW_W, -1]] as const) {
    for (let i = 0; i < 3; i++) {
      c.fillStyle = i % 2 ? C.charcoal : C.softGrey;
      c.fillRect(x0 + dir * (i * 4) - (dir < 0 ? 4 : 0), BAND + 3, 4, VIEW_H - BAND);
    }
  }
}

function parBar(c: Ctx, g: Game) {
  const target = NIGHT.target;
  const x = 260;
  const w = VIEW_W - x - 28;
  const by = BAND + 22;
  const max = target; // the bar runs 0 to 100%
  text(c, `banked ${fmt(g.banked)}`, x + w - 120, BAND + 12, 12, C.gold, 'right', 600);
  text(c, `at risk ${fmt(g.atRisk)}`, x + w, BAND + 12, 12, '#e0a070', 'right', 600);
  fillRR(c, x, by, w, 14, 7, '#1a181d');
  const bw = Math.min(w, (g.banked / max) * w);
  const rw = Math.min(w - bw, (g.atRisk / max) * w);
  c.save();
  rr(c, x, by, w, 14, 7);
  c.clip();
  c.fillStyle = C.gold;
  c.fillRect(x, by, bw, 14);
  c.fillStyle = '#c27a4a';
  c.fillRect(x + bw, by, rw, 14);
  c.strokeStyle = withAlpha(C.charcoal, 0.6);
  c.lineWidth = 4;
  for (let sx = x + bw - 20; sx < x + bw + rw; sx += 10) {
    c.beginPath();
    c.moveTo(sx, by + 14);
    c.lineTo(sx + 14, by);
    c.stroke();
  }
  c.restore();
  // Grade marks: the letter each one starts.
  for (const gr of GRADES) {
    if (gr.at === 0) continue;
    const mx = x + ((gr.at * target) / max) * w;
    c.fillStyle = C.cream;
    c.fillRect(mx - 1, by - 2, 2, 18);
    text(c, gr.name, mx, by + 27, 13, GRADE_COLOUR[gr.name], 'center', 700);
  }
}

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

/* --------------------------------------------------------------- screens */

/** Resume or Quit to title. No restart, so a night about to go wrong can't be undone. */
export function drawPause(c: Ctx, choice: number, pad: boolean) {
  c.fillStyle = 'rgba(15,10,18,0.6)';
  c.fillRect(0, 0, VIEW_W, VIEW_H);
  const w = 380;
  const h = 260;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  popup(c, x, y, w, h, -0.008);
  text(c, 'Paused', VIEW_W / 2, y + 48, 40, POPUP.ink, 'center', 700);
  ['Resume', 'Quit to title'].forEach((label, i) => {
    const by = y + 112 + i * 52;
    const on = i === choice;
    fillRR(c, VIEW_W / 2 - 120, by - 21, 240, 42, 10, POPUP.well, on ? C.gold : POPUP.edge, on ? 3 : 2);
    text(c, label, VIEW_W / 2, by, 20, on ? C.gold : POPUP.dim, 'center', 700);
    if (on) paw(c, VIEW_W / 2 - 92, by, 1, C.gold);
  });
  text(c, pad ? 'D-pad to choose · A to confirm · Start to resume' : '↑ ↓ to choose · Space to confirm · Esc to resume', VIEW_W / 2, y + h - 30, 14, POPUP.dim, 'center', 500);
}

const REASONS: Record<string, string> = {
  bob: "Officer Bob's catch pole got you.",
  dawn: 'Still inside at dawn. The morning staff found you.',
  sore: 'Too sore to run. Officer Bob just scooped you up.',
};

export function drawCard(c: Ctx, g: Game, time: number, pad: boolean, page = 0) {
  const r = g.result!;
  c.fillStyle = 'rgba(15,10,18,0.7)';
  c.fillRect(0, 0, VIEW_W, VIEW_H);
  if (page === 1) return drawLog(c, g, time, pad);
  const w = 520;
  const h = r.kept ? 450 : 420; // room for the "kept by animal control" row
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  const den = r.escaped;
  const { ink, dim } = POPUP;
  popup(c, x, y, w, h, den ? -0.012 : 0.01);

  if (den) {
    text(c, 'Report Card · Night 1', VIEW_W / 2, y + 36, 26, ink, 'center', 700);
    text(c, 'Ashland ABC store · you climbed out', VIEW_W / 2, y + 64, 14, dim, 'center', 500);
  } else {
    // Left-aligned like a form, which leaves the top right for the stamp.
    text(c, 'County Animal Shelter', x + 40, y + 36, 24, ink, 'left', 700);
    text(c, 'Intake slip & bill for damages', x + 40, y + 62, 14, dim, 'left', 500);
    text(c, REASONS[r.reason] ?? '', x + 40, y + 92, 15, ink, 'left', 500);
  }

  const rows: [string, string][] = [
    ['Loot banked with your cousin', fmt(r.banked)],
    ['Mess', den ? fmt(r.mess) : '—'],
    ['In your paws', den ? fmt(r.paws) : '—'],
    ['Coins in your fur', den ? fmt(r.coins) : '—'],
  ];
  if (r.kept) rows.push(['Kept by animal control', `${fmt(r.kept.mess)} Mess, ${r.kept.items} item${r.kept.items === 1 ? '' : 's'}`]);
  const top = y + (den ? 106 : 124);
  rows.forEach(([a, b], i) => {
    const ry = top + i * 28;
    text(c, a, x + 40, ry, 17, ink, 'left', 500);
    text(c, b, x + w - 40, ry, 17, ink, 'right', 700);
    c.fillStyle = POPUP.rule;
    c.fillRect(x + 40, ry + 14, w - 80, 1);
  });
  const sy = top + rows.length * 28 + 12;
  text(c, 'Night score', x + 40, sy, 20, ink, 'left', 700);
  text(c, fmt(r.score), x + w - 40, sy, 20, ink, 'right', 700);
  // The grade bar, with each letter at the score it starts from.
  const bx = x + 40;
  const bw = w - 80;
  const max = r.target;
  fillRR(c, bx, sy + 20, bw, 12, 6, POPUP.well);
  fillRR(c, bx, sy + 20, Math.min(bw, (r.score / max) * bw), 12, 6, C.gold);
  for (const gr of GRADES) {
    if (!gr.at) continue;
    const mx = bx + ((gr.at * r.target) / max) * bw;
    c.fillStyle = ink;
    c.fillRect(mx - 1, sy + 17, 2, 18);
    // a dark edge so green and yellow hold up on the wood
    c.font = `700 14px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 4;
    c.lineJoin = 'round';
    c.strokeStyle = POPUP.edge;
    c.strokeText(gr.name, mx, sy + 48);
    text(c, gr.name, mx, sy + 48, 14, GRADE_COLOUR[gr.name], 'center', 700);
  }
  // The letter in a badge, with the percentage it comes from beside it.
  const share = `${Math.round((r.score / r.target) * 100)}%`;
  c.font = `600 20px ${FONT}`;
  const tw = c.measureText(share).width;
  const gx = VIEW_W / 2 - (64 + 18 + tw) / 2;
  const gy = sy + 100;
  const col = GRADE_COLOUR[r.grade];
  c.beginPath();
  c.arc(gx + 32, gy, 32, 0, Math.PI * 2);
  c.fillStyle = col;
  c.fill();
  c.lineWidth = 4;
  c.strokeStyle = POPUP.edge;
  c.stroke();
  text(c, r.grade, gx + 32, gy + 2, 40, col === GRADE_COLOUR.C ? C.ink : '#fffaf0', 'center', 700);
  text(c, share, gx + 64 + 18, gy + 1, 20, ink, 'left', 600);

  if (!r.escaped) {
    c.save();
    c.translate(x + w - 88, y + 42);
    c.rotate(-0.2);
    c.strokeStyle = withAlpha(GRADE_COLOUR.F, 0.95);
    c.lineWidth = 5;
    rr(c, -70, -26, 140, 52, 8);
    c.stroke();
    text(c, 'CAUGHT', 0, 1, 34, withAlpha(GRADE_COLOUR.F, 0.95), 'center', 700);
    c.restore();
  }
  if (Math.floor(time * 2) % 2 === 0) text(c, pad ? 'A for the title screen · Select for the night log' : 'Space for the title screen · L for the night log', VIEW_W / 2, y + h - 22, 16, dim, 'center', 600);
}

/** The back of the report card: everything that scored or cost you, in order. */
function drawLog(c: Ctx, g: Game, time: number, pad: boolean) {
  const r = g.result!;
  const w = 600;
  const h = 470;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  const { ink, dim } = POPUP;
  popup(c, x, y, w, h, 0.008);
  text(c, 'Night log', x + 36, y + 36, 26, ink, 'left', 700);
  text(c, `${fmt(r.score)} of ${r.target} · ${Math.round((r.score / r.target) * 100)}% · ${r.grade}`, x + w - 36, y + 38, 17, GRADE_COLOUR[r.grade], 'right', 700);
  const rows = 15;
  const lines = g.log.length > rows ? g.log.slice(g.log.length - (rows - 1)) : g.log;
  let ly = y + 78;
  if (g.log.length > rows) {
    text(c, `… ${g.log.length - lines.length} earlier`, x + 36, ly, 13, dim, 'left', 500);
    ly += 22;
  }
  for (const e of lines) {
    const m = Math.floor(e.t / 60);
    const sec = Math.floor(e.t % 60).toString().padStart(2, '0');
    text(c, `${m}:${sec}`, x + 36, ly, 13, dim, 'left', 600);
    text(c, e.text, x + 84, ly, 14, ink, 'left', 500);
    if (e.pts !== undefined) text(c, `+${fmt(e.pts)}`, x + w - 36, ly, 14, C.gold, 'right', 700);
    c.fillStyle = POPUP.rule;
    c.fillRect(x + 36, ly + 11, w - 72, 1);
    ly += 22;
  }
  if (!g.log.length) text(c, 'Nothing happened. Suspicious.', VIEW_W / 2, y + h / 2, 16, dim, 'center', 500);
  if (Math.floor(time * 2) % 2 === 0) text(c, pad ? 'Select to flip back · A for the title screen' : 'L to flip back · Space for the title screen', VIEW_W / 2, y + h - 22, 16, dim, 'center', 600);
}
