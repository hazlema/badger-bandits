// HUD after the comp, in the store's wood: signs hung from the ceiling, cream price tags, the counter along the bottom.

import { BUZZ, GRADES, NIGHT, PRINTS, SEA_LEGS, VIEW_H, VIEW_W } from '../config';
import { multFor, type Game } from '../sim/game';
import { C, ellipse, FONT, fillRR, GRADE_COLOUR, popup, POPUP, rr, text, withAlpha, woodBoards, type Ctx } from './paint';
import { drawBottle } from './world';

/** Price-tag paper, and inks dark enough to read on it. */
const TAG = { paper: '#f1e4c6', ink: '#2a170c', red: '#b02a1e', rope: '#c9b48a' };
const GRADE_ON_TAG: Record<string, string> = { A: '#2f7d3f', B: '#2f7d3f', C: '#8a6a08', D: '#8a6a08' };

/** A wooden sign hung from the ceiling, one rope at each offset from its left edge. */
function sign(c: Ctx, x: number, y: number, w: number, h: number, ropes: number[]) {
  c.strokeStyle = TAG.rope;
  c.lineWidth = 3;
  for (const rx of ropes) {
    c.beginPath();
    c.moveTo(x + rx, 0);
    c.lineTo(x + rx, y + 4);
    c.stroke();
  }
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.55)';
  c.shadowBlur = 12;
  c.shadowOffsetY = 6;
  fillRR(c, x, y, w, h, 9, '#6c4024');
  c.restore();
  woodBoards(c, x, y, w, h, 9, 19);
  rr(c, x + 4, y + 4, w - 8, h - 8, 6); // a lit inner bevel
  c.strokeStyle = 'rgba(255, 220, 170, 0.12)';
  c.lineWidth = 1.5;
  c.stroke();
  rr(c, x, y, w, h, 9);
  c.strokeStyle = POPUP.edge;
  c.lineWidth = 2.5;
  c.stroke();
  for (const rx of ropes) {
    ellipse(c, x + rx, y + 7, 3.4, 3.4, '#5e554c'); // the bolt it hangs from
    ellipse(c, x + rx - 0.8, y + 6.2, 1.6, 1.6, '#e8e0d2');
  }
}

/** A cream price tag centred on (cx, cy), tilted; `inner` draws on it with the origin at its centre. */
function tag(c: Ctx, cx: number, cy: number, w: number, h: number, tilt: number, inner: () => void, edge?: string) {
  c.save();
  c.translate(cx, cy);
  c.rotate(tilt);
  c.shadowColor = 'rgba(0,0,0,0.45)';
  c.shadowBlur = 7;
  c.shadowOffsetY = 4;
  fillRR(c, -w / 2, -h / 2, w, h, 5, TAG.paper);
  c.restore();
  c.save();
  c.translate(cx, cy);
  c.rotate(tilt);
  if (edge) {
    rr(c, -w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 4);
    c.strokeStyle = edge;
    c.lineWidth = 2;
    c.stroke();
  }
  inner();
  c.restore();
}

/** A groove sunk into the wood: dark, with a shadow along its top edge. */
function well(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  fillRR(c, x, y, w, h, r, 'rgba(20, 10, 5, 0.62)');
  c.save();
  rr(c, x, y, w, h, r);
  c.clip();
  const g = c.createLinearGradient(0, y, 0, y + Math.min(6, h / 2));
  g.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  c.fillStyle = g;
  c.fillRect(x, y, w, h);
  c.restore();
}

/** Text with a dark drop under it, so it holds up on the wood. */
function inked(c: Ctx, s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left', weight = 700) {
  text(c, s, x, y + 1.5, size, POPUP.edge, align, weight);
  text(c, s, x, y, size, color, align, weight);
}

