import { NO_INPUT, type Input } from './sim/game';

// Keyboard, two hand positions: WASD + Space/E/F/Q/R, or arrows + Z/X/C/V/B.
//   jump Space/Z · grab E/X · throw F/C · switch Q/V · hoot R/B
// Gamepad (standard mapping): stick or d-pad, A jump, X grab, B throw, LB/RB switch, Y hoot, Start pause.
const KEYS: Record<string, keyof Input> = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyZ: 'jump',
  KeyE: 'grab', KeyX: 'grab',
  KeyF: 'throw', KeyC: 'throw',
  KeyQ: 'swap', KeyV: 'swap',
  KeyR: 'hoot', KeyB: 'hoot',
};

export class Controls {
  private held = new Set<keyof Input>();
  // A tap that goes down and up between two frames still counts once.
  private tapped = new Set<keyof Input>();
  private menuQueue: string[] = [];
  usingPad = false;

  constructor() {
    addEventListener('keydown', (e) => {
      const k = KEYS[e.code];
      if (k) {
        this.held.add(k);
        this.tapped.add(k);
        this.usingPad = false;
        e.preventDefault();
      }
      if (!e.repeat) this.menuQueue.push(e.code);
    });
    addEventListener('keyup', (e) => {
      const k = KEYS[e.code];
      if (k) this.held.delete(k);
    });
    addEventListener('blur', () => this.held.clear());
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
