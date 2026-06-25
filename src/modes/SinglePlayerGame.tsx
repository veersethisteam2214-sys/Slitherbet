import { ArrowLeft, ArrowRight, Coins, HandCoins, Skull, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatMoney, rand } from "../shared";

type Status = "ready" | "safe" | "crossing" | "dead" | "cashed";

type SinglePlayerState = {
  status: Status;
  stake: number;
  level: number;
  fromLevel: number;
  crossT: number;
  crossSurvive: boolean;
  chopFired: boolean;
  chopAnim: number;
  snakeWX: number;
  camX: number;
  targetSegments: number;
  flash: number;
  shake: number;
  wiggle: number;
  result: number;
};

const stakeOptions = [1, 5, 25, 100];

const FAIL_CHANCE = 0.16;
const HOUSE_EDGE = 0.05;
const STEP_FACTOR = (1 - HOUSE_EDGE) / (1 - FAIL_CHANCE);

const STEP = 220;
const PLATFORM_W = 116;
const PLATFORM_H = 22;
const CROSS_DURATION = 0.62;
const CHOP_TIME = 0.16;

const BASE_SEG = 5;
const MAX_SEG = 64;
const SEG_SPACING = 12.5;
const HEAD_R = 12;

function multForLevel(level: number) {
  return level <= 0 ? 1 : Math.pow(STEP_FACTOR, level);
}

function levelX(level: number) {
  return level * STEP;
}