function paw(c: Ctx, x: number, y: number, s: number, col: string) {
  ellipse(c, x, y + 2 * s, 5 * s, 4.2 * s, col);
  for (const [dx, dy] of [[-5, -4], [-1.8, -6.5], [1.8, -6.5], [5, -4]]) ellipse(c, x + dx * s, y + dy * s, 1.8 * s, 2.2 * s, col);
}

export function drawHud(c: Ctx, g: Game, time: number) {
  const R = g.raccoon;
  band(c);
  if (g.level.id !== 'store') {
    inked(c, g.level.id === 'roof' ? 'Night 1 · The roof' : 'Night 1 · The crawlspace', VIEW_W / 2, BAND + 34, 20, C.cream, 'center', 600);
    return;
  }

  // On the counter, left: health over the carry cubbies.
  paw(c, 22, BAND + 21, 0.95, C.cream);
  well(c, 36, BAND + 15, 150, 12, 6);
  if (R.health > 0) {
    const hw = Math.max(12, 150 * (R.health / 100));
    fillRR(c, 36, BAND + 15, hw, 12, 6, R.health > 35 ? C.green : C.red);
    fillRR(c, 40, BAND + 16.5, hw - 8, 2.5, 1.2, 'rgba(255,255,255,0.3)');
  }
  text(c, `${Math.round(R.health)}%`, 111, BAND + 21.5, 10, C.ink, 'center', 700);
  const slots = R.cap;
  for (let i = 0; i < slots; i++) {
    const sx = 28 + i * 26;
    const k = R.carry[i];
    // The ready item (what Throw uses with nothing highlighted) gets a gold rim.
    if (k && i === R.ready) {
      c.save();
      c.shadowColor = withAlpha(C.gold, 0.6);
      c.shadowBlur = 8;
      fillRR(c, sx - 12.5, BAND + 27.5, 25, 25, 6, C.gold);
      c.restore();
    }
    well(c, sx - 11, BAND + 29, 22, 22, 5);
    if (k) {
      c.save();
      c.translate(sx, BAND + 49);
      c.scale(0.8, 0.8);
      drawBottle(c, 0, 0, k, i * 5 + 1, 0);
      c.restore();
    } else paw(c, sx, BAND + 40, 0.72, withAlpha(C.grey, 0.45));
  }
  let ex = 28 + slots * 26 - 8;
  if (g.toteTaken) {
    inked(c, 'tote', ex, BAND + 40, 11, '#e6d4b0', 'left', 600);
    ex += 30;
  }
  // Coins in your fur (none to be had on night 1, but the slot is there).
  ellipse(c, ex + 8, BAND + 40, 6.5, 6.5, '#6e3a14');
  ellipse(c, ex + 8, BAND + 40, 5, 5, C.gold);
  ellipse(c, ex + 6.5, BAND + 38.5, 1.8, 1.8, '#ffe9a8');
  inked(c, '0', ex + 19, BAND + 40, 13, C.cream);

  // Buzz, a sign hung top centre: a bottle cap per step, filling, and the multiplier.
  const bw = 330;
  const bx = VIEW_W / 2 - bw / 2;
  sign(c, bx, 10, bw, 56, [52, bw - 52]);
  inked(c, 'Buzz', bx + 18, 38, 16, C.cream);
  inked(c, `x${multFor(R.buzz)}`, bx + bw - 16, 38, 20, R.buzz ? C.gold : C.creamDim, 'right');
  for (let i = 1; i <= BUZZ.steps; i++) {
    const px = bx + 96 + (i - 1) * 36;
    const on = R.buzz >= i;
    const wear = on && R.buzz === i ? 1 - R.buzzT / BUZZ.wearOff : 1;
    ellipse(c, px, 32, 10, 10, 'rgba(20, 10, 5, 0.72)');
    if (on) {
      c.beginPath();
      c.moveTo(px, 32);
      c.arc(px, 32, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * wear);
      c.closePath();
      c.fillStyle = C.gold;
      c.fill();
    }
    c.beginPath(); // the cap's crimped rim
    c.arc(px, 32, 10, 0, Math.PI * 2);
    c.setLineDash([2.2, 2]);
    c.strokeStyle = POPUP.edge;
    c.lineWidth = 2.5;
    c.stroke();
    c.setLineDash([]);
    text(c, `x${multFor(i)}`, px, 53, 9.5, on ? C.cream : '#b9a98c', 'center', 600);
  }
  // Under the sign: special-bottle effects and the hiccups, on tags.
  const fx: [string, number, string][] = [];
  if (R.seaLegs > 0) fx.push(['⚓ Sea legs', R.seaLegs / SEA_LEGS, '#9a6a18']);
  if (R.blueT > 0) fx.push(['Blue paws', R.blueT / PRINTS.time, '#1f7fb8']);
  fx.forEach(([label, k, col], i) => {
    tag(c, bx + 70 + i * 132, 84, 124, 22, i % 2 ? 0.03 : -0.035, () => {
      text(c, label, -52, 0.5, 12, col, 'left', 700);
      fillRR(c, 14, -4, 40, 8, 4, 'rgba(42, 23, 12, 0.22)');
      fillRR(c, 14, -4, Math.max(8, 40 * k), 8, 4, col);
    });
  });
  if (R.cheeks) tag(c, bx + bw - 26, 86, 50, 22, 0.06, () => text(c, 'hic…', 0, 0.5, 14, TAG.ink, 'center', 700));

  // Time to dawn, a smaller sign top right.
  const left = Math.max(0, NIGHT.length - g.t);
  const mm = Math.floor(left / 60);
  const ss = Math.floor(left % 60);
  const cw = 177;
  const cx = VIEW_W - cw - 15;
  sign(c, cx, 9, cw, 48, [cw / 2]);
  ellipse(c, cx + 30, 33, 15, 15, '#24140b');
  ellipse(c, cx + 30, 33, 8.5, 8.5, C.gold); // a crescent moon
  ellipse(c, cx + 34.5, 30, 7.2, 7.2, '#24140b');
  text(c, 'Dawn in', cx + 56, 24, 11, '#e6d4b0', 'left', 600);
  const urgent = left < 30 && Math.floor(time * 2) % 2 === 0;
  inked(c, `${mm}:${String(ss).padStart(2, '0')}`, cx + 56, 41, 21, urgent ? C.red : C.cream);

  if (!g.bobInside) {
    const until = NIGHT.length * NIGHT.bobAt - g.t;
    if (until < 20) tag(c, cx + cw / 2, 72, 168, 24, 0.02, () => text(c, 'Headlights in the lot…', 0, 0.5, 13, TAG.ink, 'center', 700));
  } else if (g.bob.state === 'chase' || g.bob.state === 'shout') {
    tag(c, cx + cw / 2, 72, 152, 26, -0.03, () => text(c, 'Bob is after you!', 0, 0.5, 14, TAG.red, 'center', 700), '#c8372a');
  }

  parBar(c, g);
}

