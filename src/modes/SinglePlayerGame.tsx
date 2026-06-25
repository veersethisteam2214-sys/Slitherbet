import { ArrowLeft, Coins, HandCoins, Skull, Sparkles, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatMoney, rand, type Segment } from "../shared";

type Status = "ready" | "playing" | "dead" | "cashed";

type Knife = {
  id: number;
  x: number;
  y: number;
  vy: number;
  rot: number;
  rotSpeed: number;
  size: number;
  scored: boolean;
};

type SinglePlayerState = {
  status: Status;
  head: Segment;
  segments: Segment[];
  targetSegments: number;
  knives: Knife[];
  nextKnifeId: number;
  spawnTimer: number;
  elapsed: number;
  dodges: number;
  multiplier: number;
  stake: number;
  invincibleUntil: number;
  dashReadyAt: number;
  flashSafe: number;
  shake: number;
  result: number;
};

const stakeOptions = [1, 5, 25, 100];
const baseSegments = 16;
const growthPerDodge = 3;
const growthPerDash = 2;
const maxSegments = 140;
const segmentRadius = 9;
const multiplierStep = 0.12;
const dashInvuln = 0.42;
const dashCooldown = 0.9;

function createState(stake: number, width: number, height: number): SinglePlayerState {
  const head = { x: width / 2, y: height * 0.72 };
  return {
    status: "ready",
    head,
    segments: Array.from({ length: baseSegments }, (_, i) => ({ x: head.x, y: head.y + i * 4 })),
    targetSegments: baseSegments,
    knives: [],
    nextKnifeId: 1,
    spawnTimer: 1.1,
    elapsed: 0,
    dodges: 0,
    multiplier: 1,
    stake,
    invincibleUntil: 0,
    dashReadyAt: 0,
    flashSafe: 0,
    shake: 0,
    result: 0,
  };
}

function spawnInterval(dodges: number) {
  return Math.max(0.42, 1.05 - dodges * 0.018);
}

function knifeSpeed(dodges: number, height: number) {
  return (height * 0.55 + dodges * 9) * rand(0.85, 1.15);
}

function spawnKnife(state: SinglePlayerState, width: number, height: number) {
  const margin = width * 0.08;
  state.knives.push({
    id: state.nextKnifeId++,
    x: rand(margin, width - margin),
    y: -40,
    vy: knifeSpeed(state.dodges, height),
    rot: rand(0, Math.PI * 2),
    rotSpeed: rand(-3.5, 3.5),
    size: rand(0.85, 1.25),
    scored: false,
  });
}

function update(
  state: SinglePlayerState,
  dt: number,
  pointer: Segment | null,
  width: number,
  height: number,
) {
  if (state.flashSafe > 0) state.flashSafe = Math.max(0, state.flashSafe - dt);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
  if (state.status !== "playing") return;

  state.elapsed += dt;

  const margin = 26;
  if (pointer) {
    const follow = Math.min(1, dt * (state.elapsed < state.invincibleUntil ? 16 : 11));
    state.head.x += (pointer.x - state.head.x) * follow;
    state.head.y += (pointer.y - state.head.y) * follow;
  }
  state.head.x = Math.max(margin, Math.min(width - margin, state.head.x));
  state.head.y = Math.max(margin, Math.min(height - margin, state.head.y));

  state.segments.unshift({ x: state.head.x, y: state.head.y });
  while (state.segments.length > state.targetSegments) state.segments.pop();

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnKnife(state, width, height);
    if (state.dodges > 22 && Math.random() < 0.4) spawnKnife(state, width, height);
    state.spawnTimer = spawnInterval(state.dodges);
  }

  const invincible = state.elapsed < state.invincibleUntil;
  for (let i = state.knives.length - 1; i >= 0; i -= 1) {
    const knife = state.knives[i];
    knife.y += knife.vy * dt;
    knife.rot += knife.rotSpeed * dt;

    if (!invincible) {
      const hitRadius = 15 * knife.size + segmentRadius;
      let hit = false;
      for (let s = 0; s < state.segments.length; s += 2) {
        const seg = state.segments[s];
        if (Math.hypot(seg.x - knife.x, seg.y - knife.y) < hitRadius) {
          hit = true;
          break;
        }
      }
      if (hit) {
        state.status = "dead";
        state.shake = 0.5;
        return;
      }
    }

    if (knife.y > height + 60) {
      if (!knife.scored) registerDodge(state);
      state.knives.splice(i, 1);
    }
  }
}

