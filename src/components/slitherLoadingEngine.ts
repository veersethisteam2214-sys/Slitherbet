// Cinematic "SLITHER" loading-screen engine.
//
// Ported from the design-tool prototype (Slither Intro). A realistic emerald
// cobra emerges from black, its body forms the SLITHER letterforms, idles
// (breathing / tongue / blink), rears up for a signature hiss with mist, then
// dissolves into glowing dust and fades to the menu.
//
// Self-contained: owns its own canvas loop and Web Audio hiss. Tune the look
// via the colour options passed to the constructor.

type V2 = { x: number; y: number };
type PathPt = { x: number; y: number; w: number };
type Norm = { tx: number; ty: number; nx: number; ny: number };
type W2S = (pt: { x: number; y: number }, dy?: number) => V2;

type Bbox = { minx: number; maxx: number; miny: number; maxy: number; cx: number; cy: number; w: number; h: number };

type Pal = {
  ink: string; deep: string; dark: string; mid: string; light: string; bright: string; glow: string;
  belly: string; gold: string; goldDeep: string; goldBright: string; gem: string; gemBright: string;
  eye: string; eyeBright: string;
};

type St = {
  reveal: number; headAlpha: number; alpha: number; idle: number; zoom: number; mouth: number;
  eyeBright: number; lift: number; tongue: number; hiss: boolean; dust: number; blink: number; charge: number;
};

type Mist = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; gold: boolean };
type Dust = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; kind: "gold" | "gem" | "jade" };
type Coin = { x: number; y: number; s: number; sp: number; ph: number; spin: number };
type Pellet = { x: number; y: number; s: number; sp: number; ph: number; c: number };

export type SlitherIntroOptions = {
  emerald: string;
  gold: string;
  gem: string;
  eyeGlow: string;
  hood: boolean;
  soundOn: boolean;
};

export const DEFAULT_INTRO_OPTIONS: SlitherIntroOptions = {
  emerald: "#16a85c",
  gold: "#ecc56a",
  gem: "#2fe6c6",
  eyeGlow: "#ffcf5a",
  hood: true,
  soundOn: true,
};

export class SlitherLoadingEngine {
  // timeline (seconds)
  readonly T = { s1: 0.5, s2: 1.5, s3: 3.5, s4: 4.5, s5: 5.5, s6: 6.0 };

  private canvas: HTMLCanvasElement;
  private onDone: () => void;
  private opts: SlitherIntroOptions;

  private ctx: CanvasRenderingContext2D | null = null;
  private W = 0;
  private H = 0;
  private dpr = 1;

  private P: PathPt[] = [];
  private N: Norm[] = [];
  private count = 0;
  private wordW = 0;
  private bbox: Bbox = { minx: 0, maxx: 0, miny: 0, maxy: 0, cx: 0, cy: 0, w: 1, h: 1 };

  private mist: Mist[] = [];
  private dust: Dust[] = [];
  private coins: Coin[] | null = null;
  private pellets: Pellet[] | null = null;

  private t0: number | null = null;
  private raf = 0;
  private skipTo: number | null = null;
  private hissPlayed = false;
  private dustSpawned = false;
  private inited = false;
  private finished = false;
  private hflip = 1;