const BAND = 480;

/** The counter under the world: a lit lip over a front of boards. */
function band(c: Ctx) {
  const sh = c.createLinearGradient(0, BAND - 8, 0, BAND);
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(1, 'rgba(0,0,0,0.35)');
  c.fillStyle = sh;
  c.fillRect(0, BAND - 8, VIEW_W, 8);
  woodBoards(c, 0, BAND + 10, VIEW_W, VIEW_H - BAND - 10, 0, 17);
  const under = c.createLinearGradient(0, BAND + 10, 0, BAND + 19);
  under.addColorStop(0, 'rgba(0,0,0,0.5)');
  under.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = under;
  c.fillRect(0, BAND + 10, VIEW_W, 9);
  const lip = c.createLinearGradient(0, BAND, 0, BAND + 10);
  lip.addColorStop(0, '#d0915a');
  lip.addColorStop(0.45, '#a56b3e');
  lip.addColorStop(1, '#6e4127');
  c.fillStyle = lip;
  c.fillRect(0, BAND, VIEW_W, 10);
  c.fillStyle = POPUP.edge;
  c.fillRect(0, BAND - 1, VIEW_W, 2);
  c.fillRect(0, BAND + 9, VIEW_W, 2);
  c.fillStyle = 'rgba(255, 230, 190, 0.35)';
  c.fillRect(0, BAND + 1.5, VIEW_W, 1.5);
}

