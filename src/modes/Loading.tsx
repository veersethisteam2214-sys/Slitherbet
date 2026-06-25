import { useEffect, useRef, useState } from "react";

type LoadingProps = {
  onDone: () => void;
  duration?: number;
};

const phases = ["Coiling up", "Counting the pot", "Sharpening blades", "Slither time"];

export function Loading({ onDone, duration = 3000 }: LoadingProps) {
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressRef = useRef(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      progressRef.current = eased;
      setProgress(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setTimeout(onDone, 260);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, onDone]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = 320;
    const H = 320;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const trail: { x: number; y: number }[] = [];
    const start = performance.now();

    const render = (now: number) => {
      const time = (now - start) / 1000;
      const cx = W / 2;
      const cy = H / 2;
      // figure-eight (lemniscate-ish) head path
      const r = 96;
      const hx = cx + (r * Math.cos(time * 1.6)) / (1 + Math.sin(time * 1.6) ** 2);
      const hy = cy + (r * Math.sin(time * 1.6) * Math.cos(time * 1.6)) / (1 + Math.sin(time * 1.6) ** 2) * 1.6;
      trail.unshift({ x: hx, y: hy });
      const maxLen = Math.round(26 + progressRef.current * 80);
      if (trail.length > maxLen) trail.length = maxLen;

      ctx.clearRect(0, 0, W, H);

      // glowing prize coin that the snake chases
      const coinAngle = time * 1.6 + 0.9;
      const coinX = cx + (r * Math.cos(coinAngle)) / (1 + Math.sin(coinAngle) ** 2);
      const coinY = cy + (r * Math.sin(coinAngle) * Math.cos(coinAngle)) / (1 + Math.sin(coinAngle) ** 2) * 1.6;
      ctx.save();
      ctx.translate(coinX, coinY);
      ctx.rotate(time * 1.4);
      ctx.shadowColor = "#ffce4d";
      ctx.shadowBlur = 22;
      const gem = ctx.createLinearGradient(0, -8, 0, 8);
      gem.addColorStop(0, "#fff0bd");
      gem.addColorStop(1, "#f0a823");
      ctx.fillStyle = gem;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(7, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // body
      for (let i = trail.length - 1; i >= 0; i -= 1) {
        const p = trail[i];
        const f = i / trail.length;
        const rad = Math.max(2.5, 13 * (1 - f * 0.85));
        const hue = 150 - f * 30;
        ctx.save();
        ctx.shadowColor = `hsla(${hue}, 90%, 55%, 0.7)`;
        ctx.shadowBlur = 14;
        const grad = ctx.createRadialGradient(p.x - rad * 0.3, p.y - rad * 0.3, 1, p.x, p.y, rad);
        grad.addColorStop(0, `hsl(${hue}, 90%, 70%)`);
        grad.addColorStop(1, `hsl(${hue}, 85%, 42%)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // head with eyes + tongue
      const head = trail[0];
      const aim = trail[3] || trail[0];
      const ang = Math.atan2(head.y - aim.y, head.x - aim.x);
      ctx.save();
      ctx.translate(head.x, head.y);
      ctx.rotate(ang);
      ctx.shadowColor = "rgba(80, 245, 170, 0.8)";
      ctx.shadowBlur = 16;
      const hg = ctx.createRadialGradient(-4, -4, 1, 0, 0, 15);
      hg.addColorStop(0, "#9bffc9");
      hg.addColorStop(1, "#1fb874");
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // tongue
      ctx.strokeStyle = "#ff4d6d";
      ctx.lineWidth = 2;
      const flick = Math.sin(time * 16) * 3;
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(24, 0);
      ctx.lineTo(28, -3 + flick);
      ctx.moveTo(24, 0);
      ctx.lineTo(28, 3 + flick);
      ctx.stroke();
      // eyes
      ctx.fillStyle = "#06231a";
      ctx.beginPath();
      ctx.arc(4, -5, 2.4, 0, Math.PI * 2);
      ctx.arc(4, 5, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#eafff4";
      ctx.beginPath();
      ctx.arc(5, -5, 1, 0, Math.PI * 2);
      ctx.arc(5, 5, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  const phase = phases[Math.min(phases.length - 1, Math.floor(progress * phases.length))];

  return (
    <div className="loading-screen">
      <div className="loading-aurora" />
      <div className="loading-grid" />
      <div className="loading-core">
        <canvas ref={canvasRef} className="loading-snake" style={{ width: 320, height: 320 }} />
        <div className="loading-wordmark">
          <span className="lw-slither">SLITHER</span>
          <span className="lw-bet">BET</span>
        </div>
        <div className="loading-bar">
          <i style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <div className="loading-meta">
          <span>{phase}</span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
        <div className="loading-credit">
          a <strong>VKbets</strong> production
        </div>
      </div>
    </div>
  );
}
