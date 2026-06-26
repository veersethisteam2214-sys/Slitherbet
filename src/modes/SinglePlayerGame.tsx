import { ArrowLeft, Info, Minus, Palette, Play, Plus, RefreshCw, Repeat, Skull, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { audio } from "../audio";
import { SnakeLogo } from "../components/SnakeLogo";
import { formatMoney, rand, type BetRecord } from "../shared";
import { LiveBoard } from "./LiveBoard";

type Status = "ready" | "safe" | "crossing" | "dead" | "cashed";
type Difficulty = "easy" | "medium" | "hard" | "extreme";
type Theme = "arcade" | "neon";

type DiffConfig = { label: string; survive: number; lanes: number; autoTarget: number };

const DIFFS: Record<Difficulty, DiffConfig> = {
  easy: { label: "Easy", survive: 0.9, lanes: 26, autoTarget: 7 },
  medium: { label: "Medium", survive: 0.78, lanes: 22, autoTarget: 4 },
  hard: { label: "Hard", survive: 0.62, lanes: 18, autoTarget: 3 },
  extreme: { label: "Extreme", survive: 0.42, lanes: 14, autoTarget: 2 },
};
const DIFF_ORDER: Difficulty[] = ["easy", "medium", "hard", "extreme"];

const HOUSE_EDGE = 0.03;

const SNAKE_COLORS = [
  { id: "emerald", name: "Emerald", base: "#37e07a" },
  { id: "aqua", name: "Aqua", base: "#33d6ff" },
  { id: "gold", name: "Gold", base: "#ffce3a" },
  { id: "magenta", name: "Magenta", base: "#ff5ab0" },
  { id: "violet", name: "Violet", base: "#9b7bff" },
  { id: "orange", name: "Orange", base: "#ff8a3d" },
];

const STEP = 168;
const COIN_R = 30;
const CROSS_DURATION = 0.5;
const CHOP_TIME = 0.62;
const BASE_SEG = 4;
const MAX_SEG = 40;
const SEG_SPACING = 11;
const HEAD_R = 13;

type Ambient = { gap: number; y: number; v: number; size: number; rot: number; spin: number; frozen: boolean };
type Burst = { wx: number; t: number; amount: number };

type SPState = {
  status: Status;
  stake: number;
  difficulty: Difficulty;
  level: number;
  fromLevel: number;
  crossT: number;
  crossSurvive: boolean;
  chopFired: boolean;
  chopAnim: number;
  snakeWX: number;
  camX: number;
  targetSegments: number;
  flash: number;
  shake: number;
  wiggle: number;
  result: number;
  ambient: Ambient[];
  spawnTimer: number;
  bursts: Burst[];
  recorded: boolean;
};

function multAt(level: number, survive: number) {
  if (level <= 0) return 1;
  return (1 - HOUSE_EDGE) / Math.pow(survive, level);
}

function levelX(level: number) {
  return level * STEP;
}

function segmentCount(level: number) {
  return Math.min(MAX_SEG, BASE_SEG + Math.floor(level * 1.1));
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (amt >= 0) {
    r += (255 - r) * amt;
    g += (255 - g) * amt;
    b += (255 - b) * amt;
  } else {
    r *= 1 + amt;
    g *= 1 + amt;
    b *= 1 + amt;
  }
  return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
}

function createState(stake: number, difficulty: Difficulty): SPState {
  return {
    status: "ready",
    stake,
    difficulty,
    level: 0,
    fromLevel: 0,
    crossT: 0,
    crossSurvive: true,
    chopFired: false,
    chopAnim: 0,
    snakeWX: 0,
    camX: 0,
    targetSegments: segmentCount(0),
    flash: 0,
    shake: 0,
    wiggle: 0,
    result: 0,
    ambient: [],
    spawnTimer: 0,
    bursts: [],
    recorded: false,
  };
}

function startCrossing(state: SPState) {
  if (state.status !== "safe") return;
  if (state.level + 1 > DIFFS[state.difficulty].lanes) return;
  state.fromLevel = state.level;
  state.status = "crossing";
  state.crossT = 0;
  state.crossSurvive = Math.random() < DIFFS[state.difficulty].survive;
  state.chopFired = false;
  state.chopAnim = 0;
}

function update(state: SPState, dt: number, holding: boolean, width: number, height: number) {
  state.wiggle += dt;
  if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);

  for (let i = state.bursts.length - 1; i >= 0; i -= 1) {
    state.bursts[i].t += dt;
    if (state.bursts[i].t > 1.3) state.bursts.splice(i, 1);
  }

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0 && state.status !== "ready") {
    const firstGap = Math.floor(state.camX / STEP);
    const visibleGaps = Math.ceil(width / STEP) + 1;
    const aheadMin = state.level + 1;
    const aheadMax = firstGap + visibleGaps;
    if (aheadMax >= aheadMin) {
      const gap = aheadMin + Math.floor(Math.random() * (aheadMax - aheadMin + 1));
      state.ambient.push({
        gap,
        y: -48,
        v: rand(240, 380),
        size: rand(0.75, 1.05),
        rot: 0,
        spin: rand(-0.8, 0.8),
        frozen: false,
      });
    }
    state.spawnTimer = rand(0.22, 0.45);
  }
  for (let i = state.ambient.length - 1; i >= 0; i -= 1) {
    const a = state.ambient[i];
    if (a.gap <= state.level) a.frozen = true;
    if (!a.frozen) {
      a.y += a.v * dt;
      a.rot += a.spin * dt;
    }
    if (a.y > height + 60) state.ambient.splice(i, 1);
  }

  if (state.status === "crossing") {
    if (state.chopFired) {
      state.chopAnim += dt;
      if (state.chopAnim >= CHOP_TIME) {
        state.status = "dead";
        state.shake = 0.6;
      }
    } else {
      state.crossT += dt / CROSS_DURATION;
      const eased = easeInOut(Math.min(1, state.crossT));
      state.snakeWX = levelX(state.fromLevel) + STEP * eased;
      if (!state.crossSurvive && state.crossT >= 0.5) {
        state.chopFired = true;
        state.chopAnim = 0;
        state.snakeWX = levelX(state.fromLevel) + STEP * 0.55;
      } else if (state.crossT >= 1) {
        const survive = DIFFS[state.difficulty].survive;
        const gained = state.stake * (multAt(state.fromLevel + 1, survive) - multAt(state.fromLevel, survive));
        state.level = state.fromLevel + 1;
        state.snakeWX = levelX(state.level);
        state.targetSegments = segmentCount(state.level);
        state.flash = 0.6;
        state.bursts.push({ wx: levelX(state.level), t: 0, amount: gained });
        if (holding && state.level < DIFFS[state.difficulty].lanes) startCrossing(state);
        else state.status = "safe";
      }
    }
  }

  const target = state.snakeWX - width * 0.28;
  state.camX += (target - state.camX) * Math.min(1, dt * 6);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

