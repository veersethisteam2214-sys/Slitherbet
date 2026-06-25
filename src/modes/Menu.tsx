import { ChevronRight, Coins, Layers, Mountain, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { SnakeWordmark } from "../components/SnakeWordmark";
import { formatMoney } from "../shared";
import { isValidUsername, saveUsername } from "../snakeSkins";

type MenuProps = {
  balance: number;
  theme: "arcade" | "neon";
  username: string;
  onUsernameChange: (name: string) => void;
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

export function Menu({ balance, theme, username, onUsernameChange, onSingle, onMultiplayer }: MenuProps) {
  const [draft, setDraft] = useState(username);
  const valid = isValidUsername(draft);

  useEffect(() => {
    setDraft(username);
  }, [username]);

  const commit = () => {
    const trimmed = draft.trim();
    if (isValidUsername(trimmed)) {
      saveUsername(trimmed);
      onUsernameChange(trimmed);
    }
  };

  const enterSingle = () => {
    commit();
    if (isValidUsername(draft)) onSingle();
  };

  const enterMulti = () => {
    commit();
    if (isValidUsername(draft)) onMultiplayer();
  };

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
          <p className="hero-line">A skill arena where one slip ends the run. Set your tag, then pick a table.</p>
        </div>

        <div className="ign-gate">
          <label className="ign-label" htmlFor="ign-input">
            <User size={14} /> Your tag
          </label>
          <div className="ign-row">
            <input
              id="ign-input"
              className="ign-input"
              type="text"
              placeholder="e.g. ViperKing"
              maxLength={16}
              value={draft}
              onChange={(e) => setDraft(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              onBlur={commit}
              onKeyDown={(e) => e.key === "Enter" && commit()}
            />
            <button className="ghost-button" type="button" onClick={commit} disabled={!valid}>
              Save
            </button>
          </div>
          <p className={`ign-hint ${valid ? "ok" : ""}`}>
            {valid ? `Locked in as ${draft.trim()}` : "3–16 characters · letters, numbers, underscore"}
          </p>
        </div>

        <div className={`mode-grid ${valid ? "" : "locked"}`}>
          <button className="mode-card single" type="button" onClick={enterSingle} disabled={!valid}>
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

          <button className="mode-card multi" type="button" onClick={enterMulti} disabled={!valid}>
            <div className="mode-top">
              <span className="mode-kicker"><Users size={13} /> Live · last snake standing</span>
              <span className="mode-stat">Up to 100 seats</span>
            </div>
            <h3>Tournaments</h3>
            <p>Buy into a scheduled table and fight the field in a single cavern. Outlast everyone — the final six split the pot.</p>
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
