import { useEffect, useRef, useState, type CSSProperties } from "react";
import { drawWordmarkFrame } from "../components/wordmarkCanvas";

type LoadingProps = {
  onDone: () => void;
  duration?: number;
};

const phases = ["Lighting crystal veins", "Sealing the wager rail", "Awakening the cave", "Dropping in"];

export function Loading({ onDone, duration = 3200 }: LoadingProps) {
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 2.4);
      progressRef.current = eased;
      setProgress(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setTimeout(onDone, 320);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, onDone]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const start = performance.now();
    let raf = 0;
    let W = 0;
    let H = 0;

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
      drawWordmarkFrame(ctx, W, H, (now - start) / 1000, "arcade");
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
  }, []);

  const phase = phases[Math.min(phases.length - 1, Math.floor(progress * phases.length))];
  const pct = Math.round(progress * 100);

  return (
    <div className="loading-screen">
      <div className="loading-vignette" aria-hidden />
      <div className="loading-noise" aria-hidden />
      <div className="loading-crystal-field" aria-hidden>
        <span className="lc lc-a" />
        <span className="lc lc-b" />
        <span className="lc lc-c" />
        <span className="lc lc-d" />
      </div>

      <div className="loading-stage">
        <div className="loading-cave-preview" aria-hidden>
          <div className="loader-stalactites">
            <i /><i /><i /><i /><i /><i />
          </div>
          <div className="loader-orb orb-a">1.08x</div>
          <div className="loader-orb orb-b">1.33x</div>
          <div className="loader-snake">
            {Array.from({ length: 13 }, (_, i) => <i key={i} style={{ "--i": i } as CSSProperties} />)}
            <b />
          </div>
          <div className="loader-platform platform-a" />
          <div className="loader-platform platform-b" />
          <div className="loader-platform platform-c" />
        </div>

        <div ref={wrapRef} className="loading-wordmark-band">
          <canvas ref={canvasRef} className="loading-wordmark-canvas" aria-hidden />
        </div>

        <div className="loading-status">
          <div className="loading-status-head">
            <span>Session boot</span>
            <strong>Crystal Cave</strong>
          </div>
          <div className="loading-track">
            <i style={{ width: `${pct}%` }} />
          </div>
          <div className="loading-meta">
            <span>{phase}</span>
            <span className="loading-pct">{pct}%</span>
          </div>
        </div>
      </div>

      <footer className="loading-footer">
        <span className="loading-mark">SlitherBet arcade client</span>
        <span className="loading-credit">
          demo stakes · <strong>play money</strong>
        </span>
      </footer>
    </div>
  );
}