// Cave raptor — local space: beak points DOWN (+y). strike 0–1 extends talons on impact.
function drawBird(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  rot: number,
  danger: boolean,
  flap: number,
  strike = 0,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);

  const wing = Math.sin(flap * 11) * (0.55 * (1 - strike * 0.85));
  const dark = danger ? "#2a080c" : "#16121f";
  const lite = danger ? "#6a1824" : "#3a3052";
  const feather = danger ? "#8a2030" : "#4a3a62";

  if (danger) {
    ctx.shadowColor = strike > 0.5 ? "rgba(255,80,60,0.9)" : "rgba(255,60,60,0.55)";
    ctx.shadowBlur = 18 + strike * 14;
  }

  const wingGrad = ctx.createLinearGradient(0, -16, 0, 8);
  wingGrad.addColorStop(0, feather);
  wingGrad.addColorStop(1, dark);
  ctx.fillStyle = wingGrad;
  const wingTuck = strike * 0.7;
  for (const dir of [-1, 1]) {
    ctx.save();
    ctx.scale(dir, 1);
    ctx.rotate(-0.45 - wing + wingTuck);
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.quadraticCurveTo(20, -16, 42, -6);
    ctx.quadraticCurveTo(24, -2, 6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.shadowBlur = 0;

  const bodyGrad = ctx.createLinearGradient(0, -14, 0, 16);
  bodyGrad.addColorStop(0, lite);
  bodyGrad.addColorStop(1, dark);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 7.5, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-4, -12);
  ctx.lineTo(4, -12);
  ctx.lineTo(0, -22);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 11, 5.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = danger ? "#ffcf4d" : "#e0a93a";
  ctx.beginPath();
  ctx.moveTo(-3, 14);
  ctx.lineTo(3, 14);
  ctx.lineTo(0, 24);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = danger ? "#ff3b3b" : "#ffd27a";
  ctx.beginPath();
  ctx.arc(-2.4, 10, 1.5, 0, Math.PI * 2);
  ctx.arc(2.4, 10, 1.5, 0, Math.PI * 2);
  ctx.fill();

  if (strike > 0.2) {
    ctx.strokeStyle = "#1a1010";
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dir * 4, 16);
      ctx.lineTo(dir * (10 + strike * 8), 28 + strike * 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(dir * (10 + strike * 8), 28 + strike * 6);
      ctx.lineTo(dir * (8 + strike * 6), 32 + strike * 8);
      ctx.moveTo(dir * (10 + strike * 8), 28 + strike * 6);
      ctx.lineTo(dir * (12 + strike * 8), 32 + strike * 8);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawCrystal(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, up: boolean, tint: string) {
  const dir = up ? -1 : 1;
  const w = h * 0.28;
  const tipY = y + h * dir;
  const g = ctx.createLinearGradient(x - w, y, x + w, tipY);
  g.addColorStop(0, "rgba(255,255,255,0.75)");
  g.addColorStop(0.18, tint);
  g.addColorStop(1, "rgba(18,12,38,0.42)");

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.lineTo(x - w * 0.22, tipY);
  ctx.lineTo(x + w * 0.18, tipY);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.24)";
  ctx.beginPath();
  ctx.moveTo(x - w * 0.12, y);
  ctx.lineTo(x - w * 0.04, tipY);
  ctx.lineTo(x + w * 0.16, y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.lineTo(x - w * 0.22, tipY);
  ctx.lineTo(x + w * 0.18, tipY);
  ctx.lineTo(x + w, y);
  ctx.stroke();
}

function drawCrystalCluster(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  up: boolean,
  primary: string,
  secondary: string,
) {
  ctx.save();
  ctx.shadowColor = primary;
  ctx.shadowBlur = 18 * scale;
  drawCrystal(ctx, x, y, 62 * scale, up, primary);
  drawCrystal(ctx, x - 22 * scale, y + (up ? 12 : -12) * scale, 42 * scale, up, secondary);
  drawCrystal(ctx, x + 24 * scale, y + (up ? 10 : -10) * scale, 48 * scale, up, primary);
  drawCrystal(ctx, x + 4 * scale, y + (up ? 20 : -20) * scale, 34 * scale, up, secondary);
  ctx.restore();
}

function drawPlatform(ctx: CanvasRenderingContext2D, cx: number, laneY: number, pw: number, neon: boolean) {
  const top = laneY + 12;
  const hgt = 30;
  const g = ctx.createLinearGradient(0, top, 0, top + hgt);
  g.addColorStop(0, neon ? "#34305f" : "#3a3650");
  g.addColorStop(0.45, neon ? "#191638" : "#1c1a2b");
  g.addColorStop(1, neon ? "#080715" : "#0b0a12");
  ctx.fillStyle = g;
  roundRect(ctx, cx - pw / 2, top, pw, hgt, 8);
  ctx.fill();
  ctx.strokeStyle = neon ? "rgba(41,240,255,0.65)" : "rgba(120,255,224,0.52)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - pw / 2 + 7, top + 1.5);
  ctx.lineTo(cx + pw / 2 - 7, top + 1.5);
  ctx.stroke();
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(cx, top + hgt + 6, pw * 0.42, 10, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCaveBackground(ctx: CanvasRenderingContext2D, rect: DOMRect, camX: number, laneY: number, neon: boolean) {
  const w = rect.width;
  const h = rect.height;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, neon ? "#09051b" : "#101327");
  bg.addColorStop(0.42, neon ? "#090a18" : "#0b1724");
  bg.addColorStop(1, neon ? "#040308" : "#05070d");
  ctx.fillStyle = bg;
  ctx.fillRect(-20, -20, w + 40, h + 40);

  for (let layer = 0; layer < 3; layer += 1) {
    const parallax = 0.08 + layer * 0.055;
    const baseY = laneY - 96 - layer * 46;
    const ridgeStep = 190 - layer * 22;
    const firstRidge = Math.floor(camX * parallax / ridgeStep) - 2;
    ctx.fillStyle = layer === 0 ? "rgba(38,52,79,0.22)" : layer === 1 ? "rgba(28,39,63,0.34)" : "rgba(16,24,42,0.62)";
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    for (let i = 0; i < Math.ceil(w / ridgeStep) + 5; i += 1) {
      const idx = firstRidge + i;
      const sx = idx * ridgeStep - camX * parallax;
      const py = baseY + Math.sin(idx * 1.33) * 28 + Math.cos(idx * 0.71) * 18;
      ctx.lineTo(sx, py);
      ctx.lineTo(sx + ridgeStep * 0.5, py + 34 + layer * 12);
    }
    ctx.lineTo(w + 20, 0);
    ctx.closePath();
    ctx.fill();
  }

  const mist = ctx.createLinearGradient(0, laneY - 70, 0, laneY + 160);
  mist.addColorStop(0, "rgba(91, 207, 255, 0)");
  mist.addColorStop(0.42, neon ? "rgba(57, 240, 255, 0.09)" : "rgba(107, 222, 255, 0.08)");
  mist.addColorStop(1, "rgba(155, 123, 255, 0)");
  ctx.fillStyle = mist;
  ctx.fillRect(0, laneY - 100, w, 300);

  const ceilY = Math.max(54, laneY - 150);
  const floorY = Math.min(h - 44, laneY + 168);
  const rock = neon ? "#0f0a20" : "#120c1a";
  const rockEdge = neon ? "#1d1640" : "#1c1528";
  const tile = 72;
  const first = Math.floor(camX / tile) - 1;
  const count = Math.ceil(w / tile) + 3;

  ctx.fillStyle = rock;
  ctx.fillRect(-20, -20, w + 40, ceilY + 20);
  for (let i = 0; i < count; i += 1) {
    const idx = first + i;
    const sx = idx * tile - camX;
    const len = 16 + Math.abs(Math.sin(idx * 1.3)) * 42;
    ctx.fillStyle = idx % 3 === 0 ? "#27283f" : rockEdge;
    ctx.beginPath();
    ctx.moveTo(sx - 12, ceilY);
    ctx.lineTo(sx + 12, ceilY);
    ctx.lineTo(sx, ceilY + len);
    ctx.closePath();
    ctx.fill();
    if (idx % 4 === 0) {
      ctx.save();
      drawCrystalCluster(
        ctx,
        sx + 8,
        ceilY + len + 2,
        0.34 + (idx % 3) * 0.08,
        false,
        neon ? "rgba(41,240,255,0.88)" : "rgba(112,225,255,0.82)",
        "rgba(196,122,255,0.78)",
      );
      ctx.restore();
    }
  }

  const floorGrad = ctx.createLinearGradient(0, floorY - 40, 0, h);
  floorGrad.addColorStop(0, "#1c1a2c");
  floorGrad.addColorStop(1, "#07060b");
  ctx.fillStyle = floorGrad;
  ctx.fillRect(-20, floorY, w + 40, h - floorY + 20);
  for (let i = 0; i < count; i += 1) {
    const idx = first + i;
    const sx = idx * tile - camX;
    const len = 18 + Math.abs(Math.cos(idx * 1.7)) * 48;
    ctx.fillStyle = idx % 4 === 0 ? "#24233a" : rockEdge;
    ctx.beginPath();
    ctx.moveTo(sx - 13, floorY);
    ctx.lineTo(sx + 13, floorY);
    ctx.lineTo(sx, floorY - len);
    ctx.closePath();
    ctx.fill();
    if (idx % 5 === 0) {
      ctx.save();
      drawCrystalCluster(
        ctx,
        sx - 8,
        floorY - len - 2,
        0.42 + (idx % 4) * 0.08,
        true,
        neon ? "rgba(255,57,192,0.86)" : "rgba(174,133,255,0.82)",
        "rgba(88,229,255,0.74)",
      );
      ctx.restore();
    }
  }

  for (let i = 0; i < 36; i += 1) {
    const px = (i * 173 - camX * (0.16 + (i % 5) * 0.014)) % (w + 120) - 60;
    const py = 58 + ((i * 97) % Math.max(140, h - 140));
    const twinkle = 0.35 + Math.sin(performance.now() * 0.0015 + i) * 0.25;
    ctx.globalAlpha = Math.max(0.08, twinkle);
    ctx.fillStyle = i % 3 === 0 ? "#b98cff" : i % 3 === 1 ? "#7af7ff" : "#7dffb3";
    ctx.beginPath();
    ctx.arc(px, py, 1.3 + (i % 4) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const vg = ctx.createRadialGradient(w / 2, laneY, h * 0.2, w / 2, laneY, h * 0.85);
  vg.addColorStop(0, "transparent");
  vg.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

function drawSnake(
  ctx: CanvasRenderingContext2D,
  headX: number,
  laneY: number,
  segCount: number,
  base: string,
  wiggle: number,
  amp: number,
  dead: boolean,
  neon: boolean,
) {
  const light = dead ? "#b7c2bf" : shade(base, neon ? 0.55 : 0.4);
  const mid = dead ? "#8b9794" : base;
  const dark = dead ? "#5d6664" : shade(base, -0.32);

  ctx.save();
  if (neon && !dead) {
    ctx.shadowColor = base;
    ctx.shadowBlur = 14;
  }
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  for (let i = segCount - 1; i >= 0; i -= 1) {
    const sx = headX - i * SEG_SPACING;
    const sy = laneY + Math.sin(wiggle * 6 - i * 0.5) * amp;
    const t = i / segCount;
    const r = Math.max(4.5, HEAD_R * (1 - t * 0.5));
    ctx.beginPath();
    ctx.ellipse(sx + 3, sy + HEAD_R + 7, r * 0.95, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(headX + 3, laneY + HEAD_R + 7, (HEAD_R + 2) * 0.95, (HEAD_R + 2) * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  for (let i = segCount - 1; i >= 0; i -= 1) {
    const sx = headX - i * SEG_SPACING;
    const sy = laneY + Math.sin(wiggle * 6 - i * 0.5) * amp;
    const t = i / segCount;
    const r = Math.max(4.5, HEAD_R * (1 - t * 0.5));
    const grad = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.4, r * 0.2, sx, sy, r);
    grad.addColorStop(0, light);
    grad.addColorStop(0.55, mid);
    grad.addColorStop(1, dark);
    ctx.fillStyle = grad;
    if (neon && !dead) {
      ctx.shadowColor = base;
      ctx.shadowBlur = 10 * (1 - t * 0.4);
    }
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const hx = headX;
  const hy = laneY + Math.sin(wiggle * 6) * amp;
  const hr = HEAD_R + 2.5;
  const hg = ctx.createRadialGradient(hx - hr * 0.3, hy - hr * 0.4, hr * 0.2, hx, hy, hr);
  hg.addColorStop(0, light);
  hg.addColorStop(0.55, mid);
  hg.addColorStop(1, dark);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, Math.PI * 2);
  ctx.fill();

  if (!dead) {
    const tongue = (Math.sin(wiggle * 9) * 0.5 + 0.5) * 8;
    ctx.strokeStyle = "#ff4d6d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx + hr - 2, hy);
    ctx.lineTo(hx + hr + tongue, hy);
    ctx.stroke();
    if (tongue > 4) {
      ctx.beginPath();
      ctx.moveTo(hx + hr + tongue, hy);
      ctx.lineTo(hx + hr + tongue + 4, hy - 3);
      ctx.moveTo(hx + hr + tongue, hy);
      ctx.lineTo(hx + hr + tongue + 4, hy + 3);
      ctx.stroke();
    }
  }

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(hx + 4, hy - 5, 4.2, 0, Math.PI * 2);
  ctx.arc(hx + 10, hy - 5, 4.2, 0, Math.PI * 2);
  ctx.fill();
  if (dead) {
    ctx.strokeStyle = "#3a2222";
    ctx.lineWidth = 1.6;
    for (const ex of [4, 10]) {
      ctx.beginPath();
      ctx.moveTo(hx + ex - 3, hy - 8);
      ctx.lineTo(hx + ex + 3, hy - 2);
      ctx.moveTo(hx + ex + 3, hy - 8);
      ctx.lineTo(hx + ex - 3, hy - 2);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = "#10201c";
    ctx.beginPath();
    ctx.arc(hx + 5.5, hy - 5, 2, 0, Math.PI * 2);
    ctx.arc(hx + 11.5, hy - 5, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function draw(canvas: HTMLCanvasElement, state: SPState, snakeColor: string, theme: Theme) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const laneY = rect.height * 0.52;
  const screenX = (wx: number) => wx - state.camX;
  const diff = DIFFS[state.difficulty];
  const neon = theme === "neon";

  const shakeX = state.shake > 0 ? rand(-8, 8) * (state.shake / 0.6) : 0;
  const shakeY = state.shake > 0 ? rand(-8, 8) * (state.shake / 0.6) : 0;
  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawCaveBackground(ctx, rect, state.camX, laneY, neon);

  const firstLane = Math.max(0, Math.floor(state.camX / STEP) - 1);
  const lastLane = Math.min(diff.lanes, firstLane + Math.ceil(rect.width / STEP) + 2);

  for (let n = firstLane; n <= lastLane; n += 1) {
    if (n < 0) continue;
    const cx = screenX(levelX(n));
    if (cx < -STEP || cx > rect.width + STEP) continue;

    drawPlatform(ctx, cx, laneY, STEP * 0.6, neon);

    if (n === 0) {
      ctx.fillStyle = neon ? "rgba(41,240,255,0.85)" : "rgba(99,255,224,0.85)";
      ctx.textAlign = "center";
      ctx.font = "800 12px 'Space Grotesk', Inter, system-ui";
      ctx.fillText("START", cx, laneY - 34);
      continue;
    }

    const passed = n <= state.level;
    const isNext = n === (state.status === "crossing" ? state.fromLevel + 1 : state.level + 1);
    const pulse = isNext ? 1 + Math.sin(state.wiggle * 5) * 0.06 : 1;
    const r = COIN_R * pulse;

    const prevCx = screenX(levelX(n - 1));
    if (prevCx > -STEP && prevCx < rect.width + STEP) {
      const link = ctx.createLinearGradient(prevCx, laneY, cx, laneY);
      link.addColorStop(0, passed ? "rgba(124,255,208,0.5)" : "rgba(255,255,255,0.16)");
      link.addColorStop(1, isNext ? "rgba(255,206,58,0.72)" : "rgba(255,255,255,0.18)");
      ctx.strokeStyle = link;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(prevCx + COIN_R, laneY);
      ctx.lineTo(cx - COIN_R, laneY);
      ctx.stroke();
    }

    if (passed || isNext) {
      ctx.save();
      ctx.shadowColor = passed ? "rgba(55, 224, 122, 0.8)" : "rgba(255, 206, 58, 0.85)";
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.arc(cx, laneY, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = passed ? "#37e07a" : "#ffce3a";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }

    const coin = ctx.createRadialGradient(cx - r * 0.4, laneY - r * 0.4, r * 0.2, cx, laneY, r);
    if (passed) {
      coin.addColorStop(0, "#9bf7c0");
      coin.addColorStop(1, "#1f9a52");
    } else if (isNext) {
      coin.addColorStop(0, "#fff0bd");
      coin.addColorStop(1, "#d99a16");
    } else {
      coin.addColorStop(0, "#aeb9c7");
      coin.addColorStop(1, "#5b6675");
    }
    ctx.fillStyle = coin;
    ctx.shadowColor = passed ? "#37e07a" : isNext ? "#ffce3a" : "rgba(255,255,255,0.5)";
    ctx.shadowBlur = passed || isNext ? 20 : 6;
    ctx.beginPath();
    ctx.arc(cx, laneY, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(cx, laneY, r - 3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#15120b";
    ctx.font = "900 17px 'Space Grotesk', Inter, system-ui";
    ctx.fillText(`${multAt(n, diff.survive).toFixed(2)}x`, cx, laneY + 5);

    ctx.fillStyle = passed ? "#bdf7d4" : isNext ? "#ffe9a8" : "rgba(220,230,236,0.78)";
    ctx.font = "700 11px Inter, system-ui";
    ctx.fillText(formatMoney(state.stake * multAt(n, diff.survive)), cx, laneY + r + 16);
  }

  for (const a of state.ambient) {
    const ax = screenX(levelX(a.gap) + STEP * 0.5);
    if (ax < -50 || ax > rect.width + 50) continue;
    drawBird(ctx, ax, a.y, a.size * 1.25, a.rot * 0.35, false, state.wiggle + a.gap);
  }

  const headX = screenX(state.snakeWX);
  const dead = state.status === "dead";
  const amp = state.status === "crossing" ? 5.5 : 3;
  drawSnake(ctx, headX, laneY, state.targetSegments, snakeColor, state.wiggle, amp, dead, neon);

  if (state.status === "crossing" || state.status === "dead") {
    const diveX = screenX(state.snakeWX);
    let birdY = -160;
    let birdRot = -0.4;
    let birdScale = 1.5;
    let strike = 0;
    let show = false;
    if (!state.crossSurvive && state.chopFired) {
      const p = Math.min(1, state.chopAnim / CHOP_TIME);
      const diveEase = 1 - Math.pow(1 - Math.min(1, p / 0.82), 2.4);
      birdY = -160 + (laneY - 6 - (-160)) * diveEase;
      birdRot = -0.65 + diveEase * 0.65;
      birdScale = 1.4 + diveEase * 0.9;
      strike = Math.max(0, (p - 0.72) / 0.28);
      show = true;
      if (p > 0.72 && p < 0.95) {
        const flash = (p - 0.72) / 0.23;
        ctx.save();
        ctx.globalAlpha = (1 - flash) * 0.45;
        ctx.fillStyle = "#ff6a4a";
        ctx.beginPath();
        ctx.arc(diveX, laneY, 28 + flash * 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (dead && !state.crossSurvive) {
      birdY = laneY - 4;
      birdRot = 0.05;
      birdScale = 2.1;
      strike = 1;
      show = true;
    }
    if (show) {
      if (strike < 0.5) {
        ctx.save();
        ctx.globalAlpha = 0.22;
        drawBird(ctx, diveX, birdY + 36, birdScale * 0.75, birdRot, true, state.wiggle, 0);
        ctx.restore();
      }
      drawBird(ctx, diveX, birdY, birdScale, birdRot, true, state.wiggle, strike);
      if (strike > 0.35) {
        for (let f = 0; f < 6; f += 1) {
          const ang = (f / 6) * Math.PI * 2 + state.wiggle * 2;
          ctx.fillStyle = f % 2 ? "#3a2030" : "#6a3040";
          ctx.beginPath();
          ctx.arc(diveX + Math.cos(ang) * (18 + strike * 22), laneY + Math.sin(ang) * 10, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  for (const burst of state.bursts) {
    const bx = screenX(burst.wx);
    const p = burst.t / 1.3;
    const ringR = COIN_R + p * 70;
    ctx.globalAlpha = Math.max(0, 1 - p);
    ctx.strokeStyle = "#7cffd0";
    ctx.lineWidth = 4 * (1 - p);
    ctx.beginPath();
    ctx.arc(bx, laneY, ringR, 0, Math.PI * 2);
    ctx.stroke();
    for (let s = 0; s < 8; s += 1) {
      const ang = (s / 8) * Math.PI * 2 + state.wiggle;
      const dist = 20 + p * 60;
      ctx.fillStyle = s % 2 ? "#ffce3a" : "#7cffd0";
      ctx.beginPath();
      ctx.arc(bx + Math.cos(ang) * dist, laneY + Math.sin(ang) * dist, 3 * (1 - p), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = Math.max(0, 1 - p * 1.1);
    ctx.fillStyle = "#7cffd0";
    ctx.textAlign = "center";
    ctx.font = "800 18px 'Space Grotesk', Inter, system-ui";
    ctx.fillText(`+${formatMoney(burst.amount)}`, bx, laneY - 40 - p * 26);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

type SinglePlayerGameProps = {
  balance: number;
  bets: BetRecord[];
  theme: Theme;
  onAdjustBalance: (delta: number) => void;
  onRecordBet: (bet: Omit<BetRecord, "id" | "time">) => void;
  onExit: () => void;
};

export function SinglePlayerGame({ balance, bets, theme, onAdjustBalance, onRecordBet, onExit }: SinglePlayerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<SPState>(createState(1, "easy"));
  const holdingRef = useRef(false);
  const autoplayRef = useRef(false);
  const autoTimerRef = useRef(0);
  const colorRef = useRef(SNAKE_COLORS[0].base);
  const themeRef = useRef<Theme>(theme);
  const prevLevelRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const lastRef = useRef<number>(performance.now());

  const [stake, setStake] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [snakeColor, setSnakeColor] = useState(SNAKE_COLORS[0].base);
  const [autoplay, setAutoplay] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [hud, setHud] = useState({
    status: "ready" as Status,
    level: 0,
    multiplier: 1,
    cashout: 0,
    nextMultiplier: multAt(1, DIFFS.easy.survive),
    result: 0,
    lanes: DIFFS.easy.lanes,
  });

  useEffect(() => {
    colorRef.current = snakeColor;
  }, [snakeColor]);
  useEffect(() => {
    autoplayRef.current = autoplay;
  }, [autoplay]);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  const startRun = useCallback(() => {
    if (balance < stake) return;
    onAdjustBalance(-stake);
    holdingRef.current = false;
    prevLevelRef.current = 0;
    const next = createState(stake, difficulty);
    next.status = "safe";
    stateRef.current = next;
    audio.play("start");
  }, [balance, stake, difficulty, onAdjustBalance]);

  const beginCross = useCallback(() => {
    if (stateRef.current.status === "safe") {
      startCrossing(stateRef.current);
      audio.play("step");
    }
  }, []);

  const cashOut = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== "safe" || s.level < 1) return;
    const mult = multAt(s.level, DIFFS[s.difficulty].survive);
    s.result = s.stake * mult;
    s.status = "cashed";
    s.recorded = true;
    holdingRef.current = false;
    onAdjustBalance(s.result);
    audio.play("cash");
    onRecordBet({
      mode: "single",
      label: `Cave Run · ${DIFFS[s.difficulty].label}`,
      stake: s.stake,
      multiplier: mult,
      payout: s.result,
      outcome: "win",
    });
  }, [onAdjustBalance, onRecordBet]);

  const closeEnd = useCallback(() => {
    stateRef.current = createState(stake, difficulty);
  }, [stake, difficulty]);

  useEffect(() => {
    const loop = (now: number) => {
      const dt = Math.min(0.035, (now - lastRef.current) / 1000);
      lastRef.current = now;
      const canvas = canvasRef.current;
      if (canvas) {
        const r = canvas.getBoundingClientRect();
        update(stateRef.current, dt, holdingRef.current, r.width, r.height);
        draw(canvas, stateRef.current, colorRef.current, themeRef.current);
      }

      const s = stateRef.current;
      if (s.level > prevLevelRef.current) {
        prevLevelRef.current = s.level;
        audio.play("safe");
      }
      if (s.status === "dead" && !s.recorded) {
        s.recorded = true;
        audio.play("death");
        onRecordBet({
          mode: "single",
          label: `Cave Run · ${DIFFS[s.difficulty].label}`,
          stake: s.stake,
          multiplier: multAt(s.level, DIFFS[s.difficulty].survive),
          payout: 0,
          outcome: "loss",
        });
      }
      if (autoplayRef.current) {
        autoTimerRef.current -= dt;
        if (autoTimerRef.current <= 0) {
          if (s.status === "ready" || s.status === "dead" || s.status === "cashed") {
            if (s.status !== "ready") stateRef.current = createState(s.stake, s.difficulty);
            if (balance >= s.stake) {
              startRun();
              autoTimerRef.current = 0.7;
            } else {
              autoplayRef.current = false;
              setAutoplay(false);
            }
          } else if (s.status === "safe") {
            if (s.level >= DIFFS[s.difficulty].autoTarget) {
              cashOut();
              autoTimerRef.current = 1.1;
            } else {
              beginCross();
              autoTimerRef.current = 0.75;
            }
          }
        }
      }

      const survive = DIFFS[s.difficulty].survive;
      setHud({
        status: s.status,
        level: s.level,
        multiplier: multAt(s.level, survive),
        cashout: s.stake * multAt(s.level, survive),
        nextMultiplier: multAt(s.level + 1, survive),
        result: s.result,
        lanes: DIFFS[s.difficulty].lanes,
      });
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [balance, startRun, beginCross, cashOut, onRecordBet]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      event.preventDefault();
      if (event.repeat) return;
      const status = stateRef.current.status;
      if (status === "ready") startRun();
      else if (status === "safe") {
        holdingRef.current = true;
        beginCross();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") holdingRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [startRun, beginCross]);

  const adjustStake = (dir: number) => {
    setStake((prev) => {
      const step = prev < 5 ? 0.5 : prev < 50 ? 5 : 25;
      const next = Math.max(0.5, Math.round((prev + dir * step) * 100) / 100);
      return Math.min(next, Math.max(0.5, balance));
    });
  };

  const commitStakeInput = (raw: string) => {
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.min(Math.max(0.5, Math.round(parsed * 100) / 100), Math.max(0.5, balance));
    setStake(clamped);
  };

  const inRun = hud.status === "safe" || hud.status === "crossing";
  const canAfford = balance >= stake;
  const showEnd = hud.status === "dead" || hud.status === "cashed";

  const goAction = () => {
    const st = stateRef.current.status;
    if (st === "ready") startRun();
    else if (st === "safe") beginCross();
  };

  return (
    <div className="single-screen">
      <header className="sp-topbar">
        <button className="ghost-button sp-back" type="button" onClick={onExit}>
          <ArrowLeft size={16} /> Menu
        </button>
        <div className="sp-brand-lockup">
          <span className="sp-brand-icon"><SnakeLogo size={20} /></span>
          <span className="sp-brand-text">SlitherBet</span>
        </div>
        <div className="sp-mode-badge">
          <span className="eyebrow">Single player</span>
          <strong>Cave Run</strong>
        </div>
        <div className="match-wallet ui-glass">
          <span className="eyebrow">Balance</span>
          <strong>{formatMoney(balance)}</strong>
        </div>
      </header>

      <div className="cabinet">
        <div className="cabinet-main">
        <LiveBoard bets={bets} />
        <div className="cabinet-screen">
          <canvas
            ref={canvasRef}
            className="arena-canvas single-canvas"
            onPointerDown={() => { if (stateRef.current.status === "safe") { holdingRef.current = true; beginCross(); } }}
            onPointerUp={() => { holdingRef.current = false; }}
            onPointerLeave={() => { holdingRef.current = false; }}
          />

          <div className="game-logo">
            <span className="logo-snake">SLITHER</span>
            <span className="logo-bet">BET</span>
          </div>

          <div className="screen-tools">
            <button className="round-tool" type="button" onClick={() => setShowColors((v) => !v)} title="Snake color" aria-label="Snake color">
              <Palette size={18} />
            </button>
            <button className="round-tool" type="button" onClick={() => setShowInfo(true)} title="How to play" aria-label="How to play">
              <Info size={18} />
            </button>
          </div>

          {showColors && (
            <div className="color-pop">
              {SNAKE_COLORS.map((c) => (
                <button
                  key={c.id}
                  className={`swatch ${snakeColor === c.base ? "active" : ""}`}
                  style={{ background: c.base }}
                  type="button"
                  title={c.name}
                  aria-label={c.name}
                  onClick={() => { setSnakeColor(c.base); setShowColors(false); }}
                />
              ))}
            </div>
          )}

          <div className="run-readout">
            <div className="readout-block">
              <span>Multiplier</span>
              <strong>{hud.multiplier.toFixed(2)}x</strong>
            </div>
            <div className="readout-block gold">
              <span>Cash out</span>
              <strong>{formatMoney(hud.cashout)}</strong>
            </div>
            <div className="readout-block">
              <span>Level</span>
              <strong>{hud.level}/{hud.lanes}</strong>
            </div>
          </div>

          {inRun && (
            <button className="cashout-fab" type="button" onClick={cashOut} disabled={hud.status !== "safe" || hud.level < 1}>
              Cash out {formatMoney(hud.cashout)}
            </button>
          )}

          {showEnd && (
            <div className={`end-modal ${hud.status === "dead" ? "lose" : "win"}`}>
              <button className="modal-x" type="button" onClick={closeEnd} aria-label="Close">
                <X size={18} />
              </button>
              {hud.status === "dead" ? (
                <>
                  <div className="end-icon lose"><Skull size={30} /></div>
                  <h3>Snatched!</h3>
                  <p>A raptor dove out of the dark mid-crossing. You lost {formatMoney(stake)}.</p>
                  <p className="end-sub">Reached level {hud.level} · {hud.multiplier.toFixed(2)}x</p>
                </>
              ) : (
                <>
                  <div className="end-icon win"><Play size={30} /></div>
                  <h3>Cashed out {formatMoney(hud.result)}</h3>
                  <p className="end-sub">Banked at level {hud.level} · {hud.multiplier.toFixed(2)}x</p>
                </>
              )}
              <div className="end-actions">
                <button className="primary-action wide" type="button" onClick={startRun} disabled={!canAfford}>
                  <RefreshCw size={16} /> Try again · {formatMoney(stake)}
                </button>
                <button className="ghost-button" type="button" onClick={closeEnd}>New bet</button>
              </div>
            </div>
          )}

          {showInfo && (
            <div className="info-modal">
              <button className="modal-x" type="button" onClick={() => setShowInfo(false)} aria-label="Close">
                <X size={18} />
              </button>
              <h3>How the cave works</h3>
              <ol className="info-list">
                <li>Set your stake, pick a risk tier, then press <b>Go</b> to drop in as a hatchling.</li>
                <li>Each <b>Go</b> or <b>Space</b> tap leaps one ledge deeper into the cave.</li>
                <li><b>Hold Space</b> to chain several leaps in a single dash.</li>
                <li>Every ledge you land raises your cash multiplier.</li>
                <li>Bank it whenever you're perched. If a raptor catches you mid-leap, the run is over.</li>
              </ol>
              <p className="info-note">
                Lower risk reaches the deep ledges far more often. Higher risk pays more per ledge but rarely lets you run deep. Play money only — no real currency.
              </p>
            </div>
          )}
        </div>
        </div>

        <div className="control-bar">
          <div className="bet-control">
            <span className="bar-label">Stake</span>
            <div className="bet-stepper">
              <button type="button" onClick={() => adjustStake(-1)} disabled={inRun} aria-label="Lower bet"><Minus size={16} /></button>
              <input
                className="stake-input"
                type="number"
                min={0.5}
                max={balance}
                step={0.5}
                value={stake}
                disabled={inRun}
                onChange={(e) => commitStakeInput(e.target.value)}
                onBlur={(e) => commitStakeInput(e.target.value)}
                aria-label="Stake amount"
              />
              <button type="button" onClick={() => adjustStake(1)} disabled={inRun || stake >= balance} aria-label="Raise bet"><Plus size={16} /></button>
            </div>
          </div>

          <div className="diff-control">
            <span className="bar-label">Risk</span>
            <div className="diff-pills">
              {DIFF_ORDER.map((d) => (
                <button
                  key={d}
                  className={`diff-pill ${d} ${difficulty === d ? "active" : ""}`}
                  type="button"
                  disabled={inRun}
                  onClick={() => setDifficulty(d)}
                >
                  {DIFFS[d].label}
                </button>
              ))}
            </div>
          </div>

          <div className="action-control">
            <button
              className={`auto-button ${autoplay ? "on" : ""}`}
              type="button"
              onClick={() => setAutoplay((v) => !v)}
            >
              <Repeat size={16} /> Auto {autoplay ? "on" : "play"}
            </button>
            <button
              className="go-button"
              type="button"
              onClick={goAction}
              disabled={hud.status === "crossing" || (hud.status === "ready" && !canAfford)}
            >
              {hud.status === "ready" ? "Go" : hud.status === "crossing" ? "…" : "Go →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