function registerDodge(state: SinglePlayerState) {
  state.dodges += 1;
  state.multiplier += multiplierStep;
  state.targetSegments = Math.min(maxSegments, state.targetSegments + growthPerDodge);
  state.flashSafe = 0.5;
}

function dash(state: SinglePlayerState) {
  if (state.status !== "playing") return;
  if (state.elapsed < state.dashReadyAt) return;
  state.invincibleUntil = state.elapsed + dashInvuln;
  state.dashReadyAt = state.elapsed + dashCooldown;
  state.targetSegments = Math.min(maxSegments, state.targetSegments + growthPerDash);
  state.flashSafe = 0.35;
}

function drawKnife(ctx: CanvasRenderingContext2D, knife: Knife) {
  ctx.save();
  ctx.translate(knife.x, knife.y);
  ctx.rotate(knife.rot);
  ctx.scale(knife.size, knife.size);

  ctx.shadowColor = "rgba(255, 90, 90, 0.7)";
  ctx.shadowBlur = 16;

  const blade = ctx.createLinearGradient(0, -26, 0, 8);
  blade.addColorStop(0, "#ffffff");
  blade.addColorStop(0.5, "#cfd8e3");
  blade.addColorStop(1, "#7c8896");
  ctx.fillStyle = blade;
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.lineTo(5, 6);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#1f2630";
  ctx.fillRect(-6, 6, 12, 4);
  ctx.fillStyle = "#3a2417";
  ctx.fillRect(-3, 10, 6, 16);
  ctx.fillStyle = "#5a3a24";
  ctx.fillRect(-3, 10, 6, 5);
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

  const shakeX = state.shake > 0 ? rand(-6, 6) * (state.shake / 0.5) : 0;
  const shakeY = state.shake > 0 ? rand(-6, 6) * (state.shake / 0.5) : 0;
  ctx.save();
  ctx.translate(shakeX, shakeY);

  const bg = ctx.createLinearGradient(0, 0, 0, rect.height);
  bg.addColorStop(0, "#0c1622");
  bg.addColorStop(0.55, "#0a121a");
  bg.addColorStop(1, "#070d12");
  ctx.fillStyle = bg;
  ctx.fillRect(-20, -20, rect.width + 40, rect.height + 40);

  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  for (let y = 0; y < rect.height; y += 46) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(rect.width, y);
    ctx.stroke();
  }

  for (const knife of state.knives) drawKnife(ctx, knife);

  const invincible = state.elapsed < state.invincibleUntil;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = state.segments.length - 1; i > 0; i -= 1) {
    const a = state.segments[i];
    const b = state.segments[i - 1];
    const t = i / state.segments.length;
    const w = Math.max(5, (segmentRadius * 2) * (1 - t * 0.55));
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = invincible ? "#9be7ff" : "#63ffe0";
    ctx.lineWidth = w;
    ctx.shadowColor = invincible ? "#7cd4ff" : "#36e0bd";
    ctx.shadowBlur = 14;
    ctx.stroke();
  }

  const head = state.segments[0] ?? state.head;
  ctx.shadowBlur = 20;
  ctx.fillStyle = invincible ? "#d6f4ff" : "#aaffe9";
  ctx.beginPath();
  ctx.arc(head.x, head.y, segmentRadius + 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#06110f";
  ctx.beginPath();
  ctx.arc(head.x - 4, head.y - 3, 2.4, 0, Math.PI * 2);
  ctx.arc(head.x + 4, head.y - 3, 2.4, 0, Math.PI * 2);
  ctx.fill();

  if (invincible) {
    ctx.strokeStyle = "rgba(124, 212, 255, 0.7)";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#7cd4ff";
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(head.x, head.y, segmentRadius + 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  if (state.flashSafe > 0 && state.status === "playing") {
    ctx.globalAlpha = Math.min(1, state.flashSafe * 2.4);
    ctx.fillStyle = "#7cffd0";
    ctx.font = "800 26px 'Space Grotesk', Inter, system-ui";
    ctx.textAlign = "center";
    ctx.fillText("SAFE", head.x, head.y - 28);
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
  const stateRef = useRef<SinglePlayerState>(createState(stakeOptions[1], 800, 600));
  const pointerRef = useRef<Segment | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastRef = useRef<number>(performance.now());

  const [stake, setStake] = useState(stakeOptions[1]);
  const [hud, setHud] = useState({
    status: "ready" as Status,
    multiplier: 1,
    dodges: 0,
    cashout: 0,
    dashReady: true,
    result: 0,
  });

  const startRun = useCallback(() => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    const width = rect?.width ?? 800;
    const height = rect?.height ?? 600;
    if (balance < stake) return;
    onAdjustBalance(-stake);
    const next = createState(stake, width, height);
    next.status = "playing";
    pointerRef.current = { x: width / 2, y: height * 0.72 };
    stateRef.current = next;
  }, [balance, stake, onAdjustBalance]);

  const cashOut = useCallback(() => {
    const state = stateRef.current;
    if (state.status !== "playing") return;
    state.result = state.stake * state.multiplier;
    state.status = "cashed";
    onAdjustBalance(state.result);
  }, [onAdjustBalance]);

  const triggerDash = useCallback(() => {
    dash(stateRef.current);
  }, []);

  useEffect(() => {
    const loop = (now: number) => {
      const dt = Math.min(0.035, (now - lastRef.current) / 1000);
      lastRef.current = now;
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        update(stateRef.current, dt, pointerRef.current, rect.width, rect.height);
        draw(canvas, stateRef.current);
      }
      const s = stateRef.current;
      setHud({
        status: s.status,
        multiplier: s.multiplier,
        dodges: s.dodges,
        cashout: s.stake * s.multiplier,
        dashReady: s.elapsed >= s.dashReadyAt,
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
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        if (event.type === "keydown") {
          if (stateRef.current.status === "playing") triggerDash();
          else if (stateRef.current.status === "ready") startRun();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [triggerDash, startRun]);

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    pointerRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    handlePointerMove(event);
    if (stateRef.current.status === "playing") triggerDash();
  };

  const canAfford = balance >= stake;

  return (
    <div className="single-screen">
      <header className="match-topbar">
        <button className="ghost-button" type="button" onClick={onExit}>
          <ArrowLeft size={16} /> Menu
        </button>
        <div className="match-title">
          <span className="eyebrow">Single player · Knife Gauntlet</span>
          <strong>Dodge the blades, bank your run before it ends.</strong>
        </div>
        <div className="match-wallet">
          <span className="eyebrow">Balance</span>
          <strong>{formatMoney(balance)}</strong>
        </div>
      </header>

      <div className="single-layout">
        <section className="arena-column">
          <div className="single-stats">
            <Pill label="Multiplier" value={`${hud.multiplier.toFixed(2)}x`} accent />
            <Pill label="Cash out" value={formatMoney(hud.cashout)} />
            <Pill label="Dodges" value={hud.dodges.toString()} />
          </div>
          <div className="arena-frame">
            <canvas
              ref={canvasRef}
              className="arena-canvas"
              onPointerMove={handlePointerMove}
              onPointerDown={handlePointerDown}
            />

            {hud.status === "playing" && (
              <div className="single-cashout">
                <button className="cashout-button" type="button" onClick={cashOut}>
                  <HandCoins size={18} /> Cash out {formatMoney(hud.cashout)}
                </button>
                <button
                  className={`dash-button ${hud.dashReady ? "ready" : ""}`}
                  type="button"
                  onPointerDown={triggerDash}
                >
                  <Zap size={16} /> {hud.dashReady ? "Dash (Space)" : "Charging…"}
                </button>
              </div>
            )}

            {hud.status === "ready" && (
              <div className="center-overlay">
                <Sparkles size={26} />
                <strong>Knife Gauntlet</strong>
                <p>Move with your pointer to weave between falling knives. Every blade you survive grows your snake and lifts your multiplier. Tap <b>Dash / Space</b> for a quick shield, and cash out any time before you get hit.</p>
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
                <strong>Run over</strong>
                <p>A blade caught you. You lost your {formatMoney(stake)} stake.</p>
                <p className="muted">Survived {hud.dodges} blades · reached {hud.multiplier.toFixed(2)}x</p>
                <button className="primary-action wide" type="button" onClick={startRun} disabled={!canAfford}>
                  Try again · {formatMoney(stake)}
                </button>
              </div>
            )}

            {hud.status === "cashed" && (
              <div className="center-overlay win">
                <HandCoins size={28} />
                <strong>Cashed out {formatMoney(hud.result)}</strong>
                <p className="muted">{hud.dodges} blades dodged · {hud.multiplier.toFixed(2)}x</p>
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
              <li><span>1</span> Pick a stake and start your run.</li>
              <li><span>2</span> Steer the snake around every falling knife.</li>
              <li><span>3</span> Each blade survived raises your multiplier.</li>
              <li><span>4</span> Dash for a short shield when it gets tight.</li>
              <li><span>5</span> Cash out any time — or lose it all if you're hit.</li>
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
