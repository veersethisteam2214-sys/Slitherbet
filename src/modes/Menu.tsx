import { ChevronRight, Coins, Layers, Mountain, Users } from "lucide-react";
import { SnakeWordmark } from "../components/SnakeWordmark";
import { formatMoney } from "../shared";

type MenuProps = {
  balance: number;
  theme: "arcade" | "neon";
  onSingle: () => void;
  onMultiplayer: () => void;
};

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" fill="none" aria-hidden>
      <path
        d="M7 22c0-4 4-5 8-5s7-1 7-4-2-4-5-4"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="8" cy="22" r="3" fill="currentColor" />
      <circle cx="9.4" cy="21.4" r="0.9" fill="#06231a" />
    </svg>
  );
}

export function Menu({ balance, theme, onSingle, onMultiplayer }: MenuProps) {
  return (
    <div className="menu-screen">
      <div className="menu-glow" aria-hidden />
      <header className="menu-topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><BrandMark /></div>
          <span className="brand-name">SlitherBet</span>
        </div>
        <div className="wallet-chip">
          <span className="eyebrow">Play balance</span>
          <strong>{formatMoney(balance)}</strong>
        </div>
      </header>

      <div className="menu-body">
        <div className="menu-hero">
          <SnakeWordmark theme={theme} />
          <p className="hero-line">A skill arena where one slip ends the run. Pick your table.</p>
        </div>

        <div className="mode-grid">
          <button className="mode-card single" type="button" onClick={onSingle}>
            <div className="mode-top">
              <span className="mode-kicker"><Mountain size={13} /> Solo · cave run</span>
              <span className="mode-stat">~12s a run</span>
            </div>
            <h3>Cave Run</h3>
            <p>Drop in as a hatchling and leap ledge to ledge through the dark. Stack the multiplier, bank it before a raptor swoops.</p>
            <ul className="mode-points">
              <li><Coins size={15} /> Multiplier climbs every ledge</li>
              <li><Layers size={15} /> Cash out the second you land</li>
            </ul>
            <span className="mode-cta">Enter the cave <ChevronRight size={16} /></span>
          </button>

          <button className="mode-card multi" type="button" onClick={onMultiplayer}>
            <div className="mode-top">
              <span className="mode-kicker"><Users size={13} /> Live · last snake standing</span>
              <span className="mode-stat">Up to 100 seats</span>
            </div>
            <h3>Tournaments</h3>
            <p>Buy into a scheduled table and fight the field in a single arena. Outlast everyone — the final six split the pot.</p>
            <ul className="mode-points">
              <li><Coins size={15} /> Top-six payout ladder</li>
              <li><Users size={15} /> Snake-vs-snake, no respawns</li>
            </ul>
            <span className="mode-cta">Browse tables <ChevronRight size={16} /></span>
          </button>
        </div>
      </div>
    </div>
  );
}
