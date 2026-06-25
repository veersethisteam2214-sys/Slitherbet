import { Receipt, X } from "lucide-react";
import { formatMoney, type BetRecord } from "../shared";

type BetHistoryProps = {
  bets: BetRecord[];
  onClose: () => void;
};

function timeAgo(time: number) {
  const diff = Math.max(0, Date.now() - time);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function BetHistory({ bets, onClose }: BetHistoryProps) {
  const wagered = bets.reduce((sum, b) => sum + b.stake, 0);
  const returned = bets.reduce((sum, b) => sum + b.payout, 0);
  const net = returned - wagered;

  return (
    <div className="bets-overlay" onPointerDown={onClose}>
      <div className="bets-drawer" onPointerDown={(e) => e.stopPropagation()}>
        <header className="bets-head">
          <div className="bets-title">
            <Receipt size={18} />
            <h3>My Bets</h3>
          </div>
          <button className="modal-x static" type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="bets-summary">
          <div>
            <span>Wagered</span>
            <strong>{formatMoney(wagered)}</strong>
          </div>
          <div>
            <span>Returned</span>
            <strong>{formatMoney(returned)}</strong>
          </div>
          <div className={net >= 0 ? "pos" : "neg"}>
            <span>Net</span>
            <strong>{net >= 0 ? "+" : "-"}{formatMoney(Math.abs(net))}</strong>
          </div>
        </div>

        {bets.length === 0 ? (
          <div className="bets-empty">
            <Receipt size={28} />
            <p>No bets yet. Play a round and your history shows up here.</p>
          </div>
        ) : (
          <ul className="bets-list">
            {bets.map((bet) => {
              const change = bet.payout - bet.stake;
              return (
                <li key={bet.id}>
                  <span className={`bet-dot ${bet.outcome}`} />
                  <div className="bet-main">
                    <strong>{bet.label}</strong>
                    <small>
                      {bet.mode === "single" ? "Single player" : "Tournament"} · {timeAgo(bet.time)}
                      {bet.multiplier ? ` · ${bet.multiplier.toFixed(2)}x` : ""}
                    </small>
                  </div>
                  <div className="bet-money">
                    <strong className={change >= 0 ? "pos" : "neg"}>
                      {change >= 0 ? "+" : "-"}{formatMoney(Math.abs(change))}
                    </strong>
                    <small>Bet {formatMoney(bet.stake)}</small>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
