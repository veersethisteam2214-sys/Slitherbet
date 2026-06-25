import type { Segment } from "../shared";
import {
  BASE_SNAKE,
  resolveSnakeLook,
  type BodyStyle,
  type Cosmetic,
  type EquippedCosmetics,
  type HatStyle,
  type ScalePattern,
} from "../snakeSkins";

type DrawOpts = {
  segments: Segment[];
  angle: number;
  scale: number;
  alive: boolean;
  isHuman: boolean;
  equipped?: EquippedCosmetics;
};

type ResolvedLook = ReturnType<typeof resolveSnakeLook>;

function bodyWidth(index: number, total: number, style: BodyStyle, scale: number) {
  const t = index / Math.max(1, total - 1);
  const base = style === "slender" ? 14 : style === "heavy" ? 22 : 18;
  const taper = 1 - t * 0.72;
  return Math.max(4, base * taper * scale);
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

function drawClothingLayer(
  ctx: CanvasRenderingContext2D,
  screenSegs: Segment[],
  total: number,
  angle: number,
  scale: number,
  look: ResolvedLook,
) {
  const cloth = look.clothing;
  if (!cloth?.clothingStyle) return;
  const style = cloth.clothingStyle;
  const p = cloth.primary ?? "#888";
  const s = cloth.secondary ?? "#ccc";

  if (style === "collar") {
    const neck = screenSegs[Math.min(1, total - 1)];
    const r = bodyWidth(1, total, look.bodyStyle, scale) * 1.1;
    ctx.strokeStyle = p;
    ctx.lineWidth = Math.max(2.5, r * 0.22);
    ctx.beginPath();
    ctx.arc(neck.x, neck.y, r * 0.95, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = s;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(neck.x, neck.y, r * 0.75, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  if (style === "vest") {
    for (let i = 3; i <= Math.min(10, total - 1); i += 1) {
      const seg = screenSegs[i];
      const r = bodyWidth(i, total, look.bodyStyle, scale);
      const nx = -Math.sin(angle);
      const ny = Math.cos(angle);
      ctx.fillStyle = p;
      ctx.globalAlpha = 0.88;
      ctx.beginPath();
      ctx.ellipse(seg.x + nx * r * 0.35, seg.y + ny * r * 0.35, r * 0.75, r * 0.45, angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = s;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return;
  }

  if (style === "scarf") {
    for (let i = 1; i <= Math.min(4, total - 1); i += 1) {
      const seg = screenSegs[i];
      const r = bodyWidth(i, total, look.bodyStyle, scale);
      ctx.strokeStyle = i % 2 ? p : s;
      ctx.lineWidth = r * 0.35;
      ctx.beginPath();
      ctx.arc(seg.x, seg.y, r * 0.9, angle - 0.8, angle + 0.8);
      ctx.stroke();
    }
    const tail = screenSegs[Math.min(3, total - 1)];
    ctx.strokeStyle = p;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.lineTo(tail.x - Math.cos(angle + 0.6) * 18, tail.y - Math.sin(angle + 0.6) * 18);
    ctx.stroke();
    return;
  }

  if (style === "chain") {
    for (let i = 2; i <= Math.min(6, total - 1); i += 1) {
      const seg = screenSegs[i];
      const r = bodyWidth(i, total, look.bodyStyle, scale) * 0.22;
      ctx.fillStyle = i % 2 ? p : s;
      ctx.beginPath();
      ctx.arc(seg.x, seg.y - r * 0.5, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shade(p, -0.2);
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }
}

function drawBandana(
  ctx: CanvasRenderingContext2D,
  head: Segment,
  angle: number,
  hr: number,
  cloth: Cosmetic,
) {
  const p = cloth.primary ?? "#1d4ed8";
  const s = cloth.secondary ?? "#93c5fd";
  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(angle);
  ctx.fillStyle = p;
  ctx.beginPath();
  ctx.moveTo(hr * 0.2, -hr * 0.5);
  ctx.lineTo(hr * 1.1, 0);
  ctx.lineTo(hr * 0.2, hr * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = s;
  ctx.beginPath();
  ctx.moveTo(-hr * 0.3, -hr * 0.35);
  ctx.lineTo(hr * 0.5, 0);
  ctx.lineTo(-hr * 0.3, hr * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHat(
  ctx: CanvasRenderingContext2D,
  head: Segment,
  angle: number,
  hr: number,
  hat: Cosmetic,
) {
  const style = hat.hatStyle as HatStyle;
  const p = hat.primary ?? "#333";
  const s = hat.secondary ?? "#666";

  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(angle);

  switch (style) {
    case "cap": {
      ctx.fillStyle = p;
      ctx.beginPath();
      ctx.ellipse(0, -hr * 0.15, hr * 0.95, hr * 0.55, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = s;
      ctx.fillRect(-hr * 0.55, -hr * 0.05, hr * 1.5, hr * 0.12);
      break;
    }
    case "beanie": {
      ctx.fillStyle = p;
      ctx.beginPath();
      ctx.arc(0, -hr * 0.35, hr * 0.75, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = s;
      ctx.beginPath();
      ctx.arc(0, -hr * 0.85, hr * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shade(p, -0.15);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-hr * 0.75, -hr * 0.35);
      ctx.lineTo(hr * 0.75, -hr * 0.35);
      ctx.stroke();
      break;
    }
    case "cowboy": {
      ctx.fillStyle = p;
      ctx.beginPath();
      ctx.ellipse(0, -hr * 0.05, hr * 1.6, hr * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, -hr * 0.45, hr * 0.65, hr * 0.45, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = s;
      ctx.fillRect(-hr * 0.65, -hr * 0.48, hr * 1.3, hr * 0.1);
      break;
    }
    case "topper": {
      ctx.fillStyle = p;
      ctx.fillRect(-hr * 0.55, -hr * 1.35, hr * 1.1, hr * 1.1);
      ctx.fillStyle = s;
      ctx.fillRect(-hr * 0.75, -hr * 0.28, hr * 1.5, hr * 0.14);
      ctx.fillStyle = shade(p, 0.1);
      ctx.fillRect(-hr * 0.55, -hr * 1.35, hr * 1.1, hr * 0.12);
      break;
    }
    case "crown": {
      ctx.fillStyle = p;
      ctx.fillRect(-hr * 0.7, -hr * 0.55, hr * 1.4, hr * 0.35);
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * hr * 0.32, -hr * 0.55);
        ctx.lineTo(i * hr * 0.32 + hr * 0.12, -hr * 0.95);
        ctx.lineTo(i * hr * 0.32 + hr * 0.24, -hr * 0.55);
        ctx.fill();
      }
      ctx.fillStyle = s;
      for (let j = -1; j <= 1; j += 1) {
        ctx.beginPath();
        ctx.arc(j * hr * 0.32, -hr * 0.42, hr * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "horns": {
      ctx.fillStyle = p;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * hr * 0.35, -hr * 0.35);
        ctx.lineTo(side * hr * 0.75, -hr * 1.05);
        ctx.lineTo(side * hr * 0.15, -hr * 0.45);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = s;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(side * hr * 0.75, -hr * 1.05, hr * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }
  ctx.restore();
}

export function drawRealisticSnake(
  ctx: CanvasRenderingContext2D,
  worldToScreen: (p: Segment) => Segment,
  opts: DrawOpts,
) {
  const { segments, angle, scale, alive, isHuman, equipped } = opts;
  if (segments.length < 2) return;

  const look = resolveSnakeLook(equipped ?? { scales: "scales-natural", clothing: null, hat: null });
  const alpha = alive ? 1 : 0.22;
  ctx.globalAlpha = alpha;

  const screenSegs = segments.map(worldToScreen);
  const total = screenSegs.length;
  const head = screenSegs[0];
  const hr = bodyWidth(0, total, look.bodyStyle, scale) * 1.15;

  ctx.fillStyle = "rgba(0,0,0,0.28)";
  for (let i = total - 1; i > 0; i -= 1) {
    const p = screenSegs[i];
    const b = screenSegs[i - 1];
    const r = bodyWidth(i, total, look.bodyStyle, scale) * 0.9;
    const segAng = Math.atan2(b.y - p.y, b.x - p.x);
    ctx.beginPath();
    ctx.ellipse(p.x + 2, p.y + r * 0.5, r * 0.95, r * 0.38, segAng, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(head.x + 2, head.y + hr * 0.5, hr * 0.95, hr * 0.4, angle, 0, Math.PI * 2);
  ctx.fill();

  for (let i = total - 1; i > 0; i -= 1) {
    const a = screenSegs[i];
    const b = screenSegs[i - 1];
    const r = bodyWidth(i, total, look.bodyStyle, scale);
    const segAng = Math.atan2(b.y - a.y, b.x - a.x);

    const grad = ctx.createRadialGradient(a.x - r * 0.25, a.y - r * 0.3, r * 0.1, a.x, a.y, r);
    grad.addColorStop(0, look.accent);
    grad.addColorStop(0.55, look.color);
    grad.addColorStop(1, shade(look.color, -0.25));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(a.x, a.y, r, r * 0.82, segAng, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = look.belly;
    ctx.globalAlpha = alpha * 0.85;
    ctx.beginPath();
    ctx.ellipse(a.x + Math.sin(segAng) * r * 0.15, a.y + Math.cos(segAng) * r * 0.15, r * 0.65, r * 0.35, segAng, 0, Math.PI);
    ctx.fill();
    ctx.globalAlpha = alpha;

    if (i % 2 === 0) drawScales(ctx, a.x, a.y, r, segAng, look.scalePattern, look.color, look.accent);
  }

  drawClothingLayer(ctx, screenSegs, total, angle, scale, look);

  const hg = ctx.createRadialGradient(head.x - hr * 0.2, head.y - hr * 0.25, 1, head.x, head.y, hr);
  hg.addColorStop(0, look.accent);
  hg.addColorStop(0.5, look.color);
  hg.addColorStop(1, shade(look.color, -0.3));
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(head.x, head.y, hr * 1.05, hr * 0.88, angle, 0, Math.PI * 2);
  ctx.fill();

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

  if (look.clothing?.clothingStyle === "bandana") drawBandana(ctx, head, angle, hr, look.clothing);

  if (look.hat) drawHat(ctx, head, angle, hr, look.hat);

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
    ctx.arc(head.x, head.y, hr * 1.65, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

export function drawCosmeticPreview(
  ctx: CanvasRenderingContext2D,
  equipped: EquippedCosmetics,
  w: number,
  h: number,
  time = 0,
) {
  ctx.clearRect(0, 0, w, h);
  const bg = ctx.createRadialGradient(w / 2, h * 0.6, 10, w / 2, h * 0.6, w * 0.55);
  bg.addColorStop(0, "rgba(20, 30, 28, 0.95)");
  bg.addColorStop(1, "rgba(6, 8, 12, 0.98)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * 0.58;
  const segs: Segment[] = [];
  for (let i = 0; i < 16; i += 1) {
    segs.push({
      x: cx - i * 12 + Math.sin(i * 0.55 + time * 1.4) * 7,
      y: cy + Math.cos(i * 0.4 + time * 0.9) * 10,
    });
  }
  drawRealisticSnake(ctx, (p) => p, {
    segments: segs,
    angle: Math.sin(time * 0.6) * 0.08,
    scale: 0.9,
    alive: true,
    isHuman: false,
    equipped,
  });
}

/** @deprecated use drawCosmeticPreview */
export function drawSkinPreview(ctx: CanvasRenderingContext2D, _skin: unknown, w: number, h: number) {
  drawCosmeticPreview(ctx, { scales: "scales-natural", clothing: null, hat: null }, w, h);
}

export { BASE_SNAKE };
