import {
  Activity,
  BadgeDollarSign,
  Bot,
  Crown,
  Gauge,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TierId = "micro" | "standard" | "mid" | "high" | "vip";
type Phase = "lobby" | "countdown" | "live" | "complete";

type Tier = {
  id: TierId;
  name: string;
  buyIn: number;
  rake: number;
  seats: number;
  startsIn: string;
  intensity: string;
};

type Dot = {
  id: number;
  x: number;
  y: number;
  value: number;
  radius: number;
  kind: "cash" | "gold" | "boost";
};

type Segment = {
  x: number;
  y: number;
};

type Snake = {
  id: string;
  name: string;
  color: string;
  accent: string;
  isHuman: boolean;
  alive: boolean;
  x: number;
  y: number;
  angle: number;
  targetAngle: number;
  speed: number;
  length: number;
  banked: number;
  kills: number;
  rank: number;
  segments: Segment[];
  aiTurnAt: number;
  boost: number;
  shield: number;
};

type Snapshot = {
  phase: Phase;
  countdown: number;
  field: number;
  alive: number;
  elapsed: number;
  safeRadius: number;
  humanAlive: boolean;
  humanRank: number;
  humanBanked: number;
  humanKills: number;
  leaderboard: Array<{
    id: string;
    name: string;
    banked: number;
    kills: number;
    alive: boolean;
    rank: number;
    isHuman: boolean;
  }>;
  eventText: string;
  lastPayouts: Array<{ name: string; amount: number; place: number }>;
};

type GameState = {
  snakes: Snake[];
  dots: Dot[];
  phase: Phase;
  countdown: number;
  elapsed: number;
  safeRadius: number;
  finalTableAnnounced: boolean;
  finishedAt: number | null;
  eventText: string;
  lastPayouts: Array<{ name: string; amount: number; place: number }>;
  nextDotId: number;
};

const tiers: Tier[] = [
  { id: "micro", name: "Micro Rush", buyIn: 0.5, rake: 0.1, seats: 72, startsIn: "00:08", intensity: "Fast fill" },
  { id: "standard", name: "Standard Main", buyIn: 5, rake: 0.08, seats: 96, startsIn: "02:00", intensity: "Most liquid" },
  { id: "mid", name: "Mid-Stakes Coil", buyIn: 25, rake: 0.06, seats: 84, startsIn: "12:30", intensity: "Sharp field" },
  { id: "high", name: "High-Stakes Apex", buyIn: 100, rake: 0.05, seats: 64, startsIn: "27:00", intensity: "Predator pool" },
  { id: "vip", name: "VIP Whale", buyIn: 500, rake: 0.04, seats: 42, startsIn: "55:00", intensity: "Invite line" },
];

const payoutPercents = [0.42, 0.24, 0.14, 0.09, 0.065, 0.045];
const arenaRadius = 3300;
const baseDotCount = 980;
const colors = [
  ["#00d5ff", "#c8f7ff"],
  ["#ff4f9a", "#ffd1e5"],
  ["#58e271", "#d5ffdf"],
  ["#ffd447", "#fff3b0"],
  ["#9b7bff", "#e2d7ff"],
  ["#ff7b36", "#ffe0c8"],
  ["#2df6b4", "#c8ffef"],
  ["#ef5cff", "#ffd3ff"],
];

const botNames = [
  "Bankroll", "ViperDesk", "Rakeback", "NeonTilt", "FinalSix", "PotPilot", "AceCoil", "BubbleBoy",
  "ChipTrail", "MoonSnake", "RiskUnit", "OmegaSeat", "Railbird", "StackTrap", "GoldFang", "FastFold",
  "Orbit", "BlueLine", "DustVault", "EdgeLord", "SeatOpen", "NitroRay", "BadBeat", "CopperRun",
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function distance(a: Segment, b: Segment) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointInArena() {
  const r = Math.sqrt(Math.random()) * (arenaRadius - 220);
  const t = rand(0, Math.PI * 2);
  return { x: Math.cos(t) * r, y: Math.sin(t) * r };
}

function turnToward(current: number, target: number, maxTurn: number) {
  let diff = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  diff = Math.max(-maxTurn, Math.min(maxTurn, diff));
  return current + diff;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
}

function potFor(tier: Tier) {
  return tier.buyIn * tier.seats * (1 - tier.rake);
}

function createDot(id: number, prizePool: number): Dot {
  const pos = pointInArena();
  const roll = Math.random();
  const kind: Dot["kind"] = roll > 0.985 ? "boost" : roll > 0.94 ? "gold" : "cash";
  const unit = prizePool / baseDotCount;
  return {
    id,
    ...pos,
    value: kind === "gold" ? unit * rand(2.4, 4.8) : kind === "boost" ? unit * 0.2 : unit * rand(0.45, 1.25),
    radius: kind === "gold" ? rand(8, 12) : kind === "boost" ? 11 : rand(4, 7),
    kind,
  };
}

function createSnake(id: string, name: string, isHuman: boolean, index: number): Snake {
  const pos = pointInArena();
  const [color, accent] = colors[index % colors.length];
  const angle = rand(0, Math.PI * 2);
  return {
    id,
    name,
    isHuman,
    color,
    accent,
    alive: true,
    x: pos.x,
    y: pos.y,
    angle,
    targetAngle: angle,
    speed: isHuman ? 228 : rand(168, 214),
    length: isHuman ? 30 : rand(19, 31),
    banked: 0,
    kills: 0,
    rank: 0,
    segments: Array.from({ length: 18 }, (_, i) => ({
      x: pos.x - Math.cos(angle) * i * 13,
      y: pos.y - Math.sin(angle) * i * 13,
    })),
    aiTurnAt: rand(0.1, 2.2),
    boost: 0,
    shield: isHuman ? 18 : 7,
  };
}

function createGame(tier: Tier): GameState {
  const snakes = [
    createSnake("you", "You", true, 0),
    ...Array.from({ length: tier.seats - 1 }, (_, i) => {
      const baseName = botNames[i % botNames.length];
      const table = Math.floor(i / botNames.length) + 1;
      return createSnake(`bot-${i}`, table === 1 ? baseName : `${baseName} ${table}`, false, i + 1);
    }),
  ];
  const prizePool = potFor(tier);
  return {
    snakes,
    dots: Array.from({ length: baseDotCount }, (_, i) => createDot(i, prizePool)),
    phase: "lobby",
    countdown: 3,
    elapsed: 0,
    safeRadius: arenaRadius,
    finalTableAnnounced: false,
    finishedAt: null,
    eventText: "Choose a table and enter the arena.",
    lastPayouts: [],
    nextDotId: baseDotCount + 1,
  };
}

function settleRanks(snakes: Snake[]) {
  const alive = snakes.filter((snake) => snake.alive).sort((a, b) => b.banked - a.banked);
  const eliminated = snakes.filter((snake) => !snake.alive).sort((a, b) => b.rank - a.rank);
  alive.forEach((snake, index) => {
    snake.rank = index + 1;
  });
  eliminated.forEach((snake, index) => {
    if (!snake.rank) {
      snake.rank = alive.length + index + 1;
    }
  });
}

function buildSnapshot(game: GameState): Snapshot {
  const alive = game.snakes.filter((snake) => snake.alive).length;
  const human = game.snakes.find((snake) => snake.isHuman);
  const leaderboard = [...game.snakes]
    .sort((a, b) => (a.alive === b.alive ? b.banked - a.banked : Number(b.alive) - Number(a.alive)))
    .slice(0, 10)
    .map((snake) => ({
      id: snake.id,
      name: snake.name,
      banked: snake.banked,
      kills: snake.kills,
      alive: snake.alive,
      rank: snake.rank || game.snakes.length,
      isHuman: snake.isHuman,
    }));

  return {
    phase: game.phase,
    countdown: game.countdown,
    field: game.snakes.length,
    alive,
    elapsed: game.elapsed,
    safeRadius: game.safeRadius,
    humanAlive: human?.alive ?? false,
    humanRank: human?.rank || 1,
    humanBanked: human?.banked ?? 0,
    humanKills: human?.kills ?? 0,
    leaderboard,
    eventText: game.eventText,
    lastPayouts: game.lastPayouts,
  };
}

function updateGame(game: GameState, tier: Tier, dt: number, pointer: Segment | null, boosting: boolean) {
  if (game.phase === "countdown") {
    game.countdown -= dt;
    if (game.countdown <= 0) {
      game.phase = "live";
      game.eventText = "Match live. Eat value dots, trap opponents, survive the bubble.";
    }
    return;
  }

  if (game.phase !== "live") return;

  game.elapsed += dt;
  const prizePool = potFor(tier);
  const aliveSnakes = game.snakes.filter((snake) => snake.alive);
  const aliveCount = aliveSnakes.length;

  if (aliveCount <= 6 && !game.finalTableAnnounced) {
    game.finalTableAnnounced = true;
    game.eventText = "In the money: six snakes remain. Payout ladder is active.";
  }

  const shrinkStart = tier.seats > 70 ? 55 : 38;
  if (game.elapsed > shrinkStart && aliveCount > 1) {
    game.safeRadius = Math.max(760, arenaRadius - (game.elapsed - shrinkStart) * 12);
  }

  for (const snake of aliveSnakes) {
    snake.shield = Math.max(0, snake.shield - dt);
    if (snake.isHuman && pointer) {
      snake.targetAngle = Math.atan2(pointer.y - snake.y, pointer.x - snake.x);
    } else if (!snake.isHuman) {
      snake.aiTurnAt -= dt;
      if (snake.aiTurnAt <= 0) {
        const bestDot = game.dots
          .filter((dot) => Math.hypot(dot.x - snake.x, dot.y - snake.y) < 720)
          .sort((a, b) => b.value / Math.max(1, distance(snake, b)) - a.value / Math.max(1, distance(snake, a)))[0];
        const awayFromWall = Math.hypot(snake.x, snake.y) > game.safeRadius - 280;
        snake.targetAngle = awayFromWall
          ? Math.atan2(-snake.y, -snake.x) + rand(-0.25, 0.25)
          : bestDot
            ? Math.atan2(bestDot.y - snake.y, bestDot.x - snake.x) + rand(-0.18, 0.18)
            : snake.targetAngle + rand(-0.9, 0.9);
        snake.aiTurnAt = rand(0.36, 1.15);
      }
    }

    const boostActive = (snake.isHuman && boosting) || snake.boost > 0;
    if (snake.boost > 0) snake.boost -= dt;
    snake.angle = turnToward(snake.angle, snake.targetAngle, dt * (boostActive ? 3.1 : 2.35));
    const massPenalty = Math.min(0.34, snake.length / 620);
    const velocity = snake.speed * (boostActive ? 1.55 : 1) * (1 - massPenalty);
    snake.x += Math.cos(snake.angle) * velocity * dt;
    snake.y += Math.sin(snake.angle) * velocity * dt;
    snake.segments.unshift({ x: snake.x, y: snake.y });
    const wantedSegments = Math.max(18, Math.floor(snake.length));
    while (snake.segments.length > wantedSegments) snake.segments.pop();

    const outside = Math.hypot(snake.x, snake.y) > game.safeRadius;
    if (outside) {
      snake.banked = Math.max(0, snake.banked - prizePool * 0.0008 * dt);
      snake.targetAngle = Math.atan2(-snake.y, -snake.x);
      if (Math.hypot(snake.x, snake.y) > game.safeRadius + 110) {
        eliminateSnake(game, snake, null, tier);
      }
    }
  }

  for (const snake of game.snakes.filter((s) => s.alive)) {
    for (let i = game.dots.length - 1; i >= 0; i -= 1) {
      const dot = game.dots[i];
      if (Math.hypot(snake.x - dot.x, snake.y - dot.y) < 18 + dot.radius) {
        snake.banked += dot.value;
        snake.length += dot.kind === "boost" ? 1.5 : dot.kind === "gold" ? 2.8 : 0.85;
        if (dot.kind === "boost") snake.boost = 2.8;
        game.dots.splice(i, 1);
        if (game.dots.length < baseDotCount * 0.92) {
          game.dots.push(createDot(game.nextDotId++, prizePool));
        }
      }
    }
  }

  const living = game.snakes.filter((snake) => snake.alive);
  for (const snake of living) {
    for (const other of living) {
      if (snake.id === other.id) continue;
      if (snake.shield > 0 || other.shield > 0) continue;
      if (game.elapsed < 14 && !snake.isHuman && !other.isHuman) continue;
      if (game.elapsed < 10 && (snake.isHuman || other.isHuman)) continue;
      const start = snake.id === other.id ? 14 : 5;
      for (let i = start; i < other.segments.length; i += 1) {
        const segment = other.segments[i];
        if (Math.hypot(snake.x - segment.x, snake.y - segment.y) < 10.5) {
          eliminateSnake(game, snake, snake.id === other.id ? null : other, tier);
          break;
        }
      }
      if (!snake.alive) break;
    }
  }

  if (Math.random() < dt * 2.4 && game.dots.length < baseDotCount * 1.1) {
    game.dots.push(createDot(game.nextDotId++, prizePool));
  }

  settleRanks(game.snakes);
  const survivors = game.snakes.filter((snake) => snake.alive);
  if (survivors.length === 1) {
    completeGame(game, tier);
  }
}

function eliminateSnake(game: GameState, snake: Snake, killer: Snake | null, tier: Tier) {
  if (!snake.alive) return;
  snake.alive = false;
  snake.rank = game.snakes.filter((s) => s.alive).length + 1;
  if (killer) killer.kills += 1;

  const drops = Math.min(70, Math.max(18, Math.floor(snake.length * 0.8)));
  const valuePerDrop = snake.banked / drops;
  for (let i = 0; i < drops; i += 1) {
    const base = snake.segments[Math.min(snake.segments.length - 1, Math.floor((i / drops) * snake.segments.length))] ?? snake;
    game.dots.push({
      id: game.nextDotId++,
      x: base.x + rand(-42, 42),
      y: base.y + rand(-42, 42),
      value: valuePerDrop * rand(0.75, 1.35),
      radius: rand(5, 10),
      kind: i % 8 === 0 ? "gold" : "cash",
    });
  }
  const name = snake.isHuman ? "You were eliminated" : `${snake.name} busted`;
  game.eventText = killer ? `${name} by ${killer.name}. ${game.snakes.filter((s) => s.alive).length} remain.` : `${name} outside the ring.`;

  if (game.snakes.filter((s) => s.alive).length === 1) {
    completeGame(game, tier);
  }
}

function completeGame(game: GameState, tier: Tier) {
  if (game.phase === "complete") return;
  settleRanks(game.snakes);
  const sorted = [...game.snakes].sort((a, b) => a.rank - b.rank || b.banked - a.banked);
  const prizePool = potFor(tier);
  game.lastPayouts = sorted.slice(0, 6).map((snake, index) => ({
    name: snake.name,
    place: index + 1,
    amount: prizePool * payoutPercents[index],
  }));
  game.phase = "complete";
  game.finishedAt = game.elapsed;
  game.eventText = `${sorted[0].name} wins ${money.format(prizePool * payoutPercents[0])}.`;
}

function drawArena(canvas: HTMLCanvasElement, game: GameState, snapshot: Snapshot) {
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

  const human = game.snakes.find((snake) => snake.isHuman);
  const camera = human?.alive ? human : game.snakes.find((snake) => snake.alive) ?? human;
  const scale = Math.min(rect.width, rect.height) / 1060;
  const cx = rect.width / 2;
  const cy = rect.height / 2;

  const worldToScreen = (p: Segment) => ({
    x: cx + (p.x - (camera?.x ?? 0)) * scale,
    y: cy + (p.y - (camera?.y ?? 0)) * scale,
  });

  const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
  gradient.addColorStop(0, "#071014");
  gradient.addColorStop(0.52, "#10151d");
  gradient.addColorStop(1, "#0a110f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, rect.width, rect.height);

  ctx.save();
  const arenaCenter = worldToScreen({ x: 0, y: 0 });
  ctx.beginPath();
  ctx.arc(arenaCenter.x, arenaCenter.y, arenaRadius * scale, 0, Math.PI * 2);
  ctx.fillStyle = "#0b1416";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(114, 255, 217, 0.16)";
  ctx.stroke();

  const gridStep = 180;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  for (let x = -arenaRadius; x <= arenaRadius; x += gridStep) {
    const top = worldToScreen({ x, y: -arenaRadius });
    const bottom = worldToScreen({ x, y: arenaRadius });
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.stroke();
  }
  for (let y = -arenaRadius; y <= arenaRadius; y += gridStep) {
    const left = worldToScreen({ x: -arenaRadius, y });
    const right = worldToScreen({ x: arenaRadius, y });
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.stroke();
  }

  if (snapshot.phase === "live" || snapshot.phase === "complete") {
    ctx.beginPath();
    ctx.arc(arenaCenter.x, arenaCenter.y, game.safeRadius * scale, 0, Math.PI * 2);
    ctx.strokeStyle = game.finalTableAnnounced ? "rgba(255, 211, 71, 0.75)" : "rgba(0, 213, 255, 0.55)";
    ctx.shadowColor = game.finalTableAnnounced ? "#ffd447" : "#00d5ff";
    ctx.shadowBlur = 14;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  for (const dot of game.dots) {
    const p = worldToScreen(dot);
    if (p.x < -20 || p.y < -20 || p.x > rect.width + 20 || p.y > rect.height + 20) continue;
    const radius = Math.max(2, dot.radius * scale);
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = dot.kind === "gold" ? "#ffd447" : dot.kind === "boost" ? "#f464ff" : "#63ffe0";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = dot.kind === "cash" ? 8 : 16;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  const snakes = [...game.snakes].sort((a, b) => Number(a.isHuman) - Number(b.isHuman));
  for (const snake of snakes) {
    if (!snake.alive && snapshot.phase !== "complete") continue;
    const alpha = snake.alive ? 1 : 0.28;
    ctx.globalAlpha = alpha;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = snake.segments.length - 1; i > 0; i -= 1) {
      const a = worldToScreen(snake.segments[i]);
      const b = worldToScreen(snake.segments[i - 1]);
      const widthAtSegment = Math.max(5, (19 - i * 0.1) * scale);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = snake.color;
      ctx.lineWidth = widthAtSegment;
      ctx.shadowColor = snake.color;
      ctx.shadowBlur = snake.isHuman ? 16 : 8;
      ctx.stroke();
    }
    const head = worldToScreen(snake);
    ctx.shadowBlur = 18;
    ctx.fillStyle = snake.accent;
    ctx.beginPath();
    ctx.arc(head.x, head.y, 16 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#071014";
    ctx.beginPath();
    ctx.arc(head.x + Math.cos(snake.angle + 0.5) * 7 * scale, head.y + Math.sin(snake.angle + 0.5) * 7 * scale, 2.6 * scale, 0, Math.PI * 2);
    ctx.arc(head.x + Math.cos(snake.angle - 0.5) * 7 * scale, head.y + Math.sin(snake.angle - 0.5) * 7 * scale, 2.6 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (snapshot.phase === "countdown") {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 92px Inter, system-ui";
    ctx.textAlign = "center";
    ctx.fillText(Math.max(1, Math.ceil(snapshot.countdown)).toString(), cx, cy + 30);
  }

  if (snapshot.phase === "complete") {
    ctx.fillStyle = "rgba(2,8,10,0.62)";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#ffd447";
    ctx.font = "800 44px Inter, system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Tournament Complete", cx, cy - 18);
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 18px Inter, system-ui";
    ctx.fillText(game.eventText, cx, cy + 22);
  }
  ctx.restore();
}

export function App() {
  const [selectedTierId, setSelectedTierId] = useState<TierId>("standard");
  const selectedTier = useMemo(() => tiers.find((tier) => tier.id === selectedTierId) ?? tiers[1], [selectedTierId]);
  const [snapshot, setSnapshot] = useState<Snapshot>(() => buildSnapshot(createGame(selectedTier)));
  const gameRef = useRef<GameState>(createGame(selectedTier));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef<Segment | null>(null);
  const boostRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const lastRef = useRef<number>(performance.now());

  const resetGame = useCallback((tier = selectedTier, autoCountdown = false) => {
    const game = createGame(tier);
    if (autoCountdown) {
      game.phase = "countdown";
      game.eventText = "Seats locked. Match starts now.";
    }
    gameRef.current = game;
    setSnapshot(buildSnapshot(game));
  }, [selectedTier]);

  useEffect(() => {
    resetGame(selectedTier, false);
  }, [selectedTier, resetGame]);

  useEffect(() => {
    const loop = (now: number) => {
      const dt = Math.min(0.035, (now - lastRef.current) / 1000);
      lastRef.current = now;
      updateGame(gameRef.current, selectedTier, dt, pointerRef.current, boostRef.current);
      const nextSnapshot = buildSnapshot(gameRef.current);
      setSnapshot(nextSnapshot);
      if (canvasRef.current) drawArena(canvasRef.current, gameRef.current, nextSnapshot);
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [selectedTier]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        boostRef.current = event.type === "keydown";
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  const handlePointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const human = gameRef.current.snakes.find((snake) => snake.isHuman);
    if (!canvas || !human) return;
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width, rect.height) / 1060;
    pointerRef.current = {
      x: human.x + (event.clientX - rect.left - rect.width / 2) / scale,
      y: human.y + (event.clientY - rect.top - rect.height / 2) / scale,
    };
  };

  const prizePool = potFor(selectedTier);
  const houseTake = selectedTier.buyIn * selectedTier.seats * selectedTier.rake;
  const isLive = snapshot.phase === "live" || snapshot.phase === "countdown";
  const playerPayout = snapshot.lastPayouts.find((payout) => payout.name === "You");

  return (
    <main className="app-shell">
      <section className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><BadgeDollarSign size={28} /></div>
          <div>
            <span className="eyebrow">Skill-prize arena</span>
            <h1>SlitherBet</h1>
          </div>
        </div>
        <div className="top-stats">
          <Stat icon={<Users size={17} />} label="Field" value={`${snapshot.alive}/${snapshot.field}`} />
          <Stat icon={<Shield size={17} />} label="Rake" value={`${Math.round(selectedTier.rake * 100)}%`} />
          <Stat icon={<Trophy size={17} />} label="Prize pool" value={money.format(prizePool)} />
        </div>
      </section>

      <section className="layout">
        <aside className="lobby-panel">
          <div className="panel-header">
            <span className="eyebrow">Lobby board</span>
            <h2>Buy-in tables</h2>
          </div>
          <div className="entry-ticket">
            <div>
              <span className="eyebrow">Selected table</span>
              <h3>{selectedTier.name}</h3>
            </div>
            <dl>
              <div><dt>Buy-in</dt><dd>{money.format(selectedTier.buyIn)}</dd></div>
              <div><dt>Net pot</dt><dd>{money.format(prizePool)}</dd></div>
              <div><dt>House rake</dt><dd>{money.format(houseTake)}</dd></div>
            </dl>
            <button className="primary-action" type="button" onClick={() => resetGame(selectedTier, true)} disabled={isLive}>
              <Play size={18} /> Enter table
            </button>
          </div>
          <div className="tier-list">
            {tiers.map((tier) => {
              const active = tier.id === selectedTierId;
              return (
                <button
                  className={`tier-card ${active ? "active" : ""}`}
                  key={tier.id}
                  onClick={() => setSelectedTierId(tier.id)}
                  type="button"
                  disabled={isLive}
                >
                  <span>
                    <strong>{tier.name}</strong>
                    <small>{tier.seats} seats · starts {tier.startsIn}</small>
                  </span>
                  <span className="tier-price">{money.format(tier.buyIn)}</span>
                  <span className="tier-meta">{tier.intensity}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="arena-column">
          <div className="arena-toolbar">
            <div>
              <span className="eyebrow">Live arena</span>
              <h2>{snapshot.eventText}</h2>
            </div>
            <div className="toolbar-actions">
              <button
                className={`boost-button ${boostRef.current ? "active" : ""}`}
                onPointerDown={() => { boostRef.current = true; }}
                onPointerUp={() => { boostRef.current = false; }}
                onPointerLeave={() => { boostRef.current = false; }}
                type="button"
                disabled={snapshot.phase !== "live" || !snapshot.humanAlive}
                title="Hold to boost"
              >
                <Zap size={18} /> Boost
              </button>
              <button className="icon-action" type="button" onClick={() => resetGame(selectedTier, false)} title="Reset table">
                <RotateCcw size={18} />
              </button>
            </div>
          </div>
          <div className="arena-frame">
            <canvas
              ref={canvasRef}
              className="arena-canvas"
              onPointerMove={handlePointer}
              onPointerDown={handlePointer}
            />
            <div className="hud-card upper-left">
              <span>Your claim</span>
              <strong>{money.format(snapshot.humanBanked)}</strong>
              <small>{snapshot.humanAlive ? `Rank #${snapshot.humanRank}` : "Busted"}</small>
            </div>
            <div className="hud-card upper-right">
              <span>Safe ring</span>
              <strong>{Math.round((snapshot.safeRadius / arenaRadius) * 100)}%</strong>
              <small>{formatTime(snapshot.elapsed)}</small>
            </div>
            {snapshot.phase === "lobby" && (
              <div className="center-prompt">
                <Sparkles size={24} />
                <strong>Enter a table to start the demo match</strong>
                <span>Move with the pointer. Hold boost or press Space.</span>
              </div>
            )}
          </div>
        </section>

        <aside className="side-panel">
          <div className="status-grid">
            <Metric icon={<Activity />} label="Phase" value={snapshot.phase === "live" ? "Playing" : snapshot.phase} />
            <Metric icon={<Gauge />} label="Kills" value={snapshot.humanKills.toString()} />
            <Metric icon={<Crown />} label="Bubble" value={snapshot.alive <= 6 ? "Paid" : `${Math.max(0, snapshot.alive - 6)} out`} />
            <Metric icon={<Bot />} label="Bots" value={(snapshot.alive - Number(snapshot.humanAlive)).toString()} />
          </div>

          <section className="leaderboard panel-block">
            <div className="panel-header compact">
              <span className="eyebrow">Leaderboard</span>
              <h2>Top stacks</h2>
            </div>
            <ol>
              {snapshot.leaderboard.map((entry, index) => (
                <li key={entry.id} className={entry.isHuman ? "you" : ""}>
                  <span className="place">{index + 1}</span>
                  <span className="player">
                    <strong>{entry.name}</strong>
                    <small>{entry.alive ? `${entry.kills} KO` : `Out #${entry.rank}`}</small>
                  </span>
                  <span className="stack">{money.format(entry.banked)}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="payouts panel-block">
            <div className="panel-header compact">
              <span className="eyebrow">Payout ladder</span>
              <h2>Final six</h2>
            </div>
            <div className="payout-list">
              {payoutPercents.map((percent, index) => (
                <div className={playerPayout?.place === index + 1 ? "won" : ""} key={percent}>
                  <span>{index + 1}</span>
                  <strong>{money.format(prizePool * percent)}</strong>
                  <small>{Math.round(percent * 1000) / 10}%</small>
                </div>
              ))}
            </div>
            {snapshot.phase === "complete" && (
              <div className="results">
                {snapshot.lastPayouts.map((payout) => (
                  <p key={payout.place}>
                    #{payout.place} {payout.name}: <strong>{money.format(payout.amount)}</strong>
                  </p>
                ))}
              </div>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="stat">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      <span className="metric-icon">{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}
