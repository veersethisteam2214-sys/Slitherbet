import { BadgeDollarSign, ChevronRight, Swords, Target, Trophy, Users } from "lucide-react";
import { formatMoney } from "../shared";

type MenuProps = {
  balance: number;
  onSingle: () => void;
  onMultiplayer: () => void;
};

export function Menu({ balance, onSingle, onMultiplayer }: MenuProps) {
  return (
    <div className="menu-screen">
      <div className="menu-glow" aria-hidden />
      <header className="menu-topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><BadgeDollarSign size={26} /></div>
          <div>
            <span className="eyebrow">Skill-prize arena</span>
            <h1 className="brand-title">SlitherBet</h1>
          </div>
        </div>
        <div className="wallet-chip">
          <span className="eyebrow">Demo balance</span>
          <strong>{formatMoney(balance)}</strong>
        </div>
      </header>

      <div className="menu-body">
        <div className="menu-hero">
          <span className="hero-tag">Where every dot is real money</span>
          <h2>Choose how you play.</h2>
          <p>Sharpen your reflexes solo, or buy into a live tournament and outlast the field for a share of the pot.</p>
        </div>

        <div className="mode-grid">
          <button className="mode-card single" type="button" onClick={onSingle}>
            <div className="mode-icon"><Target size={26} /></div>
            <div className="mode-copy">
              <span className="eyebrow">Solo · instant</span>
              <h3>Single Player</h3>
              <p>Knife Gauntlet. Dodge falling blades, grow your snake, and cash out before your luck runs out.</p>
            </div>
            <ul className="mode-points">
              <li><Trophy size={14} /> Rising multiplier</li>
              <li><Swords size={14} /> Cash out any time</li>
            </ul>
            <span className="mode-cta">Play now <ChevronRight size={16} /></span>
          </button>

          <button className="mode-card multi" type="button" onClick={onMultiplayer}>
            <div className="mode-icon"><Users size={26} /></div>
            <div className="mode-copy">
              <span className="eyebrow">Live · last snake standing</span>
              <h3>Multiplayer</h3>
              <p>Browse buy-in tournaments, register for a table, and battle up to 100 snakes for the top-six payout ladder.</p>
            </div>
            <ul className="mode-points">
              <li><Trophy size={14} /> Top-6 prize pool</li>
              <li><Users size={14} /> Up to 100 players</li>
            </ul>
            <span className="mode-cta">Browse tables <ChevronRight size={16} /></span>
          </button>
        </div>
      </div>
    </div>
  );
}
