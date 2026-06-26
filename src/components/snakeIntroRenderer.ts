// Cinematic "SLITHER" startup animation — canvas renderer.
// A realistic emerald serpent emerges from darkness, lays out the SLITHER
// wordmark as its body unfurls, idles (breathing / tongue / blink), rears up
// for a signature hiss, then dissolves into glowing particles.
//
// Pure, stateless draw function: every frame is a deterministic function of
// elapsed time, so the sequence is fully reproducible and easy to scrub.
// Tune the look by editing INTRO_PALETTE / INTRO_TIMELINE below.

export type IntroPalette = {
  bgInner: string;
  bgOuter: string;
  ambient: string;
  bodyTop: string;
  bodyMid: string;
  bodyDark: string;
  belly: string;
  gold: string;
  goldSoft: string;
  eyeGlow: string;
  eyeCore: string;
  pupil: string;
  tongue: string;
  tongueDark: string;
  textFill: string;
  textFillSoft: string;
  glow: string;
  mist: string;
};

export const INTRO_PALETTE: IntroPalette = {
  bgInner: "#08130d",
  bgOuter: "#000000",
  ambient: "rgba(31, 122, 82, 0.10)",
  bodyTop: "#3fa970",
  bodyMid: "#1c6e49",
  bodyDark: "#0a3623",
  belly: "#06241a",
  gold: "#d8bd7e",
  goldSoft: "rgba(216, 189, 126, 0.55)",
  eyeGlow: "#8dffb0",
  eyeCore: "#e7fff0",
  pupil: "#02140c",
  tongue: "#e0455f",
  tongueDark: "#8c1f33",
  textFill: "#eafff2",
  textFillSoft: "#bfe7cf",
  glow: "rgba(78, 230, 150, 0.9)",
  mist: "rgba(170, 255, 205, 0.18)",
};

// Scene boundaries in seconds (cumulative). total === full duration.
export const INTRO_TIMELINE = {
  black: 0.5, // black screen
  emerge: 1.5, // eyes + head emerge
  form: 3.5, // body unfurls forming SLITHER
  idle: 4.5, // idle: breathing, tongue, blink
  hiss: 5.5, // rear up + hiss + mist
  total: 6.0, // dissolve + fade out
};

export const INTRO_TOTAL_MS = INTRO_TIMELINE.total * 1000;
export const INTRO_HISS_MS = INTRO_TIMELINE.idle * 1000;

const WORD = "SLITHER";

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
// Deterministic pseudo-random in [0,1) from an integer seed.
const prand = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

type Pt = { x: number; y: number };

