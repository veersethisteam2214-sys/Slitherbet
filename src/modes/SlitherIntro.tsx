import { useEffect, useRef } from "react";
import { SlitherLoadingEngine } from "../components/slitherLoadingEngine";

type SlitherIntroProps = {
  onDone: () => void;
};

export function SlitherIntro({ onDone }: SlitherIntroProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    let left = false;
    const finish = () => {
      if (left) return;
      left = true;
      wrap.classList.add("intro-out");
      window.setTimeout(() => onDoneRef.current(), 360);
    };

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const engine = new SlitherLoadingEngine(canvas, finish, { soundOn: !reduce });
    engine.init();
    if (reduce) engine.skip();

    const skip = () => engine.skip();
    wrap.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);

    return () => {
      engine.destroy();
      wrap.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
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