function segmentCount(level: number) {
  return Math.min(MAX_SEG, BASE_SEG + Math.floor(level * 1.4));
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function createState(stake: number): SinglePlayerState {
  return {
    status: "ready",
    stake,
    level: 0,
    fromLevel: 0,
    crossT: 0,
    crossSurvive: true,
    chopFired: false,
    chopAnim: 0,
    snakeWX: 0,
    camX: 0,
    targetSegments: segmentCount(0),
    flash: 0,
    shake: 0,
    wiggle: 0,
    result: 0,
  };
}

function startCrossing(state: SinglePlayerState) {
  if (state.status !== "safe" && state.status !== "ready") return;
  state.fromLevel = state.level;
  state.status = "crossing";
  state.crossT = 0;
  state.crossSurvive = Math.random() > FAIL_CHANCE;
  state.chopFired = false;
  state.chopAnim = 0;
}

function update(state: SinglePlayerState, dt: number, holding: boolean, width: number) {
  state.wiggle += dt;
  if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);

  if (state.status === "crossing") {
    if (state.chopFired) {
      state.chopAnim += dt;
      if (state.chopAnim >= CHOP_TIME) {
        state.status = "dead";
        state.shake = 0.55;
      }
    } else {
      state.crossT += dt / CROSS_DURATION;
      const eased = easeInOut(Math.min(1, state.crossT));
      state.snakeWX = levelX(state.fromLevel) + STEP * eased;

      if (!state.crossSurvive && state.crossT >= 0.5) {
        state.chopFired = true;
        state.chopAnim = 0;
        state.snakeWX = levelX(state.fromLevel) + STEP * 0.5;
      } else if (state.crossT >= 1) {
        state.level = state.fromLevel + 1;
        state.snakeWX = levelX(state.level);
        state.targetSegments = segmentCount(state.level);
        state.flash = 0.55;
        if (holding) startCrossing(state);
        else state.status = "safe";
      }
    }
  }

  const target = state.snakeWX - width * 0.32;
  state.camX += (target - state.camX) * Math.min(1, dt * 6);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawBlade(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, hot: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.strokeStyle = "rgba(180, 196, 210, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -240);
  ctx.lineTo(0, -34);
  ctx.stroke();

  ctx.shadowColor = hot ? "rgba(255, 80, 80, 0.9)" : "rgba(150, 200, 255, 0.45)";
  ctx.shadowBlur = hot ? 22 : 12;

  const blade = ctx.createLinearGradient(0, -34, 0, 18);
  blade.addColorStop(0, "#ffffff");
  blade.addColorStop(0.5, "#cfd8e3");
  blade.addColorStop(1, "#7c8896");
  ctx.fillStyle = blade;
  ctx.beginPath();
  ctx.moveTo(-22, -34);
  ctx.lineTo(22, -34);
  ctx.lineTo(0, 22);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#222a33";
  roundRect(ctx, -26, -42, 52, 10, 4);
  ctx.fill();
  ctx.restore();
}

function draw(canvas: HTMLCanvasElement, state: SinglePlayerState) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const laneY = rect.height * 0.56;
  const screenX = (worldX: number) => worldX - state.camX;

  const shakeX = state.shake > 0 ? rand(-7, 7) * (state.shake / 0.55) : 0;
  const shakeY = state.shake > 0 ? rand(-7, 7) * (state.shake / 0.55) : 0;
  ctx.save();
  ctx.translate(shakeX, shakeY);

  const bg = ctx.createLinearGradient(0, 0, 0, rect.height);
  bg.addColorStop(0, "#0c1826");
  bg.addColorStop(0.5, "#0a121c");
  bg.addColorStop(1, "#060c12");
  ctx.fillStyle = bg;
  ctx.fillRect(-30, -30, rect.width + 60, rect.height + 60);

  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(-30, laneY + PLATFORM_H, rect.width + 60, rect.height);

  const firstLevel = Math.max(0, Math.floor(state.camX / STEP) - 1);
  const lastLevel = firstLevel + Math.ceil(rect.width / STEP) + 3;

  for (let n = firstLevel; n <= lastLevel; n += 1) {
    const gapCenterX = screenX(levelX(n) + STEP / 2);
    if (gapCenterX < -60 || gapCenterX > rect.width + 60) continue;
    const bob = Math.sin(state.wiggle * 2 + n) * 4;
    const restY = laneY - 150;
    let bladeY = restY + bob;
    let hot = false;

    if (n === state.fromLevel && state.status === "crossing") {
      if (!state.crossSurvive && state.chopFired) {
        bladeY = restY + (laneY + 6 - restY) * Math.min(1, state.chopAnim / CHOP_TIME);
        hot = true;
      } else if (state.crossSurvive && state.crossT > 0.7) {
        bladeY = restY + (laneY + 6 - restY) * Math.min(1, (state.crossT - 0.7) / 0.3);
      }
    } else if (n === state.fromLevel && state.status === "dead" && !state.crossSurvive) {
      bladeY = laneY + 6;
      hot = true;
    }
    drawBlade(ctx, gapCenterX, bladeY, 1, hot);
  }

  for (let n = firstLevel; n <= lastLevel; n += 1) {
    const px = screenX(levelX(n));
    if (px < -PLATFORM_W || px > rect.width + PLATFORM_W) continue;

    const isCurrent = n === state.level && state.status !== "crossing";
    const isPassed = n < state.level || (state.status === "crossing" && n <= state.fromLevel);
    const isNext = n === state.level + (state.status === "crossing" ? 0 : 1);

    const padColor = isPassed ? "rgba(99,255,224,0.16)" : isNext ? "rgba(255,212,71,0.16)" : "rgba(255,255,255,0.06)";
    const edge = isCurrent ? "#63ffe0" : isNext ? "rgba(255,212,71,0.6)" : "rgba(255,255,255,0.16)";

    ctx.shadowColor = isCurrent ? "rgba(99,255,224,0.5)" : "transparent";
    ctx.shadowBlur = isCurrent ? 22 : 0;
    ctx.fillStyle = padColor;
    roundRect(ctx, px - PLATFORM_W / 2, laneY + 4, PLATFORM_W, PLATFORM_H, 9);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = isCurrent ? 2.4 : 1.4;
    ctx.strokeStyle = edge;
    roundRect(ctx, px - PLATFORM_W / 2, laneY + 4, PLATFORM_W, PLATFORM_H, 9);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(220, 240, 236, 0.75)";
    ctx.font = "700 11px Inter, system-ui";
    ctx.fillText(`LV ${n + 1}`, px, laneY + PLATFORM_H + 22);

    if (n >= 1) {
      ctx.fillStyle = isNext ? "#ffd447" : "rgba(255,255,255,0.85)";
      ctx.font = "800 14px 'Space Grotesk', Inter, system-ui";
      ctx.fillText(`${multForLevel(n).toFixed(2)}x`, px, laneY - 26);
      ctx.fillStyle = "rgba(150, 170, 166, 0.85)";
      ctx.font = "600 11px Inter, system-ui";
      ctx.fillText(formatMoney(state.stake * multForLevel(n)), px, laneY - 12);
    } else {
      ctx.fillStyle = "rgba(150, 170, 166, 0.85)";
      ctx.font = "700 11px Inter, system-ui";
      ctx.fillText("START", px, laneY - 14);
    }
  }

  const headX = screenX(state.snakeWX);
  const segCount = state.targetSegments;
  const dead = state.status === "dead";
  const movingAmp = state.status === "crossing" ? 6 : 3.2;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = segCount - 1; i >= 1; i -= 1) {
    const sx = headX - i * SEG_SPACING;
    const sy = laneY - HEAD_R + Math.sin(state.wiggle * 6 - i * 0.55) * movingAmp;
    const sxPrev = headX - (i - 1) * SEG_SPACING;
    const syPrev = laneY - HEAD_R + Math.sin(state.wiggle * 6 - (i - 1) * 0.55) * movingAmp;
    const t = i / segCount;
    const w = Math.max(5, HEAD_R * 2 * (1 - t * 0.5));
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sxPrev, syPrev);
    ctx.strokeStyle = dead ? "#7d4b4b" : "#63ffe0";
    ctx.lineWidth = w;
    ctx.shadowColor = dead ? "rgba(255,90,90,0.4)" : "#36e0bd";
    ctx.shadowBlur = 12;
    ctx.stroke();
  }

  const headY = laneY - HEAD_R + Math.sin(state.wiggle * 6) * movingAmp;
  ctx.shadowBlur = dead ? 0 : 18;
  ctx.fillStyle = dead ? "#9a5a5a" : "#aaffe9";
  ctx.beginPath();
  ctx.arc(headX, headY, HEAD_R + 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  if (!dead) {
    ctx.fillStyle = "#06110f";
    ctx.beginPath();
    ctx.arc(headX + 4, headY - 4, 2.6, 0, Math.PI * 2);
    ctx.arc(headX + 9, headY - 4, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.flash > 0 && (state.status === "safe" || state.status === "crossing")) {
    ctx.globalAlpha = Math.min(1, state.flash * 2.2);
    ctx.fillStyle = "#7cffd0";
    ctx.font = "800 22px 'Space Grotesk', Inter, system-ui";
    ctx.textAlign = "center";
    ctx.fillText("SAFE", headX, headY - 34);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

type SinglePlayerGameProps = {
  balance: number;
  onAdjustBalance: (delta: number) => void;
  onExit: () => void;
};

export function SinglePlayerGame({ balance, onAdjustBalance, onExit }: SinglePlayerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<SinglePlayerState>(createState(stakeOptions[1]));
  const holdingRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const lastRef = useRef<number>(performance.now());

  const [stake, setStake] = useState(stakeOptions[1]);
  const [hud, setHud] = useState({
    status: "ready" as Status,
    level: 0,
    multiplier: 1,
    cashout: 0,
    nextMultiplier: STEP_FACTOR,
    result: 0,
  });

  const startRun = useCallback(() => {
    if (balance < stake) return;
    onAdjustBalance(-stake);
    holdingRef.current = false;
    const next = createState(stake);
    next.status = "safe";
    stateRef.current = next;
  }, [balance, stake, onAdjustBalance]);

  const beginCross = useCallback(() => {
    const state = stateRef.current;
    if (state.status === "safe") startCrossing(state);
  }, []);

  const cashOut = useCallback(() => {
    const state = stateRef.current;
    if (state.status !== "safe" || state.level < 1) return;
    state.result = state.stake * multForLevel(state.level);
    state.status = "cashed";
    holdingRef.current = false;
    onAdjustBalance(state.result);
  }, [onAdjustBalance]);

  useEffect(() => {
    const loop = (now: number) => {
      const dt = Math.min(0.035, (now - lastRef.current) / 1000);
      lastRef.current = now;
      const canvas = canvasRef.current;
      if (canvas) {
        const r = canvas.getBoundingClientRect();
        update(stateRef.current, dt, holdingRef.current, r.width);
        draw(canvas, stateRef.current);
      }
      const s = stateRef.current;
      setHud({
        status: s.status,
        level: s.level,
        multiplier: multForLevel(s.level),
        cashout: s.stake * multForLevel(s.level),
        nextMultiplier: multForLevel(s.level + 1),
        result: s.result,
      });
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      event.preventDefault();
      if (event.repeat) return;
      const status = stateRef.current.status;
      if (status === "ready" || status === "dead" || status === "cashed") {
        startRun();
        return;
      }
      if (status === "safe") {
        holdingRef.current = true;
        beginCross();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      holdingRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [startRun, beginCross]);

  const pressCross = () => {
    holdingRef.current = true;
    beginCross();
  };
  const releaseCross = () => {
    holdingRef.current = false;
  };

  const canAfford = balance >= stake;
  const canCash = hud.status === "safe" && hud.level >= 1;

  return (
    <div className="single-screen">
      <header className="match-topbar">
        <button className="ghost-button" type="button" onClick={onExit}>
          <ArrowLeft size={16} /> Menu
        </button>
        <div className="match-title">
          <span className="eyebrow">Single player · Knife Crossing</span>
          <strong>Cross the checkpoints, bank the climb before a blade drops.</strong>
        </div>
        <div className="match-wallet">
          <span className="eyebrow">Balance</span>
          <strong>{formatMoney(balance)}</strong>
        </div>
      </header>

      <div className="single-layout">
        <section className="arena-column">
          <div className="single-stats">
            <Pill label="Level" value={`${hud.level + 1}`} />
            <Pill label="Multiplier" value={`${hud.multiplier.toFixed(2)}x`} accent />
            <Pill label="Cash out" value={formatMoney(hud.cashout)} />
          </div>
          <div className="arena-frame">
            <canvas
              ref={canvasRef}
              className="arena-canvas single-canvas"
              onPointerDown={() => { if (stateRef.current.status === "safe") pressCross(); }}
              onPointerUp={releaseCross}
              onPointerLeave={releaseCross}
            />

            {(hud.status === "safe" || hud.status === "crossing") && (
              <div className="single-controls">
                <button
                  className="cashout-button"
                  type="button"
                  onClick={cashOut}
                  disabled={!canCash}
                >
                  <HandCoins size={18} /> Cash out {formatMoney(hud.cashout)}
                </button>
                <button
                  className="cross-button"
                  type="button"
                  onPointerDown={pressCross}
                  onPointerUp={releaseCross}
                  onPointerLeave={releaseCross}
                  disabled={hud.status === "crossing"}
                  title="Tap to cross one checkpoint · hold to chain"
                >
                  <ArrowRight size={18} /> {hud.status === "crossing" ? "Crossing…" : `Cross → ${hud.nextMultiplier.toFixed(2)}x`}
                </button>
              </div>
            )}

            {hud.status === "ready" && (
              <div className="center-overlay">
                <Sparkles size={26} />
                <strong>Knife Crossing</strong>
                <p>
                  You start as a baby snake on level one. <b>Tap Space</b> (or the Cross button) to dash to the
                  next checkpoint — survive and your cash climbs. <b>Hold Space</b> to chain through several
                  checkpoints at once for a bigger jump. Miss the timing and a falling blade takes your head.
                  Cash out any time you're safe.
                </p>
                <div className="stake-row">
                  {stakeOptions.map((option) => (
                    <button
                      key={option}
                      className={`stake-chip ${stake === option ? "active" : ""}`}
                      type="button"
                      onClick={() => setStake(option)}
                      disabled={balance < option}
                    >
                      {formatMoney(option)}
                    </button>
                  ))}
                </div>
                <button className="primary-action wide" type="button" onClick={startRun} disabled={!canAfford}>
                  <Coins size={18} /> {canAfford ? `Stake ${formatMoney(stake)} & start` : "Insufficient balance"}
                </button>
              </div>
            )}

            {hud.status === "dead" && (
              <div className="center-overlay danger">
                <Skull size={28} />
                <strong>Chopped!</strong>
                <p>A blade dropped mid-crossing. You lost your {formatMoney(stake)} stake.</p>
                <p className="muted">Reached level {hud.level + 1} · {hud.multiplier.toFixed(2)}x</p>
                <button className="primary-action wide" type="button" onClick={startRun} disabled={!canAfford}>
                  Try again · {formatMoney(stake)}
                </button>
              </div>
            )}

            {hud.status === "cashed" && (
              <div className="center-overlay win">
                <HandCoins size={28} />
                <strong>Cashed out {formatMoney(hud.result)}</strong>
                <p className="muted">Banked at level {hud.level + 1} · {hud.multiplier.toFixed(2)}x</p>
                <button className="primary-action wide" type="button" onClick={startRun} disabled={!canAfford}>
                  Play again · {formatMoney(stake)}
                </button>
              </div>
            )}
          </div>
        </section>

        <aside className="single-side">
          <section className="panel-block">
            <div className="panel-header compact">
              <span className="eyebrow">How it works</span>
              <h2>Risk ladder</h2>
            </div>
            <ul className="howto-list">
              <li><span>1</span> Pick a stake and enter as a baby snake.</li>
              <li><span>2</span> Tap Space to cross to the next checkpoint.</li>
              <li><span>3</span> Hold Space to chain several checkpoints at once.</li>
              <li><span>4</span> Each level survived raises your cash multiplier.</li>
              <li><span>5</span> Cash out when safe — or a blade ends the run.</li>
            </ul>
          </section>
          <section className="panel-block payout-note">
            <div className="panel-header compact">
              <span className="eyebrow">Current run</span>
              <h2>{hud.multiplier.toFixed(2)}x</h2>
            </div>
            <p className="rake-note">
              Potential cash out <strong>{formatMoney(hud.cashout)}</strong>
            </p>
            <p className="rake-note">
              Next checkpoint <strong>{hud.nextMultiplier.toFixed(2)}x</strong>
            </p>
            <p className="muted small">Fake money demo — no real currency in play.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Pill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`pill ${accent ? "accent" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
