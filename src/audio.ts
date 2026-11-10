// Tiny Web Audio synth: every sound is made on the fly, no files.
//
// Three layers:
// - one-shots for sim events (`play`), panned and faded by where they happened;
// - loops read from the game each frame (`update`): footsteps, Bob's boots, the
//   scrubber's hum, the aiming whistle, rolling bottles, running spills, dawn birds;
// - a sneaky music loop that gets busier when Bob comes in and when he chases you,
//   and goes wobbly with your Buzz.
import { NIGHT, SCRUBBER, THROW } from './config';
import type { Game, SimEvent } from './sim/game';

type Mood = 'calm' | 'sneak' | 'tense' | 'chase';
const BPM: Record<Mood, number> = { calm: 92, sneak: 100, tense: 114, chase: 140 };
// A two-bar walking bassline in semitones above D2, and the phrase roots it walks through.
const BASS: (number | null)[][] = [
  [0, null, 3, null, 5, 6, 7, null],
  [0, null, 3, null, 5, 3, 0, -2],
];
const ROOTS = [0, 0, 5, 3];
const PENTA = [0, 3, 5, 7, 10, 12, 15];
const D2 = 73.42;

export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private music: GainNode | null = null;
  private out: AudioNode | null = null; // where tone()/noise() go: sfx, a panned spot, or music
  muted: boolean;
  musicOn: boolean;

  // music clock
  private nextNote = 0;
  private stepN = 0;
  private buzz = 0;
  // loops
  private hum: { o: OscillatorNode; g: GainNode } | null = null;
  private scrub: { o: OscillatorNode; f: BiquadFilterNode; g: GainNode; p: StereoPannerNode } | null = null;
  private aim: { o: OscillatorNode; g: GainNode } | null = null;
  private stepT = 0;
  private bobStepT = 0;
  private rollT = 0;
  private trickleT = 0;
  private birdT = 2;

  constructor(muted = false, musicOn = true) {
    this.muted = muted;
    this.musicOn = musicOn;
  }

  /** Browsers only allow audio after a user gesture; main.ts calls this from key and pointer handlers. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const c = new AudioContext();
    this.ctx = c;
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : 0.6;
    this.master.connect(c.destination);
    this.sfx = c.createGain();
    this.sfx.connect(this.master);
    this.music = c.createGain();
    this.music.gain.value = this.musicOn ? 0.32 : 0;
    this.music.connect(this.master);
    this.out = this.sfx;
    this.nextNote = c.currentTime + 0.1;

    // Emergency-power hum, the scrubber's motor and the aiming whistle run all the time at zero volume.
    const hum = { o: c.createOscillator(), g: c.createGain() };
    hum.o.type = 'sine';
    hum.o.frequency.value = 120;
    hum.g.gain.value = 0;
    hum.o.connect(hum.g).connect(this.sfx);
    hum.o.start();
    this.hum = hum;
    const sc = { o: c.createOscillator(), f: c.createBiquadFilter(), g: c.createGain(), p: c.createStereoPanner() };
    sc.o.type = 'sawtooth';
    sc.o.frequency.value = 55;
    sc.f.type = 'lowpass';
    sc.f.frequency.value = 380;
    sc.g.gain.value = 0;
    sc.o.connect(sc.f).connect(sc.g).connect(sc.p).connect(this.sfx);
    sc.o.start();
    this.scrub = sc;
    const aim = { o: c.createOscillator(), g: c.createGain() };
    aim.o.type = 'sine';
    aim.g.gain.value = 0;
    aim.o.connect(aim.g).connect(this.sfx);
    aim.o.start();
    this.aim = aim;
  }

  toggle() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.6;
    return this.muted;
  }

  toggleMusic() {
    this.musicOn = !this.musicOn;
    if (this.music) this.music.gain.value = this.musicOn ? 0.32 : 0;
    return this.musicOn;
  }

  /* --------------------------------------------------------------- voices */

  private tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, slide = 0, delay = 0, attack = 0) {
    const c = this.ctx;
    if (!c || !this.out) return;
    const t = Math.max(c.currentTime, c.currentTime + delay);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    if (attack) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + attack);
    } else g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol = 0.3, hp = 1500, delay = 0, lp = 0) {
    const c = this.ctx;
    if (!c || !this.out) return;
    const t = c.currentTime + delay;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
    const s = c.createBufferSource();
    s.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = lp ? 'lowpass' : 'highpass';
    f.frequency.value = lp || hp;
    const g = c.createGain();
    g.gain.value = vol;
    s.connect(f).connect(g).connect(this.out);
    s.start(t);
  }

  private chitter(n = 5, base = 1400) {
    for (let i = 0; i < n; i++) this.tone(base + Math.random() * 700, 0.05, 'square', 0.06, 1.3, i * 0.06);
  }

  /** Route the next voices through a panner and a distance fade, for a sound at world x. */
  private at(x: number | null, g: Game | null) {
    const c = this.ctx;
    if (!c || !this.sfx) return;
    if (x === null || !g) {
      this.out = this.sfx;
      return;
    }
    const dx = x - g.raccoon.x;
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-0.8, Math.min(0.8, dx / 600));
    const v = c.createGain();
    v.gain.value = Math.max(0.2, 1 - Math.abs(dx) / 1400);
    p.connect(v).connect(this.sfx);
    // Disconnect after the longest one-shot has finished.
    setTimeout(() => v.disconnect(), 3000);
    this.out = p;
  }

  /* ------------------------------------------------------------ one-shots */

  play(e: SimEvent, g: Game | null = null) {
    if (!this.ctx) return;
    const x =
      e.type === 'smash' || e.type === 'ring' || e.type === 'blast' || e.type === 'creak' || e.type === 'twang' || e.type === 'thunk' || e.type === 'honk' || e.type === 'screech' || e.type === 'spit' || e.type === 'cannon' || e.type === 'whoo' ? e.x
      : ['door', 'shout', 'mutter', 'lost', 'bobWindup', 'bobThrow'].includes(e.type) || (e.type === 'say' && e.who === 'bob') ? g?.bob.x ?? null
      : e.type === 'beep' || e.type === 'slurp' || e.type === 'siren' || e.type === 'aim' || e.type === 'shot' ? g?.scrub.x ?? null
      : e.type === 'hiss' ? g?.possum?.x ?? null
      : null;
    this.at(x, g);
    this.oneShot(e);
    this.out = this.sfx;
  }

  private oneShot(e: SimEvent) {
    switch (e.type) {
      case 'smash':
        if (e.kind === 'tile') {
          this.noise(0.6, 0.55, 0, 0, 900);
          this.tone(90, 0.35, 'triangle', 0.45, 0.5);
          for (let i = 0; i < 5; i++) this.noise(0.08, 0.15, 1200, 0.1 + i * 0.07);
        } else {
          const mini = e.kind === 'mini' || e.kind === 'golden';
          this.tone(mini ? 180 : 120, 0.12, 'triangle', 0.3, 0.6);
          this.noise(mini ? 0.3 : 0.55, mini ? 0.3 : 0.45, 2500);
          for (let i = 0; i < (mini ? 5 : 9); i++) {
            this.tone(2600 + Math.random() * 3200, 0.18 + Math.random() * 0.2, 'sine', 0.05, 1, 0.02 + i * 0.035 + Math.random() * 0.03);
          }
          this.noise(0.25, 0.08, 0, 0.08, 500); // the splash
        }
        break;
      case 'knock':
        // A bottle tipping off: a glassy clink against its neighbours.
        this.tone(1900 + Math.random() * 400, 0.12, 'sine', 0.12, 1.02);
        this.tone(2800 + Math.random() * 400, 0.09, 'sine', 0.06, 1, 0.04);
        break;
      case 'sip':
        for (let i = 0; i < 3; i++) this.tone(500 + i * 90, 0.07, 'sine', 0.18, 0.7, i * 0.1);
        this.tone(900, 0.15, 'sine', 0.08, 1.5, 0.32);
        break;
      case 'hiccupWarn':
        this.tone(300, 0.3, 'sine', 0.1, 1.6, 0, 0.1);
        break;
      case 'hiccup':
        this.tone(700, 0.12, 'square', 0.12, 2.2);
        this.tone(1400, 0.08, 'sine', 0.06, 1.3, 0.04);
        break;
      case 'jump':
        this.tone(330, 0.12, 'triangle', 0.08, 1.8);
        break;
      case 'land':
        this.noise(0.08, 0.1, 0, 0, 600);
        break;
      case 'grab':
        this.tone(880, 0.08, 'triangle', 0.14, 1.4);
        this.tone(1760, 0.06, 'sine', 0.05, 1, 0.05);
        break;
      case 'golden':
        [880, 1109, 1319, 1760].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.14, 1, i * 0.07));
        break;
      case 'lesson':
        [660, 990].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.14, 1, i * 0.09));
        break;
      case 'tote':
        this.noise(0.2, 0.15, 600);
        this.tone(660, 0.15, 'triangle', 0.12, 1.2);
        break;
      case 'bank':
        [660, 880, 1320].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.15, 1, i * 0.08));
        for (let i = 0; i < 5; i++) this.tone(1800 + i * 120, 0.06, 'sine', 0.05, 1, 0.3 + i * 0.04);
        this.chitter(4, 1600);
        break;
      case 'say':
        if (e.who === 'cousin') this.chitter(5);
        else if (e.who === 'bob') this.tone(110, 0.25, 'sawtooth', 0.05, 0.9);
        break;
      case 'hit':
        this.tone(180, 0.25, 'sawtooth', 0.22, 0.5);
        this.tone(1200, 0.15, 'square', 0.06, 0.5);
        break;
      case 'ko':
        this.noise(0.2, 0.3, 0, 0, 400);
        this.tone(220, 0.25, 'triangle', 0.3, 0.4);
        // little birdies circling
        for (let i = 0; i < 6; i++) this.tone(i % 2 ? 1760 : 2093, 0.1, 'sine', 0.06, 1.1, 0.3 + i * 0.13);
        break;
      case 'slip':
        this.tone(500, 0.35, 'sine', 0.14, 0.4);
        break;
      case 'vent':
        this.noise(0.3, 0.25, 800);
        this.tone(240, 0.3, 'square', 0.05, 0.6, 0.05);
        break;
      case 'wires':
        this.noise(0.15, 0.3, 3000);
        for (let i = 0; i < 4; i++) this.noise(0.04, 0.2, 4000, 0.05 + i * 0.06);
        this.tone(120, 0.8, 'sawtooth', 0.25, 0.3, 0.1);
        break;
      case 'door':
        // The door chime, and a jangle of keys.
        this.tone(1200, 0.45, 'sine', 0.14, 1, 0);
        this.tone(900, 0.6, 'sine', 0.14, 1, 0.25);
        for (let i = 0; i < 4; i++) this.tone(3000 + Math.random() * 1500, 0.06, 'sine', 0.04, 1, 0.6 + i * 0.05);
        break;
      case 'shout':
        this.tone(160, 0.35, 'sawtooth', 0.25, 1.4);
        // the "you've been spotted" sting
        [587, 698, 831].forEach((f, i) => this.tone(f, 0.18, 'square', 0.07, 1, 0.05 + i * 0.05));
        break;
      case 'mutter':
        this.tone(130, 0.4, 'sawtooth', 0.06, 0.8);
        break;
      case 'lost':
        this.tone(200, 0.4, 'triangle', 0.1, 0.7);
        [523, 440].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.06, 1, 0.1 + i * 0.18));
        break;
      case 'beep':
        this.tone(1500, 0.07, 'square', 0.05);
        this.tone(1900, 0.07, 'square', 0.05, 1, 0.1);
        break;
      case 'siren':
        // Two-tone wail for the length of the alarm.
        for (let i = 0; i < 12; i++) this.tone(i % 2 ? 720 : 960, 0.24, 'square', 0.09, i % 2 ? 1.3 : 0.75, i * 0.25);
        break;
      case 'bobWindup':
        this.tone(140, 0.3, 'sawtooth', 0.12, 1.3); // "hnngh"
        break;
      case 'bobThrow':
        this.noise(0.25, 0.2, 700);
        this.tone(110, 0.2, 'sawtooth', 0.1, 0.7);
        break;
      case 'slurp':
        this.tone(220, 0.45, 'sawtooth', 0.08, 2.5);
        this.noise(0.4, 0.06, 0, 0, 900);
        break;
      case 'spin':
        for (let i = 0; i < 12; i++) this.tone(1000 + i * 20, 0.03, 'square', 0.05, 1, i * 0.03 + i * i * 0.004);
        break;
      case 'playDead':
        this.noise(0.15, 0.12, 0, 0, 700);
        this.tone(400, 0.3, 'triangle', 0.1, 0.5);
        break;
      case 'caught':
        [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.18, 1, i * 0.22));
        break;
      case 'escaped':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.18, 1, i * 0.12));
        break;
      case 'throw':
        this.noise(0.2, 0.14, 900);
        this.tone(500, 0.18, 'sine', 0.06, 0.6);
        break;
      case 'roll':
        this.tone(300, 0.1, 'triangle', 0.08, 0.8);
        break;
      case 'bonk':
        this.tone(260, 0.18, 'square', 0.18, 0.5);
        this.tone(90, 0.3, 'triangle', 0.25, 0.6, 0.05);
        for (let i = 0; i < 3; i++) this.tone(2093, 0.08, 'sine', 0.05, 1, 0.3 + i * 0.12);
        break;
      case 'hoot': {
        // Foghorn: a low, wobbly blow across the bottle mouth.
        const c = this.ctx;
        if (!c || !this.out) break;
        const t = c.currentTime;
        const o = c.createOscillator();
        const lfo = c.createOscillator();
        const lg = c.createGain();
        const g = c.createGain();
        o.type = 'triangle';
        o.frequency.value = 118;
        lfo.frequency.value = 6;
        lg.gain.value = 5;
        lfo.connect(lg).connect(o.frequency);
        g.gain.setValueAtTime(0.001, t);
        g.gain.exponentialRampToValueAtTime(0.35, t + 0.12);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
        o.connect(g).connect(this.out);
        o.start(t);
        lfo.start(t);
        o.stop(t + 0.9);
        lfo.stop(t + 0.9);
        this.noise(0.6, 0.04, 0, 0, 1500);
        break;
      }
      case 'swap':
        this.tone(1200, 0.04, 'triangle', 0.08);
        break;
      case 'seaLegs':
        [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.16, 'square', 0.07, 1, i * 0.1));
        break;
      case 'bluePaws':
        [1320, 1760, 2217].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.08, 1, i * 0.08));
        break;
      case 'pop':
        // The cork, then the spray hissing out behind you.
        this.tone(900, 0.07, 'square', 0.3, 0.4);
        this.noise(0.6, 0.28, 2200);
        for (let i = 0; i < 8; i++) this.tone(1500 + Math.random() * 1800, 0.06, 'sine', 0.04, 1.2, 0.05 + i * 0.05);
        break;
      case 'mash':
        this.tone(700 + Math.random() * 500, 0.05, 'square', 0.09, 0.8);
        break;
      case 'till':
        // Ka-ching, and a shower of coins.
        [1568, 2093].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.16, 1, i * 0.1));
        for (let i = 0; i < 14; i++) this.tone(2400 + Math.random() * 2400, 0.08, 'sine', 0.05, 1, 0.15 + i * 0.05);
        break;
      case 'hiss':
        this.noise(0.4, 0.14, 3500);
        break;
      case 'clank':
        this.tone(1250, 0.12, 'square', 0.08, 0.7);
        this.tone(640, 0.16, 'triangle', 0.1, 0.8, 0.02);
        break;
      case 'creak':
        this.tone(190, 0.8, 'sawtooth', 0.05, 1.7);
        break;
      case 'twang':
        this.tone(320, 0.2, 'triangle', 0.25, 0.45);
        this.noise(0.1, 0.12, 3000);
        break;
      case 'thunk':
        this.tone(130, 0.1, 'square', 0.2, 0.5);
        this.noise(0.05, 0.14, 0, 0, 900);
        break;
      case 'yelp':
        // A very theatrical raccoon.
        this.tone(1300, 0.32, 'sawtooth', 0.14, 0.4);
        this.tone(1800, 0.2, 'square', 0.05, 0.5, 0.03);
        break;
      case 'fanfare':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i === 3 ? 0.42 : 0.12, 'square', 0.09, 1, i * 0.1));
        break;
      case 'honk':
        // A clown's bicycle horn, twice.
        [0, 0.22].forEach((d) => {
          this.tone(330, 0.16, 'square', 0.22, 1.12, d);
          this.tone(415, 0.16, 'square', 0.12, 1.12, d);
        });
        break;
      case 'screech':
        this.tone(2400, 0.55, 'sawtooth', 0.09, 0.55);
        this.noise(0.4, 0.08, 4000);
        break;
      case 'whoo':
        this.tone(420, 0.28, 'sine', 0.16, 0.9);
        this.tone(380, 0.42, 'sine', 0.14, 0.85, 0.32);
        break;
      case 'spit':
        this.noise(0.12, 0.2, 2500);
        this.tone(900, 0.08, 'square', 0.06, 0.5);
        break;
      case 'splat':
        this.noise(0.12, 0.16, 0, 0, 700);
        break;
      case 'cannon':
        this.noise(0.9, 0.7, 0, 0, 900);
        this.tone(60, 0.8, 'triangle', 0.6, 0.45);
        break;
      case 'lidReady':
        this.tone(1568, 0.3, 'triangle', 0.1, 1.02);
        break;
      case 'sneakers':
        // Laces yanked tight, and off you go.
        [880, 1320].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.12, 1.3, i * 0.06));
        break;
      case 'aim':
        // The turret grinding round, then a rising whine as it charges.
        this.tone(95, 0.75, 'sawtooth', 0.09, 1.25);
        this.tone(420, 0.95, 'square', 0.05, 3.2, 0.05, 0.3);
        break;
      case 'shot':
        this.noise(0.22, 0.4, 0, 0, 1400);
        this.tone(150, 0.3, 'triangle', 0.45, 0.35);
        break;
      case 'blast':
        this.noise(0.9, 0.7, 0, 0, 800);
        this.tone(70, 0.7, 'triangle', 0.6, 0.4);
        this.noise(0.5, 0.2, 2000, 0.05);
        break;
    }
  }

  /* ---------------------------------------------------------------- loops */

  /** Called every frame. `mode` is main.ts's screen. */
  update(g: Game | null, mode: 'title' | 'play' | 'paused' | 'card', dt: number) {
    const c = this.ctx;
    if (!c || !this.sfx) return;
    const playing = mode === 'play' && g && !g.over;
    const store = !!g && g.phase === 'store';
    this.buzz = g ? g.raccoon.buzz : 0;
    const B = g?.bob;
    const mood: Mood =
      !g || mode === 'title' || !store ? 'calm'
      : B && (B.state === 'chase' || B.state === 'shout') ? 'chase'
      : g.bobInside ? 'tense'
      : 'sneak';
    if (this.music) this.music.gain.setTargetAtTime(this.musicOn ? (mode === 'paused' ? 0.1 : 0.32) : 0, c.currentTime, 0.2);
    this.schedule(mood, mode === 'card');

    const now = c.currentTime;
    const set = (p: AudioParam, v: number) => p.setTargetAtTime(v, now, 0.08);
    if (!playing || !g) {
      if (this.hum) set(this.hum.g.gain, 0);
      if (this.scrub) set(this.scrub.g.gain, 0);
      if (this.aim) set(this.aim.g.gain, 0);
      return;
    }
    const R = g.raccoon;
    const near = (x: number) => Math.max(0, 1 - Math.abs(x - R.x) / 1100);
    const pan = (x: number) => Math.max(-0.8, Math.min(0.8, (x - R.x) / 600));

    // The red emergency lights buzz faintly once the power is out.
    if (this.hum) set(this.hum.g.gain, store && g.powerOut ? 0.012 : 0);

    // Your footsteps: quick soft pats, woody on the shelves.
    const speed = Math.abs(R.vx);
    if (R.grounded && speed > 40 && R.state === 'move') {
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = 0.13 * Math.min(2, 230 / speed);
        if (typeof R.ground === 'number') this.tone(700 + Math.random() * 200, 0.04, 'triangle', 0.035);
        else this.noise(0.04, 0.05, 0, 0, 1400);
      }
    } else if (R.climbing && (Math.abs(R.vy) > 20 || speed > 20)) {
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = 0.09;
        this.noise(0.05, 0.05, 2500);
      }
    } else this.stepT = 0;

    if (store) {
      // Bob's boots: you hear where he is before you see him.
      if (B && g.bobInside && ['search', 'investigate', 'chase'].includes(B.state)) {
        this.bobStepT -= dt;
        if (this.bobStepT <= 0) {
          this.bobStepT = B.state === 'chase' ? 0.3 : B.state === 'investigate' ? 0.42 : 0.6;
          const v = near(B.x);
          if (v > 0) {
            this.at(B.x, g);
            this.tone(75, 0.12, 'sine', 0.22 * v, 0.7);
            this.noise(0.06, 0.08 * v, 0, 0, 700);
            if (Math.random() < 0.3) this.tone(3200 + Math.random() * 800, 0.05, 'sine', 0.02 * v); // keys
            this.out = this.sfx;
          }
        }
      }
      // The scrubber's motor hum, higher when it rushes.
      const S = g.scrub;
      if (this.scrub) {
        const v = S.state === 'down' ? 0 : near(S.x) * (S.state === 'rush' || (S.state === 'peek' && S.eye < SCRUBBER.eyeTop) ? 0.05 : 0.028);
        set(this.scrub.g.gain, v);
        // A servo whine while its camera pole cranks up.
        const cranking = S.state === 'peek' && S.eye < SCRUBBER.eyeTop;
        set(this.scrub.o.frequency, (cranking ? 150 : S.state === 'rush' ? 82 : S.state === 'slurp' ? 66 : 52) * (S.tank ? 0.6 : 1));
        set(this.scrub.p.pan, pan(S.x));
      }
      // Rolling bottles rumble along; running spills trickle.
      if (g.bottles.some((b) => b.state === 'rolling')) {
        this.rollT -= dt;
        if (this.rollT <= 0) {
          this.rollT = 0.06;
          const b = g.bottles.find((b) => b.state === 'rolling')!;
          this.at(b.x, g);
          this.tone(260 + Math.random() * 120, 0.06, 'triangle', 0.06);
          this.out = this.sfx;
        }
      }
      const flowing = g.spills.find((s) => s.flow > 0 && Math.abs(s.x - R.x) < 600);
      if (flowing) {
        this.trickleT -= dt;
        if (this.trickleT <= 0) {
          this.trickleT = 0.08 + Math.random() * 0.1;
          this.at(flowing.x, g);
          this.tone(1200 + Math.random() * 1400, 0.04, 'sine', 0.025, 1.4);
          this.out = this.sfx;
        }
      }
      // Dawn: birds start up outside the front windows.
      const left = NIGHT.length - g.t;
      if (left < 50 && g.level.windows) {
        this.birdT -= dt;
        if (this.birdT <= 0) {
          this.birdT = 0.8 + Math.random() * (left < 20 ? 0.8 : 2.4);
          this.at(g.level.windows.x, g);
          const f = 2600 + Math.random() * 1200;
          for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) this.tone(f, 0.07, 'sine', 0.05, 1.25, i * 0.09);
          this.out = this.sfx;
        }
      }
    }

    // Aiming whistle: rises and falls with the lob's charge.
    if (this.aim) {
      if (R.aimT !== null) {
        const k = (R.aimT / THROW.chargePeriod) % 2;
        const charge = k < 1 ? k : 2 - k;
        set(this.aim.g.gain, 0.03);
        set(this.aim.o.frequency, 320 + charge * 520);
      } else set(this.aim.g.gain, 0);
    }
  }

  /* ---------------------------------------------------------------- music */

  private schedule(mood: Mood, quiet: boolean) {
    const c = this.ctx!;
    if (this.nextNote < c.currentTime - 0.5) this.nextNote = c.currentTime + 0.05;
    while (this.nextNote < c.currentTime + 0.15) {
      this.note(this.stepN, mood, quiet, this.nextNote - c.currentTime);
      this.nextNote += 60 / BPM[mood] / 2;
      this.stepN++;
    }
  }

  /** One eighth note of the loop. */
  private note(s: number, mood: Mood, quiet: boolean, delay: number) {
    const prev = this.out;
    this.out = this.music;
    const bar = Math.floor(s / 8);
    const root = ROOTS[Math.floor(bar / 2) % ROOTS.length];
    const i = s % 8;
    // The more Buzz, the more the whole band drifts out of tune.
    const wob = (semi: number) => 2 ** ((semi + Math.sin(this.ctx!.currentTime * 1.3 + s * 0.4) * this.buzz * 0.12) / 12);
    const b = BASS[bar % 2][i];
    if (b !== null) {
      this.tone(D2 * wob(root + b), 0.28, 'triangle', quiet ? 0.12 : 0.24, 0, delay);
      this.tone(D2 * 2 * wob(root + b), 0.08, 'sine', 0.05, 0, delay);
    }
    if (!quiet && mood !== 'calm') {
      // brushed hats on the off-beats, every eighth when it's tense
      if (i % 2 === 1 || mood !== 'sneak') this.noise(0.04, i % 2 ? 0.05 : 0.025, 7000, delay);
      if (mood !== 'sneak' && (i === 2 || i === 6)) {
        this.noise(0.06, 0.08, 1800, delay);
        this.tone(420, 0.03, 'square', 0.03, 1, delay);
      }
      if (mood === 'chase' && i % 2 === 0) {
        this.tone(130, 0.18, 'sine', 0.3, 0.35, delay);
        if (i === 0) this.tone(D2 * 4 * wob(root), 0.12, 'sawtooth', 0.05, 1, delay);
      }
    }
    // A sparse vibraphone tune over the top.
    const p = mood === 'chase' ? 0 : mood === 'tense' ? 0.18 : 0.32;
    if ((i === 0 || i === 3 || i === 6) && Math.random() < p) {
      const n = PENTA[Math.floor(Math.random() * PENTA.length)];
      this.tone(D2 * 8 * wob(root + n), 0.7, 'sine', quiet ? 0.04 : 0.07, 0, delay, 0.01);
      this.tone(D2 * 16 * wob(root + n), 0.25, 'sine', 0.015, 0, delay);
    }
    this.out = prev;
  }
}
