import { ArrowLeft, Play, Shirt, Trophy, Users, X, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SnakeSkinShop } from "../components/SnakeSkinShop";
import { botNames, formatCountdown, formatMoney, payoutPercents, potFor, tiers, type Tier } from "../shared";
import { equippedSummary, type Cosmetic, type EquippedCosmetics } from "../snakeSkins";

type MultiplayerLobbyProps = {
  balance: number;
  username: string;
  ownedCosmetics: string[];
  equippedCosmetics: EquippedCosmetics;
  onPurchaseCosmetic: (item: Cosmetic) => void;
  onEquipCosmetic: (item: Cosmetic) => void;
  onUnequipSlot: (category: "clothing" | "hat") => void;
  onJoin: (tier: Tier) => void;
  onExit: () => void;
};

export function MultiplayerLobby({
  balance,
  username,
  ownedCosmetics,
  equippedCosmetics,
  onPurchaseCosmetic,
  onEquipCosmetic,
  onUnequipSlot,
  onJoin,
  onExit,
}: MultiplayerLobbyProps) {
  const [clocks, setClocks] = useState<Record<string, number>>(() =>
    Object.fromEntries(tiers.map((tier) => [tier.id, tier.startsIn])),
  );
  const [selectedId, setSelectedId] = useState<string>(tiers[1].id);
  const [showForge, setShowForge] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClocks((prev) => {
        const next: Record<string, number> = {};
        for (const tier of tiers) {
          const current = prev[tier.id] ?? tier.startsIn;
          next[tier.id] = current <= 0 ? tier.startsIn : current - 1;
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const selected = useMemo(() => tiers.find((tier) => tier.id === selectedId) ?? tiers[1], [selectedId]);
  const selectedPool = potFor(selected);
  const topPrize = selectedPool * payoutPercents[0];
  const canAfford = balance >= selected.buyIn;
  const playersOnline = useMemo(() => tiers.reduce((sum, tier) => sum + tier.registered, 0), []);

  // Faux live winners feed — pure flavor, makes the lobby feel alive like Stake/Roobet.
  const winners = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const tier = tiers[(i * 2 + 1) % tiers.length];
      const amount = potFor(tier) * payoutPercents[i % 3];
      return { name: botNames[(i * 5 + 3) % botNames.length], amount };
    });
  }, []);

  return (
    <div className="lobby-screen">
      <header className="lobby-topbar">
        <button className="ghost-button" type="button" onClick={onExit}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="lobby-live-status">
          <span className="live-dot" aria-hidden />
          <strong>{playersOnline.toLocaleString()}</strong> snakes in the arena
        </div>
        <div className="lobby-topbar-actions">
          <button className="forge-toggle" type="button" onClick={() => setShowForge(true)}>
            <Shirt size={16} /> Skins
          </button>
          <div className="wallet-readout">
            <span>Balance</span>
            <strong>{formatMoney(balance)}</strong>
          </div>
        </div>
      </header>

      <div className="winner-ticker" aria-hidden>
        <div className="winner-track">
          {[...winners, ...winners].map((w, i) => (
            <span key={i} className="winner-chip">
              <Trophy size={11} /> {w.name} cashed <strong>{formatMoney(w.amount)}</strong>
            </span>
          ))}
        </div>
      </div>

      <div className="lobby-layout-premium">
        <section className="arena-list">
          {tiers.map((tier) => {
            const startsIn = clocks[tier.id] ?? tier.startsIn;
            const pool = potFor(tier);
            const active = tier.id === selectedId;
            const fill = Math.round((tier.registered / tier.seats) * 100);
            const live = startsIn <= 12;
            return (
              <button
                key={tier.id}
                type="button"
                className={`arena-card ${active ? "active" : ""}`}
                onClick={() => setSelectedId(tier.id)}
              >
                <div className="arena-card-main">
                  <span className={`arena-badge ${live ? "live" : ""}`}>
                    {live ? <><span className="live-dot" /> LIVE</> : <>{formatCountdown(startsIn)}</>}
                  </span>
                  <div className="arena-card-name">
                    <strong>{tier.name}</strong>
                    <small><Users size={12} /> {tier.registered}/{tier.seats} snakes</small>
                  </div>
                </div>
                <div className="arena-card-fill">
                  <i style={{ width: `${fill}%` }} />
                </div>
                <div className="arena-card-stats">
                  <span className="arena-buyin">{formatMoney(tier.buyIn)}<small>entry</small></span>
                  <span className="arena-pool">{formatMoney(pool)}<small>prize pool</small></span>
                </div>
              </button>
            );
          })}
        </section>

        <aside className="join-panel">
          <div className="join-head">
            <span className="join-label">Selected arena</span>
            <h2>{selected.name}</h2>
          </div>

          <div className="join-pool">
            <span>Prize pool</span>
            <strong>{formatMoney(selectedPool)}</strong>
            <small>Top prize {formatMoney(topPrize)}</small>
          </div>

          <div className="join-meta">
            <div>
              <span>Entry</span>
              <strong>{formatMoney(selected.buyIn)}</strong>
            </div>
            <div>
              <span>Field</span>
              <strong>{selected.registered}/{selected.seats}</strong>
            </div>
            <div>
              <span>Paid spots</span>
              <strong>Top {payoutPercents.length}</strong>
            </div>
          </div>

          <div className="join-payouts">
            {payoutPercents.slice(0, 6).map((percent, index) => (
              <div key={percent} className={index === 0 ? "first" : ""}>
                <span>{index + 1}{index === 0 ? "st" : index === 1 ? "nd" : index === 2 ? "rd" : "th"}</span>
                <strong>{formatMoney(selectedPool * percent)}</strong>
              </div>
            ))}
          </div>

          <button
            className="join-button"
            type="button"
            onClick={() => onJoin(selected)}
            disabled={!canAfford}
          >
            {canAfford ? (
              <><Play size={18} fill="currentColor" /> Join Arena · {formatMoney(selected.buyIn)}</>
            ) : (
              <>Not enough balance</>
            )}
          </button>

          <p className="join-snake">
            <Zap size={12} /> Your snake: <strong>{equippedSummary(equippedCosmetics)}</strong>
          </p>
        </aside>
      </div>

      {showForge && (
        <div className="forge-overlay" role="dialog" aria-modal="true" aria-label="Snake skins">
          <div className="forge-backdrop" onClick={() => setShowForge(false)} aria-hidden />
          <div className="forge-panel">
            <div className="forge-head">
              <div>
                <span className="join-label">Customize</span>
                <h2>Snake skins</h2>
              </div>
              <button className="ghost-button" type="button" onClick={() => setShowForge(false)} aria-label="Close">
                <X size={16} /> Close
              </button>
            </div>
            <SnakeSkinShop
              balance={balance}
              owned={ownedCosmetics}
              equipped={equippedCosmetics}
              onPurchase={onPurchaseCosmetic}
              onEquip={onEquipCosmetic}
              onUnequip={onUnequipSlot}
            />
          </div>
        </div>
      )}
    </div>
  );
}
