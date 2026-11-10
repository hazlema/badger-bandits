import { NO_INPUT, type Input } from './sim/game';

// Keyboard: two keys per action, rebindable from Controls on the menu (host, 2026-11-10). The defaults are the two
// hand positions: arrows + Space/E/F/Q/R, or WASD + Z/X/C/V/B.
//   jump Space/Z · grab E/X · throw F/C · switch Q/V · hoot R/B
// Gamepad (standard mapping, fixed): stick or d-pad, A jump, X grab, B throw, LB/RB switch, Y hoot, Start pause.
export type Action = keyof Input;
export type Bindings = Record<Action, [string | null, string | null]>;
export const ACTIONS: { act: Action; label: string }[] = [
  { act: 'left', label: 'Move left' },
  { act: 'right', label: 'Move right' },
  { act: 'up', label: 'Climb · Aim up' },
  { act: 'down', label: 'Down · Drop' },
  { act: 'jump', label: 'Jump' },
  { act: 'grab', label: 'Grab · Drink' },
  { act: 'throw', label: 'Throw' },
  { act: 'swap', label: 'Switch' },
  { act: 'hoot', label: 'Hoot' },
];
export const DEFAULT_KEYS: Bindings = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  jump: ['Space', 'KeyZ'],
  grab: ['KeyE', 'KeyX'],
  throw: ['KeyF', 'KeyC'],
  swap: ['KeyQ', 'KeyV'],
  hoot: ['KeyR', 'KeyB'],
};
/** Keys the menus and the game already use for themselves (pause, powerups, mute, music, the night log), so they
    can't be bound to an action. */
export function reservedKey(code: string): boolean {
  return ['Escape', 'Enter', 'Tab', 'KeyP', 'KeyM', 'KeyN', 'KeyL'].includes(code) || /^(Meta|OS|ContextMenu)/.test(code);
}
/** What to print on a key cap: ← for ArrowLeft, E for KeyE, L Shift for ShiftLeft. */
export function keyName(code: string | null): string {
  if (!code) return '—';
  const arrows: Record<string, string> = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' };
  if (arrows[code]) return arrows[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  const side = /^(Shift|Control|Alt)(Left|Right)$/.exec(code);
  if (side) return `${side[2] === 'Left' ? 'L' : 'R'} ${side[1] === 'Control' ? 'Ctrl' : side[1]}`;
  const named: Record<string, string> = { Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backspace: '⌫', CapsLock: 'Caps' };
  return named[code] ?? code;
}

export class Controls {
  private keys: Record<string, Action> = {};
  private held = new Set<keyof Input>();
  // A tap that goes down and up between two frames still counts once.
  private tapped = new Set<keyof Input>();
  private menuQueue: string[] = [];
  usingPad = false;

  constructor(bindings: Bindings) {
    this.bind(bindings);
    addEventListener('keydown', (e) => {
      const k = this.keys[e.code];
      if (k) {
        this.held.add(k);
        this.tapped.add(k);
        this.usingPad = false;
        e.preventDefault();
      }
      if (!e.repeat) this.menuQueue.push(e.code);
    });
    addEventListener('keyup', (e) => {
      const k = this.keys[e.code];
      if (k) this.held.delete(k);
    });
    addEventListener('blur', () => this.held.clear());
  }

  /** Use these keys from now on. */
  bind(bindings: Bindings) {
    this.keys = {};
    for (const [act, codes] of Object.entries(bindings) as [Action, (string | null)[]][]) for (const code of codes) if (code) this.keys[code] = act;
    this.held.clear();
  }

  private padPrev: boolean[] = [];

  read(): Input {
    const inp: Input = { ...NO_INPUT };
    for (const k of this.held) inp[k] = true;
    for (const k of this.tapped) inp[k] = true;
    const pad = navigator.getGamepads?.().find((p) => p && p.connected);
    if (pad) {
      const b = (i: number) => !!pad.buttons[i]?.pressed;
      const ax = pad.axes[0] ?? 0;
      const ay = pad.axes[1] ?? 0;
      const any = pad.buttons.some((x) => x.pressed) || Math.abs(ax) > 0.4 || Math.abs(ay) > 0.4;
      if (any) this.usingPad = true;
      inp.left ||= b(14) || ax < -0.4;
      inp.right ||= b(15) || ax > 0.4;
      inp.up ||= b(12) || ay < -0.55;
      inp.down ||= b(13) || ay > 0.55;
      inp.jump ||= b(0);
      inp.grab ||= b(2);
      inp.throw ||= b(1);
      inp.swap ||= b(4) || b(5);
      inp.hoot ||= b(3);
      // Start / Select / A and the d-pad also work the menus.
      for (const [i, code] of [[9, 'PadStart'], [8, 'PadSelect'], [0, 'PadA'], [12, 'PadUp'], [13, 'PadDown'], [14, 'PadLeft'], [15, 'PadRight']] as const) {
        if (b(i) && !this.padPrev[i]) this.menuQueue.push(code);
        this.padPrev[i] = b(i);
      }
    }
    return inp;
  }

  /** Call once a sim step has seen this frame's input, so taps aren't lost on frames with no step. */
  consumed() {
    this.tapped.clear();
  }

  /** Raw presses since last call, for the menus (pause, mute, confirm, up/down). */
  menu(): string[] {
    const q = this.menuQueue;
    this.menuQueue = [];
    return q;
  }
}
