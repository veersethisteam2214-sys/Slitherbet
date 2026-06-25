import type { Segment } from "../shared";
import type { BodyStyle, ScalePattern, SnakeSkin } from "../snakeSkins";

type DrawOpts = {
  segments: Segment[];
  angle: number;
  scale: number;
  alive: boolean;
  isHuman: boolean;
  skin: SnakeSkin;
};

function bodyWidth(index: number, total: number, style: BodyStyle, scale: number) {
  const t = index / Math.max(1, total - 1);
  const base = style === "slender" ? 14 : style === "heavy" ? 22 : 18;
  const taper = 1 - t * 0.72;
  return Math.max(4, base * taper * scale);
}

function drawScales(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  ang: number,
  pattern: ScalePattern,
  color: string,
  accent: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  if (pattern === "smooth") {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, -Math.PI * 0.7, Math.PI * 0.1);
    ctx.stroke();
  } else if (pattern === "diamond") {
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.45;
    for (let row = -1; row <= 1; row += 1) {
      for (let col = -1; col <= 1; col += 1) {
        const sx = col * r * 0.45;
        const sy = row * r * 0.38;
        ctx.beginPath();
        ctx.moveTo(sx, sy - r * 0.18);
        ctx.lineTo(sx + r * 0.16, sy);
        ctx.lineTo(sx, sy + r * 0.18);
        ctx.lineTo(sx - r * 0.16, sy);
        ctx.closePath();
        ctx.fill();
      }
    }
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.5;
    for (let k = -2; k <= 2; k += 1) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, k * r * 0.22);
      ctx.lineTo(r * 0.7, k * r * 0.22 + r * 0.08);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawRealisticSnake(
  ctx: CanvasRenderingContext2D,
  worldToScreen: (p: Segment) => Segment,
  opts: DrawOpts,
) {
  const { segments, angle, scale, alive, isHuman, skin } = opts;
  if (segments.length < 2) return;

  const alpha = alive ? 1 : 0.22;
  ctx.globalAlpha = alpha;

  const screenSegs = segments.map(worldToScreen);
  const total = screenSegs.length;

  // segmented shadow
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  for (let i = total - 1; i >= 0; i -= 2) {
    const p = screenSegs[i];
    const r = bodyWidth(i, total, skin.bodyStyle, scale) * 0.9;
    ctx.beginPath();
    ctx.ellipse(p.x + 2, p.y + r * 0.55, r, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // body segments back to front
  for (let i = total - 1; i > 0; i -= 1) {
    const a = screenSegs[i];
    const b = screenSegs[i - 1];
    const r = bodyWidth(i, total, skin.bodyStyle, scale);
    const segAng = Math.atan2(b.y - a.y, b.x - a.x);

    const grad = ctx.createRadialGradient(a.x - r * 0.25, a.y - r * 0.3, r * 0.1, a.x, a.y, r);
    grad.addColorStop(0, skin.accent);
    grad.addColorStop(0.55, skin.color);
    grad.addColorStop(1, shade(skin.color, -0.25));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(a.x, a.y, r, r * 0.82, segAng, 0, Math.PI * 2);
    ctx.fill();

    // belly underside
    ctx.fillStyle = skin.belly;
    ctx.globalAlpha = alpha * 0.85;
    ctx.beginPath();
    ctx.ellipse(a.x + Math.sin(segAng) * r * 0.15, a.y + Math.cos(segAng) * r * 0.15, r * 0.65, r * 0.35, segAng, 0, Math.PI);
    ctx.fill();
    ctx.globalAlpha = alpha;

    if (i % 2 === 0) drawScales(ctx, a.x, a.y, r, segAng, skin.scalePattern, skin.color, skin.accent);
  }

  // head
  const head = screenSegs[0];
  const hr = bodyWidth(0, total, skin.bodyStyle, scale) * 1.15;
  const hg = ctx.createRadialGradient(head.x - hr * 0.2, head.y - hr * 0.25, 1, head.x, head.y, hr);
  hg.addColorStop(0, skin.accent);
  hg.addColorStop(0.5, skin.color);
  hg.addColorStop(1, shade(skin.color, -0.3));
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(head.x, head.y, hr * 1.05, hr * 0.88, angle, 0, Math.PI * 2);
  ctx.fill();

  // eyes
  const eyeOff = hr * 0.42;
  for (const side of [-1, 1]) {
    const ex = head.x + Math.cos(angle + side * 0.55) * eyeOff;
    const ey = head.y + Math.sin(angle + side * 0.55) * eyeOff;
    ctx.fillStyle = "#f0fdf4";
    ctx.beginPath();
    ctx.ellipse(ex, ey, hr * 0.22, hr * 0.28, angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0a1a12";
    ctx.beginPath();
    ctx.arc(ex + Math.cos(angle) * hr * 0.06, ey + Math.sin(angle) * hr * 0.06, hr * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(ex + Math.cos(angle) * hr * 0.1, ey + Math.sin(angle) * hr * 0.1, hr * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }

  // forked tongue when alive
  if (alive) {
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = Math.max(1.2, hr * 0.08);
    const tx = head.x + Math.cos(angle) * hr;
    const ty = head.y + Math.sin(angle) * hr;
    const flick = Math.sin(Date.now() * 0.012) * hr * 0.15;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + Math.cos(angle) * hr * 0.7, ty + Math.sin(angle) * hr * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tx + Math.cos(angle) * hr * 0.7, ty + Math.sin(angle) * hr * 0.7);
    ctx.lineTo(tx + Math.cos(angle + 0.35) * hr * 0.55 + flick, ty + Math.sin(angle + 0.35) * hr * 0.55);
    ctx.moveTo(tx + Math.cos(angle) * hr * 0.7, ty + Math.sin(angle) * hr * 0.7);
    ctx.lineTo(tx + Math.cos(angle - 0.35) * hr * 0.55 - flick, ty + Math.sin(angle - 0.35) * hr * 0.55);
    ctx.stroke();
  }

  if (isHuman && alive) {
    ctx.strokeStyle = "rgba(99,255,224,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(head.x, head.y, hr * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
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

export function drawSkinPreview(
  ctx: CanvasRenderingContext2D,
  skin: SnakeSkin,
  w: number,
  h: number,
) {
  ctx.clearRect(0, 0, w, h);
  const cx = w * 0.5;
  const cy = h * 0.55;
  const segs: Segment[] = [];
  for (let i = 0; i < 14; i += 1) {
    segs.push({ x: cx - i * 11 + Math.sin(i * 0.5) * 6, y: cy + Math.cos(i * 0.45) * 8 });
  }
  drawRealisticSnake(ctx, (p) => p, {
    segments: segs,
    angle: 0,
    scale: 0.85,
    alive: true,
    isHuman: false,
    skin,
  });
}
