export type WordmarkPalette = {
  snakeLight: string;
  snakeDark: string;
  snakeGlow: string;
  textPrimary: string;
  textAccent: string;
  tongue: string;
};

export function paletteFor(theme: "arcade" | "neon"): WordmarkPalette {
  if (theme === "neon") {
    return {
      snakeLight: "#b8dcc4",
      snakeDark: "#4a7a5c",
      snakeGlow: "rgba(120, 180, 140, 0.45)",
      textPrimary: "#f0ece4",
      textAccent: "#d4b87a",
      tongue: "#c47a6a",
    };
  }
  return {
    snakeLight: "#c8dcc8",
    snakeDark: "#5a8268",
    snakeGlow: "rgba(106, 148, 118, 0.4)",
    textPrimary: "#f2efe8",
    textAccent: "#c9a962",
    tongue: "#b86a5a",
  };
}

type TrailPoint = { x: number; y: number };

export function drawWordmarkFrame(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  theme: "arcade" | "neon",
  trail: TrailPoint[],
) {
  const pal = paletteFor(theme);
  ctx.clearRect(0, 0, W, H);

  const fontSize = Math.max(48, Math.min(92, W * 0.105));
  ctx.font = `700 ${fontSize}px "Space Grotesk", Inter, system-ui`;
  const a = "SLITHER";
  const b = "BET";
  const wa = ctx.measureText(a).width;
  const gap = fontSize * 0.08;
  const wb = ctx.measureText(b).width;
  const totalW = wa + gap + wb;
  const sx = (W - totalW) / 2;
  const my = H * 0.54;

  const speed = 140;
  const loop = W + fontSize * 3.2;
  const headX = ((t * speed) % loop) - fontSize * 1.6;
  const wave = Math.sin(headX * 0.014 + t * 0.8) * (fontSize * 0.28);
  const headY = my + wave;

  trail.unshift({ x: headX, y: headY });
  const maxTrail = Math.round(52 + fontSize * 0.35);
  if (trail.length > maxTrail) trail.length = maxTrail;

  for (let i = trail.length - 1; i >= 0; i -= 1) {
    const p = trail[i];
    const f = i / trail.length;
    const r = Math.max(2.5, fontSize * 0.11 * (1 - f * 0.88));
    ctx.save();
    ctx.shadowColor = pal.snakeGlow;
    ctx.shadowBlur = 12 * (1 - f);
    const g = ctx.createRadialGradient(p.x - r * 0.25, p.y - r * 0.25, 0.5, p.x, p.y, r);
    g.addColorStop(0, pal.snakeLight);
    g.addColorStop(1, pal.snakeDark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const head = trail[0];
  const aim = trail[4] || head;
  const ang = Math.atan2(head.y - aim.y, head.x - aim.x);
  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(ang);
  ctx.shadowColor = pal.snakeGlow;
  ctx.shadowBlur = 16;
  const headR = fontSize * 0.14;
  const hg = ctx.createRadialGradient(-headR * 0.2, -headR * 0.2, 0.5, 0, 0, headR);
  hg.addColorStop(0, pal.snakeLight);
  hg.addColorStop(1, pal.snakeDark);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(0, 0, headR, headR * 0.78, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = pal.tongue;
  ctx.lineWidth = Math.max(1.5, fontSize * 0.018);
  const flick = Math.sin(t * 14) * (fontSize * 0.03);
  ctx.beginPath();
  ctx.moveTo(headR * 0.85, 0);
  ctx.lineTo(headR * 1.55, 0);
  ctx.lineTo(headR * 1.75, -headR * 0.22 + flick);
  ctx.moveTo(headR * 1.55, 0);
  ctx.lineTo(headR * 1.75, headR * 0.22 + flick);
  ctx.stroke();
  ctx.fillStyle = "#1a1c18";
  ctx.beginPath();
  ctx.arc(headR * 0.28, -headR * 0.32, headR * 0.14, 0, Math.PI * 2);
  ctx.arc(headR * 0.28, headR * 0.32, headR * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${fontSize}px "Space Grotesk", Inter, system-ui`;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = pal.textPrimary;
  ctx.fillText(a, sx, my);
  ctx.fillStyle = pal.textAccent;
  ctx.fillText(b, sx + wa + gap, my);
  ctx.restore();
}