export function drawIntroFrame(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, pal: IntroPalette = INTRO_PALETTE) {
  const T = INTRO_TIMELINE;
  ctx.clearRect(0, 0, W, H);

  // ---- Background: black with a faint emerald breath ----
  const bg = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
  bg.addColorStop(0, pal.bgInner);
  bg.addColorStop(0.6, "#020805");
  bg.addColorStop(1, pal.bgOuter);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // drifting ambient glow
  const amb = ctx.createRadialGradient(
    W * (0.5 + Math.sin(t * 0.4) * 0.08),
    H * (0.45 + Math.cos(t * 0.3) * 0.05),
    0,
    W * 0.5,
    H * 0.5,
    Math.max(W, H) * 0.45,
  );
  amb.addColorStop(0, pal.ambient);
  amb.addColorStop(1, "transparent");
  ctx.fillStyle = amb;
  ctx.fillRect(0, 0, W, H);

  if (t < T.black) {
    // pure darkness, just the faintest pair of eye sparks waking
    const wake = smoothstep(T.black * 0.55, T.black, t);
    if (wake > 0) drawWakingEyes(ctx, W, H, wake, pal);
    drawVignette(ctx, W, H);
    return;
  }

  // ---- Geometry for the wordmark spine ----
  const cx = W / 2;
  const cy = H * 0.52;
  let fontSize = Math.min(132, Math.max(40, W * 0.12));
  ctx.font = `800 ${fontSize}px "Outfit", system-ui`;
  let wordW = ctx.measureText(WORD).width;
  const maxW = W * 0.86;
  if (wordW > maxW) {
    fontSize *= maxW / wordW;
    ctx.font = `800 ${fontSize}px "Outfit", system-ui`;
    wordW = ctx.measureText(WORD).width;
  }
  const left = cx - wordW / 2;
  const baseY = cy;
  const waves = 3.4;

  // Idle breathing modulates undulation amplitude after the logo forms.
  const formedT = clamp01((t - T.emerge) / (T.form - T.emerge));
  const breathing = t >= T.form ? 0.85 + Math.sin(t * 1.7) * 0.15 : 1;
  const amp = fontSize * 0.24 * breathing;
  const phaseShift = t * 0.7;

  // Head rears up during the hiss; small lift of the front of the body.
  const hissT = t >= T.idle ? easeInOut(clamp01((t - T.idle) / (T.hiss - T.idle))) : 0;
  const lift = hissT * fontSize * 0.55;

  const spine = (s: number): Pt => {
    const x = left + s * wordW;
    const env = Math.sin(clamp01(s) * Math.PI); // damp ends a touch
    let y = baseY + Math.sin(s * Math.PI * waves + phaseShift) * amp * (0.55 + 0.45 * env);
    // front of the snake (near head, s≈0) lifts during the hiss
    y -= lift * Math.exp(-Math.pow(s * 7, 2));
    return { x, y };
  };

  // How much of the body is drawn (head at s=0, tail tip advancing right).
  let drawn: number;
  if (t < T.emerge) drawn = lerp(0.03, 0.08, easeOut(clamp01((t - T.black) / (T.emerge - T.black))));
  else if (t < T.form) drawn = lerp(0.08, 1, easeInOut(formedT));
  else drawn = 1;

  // ---- Cinematic zoom toward the head for the hiss / dissolve ----
  const headPt = spine(0);
  const zoom = t >= T.idle ? 1 + (t < T.hiss ? hissT : 1) * 1.25 : 1;
  const focusBlend = t >= T.idle ? (t < T.hiss ? hissT : 1) : 0;
  const fx = lerp(headPt.x, W * 0.4, focusBlend);
  const fy = lerp(headPt.y, H * 0.46, focusBlend);

  // World alpha fades out during the final dissolve.
  const outT = t >= T.hiss ? clamp01((t - T.hiss) / (T.total - T.hiss)) : 0;
  const worldAlpha = 1 - easeInOut(outT);

  ctx.save();
  ctx.translate(fx, fy);
  ctx.scale(zoom, zoom);
  ctx.translate(-headPt.x, -headPt.y);
  ctx.globalAlpha = worldAlpha;

  // Logo letters, revealed by the advancing body.
  drawWordmark(ctx, left, baseY, fontSize, wordW, drawn, t, pal);

  // Snake body unfurling along the spine.
  drawSnakeBody(ctx, spine, drawn, fontSize, t, pal);

  // Head with glowing eyes, tongue, mouth (opens during hiss).
  const blink = blinkAmount(t);
  drawSnakeHead(ctx, spine, fontSize, t, hissT, blink, pal);

  // Mist around the mouth during the hiss.
  if (hissT > 0.15 && outT < 0.4) drawMist(ctx, spine, fontSize, t - T.idle, hissT, pal);

  ctx.globalAlpha = 1;
  ctx.restore();

  // Dissolve particles rise as the world fades.
  if (outT > 0) {
    ctx.save();
    ctx.translate(fx, fy);
    ctx.scale(zoom, zoom);
    ctx.translate(-headPt.x, -headPt.y);
    drawDissolve(ctx, spine, fontSize, outT, pal);
    ctx.restore();
  }

  drawVignette(ctx, W, H);

  // Final black wipe to seat the menu transition.
  if (outT > 0) {
    ctx.globalAlpha = easeInOut(clamp01((outT - 0.3) / 0.7));
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------------------

function drawVignette(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const vg = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.25, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
  vg.addColorStop(0, "transparent");
  vg.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

function drawWakingEyes(ctx: CanvasRenderingContext2D, W: number, H: number, k: number, pal: IntroPalette) {
  const ex = W * 0.5;
  const ey = H * 0.52;
  const gap = Math.max(10, W * 0.012);
  for (const dir of [-1, 1]) {
    const g = ctx.createRadialGradient(ex + dir * gap, ey, 0, ex + dir * gap, ey, 26 * k);
    g.addColorStop(0, pal.eyeGlow);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.globalAlpha = k * 0.9;
    ctx.beginPath();
    ctx.arc(ex + dir * gap, ey, 26 * k, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawWordmark(
  ctx: CanvasRenderingContext2D,
  left: number,
  baseY: number,
  fontSize: number,
  wordW: number,
  drawn: number,
  t: number,
  pal: IntroPalette,
) {
  const revealX = left + drawn * wordW + fontSize * 0.25;
  ctx.save();
  // reveal clip follows the advancing body
  ctx.beginPath();
  ctx.rect(left - fontSize, baseY - fontSize * 1.2, revealX - (left - fontSize), fontSize * 2.4);
  ctx.clip();

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${fontSize}px "Outfit", system-ui`;

  // emerald glow halo
  ctx.save();
  ctx.shadowColor = pal.glow;
  ctx.shadowBlur = fontSize * 0.5;
  const grad = ctx.createLinearGradient(left, baseY - fontSize * 0.6, left, baseY + fontSize * 0.6);
  grad.addColorStop(0, pal.textFill);
  grad.addColorStop(1, pal.textFillSoft);
  ctx.fillStyle = grad;
  ctx.fillText(WORD, left, baseY);
  ctx.restore();

  // gold edge
  ctx.lineWidth = Math.max(1, fontSize * 0.012);
  ctx.strokeStyle = pal.goldSoft;
  ctx.strokeText(WORD, left, baseY);

  // bright wipe highlight at the reveal edge
  const wipe = ctx.createLinearGradient(revealX - fontSize * 0.8, 0, revealX, 0);
  wipe.addColorStop(0, "transparent");
  wipe.addColorStop(1, "rgba(231,255,240,0.85)");
  ctx.fillStyle = wipe;
  ctx.globalCompositeOperation = "lighter";
  ctx.fillText(WORD, left, baseY);
  ctx.globalCompositeOperation = "source-over";

  ctx.restore();
}

// Width profile along the body. s in [0,1]; head at 0, tail at 1.
function bodyWidth(s: number, drawn: number, fontSize: number) {
  const base = fontSize * 0.16;
  // head/neck: slight bulge then pinch
  const neck = lerp(1.35, 0.92, smoothstep(0, 0.06, s));
  // taper toward the true tail
  const tail = 1 - smoothstep(0.82, 1, s);
  // pointed growing tip while still unfurling
  const tip = drawn < 1 ? smoothstep(0, 0.06, (drawn - s) / Math.max(0.0001, drawn)) : 1;
  return base * neck * (0.55 + 0.45 * tail) * tip;
}

function spineSamples(spine: (s: number) => Pt, drawn: number): { pts: Pt[]; norms: Pt[]; ss: number[] } {
  const N = Math.max(10, Math.round(120 * drawn));
  const pts: Pt[] = [];
  const ss: number[] = [];
  for (let i = 0; i <= N; i += 1) {
    const s = (i / N) * drawn;
    ss.push(s);
    pts.push(spine(s));
  }
  const norms: Pt[] = [];
  for (let i = 0; i <= N; i += 1) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(N, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    norms.push({ x: -dy / len, y: dx / len });
  }
  return { pts, norms, ss };
}

function drawSnakeBody(
  ctx: CanvasRenderingContext2D,
  spine: (s: number) => Pt,
  drawn: number,
  fontSize: number,
  t: number,
  pal: IntroPalette,
) {
  const { pts, norms, ss } = spineSamples(spine, drawn);
  const N = pts.length - 1;
  if (N < 2) return;

  // Build the body outline polygon.
  ctx.beginPath();
  for (let i = 0; i <= N; i += 1) {
    const w = bodyWidth(ss[i], drawn, fontSize);
    const p = pts[i];
    const n = norms[i];
    const x = p.x + n.x * w;
    const y = p.y + n.y * w;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = N; i >= 0; i -= 1) {
    const w = bodyWidth(ss[i], drawn, fontSize);
    const p = pts[i];
    const n = norms[i];
    ctx.lineTo(p.x - n.x * w, p.y - n.y * w);
  }
  ctx.closePath();

  // Fill: top-lit emerald with a dark belly.
  const grad = ctx.createLinearGradient(0, -fontSize, 0, fontSize);
  grad.addColorStop(0, pal.bodyTop);
  grad.addColorStop(0.5, pal.bodyMid);
  grad.addColorStop(1, pal.belly);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = fontSize * 0.22;
  ctx.shadowOffsetY = fontSize * 0.06;
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  // Scales + specular shimmer, clipped to the body.
  ctx.save();
  ctx.clip();
  drawScales(ctx, pts, norms, ss, drawn, fontSize, pal);
  drawShimmer(ctx, pts, ss, fontSize, t);
  ctx.restore();

  // Gold rim light along the back edge.
  ctx.beginPath();
  for (let i = 0; i <= N; i += 1) {
    const w = bodyWidth(ss[i], drawn, fontSize) * 0.92;
    const p = pts[i];
    const n = norms[i];
    const x = p.x + n.x * w;
    const y = p.y + n.y * w;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.lineWidth = Math.max(1, fontSize * 0.02);
  ctx.strokeStyle = pal.goldSoft;
  ctx.stroke();
}

function drawScales(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  norms: Pt[],
  ss: number[],
  drawn: number,
  fontSize: number,
  pal: IntroPalette,
) {
  const N = pts.length - 1;
  const step = 2; // sample every other point for scale rows
  for (let i = 0; i <= N; i += step) {
    const w = bodyWidth(ss[i], drawn, fontSize);
    if (w < 2) continue;
    const p = pts[i];
    const n = norms[i];
    const rows = 4;
    for (let r = -rows; r <= rows; r += 1) {
      const off = (r / rows) * w * 0.82;
      const sx = p.x + n.x * off;
      const sy = p.y + n.y * off;
      const lit = 0.5 - off / (w * 2); // back rows lighter
      const sz = fontSize * 0.05 * (1 - Math.abs(r) / (rows + 2));
      ctx.beginPath();
      ctx.ellipse(sx, sy, sz * 1.4, sz, Math.atan2(n.y, n.x), 0, Math.PI * 2);
      ctx.fillStyle = lit > 0 ? `rgba(150,225,180,${0.10 + lit * 0.16})` : `rgba(3,24,16,${0.12 - lit * 0.18})`;
      ctx.fill();
    }
  }
}

function drawShimmer(ctx: CanvasRenderingContext2D, pts: Pt[], ss: number[], fontSize: number, t: number) {
  const N = pts.length - 1;
  const head = (t * 0.22) % 1.3 - 0.15; // moving highlight position in s
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i <= N; i += 1) {
    const d = Math.abs(ss[i] - head);
    if (d > 0.12) continue;
    const a = (1 - d / 0.12) * 0.22;
    const p = pts[i];
    ctx.fillStyle = `rgba(220,255,235,${a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, fontSize * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

function blinkAmount(t: number) {
  // occasional blink during idle/hiss
  const cycle = t % 3.1;
  if (cycle > 2.85 && cycle < 3.0) {
    const k = (cycle - 2.85) / 0.15;
    return Math.sin(k * Math.PI); // 0→1→0
  }
  return 0;
}

function drawSnakeHead(
  ctx: CanvasRenderingContext2D,
  spine: (s: number) => Pt,
  fontSize: number,
  t: number,
  hissT: number,
  blink: number,
  pal: IntroPalette,
) {
  const head = spine(0);
  const next = spine(0.05);
  // head faces away from the body (toward -tangent)
  const ang = Math.atan2(head.y - next.y, head.x - next.x);

  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(ang);

  const hl = fontSize * 0.34; // head length
  const hw = fontSize * 0.2; // head half-width
  const open = hissT; // mouth open amount

  // ---- lower jaw (drops open during hiss) ----
  ctx.save();
  ctx.rotate(open * 0.5);
  const jaw = ctx.createLinearGradient(0, 0, hl, 0);
  jaw.addColorStop(0, pal.bodyMid);
  jaw.addColorStop(1, pal.bodyDark);
  ctx.fillStyle = jaw;
  ctx.beginPath();
  ctx.moveTo(-hw * 0.3, 0);
  ctx.quadraticCurveTo(hl * 0.7, hw * 0.5, hl * 1.05, hw * 0.1);
  ctx.quadraticCurveTo(hl * 0.7, hw * 0.1, -hw * 0.3, hw * 0.2);
  ctx.closePath();
  ctx.fill();
  // mouth interior
  if (open > 0.05) {
    ctx.fillStyle = "rgba(60,10,18,0.9)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(hl * 0.6, hw * 0.35, hl * 1.0, hw * 0.08);
    ctx.lineTo(hl * 0.2, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // ---- tongue (forked), flicks out, fully out during hiss ----
  const flick = hissT > 0 ? 0.6 + hissT * 0.4 : tongueFlick(t);
  if (flick > 0.02) {
    drawTongue(ctx, hl, fontSize, flick, open, pal);
  }

  // ---- upper head ----
  const grad = ctx.createLinearGradient(0, -hw, 0, hw);
  grad.addColorStop(0, pal.bodyTop);
  grad.addColorStop(0.55, pal.bodyMid);
  grad.addColorStop(1, pal.bodyDark);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = fontSize * 0.18;
  ctx.fillStyle = grad;
  ctx.beginPath();
  // wedge-shaped viper head
  ctx.moveTo(-hw * 0.2, -hw);
  ctx.quadraticCurveTo(hl * 0.5, -hw * 0.95, hl * 1.08, -hw * 0.12);
  ctx.quadraticCurveTo(hl * 1.12, 0, hl * 1.08, hw * 0.12);
  ctx.quadraticCurveTo(hl * 0.5, hw * 0.95, -hw * 0.2, hw);
  ctx.quadraticCurveTo(-hw * 0.7, 0, -hw * 0.2, -hw);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // brow scale highlights
  ctx.fillStyle = "rgba(150,225,180,0.18)";
  for (let i = 0; i < 5; i += 1) {
    const fx = hl * (0.05 + i * 0.16);
    ctx.beginPath();
    ctx.ellipse(fx, -hw * 0.45, fontSize * 0.05, fontSize * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // nostril
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  ctx.arc(hl * 0.92, -hw * 0.18, fontSize * 0.014, 0, Math.PI * 2);
  ctx.fill();

  // ---- eye (single, facing camera side) ----
  const eyeX = hl * 0.42;
  const eyeY = -hw * 0.42;
  const eyeR = fontSize * 0.1 * (1 - blink * 0.85);
  const glowR = eyeR * (2.2 + hissT * 1.4);
  const glow = ctx.createRadialGradient(eyeX, eyeY, 0, eyeX, eyeY, glowR);
  glow.addColorStop(0, pal.eyeGlow);
  glow.addColorStop(1, "transparent");
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.55 + hissT * 0.4;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, glowR, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  if (blink < 0.95) {
    // iris
    const iris = ctx.createRadialGradient(eyeX, eyeY, 0, eyeX, eyeY, eyeR);
    iris.addColorStop(0, pal.eyeCore);
    iris.addColorStop(0.5, pal.eyeGlow);
    iris.addColorStop(1, "#0c5c39");
    ctx.fillStyle = iris;
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, eyeR, eyeR * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    // gold ring
    ctx.lineWidth = Math.max(1, fontSize * 0.012);
    ctx.strokeStyle = pal.gold;
    ctx.stroke();
    // vertical slit pupil
    ctx.fillStyle = pal.pupil;
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, eyeR * 0.22, eyeR * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
    // catchlight
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(eyeX - eyeR * 0.3, eyeY - eyeR * 0.35, eyeR * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function tongueFlick(t: number) {
  // quick darting flick roughly every ~1.5s during idle
  const cycle = t % 1.5;
  if (cycle < 0.35) {
    const k = cycle / 0.35;
    return Math.sin(k * Math.PI);
  }
  return 0;
}

function drawTongue(ctx: CanvasRenderingContext2D, hl: number, fontSize: number, flick: number, open: number, pal: IntroPalette) {
  const baseX = hl * 1.0;
  const baseY = open * fontSize * 0.08;
  const len = fontSize * (0.18 + flick * 0.34);
  const fork = fontSize * 0.12 * flick;
  ctx.save();
  ctx.strokeStyle = pal.tongue;
  ctx.lineWidth = Math.max(1.5, fontSize * 0.03);
  ctx.lineCap = "round";
  const wobble = Math.sin(performanceWobble()) * fontSize * 0.02;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  const tipX = baseX + len;
  const tipY = baseY + wobble;
  ctx.lineTo(tipX, tipY);
  // fork
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX + fork, tipY - fork);
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX + fork, tipY + fork);
  ctx.stroke();
  ctx.restore();
}

function performanceWobble() {
  return (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.02;
}

function drawMist(
  ctx: CanvasRenderingContext2D,
  spine: (s: number) => Pt,
  fontSize: number,
  since: number,
  hissT: number,
  pal: IntroPalette,
) {
  const head = spine(0);
  const next = spine(0.05);
  const ang = Math.atan2(head.y - next.y, head.x - next.x);
  const mx = head.x + Math.cos(ang) * fontSize * 0.4;
  const my = head.y + Math.sin(ang) * fontSize * 0.4;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 22; i += 1) {
    const life = (since * 1.4 + prand(i) * 1.2) % 1.2;
    const k = life / 1.2;
    const spread = fontSize * (0.2 + k * 0.9);
    const dir = ang + (prand(i + 50) - 0.5) * 1.1;
    const px = mx + Math.cos(dir) * spread;
    const py = my + Math.sin(dir) * spread - k * fontSize * 0.2;
    const r = fontSize * (0.06 + k * 0.22);
    const a = (1 - k) * 0.16 * hissT;
    const g = ctx.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, `rgba(170, 255, 205, ${a.toFixed(3)})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawDissolve(ctx: CanvasRenderingContext2D, spine: (s: number) => Pt, fontSize: number, outT: number, pal: IntroPalette) {
  const NP = 90;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < NP; i += 1) {
    const s = i / (NP - 1);
    const base = spine(s);
    const ang = prand(i) * Math.PI * 2;
    const spd = fontSize * (0.5 + prand(i + 7) * 1.6);
    const px = base.x + Math.cos(ang) * spd * outT;
    const py = base.y + Math.sin(ang) * spd * outT - outT * outT * fontSize * 1.2;
    const r = fontSize * 0.05 * (1 - outT);
    const a = (1 - outT) * 0.9;
    if (r <= 0) continue;
    const g = ctx.createRadialGradient(px, py, 0, px, py, r * 3);
    const col = prand(i + 3) > 0.6 ? pal.gold : pal.eyeGlow;
    g.addColorStop(0, col);
    g.addColorStop(1, "transparent");
    ctx.globalAlpha = a;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, r * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
