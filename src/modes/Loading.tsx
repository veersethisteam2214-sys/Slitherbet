import { useEffect, useState } from "react";

type LoadingProps = {
  onDone: () => void;
  duration?: number;
};

const phases = ["Warming the arena", "Shuffling the deck", "Sharpening blades", "Ready"];

export function Loading({ onDone, duration = 2600 }: LoadingProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setTimeout(onDone, 220);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, onDone]);

  const phase = phases[Math.min(phases.length - 1, Math.floor(progress * phases.length))];

  return (
    <div className="loading-screen">
      <div className="loading-aurora" />
      <div className="loading-core">
        <div className="loading-orbit">
          <span className="orbit-dot d1" />
          <span className="orbit-dot d2" />
          <span className="orbit-dot d3" />
          <div className="loading-logo">
            <span className="logo-x">X</span>
            <span className="logo-x mid">X</span>
            <span className="logo-x">X</span>
          </div>
        </div>
        <div className="loading-bar">
          <i style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <div className="loading-meta">
          <span>{phase}</span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
