import { useEffect, useRef } from "react";

type Props = { theme: "arcade" | "neon" };

export function SnakeWordmark({ theme }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 820;
    const H = 190;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const trail: { x: number; y: number }[] = [];
    let raf = 0;
    const start = performance.now();
    const teal = theme === "neon" ? "#29f0ff" : "#37e07a";

    const render = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, W, H);

      const headX = ((t * 150) % (W + 160)) - 80;
      const headY = H * 0.5 + Math.sin(headX * 0.018 + t) * 34;
      trail.unshift({ x: headX, y: headY });
      if (trail.length > 70) trail.length = 70;

      // snake body (drawn behind the wordmark)
      for (let i = trail.length - 1; i >= 0; i -= 1) {
        const p = trail[i];
        const f = i / trail.length;
        const r = Math.max(3, 16 * (1 - f * 0.9));
        const hue = (theme === "neon" ? 180 : 150) - f * 26;
        ctx.save();
        ctx.shadowColor = `hsla(${hue}, 90%, 55%, 0.65)`;
        ctx.shadowBlur = 16;
        const g = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, 1, p.x, p.y, r);
        g.addColorStop(0, `hsl(${hue}, 92%, 72%)`);
        g.addColorStop(1, `hsl(${hue}, 86%, 42%)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // head
      const head = trail[0];
      const aim = trail[3] || head;
      const ang = Math.atan2(head.y - aim.y, head.x - aim.x);
      ctx.save();
      ctx.translate(head.x, head.y);
      ctx.rotate(ang);
      ctx.shadowColor = `${teal}cc`;
      ctx.shadowBlur = 18;
      const hg = ctx.createRadialGradient(-4, -4, 1, 0, 0, 18);
      hg.addColorStop(0, theme === "neon" ? "#b6fbff" : "#9bffc9");
      hg.addColorStop(1, theme === "neon" ? "#16b9c8" : "#1fb874");
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ff4d6d";
      ctx.lineWidth = 2.4;
      const flick = Math.sin(t * 16) * 4;
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(28, 0);
      ctx.lineTo(33, -4 + flick);
      ctx.moveTo(28, 0);
      ctx.lineTo(33, 4 + flick);
      ctx.stroke();
      ctx.fillStyle = "#06231a";
      ctx.beginPath();
      ctx.arc(5, -5, 2.6, 0, Math.PI * 2);
      ctx.arc(5, 5, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // wordmark on top
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = "800 76px 'Space Grotesk', Inter, system-ui";
      const a = "SLITHER";
      const b = "BET";
      const wa = ctx.measureText(a).width;
      const wb = ctx.measureText(b).width;
      const totalW = wa + wb + 6;
      const sx = (W - totalW) / 2;
      const my = H * 0.52;

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 4;
      const gA = ctx.createLinearGradient(sx, 0, sx + wa, 0);
      gA.addColorStop(0, theme === "neon" ? "#bafcff" : "#d7ffe9");
      gA.addColorStop(1, teal);
      ctx.fillStyle = gA;
      ctx.fillText(a, sx, my);
      const gB = ctx.createLinearGradient(sx + wa, 0, sx + totalW, 0);
      gB.addColorStop(0, "#ffd447");
      gB.addColorStop(1, theme === "neon" ? "#ff39c0" : "#ff5aa6");
      ctx.fillStyle = gB;
      ctx.fillText(b, sx + wa + 6, my);
      ctx.restore();

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [theme]);

  return <canvas ref={canvasRef} className="snake-wordmark" role="img" aria-label="SlitherBet" />;
}
