import { useEffect, useRef } from "react";
import { audio } from "../audio";
import { drawIntroFrame, INTRO_HISS_MS, INTRO_TOTAL_MS } from "../components/snakeIntroRenderer";

type SlitherIntroProps = {
  onDone: () => void;
};

export function SlitherIntro({ onDone }: SlitherIntroProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

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
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let raf = 0;
    let hissed = false;
    const start = performance.now();

    // Audio is gesture-gated by the browser; resume eagerly and again on any
    // interaction so the hiss lands if the player has clicked anywhere.
    audio.resume();

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      cancelAnimationFrame(raf);
      wrap.classList.add("intro-out");
      window.setTimeout(() => onDoneRef.current(), 420);
    };

    const loop = (now: number) => {
      const ms = now - start;
      // Reduced motion: hold the formed idle pose, then leave quickly.
      const t = reduce ? 3.9 : ms / 1000;
      drawIntroFrame(ctx, W, H, t);

      if (!reduce && !hissed && ms >= INTRO_HISS_MS) {
        hissed = true;
        audio.play("hiss");
      }

      const total = reduce ? 1300 : INTRO_TOTAL_MS;
      if (ms >= total) {
        finish();
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onSkip = () => {
      audio.resume();
      finish();
    };
    wrap.addEventListener("pointerdown", onSkip);
    window.addEventListener("keydown", onSkip);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      wrap.removeEventListener("pointerdown", onSkip);
      window.removeEventListener("keydown", onSkip);
    };
  }, []);

  return (
    <div ref={wrapRef} className="slither-intro" role="img" aria-label="SLITHER">
      <canvas ref={canvasRef} className="slither-intro-canvas" aria-hidden />
      <button className="intro-skip" type="button" aria-label="Skip intro">
        Skip <span aria-hidden>▸</span>
      </button>
    </div>
  );
}
