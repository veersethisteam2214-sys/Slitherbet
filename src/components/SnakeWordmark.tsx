import { useEffect, useRef } from "react";
import { drawWordmarkFrame } from "./wordmarkCanvas";

type Props = { theme: "arcade" | "neon" };

export function SnakeWordmark({ theme }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let W = 0;
    let H = 0;
    const start = performance.now();

    const resize = () => {
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const render = (now: number) => {
      drawWordmarkFrame(ctx, W, H, (now - start) / 1000, theme);
      raf = requestAnimationFrame(render);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [theme]);

  return (
    <div ref={wrapRef} className="snake-wordmark-stage" aria-hidden={false}>
      <canvas ref={canvasRef} className="snake-wordmark" role="img" aria-label="SlitherBet" />
    </div>
  );
}
