import { drawArcadeSnake } from "./arcadeSnakeDraw";

export type WordmarkPalette = {
  snakeBase: string;
  textPrimary: string;
  textAccent: string;
};

export function paletteFor(theme: "arcade" | "neon"): WordmarkPalette {
  if (theme === "neon") {
    return {
      snakeBase: "#3dff9a",
      textPrimary: "#f0ece4",
      textAccent: "#d4b87a",
    };
  }
  return {
    snakeBase: "#6b9478",
    textPrimary: "#f2efe8",
    textAccent: "#c9a962",
  };
}

export function drawWordmarkFrame(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  theme: "arcade" | "neon",
) {
  const pal = paletteFor(theme);
  const neon = theme === "neon";
  ctx.clearRect(0, 0, W, H);

  const fontSize = Math.max(48, Math.min(92, W * 0.105));
  ctx.font = `700 ${fontSize}px "Outfit", system-ui`;
  const a = "SLITHER";
  const b = "BET";
  const wa = ctx.measureText(a).width;
  const gap = fontSize * 0.08;
  const wb = ctx.measureText(b).width;
  const totalW = wa + gap + wb;
  const sx = (W - totalW) / 2;
  const my = H * 0.54;

  const speed = 130;
  const loop = W + fontSize * 3.5;
  const headX = ((t * speed) % loop) - fontSize * 1.8;
  const headY = my + Math.sin(headX * 0.012 + t * 0.7) * (fontSize * 0.12);
  const segCount = 14;

  drawArcadeSnake(ctx, headX, headY, segCount, pal.snakeBase, t, neon, fontSize * 0.11, fontSize * 0.13);

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${fontSize}px "Outfit", system-ui`;
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
