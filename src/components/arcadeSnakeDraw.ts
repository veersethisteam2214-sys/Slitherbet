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

/** Segmented hatchling snake - same visual language as single-player Cave Run. */
export function drawArcadeSnake(
  ctx: CanvasRenderingContext2D,
  headX: number,
  headY: number,
  segCount: number,
  base: string,
  wiggle: number,
  neon: boolean,
  spacing = 11,
  headR = 13,
) {
  const light = neon ? shade(base, 0.55) : shade(base, 0.4);
  const mid = base;
  const dark = shade(base, -0.32);
  const glow = neon ? base : "rgba(0,0,0,0)";

  ctx.save();
  if (neon) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 16;
  }
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  for (let i = segCount - 1; i >= 0; i -= 1) {
    const sx = headX - i * spacing;
    const sy = headY + Math.sin(wiggle * 6 - i * 0.5) * 2.5;
    const t = i / segCount;
    const r = Math.max(3.5, headR * (1 - t * 0.5));
    ctx.beginPath();
    ctx.ellipse(sx + 2, sy + headR * 0.55, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  for (let i = segCount - 1; i >= 0; i -= 1) {
    const sx = headX - i * spacing;
    const sy = headY + Math.sin(wiggle * 6 - i * 0.5) * 2.5;
    const t = i / segCount;
    const r = Math.max(3.5, headR * (1 - t * 0.5));
    ctx.save();
    if (neon) {
      ctx.shadowColor = glow;
      ctx.shadowBlur = 12 * (1 - t * 0.5);
    }
    const grad = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.4, r * 0.2, sx, sy, r);
    grad.addColorStop(0, light);
    grad.addColorStop(0.55, mid);
    grad.addColorStop(1, dark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const hx = headX;
  const hy = headY + Math.sin(wiggle * 6) * 2.5;
  const hr = headR + 1.5;
  ctx.save();
  if (neon) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 20;
  }
  const hg = ctx.createRadialGradient(hx - hr * 0.3, hy - hr * 0.4, hr * 0.2, hx, hy, hr);
  hg.addColorStop(0, light);
  hg.addColorStop(0.55, mid);
  hg.addColorStop(1, dark);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  const tongue = (Math.sin(wiggle * 9) * 0.5 + 0.5) * 7;
  ctx.strokeStyle = neon ? "#ff6b8a" : "#b86a5a";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(hx + hr - 2, hy);
  ctx.lineTo(hx + hr + tongue, hy);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(hx + 4, hy - 4.5, 3.6, 0, Math.PI * 2);
  ctx.arc(hx + 9.5, hy - 4.5, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#14120e";
  ctx.beginPath();
  ctx.arc(hx + 5.2, hy - 4.5, 1.6, 0, Math.PI * 2);
  ctx.arc(hx + 10.7, hy - 4.5, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
