import { ArrowLeft, Clock, Flame, Play, Trophy, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatCountdown, formatMoney, potFor, tiers, type Tier } from "../shared";

type MultiplayerLobbyProps = {
  balance: number;
  onJoin: (tier: Tier) => void;
  onExit: () => void;
};

export function MultiplayerLobby({ balance, onJoin, onExit }: MultiplayerLobbyProps) {
  const [clocks, setClocks] = useState<Record<string, number>>(() =>
    Object.fromEntries(tiers.map((tier) => [tier.id, tier.startsIn])),
  );
  const [selectedId, setSelectedId] = useState<string>(tiers[1].id);

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
  const canAfford = balance >= selected.buyIn;

  return (
    <div className="lobby-screen">
      <header className="match-topbar">
        <button className="ghost-button" type="button" onClick={onExit}>
          <ArrowLeft size={16} /> Menu
        </button>
        <div className="match-title">
          <span className="eyebrow">Multiplayer · Tournament lobby</span>
          <strong>Register for a table and outlast the field.</strong>
        </div>
        <div className="match-wallet">
          <span className="eyebrow">Balance</span>
          <strong>{formatMoney(balance)}</strong>
        </div>
      </header>

      <div className="lobby-layout">
        <section className="lobby-table-wrap">
          <div className="lobby-table-head">
            <span>Tournament</span>
            <span>Buy-in</span>
            <span>Players</span>
            <span>Starts</span>
            <span>Prize pool</span>
            <span />
          </div>
          <div className="lobby-rows">
            {tiers.map((tier) => {
              const startsIn = clocks[tier.id] ?? tier.startsIn;
              const pool = potFor(tier);
              const active = tier.id === selectedId;
              const fill = Math.round((tier.registered / tier.seats) * 100);
              return (
                <button
                  key={tier.id}
                  type="button"
                  className={`lobby-row ${active ? "active" : ""}`}
                  onClick={() => setSelectedId(tier.id)}
                >
                  <span className="lobby-name">
                    <strong>{tier.name}</strong>
                    <small><Flame size={12} /> {tier.intensity} · {tier.format}</small>
                  </span>
                  <span className="lobby-buyin">{formatMoney(tier.buyIn)}</span>
                  <span className="lobby-players">
                    <Users size={13} /> {tier.registered}/{tier.seats}
                    <i className="fill-bar"><i style={{ width: `${fill}%` }} /></i>
                  </span>
                  <span className={`lobby-clock ${startsIn <= 10 ? "soon" : ""}`}>
                    <Clock size={13} /> {formatCountdown(startsIn)}
                  </span>
                  <span className="lobby-pool">{formatMoney(pool)}</span>
                  <span className="lobby-cta">Select</span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="lobby-detail">
          <span className="eyebrow">Selected table</span>
          <h2>{selected.name}</h2>
          <p className="detail-sub"><Flame size={13} /> {selected.intensity} · {selected.format} format</p>

          <dl className="detail-grid">
            <div><dt>Buy-in</dt><dd>{formatMoney(selected.buyIn)}</dd></div>
            <div><dt>Prize pool</dt><dd className="gold">{formatMoney(selectedPool)}</dd></div>
            <div><dt>Field</dt><dd>{selected.registered}/{selected.seats}</dd></div>
            <div><dt>Rake</dt><dd>{Math.round(selected.rake * 100)}%</dd></div>
          </dl>

          <div className="detail-ladder">
            <span className="eyebrow"><Trophy size={12} /> Top-6 payout</span>
            <div className="ladder-bars">
              {[0.42, 0.24, 0.14, 0.09, 0.065, 0.045].map((percent, index) => (
                <div key={percent}>
                  <span>#{index + 1}</span>
                  <strong>{formatMoney(selectedPool * percent)}</strong>
                </div>
              ))}
            </div>
          </div>

          <button
            className="primary-action wide"
            type="button"
            onClick={() => onJoin(selected)}
            disabled={!canAfford}
          >
            <Play size={18} /> {canAfford ? `Register · ${formatMoney(selected.buyIn)}` : "Insufficient balance"}
          </button>
          <p className="muted small center">Buy-in is deducted from your demo balance. Fake money only.</p>
        </aside>
      </div>
    </div>
  );
}
