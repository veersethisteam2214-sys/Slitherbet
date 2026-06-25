export type TierId = "micro" | "standard" | "mid" | "high" | "vip";
export type Phase = "lobby" | "countdown" | "live" | "complete";

export type Tier = {
  id: TierId;
  name: string;
  buyIn: number;
  rake: number;
  seats: number;
  registered: number;
  startsIn: number;
  intensity: string;
  format: string;
};

export type Segment = {
  x: number;
  y: number;
};

export type Dot = {
  id: number;
  x: number;
  y: number;
  value: number;
  radius: number;
  kind: "cash" | "gold" | "boost";
};

export type Snake = {
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

export type BetRecord = {
  id: number;
  mode: "single" | "multiplayer";
  label: string;
  stake: number;
  multiplier?: number;
  payout: number;
  outcome: "win" | "loss";
  time: number;
};

export const payoutPercents = [0.42, 0.24, 0.14, 0.09, 0.065, 0.045];
export const arenaRadius = 3300;
export const baseDotCount = 980;

export const colors: Array<[string, string]> = [
  ["#00d5ff", "#c8f7ff"],
  ["#ff4f9a", "#ffd1e5"],
  ["#58e271", "#d5ffdf"],
  ["#ffd447", "#fff3b0"],
  ["#9b7bff", "#e2d7ff"],
  ["#ff7b36", "#ffe0c8"],
  ["#2df6b4", "#c8ffef"],
  ["#ef5cff", "#ffd3ff"],
];

export const botNames = [
  "Bankroll", "ViperDesk", "Rakeback", "NeonTilt", "FinalSix", "PotPilot", "AceCoil", "BubbleBoy",
  "ChipTrail", "MoonSnake", "RiskUnit", "OmegaSeat", "Railbird", "StackTrap", "GoldFang", "FastFold",
  "Orbit", "BlueLine", "DustVault", "EdgeLord", "SeatOpen", "NitroRay", "BadBeat", "CopperRun",
];

export const tiers: Tier[] = [
  { id: "micro", name: "Micro Rush", buyIn: 0.5, rake: 0.1, seats: 72, registered: 51, startsIn: 18, intensity: "Fast fill", format: "Express" },
  { id: "standard", name: "Standard Main", buyIn: 5, rake: 0.08, seats: 96, registered: 74, startsIn: 95, intensity: "Most liquid", format: "Standard" },
  { id: "mid", name: "Mid-Stakes Coil", buyIn: 25, rake: 0.06, seats: 84, registered: 38, startsIn: 320, intensity: "Sharp field", format: "Standard" },
  { id: "high", name: "High-Stakes Apex", buyIn: 100, rake: 0.05, seats: 64, registered: 21, startsIn: 760, intensity: "Predator pool", format: "Marathon" },
  { id: "vip", name: "VIP Whale", buyIn: 500, rake: 0.04, seats: 42, registered: 9, startsIn: 1980, intensity: "Invite line", format: "Marathon" },
];

export const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatMoney(value: number) {
  return money.format(value);
}

export function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function distance(a: Segment, b: Segment) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pointInArena() {
  const r = Math.sqrt(Math.random()) * (arenaRadius - 220);
  const t = rand(0, Math.PI * 2);
  return { x: Math.cos(t) * r, y: Math.sin(t) * r };
}

export function turnToward(current: number, target: number, maxTurn: number) {
  let diff = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  diff = Math.max(-maxTurn, Math.min(maxTurn, diff));
  return current + diff;
}

export function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
}

export function formatCountdown(seconds: number) {
  if (seconds <= 0) return "Now";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
}

export function potFor(tier: Tier) {
  return tier.buyIn * tier.seats * (1 - tier.rake);
}
