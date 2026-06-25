import { Crown, Flame, Radio, Trophy } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { botNames, formatMoney, rand, type BetRecord } from "../shared";

type Tab = "all" | "best" | "ranks";

type FeedBet = {
  id: string;
  name: string;
  isYou: boolean;
  label: string;
  stake: number;
  multiplier: number;
  payout: number;
  outcome: "win" | "loss";
  time: number;
};

const diffLabels = ["Easy", "Medium", "Hard", "Extreme"];
const stakeChoices = [0.5, 1, 2, 5, 10, 25, 50, 100, 250];

function makeBotBet(): FeedBet {
  const stake = stakeChoices[Math.floor(Math.random() * stakeChoices.length)];
  const win = Math.random() > 0.46;
  const multiplier = win ? Number(rand(1.1, 9).toFixed(2)) : 0;
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: botNames[Math.floor(Math.random() * botNames.length)],
    isYou: false,
    label: diffLabels[Math.floor(Math.random() * diffLabels.length)],
    stake,
    multiplier,
    payout: win ? stake * multiplier : 0,
    outcome: win ? "win" : "loss",
    time: Date.now(),
  };
}

export function LiveBoard({ bets }: { bets: BetRecord[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [feed, setFeed] = useState<FeedBet[]>(() => Array.from({ length: 12 }, makeBotBet));
  const seenIds = useRef(new Set<number>());

  useEffect(() => {
    const id = window.setInterval(() => {
      setFeed((prev) => [makeBotBet(), ...prev].slice(0, 40));
    }, 1900);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const fresh = bets.filter((b) => !seenIds.current.has(b.id));
    if (fresh.length === 0) return;
    fresh.forEach((b) => seenIds.current.add(b.id));
    setFeed((prev) => [
      ...fresh.map((b) => ({
        id: `you-${b.id}`,
        name: "You",
        isYou: true,
        label: b.label.replace("Cave Run · ", ""),
        stake: b.stake,
        multiplier: b.multiplier ?? 0,
        payout: b.payout,
        outcome: b.outcome,
        time: b.time,
      })),
      ...prev,
    ].slice(0, 40));
  }, [bets]);

  const myBest = useMemo(
    () => bets.filter((b) => b.outcome === "win").sort((a, b) => b.payout - a.payout).slice(0, 8),
    [bets],
  );

  const ranks = useMemo(() => {
    const seeded = [
      { name: "OmegaSeat", amount: 18420 },
      { name: "MoonSnake", amount: 12090 },
      { name: "GoldFang", amount: 9655 },
      { name: "RakeKing", amount: 7240 },
      { name: "NeonTilt", amount: 5980 },
      { name: "ViperDesk", amount: 4410 },
      { name: "BadBeat", amount: 3320 },
      { name: "CopperRun", amount: 2615 },
    ];
    const best = bets.filter((b) => b.outcome === "win").sort((a, b) => b.payout - a.payout)[0];
    const list = best ? [...seeded, { name: "You", amount: best.payout }] : seeded;
    return list.sort((a, b) => b.amount - a.amount).slice(0, 9);
  }, [bets]);

  return (
    <div className="liveboard">
      <div className="liveboard-tabs">
        <button className={tab === "all" ? "active" : ""} type="button" onClick={() => setTab("all")}>
          <Radio size={13} /> All bets
        </button>
        <button className={tab === "best" ? "active" : ""} type="button" onClick={() => setTab("best")}>
          <Flame size={13} /> My best
        </button>
        <button className={tab === "ranks" ? "active" : ""} type="button" onClick={() => setTab("ranks")}>
          <Trophy size={13} /> Rankings
        </button>
      </div>

      {tab === "all" && (
        <ul className="lb-feed">
          {feed.map((f) => (
            <li key={f.id} className={f.isYou ? "you" : ""}>
              <span className="lb-name">{f.name}</span>
              <span className="lb-mid">{f.outcome === "win" ? `${f.multiplier.toFixed(2)}x` : "bust"}</span>
              <span className={`lb-amt ${f.outcome}`}>
                {f.outcome === "win" ? formatMoney(f.payout) : `-${formatMoney(f.stake)}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {tab === "best" && (
        myBest.length === 0 ? (
          <div className="lb-empty">
            <Flame size={24} />
            <p>Your biggest cash-outs land here. Go bank one.</p>
          </div>
        ) : (
          <ul className="lb-feed">
            {myBest.map((b) => (
              <li key={b.id} className="you">
                <span className="lb-name">{b.label.replace("Cave Run · ", "")}</span>
                <span className="lb-mid">{(b.multiplier ?? 0).toFixed(2)}x</span>
                <span className="lb-amt win">{formatMoney(b.payout)}</span>
              </li>
            ))}
          </ul>
        )
      )}

      {tab === "ranks" && (
        <ul className="lb-ranks">
          {ranks.map((r, i) => (
            <li key={`${r.name}-${i}`} className={r.name === "You" ? "you" : ""}>
              <span className={`lb-rank r${i + 1}`}>{i === 0 ? <Crown size={13} /> : i + 1}</span>
              <span className="lb-name">{r.name}</span>
              <span className="lb-amt win">{formatMoney(r.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