function parBar(c: Ctx, g: Game) {
  const par = NIGHT.par;
  const x = 296;
  const w = VIEW_W - x - 22;
  const by = BAND + 28;
  const max = par * 2.25;
  text(c, 'Tonight', x, BAND + 19, 11, '#e6d4b0', 'left', 600);
  inked(c, `Banked ${fmt(g.banked)}`, x + w - 92, BAND + 19, 12, C.gold, 'right');
  inked(c, `At risk ${fmt(g.atRisk)}`, x + w, BAND + 19, 12, '#f0b27e', 'right');
  well(c, x, by, w, 11, 5.5);
  const bw = Math.min(w, (g.banked / max) * w);
  const rw = Math.min(w - bw, (g.atRisk / max) * w);
  c.save();
  rr(c, x, by, w, 11, 5.5);
  c.clip();
  const gold = c.createLinearGradient(0, by, 0, by + 11);
  gold.addColorStop(0, '#ffd877');
  gold.addColorStop(1, '#e0a830');
  c.fillStyle = gold;
  c.fillRect(x, by, bw, 11);
  c.fillStyle = '#c27a4a';
  c.fillRect(x + bw, by, rw, 11);
  c.strokeStyle = 'rgba(110, 65, 39, 0.8)';
  c.lineWidth = 3;
  for (let sx = x + bw - 20; sx < x + bw + rw; sx += 8) {
    c.beginPath();
    c.moveTo(sx, by + 11);
    c.lineTo(sx + 11, by);
    c.stroke();
  }
  c.restore();
  // Grade marks: a brass peg where each letter starts, the letter on a tag under it.
  for (const gr of GRADES) {
    if (gr.at === 0) continue;
    const mx = x + ((gr.at * par) / max) * w;
    const peg = c.createLinearGradient(mx - 2.5, 0, mx + 2.5, 0);
    peg.addColorStop(0, '#8a6a2a');
    peg.addColorStop(0.5, '#f0d28a');
    peg.addColorStop(1, '#8a6a2a');
    rr(c, mx - 2.5, by - 4, 5, 19, 2);
    c.fillStyle = peg;
    c.fill();
    fillRR(c, mx - 8, BAND + 45, 16, 13, 3, TAG.paper);
    text(c, gr.name, mx, BAND + 52, 11, GRADE_ON_TAG[gr.name], 'center', 700);
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

export function drawCard(c: Ctx, g: Game, time: number, pad: boolean) {
  const r = g.result!;
  c.fillStyle = 'rgba(15,10,18,0.7)';
  c.fillRect(0, 0, VIEW_W, VIEW_H);
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
  const max = r.par * 2.25;
  fillRR(c, bx, sy + 20, bw, 12, 6, POPUP.well);
  fillRR(c, bx, sy + 20, Math.min(bw, (r.score / max) * bw), 12, 6, C.gold);
  for (const gr of GRADES) {
    if (!gr.at) continue;
    const mx = bx + ((gr.at * r.par) / max) * bw;
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
  // The letter in a badge, with how much of the store you got away with beside it.
  const share = `${Math.round(r.share * 100)}% of the store`;
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
  if (Math.floor(time * 2) % 2 === 0) text(c, pad ? 'Press A for the title screen' : 'Press Space for the title screen', VIEW_W / 2, y + h - 22, 16, dim, 'center', 600);
}