  private actx: AudioContext | null = null;
  private onResize: (() => void) | null = null;
  private resumeAudio: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement, onDone: () => void, opts: Partial<SlitherIntroOptions> = {}) {
    this.canvas = canvas;
    this.onDone = onDone;
    this.opts = { ...DEFAULT_INTRO_OPTIONS, ...opts };
  }

  // ============================================================ palette
  private pal(): Pal {
    const em = this.opts.emerald;
    const gold = this.opts.gold;
    const eye = this.opts.eyeGlow;
    const gem = this.opts.gem;
    return {
      ink: this.shade(em, -0.84),
      deep: this.shade(em, -0.56),
      dark: this.shade(em, -0.34),
      mid: em,
      light: this.shade(em, 0.3),
      bright: this.shade(em, 0.58),
      glow: this.shade(em, 0.14),
      belly: "rgb(216,238,156)",
      gold,
      goldDeep: this.shade(gold, -0.34),
      goldBright: this.shade(gold, 0.46),
      gem,
      gemBright: this.shade(gem, 0.4),
      eye,
      eyeBright: this.shade(eye, 0.5),
    };
  }
  private shade(hex: string, f: number): string {
    const c = this.hex2rgb(hex);
    const t = f < 0 ? 0 : 255;
    const a = Math.abs(f);
    return `rgb(${Math.round(c[0] + (t - c[0]) * a)},${Math.round(c[1] + (t - c[1]) * a)},${Math.round(c[2] + (t - c[2]) * a)})`;
  }
  private hex2rgb(h: string): [number, number, number] {
    h = (h || "#000").replace("#", "");
    if (h.length === 3) h = h.split("").map((x) => x + x).join("");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  private rgba(c: string, a: number): string {
    if (c && c[0] === "r") return c.replace("rgb(", "rgba(").replace(")", "," + a + ")");
    const r = this.hex2rgb(c);
    return `rgba(${r[0]},${r[1]},${r[2]},${a})`;
  }

  // ============================================================ path build (letterforms)
  private buildPath() {
    // Each point is [x, y] or [x, y, 'c'] where the third entry flags a curve.
    const L: Record<string, (number | string)[][]> = {
      S: [[0.55, 0.82], [0.48, 0.95], [0.29, 1.0], [0.1, 0.93], [0.05, 0.76], [0.16, 0.61], [0.36, 0.53], [0.5, 0.43], [0.54, 0.25], [0.43, 0.07], [0.2, 0.02], [0.05, 0.14]],
      L: [[0.0, 1.0], [0.0, 0.0, "c"], [0.46, 0.0]],
      I: [[0.05, 1.0], [0.05, 0.0]],
      T: [[0.0, 1.0], [0.56, 1.0, "c"], [0.28, 1.0, "c"], [0.28, 0.0]],
      H: [[0.0, 1.0], [0.0, 0.0, "c"], [0.0, 0.5, "c"], [0.56, 0.5, "c"], [0.56, 1.0, "c"], [0.56, 0.0]],
      E: [[0.46, 1.0], [0.0, 1.0, "c"], [0.0, 0.5, "c"], [0.38, 0.5], [0.0, 0.5, "c"], [0.0, 0.0, "c"], [0.48, 0.0]],
      R: [[0.0, 0.0], [0.0, 1.0, "c"], [0.4, 0.95], [0.52, 0.74], [0.42, 0.55], [0.0, 0.5, "c"], [0.28, 0.34], [0.56, 0.0]],
    };
    const widths: Record<string, number> = { S: 0.58, L: 0.46, I: 0.1, T: 0.56, H: 0.56, E: 0.48, R: 0.56 };
    const order = ["S", "L", "I", "T", "H", "E", "R"];
    const gap = 0.17;
    let xOff = 0;
    const raw: PathPt[] = [];
    const push = (x: number, y: number, w: number) => raw.push({ x, y, w });
    order.forEach((ch, li) => {
      const pts = L[ch];
      const start = { x: (pts[0][0] as number) + xOff, y: pts[0][1] as number };
      if (li > 0) {
        const a = raw[raw.length - 1];
        push(a.x + (start.x - a.x) * 0.34, -0.03, 0.2);
        push(a.x + (start.x - a.x) * 0.66, -0.03, 0.2);
      }
      pts.forEach((p) => {
        const reps = p[2] === "c" ? 3 : 1;
        for (let r = 0; r < reps; r++) push((p[0] as number) + xOff, p[1] as number, 1);
      });
      xOff += widths[ch] + gap;
    });
    this.wordW = xOff - gap;

    const cmv = (a: PathPt, b: PathPt, c: PathPt, d: PathPt, t: number, key: keyof PathPt) => {
      const t2 = t * t;
      const t3 = t2 * t;
      return 0.5 * ((2 * b[key]) + (-a[key] + c[key]) * t + (2 * a[key] - 5 * b[key] + 4 * c[key] - d[key]) * t2 + (-a[key] + 3 * b[key] - 3 * c[key] + d[key]) * t3);
    };
    const sub = 9;
    const sm: PathPt[] = [];
    for (let i = 0; i < raw.length - 1; i++) {
      const p0 = raw[i - 1] || raw[i];
      const p1 = raw[i];
      const p2 = raw[i + 1];
      const p3 = raw[i + 2] || raw[i + 1];
      for (let s = 0; s < sub; s++) {
        const t = s / sub;
        sm.push({ x: cmv(p0, p1, p2, p3, t, "x"), y: cmv(p0, p1, p2, p3, t, "y"), w: Math.max(0.22, cmv(p0, p1, p2, p3, t, "w")) });
      }
    }
    sm.push(raw[raw.length - 1]);

    const step = 0.011;
    const P: PathPt[] = [{ x: sm[0].x, y: sm[0].y, w: sm[0].w }];
    let acc = 0;
    for (let i = 1; i < sm.length; i++) {
      let dx = sm[i].x - sm[i - 1].x;
      let dy = sm[i].y - sm[i - 1].y;
      let d = Math.hypot(dx, dy);
      while (d > 1e-9 && acc + d >= step) {
        const r = (step - acc) / d;
        const np = { x: sm[i - 1].x + dx * r, y: sm[i - 1].y + dy * r, w: sm[i - 1].w + (sm[i].w - sm[i - 1].w) * r };
        P.push(np);
        sm[i - 1] = np;
        dx = sm[i].x - np.x;
        dy = sm[i].y - np.y;
        d = Math.hypot(dx, dy);
        acc = 0;
      }
      acc += d;
    }
    const N: Norm[] = P.map((p, i) => {
      const a = P[Math.max(0, i - 1)];
      const b = P[Math.min(P.length - 1, i + 1)];
      let tx = b.x - a.x;
      let ty = b.y - a.y;
      const m = Math.hypot(tx, ty) || 1;
      tx /= m;
      ty /= m;
      return { tx, ty, nx: -ty, ny: tx };
    });
    this.P = P;
    this.N = N;
    this.count = P.length;

    let minx = 1e9;
    let maxx = -1e9;
    let miny = 1e9;
    let maxy = -1e9;
    P.forEach((p) => {
      minx = Math.min(minx, p.x);
      maxx = Math.max(maxx, p.x);
      if (p.w > 0.6) {
        miny = Math.min(miny, p.y);
        maxy = Math.max(maxy, p.y);
      }
    });
    this.bbox = { minx, maxx, miny, maxy, cx: (minx + maxx) / 2, cy: (miny + maxy) / 2, w: maxx - minx, h: maxy - miny };
  }

  // ============================================================ lifecycle
  init() {
    if (this.inited) return;
    this.inited = true;
    this.buildPath();
    this.mist = [];
    this.dust = [];
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const c = this.canvas;
      if (!c) return;
      const w = c.clientWidth;
      const h = c.clientHeight;
      c.width = Math.round(w * this.dpr);
      c.height = Math.round(h * this.dpr);
      this.ctx = c.getContext("2d");
      this.W = w;
      this.H = h;
    };
    resize();
    this.onResize = resize;
    window.addEventListener("resize", this.onResize);
    this.resumeAudio = () => {
      if (this.actx && this.actx.state === "suspended") void this.actx.resume();
    };
    window.addEventListener("pointerdown", this.resumeAudio);
    window.addEventListener("keydown", this.resumeAudio);
    this.start();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    if (this.onResize) window.removeEventListener("resize", this.onResize);
    if (this.resumeAudio) {
      window.removeEventListener("pointerdown", this.resumeAudio);
      window.removeEventListener("keydown", this.resumeAudio);
    }
  }

  private start() {
    this.t0 = null;
    this.hissPlayed = false;
    this.dustSpawned = false;
    this.mist = [];
    this.dust = [];
    cancelAnimationFrame(this.raf);
    const loop = (ts: number) => {
      if (this.t0 == null) this.t0 = ts;
      let t = (ts - this.t0) / 1000;
      if (this.skipTo != null) t = this.skipTo;
      this.draw(t);
      const done = t >= this.T.s6;
      if (done && !this.finished) {
        this.finished = true;
        this.onDone();
        return;
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.skipTo = null;
    this.raf = requestAnimationFrame(loop);
  }

  skip() {
    this.skipTo = this.T.s6 + 0.05;
  }

  // ============================================================ state from time
  private ease(x: number) {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  }
  private clamp01(x: number) {
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }
  private seg(t: number, a: number, b: number) {
    return this.clamp01((t - a) / (b - a));
  }

  private getState(t: number): St {
    const T = this.T;
    const s: St = { reveal: 0, headAlpha: 0, alpha: 1, idle: 0, zoom: 1, mouth: 0, eyeBright: 1, lift: 0, tongue: 0, hiss: false, dust: 0, blink: 0, charge: 0 };
    if (t < T.s1) {
      s.headAlpha = this.seg(t, T.s1 - 0.25, T.s1) * 0.5;
      s.reveal = 0;
    } else if (t < T.s2) {
      const u = this.seg(t, T.s1, T.s2);
      s.headAlpha = this.ease(u);
      s.reveal = 0.05 * this.ease(u);
    } else if (t < T.s3) {
      s.headAlpha = 1;
      s.reveal = 0.05 + 0.95 * this.ease(this.seg(t, T.s2, T.s3));
    } else if (t < T.s4) {
      s.headAlpha = 1;
      s.reveal = 1;
      s.idle = 1;
    } else if (t < T.s5) {
      const u = this.seg(t, T.s4, T.s5);
      s.headAlpha = 1;
      s.reveal = 1;
      s.idle = 1;
      s.zoom = 1 + 1.35 * this.ease(u);
      s.lift = this.ease(this.clamp01(u * 1.3));
      s.eyeBright = 1 + 1.6 * this.ease(this.clamp01(u * 1.5));
      s.mouth = Math.sin(this.clamp01((u - 0.18) / 0.82) * Math.PI);
      s.tongue = this.clamp01((u - 0.25) / 0.4);
      s.charge = this.ease(u);
      s.hiss = true;
    } else {
      const u = this.seg(t, T.s5, T.s6);
      s.headAlpha = 1 - u;
      s.reveal = 1;
      s.idle = 0;
      s.zoom = 2.35 + 0.25 * u;
      s.lift = 1;
      s.eyeBright = 2.6 * (1 - u);
      s.dust = u;
      s.alpha = 1 - this.ease(u);
    }
    if (s.idle) {
      const bp = (t - T.s3) % 1.4;
      if (bp > 1.15) s.blink = Math.sin((bp - 1.15) / 0.25 * Math.PI);
    }
    return s;
  }

  // ============================================================ draw
  private draw(t: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.W;
    const H = this.H;
    const dpr = this.dpr;
    const P = this.P;
    const p = this.pal();
    const st = this.getState(t);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    const scale = Math.min(W * 0.8 / this.bbox.w, H * 0.4 / 1.18);
    const cx = W / 2 - this.bbox.cx * scale;
    const cy = H * 0.5 + this.bbox.cy * scale;
    const w2s: W2S = (pt, dy = 0) => ({ x: cx + pt.x * scale, y: cy - (pt.y + dy) * scale });

    if (st.reveal > 0.02) {
      const fg = ctx.createRadialGradient(W / 2, cy + scale * 0.15, 10, W / 2, cy + scale * 0.15, this.bbox.w * scale * 0.62);
      fg.addColorStop(0, this.rgba(p.glow, 0.16 * st.reveal));
      fg.addColorStop(0.55, this.rgba(p.gold, 0.05 * st.reveal));
      fg.addColorStop(1, this.rgba(p.glow, 0));
      ctx.fillStyle = fg;
      ctx.fillRect(0, 0, W, H);
    }

    this.drawAmbient(ctx, W, H, t, st, p);

    const head = w2s(P[0]);
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.scale(st.zoom, st.zoom);
    ctx.translate(-head.x, -head.y);
    ctx.globalAlpha = st.alpha;

    const drawCount = Math.max(2, Math.floor(st.reveal * this.count));

    if (st.reveal > 0 && st.dust < 1) this.drawBody(ctx, w2s, scale, drawCount, t, st, p);
    if (st.headAlpha > 0 && st.dust < 1) this.drawHead(ctx, w2s, scale, t, st, p);
    this.updateMist(ctx, w2s, scale, st, p);
    this.updateDust(ctx, p);

    ctx.restore();

    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.92);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,.62)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    if (st.hiss && !this.hissPlayed) {
      this.hissPlayed = true;
      this.playHiss();
    }
    if (st.dust > 0 && !this.dustSpawned) {
      this.dustSpawned = true;
      this.spawnDust(w2s, scale, drawCount);
    }
  }

  // ============================================================ ambient — pellets + casino coins
  private drawAmbient(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, st: St, p: Pal) {
    const u = Math.max(W, H);
    if (!this.coins) {
      this.coins = Array.from({ length: 6 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 0.6 + 0.55, sp: Math.random() * 0.004 + 0.0016, ph: Math.random() * 6.28, spin: Math.random() * 0.6 + 0.4 }));
      this.pellets = Array.from({ length: 20 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 0.7 + 0.5, sp: Math.random() * 0.004 + 0.0014, ph: Math.random() * 6.28, c: Math.floor(Math.random() * 3) }));
    }
    const ray = ctx.createRadialGradient(W / 2, H * 0.5, 10, W / 2, H * 0.5, u * 0.5);
    ray.addColorStop(0, this.rgba(p.glow, 0.06 * st.alpha));
    ray.addColorStop(1, this.rgba(p.glow, 0));
    ctx.fillStyle = ray;
    ctx.fillRect(0, 0, W, H);

    const cols = [p.goldBright, p.gemBright, p.bright];
    ctx.save();
    (this.pellets || []).forEach((o) => {
      const y = ((o.y - (t * o.sp) % 1) + 1) % 1;
      const px = o.x * W;
      const py = y * H;
      const tw = 0.5 + 0.5 * Math.sin(t * 1.7 + o.ph);
      const r = u * 0.0055 * o.s * (0.7 + tw * 0.5);
      const col = cols[o.c];
      const g = ctx.createRadialGradient(px, py, 0, px, py, r * 4.2);
      g.addColorStop(0, this.rgba(col, (0.4 + tw * 0.4) * st.alpha));
      g.addColorStop(0.32, this.rgba(col, 0.14 * st.alpha));
      g.addColorStop(1, this.rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, r * 4.2, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = this.rgba("#fff8e6", (0.32 + tw * 0.5) * st.alpha);
      ctx.beginPath();
      ctx.arc(px, py, r * 0.62, 0, 6.2832);
      ctx.fill();
    });
    ctx.restore();

    ctx.save();
    (this.coins || []).forEach((c) => {
      const y = ((c.y - (t * c.sp) % 1) + 1) % 1;
      const px = c.x * W;
      const py = y * H;
      const r = u * 0.012 * c.s;
      const sx = Math.abs(Math.cos(t * c.spin + c.ph)) * 0.85 + 0.15;
      const a = (0.09 + 0.05 * Math.sin(t * 1.3 + c.ph)) * st.alpha;
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(sx, 1);
      const cg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
      cg.addColorStop(0, this.rgba(p.goldBright, a * 1.5));
      cg.addColorStop(0.6, this.rgba(p.gold, a));
      cg.addColorStop(1, this.rgba(p.goldDeep, a));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, 6.2832);
      ctx.fill();
      ctx.strokeStyle = this.rgba(p.goldBright, a * 0.8);
      ctx.lineWidth = Math.max(0.5, r * 0.12);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.62, 0, 6.2832);
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();
  }

  // ============================================================ body
  private drawBody(ctx: CanvasRenderingContext2D, w2s: W2S, scale: number, count: number, t: number, st: St, p: Pal) {
    const P = this.P;
    const N = this.N;
    const left: V2[] = [];
    const right: V2[] = [];
    for (let i = 0; i < count; i++) {
      const u = i / (this.count - 1);
      let hw = 0.074 * (P[i].w || 1);
      if (u > 0.93) hw = Math.min(hw, 0.074 * (1 - (u - 0.93) / 0.07) + 0.005);
      if (st.idle || st.hiss) hw *= 1 + 0.05 * Math.sin(t * 1.5 + i * 0.05);
      const n = N[i];
      const pt = P[i];
      left.push(w2s({ x: pt.x + n.nx * hw, y: pt.y + n.ny * hw }));
      right.push(w2s({ x: pt.x - n.nx * hw, y: pt.y - n.ny * hw }));
    }
    const poly = () => {
      ctx.beginPath();
      ctx.moveTo(left[0].x, left[0].y);
      for (let i = 1; i < count; i++) ctx.lineTo(left[i].x, left[i].y);
      for (let i = count - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
      ctx.closePath();
    };

    // neon underglow
    ctx.save();
    ctx.shadowColor = this.rgba(p.mid, 0.95);
    ctx.shadowBlur = 30;
    ctx.fillStyle = this.rgba(p.dark, 1);
    poly();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = p.dark;
    poly();
    ctx.fill();
    ctx.save();
    poly();
    ctx.clip();

    // cylindrical enamel sheen along the spine
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const spine = (off: number, wpx: number, col: string, a: number) => {
      ctx.strokeStyle = this.rgba(col, a);
      ctx.lineWidth = wpx;
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const n = N[i];
        const pt = P[i];
        const s = w2s({ x: pt.x + n.nx * off, y: pt.y + n.ny * off });
        i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y);
      }
      ctx.stroke();
    };
    spine(-0.03, 0.06 * scale, p.deep, 0.65);
    spine(0.016, 0.105 * scale, p.mid, 1);
    spine(0.028, 0.06 * scale, p.light, 0.9);
    spine(0.034, 0.024 * scale, p.bright, 0.95);

    // gem-facet scales with gold micro-rim
    for (let i = 6; i < count - 3; i += 5) {
      const n = N[i];
      const pt = P[i];
      for (let lane = -1; lane <= 1; lane++) {
        const off = lane * 0.04;
        const cxp = pt.x + n.nx * off;
        const cyp = pt.y + n.ny * off;
        const rl = 0.02;
        const rw = 0.024;
        const a = w2s({ x: cxp + n.tx * rl, y: cyp + n.ty * rl });
        const b = w2s({ x: cxp + n.nx * rw, y: cyp + n.ny * rw });
        const c = w2s({ x: cxp - n.tx * rl, y: cyp - n.ty * rl });
        const d = w2s({ x: cxp - n.nx * rw, y: cyp - n.ny * rw });
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(c.x, c.y);
        ctx.lineTo(d.x, d.y);
        ctx.closePath();
        ctx.fillStyle = this.rgba(lane === 0 ? p.light : p.mid, 0.16);
        ctx.fill();
        ctx.strokeStyle = this.rgba(p.goldDeep, 0.3);
        ctx.lineWidth = Math.max(0.6, scale * 0.0035);
        ctx.stroke();
        ctx.fillStyle = this.rgba(p.bright, 0.5);
        ctx.beginPath();
        ctx.arc((a.x + b.x) / 2, (a.y + b.y) / 2, Math.max(0.6, scale * 0.006), 0, 6.2832);
        ctx.fill();
      }
    }

    // travelling specular bloom
    if (st.reveal > 0.35) {
      const hi = (t * 0.16) % 1;
      const center = Math.floor(hi * count);
      const span = Math.floor(count * 0.06);
      for (let k = -span; k <= span; k++) {
        const i = center + k;
        if (i < 0 || i >= count) continue;
        const fall = 1 - Math.abs(k) / span;
        const n = N[i];
        const pt = P[i];
        const s = w2s({ x: pt.x + n.nx * 0.03, y: pt.y + n.ny * 0.03 });
        ctx.fillStyle = this.rgba(p.goldBright, 0.22 * fall);
        ctx.beginPath();
        ctx.arc(s.x, s.y, scale * 0.022 * fall + 0.5, 0, 6.2832);
        ctx.fill();
      }
    }
    ctx.restore();

    const edge = (arr: V2[], col: string, a: number, wpx: number) => {
      ctx.strokeStyle = this.rgba(col, a);
      ctx.lineWidth = wpx;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let i = 0; i < count; i++) i ? ctx.lineTo(arr[i].x, arr[i].y) : ctx.moveTo(arr[i].x, arr[i].y);
      ctx.stroke();
    };
    edge(left, p.gold, 0.55, Math.max(1, scale * 0.007));
    edge(right, p.ink, 0.7, Math.max(1, scale * 0.009));

    if (count >= this.count - 2) {
      const tip = w2s(this.P[this.count - 1]);
      ctx.fillStyle = this.rgba(p.gold, 0.9);
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, scale * 0.012, 0, 6.2832);
      ctx.fill();
    }
  }

  // ============================================================ head — premium cobra mascot
  private drawHead(ctx: CanvasRenderingContext2D, w2s: W2S, scale: number, t: number, st: St, p: Pal) {
    const P = this.P;
    const N = this.N;
    const pt0 = P[0];
    const n0 = N[0];
    const fx = -n0.tx;
    const fy = -n0.ty;
    const liftY = st.lift * 0.16;
    const base = w2s(pt0, liftY);
    ctx.save();
    ctx.globalAlpha *= st.headAlpha;
    ctx.translate(base.x, base.y);
    ctx.rotate(Math.atan2(-fy, fx) - st.lift * 0.45);

    const HL = scale * 0.27;
    const HV = scale * 0.225;
    const breath = st.idle ? 1 + 0.025 * Math.sin(t * 1.6) : 1;
    const mouth = st.mouth * 0.8;
    const hoodOn = this.opts.hood !== false;
    const flip = this.hflip || 1;
    ctx.scale(1, flip);

    // cobra hood
    if (hoodOn) {
      const f = 0.45 + st.lift * 1.05;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-HL * 0.12, -HV * 0.45);
      ctx.quadraticCurveTo(-HL * (0.5 + f * 0.6), -HV * (1.1 + f * 0.8), -HL * (0.85 + f * 0.7), -HV * 0.15);
      ctx.quadraticCurveTo(-HL * (1.0 + f * 0.8), HV * 0.5, -HL * (0.7 + f * 0.55), HV * (1.0 + f * 0.7));
      ctx.quadraticCurveTo(-HL * 0.4, HV * 0.75, -HL * 0.12, HV * 0.5);
      ctx.closePath();
      const hg = ctx.createRadialGradient(-HL * 0.5, 0, 2, -HL * 0.5, 0, HV * (1.8 + f));
      hg.addColorStop(0, p.dark);
      hg.addColorStop(0.6, p.deep);
      hg.addColorStop(1, p.ink);
      ctx.fillStyle = hg;
      ctx.shadowColor = this.rgba(p.mid, 0.6);
      ctx.shadowBlur = 22;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = this.rgba(p.gold, 0.5);
      ctx.lineWidth = Math.max(1, scale * 0.006);
      ctx.stroke();
      const gx = -HL * (0.55 + f * 0.4);
      const gr = HV * 0.34;
      const cg = ctx.createRadialGradient(gx, 0, 1, gx, 0, gr * 1.7);
      cg.addColorStop(0, this.rgba(p.gemBright, 0.85));
      cg.addColorStop(0.5, this.rgba(p.gem, 0.4));
      cg.addColorStop(1, this.rgba(p.gem, 0));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(gx, 0, gr * 1.7, 0, 6.2832);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(gx + gr * 0.7, 0);
      ctx.lineTo(gx, gr);
      ctx.lineTo(gx - gr * 0.7, 0);
      ctx.lineTo(gx, -gr);
      ctx.closePath();
      const dg = ctx.createLinearGradient(gx, -gr, gx, gr);
      dg.addColorStop(0, p.gemBright);
      dg.addColorStop(0.5, p.gem);
      dg.addColorStop(1, this.shade(p.gem, -0.3));
      ctx.fillStyle = dg;
      ctx.fill();
      ctx.strokeStyle = this.rgba(p.gold, 0.85);
      ctx.lineWidth = Math.max(1, scale * 0.004);
      ctx.stroke();
      ctx.restore();
    }

    // lower jaw
    ctx.save();
    ctx.translate(HL * 0.04, HV * 0.05);
    ctx.rotate(mouth);
    ctx.beginPath();
    ctx.moveTo(-HL * 0.02, 0);
    ctx.quadraticCurveTo(HL * 0.45, HV * 0.14 * breath, HL * 0.92, HV * 0.1);
    ctx.quadraticCurveTo(HL * 0.5, HV * 0.5, -HL * 0.06, HV * 0.3);
    ctx.closePath();
    const jg = ctx.createLinearGradient(0, 0, 0, HV * 0.5);
    jg.addColorStop(0, p.mid);
    jg.addColorStop(1, p.deep);
    ctx.fillStyle = jg;
    ctx.fill();
    ctx.strokeStyle = this.rgba(p.gold, 0.5);
    ctx.lineWidth = Math.max(1, scale * 0.005);
    ctx.stroke();
    ctx.restore();

    // mouth interior
    if (mouth > 0.04) {
      ctx.fillStyle = "#170207";
      ctx.beginPath();
      ctx.moveTo(HL * 0.04, HV * 0.04);
      ctx.quadraticCurveTo(HL * 0.5, HV * 0.12, HL * 0.9, HV * 0.07);
      ctx.quadraticCurveTo(HL * 0.5, -HV * 0.02, HL * 0.04, -HV * 0.02);
      ctx.closePath();
      ctx.fill();
    }

    this.drawTongue(ctx, HL, HV, t, st);

    // upper head
    ctx.beginPath();
    ctx.moveTo(-HL * 0.6, -HV * 0.2);
    ctx.quadraticCurveTo(-HL * 0.2, -HV * 0.98, HL * 0.3, -HV * 0.82);
    ctx.quadraticCurveTo(HL * 0.74, -HV * 0.68, HL * 1.08, -HV * 0.16);
    ctx.lineTo(HL * 1.02, HV * 0.06);
    ctx.quadraticCurveTo(HL * 0.5, HV * 0.04, HL * 0.06, HV * 0.06);
    ctx.quadraticCurveTo(-HL * 0.32, HV * 0.12, -HL * 0.6, HV * 0.18);
    ctx.closePath();
    const ug = ctx.createLinearGradient(0, -HV * 0.95, 0, HV * 0.2);
    ug.addColorStop(0, p.bright);
    ug.addColorStop(0.32, p.light);
    ug.addColorStop(0.72, p.mid);
    ug.addColorStop(1, p.deep);
    ctx.fillStyle = ug;
    ctx.shadowColor = this.rgba(p.mid, 0.8);
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = this.rgba(p.gold, 0.6);
    ctx.lineWidth = Math.max(1, scale * 0.007);
    ctx.stroke();

    // crown specular ridge
    ctx.strokeStyle = this.rgba(p.bright, 0.55);
    ctx.lineWidth = Math.max(1, scale * 0.006);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-HL * 0.32, -HV * 0.52);
    ctx.quadraticCurveTo(HL * 0.32, -HV * 0.82, HL * 0.98, -HV * 0.1);
    ctx.stroke();

    // cheek scales
    for (let r = 0; r < 4; r++) {
      const sxp = -HL * 0.18 + r * HL * 0.27;
      const syp = -HV * 0.22 + (r % 2) * HV * 0.2;
      ctx.beginPath();
      ctx.moveTo(sxp + HL * 0.085, syp);
      ctx.lineTo(sxp, syp + HV * 0.14);
      ctx.lineTo(sxp - HL * 0.085, syp);
      ctx.lineTo(sxp, syp - HV * 0.14);
      ctx.closePath();
      ctx.fillStyle = this.rgba(p.light, 0.14);
      ctx.fill();
      ctx.strokeStyle = this.rgba(p.goldDeep, 0.3);
      ctx.lineWidth = Math.max(0.6, scale * 0.003);
      ctx.stroke();
    }

    // fangs while gaping
    if (mouth > 0.05) {
      ([[HL * 0.86, HV * 0.34], [HL * 0.58, HV * 0.24]] as Array<[number, number]>).forEach(([fxp, fl]) => {
        ctx.beginPath();
        ctx.moveTo(fxp, HV * 0.04);
        ctx.lineTo(fxp - HL * 0.07, HV * 0.04);
        ctx.lineTo(fxp - HL * 0.02, HV * 0.04 + fl);
        ctx.closePath();
        const fg = ctx.createLinearGradient(fxp, HV * 0.04, fxp, HV * 0.04 + fl);
        fg.addColorStop(0, "#fff8e8");
        fg.addColorStop(1, p.gold);
        ctx.fillStyle = fg;
        ctx.fill();
        ctx.strokeStyle = this.rgba(p.goldDeep, 0.6);
        ctx.lineWidth = Math.max(0.5, scale * 0.0025);
        ctx.stroke();
      });
    }

    // nostril
    ctx.fillStyle = "#0c0703";
    ctx.beginPath();
    ctx.ellipse(HL * 0.84, -HV * 0.04, HL * 0.035, HV * 0.05, 0.3, 0, 6.2832);
    ctx.fill();

    // brow + gem eye
    const eyeX = HL * 0.4;
    const eyeY = -HV * 0.4;
    ctx.beginPath();
    ctx.moveTo(eyeX - HL * 0.28, eyeY - HV * 0.04);
    ctx.lineTo(eyeX + HL * 0.32, eyeY - HV * 0.34);
    ctx.lineTo(eyeX + HL * 0.2, eyeY + HV * 0.02);
    ctx.closePath();
    const browg = ctx.createLinearGradient(0, eyeY - HV * 0.3, 0, eyeY + HV * 0.05);
    browg.addColorStop(0, p.mid);
    browg.addColorStop(1, p.ink);
    ctx.fillStyle = browg;
    ctx.fill();
    ctx.strokeStyle = this.rgba(p.gold, 0.55);
    ctx.lineWidth = Math.max(0.8, scale * 0.004);
    ctx.stroke();

    this.drawEye(ctx, eyeX, eyeY, HV * 0.27, -0.5, st, p, scale);

    // crest gem
    const crx = HL * 0.06;
    const cry = -HV * 0.72;
    const crr = HV * 0.16 * (0.85 + st.eyeBright * 0.06);
    const crg = ctx.createRadialGradient(crx, cry, 0, crx, cry, crr * 1.8);
    crg.addColorStop(0, this.rgba(p.gemBright, 0.8));
    crg.addColorStop(0.5, this.rgba(p.gem, 0.35));
    crg.addColorStop(1, this.rgba(p.gem, 0));
    ctx.fillStyle = crg;
    ctx.beginPath();
    ctx.arc(crx, cry, crr * 1.8, 0, 6.2832);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(crx + crr * 0.6, cry);
    ctx.lineTo(crx, cry + crr);
    ctx.lineTo(crx - crr * 0.6, cry);
    ctx.lineTo(crx, cry - crr);
    ctx.closePath();
    const crd = ctx.createLinearGradient(crx, cry - crr, crx, cry + crr);
    crd.addColorStop(0, p.gemBright);
    crd.addColorStop(0.5, p.gem);
    crd.addColorStop(1, this.shade(p.gem, -0.3));
    ctx.fillStyle = crd;
    ctx.fill();
    ctx.strokeStyle = this.rgba(p.gold, 0.8);
    ctx.lineWidth = Math.max(0.8, scale * 0.0035);
    ctx.stroke();

    ctx.restore();
  }

  private drawEye(ctx: CanvasRenderingContext2D, ex: number, ey: number, er: number, angle: number, st: St, p: Pal, scale: number) {
    const open = 1 - st.blink;
    const halo = ctx.createRadialGradient(ex, ey, 0, ex, ey, er * 1.9 * st.eyeBright);
    halo.addColorStop(0, this.rgba(p.eye, 0.7));
    halo.addColorStop(0.45, this.rgba(p.eye, 0.22));
    halo.addColorStop(1, this.rgba(p.eye, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(ex, ey, er * 1.9 * st.eyeBright, 0, 6.2832);
    ctx.fill();

    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(angle);
    const ax = er * 1.28;
    const ay = Math.max(0.001, er * 0.82 * open);
    ctx.fillStyle = p.goldDeep;
    ctx.beginPath();
    ctx.ellipse(0, 0, ax * 1.14, ay * 1.18, 0, 0, 6.2832);
    ctx.fill();
    ctx.strokeStyle = this.rgba(p.goldBright, 0.9);
    ctx.lineWidth = Math.max(0.8, scale * 0.0045);
    ctx.beginPath();
    ctx.ellipse(0, 0, ax * 1.14, ay * 1.18, 0, 0, 6.2832);
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, ax, ay, 0, 0, 6.2832);
    ctx.clip();
    const g = ctx.createRadialGradient(-ax * 0.32, -ay * 0.3, 1, 0, 0, ax);
    g.addColorStop(0, "#fff6df");
    g.addColorStop(0.34, p.eyeBright);
    g.addColorStop(0.78, p.eye);
    g.addColorStop(1, this.shade(p.eye, -0.45));
    ctx.fillStyle = g;
    ctx.fillRect(-ax, -ay, ax * 2, ay * 2);
    ctx.save();
    ctx.rotate(-angle);
    ctx.fillStyle = "#0a0500";
    ctx.beginPath();
    ctx.ellipse(0, 0, er * 0.17, ay * 1.4, 0, 0, 6.2832);
    ctx.fill();
    ctx.strokeStyle = this.rgba(p.eyeBright, 0.5);
    ctx.lineWidth = Math.max(0.5, scale * 0.0025);
    ctx.beginPath();
    ctx.ellipse(0, 0, er * 0.17, ay * 1.4, 0, 0, 6.2832);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.beginPath();
    ctx.arc(-ax * 0.36, -ay * 0.36, er * 0.16, 0, 6.2832);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.5)";
    ctx.beginPath();
    ctx.arc(ax * 0.34, ay * 0.4, er * 0.08, 0, 6.2832);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  private drawTongue(ctx: CanvasRenderingContext2D, HL: number, HW: number, t: number, st: St) {
    let out = st.tongue;
    if (st.idle && !st.hiss) {
      const fp = (t - this.T.s3) % 1.9;
      out = fp < 0.32 ? Math.sin(fp / 0.32 * Math.PI) * 0.7 : 0;
    }
    if (out <= 0.02) return;
    const ox = HL * 0.98;
    const oy = HW * 0.05;
    const len = HL * (0.45 + out * 1.05);
    const wob = Math.sin(t * 22) * HW * 0.14 * out;
    ctx.save();
    ctx.strokeStyle = "#d6264a";
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(1.4, HW * 0.12);
    ctx.shadowColor = "rgba(220,40,80,.7)";
    ctx.shadowBlur = 7;
    const tipx = ox + len;
    const tipy = oy + wob;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.quadraticCurveTo(ox + len * 0.5, oy + wob * 0.4, tipx, tipy);
    ctx.stroke();
    const fl = len * 0.32;
    ctx.beginPath();
    ctx.moveTo(tipx, tipy);
    ctx.lineTo(tipx + fl, tipy - HW * 0.18 - wob);
    ctx.moveTo(tipx, tipy);
    ctx.lineTo(tipx + fl, tipy + HW * 0.18 - wob);
    ctx.lineWidth = Math.max(1, HW * 0.08);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,180,200,.6)";
    ctx.lineWidth = Math.max(0.6, HW * 0.04);
    ctx.beginPath();
    ctx.moveTo(ox, oy - HW * 0.02);
    ctx.quadraticCurveTo(ox + len * 0.5, oy + wob * 0.3, tipx, tipy);
    ctx.stroke();
    ctx.restore();
  }

  // ============================================================ particles
  private updateMist(ctx: CanvasRenderingContext2D, w2s: W2S, scale: number, st: St, p: Pal) {
    if (st.hiss && Math.random() < 0.8) {
      const head = w2s(this.P[0], st.lift * 0.16);
      const n0 = this.N[0];
      const dirx = -n0.tx;
      const gold = Math.random() < 0.45;
      this.mist.push({
        x: head.x + scale * 0.24 * dirx,
        y: head.y - scale * 0.05,
        vx: (dirx * 0.6 + (Math.random() - 0.5) * 0.9) * scale * 0.022,
        vy: (-0.4 + (Math.random() - 0.5) * 0.6) * scale * 0.022,
        r: scale * (0.02 + Math.random() * 0.035),
        life: 1,
        max: 0.6 + Math.random() * 0.4,
        gold,
      });
    }
    this.mist = this.mist.filter((m) => m.life > 0);
    this.mist.forEach((m) => {
      m.x += m.vx;
      m.y += m.vy;
      m.vy -= scale * 0.0006;
      m.r *= 1.025;
      m.life -= 0.03 / m.max;
      ctx.fillStyle = this.rgba(m.gold ? p.gold : p.glow, 0.11 * Math.max(0, m.life));
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, 6.2832);
      ctx.fill();
    });
  }

  private spawnDust(w2s: W2S, scale: number, count: number) {
    const P = this.P;
    const N = this.N;
    for (let i = 0; i < count; i += 2) {
      const n = N[i];
      const pt = P[i];
      for (let lane = -1; lane <= 1; lane++) {
        const s = w2s({ x: pt.x + n.nx * lane * 0.04, y: pt.y + n.ny * lane * 0.04 });
        this.dust.push({
          x: s.x,
          y: s.y,
          vx: (Math.random() - 0.5) * scale * 0.014,
          vy: -(0.2 + Math.random() * 0.85) * scale * 0.016,
          r: scale * (0.008 + Math.random() * 0.016),
          life: 1,
          max: 0.6 + Math.random() * 0.6,
          kind: Math.random() < 0.34 ? "gold" : Math.random() < 0.18 ? "gem" : "jade",
        });
      }
    }
  }
  private updateDust(ctx: CanvasRenderingContext2D, p: Pal) {
    this.dust = this.dust.filter((d) => d.life > 0);
    this.dust.forEach((d) => {
      d.x += d.vx;
      d.y += d.vy;
      d.vy -= 0.0003 * 1;
      d.vx *= 0.99;
      d.life -= 0.012 / d.max;
      const col = d.kind === "gold" ? p.goldBright : d.kind === "gem" ? p.gemBright : p.light;
      ctx.fillStyle = this.rgba(col, Math.max(0, d.life) * 0.95);
      ctx.shadowColor = this.rgba(col, 0.65);
      ctx.shadowBlur = 7;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * (0.5 + d.life * 0.5), 0, 6.2832);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }

  // ============================================================ audio
  private playHiss() {
    if (this.opts.soundOn === false) return;
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      if (!this.actx) this.actx = new Ctor();
      const ac = this.actx;
      if (ac.state === "suspended") void ac.resume();
      const dur = 1.0;
      const n = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, n, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource();
      src.buffer = buf;
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 0.8;
      bp.frequency.setValueAtTime(2200, ac.currentTime);
      bp.frequency.exponentialRampToValueAtTime(6500, ac.currentTime + 0.5);
      bp.frequency.exponentialRampToValueAtTime(3500, ac.currentTime + dur);
      const hp = ac.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 1400;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.32, ac.currentTime + 0.08);
      g.gain.setValueAtTime(0.32, ac.currentTime + 0.45);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      src.connect(bp);
      bp.connect(hp);
      hp.connect(g);
      g.connect(ac.destination);
      src.start();
    } catch (e) {
      /* audio blocked until user gesture */
    }
  }
}
